import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, Paper, Grid, TextField, Divider, Chip, CircularProgress, Stack, Avatar, useTheme, Card, CardContent
} from '@mui/material';
import {
    Person as PersonIcon, Add as AddIcon, ExitToApp as LeaveIcon, Send as SubmitIcon, GitHub as GitHubIcon, VideoLibrary as VideoIcon, ErrorOutline, CheckCircle, AssignmentInd, BusinessCenter, RocketLaunch, Groups
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { useEventById } from '../../hooks/useEventById';
import { useEventTeams, useUserTeam, useTeamMutations } from '../../hooks/useTeams';

const Teams = () => {
    const { id: eventId } = useParams();
    const { user, profile } = useAuthStore();
    const navigate = useNavigate();
    const theme = useTheme();

    const { data: event, isLoading: eventLoading } = useEventById(eventId);
    const { data: teams, isLoading: teamsLoading } = useEventTeams(eventId);
    const { data: userTeam, isLoading: userTeamLoading } = useUserTeam(eventId, user?.id);
    const { createTeam, joinTeam, leaveTeam, submitProject } = useTeamMutations(eventId);

    const [newTeamName, setNewTeamName] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    const [demoUrl, setDemoUrl] = useState('');

    if (eventLoading || teamsLoading || userTeamLoading) {
        return <Box display="flex" justifyContent="center" alignItems="center" height="60vh"><CircularProgress /></Box>;
    }

    if (event?.event_type !== 'hackathon') {
        return (
            <Box textAlign="center" p={8} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, bgcolor: theme.palette.background.paper }}>
                <ErrorOutline sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" fontWeight={700}>Not a Hackathon Event</Typography>
                <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>Team formation is structurally disabled for general events and seminars.</Typography>
                <Button variant="contained" onClick={() => navigate(-1)}>Return to Governance</Button>
            </Box>
        );
    }

    const handleCreateTeam = () => {
        if (!newTeamName.trim()) return;
        createTeam.mutate({ teamName: newTeamName, userId: user.id, collegeDept: profile?.department });
    };

    const handleJoinTeam = (teamId) => {
        joinTeam.mutate({ teamId, userId: user.id });
    };

    const handleLeaveTeam = () => {
        if (window.confirm(userTeam?.leader_id === user?.id ? 'As leader, leaving will permanently disband the team matrix. Proceed?' : 'Revoke your team membership?')) {
            leaveTeam.mutate({
                teamId: userTeam.id,
                userId: user.id,
                isLeader: userTeam?.leader_id === user?.id
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submitProject.mutate({
            teamId: userTeam.id,
            githubUrl,
            demoUrl
        });
    };

    return (
        <Box sx={{ maxWidth: 1200, margin: '0 auto', pb: 6 }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, letterSpacing: -0.5 }}>
                        Sprint Workspace
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {event?.title} • Team Directory & Submission Pipeline
                    </Typography>
                </Box>
                {userTeam && (
                    <Chip
                        icon={<CheckCircle fontSize="small" />}
                        label="Registered"
                        sx={{ fontWeight: 700, bgcolor: theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none' }}
                    />
                )}
            </Box>

            {userTeam ? (
                // ACTIVE WORKSPACE
                <Grid container spacing={4}>
                    <Grid item xs={12} md={5}>
                        <Paper elevation={0} sx={{ p: 0, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                            <Box sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#f8fafc', borderBottom: `1px solid ${theme.palette.divider}` }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>ACTIVE SQUAD</Typography>
                                        <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>{userTeam.team_name}</Typography>
                                    </Box>
                                    <Chip label={userTeam.leader_id === user?.id ? 'Admin' : 'Member'} size="small" sx={{ fontWeight: 700, bgcolor: theme.palette.primary.main, color: 'primary.contrastText' }} />
                                </Box>
                            </Box>
                            <Box sx={{ p: 3 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 2, display: 'block' }}>TEAM ROSTER</Typography>
                                <Stack spacing={2}>
                                    {(userTeam.team_members || []).map((member) => (
                                        <Box key={member.user_id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, bgcolor: theme.palette.background.default }}>
                                            <Avatar sx={{ width: 40, height: 40, bgcolor: member.user_id === userTeam.leader_id ? theme.palette.primary.main : theme.palette.action.disabledBackground, fontWeight: 700 }}>
                                                {member.profiles?.full_name?.charAt(0) || <PersonIcon />}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }} noWrap>{member.profiles?.full_name}</Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{member.user_id === userTeam.leader_id ? 'Squad Leader' : 'Developer'}</Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Stack>
                                <Divider sx={{ my: 3 }} />
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color="error"
                                    startIcon={<LeaveIcon />}
                                    onClick={handleLeaveTeam}
                                    sx={{ fontWeight: 700, borderRadius: 2 }}
                                >
                                    {userTeam.leader_id === user?.id ? 'Disband Infrastructure' : 'Revoke Access'}
                                </Button>
                            </Box>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={7}>
                        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <RocketLaunch sx={{ color: theme.palette.primary.main }} />
                                <Typography variant="h6" fontWeight={800}>Deployment Pipeline</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
                                Synchronize your version control and demo assets for judicial review.
                            </Typography>

                            <form onSubmit={handleSubmit}>
                                <Stack spacing={3}>
                                    <Box>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>SOURCE CODE DISTRIBUTION (GITHUB/GITLAB)</Typography>
                                        <TextField
                                            fullWidth
                                            placeholder="https://github.com/organization/repository"
                                            value={githubUrl || (userTeam.github_url || '')}
                                            onChange={(e) => setGithubUrl(e.target.value)}
                                            InputProps={{ startAdornment: <GitHubIcon sx={{ mr: 1.5, color: 'text.disabled' }} /> }}
                                            disabled={userTeam.leader_id !== user?.id}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                        />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>VIDEO PRESENTATION URI (YOUTUBE/VIMEO)</Typography>
                                        <TextField
                                            fullWidth
                                            placeholder="https://youtube.com/watch?v=..."
                                            value={demoUrl || (userTeam.demo_url || '')}
                                            onChange={(e) => setDemoUrl(e.target.value)}
                                            InputProps={{ startAdornment: <VideoIcon sx={{ mr: 1.5, color: 'text.disabled' }} /> }}
                                            disabled={userTeam.leader_id !== user?.id}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                        />
                                    </Box>

                                    {userTeam.leader_id === user?.id ? (
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            size="large"
                                            fullWidth
                                            startIcon={<SubmitIcon />}
                                            sx={{ mt: 2, fontWeight: 700, borderRadius: 2, py: 1.5 }}
                                            disabled={submitProject.isPending}
                                        >
                                            {userTeam.submitted_at ? 'Commit Revision' : 'Initialize Final Build'}
                                        </Button>
                                    ) : (
                                        <Paper elevation={0} sx={{ p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', textAlign: 'center', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Only the Squad Leader can execute build submissions.</Typography>
                                        </Paper>
                                    )}

                                    {userTeam.submitted_at && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
                                            <CheckCircle sx={{ color: '#10b981', fontSize: 16 }} />
                                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#10b981' }}>
                                                Build accepted at {new Date(userTeam.submitted_at).toLocaleString()}
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </form>
                        </Paper>
                    </Grid>
                </Grid>
            ) : (
                // TEAM FORMATION LOBBY
                <Grid container spacing={4}>
                    <Grid item xs={12} md={4}>
                        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, height: '100%', bgcolor: theme.palette.background.paper }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                <BusinessCenter sx={{ color: theme.palette.primary.main }} />
                                <Typography variant="h6" fontWeight={800}>Initialize Squad</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                                Establish a new organizational unit. You will be assigned as the primary administrative lead.
                            </Typography>
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>UNIT DESIGNATION</Typography>
                                <TextField
                                    fullWidth
                                    placeholder="Enter identifier..."
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                            </Box>
                            <Button
                                variant="contained"
                                fullWidth
                                size="large"
                                startIcon={<AddIcon />}
                                onClick={handleCreateTeam}
                                disabled={createTeam.isPending}
                                sx={{ fontWeight: 700, borderRadius: 2 }}
                            >
                                Deploy Unit
                            </Button>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={8}>
                        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                <AssignmentInd sx={{ color: theme.palette.primary.main }} />
                                <Typography variant="h6" fontWeight={800}>Join Active Matrix</Typography>
                            </Box>

                            {(!teams || teams.length === 0) ? (
                                <Box sx={{ p: 6, textAlign: 'center', border: `1px dashed ${theme.palette.divider}`, borderRadius: 2 }}>
                                    <Groups sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'text.primary' }}>No Available Units</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>The server matrix is currently empty. Initialize a squad to begin.</Typography>
                                </Box>
                            ) : (
                                <Grid container spacing={3}>
                                    {teams?.map((team) => {
                                        const memberCount = team.team_members?.length || 0;
                                        const isFull = memberCount >= 4;
                                        return (
                                            <Grid item xs={12} sm={6} key={team.id}>
                                                <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, transition: 'transform 0.2s', '&:hover': { borderColor: theme.palette.primary.main, transform: 'translateY(-2px)' } }}>
                                                    <CardContent sx={{ p: 2.5 }}>
                                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                                            <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ maxWidth: '70%' }}>{team.team_name}</Typography>
                                                            <Chip
                                                                size="small"
                                                                label={`${memberCount}/4 Slots`}
                                                                sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20, bgcolor: isFull ? (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)') : (theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)'), color: isFull ? '#ef4444' : '#10b981', border: 'none' }}
                                                            />
                                                        </Box>
                                                        <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                                                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: theme.palette.action.disabled }}>
                                                                {team.team_members.find(m => m.user_id === team.leader_id)?.profiles?.full_name?.charAt(0) || 'A'}
                                                            </Avatar>
                                                            <Box>
                                                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1 }}>Administrated by</Typography>
                                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{team.team_members.find(m => m.user_id === team.leader_id)?.profiles?.full_name}</Typography>
                                                            </Box>
                                                        </Box>
                                                        <Button
                                                            fullWidth
                                                            variant={isFull ? "outlined" : "contained"}
                                                            disabled={isFull || joinTeam.isPending}
                                                            onClick={() => handleJoinTeam(team.id)}
                                                            sx={{ fontWeight: 700, borderRadius: 1.5 }}
                                                        >
                                                            {isFull ? 'Capacity Reached' : 'Request Access'}
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};

export default Teams;
