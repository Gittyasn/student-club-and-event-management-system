import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { sendNotification } from '../services/notificationService';
import { writeAuditLog } from '../services/auditLogService';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

const ACTIVE_REGISTRATION_STATUSES = ['registered', 'confirmed', 'attended'];

// ─── Student: Fetch own registrations ──────────────────────────────────────
export const useMyRegistrations = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const { data: registrations, isLoading } = useQuery({
        queryKey: ['myRegistrations', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('registrations')
                .select(`
                    id, status, registered_at, cancelled_at, attended,
                    waitlist_position, admin_note,
                    event:events(
                        id, title, start_time, end_time, location, mode, status,
                        certificate_enabled, max_participants, allow_waitlist,
                        club:clubs(name, logo_url),
                        category:event_categories(name)
                    )
                `)
                .eq('user_id', user?.id)
                .neq('status', 'rejected')
                .order('registered_at', { ascending: false });

            if (error) throw error;

            // Fetch which events already have feedback submitted
            const { data: feedbackData } = await supabase
                .from('feedback')
                .select('event_id')
                .eq('user_id', user?.id);

            const feedbackSet = new Set(feedbackData?.map(f => f.event_id) || []);

            return data?.map(reg => ({
                ...reg,
                has_feedback: feedbackSet.has(reg.event_id)
            }));
        }
    });

    // Cancel registration - DB trigger handles waitlist promotion automatically
    const cancelRegistration = useMutation({
        mutationFn: async ({ registrationId, eventId }) => {
            // Check that the event has not started yet (client-side guard)
            const { data: eventData } = await supabase
                .from('events')
                .select('start_time, status')
                .eq('id', eventId)
                .single();

            if (eventData && new Date(eventData.start_time) <= new Date()) {
                throw new Error('Cannot cancel: event has already commenced.');
            }
            if (eventData?.status === 'ongoing' || eventData?.status === 'completed') {
                throw new Error('Cannot cancel: event is ongoing or completed.');
            }

            const { error } = await supabase
                .from('registrations')
                .update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString()
                })
                .eq('id', registrationId)
                .eq('user_id', user?.id); // Security: enforce own registration

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myRegistrations'] });
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['studentStats'] });
            toast.success('Registration cancelled. Seat released to waitlist.');
        },
        onError: (error) => {
            toast.error(`Cancellation failed: ${error.message}`);
        }
    });

    return { registrations, isLoading, cancelRegistration };
};

