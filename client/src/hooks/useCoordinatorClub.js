import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';

export const resolveCoordinatorClub = async (userId) => {
    if (!userId) return null;

    const [profileClub, ownedClub, delegatedClub] = await Promise.all([
        supabase.from('profiles').select('club_id').eq('id', userId).maybeSingle(),
        supabase.from('clubs').select('*').eq('coordinator_id', userId).maybeSingle(),
        supabase
            .from('club_memberships')
            .select('club:clubs(*)')
            .eq('user_id', userId)
            .eq('role', 'sub_coordinator')
            .eq('status', 'approved')
            .limit(1)
            .maybeSingle()
    ]);

    if (ownedClub.error) throw ownedClub.error;
    if (profileClub.error) throw profileClub.error;
    if (delegatedClub.error) throw delegatedClub.error;

    if (ownedClub.data) return ownedClub.data;

    if (profileClub.data?.club_id) {
        const { data, error } = await supabase
            .from('clubs')
            .select('*')
            .eq('id', profileClub.data.club_id)
            .maybeSingle();

        if (error) throw error;
        if (data) return data;
    }

    return delegatedClub.data?.club || null;
};

export const useCoordinatorClub = () => {
    const { profile } = useAuthStore();

    return useQuery({
        queryKey: ['coordinatorClub', profile?.id],
        enabled: !!profile?.id && profile?.role === 'coordinator',
        queryFn: () => resolveCoordinatorClub(profile?.id),
    });
};
