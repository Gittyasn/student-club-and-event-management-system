import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useCoordinatorClub } from './useCoordinatorClub';

export const useCoordinatorEvents = () => {
    const coordinatorClubQuery = useCoordinatorClub();
    const coordinatorClub = coordinatorClubQuery.data;

    const eventsQuery = useQuery({
        queryKey: ['events', 'coordinator', coordinatorClub?.id],
        enabled: !!coordinatorClub?.id,
        staleTime: 60 * 1000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select(`
                    *,
                    club:clubs(name),
                    registrations:registrations(count)
                `)
                .eq('club_id', coordinatorClub.id)
                .order('start_time', { ascending: true });

            if (error) throw error;

            const typedData = (data || []).map((event) => ({
                ...event,
                club: Array.isArray(event.club) ? event.club[0] : event.club,
                registrationsCount: event.registrations?.[0]?.count || 0
            }));
            return typedData;
        }
    });

    return {
        ...eventsQuery,
        coordinatorClub,
        isLoading:
            coordinatorClubQuery.isLoading ||
            (!!coordinatorClub?.id && (eventsQuery.isLoading || eventsQuery.isPending)),
        isCoordinatorClubMissing: !coordinatorClubQuery.isLoading && !coordinatorClub,
    };
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
