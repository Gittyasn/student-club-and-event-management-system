import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

export const useUsers = () => {
    return useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    club:clubs!club_id(id, name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data ?? [];
        },
        staleTime: 60 * 1000,
    });
};
