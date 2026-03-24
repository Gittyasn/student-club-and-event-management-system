import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

// --- MISSING HOOKS (Added to fix build crash) ---
export const useHackathonRounds = (eventId) => {
    return useQuery({
        queryKey: ['hackathon_rounds', eventId],
        queryFn: async () => {
            if (!eventId) return [];
            return []; // Stub to prevent crash
        },
        enabled: !!eventId,
    });
};

export const useHackathonJudges = (eventId) => {
    return useQuery({
        queryKey: ['hackathon_judges', eventId],
        queryFn: async () => {
            if (!eventId) return [];
            return []; // Stub to prevent crash
        },
        enabled: !!eventId,
    });
};

// --- TEAMS ---

export const useHackathonTeams = (eventId) => {
    return useQuery({
        queryKey: ['hackathon_teams', eventId],
        queryFn: async () => {
            if (!eventId) return [];
            const { data, error } = await supabase
                .from('hackathon_teams')
                .select(`
                    id, name, status, created_at, leader_id,
                    leader:users!hackathon_teams_leader_id_fkey(full_name, email, avatar_url),
                    members:hackathon_team_members(
                        user:users(id, full_name, email, avatar_url),
                        role, joined_at
                    ),
                    submission:hackathon_submissions(id, title, is_final, total_score:hackathon_evaluations(total_score))
                `)
                .eq('event_id', eventId);
            if (error) throw error;
            return data;
        },
        enabled: !!eventId,
    });
};

export const useTeamDetails = (teamId) => {
    return useQuery({
        queryKey: ['hackathon_team', teamId],
        queryFn: async () => {
            if (!teamId) return null;
            const { data, error } = await supabase
                .from('hackathon_teams')
                .select(`
                    *,
                    leader:users!hackathon_teams_leader_id_fkey(full_name, email),
                    members:hackathon_team_members(
                        id, role, joined_at,
                        user:users(id, full_name, email, avatar_url)
                    ),
                    submission:hackathon_submissions(*)
                `)
                .eq('id', teamId)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },
        enabled: !!teamId,
    });
};

export const useCreateTeam = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ event_id, name, leader_id, college_dept, contact_email, members = [] }) => {
            // 1. Create Team
            const { data: team, error: teamError } = await supabase
                .from('hackathon_teams')
                .insert({ event_id, name, leader_id, college_dept, contact_email, status: 'approved' }) // Auto approve for testing
                .select()
                .single();
            if (teamError) throw teamError;

            // 2. Add Leader as member
            await supabase.from('hackathon_team_members').insert({
                team_id: team.id, user_id: leader_id, role: 'Leader'
            });

            // 3. Add other members if provided
            if (members.length > 0) {
                const memberInserts = members.map(m => ({
                    team_id: team.id, user_id: m.id, role: m.role || 'Member'
                }));
                const { error: memError } = await supabase.from('hackathon_team_members').insert(memberInserts);
                if (memError) throw memError;
            }

            return team;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hackathon_teams'] });
            queryClient.invalidateQueries({ queryKey: ['hackathon_team'] });
        }
    });
};

export const useLeaveTeam = (eventId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ teamId, userId, isLeader }) => {
            if (isLeader) {
                const { error } = await supabase.from('hackathon_teams').delete().eq('id', teamId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('hackathon_team_members').delete().eq('team_id', teamId).eq('user_id', userId);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hackathon_teams', eventId] });
            queryClient.invalidateQueries({ queryKey: ['hackathon_team'] });
        }
    });
};

// --- SUBMISSIONS ---

export const useHackathonSubmissions = (eventId) => {
    return useQuery({
        queryKey: ['hackathon_submissions', eventId],
        queryFn: async () => {
            if (!eventId) return [];
            const { data, error } = await supabase
                .from('hackathon_submissions')
                .select(`
                    *,
                    team:hackathon_teams(name, leader_id, members:hackathon_team_members(user:users(full_name))),
                    evaluations:hackathon_evaluations(total_score, judge_id, feedback)
                `)
                .eq('event_id', eventId);
            if (error) throw error;
            return data;
        },
        enabled: !!eventId,
    });
};

export const useSubmitProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ team_id, event_id, title, description, repo_url, demo_url, presentation_url, is_final }) => {
            // Upsert submission
            const { data, error } = await supabase
                .from('hackathon_submissions')
                .upsert({ team_id, event_id, title, description, repo_url, demo_url, presentation_url, is_final }, { onConflict: 'team_id, event_id' })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hackathon_submissions'] });
            queryClient.invalidateQueries({ queryKey: ['hackathon_team'] });
        }
    });
};

// --- EVALUATIONS ---

export const useSubmitEvaluation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ submission_id, judge_id, total_score, criteria_scores, feedback }) => {
            const { data, error } = await supabase
                .from('hackathon_evaluations')
                .upsert({ submission_id, judge_id, total_score, criteria_scores, feedback }, { onConflict: 'submission_id, judge_id' })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hackathon_submissions'] });
            queryClient.invalidateQueries({ queryKey: ['hackathon_teams'] });
        }
    });
};
