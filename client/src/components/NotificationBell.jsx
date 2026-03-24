import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IconButton, Badge, Typography, Box, List, ListItem,
    ListItemText, Button, ListItemIcon, Tooltip,
    Popover, useTheme
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    Info as InfoIcon,
    Warning as WarningIcon,
    CheckCircle as SuccessIcon,
    Campaign as AnnouncementIcon,
    Settings as SettingsIcon,
    OpenInNew as OpenIcon,
    Circle as UnreadIcon,
    DoneAll as ReadAllIcon,
    NotificationsOff as EmptyIcon,
    AssignmentTurnedIn as RegistrationIcon,
} from '@mui/icons-material';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';

const NotificationBell = () => {
    const { user, profile } = useAuthStore();
    const navigate = useNavigate();
    const theme = useTheme();
    const {
        notifications, unreadCount, fetchNotifications,
        markAsRead, markAllAsRead, subscribeToNotifications
    } = useNotificationStore();

    const [anchorEl, setAnchorEl] = useState(null);

    useEffect(() => {
        if (user?.id) {
            fetchNotifications(user.id);
            const unsubscribe = subscribeToNotifications(user.id);
            return () => unsubscribe();
        }
    }, [user?.id, fetchNotifications, subscribeToNotifications]);

    const handleClick = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const handleMarkAllAsRead = () => {
        if (user?.id) markAllAsRead(user.id);
    };

    const getIconInfo = (type) => {
        switch (type) {
            case 'success': return { icon: <SuccessIcon fontSize="small" />, color: theme.palette.success.main, bg: 'rgba(76, 175, 80, 0.1)' };
            case 'alert': return { icon: <WarningIcon fontSize="small" />, color: theme.palette.error.main, bg: 'rgba(244, 67, 54, 0.1)' };
            case 'announcement': return { icon: <AnnouncementIcon fontSize="small" />, color: theme.palette.warning.main, bg: 'rgba(255, 152, 0, 0.1)' };
            case 'event': return { icon: <RegistrationIcon fontSize="small" />, color: theme.palette.primary.main, bg: 'rgba(33, 150, 243, 0.1)' };
            default: return { icon: <InfoIcon fontSize="small" />, color: theme.palette.info.main, bg: 'rgba(3, 169, 244, 0.1)' };
        }
    };

    const handleNotificationClick = (notif) => {
        markAsRead(notif.id);
        handleClose();

        // Safe Routing Logic Output
        if (profile?.role === 'admin') {
            // Admin doesn't have a dedicated notification center route setup in App.jsx currently
            return;
        }

        if (profile?.role === 'coordinator') {
            if (notif.related_type === 'event') navigate(`/coordinator/events`);
            if (notif.related_type === 'club') navigate(`/coordinator/members`);
        } else {
            // Student
            if (notif.related_type === 'event') navigate(`/student/events/${notif.related_id}`);
            if (notif.related_type === 'club') navigate(`/student/clubs/${notif.related_id}`);
            if (notif.related_type === 'certificate') navigate(`/student/certificates`);
        }
    };

    const open = Boolean(anchorEl);

    return (
        <>
            <Tooltip title="Alerts & Notifications">
                <IconButton
                    onClick={handleClick}
                    sx={{
                        width: 40, height: 40,
                        border: '1px solid', borderColor: 'divider',
                        borderRadius: '12px',
                        bgcolor: open ? 'action.hover' : 'transparent',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'action.hover' }
                    }}
                >
                    <Badge
                        badgeContent={unreadCount}
                        color="error"
                        variant="standard"
                        sx={{
                            '& .MuiBadge-badge': {
                                fontWeight: 800,
                                fontSize: '0.65rem',
                                minWidth: 16,
                                height: 16,
                                padding: '0 4px',
                            }
                        }}
                    >
                        <NotificationsIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                    sx: {
                        width: 380, mt: 1.5,
                        borderRadius: 3,
                        boxShadow: theme.palette.mode === 'dark' ? '0 12px 40px rgba(0,0,0,0.8)' : '0 12px 40px rgba(0,0,0,0.1)',
                        border: '1px solid', borderColor: 'divider',
                        backgroundImage: 'none',
                        bgcolor: 'background.paper',
                        overflow: 'hidden'
                    }
                }}
            >
                <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: -0.5 }}>Inbox Center</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            {unreadCount} pending intel alerts
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {unreadCount > 0 && (
                            <Tooltip title="Clear All">
                                <IconButton size="small" onClick={handleMarkAllAsRead} sx={{ bgcolor: 'action.hover' }}>
                                    <ReadAllIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title="Configure Alerts">
                            <IconButton size="small" onClick={() => { handleClose(); navigate(profile?.role === 'student' ? '/student/settings' : `/${profile?.role}/settings`); }}>
                                <SettingsIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                    {notifications.length > 0 ? (
                        <List disablePadding>
                            <AnimatePresence>
                                {notifications.slice(0, 8).map((notif) => {
                                    const iconMeta = getIconInfo(notif.type);

                                    return (
                                        <ListItem
                                            component={motion.div}
                                            layout
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif)}
                                            sx={{
                                                bgcolor: notif.is_read ? 'transparent' : (theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.05)' : 'rgba(56, 189, 248, 0.03)'),
                                                '&:hover': { bgcolor: 'action.hover' },
                                                cursor: 'pointer',
                                                borderBottom: '1px solid', borderColor: 'divider',
                                                alignItems: 'flex-start',
                                                px: 2.5, py: 2
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 44 }}>
                                                <Box sx={{
                                                    width: 32, height: 32, borderRadius: '8px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: iconMeta.color, bgcolor: iconMeta.bg
                                                }}>
                                                    {iconMeta.icon}
                                                </Box>
                                            </ListItemIcon>

                                            <ListItemText
                                                disableTypography
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                        <Typography variant="subtitle2" fontWeight={notif.is_read ? 600 : 800} sx={{ color: 'text.primary', lineHeight: 1.2 }}>
                                                            {notif.title}
                                                        </Typography>
                                                        {!notif.is_read && <UnreadIcon sx={{ fontSize: 8, color: 'primary.main', ml: 'auto' }} />}
                                                    </Box>
                                                }
                                                secondary={
                                                    <>
                                                        <Typography variant="caption" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'text.secondary', lineHeight: 1.4, mb: 1 }}>
                                                            {notif.message}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontSize: '0.65rem' }}>
                                                            {new Date(notif.created_at).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </Typography>
                                                    </>
                                                }
                                            />
                                        </ListItem>
                                    );
                                })}
                            </AnimatePresence>
                        </List>
                    ) : (
                        <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
                            <Box sx={{
                                width: 64, height: 64, borderRadius: '50%', bgcolor: 'action.hover',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2
                            }}>
                                <EmptyIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                            </Box>
                            <Typography variant="subtitle2" fontWeight={700} color="text.primary">Zero Active Alerts</Typography>
                            <Typography variant="caption" color="text.secondary">All system processes operating nominally.</Typography>
                        </Box>
                    )}
                </Box>

                {profile?.role === 'student' && notifications.length > 0 && (
                    <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                        <Button
                            fullWidth
                            variant="text"
                            endIcon={<OpenIcon sx={{ fontSize: 16 }} />}
                            onClick={() => { handleClose(); navigate('/student/notifications'); }}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                        >
                            Open Intelligence Hub
                        </Button>
                    </Box>
                )}
            </Popover>
        </>
    );
};

export default NotificationBell;

