import { lazy, Suspense, useEffect, useMemo } from 'react';
import { Box, Typography, Grid, Chip, Button, Stack, Paper, useTheme } from '@mui/material';
import {
    Event as EventIcon, EmojiEvents, Category, Notifications,
    LocalActivity, MilitaryTech, Star, ChevronRight,
    AccessTime, GroupAdd, EventAvailable, Chat
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import LoadingDots from '../../components/LoadingDots';

const StudentDashboardActivityChart = lazy(() => import('./components/StudentDashboardActivityChart'));

const StatCard = ({ title, value, icon, subtitle }) => {
    const theme = useTheme();
    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2.5, md: 2.5 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2.5,
                background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(2,6,23,0.7) 100%)'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.85) 100%)',
                transition: 'all 0.2s ease',
                '&:hover': {
                    borderColor: theme.palette.primary.main,
                    boxShadow: theme.palette.mode === 'dark' ? '0 10px 30px rgba(0,0,0,0.35)' : '0 12px 30px rgba(15,23,42,0.08)',
                    transform: 'translateY(-2px)'
                }
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, lineHeight: 1.2 }}>
                    {title}
                </Typography>
                <Box sx={{
                    color: 'text.secondary',
                    display: 'flex',
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.06)'
                }}>
                    {icon}
                </Box>
            </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5, lineHeight: 1, fontSize: { xs: '1.75rem', md: '2.1rem' } }}>
                {value}
            </Typography>
            {subtitle && (
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {subtitle}
                </Typography>
            )}
        </Paper>
    );
};

const Panel = ({ title, subtitle, children, action }) => {
    const theme = useTheme();
    return (
        <Paper
            elevation={0}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                flex: 1,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2.5,
                overflow: 'hidden',
                minHeight: 400
            }}
        >
            <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '1rem' }}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                {action}
            </Box>
            <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {children}
            </Box>
        </Paper>
    );
};

