import { Box, Typography, Chip, Grid, Button, CircularProgress, Divider } from '@mui/material';
import {
    Cancel as CancelIcon,
    CalendarMonth as DateIcon,
    ChevronRight,
    SearchOff,
    Group as ClubIcon,
    Wifi as OnlineIcon,
    Business as OfflineIcon,
    CardMembership as CertIcon,
    CheckCircle as PresentIcon,
    Cancel as AbsentIcon,
    Feedback as FeedbackIcon,
    LocalActivity as TicketIcon,
    Chat as ChatIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useMyRegistrations } from '../../hooks/useMyRegistrations';
import { useNavigate } from 'react-router-dom';
import RolePageHeader from '../../components/RolePageHeader';

const MyEvents = () => {
    const { registrations, isLoading, cancelRegistration } = useMyRegistrations();
    const navigate = useNavigate();

    const handleCancel = (id) => {
        if (window.confirm('Are you sure you want to cancel this registration?')) {
            cancelRegistration.mutate(id);
        }
    };

    if (isLoading) return (
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <CircularProgress />
        </Box>
    );

    return (
        <Box sx={{ pb: 8 }}>
            <RolePageHeader
                title="My Events"
                subtitle="Track your registrations, attendance, and certificates."
            />
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ mb: 5 }}
            >
                <Typography variant="h3" fontWeight="900" sx={{ letterSpacing: -1.5, mb: 1, color: 'primary.main' }}>
                    My Events
                </Typography>
                <Typography color="text.secondary" variant="body1" fontWeight="500">
                    Track your upcoming clubs, events, and workshops.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                <AnimatePresence>
                    {(!registrations || registrations.length === 0) ? (
                        <Grid item xs={12}>
                            <Box
                                component={motion.div}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="glass-card"
                                sx={{ py: 12, textAlign: 'center', borderRadius: 4 }}
                            >
                                <SearchOff sx={{ fontSize: 64, color: 'primary.main', mb: 2, opacity: 0.3 }} />
                                <Typography variant="h6" color="text.secondary">No registrations found</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>You haven&apos;t joined any events yet. Ready to explore?</Typography>
                            </Box>
                        </Grid>
                    ) : (
                        registrations.map((reg, index) => {
                            const isCancelled = reg.status === 'cancelled';
                            const isCompleted = reg.event?.status === 'completed' || reg.event?.status === 'archived';

                            return (
                                <Grid item xs={12} md={6} lg={4} key={reg.id}>
                                    <Box
                                        component={motion.div}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3, delay: index * 0.1 }}
                                        className="glass-card"
                                        sx={{
                                            height: '100%',
                                            borderRadius: 4,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden',
                                            bgcolor: isCancelled ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.02)',
                                            border: '1px solid',
                                            borderColor: isCancelled ? 'transparent' : 'rgba(255,255,255,0.05)',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-8px)',
                                                borderColor: 'primary.main'
                                            }
                                        }}
                                    >
                                        <Box sx={{ p: 3, flexGrow: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Chip
                                                    label={reg.status.toUpperCase()}
                                                    size="small"
                                                    color={isCancelled ? 'default' : 'primary'}
                                                    sx={{ fontWeight: 900, borderRadius: '6px', fontSize: '0.625rem' }}
                                                />
                                                <TicketIcon sx={{ color: isCancelled ? 'text.disabled' : 'secondary.main', opacity: 0.8 }} />
                                            </Box>

                                            <Typography variant="h5" fontWeight="900" gutterBottom sx={{ letterSpacing: -0.5, lineHeight: 1.2 }}>
                                                {reg.event?.title || 'Untitled Event'}
                                            </Typography>

                                            {reg.event?.club && (
                                                <Chip
                                                    icon={<ClubIcon fontSize="small" />}
                                                    label={reg.event.club.name}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ mb: 2, fontWeight: 700, borderRadius: 1.5, borderColor: 'rgba(255,255,255,0.1)' }}
                                                />
                                            )}

                                            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <DateIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                    <Typography variant="body2" color="text.secondary" fontWeight="500">
                                                        {reg.event?.start_time ? new Date(reg.event.start_time).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No date set'}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    {reg.event?.mode === 'online' ? <OnlineIcon sx={{ fontSize: 18, color: 'info.main' }} /> : <OfflineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
                                                    <Typography variant="body2" color="text.secondary" fontWeight="500">
                                                        {reg.event?.mode === 'online' ? 'Online Event' : (reg.event?.location || 'Venue to be announced')}
                                                    </Typography>
                                                </Box>

                                                <Divider sx={{ my: 0.5, opacity: 0.05 }} />

                                                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                                                    <Grid item xs={6}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            {reg.attendance_status === 'present' ? <PresentIcon sx={{ fontSize: 16, color: 'success.main' }} /> : <AbsentIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                                                            <Typography variant="caption" fontWeight="bold" color={reg.attendance_status === 'present' ? 'success.main' : 'text.secondary'}>
                                                                {reg.attendance_status === 'present' ? 'Attended' : 'No Status'}
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <CertIcon sx={{ fontSize: 16, color: reg.event?.is_certificate_enabled ? 'warning.main' : 'text.disabled' }} />
                                                            <Typography variant="caption" fontWeight="bold" color={reg.event?.is_certificate_enabled ? 'warning.main' : 'text.secondary'}>
                                                                {reg.event?.is_certificate_enabled ? 'Cert Available' : 'No Certificate'}
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        {reg.attendance_status === 'present' && (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                                <FeedbackIcon sx={{ fontSize: 16, color: reg.has_feedback ? 'primary.main' : 'error.main' }} />
                                                                <Typography variant="caption" fontWeight="bold" color={reg.has_feedback ? 'primary.main' : 'error.main'}>
                                                                    {reg.has_feedback ? 'Feedback Submitted' : 'Pending Feedback'}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Grid>
                                                </Grid>
                                            </Box>
                                        </Box>

                                        <Divider sx={{ opacity: 0.05 }} />

                                        <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                                            {!isCancelled && !isCompleted && (
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    color="error"
                                                    size="small"
                                                    startIcon={<CancelIcon />}
                                                    onClick={() => handleCancel(reg.id)}
                                                    sx={{ borderRadius: 2, fontWeight: 700 }}
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                            {isCompleted && reg.attendance_status === 'present' && reg.event?.is_certificate_enabled && (
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    color="warning"
                                                    size="small"
                                                    startIcon={<CertIcon />}
                                                    onClick={() => navigate('/student/certificates')}
                                                    sx={{ borderRadius: 2, fontWeight: 700 }}
                                                >
                                                    Certificate
                                                </Button>
                                            )}
                                            {isCompleted && reg.attendance_status === 'present' && !reg.has_feedback && (
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    color="secondary"
                                                    size="small"
                                                    startIcon={<FeedbackIcon />}
                                                    onClick={() => navigate(`/student/feedback/${reg.event_id}`)}
                                                    sx={{ borderRadius: 2, fontWeight: 700 }}
                                                >
                                                    Feedback
                                                </Button>
                                            )}
                                            {!isCancelled && (
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    color="info"
                                                    size="small"
                                                    startIcon={<ChatIcon />}
                                                    onClick={() => navigate(`/student/events/${reg.event_id}/chat`)}
                                                    sx={{ borderRadius: 2, fontWeight: 700 }}
                                                >
                                                    Chat
                                                </Button>
                                            )}
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                endIcon={<ChevronRight />}
                                                onClick={() => navigate(`/events/${reg.event_id}`)}
                                                sx={{ borderRadius: 2, fontWeight: 700 }}
                                            >
                                                Details
                                            </Button>
                                        </Box>
                                    </Box>
                                </Grid>
                            );
                        })
                    )}
                </AnimatePresence>
            </Grid>
        </Box>
    );
};

export default MyEvents;
