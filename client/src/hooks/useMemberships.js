import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

export const useMemberships = () => {
    return {};
};

// Hook for students to join a club
export const useJoinClub = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ clubId, autoApprove }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const initialStatus = autoApprove ? 'approved' : 'pending';

            const { data: existingMembership, error: existingError } = await supabase
                .from('club_memberships')
                .select('id, status')
                .eq('club_id', clubId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (existingError) throw existingError;

            if (existingMembership?.status === 'pending') {
                throw Object.assign(new Error("You have already requested to join this club."), { code: '23505' });
            }

            if (existingMembership?.status === 'approved') {
                throw Object.assign(new Error("You are already a member of this club."), { code: '23505' });
            }

            let mutation;

            if (existingMembership) {
                mutation = supabase
                    .from('club_memberships')
                    .update({
                        status: initialStatus,
                        role: 'member',
                        removed_at: null,
                        removal_reason: null,
                        approved_by: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingMembership.id);
            } else {
                mutation = supabase
                    .from('club_memberships')
                    .insert([
                        { club_id: clubId, user_id: user.id, status: initialStatus }
                    ]);
            }

            const { data, error } = await mutation
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success("Membership request sent successfully!");
            queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
            queryClient.invalidateQueries({ queryKey: ['clubs'] }); // Update club card button state
        },
        onError: (error) => {
            if (error.code === '23505') {
                toast.error(error.message || "You have already requested to join this club.");
            } else {
                toast.error(error.message || "Failed to join club");
            }
        }
    });
};

// Hook for students to see their own memberships
export const useMyMemberships = () => {
    return useQuery({
        queryKey: ['myMemberships'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('club_memberships')
                .select(`
                    id, club_id, user_id, status, joined_at,
                    club:clubs(
                        name,
                        events(count)
                    )
                `)
                .eq('user_id', user.id);

            if (error) throw error;
            return data;
        }
    });
};

// Hook for coordinators/admins to view memberships
export const useClubMemberships = (clubId) => {
    return useQuery({
        queryKey: ['memberships', clubId],
        queryFn: async () => {
            let query = supabase
                .from('club_memberships')
                .select(`
                    id, club_id, user_id, status, joined_at,
                    club:clubs(name),
                    profile:profiles!user_id(full_name, email, role)
                `)
                .order('joined_at', { ascending: false });

            if (clubId) {
                query = query.eq('club_id', clubId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: true // Can be toggled if needed
    });
};

// Hook to update membership status (Approve/Reject/Remove)
export const useUpdateMembershipStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status, rejection_reason, removal_reason }) => {
            const updates = { status };

            const { data, error } = await supabase
                .from('club_memberships')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            if (status === 'rejected' && rejection_reason) {
                console.info('Membership rejection reason:', rejection_reason);
            }

            if (status === 'removed' && removal_reason) {
                console.info('Membership removal reason:', removal_reason);
            }

            return data;
        },
        onSuccess: () => {
            toast.success("Membership status updated!");
            queryClient.invalidateQueries({ queryKey: ['memberships'] });
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
            queryClient.invalidateQueries({ queryKey: ['approvedMembers'] });
            queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
            queryClient.invalidateQueries({ queryKey: ['clubs'] });
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update membership");
        }
    });
};

export const useLeaveClub = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('club_memberships')
                .update({ status: 'left' })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Successfully left the club.");
            queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
            queryClient.invalidateQueries({ queryKey: ['clubProfile'] });
            queryClient.invalidateQueries({ queryKey: ['clubs'] });
        },
        onError: (error) => {
            toast.error(error.message || "Failed to leave club");
        }
    });
};

// Hook to assign/remove roles (Core Member, Sub-Coordinator, etc)
export const useUpdateMembershipRole = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, role }) => {
            const { data, error } = await supabase
                .from('club_memberships')
                .update({ role })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Member role updated successfully');
            queryClient.invalidateQueries({ queryKey: ['memberships'] });
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to update member role');
        }
    });
};
