import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { sendNotifications } from '../services/notificationService';
import { writeAuditLog } from '../services/auditLogService';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import { generateCertificatePDF, downloadPDF } from '../utils/generateCertificate';

const CERTIFICATE_BUCKET = 'certificates';

const resolveCertificateStoragePath = (value) => {
    if (!value) return null;

    if (!/^https?:\/\//i.test(value)) return value.replace(/^\/+/, '');

    try {
        const url = new URL(value);
        const marker = '/storage/v1/object/';
        const markerIndex = url.pathname.indexOf(marker);
        if (markerIndex === -1) return null;

        let remainder = url.pathname.slice(markerIndex + marker.length);
        if (remainder.startsWith('public/')) remainder = remainder.slice('public/'.length);
        if (remainder.startsWith('sign/')) remainder = remainder.slice('sign/'.length);

        const bucketPrefix = `${CERTIFICATE_BUCKET}/`;
        const bucketIndex = remainder.indexOf(bucketPrefix);
        if (bucketIndex === -1) return null;

        return remainder.slice(bucketIndex + bucketPrefix.length);
    } catch {
        return null;
    }
};

// ─── Fetch student's own certificates ────────────────────────────────────────
export const useMyCertificates = () => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['myCertificates', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('certificates')
                .select(`
                    id, cert_type, status, rank, score, grade, prize_title,
                    file_url, certificate_url, certificate_number,
                    generated_at, is_locked, revoked_at, revocation_reason,
                    event:events(id, title, start_time, club:clubs(name, logo_url))
                `)
                .eq('user_id', user.id)
                .order('generated_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });
};

// ─── Fetch all certificates for an event (coordinator) ───────────────────────
export const useEventCertificates = (eventId) => {
    return useQuery({
        queryKey: ['eventCertificates', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('certificates')
                .select(`
                    id, user_id, cert_type, status, rank, score, grade, prize_title,
                    file_url, certificate_url, certificate_number, is_locked,
                    generated_at, revoked_at,
                    student:profiles!certificates_user_id_fkey(id, full_name, email, avatar_url, department)
                `)
                .eq('event_id', eventId)
                .order('cert_type', { ascending: true });
            if (error) throw error;
            return data || [];
        }
    });
};

// ─── Fetch single certificate by ID (public verify) ──────────────────────────
export const useCertificateById = (id) => {
    return useQuery({
        queryKey: ['certificateView', id],
        enabled: !!id && id.length > 4,
        queryFn: async () => {
            // Try UUID first, then cert_number
            let query = supabase.from('certificates').select(`
                id, cert_type, status, rank, score, grade, prize_title,
                certificate_number, generated_at, revoked_at, revocation_reason,
                student:profiles!certificates_user_id_fkey(full_name),
                event:events(title, start_time, club:clubs(name))
            `);

            // Try as UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            if (isUUID) {
                query = query.eq('id', id);
            } else {
                query = query.eq('certificate_number', id.toUpperCase());
            }

            const { data, error } = await query.maybeSingle();
            if (error) throw error;
            return data;
        }
    });
};

// ─── Audit logs for an event's certs ─────────────────────────────────────────
export const useCertificateLogs = (eventId) => {
    return useQuery({
        queryKey: ['certLogs', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('certificate_logs')
                .select('*, actor:profiles!certificate_logs_actor_id_fkey(full_name)')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })
                .limit(200);
            if (error) throw error;
            return data || [];
        }
    });
};

// ─── Certificate analytics (Admin) ───────────────────────────────────────────
export const useCertificateAnalytics = () => {
    return useQuery({
        queryKey: ['certAnalytics'],
        queryFn: async () => {
            const { data } = await supabase
                .from('certificates')
                .select('cert_type, status, generated_at, event_id, event:events(club:clubs(name))');

            if (!data) return {};
            const total = data.length;
            const valid = data.filter(c => c.status === 'valid').length;
            const revoked = data.filter(c => c.status === 'revoked').length;
            const byType = {
                participation: data.filter(c => c.cert_type === 'participation').length,
                winner: data.filter(c => c.cert_type === 'winner').length,
                merit: data.filter(c => c.cert_type === 'merit').length,
            };

            // Monthly trend
            const monthMap = {};
            data.forEach(c => {
                if (!c.generated_at) return;
                const mo = new Date(c.generated_at).toLocaleString('default', { month: 'short', year: '2-digit' });
                if (!monthMap[mo]) monthMap[mo] = { name: mo, Issued: 0, Revoked: 0 };
                monthMap[mo].Issued++;
                if (c.status === 'revoked') monthMap[mo].Revoked++;
            });

            // By club
            const clubMap = {};
            data.forEach(c => {
                const name = c.event?.club?.name || 'Unknown';
                clubMap[name] = (clubMap[name] || 0) + 1;
            });
            const byClub = Object.entries(clubMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([name, count]) => ({ name: name.slice(0, 20), count }));

            return {
                total, valid, revoked,
                byType,
                pieData: [
                    { name: 'Participation', value: byType.participation, color: '#3b82f6' },
                    { name: 'Winner', value: byType.winner, color: '#fbbf24' },
                    { name: 'Merit', value: byType.merit, color: '#8b5cf6' },
                ].filter(d => d.value > 0),
                monthlyTrend: Object.values(monthMap),
                byClub
            };
        }
    });
};

