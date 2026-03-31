import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

const PUBLIC_EVENT_STATUSES = ['approved', 'open', 'registration_open', 'ongoing', 'completed'];

const fetchEventById = async (id, options = {}) => {
    let query = supabase
        .from('events')
        .select('*, club:clubs(name, status, logo_url), registrations:registrations(count)')
        .eq('id', id);

    if (options.publicOnly) {
        query = query
            .eq('approval_status', 'approved')
            .in('status', PUBLIC_EVENT_STATUSES)
            .or('visibility.is.null,visibility.eq.public,visibility.eq.true');
    }

    const { data, error } = await query.single();

    if (error) {
        throw new Error(error.message);
    }

    const event = data;
    const club = Array.isArray(event.club) ? event.club[0] : event.club;

    if (options.publicOnly && club?.status && club.status !== 'active') {
        throw new Error('Event not found');
    }

    return {
        ...event,
        club
    };
};

export const useEventById = (id, options = {}) => {
    return useQuery({
        queryKey: ['event', id, options],
        queryFn: () => fetchEventById(id, options),
        enabled: !!id,
    });
};
