import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, Paper, Grid, Avatar, Divider, Chip, useTheme
} from '@mui/material';
import {
    ArrowBack as BackIcon, EmojiEvents, Code, Memory, Public, Flag
} from '@mui/icons-material';
import { useEventResults } from '../../hooks/useResults';
import { useEventById } from '../../hooks/useEventById';
import { motion } from 'framer-motion';
import LoadingDots from '../../components/LoadingDots';

const EventResults = () => {
    const { id: eventId } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    const { data: results, isLoading: resultsLoading } = useEventResults(eventId);
    const { data: event, isLoading: eventLoading } = useEventById(eventId, { publicOnly: true });

    if (resultsLoading || eventLoading) return <LoadingDots label="Loading results..." minHeight="60vh" />;

    const getPositionConfig = (pos) => {
        switch (pos) {
            case 1: return { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', icon: <EmojiEvents sx={{ fontSize: 48, color: '#fbbf24' }} /> }; // Gold
            case 2: return { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: <EmojiEvents sx={{ fontSize: 40, color: '#94a3b8' }} /> }; // Silver
            case 3: return { color: '#cd7f32', bg: 'rgba(205,127,50,0.1)', icon: <EmojiEvents sx={{ fontSize: 36, color: '#cd7f32' }} /> }; // Bronze
            default: return { color: theme.palette.primary.main, bg: 'transparent', icon: <Flag sx={{ color: 'text.secondary' }} /> };
        }
    };

    const isHackathon = event?.event_type === 'hackathon';

    // Simulated categories for hackathon results flair
    const STACKS = ['React/Node', 'Python/ML', 'NextJS/Supabase', 'Rust/WASM'];

    return (
        <Box sx={{ maxWidth: 1200, margin: '0 auto', py: 4, pb: 10 }}>
            <Button startIcon={<BackIcon />} onClick={() => navigate(`/events/${eventId}`)} sx={{ mb: 4, fontWeight: 600, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
                Return to Directory
            </Button>

            {/* Hero Header */}
            <Box sx={{ mb: 6, textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: theme.palette.primary.main, fontWeight: 800, letterSpacing: 2, display: 'block', mb: 1 }}>
                    {isHackathon ? 'OFFICIAL HACKATHON RESULTS' : 'EVENT RESULTS'}
                </Typography>
                <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1, mb: 1, color: 'text.primary' }}>
                    {event?.title}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500, maxWidth: 600, mx: 'auto' }}>
                    Final rankings and published scores.
                </Typography>
            </Box>

            {results && results.length > 0 ? (
                <Grid container spacing={4} justifyContent="center" sx={{ px: { xs: 2, md: 0 } }}>

                    {/* Top 3 Podium */}
                    {results.slice(0, 3).map((result, index) => {
                        const config = getPositionConfig(result.position);
                        const isFirst = result.position === 1;

                        return (
                            <Grid item xs={12} sm={isFirst ? 12 : 6} md={isFirst ? 12 : 6} key={result.id}>
                                <Paper
                                    component={motion.div}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    elevation={0}
                                    sx={{
                                        position: 'relative',
                                        overflow: 'hidden',
                                        borderRadius: 4,
                                        border: `2px solid ${isFirst ? config.color : theme.palette.divider}`,
                                        bgcolor: isFirst ? (theme.palette.mode === 'dark' ? 'rgba(251,191,36,0.02)' : 'rgba(251,191,36,0.01)') : theme.palette.background.paper,
                                        boxShadow: isFirst ? `0 0 40px ${config.bg}` : 'none',
                                        p: isFirst ? 5 : 4,
                                        display: 'flex', flexDirection: isFirst ? { xs: 'column', md: 'row' } : 'column',
                                        alignItems: 'center', gap: 4,
                                        mx: isFirst ? 'auto' : 0, maxWidth: isFirst ? 900 : '100%',
                                    }}
                                >
                                    {isFirst && (
                                        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle, ${config.bg} 0%, transparent 70%)` }} />
                                    )}

                                    <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
                                        {config.icon}
                                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 900, color: config.color, mt: 1, letterSpacing: 1 }}>RANK {result.position}</Typography>
                                    </Box>

                                    <Box sx={{ flex: 1, textAlign: isFirst ? { xs: 'center', md: 'left' } : 'center' }}>
                                        <Typography variant="h4" fontWeight={900} sx={{ mb: 1, letterSpacing: -0.5 }}>
                                            {result.team_id ? result.teams?.team_name : result.profiles?.full_name}
                                        </Typography>

                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: isFirst ? { xs: 'center', md: 'flex-start' } : 'center', mb: 2 }}>
                                            {isHackathon && (
                                                <Chip icon={<Code fontSize="small" />} label={STACKS[index % STACKS.length]} size="small" sx={{ fontWeight: 700 }} />
                                            )}
                                            {result.score > 0 && (
                                                <Chip label={`${result.score} points`} size="small" color={isFirst ? "warning" : "default"} sx={{ fontWeight: 800 }} />
                                            )}
                                        </Box>

                                        {result.remarks && (
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', borderLeft: isFirst ? { xs: 'none', md: `3px solid ${config.color}` } : 'none', pl: isFirst ? { xs: 0, md: 2 } : 0 }}>
                                                &quot;{result.remarks}&quot;
                                            </Typography>
                                        )}
                                    </Box>

                                    {isFirst && isHackathon && result.teams?.github_url && (
                                        <Button variant="contained" component="a" href={result.teams.github_url} target="_blank" endIcon={<Public />} sx={{ fontWeight: 700, borderRadius: 2, bgcolor: '#000', color: '#fff', '&:hover': { bgcolor: '#333' } }}>
                                            View Project
                                        </Button>
                                    )}
                                </Paper>
                            </Grid>
                        );
                    })}

                    {/* Extended Leaderboard */}
                    {results.length > 3 && (
                        <Grid item xs={12} sx={{ mt: 4 }}>
                            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h6" fontWeight={800}>Full Rankings</Typography>
                                <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
                            </Box>

                            <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                                {results.slice(3).map((result, index) => (
                                    <Box key={result.id}>
                                        <Box sx={{
                                            display: 'flex', alignItems: 'center', p: 3, gap: 3,
                                            '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }
                                        }}>
                                            <Box sx={{ width: 40, textAlign: 'center' }}>
                                                <Typography variant="h6" fontWeight={800} color="text.secondary">#{result.position}</Typography>
                                            </Box>

                                            <Avatar sx={{ width: 48, height: 48, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', fontWeight: 700, color: 'text.primary' }}>
                                                {((result.team_id ? result.teams?.team_name : result.profiles?.full_name) || '?').charAt(0)}
                                            </Avatar>

                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle1" fontWeight={800}>{result.team_id ? result.teams?.team_name : result.profiles?.full_name}</Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                                    {result.remarks || 'No remarks shared.'}
                                                </Typography>
                                            </Box>

                                            {result.score > 0 && (
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="h6" fontWeight={800} sx={{ color: theme.palette.primary.main }}>{result.score}</Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>PTS</Typography>
                                                </Box>
                                            )}
                                        </Box>
                                        {index < results.length - 4 && <Divider />}
                                    </Box>
                                ))}
                            </Paper>
                        </Grid>
                    )}
                </Grid>
            ) : (
                <Paper elevation={0} sx={{ p: 8, textAlign: 'center', border: `1px solid ${theme.palette.divider}`, borderRadius: 3, bgcolor: theme.palette.background.paper, maxWidth: 600, mx: 'auto' }}>
                    <Memory sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Results not published yet</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Final scores will appear here after the event team publishes them.</Typography>
                </Paper>
            )
            }
        </Box >
    );
};

export default EventResults;