// ─── Student: Register for event (with full eligibility checks) ──────────────
export const useRegisterEvent = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async (eventOrId) => {
            if (!user?.id) throw new Error('Authentication required.');

            const id = typeof eventOrId === 'string' ? eventOrId : eventOrId.id;

            // 1. Check already registered
            const { data: existing } = await supabase
                .from('registrations')
                .select('id, status')
                .eq('event_id', id)
                .eq('user_id', user.id)
                .maybeSingle();

            if (existing && existing.status !== 'cancelled') {
                throw new Error(`Already in system as: ${existing.status}`);
            }

            // 2. Fetch full event data for eligibility checks
            const { data: eventData, error: eventErr } = await supabase
                .from('events')
                .select(`
                    max_participants, allow_waitlist, status, registration_deadline,
                    requires_membership, club_id
                `)
                .eq('id', id)
                .single();

            if (eventErr || !eventData) throw new Error('Event not found.');

            const { data: registrationRows, error: registrationErr } = await supabase
                .from('registrations')
                .select('status')
                .eq('event_id', id)
                .in('status', [...ACTIVE_REGISTRATION_STATUSES, 'waitlisted']);

            if (registrationErr) throw registrationErr;

            // 3. Status check
            if (!['registration_open', 'approved'].includes(eventData.status)) {
                throw new Error('Registrations are not currently open for this event.');
            }

            // 4. Deadline check
            if (eventData.registration_deadline && new Date(eventData.registration_deadline) < new Date()) {
                throw new Error('Registration deadline has passed.');
            }

            // 5. Membership check
            if (eventData.requires_membership) {
                const { data: membership } = await supabase
                    .from('club_memberships')
                    .select('status')
                    .eq('club_id', eventData.club_id)
                    .eq('user_id', user.id)
                    .in('status', ['approved', 'core_member', 'sub_coordinator'])
                    .maybeSingle();

                if (!membership) {
                    throw new Error('This event requires approved club membership.');
                }
            }

            // 6. Capacity check
            const currentCount = (registrationRows || []).filter((registration) =>
                ACTIVE_REGISTRATION_STATUSES.includes(registration.status)
            ).length;
            const waitlistCount = (registrationRows || []).filter((registration) =>
                registration.status === 'waitlisted'
            ).length;
            const max = eventData.max_participants;
            const isFull = max && currentCount >= max;

            if (isFull && !eventData.allow_waitlist) {
                throw new Error('Event is at full capacity. No waitlist available.');
            }

            const assignedStatus = isFull ? 'waitlisted' : 'registered';

            // 7. Insert or reactivate
            if (existing && existing.status === 'cancelled') {
                const { error } = await supabase
                    .from('registrations')
                    .update({
                        status: assignedStatus,
                        registered_at: new Date().toISOString(),
                        cancelled_at: null,
                        waitlist_position: isFull ? waitlistCount + 1 : null
                    })
                    .eq('event_id', id)
                    .eq('user_id', user.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('registrations')
                    .insert([{
                        event_id: id,
                        user_id: user.id,
                        status: assignedStatus,
                        waitlist_position: isFull ? waitlistCount + 1 : null
                    }]);
                if (error) throw error;
            }

            // 8. Notify
            await sendNotification({
                user_id: user.id,
                title: assignedStatus === 'waitlisted' ? 'Waitlist Updated' : 'Registration Confirmed',
                message: assignedStatus === 'waitlisted'
                    ? 'Added to Waitlist. You will be notified when a slot opens.'
                    : 'Registration Confirmed! You are officially enrolled.',
                type: assignedStatus === 'waitlisted' ? 'info' : 'success',
                related_id: id,
                related_type: 'event'
            });

            return assignedStatus;
        },
        onSuccess: (assignedStatus) => {
            queryClient.invalidateQueries({ queryKey: ['myRegistrations'] });
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['studentStats'] });

            if (assignedStatus === 'waitlisted') {
                toast.success('Added to Waitlist queue successfully.');
            } else {
                toast.success('Registration Confirmed!');
            }
        },
        onError: (error) => {
            toast.error(`Registration failed: ${error.message}`);
        }
    });
};

// ─── Coordinator/Admin: Fetch registrations for a specific event ──────────────
export const useEventRegistrationList = (eventId) => {
    return useQuery({
        queryKey: ['eventRegistrations', eventId],
        enabled: !!eventId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('registrations')
                .select(`
                    id, status, registered_at, cancelled_at, attended, 
                    attendance_marked_at, waitlist_position, admin_note,
                    student:profiles!registrations_user_id_fkey(id, full_name, email, department, avatar_url)
                `)
                .eq('event_id', eventId)
                .order('registered_at', { ascending: true });

            if (error) throw error;
            return data;
        }
    });
};

