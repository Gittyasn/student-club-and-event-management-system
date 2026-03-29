import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { sendNotification } from '../services/notificationService';
import { writeAuditLog } from '../services/auditLogService';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import { useCertificateMutations } from './useCertificates';

// Late threshold: minutes after event start to be marked as "Late"
const LATE_THRESHOLD_MINUTES = 15;

const escapeCsvValue = (value) => {
    const normalized = value == null ? '' : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
};

// ─── Fetch registrations for an event (with attendance status) ────────────────
export const useEventRegistrations = (eventId) => {
    return useQuery({
        queryKey: ['eventRegistrations', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('registrations')
                .select(`
                    id, status, user_id,
                    profiles:profiles!registrations_user_id_fkey(id, full_name, email, department, avatar_url)
                `)
                .eq('event_id', eventId)
                .in('status', ['registered', 'confirmed', 'attended', 'no_show']);
            if (error) throw error;

            // Merge with attendance_records
            const { data: attRecords } = await supabase
                .from('attendance_records')
                .select('user_id, status, is_late, late_minutes, method, marked_at, marked_by')
                .eq('event_id', eventId);

            const attMap = {};
            (attRecords || []).forEach(r => { attMap[r.user_id] = r; });

            return data?.map(reg => ({
                ...reg,
                attendance: attMap[reg.user_id] || null
            }));
        }
    });
};

