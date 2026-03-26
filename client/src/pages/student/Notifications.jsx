import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box, Typography, Button, IconButton, CircularProgress,
    List, ListItem, ListItemIcon, ListItemText, Paper, Chip, Tooltip, Divider, useTheme
} from '@mui/material';
import {
    Delete as DeleteIcon,
    DoneAll as ReadIcon,
    Info as InfoIcon,
    CheckCircle as SuccessIcon,
    Warning as AlertIcon,
    Campaign as AnnouncementIcon,
    AssignmentTurnedIn as RegistrationIcon,
    NotificationsOff as EmptyIcon
} from '@mui/icons-material';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';

const NotificationCenter = () => {
    const { profile } = useAuthStore();
    const navigate = useNavigate();
    const theme = useTheme();
    const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } = useNotificationStore();
    const [filter, setFilter] = useState('all');

    const filteredNotifs = notifications.filter(n => {
        if (filter === 'unread') return !n.is_read;
        return true;
    });

    const getIconInfo = (type) => {
        switch (type) {
            case 'success': return { icon: <SuccessIcon />, color: theme.palette.success.main, bg: 'rgba(76, 175, 80, 0.1)' };
            case 'alert': return { icon: <AlertIcon />, color: theme.palette.error.main, bg: 'rgba(244, 67, 54, 0.1)' };
            case 'announcement': return { icon: <AnnouncementIcon />, color: theme.palette.warning.main, bg: 'rgba(255, 152, 0, 0.1)' };
            case 'event': return { icon: <RegistrationIcon />, color: theme.palette.primary.main, bg: 'rgba(33, 150, 243, 0.1)' };
            default: return { icon: <InfoIcon />, color: theme.palette.info.main, bg: 'rgba(3, 169, 244, 0.1)' };
        }
    };

    const handleNotificationClick = (notif) => {
        markAsRead(notif.id);

        if (profile?.role === 'admin') return;

        if (profile?.role === 'coordinator') {
            if (notif.related_type === 'event') navigate(`/coordinator/events`);
            if (notif.related_type === 'club') navigate(`/coordinator/members`);
        } else {
            if (notif.related_type === 'event') navigate(`/events/${notif.related_id}`);
            if (notif.related_type === 'club') navigate(`/student/clubs`);
            if (notif.related_type === 'certificate') navigate(`/student/certificates`);
        }
    };

    if (loading && notifications.length === 0) {
        return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, mb: 10 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
                <Box>
                    <Typography variant="overline" sx={{ color: theme.palette.primary.main, fontWeight: 800, letterSpacing: 2 }}>
                        INTELLIGENCE HUB
                    </Typography>
                    <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: -1, mb: 1 }}>My Alerts</Typography>
                    <Typography color="text.secondary" fontWeight={500}>System-generated intel, broadcast signals, and platform alerts.</Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<ReadIcon />}
                    onClick={() => markAllAsRead(profile.id)}
                    disabled={notifications.filter(n => !n.is_read).length === 0}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                    Acknowledge All
                </Button>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Chip
                    label="All Intel"
                    color={filter === 'all' ? 'primary' : 'default'}
                    onClick={() => setFilter('all')}
                    clickable
                    sx={{ fontWeight: 700, borderRadius: '8px' }}
                />
                <Chip
                    label="Unread Matrix"
                    color={filter === 'unread' ? 'primary' : 'default'}
                    onClick={() => setFilter('unread')}
                    clickable
                    sx={{ fontWeight: 700, borderRadius: '8px' }}
                />
            </Box>

            {/* List */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
                <AnimatePresence>
                    {filteredNotifs.length === 0 ? (
                        <Box sx={{ p: 8, textAlign: 'center' }}>
                            <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
                                <EmptyIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                            </Box>
                            <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>No Activity Detected</Typography>
                            <Typography color="text.secondary" sx={{ maxWidth: 300, mx: 'auto' }}>
                                Your intelligence matrix is currently empty. System alerts will populate here when required.
                            </Typography>
                        </Box>
                    ) : (
                        <List disablePadding>
                            {filteredNotifs.map((notif, index) => {
                                const iconMeta = getIconInfo(notif.type);

                                return (
                                    <motion.div
                                        key={notif.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ListItem
                                            onClick={() => handleNotificationClick(notif)}
                                            sx={{
                                                p: 3,
                                                bgcolor: notif.is_read ? 'transparent' : (theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.05)' : 'rgba(56, 189, 248, 0.03)'),
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: 'action.hover' },
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                borderLeft: notif.is_read ? '4px solid transparent' : `4px solid ${theme.palette.primary.main}`
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 60, mt: 0.5 }}>
                                                <Box sx={{
                                                    width: 48, height: 48, borderRadius: '12px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: iconMeta.color, bgcolor: iconMeta.bg
                                                }}>
                                                    {iconMeta.icon}
                                                </Box>
                                            </ListItemIcon>

                                            <ListItemText
                                                disableTypography
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                                        <Typography variant="subtitle1" fontWeight={notif.is_read ? 600 : 800} sx={{ lineHeight: 1.2 }}>
                                                            {notif.title}
                                                        </Typography>
                                                        {!notif.is_read && <Chip label="NEW" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} />}
                                                        {notif.type === 'announcement' && <Chip size="small" label="BROADCAST" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} />}
                                                    </Box>
                                                }
                                                secondary={
                                                    <>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.5, maxWidth: '90%' }}>
                                                            {notif.message}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
                                                                {new Date(notif.created_at).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </Typography>
                                                        </Box>
                                                    </>
                                                }
                                            />

                                            {/* Action Buttons */}
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {!notif.is_read && (
                                                    <Tooltip title="Acknowledge">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                                                            sx={{ color: 'primary.main', bgcolor: 'primary.main', opacity: 0.1, '&:hover': { opacity: 0.2 } }}
                                                        >
                                                            <ReadIcon fontSize="small" sx={{ color: 'primary.main', opacity: 1 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Purge Record">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                                        sx={{ color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: 'error.main', opacity: 0.1 } }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </ListItem>
                                        {index < filteredNotifs.length - 1 && <Divider />}
                                    </motion.div>
                                );
                            })}
                        </List>
                    )}
                </AnimatePresence>
            </Paper>
        </Box>
    );
};

export default NotificationCenter;
