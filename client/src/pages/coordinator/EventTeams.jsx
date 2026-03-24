import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, Paper, CircularProgress, IconButton, Chip, Tooltip, Avatar, AvatarGroup, useTheme
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { ArrowBack as BackIcon, GitHub as GitHubIcon, VideoLibrary as VideoIcon, Launch as LaunchIcon, CheckCircle, Warning } from '@mui/icons-material';
import { useEventTeams } from '../../hooks/useTeams';
import { useEventById } from '../../hooks/useEventById';
import RolePageHeader from '../../components/RolePageHeader';

const EventTeams = () => {
    const { id: eventId } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const { data: teams, isLoading: teamsLoading } = useEventTeams(eventId);
    const { data: event, isLoading: eventLoading } = useEventById(eventId);

    const columns = [
        {
            field: 'team_name',
            headerName: 'Squad Identifier',
            flex: 1.5,
            renderCell: (params) => (
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'members',
            headerName: 'Developer Roster',
            flex: 1.5,
            renderCell: (params) => (
                <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.75rem', border: `2px solid ${theme.palette.background.paper}` } }}>
                    {(params.row.team_members || []).map((member) => (
                        <Tooltip key={member.user_id} title={member.profiles?.full_name || 'Member'}>
                            <Avatar>{(member.profiles?.full_name || 'U').charAt(0)}</Avatar>
                        </Tooltip>
                    ))}
                </AvatarGroup>
            )
        },
        {
            field: 'submitted_at',
            headerName: 'Code Quality Gate',
            flex: 1,
            renderCell: (params) => (
                <Chip
                    icon={params.value ? <CheckCircle fontSize="small" /> : <Warning fontSize="small" />}
                    label={params.value ? 'Build Passed' : 'Awaiting Push'}
                    sx={{
                        height: 24, fontSize: '0.7rem', fontWeight: 700, border: 'none',
                        bgcolor: params.value ? (theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)') : (theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)'),
                        color: params.value ? '#10b981' : '#f59e0b'
                    }}
                />
            )
        },
        {
            field: 'status',
            headerName: 'Governance State',
            flex: 1,
            renderCell: (params) => {
                const state = params.value || 'active';
                const isError = state === 'disqualified';
                const isWarn = state === 'eliminated';

                return (
                    <Chip
                        label={state.toUpperCase()}
                        sx={{
                            height: 22, fontSize: '0.65rem', fontWeight: 700, border: 'none',
                            bgcolor: isError ? (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)') : isWarn ? (theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)') : (theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'),
                            color: isError ? '#ef4444' : isWarn ? '#f59e0b' : '#3b82f6'
                        }}
                    />
                );
            }
        },
        {
            field: 'links',
            headerName: 'Artifacts',
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <Box display="flex" gap={1}>
                    {params.row.github_url ? (
                        <Tooltip title="VCS Repository">
                            <IconButton size="small" component="a" href={params.row.github_url} target="_blank" sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: theme.palette.action.hover } }}>
                                <GitHubIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    ) : null}
                    {params.row.demo_url ? (
                        <Tooltip title="Video Telemetry">
                            <IconButton size="small" component="a" href={params.row.demo_url} target="_blank" sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: theme.palette.action.hover } }}>
                                <VideoIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    ) : null}
                    {!params.row.github_url && !params.row.demo_url && (
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>NO ARTIFACTS</Typography>
                    )}
                </Box>
            )
        },
        {
            field: 'actions',
            headerName: '',
            width: 120,
            sortable: false,
            renderCell: (params) => (
                <Button
                    size="small"
                    variant="outlined"
                    endIcon={<LaunchIcon fontSize="small" />}
                    onClick={() => navigate(`/coordinator/events/${eventId}/teams/${params.row.id}`)}
                    sx={{ fontWeight: 700, borderRadius: 1.5, py: 0.5 }}
                >
                    Scorecard
                </Button>
            )
        }
    ];

    if (teamsLoading || eventLoading) return <Box display="flex" justifyContent="center" alignItems="center" height="60vh"><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1400, margin: '0 auto', pb: 6 }}>
            <RolePageHeader
                kicker="Coordinator Suite"
                title="Event Teams"
                subtitle="Review team submissions and member rosters."
            />
            <Button startIcon={<BackIcon />} onClick={() => navigate('/coordinator/events')} sx={{ mb: 3, fontWeight: 600, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
                Return to Directory
            </Button>

            <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={4}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, letterSpacing: -0.5 }}>
                        Sprint Infrastructure Oversight
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {event?.title} • Active Server Nodes
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Paper elevation={0} sx={{ px: 2, py: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: theme.palette.background.paper }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.2 }}>REGISTERED SQUADS</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>{teams?.length || 0}</Typography>
                    </Paper>
                    <Paper elevation={0} sx={{ px: 2, py: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: theme.palette.background.paper }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.2 }}>COMMITTED BUILDS</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1, color: theme.palette.primary.main }}>{teams?.filter(t => t.submitted_at).length || 0}</Typography>
                    </Paper>
                </Box>
            </Box>

            <Paper elevation={0} sx={{ height: 600, width: '100%', border: `1px solid ${theme.palette.divider}`, borderRadius: 3, overflow: 'hidden' }}>
                <DataGrid
                    rows={teams || []}
                    columns={columns}
                    disableRowSelectionOnClick
                    rowHeight={60}
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-columnHeaders': {
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                            borderBottom: `1px solid ${theme.palette.divider}`
                        },
                        '& .MuiDataGrid-cell': {
                            borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`
                        }
                    }}
                />
            </Paper>
        </Box>
    );
};

export default EventTeams;
