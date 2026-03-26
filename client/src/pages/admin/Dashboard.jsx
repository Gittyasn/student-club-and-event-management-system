import { Box, Typography, Grid, Button, Stack, Divider, Paper, useTheme } from '@mui/material';
import {
    Group as UsersIcon, Category as ClubIcon, Event as EventIcon,
    HourglassEmpty as PendingIcon, Shield, Insights, PeopleAlt
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import {
    AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, ResponsiveContainer,
    Tooltip as RechartsTooltip, Legend
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

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

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
                        {p.name}: {p.value?.toLocaleString()}
                    </Typography>
                </Box>
            ))}
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
                supabase.from('audit_logs').select('id, action, target_table, created_at, actor:profiles(full_name)').order('created_at', { ascending: false }).limit(6),
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

            let recentAuditFormatted = undefined;
            if (auditLogs?.data) {
                // Remove duplicates based on action and target_table roughly to get cleaner feed right now
                recentAuditFormatted = auditLogs.data;
            }

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
                recentAudit: recentAuditFormatted || [],
            };
        }
    });

    if (isLoading) return (
        <Box display="flex" alignItems="center" justifyContent="center" height="60vh" gap={2}>
            <Insights sx={{ fontSize: 32, color: 'text.secondary', animation: 'spin 2s linear infinite' }} />
            <Typography sx={{ fontWeight: 500, color: 'text.secondary' }}>Loading administrative data...</Typography>
        </Box>
    );

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
                        Executive Command Center
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                        System Administration
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                        NEXTGEN EDUTECH UNIVERSITY | {currentDate}
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

            {/* Charts Row */}
            <Grid container spacing={3} sx={{ mb: 4, display: 'flex' }} alignItems="stretch">
                <Grid item xs={12} lg={7} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Panel title="Platform Growth" subtitle="Users and Events acquired over 6 months">
                        <ResponsiveContainer width="100%" height={220} style={{ marginTop: 8 }}>
                            <AreaChart data={data?.timeline || []} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={theme.palette.success.main || '#10b981'} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={theme.palette.success.main || '#10b981'} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '0.8rem', fontWeight: 500, paddingTop: 10 }} />
                                <Area type="monotone" name="Events Published" dataKey="Events" stroke={theme.palette.primary.main} strokeWidth={2.5} fill="url(#gE)" dot={{ fill: theme.palette.primary.main, r: 4 }} activeDot={{ r: 6 }} />
                                <Area type="monotone" name="New Users" dataKey="Users" stroke={theme.palette.success.main || '#10b981'} strokeWidth={2.5} fill="url(#gU)" dot={{ fill: theme.palette.success.main || '#10b981', r: 4 }} activeDot={{ r: 6 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Panel>
                </Grid>
                <Grid item xs={12} sm={6} lg={5} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Panel title="User Demographics" subtitle="Role distribution across platform">
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pt: 1 }}>
                            {/* Full-width donut chart */}
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={data?.rolePie?.filter(d => d.value > 0) || [{ name: 'No data', value: 1 }]}
                                        cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}>
                                        {(data?.rolePie || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Legend below chart */}
                            <Box sx={{ px: 1, pt: 1 }}>
                                {[
                                    { label: 'Students', value: data?.students || 0, color: CHART_COLORS[0] },
                                    { label: 'Coordinators', value: data?.coordinators || 0, color: CHART_COLORS[1] },
                                ].map((r, i) => (
                                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: r.color }} />
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{r.label}</Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>{r.value?.toLocaleString()}</Typography>
                                    </Box>
                                ))}
                                <Divider sx={{ my: 1.5 }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Total Identities</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>{data?.totalUsers?.toLocaleString() || 0}</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Panel>
                </Grid>
            </Grid>

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
                                <Button variant="text" size="small" sx={{ fontWeight: 600 }}>Full Logs</Button>
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
                                            on {log.target_table}
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


