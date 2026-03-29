// eslint-disable-next-line no-unused-vars
import React, { useMemo } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Button, Chip,
    // eslint-disable-next-line no-unused-vars
    Stack, Avatar, LinearProgress, Tooltip, Paper, Divider, Alert
} from '@mui/material';
import LoadingDots from '../../components/LoadingDots';
import {
    CalendarMonth as DateIcon, LocationOn as VenueIcon, Cancel as CancelIcon,
    CheckCircle as ConfirmedIcon, HourglassBottom as WaitlistIcon,
    EventBusy as NoShowIcon, Groups as ClubIcon, EmojiEvents as CertIcon,
    Feedback as FeedbackIcon, ChevronRight, QueuePlayNext, AccessTime
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMyRegistrations } from '../../hooks/useMyRegistrations';

const STATUS_CONFIG = {
    registered: { label: 'Registered', color: '#10b981', bgColor: '#10b98115', icon: <ConfirmedIcon fontSize="small" />, chipColor: 'success' },
    waitlisted: { label: 'Waitlisted', color: '#f59e0b', bgColor: '#f59e0b15', icon: <WaitlistIcon fontSize="small" />, chipColor: 'warning' },
    confirmed: { label: 'Confirmed', color: '#3b82f6', bgColor: '#3b82f615', icon: <ConfirmedIcon fontSize="small" />, chipColor: 'primary' },
    attended: { label: 'Attended', color: '#8b5cf6', bgColor: '#8b5cf615', icon: <ConfirmedIcon fontSize="small" />, chipColor: 'secondary' },
    cancelled: { label: 'Cancelled', color: '#ef4444', bgColor: '#ef444415', icon: <CancelIcon fontSize="small" />, chipColor: 'error' },
    no_show: { label: 'No-Show', color: '#6b7280', bgColor: '#6b728015', icon: <NoShowIcon fontSize="small" />, chipColor: 'default' },
};

