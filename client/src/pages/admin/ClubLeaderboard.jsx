import { useState } from 'react';
import {
    Box, Typography, Grid, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip, Avatar,
    // eslint-disable-next-line no-unused-vars
    CircularProgress, useTheme, Tab, Tabs, LinearProgress,
    ToggleButton, ToggleButtonGroup
} from '@mui/material';
import {
    EmojiEvents as TrophyIcon,
    Groups as PeopleIcon,
    Event as EventIcon,
    Star as StarIcon,
    // eslint-disable-next-line no-unused-vars
    TrendingUp,
    WorkspacePremium
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';

const CATEGORY_COLORS = {
    Technical: '#3b82f6',
    Cultural: '#a855f7',
    Sports: '#10b981',
    'Social Service': '#f59e0b',
    Arts: '#ef4444',
    General: '#6b7280',
};

const RankBadge = ({ rank }) => {
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    if (medals[rank]) {
        return (
            <Typography fontSize="1.8rem" lineHeight={1}>{medals[rank]}</Typography>
        );
    }
    return (
        <Box sx={{
            width: 36, height: 36, borderRadius: '50%',
            bgcolor: 'action.selected', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <Typography variant="body2" fontWeight={700} color="text.secondary">#{rank}</Typography>
        </Box>
    );
};

const ClubLeaderboard = () => {
    const theme = useTheme();
    const [filter, setFilter] = useState('all');
    // eslint-disable-next-line no-unused-vars
    const [tab, setTab] = useState(0);

    const { data: clubs, isLoading } = useQuery({
        queryKey: ['clubLeaderboard'],
        queryFn: async () => {
            const [clubsRes, membershipsRes, eventsRes, feedbackRes] = await Promise.all([
                supabase.from('clubs').select('id, name, category, status, logo_url, rating').eq('status', 'active'),
                supabase.from('club_memberships').select('club_id, status').eq('status', 'approved'),
                supabase.from('events').select('id, club_id, approval_status').eq('approval_status', 'approved'),
                supabase.from('feedback').select('rating, event_id, events(club_id)')
            ]);

            const memberMap = {};
            membershipsRes.data?.forEach(m => {
                memberMap[m.club_id] = (memberMap[m.club_id] || 0) + 1;
            });

            const eventMap = {};
            eventsRes.data?.forEach(e => {
                eventMap[e.club_id] = (eventMap[e.club_id] || 0) + 1;
            });

            const ratingMap = {};
            const ratingCountMap = {};
            feedbackRes.data?.forEach(f => {
                const cid = f.events?.club_id;
                if (cid) {
                    ratingMap[cid] = (ratingMap[cid] || 0) + f.rating;
                    ratingCountMap[cid] = (ratingCountMap[cid] || 0) + 1;
                }
            });

            return (clubsRes.data || []).map(c => ({
                ...c,
                memberCount: memberMap[c.id] || 0,
                eventCount: eventMap[c.id] || 0,
                avgRating: ratingCountMap[c.id]
                    ? (ratingMap[c.id] / ratingCountMap[c.id]).toFixed(1)
                    : '—',
                score: (memberMap[c.id] || 0) * 2 + (eventMap[c.id] || 0) * 5 +
                    (ratingCountMap[c.id] ? (ratingMap[c.id] / ratingCountMap[c.id]) * 10 : 0)
            })).sort((a, b) => b.score - a.score);
        }
    });

    const categories = ['all', ...new Set((clubs || []).map(c => c.category).filter(Boolean))];
    const filtered = filter === 'all' ? clubs : clubs?.filter(c => c.category === filter);
    const maxScore = filtered?.[0]?.score || 1;

    if (isLoading) return (
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
            <CircularProgress size={50} />
        </Box>
    );

    return (
        <Box sx={{ pb: 6 }}>
            {/* Header */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 4, p: 4, borderRadius: '20px',
                    background: 'linear-gradient(135deg, #f59e0b20 0%, #ef444415 100%)',
                    border: '2px solid #f59e0b30'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <TrophyIcon sx={{ fontSize: 40, color: '#f59e0b' }} />
                    <Box>
                        <Typography variant="h3" fontWeight={900} sx={{
                            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                            letterSpacing: -1.5
                        }}>
                            Club Leaderboard
                        </Typography>
                        <Typography color="text.secondary" sx={{ fontSize: '1rem', fontWeight: 500 }}>
                            Rankings based on members, events, and community feedback
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Top 3 Podium */}
            {filtered && filtered.length >= 3 && (
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    {[filtered[1], filtered[0], filtered[2]].map((club, i) => {
                        const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3;
                        // eslint-disable-next-line no-unused-vars
                        const heights = [200, 240, 180];
                        const colors = ['#9ca3af', '#f59e0b', '#cd7f32'];
                        return (
                            <Grid item xs={4} key={club.id}>
                                <Box
                                    component={motion.div}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.15 }}
                                    sx={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        p: 3, borderRadius: '20px', textAlign: 'center',
                                        background: `linear-gradient(135deg, ${colors[i]}15, ${colors[i]}05)`,
                                        border: `2px solid ${colors[i]}40`,
                                        transition: 'all 0.3s',
                                        '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 32px ${colors[i]}25` }
                                    }}
                                >
                                    <RankBadge rank={actualRank} />
                                    <Avatar sx={{ width: 56, height: 56, mt: 1.5, bgcolor: `${colors[i]}30`, fontSize: '1.5rem', fontWeight: 900, color: colors[i] }}>
                                        {club.name.charAt(0)}
                                    </Avatar>
                                    <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 1 }}>{club.name}</Typography>
                                    <Chip label={club.category || 'General'} size="small" sx={{ mt: 0.5, bgcolor: `${CATEGORY_COLORS[club.category] || '#6b7280'}20`, color: CATEGORY_COLORS[club.category] || '#6b7280', fontWeight: 700 }} />
                                    <Typography variant="h6" fontWeight={900} sx={{ mt: 1.5, color: colors[i] }}>
                                        {Math.round(club.score)} pts
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">Members</Typography>
                                            <Typography variant="body2" fontWeight={700}>{club.memberCount}</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">Events</Typography>
                                            <Typography variant="body2" fontWeight={700}>{club.eventCount}</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">Rating</Typography>
                                            <Typography variant="body2" fontWeight={700}>⭐ {club.avgRating}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Category Filter */}
            <Box sx={{ mb: 3, overflowX: 'auto' }}>
                <ToggleButtonGroup value={filter} exclusive onChange={(_, v) => v && setFilter(v)} size="small">
                    {categories.map(cat => (
                        <ToggleButton key={cat} value={cat} sx={{
                            textTransform: 'capitalize', fontWeight: 700, borderRadius: '20px !important', mx: 0.5,
                            border: '1.5px solid !important', px: 2
                        }}>
                            {cat === 'all' ? '🌐 All' : cat}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            {/* Full Rankings Table */}
            <Paper elevation={0} sx={{
                borderRadius: '16px',
                background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`,
                border: `2px solid ${theme.palette.primary.main}20`, overflow: 'hidden'
            }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.7 } }}>
                                <TableCell>Rank</TableCell>
                                <TableCell>Club</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell align="center">Members</TableCell>
                                <TableCell align="center">Events</TableCell>
                                <TableCell align="center">Rating</TableCell>
                                <TableCell>Score Progress</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(filtered || []).map((club, idx) => (
                                <TableRow
                                    key={club.id}
                                    component={motion.tr}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    sx={{ '&:hover': { bgcolor: 'action.hover' }, transition: 'all 0.2s' }}
                                >
                                    <TableCell><RankBadge rank={idx + 1} /></TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ width: 40, height: 40, bgcolor: `${CATEGORY_COLORS[club.category] || '#6b7280'}25`, color: CATEGORY_COLORS[club.category] || '#6b7280', fontWeight: 900 }}>
                                                {club.name.charAt(0)}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight={700}>{club.name}</Typography>
                                                {idx < 3 && <WorkspacePremium sx={{ fontSize: 14, color: ['#f59e0b', '#9ca3af', '#cd7f32'][idx] }} />}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={club.category || 'General'} size="small" sx={{
                                            bgcolor: `${CATEGORY_COLORS[club.category] || '#6b7280'}20`,
                                            color: CATEGORY_COLORS[club.category] || '#6b7280', fontWeight: 700
                                        }} />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                            <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> {club.memberCount}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                            <EventIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> {club.eventCount}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                            <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                                            <Typography variant="body2" fontWeight={700}>{club.avgRating}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 160 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={(club.score / maxScore) * 100}
                                                sx={{
                                                    flex: 1, height: 8, borderRadius: 4,
                                                    bgcolor: 'action.selected',
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 4,
                                                        background: idx === 0
                                                            ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                                                            : idx === 1
                                                                ? 'linear-gradient(90deg, #9ca3af, #6b7280)'
                                                                : 'linear-gradient(90deg, #3b82f6, #6366f1)'
                                                    }
                                                }}
                                            />
                                            <Typography variant="caption" fontWeight={700} color="text.secondary">
                                                {Math.round(club.score)}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default ClubLeaderboard;

