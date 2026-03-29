import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, Button, Paper, Stack, Chip, Divider, Avatar, useTheme, Grid
} from '@mui/material';
import {
    ArrowBack as BackIcon, GitHub as GitHubIcon, VideoLibrary as VideoIcon, Person, Block, Restore, EmojiEvents, Gavel
} from '@mui/icons-material';
import RolePageHeader from '../../components/RolePageHeader';
import LoadingDots from '../../components/LoadingDots';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';

const TeamDetails = () => {
    const { id: eventId, teamId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const theme = useTheme();

    const { data: team, isLoading } = useQuery({
        queryKey: ['teamDetails', teamId],
        enabled: !!teamId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('teams')
                .select(`
                    id,
                    team_name,
                    leader_id,
                    college_dept,
                    team_email,
                    github_url,
                    demo_url,
                    presentation_url,
                    submitted_at,
                    status,
                    event:events(id, title),
                    team_members(
                        user_id,
                        profiles(full_name, email)
                    )
                `)
                .eq('id', teamId)
                .single();

            if (error) throw error;
            return data;
        }
    });

    const { data: submissions } = useQuery({
        queryKey: ['hackathonSubmissions', teamId],
        enabled: !!teamId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('hackathon_submissions')
                .select(`
                    id,
                    round_id,
                    title,
                    description,
                    github_link,
                    demo_link,
                    presentation_url,
                    additional_docs,
                    submitted_at,
                    is_locked,
                    round:hackathon_rounds(round_name, round_number)
                `)
                .eq('team_id', teamId)
                .order('submitted_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const updateTeamStatus = useMutation({
        mutationFn: async (status) => {
            const { error } = await supabase
                .from('teams')
                .update({ status })
                .eq('id', teamId);
            if (error) throw error;

            await supabase.from('hackathon_audit_logs').insert({
                event_id: eventId,
                action_type: 'status_change',
                details: { team_id: teamId, status }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamDetails', teamId] });
            toast.success('Governance state mutated.');
        },
        onError: (e) => toast.error(e.message || 'State transition failed')
    });

    const toggleSubmissionLock = useMutation({
        mutationFn: async ({ submissionId, lock }) => {
            const { error } = await supabase
                .from('hackathon_submissions')
                .update({ is_locked: lock })
                .eq('id', submissionId);
            if (error) throw error;

            await supabase.from('hackathon_audit_logs').insert({
                event_id: eventId,
                action_type: 'submission_edit',
                details: { submission_id: submissionId, locked: lock }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hackathonSubmissions', teamId] });
            toast.success('Pipeline lock toggled.');
        },
        onError: (e) => toast.error(e.message || 'Pipeline override failed')
    });

    if (isLoading) return <LoadingDots label="Loading team details..." minHeight="60vh" />;

    if (!team) {
        return (
            <Box sx={{ p: 8, textAlign: 'center', border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
                <Typography variant="h6" color="text.secondary" fontWeight={700}>Team not found</Typography>
                <Button startIcon={<BackIcon />} onClick={() => navigate(`/coordinator/events/${eventId}/teams`)} sx={{ mt: 3, fontWeight: 600 }}>
                    Back to Teams
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 6 }}>
            <RolePageHeader
                kicker="Coordinator Dashboard"
                title="Team Details"
                subtitle="Review submissions, status, and member activity."
            />
            <Button startIcon={<BackIcon />} onClick={() => navigate(`/coordinator/events/${eventId}/teams`)} sx={{ mb: 3, fontWeight: 600, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
                Back to Teams
            </Button>

            <Grid container spacing={4}>
                {/* Left Column: Team Profile & Roster */}
                <Grid item xs={12} md={5}>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, mb: 4, bgcolor: theme.palette.background.paper }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', mb: 1, letterSpacing: 1 }}>SQUAD IDENTIFIER</Typography>
                        <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5, letterSpacing: -0.5 }}>
                            {team.team_name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mb: 3 }}>
                            Target: {team.event?.title || 'System Default'}
                        </Typography>

                        <Stack direction="row" spacing={1} sx={{ mb: 4, flexWrap: 'wrap', gap: 1 }}>
                            <Chip label={team.submitted_at ? 'Code Pushed' : 'No Build'} size="small" sx={{ fontWeight: 700, bgcolor: team.submitted_at ? (theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)') : (theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)'), color: team.submitted_at ? '#10b981' : '#f59e0b', border: 'none' }} />
                            <Chip label={`STATE: ${(team.status || 'ACTIVE').toUpperCase()}`} size="small" sx={{ fontWeight: 700, bgcolor: team.status === 'disqualified' ? (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)') : (theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'), color: team.status === 'disqualified' ? '#ef4444' : '#3b82f6', border: 'none' }} />
                        </Stack>

                        <Divider sx={{ mb: 3 }} />

                        <Box sx={{ mb: 3 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', mb: 2, letterSpacing: 1 }}>DEVELOPER ROSTER</Typography>
                            <Stack spacing={2}>
                                {(team.team_members || []).map((m) => (
                                    <Box key={m.user_id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, borderRadius: 2, '&:hover': { bgcolor: theme.palette.action.hover } }}>
                                        <Avatar sx={{ width: 36, height: 36, bgcolor: m.user_id === team.leader_id ? theme.palette.primary.main : theme.palette.action.disabledBackground, fontWeight: 700, fontSize: '1rem' }}>
                                            {m.profiles?.full_name?.charAt(0) || <Person />}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {m.profiles?.full_name || 'Anonymous User'}
                                                {m.user_id === team.leader_id && <Chip label="Admin" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800 }} color="primary" />}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>{m.profiles?.email || 'No email attached'}</Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', mb: 2, letterSpacing: 1 }}>ORCHESTRATION OVERRIDES</Typography>
                        <Stack spacing={2}>
                            <Button
                                fullWidth
                                variant="outlined"
                                color="error"
                                startIcon={<Block />}
                                disabled={team.status === 'disqualified' || updateTeamStatus.isPending}
                                onClick={() => updateTeamStatus.mutate('disqualified')}
                                sx={{ fontWeight: 700, borderRadius: 2 }}
                            >
                                Terminate Execution (Disqualify)
                            </Button>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<Restore />}
                                disabled={team.status === 'active' || updateTeamStatus.isPending}
                                onClick={() => updateTeamStatus.mutate('active')}
                                sx={{ fontWeight: 700, borderRadius: 2 }}
                            >
                                Restore Privileges
                            </Button>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Right Column: Multi-Stage Submission Pipelines */}
                <Grid item xs={12} md={7}>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, mb: 4, height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Gavel sx={{ color: theme.palette.primary.main }} />
                                <Typography variant="h6" fontWeight={800}>Submission Review</Typography>
                            </Box>
                            <Button
                                variant="outlined"
                                startIcon={<EmojiEvents />}
                                onClick={() => navigate(`/coordinator/events/${eventId}/results`)}
                                sx={{ fontWeight: 700, borderRadius: 2, size: 'small' }}
                            >
                                Review Results
                            </Button>
                        </Box>

                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
                            Review submissions, links, and scores for each round.
                        </Typography>

                        {(submissions || []).length === 0 ? (
                            <Box sx={{ p: 6, textAlign: 'center', border: `1px dashed ${theme.palette.divider}`, borderRadius: 2, bgcolor: theme.palette.background.default }}>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'text.primary', mb: 1 }}>No submissions yet</Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>This team has not uploaded any submission links for review yet.</Typography>
                            </Box>
                        ) : (
                            <Stack spacing={3}>
                                {(submissions || []).map((s) => (
                                    <Paper key={s.id} elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.default }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Box>
                                                <Typography variant="caption" sx={{ color: theme.palette.primary.main, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                                                    {s.round?.round_name || `Iteration ${s.round?.round_number || '1'}`}
                                                </Typography>
                                                <Typography variant="subtitle1" fontWeight={800}>
                                                    {s.title}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                    Timestamp: {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : 'N/A'}
                                                </Typography>
                                            </Box>
                                            <Chip label={s.is_locked ? 'READ ONLY' : 'MUTABLE'} size="small" sx={{ fontWeight: 800, fontSize: '0.65rem', bgcolor: s.is_locked ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : (theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'), color: s.is_locked ? 'text.secondary' : '#3b82f6', border: 'none' }} />
                                        </Box>

                                        {s.description && (
                                            <Box sx={{ p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderRadius: 1.5, borderLeft: `3px solid ${theme.palette.primary.main}`, mb: 3 }}>
                                                <Typography variant="body2" sx={{ color: 'text.primary', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                                    {s.description}
                                                </Typography>
                                            </Box>
                                        )}

                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', mb: 1, letterSpacing: 1 }}>ATTACHED ARTIFACTS</Typography>
                                        <Grid container spacing={2} sx={{ mb: 3 }}>
                                            <Grid item xs={12} sm={6}>
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    startIcon={<GitHubIcon />}
                                                    disabled={!s.github_link}
                                                    onClick={() => s.github_link && window.open(s.github_link, '_blank')}
                                                    sx={{ justifyContent: 'flex-start', borderRadius: 1.5, textTransform: 'none', fontWeight: 600, color: s.github_link ? 'text.primary' : 'text.disabled', borderColor: s.github_link ? theme.palette.divider : 'transparent' }}
                                                >
                                                    {s.github_link ? 'Source Repository' : 'No repository link'}
                                                </Button>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    startIcon={<VideoIcon />}
                                                    disabled={!s.demo_link}
                                                    onClick={() => s.demo_link && window.open(s.demo_link, '_blank')}
                                                    sx={{ justifyContent: 'flex-start', borderRadius: 1.5, textTransform: 'none', fontWeight: 600, color: s.demo_link ? 'text.primary' : 'text.disabled', borderColor: s.demo_link ? theme.palette.divider : 'transparent' }}
                                                >
                                                    {s.demo_link ? 'Demo Link' : 'No demo link'}
                                                </Button>
                                            </Grid>
                                        </Grid>

                                        <Divider sx={{ my: 2 }} />

                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <Button
                                                size="small"
                                                color="warning"
                                                onClick={() => toggleSubmissionLock.mutate({ submissionId: s.id, lock: !s.is_locked })}
                                                disabled={toggleSubmissionLock.isPending}
                                                sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}
                                            >
                                                {s.is_locked ? 'Unlock Submission' : 'Lock Submission'}
                                            </Button>
                                        </Box>
                                    </Paper>
                                ))}
                            </Stack>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default TeamDetails;