// ─── Main generation mutation ─────────────────────────────────────────────────
export const useCertificateMutations = (eventId) => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // ── Helper: get signed or public URL from Storage ─────────

    // ── Helper: check event eligibility ────────────────────────
    const checkEligibility = async () => {
        const { data: ev } = await supabase.from('events')
            .select('status, attendance_locked, results_published, result_required, certificate_enabled')
            .eq('id', eventId).single();

        if (!ev) throw new Error('Event not found.');
        if (!ev.certificate_enabled) throw new Error('Certificates are not enabled for this event.');
        if (ev.result_required && !ev.results_published) throw new Error('Results must be published before generating certificates.');
        return ev;
    };

    // ── Generate certificates for specific attendees ───────────
    const generateCertificates = useMutation({
        mutationFn: async ({ userIds, mode = 'all' }) => {
            await checkEligibility();

            // Fetch event
            const { data: ev } = await supabase.from('events')
                .select('title, start_time, event_type, club:clubs(name)').eq('id', eventId).single();

            // Fetch all results (for winner/merit detection)
            const { data: results = [] } = await supabase.from('results')
                .select('user_id, rank, score, max_score, grade, prize_title, is_winner')
                .eq('event_id', eventId)
                .in('status', ['published', 'locked']);

            const resultMap = {};
            results.forEach(r => { resultMap[r.user_id] = r; });

            // Fetch profiles
            const { data: profiles } = await supabase.from('profiles')
                .select('id, full_name, email').in('id', userIds);
            const profMap = {};
            profiles?.forEach(p => { profMap[p.id] = p; });

            const notifications = [];
            let generated = 0;

            // Fetch Hackathon data if needed
            let teamMap = {};
            let submissionMap = {};
            if (ev.event_type === 'hackathon') {
                const { data: teams } = await supabase.from('teams')
                    .select('id, team_name, team_members(user_id)')
                    .eq('event_id', eventId);

                teams?.forEach(t => {
                    t.team_members.forEach(tm => { teamMap[tm.user_id] = t; });
                });

                // Since event_id might not be in submissions directly, let's fetch via team_ids
                const teamIds = teams?.map(t => t.id) || [];
                const { data: subsFix } = await supabase.from('hackathon_submissions')
                    .select('team_id, title')
                    .in('team_id', teamIds);

                subsFix?.forEach(s => { submissionMap[s.team_id] = s; });
            }

            for (const userId of userIds) {
                const prof = profMap[userId];
                const result = resultMap[userId];
                if (!prof) continue;

                // Determine cert type & skip if winner-only mode
                let certType = 'participation';
                if (result?.is_winner || (result?.rank && result.rank <= 3)) certType = 'winner';
                else if (result?.score !== null && result?.score !== undefined) certType = 'merit';

                if (mode === 'winners_only' && certType !== 'winner') continue;

                // Generate unique cert number
                const { data: numData } = await supabase.rpc('generate_certificate_number');
                const certNumber = numData || `CERT-${Date.now()}`;

                // Check for existing cert to keep same random ID if already there
                const { data: existingCert } = await supabase.from('certificates').select('id')
                    .eq('event_id', eventId).eq('user_id', userId).maybeSingle();
                
                const finalCertId = existingCert?.id || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const verifyUrl = `${window.location.origin}/verify/${finalCertId}`;
                const eventDate = ev.start_time
                    ? new Date(ev.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                    : new Date().toLocaleDateString('en-IN');

                const pdfBlob = await generateCertificatePDF({
                    studentName: prof.full_name,
                    eventTitle: ev.title,
                    clubName: ev.club?.name,
                    eventDate,
                    verificationUrl: verifyUrl,
                    certificateId: finalCertId,
                    certType,
                    rank: result?.rank,
                    score: result?.score,
                    maxScore: result?.max_score,
                    grade: result?.grade,
                    prizeTitle: result?.prize_title,
                    certificateNumber: certNumber,
                    teamName: teamMap[userId]?.team_name,
                    projectTitle: submissionMap[teamMap[userId]?.id]?.title
                });

                const filePath = `${eventId}/${userId}_${certType}.pdf`;
                const { error: uploadErr } = await supabase.storage
                    .from(CERTIFICATE_BUCKET).upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });
                if (uploadErr) { console.error('Upload failed', userId, uploadErr); continue; }

                const { error: upsertErr } = await supabase.from('certificates').upsert({
                    id: finalCertId,
                    event_id: eventId,
                    user_id: userId,
                    title: 'Certificate Ready',
                    cert_type: certType,
                    status: 'valid',
                    rank: result?.rank || null,
                    score: result?.score || null,
                    grade: result?.grade || null,
                    prize_title: result?.prize_title || null,
                    file_url: filePath,
                    certificate_url: filePath,
                    certificate_number: certNumber,
                    generated_by: user?.id,
                    generated_at: new Date().toISOString()
                }, { onConflict: 'event_id,user_id' });
                if (upsertErr) { console.error('DB upsert failed', userId, upsertErr); continue; }

                // Audit log
                await supabase.from('certificate_logs').insert({
                    certificate_id: finalCertId, event_id: eventId, student_id: userId,
                    actor_id: user?.id, action: 'generated',
                    note: `Generated ${certType} certificate. Number: ${certNumber}`
                });

                notifications.push({
                    user_id: userId,
                    message: `🎓 Your ${certType} certificate for "${ev.title}" is ready!`,
                    type: 'success',
                    related_id: finalCertId,
                    related_type: 'certificate'
                });
                generated++;
            }

            if (notifications.length > 0) await sendNotifications(notifications);
            return generated;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['eventCertificates', eventId] });
            toast.success(`${count} certificate(s) generated successfully!`);
        },
        onError: (err) => toast.error(err.message)
    });

    // ── Regenerate a single certificate (overwrite) ────────────
    const regenerateCertificate = useMutation({
        mutationFn: async (userId) => {
            await generateCertificates.mutateAsync({ userIds: [userId], mode: 'all' });
            // Log as regenerated
            await supabase.from('certificate_logs').insert({
                event_id: eventId, student_id: userId, actor_id: user?.id, action: 'regenerated', note: 'Manual regeneration.'
            });
        },
        onSuccess: () => toast.success('Certificate regenerated.'),
        onError: (err) => toast.error(err.message)
    });

    return { generateCertificates, regenerateCertificate };
};

