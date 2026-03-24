import React, { useMemo } from 'react';
import {
    // eslint-disable-next-line no-unused-vars
    Box, Typography, Paper, Grid, Chip, Avatar, LinearProgress,
    // eslint-disable-next-line no-unused-vars
    CircularProgress, Stack, Alert, Card, CardContent, Divider,
    // eslint-disable-next-line no-unused-vars
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
    EmojiEvents as TrophyIcon, Assessment, TrendingUp,
    // eslint-disable-next-line no-unused-vars
    Star as StarIcon, WorkspacePremium, ErrorOutline
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RadialBarChart, RadialBar, PolarAngleAxis,
    // eslint-disable-next-line no-unused-vars
    ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useMyResults } from '../../hooks/useResults';

const RANK_MAP = { 1: { label: '🥇 1st Place', bg: 'linear-gradient(135deg,#f59e0b,#fbbf24)', text: '#7c2d12' }, 2: { label: '🥈 2nd Place', bg: 'linear-gradient(135deg,#9ca3af,#d1d5db)', text: '#111827' }, 3: { label: '🥉 3rd Place', bg: 'linear-gradient(135deg,#b45309,#d97706)', text: '#451a03' } };

const ScoreGauge = ({ score, max }) => {
    const pct = max > 0 ? Math.round((score / max) * 100) : Math.round(score);
    const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444';
    return (
        <Box sx={{ height: 100, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} data={[{ value: pct }]}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" angleAxisId={0} fill={color} cornerRadius={10} />
                </RadialBarChart>
            </ResponsiveContainer>
            <Box sx={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={900} sx={{ color }}>{pct}%</Typography>
                <Typography variant="caption" color="text.secondary">{score}/{max}</Typography>
            </Box>
        </Box>
    );
};

const ResultCard = React.forwardRef(({ result, index }, ref) => {
    const rankCfg = result.rank ? RANK_MAP[result.rank] : null;
    const pct = result.score && result.max_score ? Math.round((result.score / result.max_score) * 100) : null;
    // eslint-disable-next-line no-unused-vars
    const scoreColor = pct ? (pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444') : '#6366f1';

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
        >
            <Card sx={{
                borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)', mb: 2,
                position: 'relative',
                '&:hover': { boxShadow: '0 8px 40px rgba(0,0,0,0.1)', transform: 'translateY(-2px)', transition: 'all 0.2s' }
            }}>
                {/* Top accent bar */}
                {rankCfg && (
                    <Box sx={{ height: 4, background: rankCfg.bg }} />
                )}
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Grid container spacing={2} alignItems="center">
                        {/* Event info */}
                        <Grid item xs={12} md={5}>
                            <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                                <Avatar src={result.event?.club?.logo_url}
                                    sx={{ width: 40, height: 40, bgcolor: '#6366f120', fontSize: '1rem' }}>
                                    {result.event?.club?.name?.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                                        {result.event?.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {result.event?.club?.name} · {result.event?.category?.name}
                                    </Typography>
                                </Box>
                            </Box>
                            {result.event?.start_time && (
                                <Typography variant="caption" color="text.secondary">
                                    📅 {new Date(result.event.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Typography>
                            )}
                        </Grid>

                        {/* Score / Rank visual */}
                        <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'center' }}>
                            {result.result_type === 'score' && result.score !== null && result.max_score ? (
                                <ScoreGauge score={result.score} max={result.max_score} />
                            ) : result.result_type === 'rank' && result.rank ? (
                                <Box textAlign="center">
                                    <Typography sx={{ fontSize: '2.5rem' }}>
                                        {result.rank === 1 ? '🥇' : result.rank === 2 ? '🥈' : result.rank === 3 ? '🥉' : `#${result.rank}`}
                                    </Typography>
                                    <Typography variant="caption" fontWeight={800} color="text.secondary">
                                        {rankCfg?.label || `Rank #${result.rank}`}
                                    </Typography>
                                </Box>
                            ) : (
                                <Box textAlign="center">
                                    <Typography sx={{ fontSize: '2.5rem' }}>🎫</Typography>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">Participant</Typography>
                                </Box>
                            )}
                        </Grid>

                        {/* Chips & metadata */}
                        <Grid item xs={12} md={4}>
                            <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                                {result.prize_title && (
                                    <Chip label={result.prize_title} size="small"
                                        sx={{ fontWeight: 800, bgcolor: '#fbbf2420', color: '#b45309', border: '1px solid #fbbf2450' }} />
                                )}
                                {result.grade && (
                                    <Chip label={`Grade: ${result.grade}`} size="small" variant="outlined" color="primary" sx={{ fontWeight: 800 }} />
                                )}
                                {result.is_winner && (
                                    <Chip icon={<TrophyIcon fontSize="small" />} label="Winner" size="small" color="warning" sx={{ fontWeight: 800 }} />
                                )}
                                {result.score !== null && !result.max_score && (
                                    <Chip label={`Score: ${result.score}`} size="small" color="info" sx={{ fontWeight: 800 }} />
                                )}
                                <Chip
                                    label={result.status}
                                    size="small"
                                    color={result.status === 'locked' ? 'error' : 'success'}
                                    variant="outlined"
                                    sx={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'capitalize' }}
                                />
                            </Stack>
                            {result.remarks && (
                                <Typography variant="caption" color="text.secondary" fontStyle="italic" display="block" mt={1} textAlign={{ xs: 'left', md: 'right' }}>
                                    &quot;{result.remarks}&quot;
                                </Typography>
                            )}
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </motion.div>
    );
});
ResultCard.displayName = 'ResultCard';

const MyResults = () => {
    const { data: results, isLoading } = useMyResults();

    const stats = useMemo(() => {
        if (!results) return {};
        const total = results.length;
        const wins = results.filter(r => r.is_winner).length;
        const top3 = results.filter(r => r.rank !== null && r.rank <= 3).length;
        const avgScore = (() => {
            const scored = results.filter(r => r.score !== null && r.max_score);
            if (!scored.length) return null;
            return (scored.reduce((s, r) => s + (r.score / r.max_score) * 100, 0) / scored.length).toFixed(1);
        })();

        const rankResults = results.filter(r => r.result_type === 'rank');
        const scoreResults = results.filter(r => r.result_type === 'score');
        const participationResults = results.filter(r => r.result_type === 'participation');

        const pieData = [
            { name: 'Rank-Based', value: rankResults.length, color: '#6366f1' },
            { name: 'Score-Based', value: scoreResults.length, color: '#10b981' },
            { name: 'Participation', value: participationResults.length, color: '#f59e0b' },
        ].filter(d => d.value > 0);

        return { total, wins, top3, avgScore, pieData, rankResults, scoreResults, participationResults };
    }, [results]);

    if (isLoading) return <Box display="flex" justifyContent="center" p={8}><CircularProgress /></Box>;

    return (
        <Box sx={{ pb: 8 }}>
            {/* Hero */}
            <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 5, p: 4, borderRadius: '28px',
                    background: 'linear-gradient(135deg, #0c0d1c 0%, #1a0a2e 50%, #0d1b3e 100%)',
                    color: 'white', position: 'relative', overflow: 'hidden'
                }}>
                <Box sx={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)', top: -100, right: -100 }} />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1.5, mb: 1 }}>My Results</Typography>
                    <Typography sx={{ opacity: 0.7, fontWeight: 500 }}>
                        Your rankings, scores, and achievements across all events.
                    </Typography>
                </Box>
            </Box>

            {/* Stats */}
            <Grid container spacing={2.5} sx={{ mb: 5 }}>
                {[
                    { label: 'Events', value: stats.total ?? 0, color: '#3b82f6', icon: <Assessment /> },
                    { label: 'Wins 🏆', value: stats.wins ?? 0, color: '#fbbf24', icon: <TrophyIcon /> },
                    { label: 'Top 3 Finishes', value: stats.top3 ?? 0, color: '#10b981', icon: <WorkspacePremium /> },
                    { label: 'Avg Score', value: stats.avgScore !== null ? `${stats.avgScore}%` : 'N/A', color: '#6366f1', icon: <TrendingUp /> },
                ].map(s => (
                    <Grid item xs={6} md={3} key={s.label}>
                        <Paper sx={{ p: 2.5, borderRadius: '16px', textAlign: 'center', border: `1px solid ${s.color}25`, boxShadow: `0 4px 20px ${s.color}08` }}>
                            <Box sx={{ color: s.color, mb: 0.5, display: 'flex', justifyContent: 'center' }}>{s.icon}</Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">{s.label}</Typography>
                            <Typography variant="h4" fontWeight={900} sx={{ color: s.color }}>{s.value}</Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {(!results || results.length === 0) ? (
                <Paper sx={{ p: 6, borderRadius: '20px', textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                    <ErrorOutline sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" fontWeight={700} color="text.secondary">No published results yet</Typography>
                    <Typography variant="body2" color="text.disabled">Results will appear here once coordinators publish them.</Typography>
                </Paper>
            ) : (
                <Box>
                    {/* Winners section */}
                    {stats.wins > 0 && (
                        <Box mb={5}>
                            <Typography variant="h5" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                🏆 Wins & Podium Finishes
                            </Typography>
                            {results.filter(r => r.is_winner || (r.rank && r.rank <= 3)).map((r, i) => (
                                <ResultCard key={r.id} result={r} index={i} />
                            ))}
                        </Box>
                    )}

                    {/* All results */}
                    <Typography variant="h5" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Assessment color="primary" /> All Results ({stats.total})
                    </Typography>
                    <AnimatePresence>
                        {results.map((r, i) => <ResultCard key={r.id} result={r} index={i} />)}
                    </AnimatePresence>
                </Box>
            )}
        </Box>
    );
};

export default MyResults;