// ─── Admin: Override actions for registrations ─────────────────────────────
export const useRegistrationManagementActions = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // Force register a student (bypasses capacity checks)
    const forceRegister = useMutation({
        mutationFn: async ({ eventId, studentId, note }) => {
            const { data: existing } = await supabase
                .from('registrations')
                .select('id, status')
                .eq('event_id', eventId)
                .eq('user_id', studentId)
                .maybeSingle();

            if (existing && existing.status !== 'cancelled') {
                // Update existing to registered
                const { error } = await supabase
                    .from('registrations')
                    .update({
                        status: 'confirmed',
                        admin_note: note || 'Registration confirmed by coordinator.',
                        force_registered_by: user?.id,
                        registered_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('registrations')
                    .insert([{
                        event_id: eventId,
                        user_id: studentId,
                        status: 'confirmed',
                        admin_note: note || 'Registration confirmed by coordinator.',
                        force_registered_by: user?.id,
                    }]);
                if (error) throw error;
            }

            // Log admin action
            await writeAuditLog({
                user_id: user?.id,
                action: 'registration_force_register',
                target_id: eventId,
                meta: { student_id: studentId, note }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventRegistrations'] });
            toast.success('Registration confirmed successfully.');
        },
        onError: (err) => toast.error(err.message)
    });

    // Remove registration from the event roster
    const removeRegistration = useMutation({
        mutationFn: async ({ registrationId, eventId, note }) => {
            const { error } = await supabase
                .from('registrations')
                .update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString(),
                    admin_note: note || 'Removed from the event roster.'
                })
                .eq('id', registrationId);
            if (error) throw error;

            await writeAuditLog({
                user_id: user?.id,
                action: 'registration_remove',
                target_id: eventId,
                meta: { registration_id: registrationId, note }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventRegistrations'] });
            toast.success('Registration removed. Waitlist will auto-promote.');
        },
        onError: (err) => toast.error(err.message)
    });

    // Close registration early
    const lockRegistration = useMutation({
        mutationFn: async (eventId) => {
            const { error } = await supabase
                .from('events')
                .update({ status: 'registration_closed' })
                .eq('id', eventId);
            if (error) throw error;

            await writeAuditLog({
                user_id: user?.id,
                action: 'registration_lock',
                target_id: eventId,
                meta: { locked_at: new Date().toISOString() }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            toast.success('Registration closed early.');
        },
        onError: (err) => toast.error(err.message)
    });

    // Manually promote from waitlist
    const manualPromote = useMutation({
        mutationFn: async ({ registrationId, eventId }) => {
            const { error } = await supabase
                .from('registrations')
                .update({ status: 'registered', waitlist_position: null })
                .eq('id', registrationId);
            if (error) throw error;

            await writeAuditLog({
                user_id: user?.id,
                action: 'registration_manual_waitlist_promote',
                target_id: eventId,
                meta: { registration_id: registrationId }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventRegistrations'] });
            toast.success('Student promoted from waitlist.');
        },
        onError: (err) => toast.error(err.message)
    });

    return { forceRegister, removeRegistration, lockRegistration, manualPromote };
};

export const useAdminRegistrationOverrides = useRegistrationManagementActions;

// ─── Admin: Platform-wide registration analytics ───────────────────────────
export const useRegistrationAnalytics = () => {
    return useQuery({
        queryKey: ['registrationAnalytics'],
        queryFn: async () => {
            // Most popular events (by registration count)
            const { data: popular } = await supabase
                .from('registrations')
                .select('event_id, events(title, start_time, club:clubs(name))')
                .not('status', 'in', '("cancelled","rejected")')
                .order('event_id');

            // Aggregate by event
            const eventCounts = {};
            popular?.forEach(r => {
                if (!eventCounts[r.event_id]) {
                    eventCounts[r.event_id] = {
                        event: r.events,
                        count: 0,
                    };
                }
                eventCounts[r.event_id].count++;
            });

            const topEvents = Object.values(eventCounts)
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            // Monthly registration trend
            const { data: monthly } = await supabase
                .from('registrations')
                .select('registered_at, status')
                .gte('registered_at', new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString());

            const monthlyMap = {};
            monthly?.forEach(r => {
                const month = new Date(r.registered_at).toLocaleString('default', { month: 'short', year: '2-digit' });
                if (!monthlyMap[month]) monthlyMap[month] = { name: month, Registered: 0, Cancelled: 0, Waitlisted: 0 };
                if (r.status === 'registered' || r.status === 'confirmed' || r.status === 'attended') monthlyMap[month].Registered++;
                else if (r.status === 'cancelled') monthlyMap[month].Cancelled++;
                else if (r.status === 'waitlisted') monthlyMap[month].Waitlisted++;
            });

            return {
                topEvents,
                monthlyTrend: Object.values(monthlyMap)
            };
        }
    });
};
