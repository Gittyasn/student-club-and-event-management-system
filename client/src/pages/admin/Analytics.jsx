import {
    Alert,
    Box,
    Card,
    CardContent,
    Grid,
    LinearProgress,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import {
    AppRegistration,
    Assessment,
    Event,
    FactCheck,
    Groups,
    NotificationsActive,
    People,
    StarRate,
    WorkspacePremium,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useAdminAnalytics } from '../../hooks/useAnalytics';
import LoadingDots from '../../components/LoadingDots';
import RolePageHeader from '../../components/RolePageHeader';

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const InsightCard = ({ title, value, sub, icon, color = '#2563eb' }) => (
    <Card component={motion.div} whileHover={{ y: -2 }} sx={{ height: '100%', borderRadius: '18px', border: `1px solid ${color}22` }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: `${color}18`,
                        color,
                    }}
                >
                    {icon}
                </Box>
                <Typography variant="caption" color="text.secondary" fontWeight={800} textTransform="uppercase" textAlign="right">
                    {title}
                </Typography>
            </Box>
            <Box>
                <Typography variant="h4" fontWeight={900} sx={{ color }}>
                    {value}
                </Typography>
                {sub ? (
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        {sub}
                    </Typography>
                ) : null}
            </Box>
        </CardContent>
    </Card>
);

const SectionCard = ({ title, subtitle, children, height = 340 }) => (
    <Paper sx={{ p: 3, borderRadius: '20px', height }}>
        <Typography variant="h6" fontWeight={900} color="text.primary">
            {title}
        </Typography>
        {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                {subtitle}
            </Typography>
        ) : (
            <Box sx={{ mb: 2.5 }} />
        )}
        <Box sx={{ height: `calc(100% - 56px)` }}>
            {children}
        </Box>
    </Paper>
);

