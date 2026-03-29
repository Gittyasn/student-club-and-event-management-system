// eslint-disable-next-line no-unused-vars
import React from 'react';
import {
    Box, Typography, Grid, Paper, Avatar, Chip,
    // eslint-disable-next-line no-unused-vars
    LinearProgress, Stack
} from '@mui/material';
import LoadingDots from '../../components/LoadingDots';
import {
    // eslint-disable-next-line no-unused-vars
    EmojiEvents, WorkspacePremium, Bolt, People
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useEngagementLeaderboard } from '../../hooks/useAnalytics';
import { useAuthStore } from '../../store/authStore';

const LEVEL_COLORS = {
    'Campus Leader': '#fbbf24',
    'Highly Active': '#10b981',
    'Active': '#3b82f6',
    'Beginner': '#94a3b8',
};

const RANK_MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

const EngagementLeaderboard = () => {
    const { data: leaderboard, isLoading } = useEngagementLeaderboard();
    const { user } = useAuthStore();
    const maxScore = leaderboard?.[0]?.score || 1;

    if (isLoading) return <LoadingDots label="Loading leaderboard..." minHeight="50vh" />;

    const myRank = leaderboard ? leaderboard.findIndex(u => u.id === user?.id) : -1;

    return (
        <Box sx={{ pb: 8 }}>
            {/* Hero */}
            <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 5, p: { xs: 3, md: 5 }, borderRadius: '28px',
                    background: 'linear-gradient(135deg, #0c0a1e 0%, #2d1a4f 50%, #0f1b3e 100%)', color: 'white', position: 'relative', overflow: 'hidden'
                }}>
                <Box sx={{ position: 'absolute', top: -120, right: -80, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="overline" sx={{ color: '#fbbf24', fontWeight: 900, letterSpacing: 3 }}>PLATFORM</Typography>
                    <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1.5, mb: 1 }}>🏆 Engagement Leaderboard</Typography>
                    <Typography sx={{ opacity: 0.65, fontWeight: 500 }}>
                        Ranked by weighted engagement score — attendance, clubs, certificates, and feedback.
                    </Typography>
                    {myRank >= 0 && (
                        <Chip icon={<Bolt sx={{ color: '#fbbf24 !important' }} />}
                            label={`You are #${myRank + 1} on the leaderboard`}
                            sx={{ mt: 2, bgcolor: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontWeight: 800, border: '1px solid rgba(251,191,36,0.3)' }} />
                    )}
                </Box>
            </Box>

            {/* Score legend */}
            <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', mb: 4 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase" mb={1.5} display="block">Score Formula</Typography>
                <Grid container spacing={2}>
                    {[
                        { label: 'Event Attended', pts: '×10', color: '#10b981' },
                        { label: 'Club Membership', pts: '×5', color: '#8b5cf6' },
                        { label: 'Winner Certificate', pts: '×20', color: '#fbbf24' },
                        { label: 'Merit Certificate', pts: '×12', color: '#8b5cf6' },
                        { label: 'Participation Cert', pts: '×8', color: '#3b82f6' },
                        { label: 'Feedback Given', pts: '×2', color: '#ec4899' },
                        { label: 'Registration', pts: '×2', color: '#06b6d4' },
                    ].map(f => (
                        <Grid item xs={12} sm={6} md={3} key={f.label}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Chip label={f.pts} size="small" sx={{ bgcolor: `${f.color}15`, color: f.color, fontWeight: 900, minWidth: 36 }} />
                                <Typography variant="caption" fontWeight={700}>{f.label}</Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Paper>

            {/* Top 3 podium */}
            {leaderboard && leaderboard.length >= 3 && (
                <Grid container spacing={2} sx={{ mb: 4, alignItems: 'flex-end' }}>
                    {/* 2nd */}
                    <Grid item xs={4}>
                        <Paper component={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            sx={{ p: 3, borderRadius: '20px', textAlign: 'center', border: '2px solid #94a3b840', boxShadow: '0 4px 24px rgba(148,163,184,0.1)', height: '90%' }}>
                            <Typography sx={{ fontSize: '2rem', mb: 1 }}>🥈</Typography>
                            <Avatar src={leaderboard[1].avatar_url} sx={{ width: 56, height: 56, mx: 'auto', mb: 1, border: '3px solid #94a3b8' }}>
                                {leaderboard[1].full_name?.charAt(0)}
                            </Avatar>
                            <Typography fontWeight={900} variant="body2" sx={{ lineHeight: 1.3 }}>{leaderboard[1].full_name}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">{leaderboard[1].department}</Typography>
                            <Chip label={`${leaderboard[1].score} pts`} size="small" sx={{ mt: 1, fontWeight: 900, bgcolor: '#94a3b820', color: '#64748b' }} />
                        </Paper>
                    </Grid>
                    {/* 1st */}
                    <Grid item xs={4}>
                        <Paper component={motion.div} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                            sx={{
                                p: 3, borderRadius: '20px', textAlign: 'center',
                                border: '2px solid #fbbf2460', boxShadow: '0 8px 32px rgba(251,191,36,0.2)',
                                background: 'linear-gradient(180deg, #fbbf2408 0%, transparent 100%)'
                            }}>
                            <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🥇</Typography>
                            <Avatar src={leaderboard[0].avatar_url} sx={{ width: 68, height: 68, mx: 'auto', mb: 1, border: '3px solid #fbbf24', boxShadow: '0 0 16px rgba(251,191,36,0.4)' }}>
                                {leaderboard[0].full_name?.charAt(0)}
                            </Avatar>
                            <Typography fontWeight={900} variant="subtitle1" sx={{ lineHeight: 1.3 }}>{leaderboard[0].full_name}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">{leaderboard[0].department}</Typography>
                            <Chip label={`${leaderboard[0].score} pts`} size="small" sx={{ mt: 1, fontWeight: 900, bgcolor: '#fbbf2420', color: '#b45309' }} />
                            <Chip label="Campus Leader 👑" size="small" sx={{ mt: 0.5, ml: 0, fontWeight: 800, bgcolor: '#fbbf2415', color: '#92400e', fontSize: '0.65rem' }} />
                        </Paper>
                    </Grid>
                    {/* 3rd */}
                    <Grid item xs={4}>
                        <Paper component={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            sx={{ p: 3, borderRadius: '20px', textAlign: 'center', border: '2px solid #cd7c2f40', boxShadow: '0 4px 20px rgba(205,124,47,0.1)', height: '90%' }}>
                            <Typography sx={{ fontSize: '2rem', mb: 1 }}>🥉</Typography>
                            <Avatar src={leaderboard[2].avatar_url} sx={{ width: 56, height: 56, mx: 'auto', mb: 1, border: '3px solid #cd7c2f' }}>
                                {leaderboard[2].full_name?.charAt(0)}
                            </Avatar>
                            <Typography fontWeight={900} variant="body2" sx={{ lineHeight: 1.3 }}>{leaderboard[2].full_name}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">{leaderboard[2].department}</Typography>
                            <Chip label={`${leaderboard[2].score} pts`} size="small" sx={{ mt: 1, fontWeight: 900, bgcolor: '#cd7c2f20', color: '#92400e' }} />
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Full ranked list */}
            <Paper sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'center' }}>
                    <People color="action" fontSize="small" />
                    <Typography variant="h6" fontWeight={800}>Top {leaderboard?.length || 0} Students</Typography>
                </Box>
                <AnimatePresence>
                    {(leaderboard || []).map((student, index) => {
                        const levelColor = LEVEL_COLORS[student.level] || '#94a3b8';
                        const isMe = student.id === user?.id;
                        return (
                            <motion.div key={student.id}
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(index * 0.02, 0.5) }}>
                                <Box sx={{
                                    display: 'flex', alignItems: 'center', p: 2, gap: 2,
                                    borderBottom: '1px solid', borderColor: 'divider',
                                    bgcolor: isMe ? `${levelColor}08` : 'inherit',
                                    '&:hover': { bgcolor: 'action.hover' },
                                    transition: 'background 0.15s'
                                }}>
                                    {/* Rank */}
                                    <Box sx={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                                        {index < 3 ? (
                                            <Typography sx={{ fontSize: '1.3rem' }}>{RANK_MEDAL[index + 1]}</Typography>
                                        ) : (
                                            <Typography variant="subtitle1" fontWeight={900} color="text.secondary">#{index + 1}</Typography>
                                        )}
                                    </Box>

                                    {/* Avatar */}
                                    <Avatar src={student.avatar_url}
                                        sx={{ width: 40, height: 40, bgcolor: `${levelColor}25`, border: `2px solid ${levelColor}40`, flexShrink: 0 }}>
                                        {student.full_name?.charAt(0)}
                                    </Avatar>

                                    {/* Name + dept */}
                                    <Box flex={1} minWidth={0}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography variant="body2" fontWeight={800} noWrap>{student.full_name}</Typography>
                                            {isMe && <Chip label="You" size="small" color="primary" sx={{ fontWeight: 800, fontSize: '0.6rem', height: 18 }} />}
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" noWrap>{student.department}</Typography>
                                    </Box>

                                    {/* Level chip */}
                                    <Chip label={student.level} size="small"
                                        sx={{ bgcolor: `${levelColor}15`, color: levelColor, fontWeight: 800, fontSize: '0.65rem', flexShrink: 0 }} />

                                    {/* Score + bar */}
                                    <Box sx={{ width: 120, flexShrink: 0 }}>
                                        <Box display="flex" justifyContent="space-between" mb={0.3}>
                                            <Typography variant="caption" fontWeight={900} sx={{ color: levelColor }}>{student.score}</Typography>
                                            <Typography variant="caption" color="text.disabled">pts</Typography>
                                        </Box>
                                        <LinearProgress variant="determinate"
                                            value={maxScore > 0 ? Math.round((student.score / maxScore) * 100) : 0}
                                            sx={{ height: 6, borderRadius: '4px', bgcolor: `${levelColor}15`, '& .MuiLinearProgress-bar': { bgcolor: levelColor } }} />
                                    </Box>
                                </Box>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </Paper>
        </Box>
    );
};

export default EngagementLeaderboard;