const EventRegistrationCard = ({ registration, onCancel, canCancel }) => {
    const navigate = useNavigate();
    const event = registration.event;
    const status = STATUS_CONFIG[registration.status] || STATUS_CONFIG.registered;

    const isUpcoming = event && new Date(event.start_time) > new Date();
    const isCancellable = canCancel && ['registered', 'waitlisted', 'confirmed'].includes(registration.status) && isUpcoming;

    // eslint-disable-next-line no-unused-vars
    const fillRate = event?.max_participants
        ? Math.min(100, Math.round(((event.registrations?.[0]?.count || 0) / event.max_participants) * 100))
        : 0;

    return (
        <Card
            component={motion.div}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            sx={{
                borderRadius: '20px',
                border: `1px solid ${status.color}30`,
                boxShadow: `0 4px 24px ${status.color}10`,
                bgcolor: 'background.paper',
                overflow: 'hidden',
                '&:hover': { boxShadow: `0 8px 32px ${status.color}20`, transform: 'translateY(-2px)' },
                transition: 'all 0.25s ease'
            }}
        >
            {/* Color-coded top bar */}
            <Box sx={{ height: 4, background: `linear-gradient(90deg, ${status.color}, ${status.color}80)` }} />

            <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box flex={1} minWidth={0}>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {event?.title || 'Unknown Event'}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <ClubIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                {event?.club?.name || 'Unknown Club'}
                            </Typography>
                        </Stack>
                    </Box>
                    <Chip
                        icon={status.icon}
                        label={status.label}
                        size="small"
                        color={status.chipColor}
                        sx={{ fontWeight: 800, ml: 1, flexShrink: 0 }}
                    />
                </Box>

                {/* Waitlist position alert */}
                {registration.status === 'waitlisted' && registration.waitlist_position && (
                    <Alert
                        severity="warning"
                        icon={<QueuePlayNext fontSize="small" />}
                        sx={{ mb: 2, py: 0.5, borderRadius: '8px', '& .MuiAlert-message': { fontSize: '0.8rem', fontWeight: 700 } }}
                    >
                        You&apos;re #{registration.waitlist_position} in the waitlist queue.
                    </Alert>
                )}

                {/* Admin note */}
                {registration.admin_note && (
                    <Alert severity="info" sx={{ mb: 2, py: 0.5, borderRadius: '8px', '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                        {registration.admin_note}
                    </Alert>
                )}

                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <DateIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Date</Typography>
                                <Typography variant="body2" fontWeight={700}>
                                    {event?.start_time ? new Date(event.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={6}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <AccessTime sx={{ fontSize: 16, color: 'secondary.main' }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Time</Typography>
                                <Typography variant="body2" fontWeight={700}>
                                    {event?.start_time ? new Date(event.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <VenueIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            <Typography variant="body2" fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {event?.mode === 'online' ? 'Virtual Event' : event?.location || 'Venue TBD'}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                    Registered on {registration.registered_at ? new Date(registration.registered_at).toLocaleString('en-IN') : 'N/A'}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {/* Action Buttons */}
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    <Button
                        size="small"
                        variant="outlined"
                        endIcon={<ChevronRight />}
                        onClick={() => navigate(`/events/${event?.id}`)}
                        sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none', flex: 1 }}
                    >
                        View Event
                    </Button>

                    {registration.status === 'attended' && !registration.has_feedback && (
                        <Button
                            size="small"
                            variant="contained"
                            color="secondary"
                            startIcon={<FeedbackIcon />}
                            onClick={() => navigate(`/student/events/${event?.id}/feedback`)}
                            sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none', flex: 1 }}
                        >
                            Give Feedback
                        </Button>
                    )}

                    {event?.certificate_enabled && registration.status === 'attended' && (
                        <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<CertIcon />}
                            onClick={() => navigate(`/student/certificates`)}
                            sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}
                        >
                            Certificate
                        </Button>
                    )}

                    {isCancellable && (
                        <Tooltip title="Cancel registration (seat will be released to waitlist)">
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={() => onCancel(registration.id, event?.id)}
                                sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}
                            >
                                Cancel
                            </Button>
                        </Tooltip>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
};

const MyRegistrations = () => {
    const { registrations, isLoading, cancelRegistration } = useMyRegistrations();

    const categorized = useMemo(() => {
        if (!registrations) return { upcoming: [], past: [], waitlisted: [], cancelled: [] };
        const now = new Date();
        const upcoming = registrations.filter(r =>
            ['registered', 'confirmed'].includes(r.status) && new Date(r.event?.start_time) > now
        );
        const waitlisted = registrations.filter(r => r.status === 'waitlisted');
        const past = registrations.filter(r =>
            ['attended', 'no_show'].includes(r.status) ||
            (['registered', 'confirmed'].includes(r.status) && new Date(r.event?.start_time) <= now)
        );
        const cancelled = registrations.filter(r => r.status === 'cancelled');
        return { upcoming, waitlisted, past, cancelled };
    }, [registrations]);

    const handleCancel = (registrationId, eventId) => {
        if (window.confirm('Cancel registration? Your seat will be automatically released to the next person in the waitlist.')) {
            cancelRegistration.mutate({ registrationId, eventId });
        }
    };

    if (isLoading) return (
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <LoadingDots label="Loading registrations..." minHeight="40vh" />
        </Box>
    );

    const totalActive = (categorized.upcoming.length + categorized.waitlisted.length);

    return (
        <Box sx={{ pb: 8 }}>
            {/* Header */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 5, p: 4, borderRadius: '24px',
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)',
                    color: 'white', position: 'relative', overflow: 'hidden'
                }}
            >
                <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
                <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1.5, mb: 1 }}>
                    My Registrations
                </Typography>
                <Typography sx={{ opacity: 0.8, fontWeight: 500 }}>
                    Your complete event enrollment history and journey.
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                    <Chip label={`${categorized.upcoming.length} Upcoming`} sx={{ bgcolor: '#10b98130', color: '#34d399', fontWeight: 800 }} />
                    <Chip label={`${categorized.waitlisted.length} Waitlisted`} sx={{ bgcolor: '#f59e0b30', color: '#fbbf24', fontWeight: 800 }} />
                    <Chip label={`${categorized.past.length} Attended`} sx={{ bgcolor: '#8b5cf630', color: '#c084fc', fontWeight: 800 }} />
                </Stack>
            </Box>

            {totalActive === 0 && categorized.past.length === 0 && (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '20px', border: '1px dashed', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>No Registrations Found</Typography>
                    <Typography color="text.secondary" sx={{ mb: 3 }}>Browse events and register to see your journey here.</Typography>
                    <Button variant="contained" onClick={() => window.location.href = '/student/browse-events'} sx={{ fontWeight: 800, borderRadius: '12px' }}>
                        Explore Events
                    </Button>
                </Paper>
            )}

            {/* Upcoming Section */}
            {categorized.upcoming.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    <Typography variant="h5" fontWeight={900} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ConfirmedIcon color="success" /> Upcoming ({categorized.upcoming.length})
                    </Typography>
                    <Grid container spacing={3}>
                        <AnimatePresence>
                            {categorized.upcoming.map(reg => (
                                <Grid item xs={12} md={6} xl={4} key={reg.id}>
                                    <EventRegistrationCard registration={reg} onCancel={handleCancel} canCancel />
                                </Grid>
                            ))}
                        </AnimatePresence>
                    </Grid>
                </Box>
            )}

            {/* Waitlisted Section */}
            {categorized.waitlisted.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    <Typography variant="h5" fontWeight={900} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WaitlistIcon color="warning" /> Waitlisted ({categorized.waitlisted.length})
                    </Typography>
                    <Grid container spacing={3}>
                        <AnimatePresence>
                            {categorized.waitlisted.map(reg => (
                                <Grid item xs={12} md={6} xl={4} key={reg.id}>
                                    <EventRegistrationCard registration={reg} onCancel={handleCancel} canCancel />
                                </Grid>
                            ))}
                        </AnimatePresence>
                    </Grid>
                </Box>
            )}

            {/* Past Events (Attended + No-show) */}
            {categorized.past.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    <Typography variant="h5" fontWeight={900} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CertIcon color="secondary" /> Past Events ({categorized.past.length})
                    </Typography>
                    <Grid container spacing={3}>
                        {categorized.past.map(reg => (
                            <Grid item xs={12} md={6} xl={4} key={reg.id}>
                                <EventRegistrationCard registration={reg} onCancel={handleCancel} canCancel={false} />
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Cancelled (collapsed) */}
            {categorized.cancelled.length > 0 && (
                <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CancelIcon fontSize="small" /> Cancelled ({categorized.cancelled.length})
                    </Typography>
                    <Grid container spacing={2}>
                        {categorized.cancelled.slice(0, 4).map(reg => (
                            <Grid item xs={12} md={6} xl={4} key={reg.id}>
                                <EventRegistrationCard registration={reg} onCancel={handleCancel} canCancel={false} />
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}
        </Box>
    );
};

export default MyRegistrations;
