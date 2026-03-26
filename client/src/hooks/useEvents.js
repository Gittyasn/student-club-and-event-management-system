import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

const PUBLIC_EVENT_STATUSES = ['approved', 'open', 'registration_open', 'ongoing', 'completed'];

const fetchEvents = async (options = {}) => {
    let query = supabase
        .from('events')
        .select(`
            id,
            created_by,
            title,
            description,
            start_time,
            end_time,
            location,
            event_type,
            category:event_categories(name),
            mode,
            submitted_at,
            approved_at,
            poster_url,
            status,
            max_participants,
            registration_deadline,
            allow_waitlist,
            visibility,
            approval_status,
            requires_membership,
            short_description,
            rejection_reason,
            club:clubs(name, status),
            registrations:registrations(count)
        `)
        .order('start_time', { ascending: true });

    if (options.publicOnly) {
        query = query
            .eq('approval_status', 'approved')
            .in('status', PUBLIC_EVENT_STATUSES)
            .or('visibility.is.null,visibility.eq.public,visibility.eq.true');
    }

    if (options.status) {
        if (Array.isArray(options.status)) {
            query = query.in('status', options.status);
        } else {
            query = query.eq('status', options.status);
        }
    }

    if (options.approval_status) {
        query = query.eq('approval_status', options.approval_status);
    }

    if (options.club_id) {
        query = query.eq('club_id', options.club_id);
    }

    if (options.created_by) {
        query = query.eq('created_by', options.created_by);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }


    const typedData = (data || []).map((event) => ({
        ...event,
        club: Array.isArray(event.club) ? event.club[0] : event.club,
        category: event.category?.name || 'Uncategorized',
        registrationsCount: event.registrations?.[0]?.count || 0
    })).filter((event) => {
        if (!options.publicOnly) return true;
        return !event.club?.status || event.club.status === 'active';
    });

    return typedData;
};

export const useEvents = (options = {}) => {
    return useQuery({
        queryKey: ['events', options],
        queryFn: () => fetchEvents(options),
    });
};

export const useUpdateEventStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status, rejection_reason, resubmission_count }) => {
            const updates = {};
            if (status) updates.status = status;

            const { data: { user } } = await supabase.auth.getUser();

            if (status === 'draft') {
                updates.approval_status = 'draft';
                updates.submitted_at = null;
                updates.approved_at = null;
                updates.rejected_at = null;
            } else if (status === 'approved') {
                updates.approval_status = 'approved';
                updates.approved_at = new Date().toISOString();
                updates.approved_by = user?.id;
                updates.rejection_reason = null; // Clear any old rejections
            } else if (status === 'rejected') {
                updates.approval_status = 'rejected';
                updates.rejected_at = new Date().toISOString();
                updates.rejected_by = user?.id;
                updates.rejection_reason = rejection_reason;
            } else if (status === 'pending') {
                updates.approval_status = 'pending';
                updates.submitted_at = new Date().toISOString();
            } else if (['registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'archived'].includes(status)) {
                updates.approval_status = 'approved';
            }

            if (resubmission_count !== undefined) {
                updates.resubmission_count = resubmission_count;
            }

            const { data, error } = await supabase
                .from('events')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Log to audit log
            try {
                await supabase.from('audit_logs').insert({
                    actor_id: user?.id,
                    action: `event_${status}`,
                    module: 'events',
                    target_table: 'events',
                    target_id: id,
                    new_value: { status, ...updates },
                    meta: { 
                        os: window.navigator.platform,
                        ua: window.navigator.userAgent
                    }
                });
            } catch (auditError) {
                console.error('Audit log failed:', auditError);
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        }
    });
};

export const useEventCategories = () => {
    return useQuery({
        queryKey: ['eventCategories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('event_categories')
                .select('*')
                .order('name');
            if (error) throw error;
            return data;
        },
    });
};