// ─── Fetch attendance records for an event ────────────────────────────────────
export const useAttendanceRecords = (eventId) => {
    return useQuery({
        queryKey: ['attendanceRecords', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('attendance_records')
                .select(`
                    *, 
                    student:profiles!attendance_records_user_id_fkey(full_name, email, avatar_url),
                    marker:profiles!attendance_records_marked_by_fkey(full_name)
                `)
                .eq('event_id', eventId)
                .order('marked_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });
};

// ─── Fetch attendance audit log for an event ─────────────────────────────────
export const useAttendanceLogs = (eventId) => {
    return useQuery({
        queryKey: ['attendanceLogs', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('attendance_logs')
                .select(`
                    *, 
                    student:profiles!attendance_logs_student_id_fkey(full_name),
                    actor:profiles!attendance_logs_marked_by_fkey(full_name)
                `)
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })
                .limit(200);
            if (error) throw error;
            return data;
        }
    });
};

// ─── Student: view own attendance across all events ───────────────────────────
export const useMyAttendance = () => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['myAttendance', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('attendance_records')
                .select(`
                    id, status, is_late, late_minutes, method, marked_at,
                    event:events(id, title, start_time, end_time, location, mode,
                        club:clubs(name, logo_url),
                        category:event_categories(name)
                    )
                `)
                .eq('user_id', user.id)
                .order('marked_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });
};

// ─── Main mutation hub ────────────────────────────────────────────────────────
export const useAttendanceMutations = (eventId) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { generateCertificates } = useCertificateMutations(eventId);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['eventRegistrations', eventId] });
        queryClient.invalidateQueries({ queryKey: ['attendanceRecords', eventId] });
        queryClient.invalidateQueries({ queryKey: ['attendanceLogs', eventId] });
    };

    // Helper: write an audit log entry
    const writeLog = async ({ studentId, prevStatus, newStatus, method, note }) => {
        await supabase.from('attendance_logs').insert({
            event_id: eventId,
            student_id: studentId,
            marked_by: user?.id,
            previous_status: prevStatus,
            new_status: newStatus,
            method,
            action_note: note
        });
    };

    // Helper: check lock
    const checkLock = async () => {
        const { data: ev } = await supabase
            .from('events')
            .select('attendance_locked, start_time')
            .eq('id', eventId)
            .single();
        if (ev?.attendance_locked) throw new Error('Attendance is locked for this event.');
        return ev;
    };

    // ── Mark Individual Attendance ──────────────────────────────────────────
    const markAttendance = useMutation({
        mutationFn: async ({ userId, registrationId, status, method = 'manual' }) => {
            const ev = await checkLock();

            // Late detection
            const isLate = status === 'present' && ev?.start_time
                ? (Date.now() - new Date(ev.start_time).getTime()) > LATE_THRESHOLD_MINUTES * 60 * 1000
                : false;
            const lateMinutes = isLate
                ? Math.round((Date.now() - new Date(ev.start_time).getTime()) / 60000)
                : 0;

            const attendStatus = isLate ? 'late' : status;

            // Fetch current record for audit log
            const { data: existing } = await supabase
                .from('attendance_records')
                .select('status')
                .eq('event_id', eventId)
                .eq('user_id', userId)
                .maybeSingle();

            const { error } = await supabase
                .from('attendance_records')
                .upsert({
                    event_id: eventId,
                    registration_id: registrationId,
                    user_id: userId,
                    status: attendStatus,
                    is_late: isLate,
                    late_minutes: lateMinutes,
                    method,
                    marked_at: new Date().toISOString(),
                    marked_by: user?.id,
                    modified_at: existing ? new Date().toISOString() : null,
                    modified_by: existing ? user?.id : null
                }, { onConflict: 'event_id,user_id' });

            if (error) throw error;

            // Write audit log
            await writeLog({
                studentId: userId,
                prevStatus: existing?.status || 'pending',
                newStatus: attendStatus,
                method,
                note: isLate ? `Marked ${attendStatus} — ${lateMinutes} mins late` : `Marked ${attendStatus}`
            });

            // Post-marking actions for 'present'/'late'
            if (['present', 'late'].includes(attendStatus)) {
                const { data: reg } = await supabase
                    .from('registrations')
                    .select('user_id, event:events(title, certificate_enabled)')
                    .eq('id', registrationId)
                    .single();

                if (reg) {
                    await sendNotification({
                        user_id: reg.user_id,
                        title: 'Attendance Confirmed',
                        message: `Attendance confirmed for "${reg.event?.title}"${isLate ? ' (Late)' : ''}`,
                        type: 'success',
                        related_id: eventId,
                        related_type: 'event'
                    });

                    if (reg.event?.certificate_enabled) {
                        try { generateCertificates.mutate({ userIds: [reg.user_id], mode: 'all' }); } catch { /* non-fatal */ }
                    }
                }
            }

            return attendStatus;
        },
        onSuccess: (status) => {
            invalidate();
            toast.success(`Attendance marked: ${status}`);
        },
        onError: (err) => toast.error(err.message)
    });

    // ── Bulk Mark All Present ──────────────────────────────────────────────
    const bulkMarkPresent = useMutation({
        mutationFn: async (registrations) => {
            await checkLock();
            const now = new Date().toISOString();
            const records = registrations.map(r => ({
                event_id: eventId,
                registration_id: r.id,
                user_id: r.user_id,
                status: 'present',
                method: 'bulk',
                marked_at: now,
                marked_by: user?.id
            }));

            const { error } = await supabase
                .from('attendance_records')
                .upsert(records, { onConflict: 'event_id,user_id' });
            if (error) throw error;

            // Log each
            await supabase.from('attendance_logs').insert(
                registrations.map(r => ({
                    event_id: eventId,
                    student_id: r.user_id,
                    marked_by: user?.id,
                    previous_status: 'pending',
                    new_status: 'present',
                    method: 'bulk',
                    action_note: 'Bulk marked present'
                }))
            );
        },
        onSuccess: () => { invalidate(); toast.success('All students marked present.'); },
        onError: (err) => toast.error(err.message)
    });

    // ── Bulk Mark All Absent ────────────────────────────────────────────────
    const bulkMarkAbsent = useMutation({
        mutationFn: async (registrations) => {
            await checkLock();
            const now = new Date().toISOString();
            const records = registrations.map(r => ({
                event_id: eventId,
                registration_id: r.id,
                user_id: r.user_id,
                status: 'absent',
                method: 'bulk',
                marked_at: now,
                marked_by: user?.id
            }));

            const { error } = await supabase
                .from('attendance_records')
                .upsert(records, { onConflict: 'event_id,user_id' });
            if (error) throw error;
        },
        onSuccess: () => { invalidate(); toast.success('All unmarked students set to Absent.'); },
        onError: (err) => toast.error(err.message)
    });

    // ── Mark as Excused ─────────────────────────────────────────────────────
    const markExcused = useMutation({
        mutationFn: async ({ userId, registrationId, reason }) => {
            await checkLock();
            const { data: existing } = await supabase
                .from('attendance_records')
                .select('status')
                .eq('event_id', eventId).eq('user_id', userId).maybeSingle();

            const { error } = await supabase
                .from('attendance_records')
                .upsert({
                    event_id: eventId, registration_id: registrationId, user_id: userId,
                    status: 'excused', excused_reason: reason,
                    method: 'manual', marked_at: new Date().toISOString(), marked_by: user?.id
                }, { onConflict: 'event_id,user_id' });
            if (error) throw error;

            await writeLog({ studentId: userId, prevStatus: existing?.status || 'pending', newStatus: 'excused', method: 'manual', note: reason || 'Excused' });
        },
        onSuccess: () => { invalidate(); toast.success('Student marked as Excused.'); },
        onError: (err) => toast.error(err.message)
    });

    // ── Lock Attendance ─────────────────────────────────────────────────────
    const lockAttendance = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('lock_event_attendance', {
                p_event_id: eventId
            });
            if (error) throw error;

            await writeAuditLog({
                user_id: user?.id, action: 'attendance_locked', target_id: eventId,
                meta: { locked_at: new Date().toISOString() }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event', eventId] });
            toast.success('Attendance locked. Certificates and analytics will now finalize.');
        },
        onError: (err) => toast.error(err.message)
    });

    // ── Trigger Auto-Absent ─────────────────────────────────────────────────
    const triggerAutoAbsent = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('auto_mark_absent', { p_event_id: eventId });
            if (error) throw error;
            return data;
        },
        onSuccess: (count) => { invalidate(); toast.success(`${count} student(s) auto-marked as Absent.`); },
        onError: (err) => toast.error(err.message)
    });

    // ── CSV Export ──────────────────────────────────────────────────────────
    const exportCSV = (registrations, eventTitle) => {
        if (!registrations?.length) return toast.error('No data to export.');
        const rows = registrations.map(r => ({
            Name: r.profiles?.full_name || 'N/A',
            Email: r.profiles?.email || 'N/A',
            Dept: r.profiles?.department || 'N/A',
            Status: r.attendance?.status || 'pending',
            Late: r.attendance?.is_late ? `Yes (${r.attendance.late_minutes}m)` : 'No',
            Method: r.attendance?.method || '-',
            MarkedAt: r.attendance?.marked_at ? new Date(r.attendance.marked_at).toLocaleString() : '-'
        }));
        const header = Object.keys(rows[0]).map(escapeCsvValue).join(',');
        const csv = header + '\n' + rows.map(r => Object.values(r).map(escapeCsvValue).join(',')).join('\n');
        const link = document.createElement('a');
        link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        link.download = `attendance_${eventTitle || eventId}.csv`;
        link.click();
    };

    return { markAttendance, bulkMarkPresent, bulkMarkAbsent, markExcused, lockAttendance, triggerAutoAbsent, exportCSV };
};

