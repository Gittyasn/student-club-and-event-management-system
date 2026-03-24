import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
const fetchEventById = async (id) => {
    const { data, error } = await supabase
        .from('events')
        .select('*, club:clubs(name)')
        .eq('id', id)
        .single();

    if (error) {
        throw new Error(error.message);
    }

     
    const event = data;
    return {
        ...event,
        club: Array.isArray(event.club) ? event.club[0] : event.club
    };
};

export const useEventById = (id) => {
    return useQuery({
        queryKey: ['event', id],
        queryFn: () => fetchEventById(id),
        enabled: !!id,
    });
};
