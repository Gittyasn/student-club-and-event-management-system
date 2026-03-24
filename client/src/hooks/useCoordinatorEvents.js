import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';

export const useCoordinatorEvents = () => {
    const { profile } = useAuthStore();

    return useQuery({
        queryKey: ['events', 'coordinator', profile?.club_id],
        enabled: !!profile?.club_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select(`
                    *,
                    club:clubs(name),
                    registrations:registrations(count)
                `)
                .eq('club_id', profile?.club_id)
                .order('start_time', { ascending: true });

            if (error) throw error;

            const typedData = (data || []).map((event) => ({
                ...event,
                club: Array.isArray(event.club) ? event.club[0] : event.club
            }));
            return typedData;
        }
    });
};

export const useEvent = (id) => {
    return useQuery({
        queryKey: ['event', id],
        enabled: !!id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select('*, club:clubs(name)')
                .eq('id', id)
                .single();

            if (error) throw error;

            const event = data;
            return {
                ...event,
                club: Array.isArray(event.club) ? event.club[0] : event.club
            };
        }
    });
};
