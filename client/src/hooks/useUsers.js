import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

export const useUsers = () => {
    return useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    id,
                    email,
                    full_name,
                    role,
                    account_status,
                    club_id,
                    avatar_url,
                    department,
                    year,
                    phone,
                    bio,
                    created_at,
                    club:clubs!club_id(id, name),
                    registrations:registrations!registrations_user_id_fkey(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data ?? [];
        },
        staleTime: 60 * 1000,
    });
};