// ─── Admin Mutations (revoke, unlock) ─────────────────────────────────────────
export const useAdminCertificateMutations = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    const revokeCertificate = useMutation({
        mutationFn: async ({ certId, reason }) => {
            const { error } = await supabase.from('certificates')
                .update({ status: 'revoked', revoked_by: user?.id, revoked_at: new Date().toISOString(), revocation_reason: reason })
                .eq('id', certId);
            if (error) throw error;

            // Get cert for logging
            const { data: cert } = await supabase.from('certificates').select('event_id, user_id').eq('id', certId).single();
            await supabase.from('certificate_logs').insert({
                certificate_id: certId, event_id: cert?.event_id, student_id: cert?.user_id,
                actor_id: user?.id, action: 'revoked', note: reason
            });
            await writeAuditLog({
                actor_id: user?.id, action: 'certificate_revoked', target_id: certId, meta: { reason }
            });
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['eventCertificates'] }); toast.success('Certificate revoked.'); },
        onError: (err) => toast.error(err.message)
    });

    const reinststateCertificate = useMutation({
        mutationFn: async (certId) => {
            const { error } = await supabase.from('certificates')
                .update({ status: 'valid', revoked_by: null, revoked_at: null, revocation_reason: null })
                .eq('id', certId);
            if (error) throw error;
            const { data: cert } = await supabase.from('certificates').select('event_id, user_id').eq('id', certId).single();
            await supabase.from('certificate_logs').insert({
                certificate_id: certId, event_id: cert?.event_id, student_id: cert?.user_id,
                actor_id: user?.id, action: 'reinstated', note: 'Admin reinstated revoked certificate.'
            });
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['eventCertificates'] }); toast.success('Certificate reinstated.'); },
        onError: (err) => toast.error(err.message)
    });

    return { revokeCertificate, reinststateCertificate };
};

// ─── Download helper (signed URL or blob download) ────────────────────────────
export const useDownloadCertificate = () => {
    const { user } = useAuthStore();
    return useMutation({
        // eslint-disable-next-line no-unused-vars
        mutationFn: async ({ certId, fileUrl, studentName, eventTitle }) => {
            if (!fileUrl) throw new Error('Certificate file not found.');
            const storagePath = resolveCertificateStoragePath(fileUrl);
            // Log download action
            await supabase.from('certificate_logs').insert({
                certificate_id: certId, student_id: user?.id, actor_id: user?.id,
                action: 'downloaded', note: 'Student downloaded certificate.'
            });

            if (storagePath) {
                const { data, error } = await supabase.storage
                    .from(CERTIFICATE_BUCKET)
                    .download(storagePath);
                if (error) throw error;

                const filename = storagePath.split('/').pop() || `certificate-${certId}.pdf`;
                downloadPDF(data, filename);
                return;
            }

            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error('Failed to download certificate file.');
            const blob = await response.blob();
            downloadPDF(blob, `certificate-${certId}.pdf`);
        },
        onError: (err) => toast.error(err.message)
    });
};

// Keep legacy export for backward compat
export { useMyCertificates as useUserCertificates };
