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

            const { data, error } = await supabase
                .from('club_memberships')
                .insert([
                    { club_id: clubId, user_id: user.id, status: initialStatus }
                ])
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
                toast.error("You have already requested to join this club.");
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
                    id, club_id, user_id, status, joined_at, role,
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
                    id, club_id, user_id, status, joined_at, role,
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
            const { data: { user } } = await supabase.auth.getUser();

            const updates = {
                status,
                updated_at: new Date().toISOString()
            };

            if (status === 'approved') {
                updates.approved_by = user.id;
            }
            if (status === 'rejected' && rejection_reason) {
                // Assuming we might log this in audit_logs, or just keep it minimal
                updates.removal_reason = rejection_reason;
            }
            if (status === 'removed') {
                updates.removed_at = new Date().toISOString();
                updates.removal_reason = removal_reason;
            }

            const { data, error } = await supabase
                .from('club_memberships')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success("Membership status updated!");
            queryClient.invalidateQueries({ queryKey: ['memberships'] });
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
                .update({ status: 'left', updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Successfully left the club.");
            queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
            queryClient.invalidateQueries({ queryKey: ['clubProfile'] });
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
                .update({ role, updated_at: new Date().toISOString() })
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