const getNotificationPriority = (type) => {
    switch (type) {
        case 'alert':
            return { label: 'Urgent', color: 'error' };
        case 'announcement':
            return { label: 'Announcement', color: 'warning' };
        case 'certificate':
            return { label: 'Certificate', color: 'success' };
        case 'event':
            return { label: 'Event', color: 'primary' };
        default:
            return { label: 'Info', color: 'default' };
    }
};

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const theme = useTheme();
    const { notifications, unreadCount, fetchNotifications } = useNotificationStore();

    const { data, isLoading } = useQuery({
        queryKey: ['studentDashPro', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const [memberships, regs, certs] = await Promise.all([
                supabase.from('club_memberships').select('role, club:clubs(id, name, category)').eq('user_id', user.id),
                supabase.from('registrations').select('status, attendance_status, event_id, created_at, event:events(title, start_time, end_time)').eq('user_id', user.id),
                supabase.from('certificates').select('id').eq('user_id', user.id),
            ]);

            const clubCount = memberships.data?.length || 0;
            const eventCount = regs.data?.length || 0;
            const certCount = certs.data?.length || 0;

            const upcomingRegs = regs.data?.filter(r => new Date(r.event?.start_time) > new Date()) || [];
            const attendedCount = regs.data?.filter(r => r.status === 'attended').length || 0;
            const attendanceRate = eventCount > 0 ? Math.round((attendedCount / eventCount) * 100) : 0;

            const categories = {};
            memberships.data?.forEach(m => {
                const cat = m.club?.category || 'General';
                categories[cat] = (categories[cat] || 0) + 1;
            });
            regs.data?.forEach(() => {
                categories['Events'] = (categories['Events'] || 0) + 1;
            });

            const radarData = [
                { subject: 'Tech', A: categories['Tech'] || 0, fullMark: 10 },
                { subject: 'Cultural', A: categories['Cultural'] || 0, fullMark: 10 },
                { subject: 'Sports', A: categories['Sports'] || 0, fullMark: 10 },
                { subject: 'Events', A: categories['Events'] || 0, fullMark: 10 },
                { subject: 'Core', A: categories['General'] || categories['Core'] || 0, fullMark: 10 },
            ];

            const score = Math.min((clubCount * 50) + (eventCount * 25) + (certCount * 100) + (attendanceRate * 2), 1000);

            const firstClubId = memberships.data?.find(m => m.club?.id)?.club?.id || null;
            return {
                clubCount, eventCount, certCount, attendanceRate,
                upcoming: upcomingRegs.length,
                radarData,
                recentRegs: (regs.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5),
                score,
                firstClubId
            };
        }
    });

    useEffect(() => {
        if (user?.id) {
            fetchNotifications(user.id);
        }
    }, [fetchNotifications, user?.id]);

    const latestNotifications = useMemo(() => notifications.slice(0, 3), [notifications]);
    const urgentCount = useMemo(
        () => notifications.filter((notification) => !notification.is_read && notification.type === 'alert').length,
        [notifications]
    );

    if (isLoading) return <LoadingDots label="Loading dashboard data..." minHeight="60vh" />;

    const kpis = [
        { title: 'Active Clubs', value: data?.clubCount, icon: <Category fontSize="small" />, subtitle: 'Current memberships' },
        { title: 'Total Events', value: data?.eventCount, icon: <EventIcon fontSize="small" />, subtitle: 'Registered events' },
        { title: 'Upcoming', value: data?.upcoming, icon: <AccessTime fontSize="small" />, subtitle: 'In the next 30 days' },
        { title: 'Certificates', value: data?.certCount, icon: <MilitaryTech fontSize="small" />, subtitle: 'Earned documents' },
    ];

    const firstChatEventId = data?.recentRegs?.find(r => r.event_id)?.event_id;
    const firstClubId = data?.firstClubId;
    const quickActions = [
        { icon: <GroupAdd />, title: 'Discover Clubs', path: '/student/clubs/discover' },
        { icon: <EventAvailable />, title: 'Find Events', path: '/student/browse-events' },
        { icon: <EmojiEvents />, title: 'Leaderboard', path: '/student/leaderboard' },
        { icon: <MilitaryTech />, title: 'Certificates', path: '/student/certificates' },
        { icon: <Chat />, title: 'Event Chat', path: firstChatEventId ? `/events/${firstChatEventId}/chat` : '/student/browse-events' },
        { icon: <Chat />, title: 'Club Chat', path: firstClubId ? `/student/clubs/${firstClubId}/chat` : '/student/clubs' },
    ];

    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    return (
        <Box sx={{ pb: 6, maxWidth: 1200, mx: 'auto' }}>
            {/* Header Section */}
            <Paper
                elevation={0}
                sx={{
                    mb: 4,
                    p: { xs: 2.5, md: 3 },
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`,
                    background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(2,6,23,0.7) 100%)'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,249,255,0.7) 100%)'
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 3 }}>
                    <Box>
                        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>
                            Student Dashboard
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                            Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {currentDate}
                        </Typography>
                    </Box>
                    <Paper
                        elevation={0}
                        sx={{
                            px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2,
                            border: `1px solid ${theme.palette.divider}`, borderRadius: 2,
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'
                        }}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}>Engagement Score</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.primary.main, mt: 0.5 }}>{data?.score || 0}</Typography>
                        </Box>
                        <Star sx={{ color: theme.palette.primary.main, fontSize: 28, opacity: 0.85 }} />
                    </Paper>
                </Box>
            </Paper>

            {/* KPI Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {kpis.map((k, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <StatCard {...k} />
                    </Grid>
                ))}
            </Grid>

            {/* Quick Actions & Notifications Row */}
            <Grid container spacing={3} sx={{ display: 'flex' }} alignItems="stretch">
                <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Panel title="Quick Actions" subtitle="Jump straight into the sections you use most">
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            {quickActions.map((qa, i) => (
                                <Grid item xs={6} sm={3} key={i}>
                                    <Paper
                                        elevation={0}
                                        onClick={() => navigate(qa.path)}
                                        sx={{
                                            p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.default,
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            gap: 1.5, cursor: 'pointer', height: '100%', minHeight: 110,
                                            transition: 'all 0.2s',
                                            '&:hover': { borderColor: theme.palette.primary.main, bgcolor: theme.palette.action.hover }
                                        }}
                                    >
                                        <Box sx={{ color: 'text.secondary' }}>
                                            {qa.icon}
                                        </Box>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', textAlign: 'center' }}>{qa.title}</Typography>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    </Panel>
                </Grid>
                <Grid item xs={12} md={5} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Panel title="Inbox Summary" subtitle="Unread updates, urgent items, and your latest alerts" action={<Button variant="text" size="small" sx={{ fontWeight: 600 }} onClick={() => navigate('/student/notifications')}>View All</Button>}>
                        <Stack spacing={2} sx={{ height: '100%' }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 2.5,
                                    border: `1px solid ${theme.palette.divider}`,
                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.02)',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                                    <Box>
                                        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>
                                            Unread
                                        </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                                            {unreadCount}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={urgentCount > 0 ? `${urgentCount} urgent` : 'No urgent items'}
                                        color={urgentCount > 0 ? 'error' : 'default'}
                                        size="small"
                                        sx={{ fontWeight: 700 }}
                                    />
                                </Box>
                            </Box>

                            {latestNotifications.length > 0 ? (
                                <Stack spacing={1.5} sx={{ flex: 1 }}>
                                    {latestNotifications.map((notification) => {
                                        const priority = getNotificationPriority(notification.type);

                                        return (
                                            <Box
                                                key={notification.id}
                                                onClick={() => navigate('/student/notifications')}
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2,
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        borderColor: theme.palette.primary.main,
                                                        bgcolor: theme.palette.action.hover,
                                                    },
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: notification.is_read ? 700 : 800 }} noWrap>
                                                        {notification.title}
                                                    </Typography>
                                                    <Chip label={priority.label} color={priority.color} size="small" sx={{ fontWeight: 700 }} />
                                                </Box>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: 'text.secondary',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        mb: 0.75,
                                                    }}
                                                >
                                                    {notification.message}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                                                    {new Date(notification.created_at).toLocaleString([], {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, py: 4 }}>
                                    <Box sx={{ p: 2, borderRadius: '50%', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', mb: 2 }}>
                                        <Notifications sx={{ fontSize: 32, color: 'text.secondary' }} />
                                    </Box>
                                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                                        No notifications yet
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                                        New alerts, event updates, and certificates will appear here.
                                    </Typography>
                                </Box>
                            )}

                            <Button
                                variant="outlined"
                                onClick={() => navigate('/student/notifications')}
                                sx={{ alignSelf: 'flex-start', fontWeight: 700, mt: 'auto' }}
                            >
                                View all notifications
                            </Button>
                        </Stack>
                    </Panel>
                </Grid>
            </Grid>

            {/* Main Content Rows */}
            <Grid container spacing={3} sx={{ mt: 1, mb: 4, display: 'flex' }} alignItems="stretch">
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Panel title="Recent Registrations" subtitle="Your latest event signups"
                        action={<Button variant="text" size="small" endIcon={<ChevronRight />} onClick={() => navigate('/student/registrations')} sx={{ fontWeight: 600 }}>View All</Button>}>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            {(data?.recentRegs || []).map((reg) => {
                                const isUpcoming = new Date(reg.event?.start_time) > new Date();
                                return (
                                    <Box key={reg.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.default }}>
                                        <Box sx={{ width: 40, height: 40, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
                                            <LocalActivity sx={{ fontSize: 20, color: 'text.secondary' }} />
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }} noWrap>{reg.event?.title || 'Unknown Event'}</Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {new Date(reg.event?.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={isUpcoming ? 'Upcoming' : (reg.attendance_status === 'present' ? 'Attended' : 'Registered')}
                                            size="small"
                                            sx={{
                                                fontSize: '0.7rem', fontWeight: 600, height: 24,
                                                bgcolor: isUpcoming ? (theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)') : (reg.attendance_status === 'present' ? (theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)') : theme.palette.action.hover),
                                                color: isUpcoming ? '#f59e0b' : (reg.attendance_status === 'present' ? '#10b981' : 'text.secondary'),
                                                border: 'none'
                                            }}
                                        />
                                    </Box>
                                );
                            })}
                            {(!data?.recentRegs?.length) && (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>No recent signups found.</Typography>
                                </Box>
                            )}
                        </Stack>
                    </Panel>
                </Grid>
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Suspense fallback={<LoadingDots label="Loading chart..." minHeight="220px" />}>
                        <StudentDashboardActivityChart data={data} />
                    </Suspense>
                </Grid>
            </Grid>
            
        </Box>
    );
};

export default StudentDashboard;
