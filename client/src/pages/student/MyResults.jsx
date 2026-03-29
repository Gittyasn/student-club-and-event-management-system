import { useMemo } from 'react';
import {
    Avatar,
    Box,
    Chip,
    Divider,
    Grid,
    LinearProgress,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import {
    Assessment as AssessmentIcon,
    EmojiEvents as TrophyIcon,
    Event as EventIcon,
    MilitaryTech as PodiumIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import LoadingDots from '../../components/LoadingDots';
import { useMyResults } from '../../hooks/useResults';

const RANK_MAP = {
    1: { label: '1st Place', color: '#b45309', bg: '#fef3c7' },
    2: { label: '2nd Place', color: '#475569', bg: '#e2e8f0' },
    3: { label: '3rd Place', color: '#92400e', bg: '#fde68a' },
};

const formatDate = (value) => {
    if (!value) return 'Date not available';
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const getResultTypeLabel = (resultType) => {
    if (resultType === 'score') return 'Score';
    if (resultType === 'rank') return 'Rank';
    return 'Participation';
};

const SummaryCard = ({ icon, label, value, helper, color }) => (
    <Paper
        elevation={0}
        sx={{
            p: 2.5,
            height: '100%',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            background: `linear-gradient(180deg, ${color}12 0%, rgba(255,255,255,0) 100%)`,
        }}
    >
        <Box
            sx={{
                width: 42,
                height: 42,
                mb: 1.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${color}18`,
                color,
            }}
        >
            {icon}
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={700}>
            {label}
        </Typography>
        <Typography variant="h4" fontWeight={900} sx={{ color, lineHeight: 1.1, mt: 0.5 }}>
            {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
            {helper}
        </Typography>
    </Paper>
);

const ResultMetric = ({ result }) => {
    const hasScore = result.result_type === 'score' && result.score !== null && result.max_score;
    const hasRank = result.result_type === 'rank' && result.rank;
    const scorePct = hasScore ? Math.round((result.score / result.max_score) * 100) : null;
    const rankInfo = result.rank ? RANK_MAP[result.rank] : null;

    if (hasScore) {
        return (
            <Box sx={{ minWidth: 220 }}>
                <Typography variant="overline" color="text.secondary" fontWeight={800}>
                    Score
                </Typography>
                <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>
                    {result.score}/{result.max_score}
                </Typography>
                <LinearProgress
                    variant="determinate"
                    value={scorePct}
                    sx={{
                        height: 10,
                        borderRadius: 999,
                        bgcolor: 'rgba(148,163,184,0.18)',
                        '& .MuiLinearProgress-bar': {
                            borderRadius: 999,
                            bgcolor: scorePct >= 80 ? '#10b981' : scorePct >= 60 ? '#2563eb' : '#f59e0b',
                        },
                    }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                    Performance: {scorePct}%
                </Typography>
            </Box>
        );
    }

    if (hasRank) {
        return (
            <Box sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                <Typography variant="overline" color="text.secondary" fontWeight={800}>
                    Rank
                </Typography>
                <Typography variant="h4" fontWeight={900} color="primary">
                    #{result.rank}
                </Typography>
                <Chip
                    label={rankInfo?.label || `Rank ${result.rank}`}
                    size="small"
                    sx={{
                        mt: 1,
                        fontWeight: 800,
                        bgcolor: rankInfo?.bg || 'action.hover',
                        color: rankInfo?.color || 'text.primary',
                    }}
                />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={800}>
                Result
            </Typography>
            <Typography variant="h6" fontWeight={800}>
                Participant
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Your attendance or completion was recorded for this event.
            </Typography>
        </Box>
    );
};

const ResultCard = ({ result }) => {
    const rankInfo = result.rank ? RANK_MAP[result.rank] : null;
    const clubName = result.event?.club?.name || 'Club';
    const categoryName = result.event?.category?.name || 'Category';

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Grid container spacing={2.5} alignItems="center">
                <Grid item xs={12} md={5}>
                    <Box sx={{ display: 'flex', gap: 1.75 }}>
                        <Avatar
                            src={result.event?.club?.logo_url}
                            sx={{ width: 46, height: 46, bgcolor: 'primary.main', fontWeight: 800 }}
                        >
                            {clubName.charAt(0)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                                {result.event?.title || 'Event'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {[clubName, categoryName].filter(Boolean).join(' | ')}
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
                                <Chip
                                    icon={<EventIcon fontSize="small" />}
                                    label={`Event Date: ${formatDate(result.event?.start_time)}`}
                                    size="small"
                                    variant="outlined"
                                />
                                <Chip label={`Result Type: ${getResultTypeLabel(result.result_type)}`} size="small" variant="outlined" />
                            </Stack>
                        </Box>
                    </Box>
                </Grid>

                <Grid item xs={12} md={3}>
                    <ResultMetric result={result} />
                </Grid>

                <Grid item xs={12} md={4}>
                    <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                        {result.prize_title ? (
                            <Chip
                                icon={<PodiumIcon fontSize="small" />}
                                label={result.prize_title}
                                size="small"
                                sx={{
                                    fontWeight: 800,
                                    bgcolor: rankInfo?.bg || '#eff6ff',
                                    color: rankInfo?.color || '#1d4ed8',
                                }}
                            />
                        ) : null}
                        {result.grade ? <Chip label={`Grade: ${result.grade}`} size="small" color="primary" variant="outlined" /> : null}
                        {result.is_winner ? <Chip icon={<TrophyIcon fontSize="small" />} label="Winner" size="small" color="warning" /> : null}
                        <Chip
                            label={result.status === 'locked' ? 'Locked' : 'Published'}
                            size="small"
                            color={result.status === 'locked' ? 'error' : 'success'}
                            variant="outlined"
                        />
                        {result.remarks ? (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                                {result.remarks}
                            </Typography>
                        ) : null}
                    </Stack>
                </Grid>
            </Grid>
        </Paper>
    );
};

const MyResults = () => {
    const { data: results, isLoading } = useMyResults();

    const stats = useMemo(() => {
        if (!results?.length) {
            return {
                total: 0,
                wins: 0,
                top3: 0,
                avgScore: null,
            };
        }

        const scoredResults = results.filter((entry) => entry.score !== null && entry.max_score);

        return {
            total: results.length,
            wins: results.filter((entry) => entry.is_winner).length,
            top3: results.filter((entry) => entry.rank !== null && entry.rank <= 3).length,
            avgScore: scoredResults.length
                ? `${Math.round(
                    scoredResults.reduce((sum, entry) => sum + ((entry.score / entry.max_score) * 100), 0) / scoredResults.length
                )}%`
                : 'N/A',
        };
    }, [results]);

    if (isLoading) {
        return <LoadingDots label="Loading results..." minHeight="50vh" />;
    }

    return (
        <Box sx={{ pb: 8 }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 3, md: 4 },
                    mb: 4,
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    background: 'linear-gradient(135deg, rgba(14,116,144,0.08) 0%, rgba(37,99,235,0.08) 100%)',
                }}
            >
                <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1, mb: 1 }}>
                    My Results
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Review your scores, ranks, and published achievements across campus events.
                </Typography>
            </Paper>

            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard
                        icon={<AssessmentIcon />}
                        label="Published Results"
                        value={stats.total}
                        helper="Total events with results"
                        color="#2563eb"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard
                        icon={<TrophyIcon />}
                        label="Wins"
                        value={stats.wins}
                        helper="Entries marked as winner"
                        color="#d97706"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard
                        icon={<PodiumIcon />}
                        label="Top 3"
                        value={stats.top3}
                        helper="Podium finishes"
                        color="#059669"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard
                        icon={<TrendingUpIcon />}
                        label="Average Score"
                        value={stats.avgScore ?? 'N/A'}
                        helper="Across scored events"
                        color="#7c3aed"
                    />
                </Grid>
            </Grid>

            {!results?.length ? (
                <Paper
                    elevation={0}
                    sx={{
                        p: 6,
                        textAlign: 'center',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
                        No published results yet
                    </Typography>
                    <Typography color="text.secondary">
                        Results will appear here after coordinators publish them.
                    </Typography>
                </Paper>
            ) : (
                <Stack spacing={2.25}>
                    <Box>
                        <Typography variant="h5" fontWeight={900}>
                            Result History
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Latest published entries appear first.
                        </Typography>
                    </Box>
                    <Divider />
                    {results.map((result) => (
                        <ResultCard key={result.id} result={result} />
                    ))}
                </Stack>
            )}
        </Box>
    );
};

export default MyResults;
