import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import {
    Campaign as AnnouncementIcon,
    Delete as DeleteIcon,
    DoneAll as ReadIcon,
    Event as EventIcon,
    Info as InfoIcon,
    NotificationsOff as EmptyIcon,
    School as CertificateIcon,
    Warning as AlertIcon,
} from '@mui/icons-material';
import LoadingDots from '../../components/LoadingDots';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'announcements', label: 'Announcements' },
    { key: 'events', label: 'Events' },
    { key: 'certificates', label: 'Certificates' },
];

const getNotificationMeta = (notification, theme) => {
    const isCertificate = notification.related_type === 'certificate' || /certificate/i.test(`${notification.title} ${notification.message}`);

    if (notification.type === 'alert') {
        return { icon: <AlertIcon />, color: theme.palette.error.main, bg: 'rgba(239,68,68,0.10)', label: 'Urgent' };
    }

    if (notification.type === 'announcement') {
        return { icon: <AnnouncementIcon />, color: theme.palette.warning.main, bg: 'rgba(245,158,11,0.12)', label: 'Announcement' };
    }

    if (isCertificate) {
        return { icon: <CertificateIcon />, color: theme.palette.success.main, bg: 'rgba(16,185,129,0.12)', label: 'Certificate' };
    }

    if (notification.type === 'event' || notification.related_type === 'event') {
        return { icon: <EventIcon />, color: theme.palette.primary.main, bg: 'rgba(37,99,235,0.12)', label: 'Event' };
    }

    return { icon: <InfoIcon />, color: theme.palette.info.main, bg: 'rgba(14,165,233,0.12)', label: 'Info' };
};

const matchesFilter = (notification, filter) => {
    const isCertificate = notification.related_type === 'certificate' || /certificate/i.test(`${notification.title} ${notification.message}`);

    if (filter === 'unread') return !notification.is_read;
    if (filter === 'announcements') return notification.type === 'announcement';
    if (filter === 'events') return notification.type === 'event' || notification.related_type === 'event';
    if (filter === 'certificates') return isCertificate;
    return true;
};

const getTimeSection = (createdAt) => {
    const now = new Date();
    const date = new Date(createdAt);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(dayStart);
    weekStart.setDate(dayStart.getDate() - 7);

    if (date >= dayStart) return 'Today';
    if (date >= weekStart) return 'Earlier this week';
    return 'Older';
};

