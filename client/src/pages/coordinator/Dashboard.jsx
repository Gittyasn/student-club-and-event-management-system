import { lazy, Suspense } from 'react';
import { Box, Typography, Grid, Chip, Button, Paper, useTheme } from '@mui/material';
import {
    Event as EventIcon, HowToReg as RegIcon, HourglassEmpty as PendingIcon,
    Star, FactCheck, DateRange, Campaign, Category
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import LoadingDots from '../../components/LoadingDots';

const CoordinatorDashboardCharts = lazy(() => import('./components/CoordinatorDashboardCharts'));

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
                height: '100%', // Ensuring it fills the Grid item height
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

const CoordinatorDashboard = () => {
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const theme = useTheme();

    const { data: stats, isLoading } = useQuery({
        queryKey: ['coordDashPro', user?.id, profile?.club_id],
        enabled: !!user?.id,
        queryFn: async () => {
            // Start all relevant fetches in parallel to minimize latency
            // 1. Get user's club details first (either from profile or memberships)
            const [pRes, clubRes, membershipRes] = await Promise.all([
                supabase.from('profiles').select('club_id').eq('id', user.id).maybeSingle(),
                supabase.from('clubs').select('id, name, rating').eq('coordinator_id', user.id).limit(1).maybeSingle(),
                supabase.from('club_memberships')
                    .select('club_id, club:clubs(name, rating, status)')
                    .eq('user_id', user.id)
                    .eq('role', 'sub_coordinator')
                    .eq('status', 'approved')
                    .limit(1)
            ]);

            let clubId = pRes.data?.club_id;
            let clubInfo = null;

            if (clubId) {
                const { data } = await supabase.from('clubs').select('name, rating').eq('id', clubId).maybeSingle();
                clubInfo = data;
            } else if (clubRes.data?.id) {
                clubId = clubRes.data.id;
                clubInfo = clubRes.data;
            } else if (membershipRes.data?.length > 0) {
                clubId = membershipRes.data[0].club_id;
                clubInfo = membershipRes.data[0].club;
            }

            if (!clubId) return { hasClub: false };

            // 2. Fetch all club-specific metrics in parallel
            const [eventsRes, budgetRes] = await Promise.all([
                supabase.from('events').select('id, title, approval_status, start_time, budget, created_at').eq('club_id', clubId),
                supabase.from('budget_items').select('amount, type, approved').eq('club_id', clubId)
            ]);

            const events = eventsRes.data || [];
            const budget = budgetRes.data || [];

            // Optimize: Re-use events list for registration filtering to avoid double queries
            const { data: regs = [] } = await supabase.from('registrations')
                .select('id, status')
                .in('event_id', events.map(e => e.id));

            const now = new Date();
            const upcomingEvents = events.filter(e => new Date(e.start_time) > now && e.approval_status === 'approved')
                .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                .slice(0, 4);

            const attended = regs.filter(r => r.status === 'attended').length;
            const totalRegs = regs.length;
            const attendanceRate = totalRegs > 0 ? Math.round((attended / totalRegs) * 100) : 0;

            const months = Array.from({ length: 5 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1);
                return { month: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), monthNum: d.getMonth() };
            });

            const timeline = months.map(m => ({
                month: m.month,
                Events: events.filter(e => { 
                    const d = new Date(e.created_at); 
                    return d.getMonth() === m.monthNum && d.getFullYear() === m.year; 
                }).length,
            }));

            const income = budget.filter(b => b.type === 'income' && b.approved).reduce((sum, item) => sum + (item.amount || 0), 0);
            const expenses = budget.filter(b => b.type === 'expense' && b.approved).reduce((sum, item) => sum + (item.amount || 0), 0);
            const pendingParams = budget.filter(b => !b.approved).reduce((sum, item) => sum + (item.amount || 0), 0);

            const budgetPie = [
                { name: 'Income', value: income || 0 },
                { name: 'Expenses', value: expenses || 0 },
                { name: 'Pending', value: pendingParams || 0 }
            ];
            const hasBudgetData = income > 0 || expenses > 0 || pendingParams > 0;

            return {
                hasClub: true, 
                clubId, 
                clubName: clubInfo?.name, 
                rating: clubInfo?.rating,
                totalEvents: events.length,
                approvedEvents: events.filter(e => e.approval_status === 'approved').length,
                pendingEvents: events.filter(e => e.approval_status === 'pending').length,
                totalParticipants: totalRegs,
                attendanceRate,
                upcomingEvents, timeline, budgetPie, income, expenses, pendingParams, hasBudgetData
            };
        }
    });

    if (isLoading) return <LoadingDots label="Loading club insights..." minHeight="60vh" />;

    if (stats?.hasClub === false) return (
        <Paper elevation={0} sx={{ py: 8, textAlign: 'center', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
            <Box sx={{ width: 64, height: 64, mx: 'auto', mb: 3, borderRadius: '50%', bgcolor: theme.palette.action.hover, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Category sx={{ fontSize: 32, color: 'text.secondary' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>No Club Assigned</Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 400, mx: 'auto' }}>
                You are registered as a coordinator, but haven&apos;t been assigned to an active club by the administration.
            </Typography>
        </Paper>
    );

    const kpis = [
        { title: 'Total Events', value: stats?.totalEvents, icon: <EventIcon fontSize="small" />, subtitle: 'All time' },
        { title: 'Pending Approval', value: stats?.pendingEvents, icon: <PendingIcon fontSize="small" />, subtitle: 'Needs admin review' },
        { title: 'Total Participants', value: stats?.totalParticipants, icon: <RegIcon fontSize="small" />, subtitle: 'Registrations count' },
        { title: 'Attendance Rate', value: `${stats?.attendanceRate}%`, icon: <FactCheck fontSize="small" />, subtitle: 'Average rate' }
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
                        : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,253,250,0.7) 100%)'
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
                    <Box>
                        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>
                            Coordinator Dashboard
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                            {stats?.clubName || 'Coordinator Dashboard'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                            {currentDate} | <Star sx={{ fontSize: 16, color: '#f59e0b' }} /> {stats?.rating || 0}/5 Rating
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            startIcon={<Campaign />}
                            onClick={() => navigate('/coordinator/events/create')}
                            sx={{ px: 3, py: 1.25, borderRadius: 2 }}
                        >
                            Create New Event
                        </Button>
                        {stats?.clubId && (
                            <Button
                                variant="outlined"
                                onClick={() => navigate(`/coordinator/clubs/${stats.clubId}/chat`)}
                                sx={{ px: 3, py: 1.25, borderRadius: 2 }}
                            >
                                Club Chat
                            </Button>
                        )}
                    </Box>
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

            <Suspense fallback={<LoadingDots label="Loading charts..." minHeight="240px" />}>
                <CoordinatorDashboardCharts stats={stats} />
            </Suspense>

            {/* Bottom Row */}
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Panel
                        title="Upcoming Approved Events"
                        subtitle="Scheduled for the coming weeks"
                        action={
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {stats?.upcomingEvents?.length > 0 && (
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => navigate(`/events/${stats.upcomingEvents[0].id}/chat`)}
                                        sx={{ fontWeight: 600 }}
                                    >
                                        Open Event Chat
                                    </Button>
                                )}
                                <Button variant="text" size="small" onClick={() => navigate('/coordinator/events')} sx={{ fontWeight: 600 }}>Manage All</Button>
                            </Box>
                        }
                    >
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            {(stats?.upcomingEvents || []).map((event) => (
                                <Grid item xs={12} md={6} lg={3} key={event.id} sx={{ display: 'flex' }}>
                                    <Paper elevation={0} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, height: '100%', bgcolor: theme.palette.background.default }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }}>
                                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>
                                                    {new Date(event.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric' })}
                                                </Typography>
                                            </Box>
                                            <Chip label="Approved" size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none' }} />
                                        </Box>
                                        <Box>
                                            <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>{event.title}</Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <DateRange sx={{ fontSize: 14 }} /> {new Date(event.start_time).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ mt: 'auto', pt: 2 }}>
                                            <Button variant="outlined" size="small" fullWidth sx={{ fontWeight: 600, borderRadius: 1.5 }} onClick={() => navigate(`/events/${event.id}`)}>View Details</Button>
                                        </Box>
                                    </Paper>
                                </Grid>
                            ))}
                            {(!stats?.upcomingEvents?.length) && (
                                <Grid item xs={12}>
                                    <Box sx={{ py: 4, textAlign: 'center' }}>
                                        <EventIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>No upcoming events</Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>You don&apos;t have any approved events scheduled.</Typography>
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </Panel>
                </Grid>
            </Grid>
            
        </Box>
    );
};

export default CoordinatorDashboard;

