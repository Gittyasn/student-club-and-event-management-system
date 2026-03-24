// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';
import {
    Box, Typography, Grid, Paper, Card, CardContent,
    // eslint-disable-next-line no-unused-vars
    CircularProgress, Chip, LinearProgress, Avatar, Stack, Divider
} from '@mui/material';
import {
    People, Groups, Event, AppRegistration, WorkspacePremium,
    // eslint-disable-next-line no-unused-vars
    TrendingUp, StarRate, FactCheck, Assessment, EmojiEvents
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useAdminAnalytics } from '../../hooks/useAnalytics';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

const StatCard = ({ title, value, sub, icon, color = '#6366f1' }) => (
    <Card component={motion.div} whileHover={{ y: -2 }}
        sx={{ borderRadius: '18px', border: `1px solid ${color}20`, height: '100%', boxShadow: `0 4px 20px ${color}08` }}>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box sx={{ p: 1.2, borderRadius: '10px', bgcolor: `${color}15`, color, display: 'flex' }}>{icon}</Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">{title}</Typography>
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ color }}>{value}</Typography>
            {sub && <Typography variant="caption" color="text.secondary" mt={0.5} display="block">{sub}</Typography>}
        </CardContent>
    </Card>
);

const SectionTitle = ({ children }) => (
    <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, mt: 1 }}>
        {children}
    </Typography>
);