const NotificationCenter = () => {
    const { user, profile } = useAuthStore();
    const navigate = useNavigate();
    const theme = useTheme();
    const {
        notifications,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotificationStore();
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (user?.id) {
            fetchNotifications(user.id);
        }
    }, [fetchNotifications, user?.id]);

    const filteredNotifications = useMemo(
        () => notifications.filter((notification) => matchesFilter(notification, filter)),
        [filter, notifications]
    );

    const groupedNotifications = useMemo(() => {
        const groups = { Today: [], 'Earlier this week': [], Older: [] };

        filteredNotifications.forEach((notification) => {
            groups[getTimeSection(notification.created_at)].push(notification);
        });

        return Object.entries(groups).filter(([, items]) => items.length > 0);
    }, [filteredNotifications]);

    const unreadCount = notifications.filter((notification) => !notification.is_read).length;

    const handleNotificationClick = (notification) => {
        markAsRead(notification.id);

        if (profile?.role === 'admin') return;

        if (profile?.role === 'coordinator') {
            if (notification.related_type === 'event') navigate('/coordinator/events');
            if (notification.related_type === 'club') navigate('/coordinator/members');
            return;
        }

        if (notification.related_type === 'event') navigate(`/events/${notification.related_id}`);
        if (notification.related_type === 'club') navigate('/student/clubs');
        if (notification.related_type === 'certificate') navigate('/student/certificates');
    };

    if (loading && notifications.length === 0) {
        return <LoadingDots label="Loading notifications..." minHeight="40vh" />;
    }

    return (
        <Box sx={{ maxWidth: 920, mx: 'auto', mt: 4, mb: 10 }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 3, md: 4 },
                    mb: 3,
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(14,165,233,0.06) 100%)',
                }}
            >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="overline" sx={{ color: theme.palette.primary.main, fontWeight: 800, letterSpacing: 1.5 }}>
                            Notifications
                        </Typography>
                        <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1, mb: 1 }}>
                            Inbox
                        </Typography>
                        <Typography color="text.secondary">
                            Review announcements, event updates, certificates, and urgent alerts in one place.
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
                        <Chip label={`${notifications.length} total`} variant="outlined" sx={{ fontWeight: 700 }} />
                        <Chip label={`${unreadCount} unread`} color={unreadCount > 0 ? 'primary' : 'default'} sx={{ fontWeight: 700 }} />
                        <Button
                            variant="outlined"
                            startIcon={<ReadIcon />}
                            onClick={() => markAllAsRead(user?.id)}
                            disabled={!user?.id || unreadCount === 0}
                            sx={{ fontWeight: 700 }}
                        >
                            Mark all read
                        </Button>
                    </Stack>
                </Box>
            </Paper>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
                {FILTERS.map((entry) => (
                    <Chip
                        key={entry.key}
                        label={entry.label}
                        clickable
                        color={filter === entry.key ? 'primary' : 'default'}
                        onClick={() => setFilter(entry.key)}
                        sx={{ fontWeight: 700, borderRadius: 2 }}
                    />
                ))}
            </Stack>

            {groupedNotifications.length === 0 ? (
                <Paper elevation={0} sx={{ p: 8, textAlign: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            bgcolor: 'action.hover',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 3,
                        }}
                    >
                        <EmptyIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                    </Box>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
                        No notifications in this view
                    </Typography>
                    <Typography color="text.secondary">
                        Change the filter or check back later for new updates.
                    </Typography>
                </Paper>
            ) : (
                <Stack spacing={3}>
                    {groupedNotifications.map(([section, items]) => (
                        <Box key={section}>
                            <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
                                {section}
                            </Typography>
                            <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                                {items.map((notification, index) => {
                                    const meta = getNotificationMeta(notification, theme);

                                    return (
                                        <Box key={notification.id}>
                                            <Box
                                                onClick={() => handleNotificationClick(notification)}
                                                sx={{
                                                    p: 3,
                                                    cursor: 'pointer',
                                                    bgcolor: notification.is_read
                                                        ? 'transparent'
                                                        : (theme.palette.mode === 'dark' ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.03)'),
                                                    borderLeft: `4px solid ${notification.is_read ? 'transparent' : meta.color}`,
                                                    transition: 'background-color 0.2s ease',
                                                    '&:hover': { bgcolor: 'action.hover' },
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                                    <Box
                                                        sx={{
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: 3,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: meta.color,
                                                            bgcolor: meta.bg,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {meta.icon}
                                                    </Box>

                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1 }}>
                                                            <Typography variant="subtitle1" fontWeight={notification.is_read ? 700 : 900} sx={{ lineHeight: 1.2 }}>
                                                                {notification.title}
                                                            </Typography>
                                                            <Chip label={meta.label} size="small" sx={{ fontWeight: 700 }} />
                                                            {!notification.is_read ? (
                                                                <Chip label="Unread" size="small" color="primary" sx={{ fontWeight: 700 }} />
                                                            ) : null}
                                                        </Box>

                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25, lineHeight: 1.6 }}>
                                                            {notification.message}
                                                        </Typography>

                                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
                                                            {new Date(notification.created_at).toLocaleString([], {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </Typography>
                                                    </Box>

                                                    <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1}>
                                                        {!notification.is_read ? (
                                                            <Tooltip title="Mark as read">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        markAsRead(notification.id);
                                                                    }}
                                                                >
                                                                    <ReadIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        ) : null}
                                                        <Tooltip title="Delete notification">
                                                            <IconButton
                                                                size="small"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    deleteNotification(notification.id);
                                                                }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </Box>
                                            </Box>
                                            {index < items.length - 1 ? <Divider /> : null}
                                        </Box>
                                    );
                                })}
                            </Paper>
                        </Box>
                    ))}
                </Stack>
            )}
        </Box>
    );
};

export default NotificationCenter;
