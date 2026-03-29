import { lazy, Suspense } from 'react';
import { Box, Typography, Grid, Button, Stack, Paper, useTheme } from '@mui/material';
import {
    Group as UsersIcon, Category as ClubIcon, Event as EventIcon,
    HourglassEmpty as PendingIcon, Shield, PeopleAlt
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import LoadingDots from '../../components/LoadingDots';
import { fetchAuditLogs } from '../../services/auditLogService';

const AdminDashboardCharts = lazy(() => import('./components/AdminDashboardCharts'));

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

const AdminDashboard = () => {
    const navigate = useNavigate();
    const theme = useTheme();

    const { data, isLoading } = useQuery({
        queryKey: ['adminDashPro'],
        queryFn: async () => {
            const [clubs, users, events, registrations, budgetItems, auditLogs] = await Promise.all([
                supabase.from('clubs').select('id, name, status, rating, category').order('rating', { ascending: false }),
                supabase.from('profiles').select('id, role, created_at'),
                supabase.from('events').select('id, approval_status, start_time, created_at').order('created_at', { ascending: true }),
                supabase.from('registrations').select('id, status, created_at'),
                supabase.from('budget_items').select('amount, type, approved'),
                fetchAuditLogs({ limit: 6 }),
            ]);

            const now = new Date();
            const months = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
                return { month: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), monthNum: d.getMonth() };
            });

            const timeline = months.map(m => ({
                month: m.month,
                Events: events.data?.filter(e => { const d = new Date(e.created_at); return d.getMonth() === m.monthNum && d.getFullYear() === m.year; }).length || 0,
                Users: users.data?.filter(u => { const d = new Date(u.created_at); return d.getMonth() === m.monthNum && d.getFullYear() === m.year; }).length || 0,
            }));

            const totalUsers = users.data?.length || 0;
            const students = users.data?.filter(u => u.role === 'student').length || 0;
            const coordinators = users.data?.filter(u => u.role === 'coordinator').length || 0;
            const income = budgetItems.data?.filter(b => b.type === 'income').reduce((s, b) => s + (b.amount || 0), 0) || 0;
            const expense = budgetItems.data?.filter(b => b.type === 'expense').reduce((s, b) => s + (b.amount || 0), 0) || 0;
            const attendanceRate = registrations.data?.length
                ? Math.round((registrations.data.filter(r => r.status === 'attended').length / registrations.data.length) * 100)
                : 0;

            return {
                totalUsers, students, coordinators,
                totalClubs: clubs.data?.length || 0,
                totalEvents: events.data?.length || 0,
                pendingApprovals: events.data?.filter(e => e.approval_status === 'pending').length || 0,
                totalRegistrations: registrations.data?.length || 0,
                income, expense, attendanceRate,
                timeline,
                rolePie: [
                    { name: 'Students', value: students },
                    { name: 'Coordinators', value: coordinators },
                ],
                topClubs: (clubs.data || []).slice(0, 5).map(c => ({ ...c, score: Math.round((c.rating || 0) * 20) })),
                recentAudit: auditLogs || [],
            };
        }
    });

    if (isLoading) return <LoadingDots label="Loading administrative data..." minHeight="60vh" />;

    const kpis = [
        { title: 'Total Users', value: data?.totalUsers, icon: <UsersIcon fontSize="small" />, subtitle: 'Active accounts' },
        { title: 'Total Clubs', value: data?.totalClubs, icon: <ClubIcon fontSize="small" />, subtitle: 'Campus organizations' },
        { title: 'Total Events', value: data?.totalEvents, icon: <EventIcon fontSize="small" />, subtitle: 'Historical records' },
        { title: 'Pending Approval', value: data?.pendingApprovals, icon: <PendingIcon fontSize="small" />, subtitle: 'Awaiting review' },
    ];

    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    return (
        <Box sx={{ pb: 6, maxWidth: 1400, mx: 'auto' }}>
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
                        : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(239,246,255,0.75) 100%)'
                }}
            >
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 3 }}>
                <Box>
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>
                        Admin Dashboard
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                        System Administration
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                        Campus operations summary | {currentDate}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            px: 3, py: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                            border: `1px solid ${theme.palette.divider}`, borderRadius: 2,
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                        }}
                    >
                        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1 }}>Avg. Attendance</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>{data?.attendanceRate || 0}%</Typography>
                    </Paper>
                    <Button
                        variant="contained"
                        onClick={() => navigate('/admin/approvals')}
                        sx={{ px: 3, py: 1.5, borderRadius: 2 }}
                    >
                        Review Approvals
                    </Button>
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
                <AdminDashboardCharts data={data} />
            </Suspense>

            {/* Bottom Row */}
            <Grid container spacing={3} sx={{ display: 'flex' }} alignItems="stretch">
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Panel title="Performance Leaderboard" subtitle="Top ranking clubs by score">
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            {(data?.topClubs || []).map((club, i) => (
                                <Box key={club.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.default }}>
                                    <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: i < 3 ? (theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)') : theme.palette.action.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Typography sx={{ fontWeight: 800, color: i < 3 ? '#3b82f6' : 'text.secondary', fontSize: '0.9rem' }}>#{i + 1}</Typography>
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }} noWrap>{club.name}</Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{club.category || 'General'}</Typography>
                                    </Box>
                                    <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
                                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.primary' }}>{club.score} <span style={{ color: theme.palette.text.secondary, fontWeight: 500 }}>/100</span></Typography>
                                    </Box>
                                </Box>
                            ))}
                            {(!data?.topClubs?.length) && (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>No active clubs found to rank.</Typography>
                                </Box>
                            )}
                        </Stack>
                    </Panel>
                </Grid>
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Panel
                        title="Audit Trail"
                        subtitle="Recent administrative actions"
                        action={
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button variant="outlined" size="small" onClick={() => navigate('/admin/broadcast')} sx={{ fontWeight: 600 }}>
                                    Broadcast Chat
                                </Button>
                                <Button variant="text" size="small" sx={{ fontWeight: 600 }} onClick={() => navigate('/admin/security')}>Full Logs</Button>
                            </Box>
                        }
                    >
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            {(data?.recentAudit || []).map((log, i) => (
                                <Box key={log.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5, borderRadius: 2, borderBottom: i < (data.recentAudit.length - 1) ? `1px solid ${theme.palette.divider}` : 'none' }}>
                                    <Box sx={{ mt: 0.5 }}>
                                        <Shield sx={{ fontSize: 18, color: 'text.secondary' }} />
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                            <span style={{ fontWeight: 600 }}>{log.actor?.full_name || 'System Operator'}</span> executed
                                            <span style={{ fontWeight: 600, color: theme.palette.primary.main }}> {log.action} </span>
                                            across the platform
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                                            {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                            {(!data?.recentAudit?.length) && (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <PeopleAlt sx={{ fontSize: 32, mb: 1, color: 'text.secondary', opacity: 0.5 }} />
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Audit log is empty.</Typography>
                                </Box>
                            )}
                        </Stack>
                    </Panel>
                </Grid>
            </Grid>
            
        </Box>
    );
};

export default AdminDashboard;