const AdminAnalytics = () => {
    const { data, isLoading, error } = useAdminAnalytics();

    if (isLoading) {
        return <LoadingDots minHeight="50vh" label="Loading analytics..." />;
    }

    if (!data) {
        return (
            <Box sx={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {error ? (
                    <Alert severity="error" sx={{ borderRadius: '16px' }}>
                        <Typography fontWeight={800}>Analytics could not be loaded</Typography>
                        <Typography variant="body2">{error.message}</Typography>
                    </Alert>
                ) : (
                    <Typography color="text.secondary" fontWeight={700}>
                        Analytics will appear here once platform data is available.
                    </Typography>
                )}
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 8 }}>
            <RolePageHeader
                kicker="Admin Analytics"
                title="Platform Analytics Dashboard"
                subtitle="High-priority growth, engagement, attendance, and feedback metrics arranged from most valuable to operational detail."
                accent="#2563eb"
            />

            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                {[
                    { title: 'Total Users', value: data.totalUsers.toLocaleString(), icon: <People />, color: '#2563eb' },
                    { title: 'Active Clubs', value: data.totalClubs, icon: <Groups />, color: '#10b981' },
                    { title: 'Events', value: data.totalEvents, icon: <Event />, color: '#f59e0b' },
                    { title: 'Registrations', value: data.totalRegistrations.toLocaleString(), icon: <AppRegistration />, color: '#8b5cf6' },
                    { title: 'Certificates', value: data.totalCertificates.toLocaleString(), icon: <WorkspacePremium />, color: '#ec4899' },
                    { title: 'Attendance Rate', value: `${data.attendanceRate}%`, sub: 'Present + Late', icon: <FactCheck />, color: '#10b981' },
                    { title: 'Average Feedback', value: data.avgRating !== 'N/A' ? `${data.avgRating}/5` : 'N/A', icon: <StarRate />, color: '#f59e0b' },
                    { title: 'Memberships', value: data.totalMemberships.toLocaleString(), icon: <Assessment />, color: '#06b6d4' },
                    { title: 'Notifications', value: data.totalNotifications?.toLocaleString() || 0, sub: 'Dispatched alerts', icon: <NotificationsActive />, color: '#f43f5e' },
                ].map((item) => (
                    <Grid item xs={12} sm={6} md={4} lg={4} key={item.title} sx={{ display: 'flex' }}>
                        <InsightCard {...item} />
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }} alignItems="stretch">
                <Grid item xs={12} lg={8} sx={{ display: 'flex' }}>
                    <SectionCard title="Platform Growth" subtitle="Users, memberships, and registrations over time" height={360}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.monthlyTrend} margin={{ left: -10 }}>
                                <defs>
                                    {['Events', 'Registrations', 'Members'].map((entry, index) => (
                                        <linearGradient key={entry} id={`adminGrowth${entry}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={CHART_COLORS[index]} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={CHART_COLORS[index]} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} />
                                <Area type="monotone" dataKey="Events" stroke={CHART_COLORS[0]} fill="url(#adminGrowthEvents)" strokeWidth={2.4} dot={false} />
                                <Area type="monotone" dataKey="Registrations" stroke={CHART_COLORS[1]} fill="url(#adminGrowthRegistrations)" strokeWidth={2.2} dot={false} />
                                <Area type="monotone" dataKey="Members" stroke={CHART_COLORS[2]} fill="url(#adminGrowthMembers)" strokeWidth={2} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </SectionCard>
                </Grid>
                <Grid item xs={12} lg={4} sx={{ display: 'flex' }}>
                    <SectionCard title="Feedback Rating Distribution" subtitle="Higher-value sentiment view by star count" height={360}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.ratingDist}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Bar dataKey="value" name="Feedback count" radius={[8, 8, 0, 0]} barSize={42}>
                                    {data.ratingDist.map((_, index) => (
                                        <Cell key={index} fill={['#ef4444', '#f59e0b', '#fbbf24', '#84cc16', '#10b981'][index]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </SectionCard>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }} alignItems="stretch">
                <Grid item xs={12} lg={7} sx={{ display: 'flex' }}>
                    <SectionCard title="Club Performance" subtitle="Registrations, events, and attendance by club" height={350}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.clubPerf} margin={{ bottom: 16 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} angle={-18} textAnchor="end" interval={0} height={56} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} />
                                <Bar dataKey="Events" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={18} />
                                <Bar dataKey="Registrations" fill="#10b981" radius={[6, 6, 0, 0]} barSize={18} />
                                <Bar dataKey="AttendanceRate" name="Attendance %" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </SectionCard>
                </Grid>
                <Grid item xs={12} lg={5} sx={{ display: 'flex' }}>
                    <SectionCard title="Event Category Distribution" subtitle="Approved activity split by category" height={350}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.categoryDist} cx="50%" cy="50%" innerRadius={58} outerRadius={100} paddingAngle={3} dataKey="value">
                                    {data.categoryDist.map((_, index) => (
                                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </SectionCard>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }} alignItems="stretch">
                <Grid item xs={12} lg={6} sx={{ display: 'flex' }}>
                    <SectionCard title="Attendance Trend" subtitle="Present versus absent performance over time" height={330}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.attendanceTrend}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} />
                                <Line type="monotone" dataKey="Present" stroke="#10b981" strokeWidth={2.5} dot={false} />
                                <Line type="monotone" dataKey="Absent" stroke="#ef4444" strokeWidth={2.2} dot={false} strokeDasharray="5 4" />
                            </LineChart>
                        </ResponsiveContainer>
                    </SectionCard>
                </Grid>
                <Grid item xs={12} lg={6} sx={{ display: 'flex' }}>
                    <SectionCard title="Most Active Departments" subtitle="Registration contribution ordered from highest to lowest" height={330}>
                        <Stack spacing={2.2} sx={{ height: '100%', overflowY: 'auto', pr: 0.5 }}>
                            {data.deptRanking.map((dept, index) => (
                                <Box key={dept.name}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                                        <Typography variant="body2" fontWeight={800} color="text.primary">
                                            {dept.name || 'Unknown'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={800}>
                                            {dept.count} registrations
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={data.deptRanking[0]?.count > 0 ? Math.round((dept.count / data.deptRanking[0].count) * 100) : 0}
                                        sx={{
                                            height: 9,
                                            borderRadius: '999px',
                                            bgcolor: `${CHART_COLORS[index % CHART_COLORS.length]}18`,
                                            '& .MuiLinearProgress-bar': { bgcolor: CHART_COLORS[index % CHART_COLORS.length], borderRadius: '999px' },
                                        }}
                                    />
                                </Box>
                            ))}
                        </Stack>
                    </SectionCard>
                </Grid>
            </Grid>

            <Grid container spacing={3} alignItems="stretch">
                <Grid item xs={12} md={4} sx={{ display: 'flex' }}>
                    <SectionCard title="Delivery Success" subtitle="Realtime notification delivery" height={260}>
                        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                            <Typography variant="h2" fontWeight={900} color="#10b981">
                                {data.deliverySuccess}%
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={data.deliverySuccess}
                                sx={{ height: 10, borderRadius: '999px', bgcolor: 'rgba(16,185,129,0.14)', '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: '999px' } }}
                            />
                            <Typography color="text.secondary" fontWeight={600}>
                                Delivery health across alerts and notification updates.
                            </Typography>
                        </Box>
                    </SectionCard>
                </Grid>
                <Grid item xs={12} md={4} sx={{ display: 'flex' }}>
                    <SectionCard title="Read Rate" subtitle="Platform-wide notification engagement" height={260}>
                        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                            <Typography variant="h2" fontWeight={900} color="#2563eb">
                                {data.readRate}%
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={Number(data.readRate)}
                                sx={{ height: 10, borderRadius: '999px', bgcolor: 'rgba(37,99,235,0.14)', '& .MuiLinearProgress-bar': { bgcolor: '#2563eb', borderRadius: '999px' } }}
                            />
                            <Typography color="text.secondary" fontWeight={600}>
                                Message consumption and acknowledgment rate.
                            </Typography>
                        </Box>
                    </SectionCard>
                </Grid>
                <Grid item xs={12} md={4} sx={{ display: 'flex' }}>
                    <SectionCard title="Ignored Alerts" subtitle="Messages that were not read" height={260}>
                        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                            <Typography variant="h2" fontWeight={900} color="#ef4444">
                                {100 - Number(data.readRate)}%
                            </Typography>
                            <Typography color="text.secondary" fontWeight={600}>
                                Use this signal to refine timing, targeting, and message clarity.
                            </Typography>
                        </Box>
                    </SectionCard>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AdminAnalytics;
