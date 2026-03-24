import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

const fetchClubs = async () => {
    const { data, error } = await supabase
        .from('clubs')
        .select(`
            *,
            category:club_categories(name),
            coordinator:profiles!coordinator_id(id, full_name, email)
        `)
        .order('name');

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
};

export const useClubs = () => {
    return useQuery({
        queryKey: ['clubs'],
        queryFn: fetchClubs,
        // Don't auto-retry on failure — a Supabase RLS/join error
        // won't fix itself on retry; retrying just spams the error UI.
        retry: 1,
        retryDelay: 2000,
        // Keep data fresh for 2 minutes — avoid unnecessary refetches
        // on every component mount which cause the error to re-flash.
        staleTime: 2 * 60 * 1000,
        // Show cached data while refetching (no loading flash)
        placeholderData: (prev) => prev,
    });
};