// ─── Admin: Unlock attendance ─────────────────────────────────────────────────
export const useAdminAttendanceOverrides = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    const unlockAttendance = useMutation({
        mutationFn: async (eventId) => {
            const { error } = await supabase.rpc('unlock_event_attendance', {
                p_event_id: eventId
            });
            if (error) throw error;

            await writeAuditLog({
                user_id: user?.id, action: 'attendance_unlocked', target_id: eventId,
                meta: { unlocked_at: new Date().toISOString() }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event'] });
            toast.success('Attendance unlocked by admin.');
        },
        onError: (err) => toast.error(err.message)
    });

    const adminOverrideAttendance = useMutation({
        mutationFn: async ({ eventId, userId, registrationId, newStatus, reason }) => {
            const { data: existing } = await supabase
                .from('attendance_records')
                .select('status').eq('event_id', eventId).eq('user_id', userId).maybeSingle();

            const { error } = await supabase
                .from('attendance_records')
                .upsert({
                    event_id: eventId, registration_id: registrationId, user_id: userId,
                    status: newStatus, method: 'admin_override',
                    marked_at: new Date().toISOString(), marked_by: user?.id,
                    modified_at: new Date().toISOString(), modified_by: user?.id
                }, { onConflict: 'event_id,user_id' });
            if (error) throw error;

            await supabase.from('attendance_logs').insert({
                event_id: eventId, student_id: userId, marked_by: user?.id,
                previous_status: existing?.status || 'pending',
                new_status: newStatus, method: 'admin_override',
                action_note: reason || 'Admin correction'
            });

            await writeAuditLog({
                user_id: user?.id, action: 'admin_attendance_override', target_id: eventId,
                meta: { student_id: userId, from: existing?.status, to: newStatus, reason }
            });
        },
        onSuccess: () => { toast.success('Attendance overridden by admin.'); },
        onError: (err) => toast.error(err.message)
    });

    return { unlockAttendance, adminOverrideAttendance };
};

// ─── Campus-wide attendance analytics (Admin) ─────────────────────────────────
export const useAttendanceAnalytics = () => {
    return useQuery({
        queryKey: ['attendanceAnalytics'],
        queryFn: async () => {
            const { data } = await supabase
                .from('attendance_records')
                .select('status, is_late, event_id, marked_at');

            if (!data) return {};

            const total = data.length;
            const present = data.filter(r => ['present', 'late'].includes(r.status)).length;
            const late = data.filter(r => r.status === 'late').length;
            const absent = data.filter(r => r.status === 'absent').length;
            const excused = data.filter(r => r.status === 'excused').length;
            const overallRate = total > 0 ? Math.round((present / total) * 100) : 0;

            // Monthly trend
            const monthMap = {};
            data.forEach(r => {
                const mo = new Date(r.marked_at).toLocaleString('default', { month: 'short', year: '2-digit' });
                if (!monthMap[mo]) monthMap[mo] = { name: mo, Present: 0, Absent: 0, Late: 0 };
                if (r.status === 'present') monthMap[mo].Present++;
                else if (r.status === 'absent') monthMap[mo].Absent++;
                else if (r.status === 'late') monthMap[mo].Late++;
            });

            return {
                total, present, late, absent, excused, overallRate,
                monthlyTrend: Object.values(monthMap),
                pieData: [
                    { name: 'Present', value: present, color: '#10b981' },
                    { name: 'Late', value: late, color: '#f59e0b' },
                    { name: 'Absent', value: absent, color: '#ef4444' },
                    { name: 'Excused', value: excused, color: '#8b5cf6' },
                ].filter(d => d.value > 0)
            };
        }
    });
};
