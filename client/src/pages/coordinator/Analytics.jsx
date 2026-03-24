// eslint-disable-next-line no-unused-vars
import React from 'react';
import {
    Box, Typography, Grid, Paper, Card, CardContent,
    // eslint-disable-next-line no-unused-vars
    CircularProgress, Chip, LinearProgress, Divider
} from '@mui/material';
import {
    // eslint-disable-next-line no-unused-vars
    Event, People, TrendingUp, StarRate, EmojiEvents,
    TrendingDown, WorkspacePremium, FactCheck
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { useCoordinatorAnalytics } from '../../hooks/useAnalytics';
import RolePageHeader from '../../components/RolePageHeader';
import { useAuthStore } from '../../store/authStore';

// eslint-disable-next-line no-unused-vars
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

const KpiCard = ({ title, value, icon, color = '#6366f1', sub }) => (
    <Card component={motion.div} whileHover={{ y: -3 }}
        sx={{ borderRadius: '18px', border: `1px solid ${color}20`, height: '100%', boxShadow: `0 4px 16px ${color}08` }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Box sx={{ p: 1, borderRadius: '9px', bgcolor: `${color}15`, color, display: 'flex' }}>{icon}</Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" textAlign="right">{title}</Typography>
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ color }}>{value}</Typography>
            {sub && <Typography variant="caption" color="text.secondary" display="block" mt={0.3}>{sub}</Typography>}
        </CardContent>
    </Card>
);

const CoordinatorAnalytics = () => {
    // eslint-disable-next-line no-unused-vars
    const { profile } = useAuthStore();
    const { data, isLoading } = useCoordinatorAnalytics();

    if (isLoading) return <Box display="flex" justifyContent="center" p={8}><CircularProgress /></Box>;
    if (!data) return null;

    const d = data;
    const certPieData = [
        { name: 'Participation', value: d.certByType.participation, color: '#3b82f6' },
        { name: 'Winner', value: d.certByType.winner, color: '#fbbf24' },
        { name: 'Merit', value: d.certByType.merit, color: '#8b5cf6' },
    ].filter(x => x.value > 0);

    return (
        <Box sx={{ pb: 8 }}>
            <RolePageHeader
                kicker="Coordinator Suite"
                title="Analytics"
                subtitle="Track performance, engagement, and outcomes."
            />
            {/* Hero */}
            <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 5, p: { xs: 3, md: 4 }, borderRadius: '24px',
                    background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', color: 'white', position: 'relative', overflow: 'hidden'
                }}>
                <Box sx={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="overline" sx={{ color: '#60a5fa', fontWeight: 900, letterSpacing: 3 }}>COORDINATOR</Typography>
                    <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1, mb: 0.5 }}>Club Analytics</Typography>
                    <Typography sx={{ opacity: 0.65 }}>Event performance, member growth, and engagement insights for your club.</Typography>
                </Box>
            </Box>

            {/* KPIs */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {[
                    { title: 'Total Events', value: d.totalEvents, icon: <Event />, color: '#6366f1' },
                    { title: 'Total Registered', value: d.totalReg, icon: <People />, color: '#3b82f6' },
                    { title: 'Avg Reg/Event', value: d.avgReg, icon: <TrendingUp />, color: '#10b981' },
                    { title: 'Attendance Rate', value: `${d.attendancePct}%`, icon: <FactCheck />, color: '#f59e0b', sub: `${d.noShowRate}% no-show` },
                    { title: 'Members', value: d.totalMembers, icon: <People />, color: '#8b5cf6' },
                    { title: 'Avg Rating', value: d.avgRating !== 'N/A' ? `${d.avgRating}★` : 'N/A', icon: <StarRate />, color: '#fbbf24' },
                    { title: 'Certificates', value: d.totalCerts, icon: <WorkspacePremium />, color: '#ec4899' },
                    { title: 'No-show Rate', value: `${d.noShowRate}%`, icon: <TrendingDown />, color: '#ef4444' },
                ].map(s => <Grid item xs={6} md={3} key={s.title}><KpiCard {...s} /></Grid>)}
            </Grid>

            {/* Best / Worst Event highlight */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {d.bestEvent && (
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '2px solid #10b98140', background: 'linear-gradient(135deg, #10b98108, transparent)' }}>
                            <Chip label="⭐ Most Popular Event" size="small" sx={{ bgcolor: '#10b98120', color: '#10b981', fontWeight: 800, mb: 1 }} />
                            <Typography variant="h6" fontWeight={900}>{d.bestEvent.title}</Typography>
                            <Typography color="text.secondary" variant="body2">{d.bestEvent.reg} registrations</Typography>
                        </Paper>
                    </Grid>
                )}
                {d.worstEvent && d.bestEvent?.title !== d.worstEvent?.title && (
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '2px solid #ef444440', background: 'linear-gradient(135deg, #ef444408, transparent)' }}>
                            <Chip label="📉 Least Attended Event" size="small" sx={{ bgcolor: '#ef444420', color: '#ef4444', fontWeight: 800, mb: 1 }} />
                            <Typography variant="h6" fontWeight={900}>{d.worstEvent.title}</Typography>
                            <Typography color="text.secondary" variant="body2">{d.worstEvent.reg} registrations</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Event Performance */}
            <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>📊 Event Performance</Typography>
            <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', mb: 4 }}>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={d.eventPerf} margin={{ bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} angle={-18} textAnchor="end" interval={0} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Legend iconSize={10} />
                        <Bar yAxisId="left" dataKey="Registrations" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar yAxisId="left" dataKey="Attended" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar yAxisId="right" dataKey="Rating" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </Paper>

            <Grid container spacing={4}>
                {/* Member Growth */}
                <Grid item xs={12} md={7}>
                    <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>📈 Member Growth Trend</Typography>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={d.memberGrowth}>
                                <defs>
                                    <linearGradient id="gMem" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Area type="monotone" dataKey="Members" stroke="#6366f1" fill="url(#gMem)" strokeWidth={2.5} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Certificate distribution */}
                <Grid item xs={12} md={5}>
                    <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>🎓 Certificate Distribution</Typography>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                        {certPieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={certPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={4} dataKey="value">
                                        {certPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                    <Legend iconSize={10} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box py={6} textAlign="center"><Typography color="text.secondary">No certificates issued yet.</Typography></Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default CoordinatorAnalytics;
