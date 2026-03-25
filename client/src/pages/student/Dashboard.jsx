import { Box, Typography, Grid, Chip, Button, Stack, Paper, useTheme } from '@mui/material';
import {
    Event as EventIcon, EmojiEvents, Category, Notifications,
    LocalActivity, MilitaryTech, Star, ChevronRight,
    AccessTime, GroupAdd, EventAvailable, Insights, Chat
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import CampusGuide from '../../components/CampusGuide';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts';

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

const CustomTooltip = ({ active, payload, label }) => {
    const theme = useTheme();
    if (!active || !payload?.length) return null;
    return (
        <Paper sx={{ p: 1.5, border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[3] }}>
            {label && <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', display: 'block', mb: 0.5 }}>{label}</Typography>}
            {payload.map((p, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color || p.fill || theme.palette.primary.main }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        {p.name}: {p.value}
                    </Typography>
                </Box>
            ))}
        </Paper>
    );
};

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const theme = useTheme();

    const { data, isLoading } = useQuery({
        queryKey: ['studentDashPro', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const [memberships, regs, certs] = await Promise.all([
                supabase.from('club_memberships').select('role, club:clubs(id, name, category)').eq('user_id', user.id),
                supabase.from('registrations').select('status, event_id, created_at, event:events(title, start_time, end_time)').eq('user_id', user.id),
                supabase.from('certificates').select('id, issue_date').eq('user_id', user.id),
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

    if (isLoading) return (
        <Box display="flex" alignItems="center" justifyContent="center" height="60vh" gap={2}>
            <Insights sx={{ fontSize: 32, color: 'text.secondary', animation: 'spin 2s linear infinite' }} />
            <Typography sx={{ fontWeight: 500, color: 'text.secondary' }}>Loading dashboard data...</Typography>
        </Box>
    );

    const kpis = [
        { title: 'Active Clubs', value: data?.clubCount, icon: <Category fontSize="small" />, subtitle: 'Current memberships' },
        { title: 'Total Events', value: data?.eventCount, icon: <EventIcon fontSize="small" />, subtitle: 'Registered events' },
        { title: 'Upcoming', value: data?.upcoming, icon: <AccessTime fontSize="small" />, subtitle: 'In the next 30 days' },
        { title: 'Certificates', value: data?.certCount, icon: <MilitaryTech fontSize="small" />, subtitle: 'Earned documents' },
    ];

    const firstChatEventId = data?.recentRegs?.find(r => r.event_id)?.event_id;
    const firstClubId = data?.firstClubId;
    const quickActions = [
        { icon: <GroupAdd />, title: 'Discover Clubs', path: '/student/clubs' },
        { icon: <EventAvailable />, title: 'Find Events', path: '/student/events' },
        { icon: <EmojiEvents />, title: 'Leaderboard', path: '/student/club-leaderboard' },
        { icon: <MilitaryTech />, title: 'Certificates', path: '/student/certificates' },
        { icon: <Chat />, title: 'Event Chat', path: firstChatEventId ? `/events/${firstChatEventId}/chat` : '/student/events' },
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
                            Student Command Center
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

            {/* Main Content Rows */}
            <Grid container spacing={3} sx={{ mb: 4, display: 'flex' }} alignItems="stretch">
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Panel title="Activity Distribution" subtitle="Your engagement across categories">
                        <Box sx={{ height: 200, width: '100%', mt: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data?.radarData || []}>
                                    <PolarGrid stroke={theme.palette.divider} />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 500 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 'dataMax + 2']} tick={false} axisLine={false} />
                                    <Radar name="Activity" dataKey="A" stroke={theme.palette.primary.main} strokeWidth={2} fill={theme.palette.primary.main} fillOpacity={0.2} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Panel>
                </Grid>
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Panel title="Recent Registrations" subtitle="Your latest event signups"
                        action={<Button variant="text" size="small" endIcon={<ChevronRight />} onClick={() => navigate('/student/events')} sx={{ fontWeight: 600 }}>View All</Button>}>
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
            </Grid>

            {/* Quick Actions & Notifications Row */}
            <Grid container spacing={3} sx={{ display: 'flex' }} alignItems="stretch">
                <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Panel title="Quick Actions" subtitle="Navigate to essential modules">
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
                    <Panel title="Notifications" subtitle="Recent updates and alerts" action={<Button variant="text" size="small" sx={{ fontWeight: 600 }}>Mark all read</Button>}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, py: 4 }}>
                            <Box sx={{ p: 2, borderRadius: '50%', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', mb: 2 }}>
                                <Notifications sx={{ fontSize: 32, color: 'text.secondary' }} />
                            </Box>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>You&apos;re all caught up</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>No new notifications at this time.</Typography>
                        </Box>
                    </Panel>
                </Grid>
            </Grid>
            
        </Box>
    );
};

export default StudentDashboard;
