import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

export const useEventTeams = (eventId) => {
    return useQuery({
        queryKey: ['eventTeams', eventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('teams')
                .select(`
                    *,
                    college_dept,
                    team_email,
                    team_members (
                        user_id,
                        profiles (full_name, email)
                    )
                `)
                .eq('event_id', eventId);

            if (error) throw error;
            return data;
        }
    });
};

export const useUserTeam = (eventId, userId) => {
    return useQuery({
        queryKey: ['userTeam', eventId, userId],
        enabled: !!userId,
        queryFn: async () => {
            // Find if user is in any team for this event
            const { data: memberData, error: memberError } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('user_id', userId);

            if (memberError) throw memberError;
            if (!memberData || memberData.length === 0) return null;

            const teamIds = memberData.map(m => m.team_id);

            // Get the team details for this specific event
            const { data: teamData, error: teamError } = await supabase
                .from('teams')
                .select(`
                    *,
                    college_dept,
                    team_email,
                    team_members (
                        user_id,
                        profiles (full_name, email)
                    )
                `)
                .in('id', teamIds)
                .eq('event_id', eventId)
                .single();

            if (teamError) return null; // User might be in a team for a different event
            return teamData;
        }
    });
};

export const useTeamMutations = (eventId) => {
    const queryClient = useQueryClient();

    const createTeam = useMutation({
        mutationFn: async ({ teamName, userId, collegeDept, teamEmail }) => {
            // 1. Create team
            const { data: team, error: teamError } = await supabase
                .from('teams')
                .insert({
                    event_id: eventId,
                    team_name: teamName,
                    leader_id: userId,
                    college_dept: collegeDept,
                    team_email: teamEmail
                })
                .select()
                .single();

            if (teamError) throw teamError;

            // 2. Add leader as member
            const { error: memberError } = await supabase
                .from('team_members')
                .insert({ team_id: team.id, user_id: userId });

            if (memberError) throw memberError;

            // 3. Auto-create team chat room
            const { error: chatError } = await supabase
                .from('chat_rooms')
                .insert({ team_id: team.id });

            if (chatError) {
                console.error('Error creating team chat room:', chatError);
                // Don't fail the whole process, just log
            }

            return team;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventTeams', eventId] });
            queryClient.invalidateQueries({ queryKey: ['userTeam', eventId] });
            toast.success('Team created successfully!');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create team');
        }
    });

    const joinTeam = useMutation({
        mutationFn: async ({ teamId, userId }) => {
            // Check max size (client side check usually enough but safety first)
            const { data: members } = await supabase
                .from('team_members')
                .select('user_id')
                .eq('team_id', teamId);

            if (members && members.length >= 4) {
                throw new Error('Team is full (max 4 members)');
            }

            const { error } = await supabase
                .from('team_members')
                .insert({ team_id: teamId, user_id: userId });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventTeams', eventId] });
            queryClient.invalidateQueries({ queryKey: ['userTeam', eventId] });
            toast.success('Joined team successfully!');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to join team');
        }
    });

    const leaveTeam = useMutation({
        mutationFn: async ({ teamId, userId, isLeader }) => {
            if (isLeader) {
                // If leader leaves, we disband the team (delete from teams)
                // Cascade handles team_members
                const { error } = await supabase
                    .from('teams')
                    .delete()
                    .eq('id', teamId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('team_members')
                    .delete()
                    .eq('team_id', teamId)
                    .eq('user_id', userId);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventTeams', eventId] });
            queryClient.invalidateQueries({ queryKey: ['userTeam', eventId] });
            toast.success('Left team successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to leave team');
        }
    });

    const submitProject = useMutation({
        mutationFn: async ({ teamId, githubUrl, demoUrl }) => {
            const { error } = await supabase
                .from('teams')
                .update({
                    github_url: githubUrl,
                    demo_url: demoUrl,
                    submitted_at: new Date().toISOString()
                })
                .eq('id', teamId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userTeam', eventId] });
            toast.success('Project submitted successfully!');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to submit project');
        }
    });

    return { createTeam, joinTeam, leaveTeam, submitProject };
};
