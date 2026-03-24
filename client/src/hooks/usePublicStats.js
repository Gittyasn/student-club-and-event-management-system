import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

export const usePublicStats = () => {
    return useQuery({
        queryKey: ['publicStats'],
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_public_stats');
            if (error) throw error;
            return data;
        }
    });
};
