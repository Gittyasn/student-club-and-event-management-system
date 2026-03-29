import { useParams, useNavigate } from 'react-router-dom';
import {
    // eslint-disable-next-line no-unused-vars
    Container,
    Typography,
    Box,
    Paper,
    Rating,
    Stack,
    Divider,
    Avatar,
    List,
    ListItem,
    // eslint-disable-next-line no-unused-vars
    ListItemAvatar,
    // eslint-disable-next-line no-unused-vars
    ListItemText,
    Button,
    // eslint-disable-next-line no-unused-vars
    Card,
    // eslint-disable-next-line no-unused-vars
    CardContent,
    Grid,
    IconButton,
    Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RolePageHeader from '../../components/RolePageHeader';
// eslint-disable-next-line no-unused-vars
import { ArrowBack as BackIcon, Forum as FeedbackIcon, Download as DownloadIcon, CheckCircle as CheckCircleIcon, CheckCircleOutline as CheckCircleOutlineIcon } from '@mui/icons-material';
import { useEventFeedback, useMarkFeedbackReviewed } from '../../hooks/useFeedback';
import { useEventById } from '../../hooks/useEventById';
import LoadingDots from '../../components/LoadingDots';
// eslint-disable-next-line no-unused-vars
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
// eslint-disable-next-line no-unused-vars
import { Tooltip } from '@mui/material';
import { motion } from 'framer-motion';

const EventFeedback = () => {
    const { id: eventId } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const { data: event, isLoading: eventLoading } = useEventById(eventId);
    const { data: feedback, isLoading: feedbackLoading } = useEventFeedback(eventId);
    const { mutate: markReviewed } = useMarkFeedbackReviewed();

    if (eventLoading || feedbackLoading) {
        return <LoadingDots label="Loading feedback..." minHeight="50vh" />;
    }

    const avgRating = feedback && feedback.length > 0
        ? feedback.reduce((acc, curr) => acc + curr.rating, 0) / feedback.length
        : 0;

    const exportToCSV = () => {
        if (!feedback || feedback.length === 0) return;

        const csvContent = "data:text/csv;charset=utf-8,"
            + "Student Name,Rating,Comment,Date\n"
            + feedback.map(f => {
                const name = f.anonymous ? "Anonymous" : `"${f.profiles?.full_name || 'Unknown'}"`;
                const comment = `"${(f.comment || '').replace(/"/g, '""')}"`;
                const date = new Date(f.created_at).toLocaleDateString();
                return `${name},${f.rating},${comment},${date}`;
            }).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `feedback_${event?.title || 'event'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const distribution = [1, 2, 3, 4, 5].map(star => ({
        name: `${star} Stars`,
        count: feedback?.filter(f => Math.round(f.rating) === star).length || 0
    }));

    return (
        <Box sx={{ pb: 6 }}>
            <RolePageHeader
                kicker="Coordinator Dashboard"
                title="Event Feedback"
                subtitle="Review ratings, comments, and insights."
            />
            <Box sx={{ mb: 4 }}>
                <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ fontWeight: 700, color: 'text.secondary', mb: 2 }}>
                    Back to Events
                </Button>

                <Box
                    component={motion.div}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    sx={{
                        p: { xs: 3, md: 5 }, borderRadius: '32px',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                        color: 'white', position: 'relative', overflow: 'hidden',
                        boxShadow: '0 24px 60px -12px rgba(79,70,229,0.4)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 3
                    }}
                >
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1.5, mb: 1 }}>
                            Event Feedback
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 600 }}>
                                {event?.title}
                            </Typography>
                        </Stack>
                    </Box>
                    <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'right' }}>
                        <Button
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={exportToCSV}
                            sx={{ bgcolor: 'white', color: '#4f46e5', fontWeight: 800, borderRadius: '12px', px: 3, '&:hover': { bgcolor: '#f8fafc' } }}
                        >
                            Export Data
                        </Button>
                    </Box>
                    <FeedbackIcon sx={{ position: 'absolute', left: -20, top: -20, fontSize: 160, opacity: 0.1 }} />
                </Box>
            </Box>

            <Grid container spacing={4}>
                {/* Sentiment & Ratings Summary */}
                <Grid item xs={12} md={4}>
                    <Stack spacing={4}>
                        <Paper sx={{ p: 4, borderRadius: '24px', textAlign: 'center', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ letterSpacing: 2 }}>Average Rating</Typography>
                            <Typography variant="h2" fontWeight={900} color="primary.main" sx={{ my: 1 }}>{avgRating.toFixed(1)}</Typography>
                            <Rating value={avgRating} readOnly precision={0.5} size="large" sx={{ mb: 2 }} />
                            <Typography variant="body2" color="text.secondary" fontWeight={600}>Based on {feedback?.length || 0} reviews</Typography>
                        </Paper>

                        <Paper sx={{ p: 3, borderRadius: '24px', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={800} sx={{ mb: 3 }}>Rating Distribution</Typography>
                            <Box sx={{ height: 260, width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={distribution} margin={{ left: -30 }}>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '12px', fontWeight: 600 }} />
                                        <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                        <Bar dataKey="count" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    </Stack>
                </Grid>

                {/* Individual Comments Flow */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ borderRadius: '24px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                        <Box sx={{ p: 3, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={800}>Student Sentiment</Typography>
                        </Box>
                        <List sx={{ p: 0 }}>
                            {feedback && feedback.length > 0 ? (
                                feedback.map((item, index) => (
                                    <Box key={item.id} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.1 }}>
                                        <ListItem alignItems="flex-start" sx={{ py: 3, px: 3, gap: 2 }}>
                                            <Avatar
                                                src={item.anonymous ? undefined : item.profiles?.avatar_url}
                                                sx={{ width: 48, height: 48, border: '2px solid', borderColor: 'divider' }}
                                            >
                                                {item.anonymous ? '?' : item.profiles?.full_name?.charAt(0)}
                                            </Avatar>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                    <Box>
                                                        <Typography variant="subtitle1" fontWeight={800}>
                                                            {item.anonymous ? 'Anonymous Student' : item.profiles?.full_name}
                                                        </Typography>
                                                        <Rating value={item.rating} size="small" readOnly />
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 600 }}>
                                                            {new Date(item.created_at).toLocaleDateString()}
                                                        </Typography>
                                                        {item.is_reviewed ? (
                                                            <Chip label="Reviewed" size="small" color="success" variant="outlined" sx={{ fontWeight: 800, fontSize: '10px' }} />
                                                        ) : (
                                                            <IconButton size="small" onClick={() => markReviewed(item.id)} color="primary">
                                                                <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />
                                                            </IconButton>
                                                        )}
                                                    </Box>
                                                </Box>
                                                <Box sx={{ p: 2, borderRadius: '16px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                                                    <Typography variant="body2" sx={{ lineHeight: 1.6, fontStyle: item.comment ? 'normal' : 'italic', color: item.comment ? 'text.primary' : 'text.secondary' }}>
                                                        {item.comment || "No detailed comment shared."}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </ListItem>
                                        {index < feedback.length - 1 && <Divider sx={{ borderStyle: 'dashed', mx: 3 }} />}
                                    </Box>
                                ))
                            ) : (
                                <Box sx={{ p: 10, textAlign: 'center', opacity: 0.5 }}>
                                    <FeedbackIcon sx={{ fontSize: 64, mb: 2 }} />
                                    <Typography variant="h6" fontWeight={600}>No feedback received yet</Typography>
                                </Box>
                            )}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default EventFeedback;