const AdminAnalytics = () => {
    const { data, isLoading } = useAdminAnalytics();

    if (isLoading) return <Box display="flex" justifyContent="center" p={8}><CircularProgress /></Box>;
    if (!data) return null;

    const d = data;

    return (
        <Box sx={{ pb: 8 }}>
            {/* Hero */}
            <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 5, p: { xs: 3, md: 5 }, borderRadius: '28px',
                    background: 'linear-gradient(135deg, #0c0a1e 0%, #1e1b4b 50%, #0d1b3e 100%)',
                    color: 'white', position: 'relative', overflow: 'hidden'
                }}>
                <Box sx={{ position: 'absolute', top: -100, right: -100, width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="overline" sx={{ color: '#818cf8', fontWeight: 900, letterSpacing: 3 }}>ADMIN</Typography>
                    <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1.5, mb: 1 }}>Analytics Dashboard</Typography>
                    <Typography sx={{ opacity: 0.65, fontWeight: 500 }}>
                        Executive-level platform intelligence — engagement, growth, and governance insights.
                    </Typography>
                </Box>
            </Box>

            {/* Platform KPIs */}
            <Grid container spacing={2.5} sx={{ mb: 5 }}>
                {[
                    { title: 'Total Users', value: d.totalUsers.toLocaleString(), icon: <People />, color: '#3b82f6' },
                    { title: 'Active Clubs', value: d.totalClubs, icon: <Groups />, color: '#10b981' },
                    { title: 'Events', value: d.totalEvents, icon: <Event />, color: '#f59e0b' },
                    { title: 'Registrations', value: d.totalRegistrations.toLocaleString(), icon: <AppRegistration />, color: '#8b5cf6' },
                    { title: 'Certificates', value: d.totalCertificates.toLocaleString(), icon: <WorkspacePremium />, color: '#ec4899' },
                    { title: 'Attendance Rate', value: `${d.attendanceRate}%`, icon: <FactCheck />, color: '#10b981', sub: 'Present + Late' },
                    { title: 'Avg Feedback', value: d.avgRating !== 'N/A' ? `${d.avgRating}?` : 'N/A', icon: <StarRate />, color: '#fbbf24' },
                    { title: 'Memberships', value: d.totalMemberships.toLocaleString(), icon: <EmojiEvents />, color: '#06b6d4' },
                    { title: 'Notifications', value: d.totalNotifications?.toLocaleString() || 0, icon: <Assessment />, color: '#f43f5e', sub: 'Dispatched Alerts' },
                ].map(s => <Grid item xs={6} md={3} lg={3} key={s.title}><StatCard {...s} /></Grid>)}
            </Grid>

            {/* Monthly Growth Trend */}
            <SectionTitle>?? Platform Growth Trend</SectionTitle>
            <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', mb: 5 }}>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={d.monthlyTrend} margin={{ left: -10 }}>
                        <defs>
                            {['Events', 'Registrations', 'Members'].map((k, i) => (
                                <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_COLORS[i]} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={CHART_COLORS[i]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }} />
                        <Legend iconSize={10} />
                        <Area type="monotone" dataKey="Events" stroke={CHART_COLORS[0]} fill="url(#gEvents)" strokeWidth={2.5} dot={false} />
                        <Area type="monotone" dataKey="Registrations" stroke={CHART_COLORS[1]} fill="url(#gRegistrations)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="Members" stroke={CHART_COLORS[2]} fill="url(#gMembers)" strokeWidth={2} dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </Paper>

            <Grid container spacing={4} sx={{ mb: 5 }}>
                {/* Club Performance */}
                <Grid item xs={12} lg={8}>
                    <SectionTitle>?? Club Performance Comparison</SectionTitle>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={d.clubPerf} margin={{ bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} angle={-20} textAnchor="end" interval={0} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} />
                                <Bar dataKey="Events" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="Registrations" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="AttendanceRate" name="Att.Rate%" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Event category pie */}
                <Grid item xs={12} lg={4}>
                    <SectionTitle>?? Event Category Distribution</SectionTitle>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={d.categoryDist} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={3} dataKey="value">
                                    {d.categoryDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: '0.72rem' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Notification Performance Row */}
            <SectionTitle>?? Notification Analytics & Health</SectionTitle>
            <Grid container spacing={4} sx={{ mb: 5 }}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="h6" fontWeight={700} mb={2}>Delivery Success</Typography>
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            <CircularProgress variant="determinate" value={100} size={120} thickness={4} sx={{ color: 'divider' }} />
                            <CircularProgress variant="determinate" value={d.deliverySuccess} size={120} thickness={4} sx={{ color: '#10b981', position: 'absolute', left: 0 }} />
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography variant="h5" fontWeight={900}>{d.deliverySuccess}%</Typography>
                            </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary" mt={2}>Real-time Network Delivery</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="h6" fontWeight={700} mb={2}>System Read Rate</Typography>
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            <CircularProgress variant="determinate" value={100} size={120} thickness={4} sx={{ color: 'divider' }} />
                            <CircularProgress variant="determinate" value={Number(d.readRate)} size={120} thickness={4} sx={{ color: '#6366f1', position: 'absolute', left: 0 }} />
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography variant="h5" fontWeight={900}>{d.readRate}%</Typography>
                            </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary" mt={2}>Global Push Engagement</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(244, 63, 94, 0.04)' }}>
                        <Typography variant="h6" fontWeight={700} mb={2} color="error.main">Ignored Alerts</Typography>
                        <Typography variant="h2" fontWeight={900} color="error.main">{100 - Number(d.readRate)}%</Typography>
                        <Typography variant="caption" color="error.main" mt={2}>Action recommended: Consider targeted pushes</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={4} sx={{ mb: 5 }}>
                {/* Attendance Trend */}
                <Grid item xs={12} md={6}>
                    <SectionTitle>?? Attendance Trend</SectionTitle>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={d.attendanceTrend}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} />
                                <Line type="monotone" dataKey="Present" stroke="#10b981" strokeWidth={2.5} dot={false} />
                                <Line type="monotone" dataKey="Absent" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Dept ranking + rating dist */}
                <Grid item xs={12} md={6}>
                    <SectionTitle>?? Most Active Departments</SectionTitle>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                        {d.deptRanking.map((dept, i) => (
                            <Box key={dept.name} mb={1.5}>
                                <Box display="flex" justifyContent="space-between" mb={0.4}>
                                    <Typography variant="body2" fontWeight={700}>{dept.name || 'Unknown'}</Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700}>{dept.count} reg</Typography>
                                </Box>
                                <LinearProgress variant="determinate"
                                    value={d.deptRanking[0]?.count > 0 ? Math.round((dept.count / d.deptRanking[0].count) * 100) : 0}
                                    sx={{ height: 7, borderRadius: '4px', bgcolor: `${CHART_COLORS[i % CHART_COLORS.length]}20`, '& .MuiLinearProgress-bar': { bgcolor: CHART_COLORS[i % CHART_COLORS.length] } }} />
                            </Box>
                        ))}
                    </Paper>
                </Grid>
            </Grid>

            {/* Feedback rating distribution */}
            <SectionTitle>? Feedback Rating Distribution</SectionTitle>
            <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={d.ratingDist}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 700 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]} barSize={52}>
                            {d.ratingDist.map((_, i) => (
                                <Cell key={i} fill={['#ef4444', '#f59e0b', '#fbbf24', '#84cc16', '#10b981'][i]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Paper>
        </Box>
    );
};

export default AdminAnalytics;
