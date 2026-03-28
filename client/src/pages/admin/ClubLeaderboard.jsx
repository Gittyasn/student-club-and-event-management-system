import { useMemo, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Chip,
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    useTheme,
} from '@mui/material';
import {
    EmojiEvents as TrophyIcon,
    Event as EventIcon,
    Groups as PeopleIcon,
    WorkspacePremium as PremiumIcon,
    Star as StarIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import LoadingDots from '../../components/LoadingDots';

const CATEGORY_COLORS = {
    Technical: '#3b82f6',
    Cultural: '#a855f7',
    Sports: '#10b981',
    'Social Service': '#f59e0b',
    Arts: '#ef4444',
    General: '#64748b',
};

const rankColor = (rank) => (rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : '#64748b');

const RankBadge = ({ rank }) => {
    const color = rankColor(rank);
    return rank <= 3 ? (
        <Box
            sx={{
                width: 42,
                height: 42,
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${color}18`,
                color,
                border: `1px solid ${color}33`,
            }}
        >
            <PremiumIcon fontSize="small" />
        </Box>
    ) : (
        <Box
            sx={{
                width: 42,
                height: 42,
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'action.hover',
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Typography variant="body2" fontWeight={800}>
                #{rank}
            </Typography>
        </Box>
    );
};

const ClubHighlightCard = ({ club, rank }) => {
    const color = rankColor(rank);
    return (
        <Paper
            component={motion.div}
            whileHover={{ y: -4 }}
            sx={{
                p: 3,
                height: '100%',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                border: `1px solid ${color}26`,
                background: `linear-gradient(180deg, ${color}10 0%, transparent 100%)`,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <RankBadge rank={rank} />
                <Chip
                    label={`#${rank} Ranked`}
                    size="small"
                    sx={{
                        bgcolor: `${color}18`,
                        color,
                        border: `1px solid ${color}30`,
                        fontWeight: 800,
                    }}
                />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar src={club.logo_url || undefined} sx={{ width: 52, height: 52, bgcolor: `${color}18`, color, fontWeight: 900 }}>
                    {club.name?.charAt(0)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={900} color="text.primary" noWrap>
                        {club.name}
                    </Typography>
                    <Chip
                        label={club.category || 'General'}
                        size="small"
                        sx={{
                            mt: 0.75,
                            bgcolor: `${CATEGORY_COLORS[club.category] || CATEGORY_COLORS.General}18`,
                            color: CATEGORY_COLORS[club.category] || CATEGORY_COLORS.General,
                            fontWeight: 700,
                        }}
                    />
                </Box>
            </Box>
            <Typography variant="h4" fontWeight={900} sx={{ color }}>
                {Math.round(club.score)}
                <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary', fontWeight: 700 }}>
                    score
                </Typography>
            </Typography>
            <Grid container spacing={1.25}>
                {[
                    { label: 'Members', value: club.memberCount, icon: <PeopleIcon sx={{ fontSize: 15 }} /> },
                    { label: 'Events', value: club.eventCount, icon: <EventIcon sx={{ fontSize: 15 }} /> },
                    { label: 'Rating', value: club.avgRating, icon: <StarIcon sx={{ fontSize: 15 }} /> },
                ].map((item) => (
                    <Grid item xs={4} key={item.label}>
                        <Box
                            sx={{
                                height: '100%',
                                p: 1.25,
                                borderRadius: '14px',
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                                textAlign: 'center',
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'center', color, mb: 0.5 }}>{item.icon}</Box>
                            <Typography variant="body1" fontWeight={900} color="text.primary">
                                {item.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                {item.label}
                            </Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
};

const ClubLeaderboard = () => {
    const theme = useTheme();
    const [filter, setFilter] = useState('all');

    const { data: clubs = [], isLoading, error } = useQuery({
        queryKey: ['clubLeaderboard'],
        retry: 1,
        queryFn: async () => {
            const [clubsRes, membershipsRes, eventsRes, feedbackRes] = await Promise.all([
                supabase
                    .from('clubs')
                    .select('id, name, category, status, logo_url, rating, created_at')
                    .in('status', ['active', 'Active']),
                supabase.from('club_memberships').select('club_id, status').in('status', ['approved', 'active', 'core_member', 'sub_coordinator']),
                supabase.from('events').select('id, club_id, approval_status').eq('approval_status', 'approved'),
                supabase.from('feedback').select('rating, event:events(club_id)'),
            ]);

            if (clubsRes.error) throw clubsRes.error;
            if (membershipsRes.error) throw membershipsRes.error;
            if (eventsRes.error) throw eventsRes.error;
            if (feedbackRes.error) throw feedbackRes.error;

            const memberMap = {};
            membershipsRes.data?.forEach((membership) => {
                memberMap[membership.club_id] = (memberMap[membership.club_id] || 0) + 1;
            });

            const eventMap = {};
            eventsRes.data?.forEach((event) => {
                eventMap[event.club_id] = (eventMap[event.club_id] || 0) + 1;
            });

            const ratingMap = {};
            const ratingCountMap = {};
            feedbackRes.data?.forEach((entry) => {
                const clubId = entry.event?.club_id;
                if (!clubId) return;
                ratingMap[clubId] = (ratingMap[clubId] || 0) + (entry.rating || 0);
                ratingCountMap[clubId] = (ratingCountMap[clubId] || 0) + 1;
            });

            return (clubsRes.data || [])
                .map((club) => {
                    const memberCount = memberMap[club.id] || 0;
                    const eventCount = eventMap[club.id] || 0;
                    const avgRatingNumber = ratingCountMap[club.id]
                        ? ratingMap[club.id] / ratingCountMap[club.id]
                        : 0;

                    return {
                        ...club,
                        memberCount,
                        eventCount,
                        avgRatingNumber,
                        avgRating: avgRatingNumber ? avgRatingNumber.toFixed(1) : '0.0',
                        score: (memberCount * 2) + (eventCount * 5) + (avgRatingNumber * 10),
                    };
                })
                .sort((a, b) => b.score - a.score);
        },
    });

    const categories = useMemo(
        () => ['all', ...new Set(clubs.map((club) => club.category).filter(Boolean))],
        [clubs]
    );
    const filtered = useMemo(
        () => (filter === 'all' ? clubs : clubs.filter((club) => club.category === filter)),
        [clubs, filter]
    );
    const maxScore = filtered[0]?.score || 1;
    const topThree = filtered.slice(0, 3);

    if (isLoading) {
        return <LoadingDots minHeight="50vh" label="Loading club rankings..." />;
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ borderRadius: '18px' }}>
                Club leaderboard could not be loaded right now. {error.message}
            </Alert>
        );
    }

    return (
        <Box sx={{ pb: 6 }}>
            <Paper
                component={motion.div}
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 4,
                    p: { xs: 3, md: 4 },
                    borderRadius: '24px',
                    background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(15,23,42,0.92) 100%)'
                        : 'linear-gradient(135deg, rgba(254,240,138,0.5) 0%, rgba(255,255,255,0.96) 100%)',
                }}
            >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 3 }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'rgba(245,158,11,0.14)',
                                    color: '#f59e0b',
                                }}
                            >
                                <TrophyIcon />
                            </Box>
                            <Box>
                                <Typography variant="h4" fontWeight={900} color="text.primary">
                                    Club Leaderboard
                                </Typography>
                                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                    Rankings based on memberships, approved events, and feedback quality.
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                    <Grid container spacing={1.5} sx={{ width: { xs: '100%', md: 320 } }}>
                        {[
                            { label: 'Tracked Clubs', value: filtered.length, color: '#3b82f6' },
                            { label: 'Top Score', value: Math.round(maxScore), color: '#f59e0b' },
                        ].map((item) => (
                            <Grid item xs={6} key={item.label}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: '16px',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: 'background.paper',
                                        height: '100%',
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary" fontWeight={800}>
                                        {item.label}
                                    </Typography>
                                    <Typography variant="h5" fontWeight={900} sx={{ color: item.color }}>
                                        {item.value}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Paper>

            <Box sx={{ mb: 3, overflowX: 'auto', pb: 0.5 }}>
                <ToggleButtonGroup
                    value={filter}
                    exclusive
                    onChange={(_, nextValue) => nextValue && setFilter(nextValue)}
                    size="small"
                >
                    {categories.map((category) => (
                        <ToggleButton
                            key={category}
                            value={category}
                            sx={{
                                textTransform: 'capitalize',
                                fontWeight: 700,
                                px: 2,
                                color: 'text.primary',
                                borderColor: 'divider',
                            }}
                        >
                            {category === 'all' ? 'All categories' : category}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            {!filtered.length ? (
                <Paper sx={{ p: 4, borderRadius: '20px', textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight={800} color="text.primary">
                        No clubs available for this view
                    </Typography>
                    <Typography color="text.secondary">
                        Try another category filter or add clubs with approved activity first.
                    </Typography>
                </Paper>
            ) : (
                <>
                    <Grid container spacing={3} sx={{ mb: 4 }} alignItems="stretch">
                        {topThree.map((club, index) => (
                            <Grid item xs={12} md={4} key={club.id} sx={{ display: 'flex' }}>
                                <ClubHighlightCard club={club} rank={index + 1} />
                            </Grid>
                        ))}
                    </Grid>

                    <Paper sx={{ borderRadius: '20px', overflow: 'hidden' }}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow
                                        sx={{
                                            '& th': {
                                                fontWeight: 800,
                                                fontSize: '0.76rem',
                                                textTransform: 'uppercase',
                                                color: 'text.secondary',
                                                letterSpacing: 0.6,
                                                bgcolor: 'background.paper',
                                            },
                                        }}
                                    >
                                        <TableCell>Rank</TableCell>
                                        <TableCell>Club</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell align="center">Members</TableCell>
                                        <TableCell align="center">Events Hosted</TableCell>
                                        <TableCell align="center">Avg Rating</TableCell>
                                        <TableCell align="center">Score</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filtered.map((club, index) => (
                                        <TableRow key={club.id} hover>
                                            <TableCell sx={{ width: 90 }}>
                                                <RankBadge rank={index + 1} />
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Avatar src={club.logo_url || undefined} sx={{ bgcolor: `${rankColor(index + 1)}18`, color: rankColor(index + 1), fontWeight: 900 }}>
                                                        {club.name?.charAt(0)}
                                                    </Avatar>
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography variant="body2" fontWeight={800} color="text.primary" noWrap>
                                                            {club.name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Created {club.created_at ? new Date(club.created_at).toLocaleDateString() : 'recently'}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={club.category || 'General'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: `${CATEGORY_COLORS[club.category] || CATEGORY_COLORS.General}18`,
                                                        color: CATEGORY_COLORS[club.category] || CATEGORY_COLORS.General,
                                                        fontWeight: 700,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography fontWeight={800} color="text.primary">
                                                    {club.memberCount}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography fontWeight={800} color="text.primary">
                                                    {club.eventCount}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                                    <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                                                    <Typography fontWeight={800} color="text.primary">
                                                        {club.avgRating}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography fontWeight={900} sx={{ color: rankColor(index + 1) }}>
                                                    {Math.round(club.score)}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}
        </Box>
    );
};

export default ClubLeaderboard;
