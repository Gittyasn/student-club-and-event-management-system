import { useMemo } from 'react';
import { Box, Typography, Paper, CircularProgress, LinearProgress, useTheme } from '@mui/material';
import { Psychology, SentimentVerySatisfied, SentimentNeutral, SentimentVeryDissatisfied } from '@mui/icons-material';

const FeedbackSentiment = ({ reviews = [], isLoaded = true }) => {
    const theme = useTheme();

    const analysis = useMemo(() => {
        if (!isLoaded) return null;
        // Pseudo logic for mockup
        const total = reviews.length || 100; // Mock 100 if none provided
        const pos = reviews.length ? reviews.filter(r => r.rating >= 4).length : 75;
        const neu = reviews.length ? reviews.filter(r => r.rating === 3).length : 15;
        const neg = reviews.length ? reviews.filter(r => r.rating <= 2).length : 10;

        return {
            positive: Math.round((pos / total) * 100),
            neutral: Math.round((neu / total) * 100),
            negative: Math.round((neg / total) * 100),
            summary: "Attendees strongly praised the keynote speaker's delivery, but noted the venue acoustics were slightly poor in the back rows."
        };
    }, [reviews, isLoaded]);

    if (!isLoaded) {
        return (
            <Paper elevation={0} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                <CircularProgress size={32} sx={{ mb: 2 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Running NLP algorithms on feedback...</Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: theme.palette.background.default }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                    <Psychology fontSize="small" />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>NLP Sentiment Analysis</Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1, textTransform: 'uppercase' }}>Auto-Generated Summary</Typography>
                <Typography variant="body2" sx={{ color: 'text.primary', fontStyle: 'italic', pl: 2, borderLeft: `3px solid ${theme.palette.primary.main}` }}>
                    &quot;{analysis.summary}&quot;
                </Typography>
            </Box>

            <Box sx={{ py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                    <SentimentVerySatisfied sx={{ color: '#10b981', fontSize: 20 }} />
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Positive Reception</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#10b981' }}>{analysis.positive}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={analysis.positive} sx={{ height: 6, borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 1 } }} />
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                    <SentimentNeutral sx={{ color: '#94a3b8', fontSize: 20 }} />
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Neutral / Suggestions</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#94a3b8' }}>{analysis.neutral}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={analysis.neutral} sx={{ height: 6, borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#94a3b8', borderRadius: 1 } }} />
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SentimentVeryDissatisfied sx={{ color: '#ef4444', fontSize: 20 }} />
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Negative Critical</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#ef4444' }}>{analysis.negative}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={analysis.negative} sx={{ height: 6, borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#ef4444', borderRadius: 1 } }} />
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
};

export default FeedbackSentiment;
