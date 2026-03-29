import { Box, Divider, Grid, Paper, Typography, useTheme } from '@mui/material';
import {
    AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, ResponsiveContainer,
    Tooltip as RechartsTooltip
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const Panel = ({ title, subtitle, children }) => {
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
            <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '1rem' }}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        {subtitle}
                    </Typography>
                )}
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
            {payload.map((point, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: point.color || point.fill || theme.palette.primary.main }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        {point.name}: {point.value?.toLocaleString()}
                    </Typography>
                </Box>
            ))}
        </Paper>
    );
};

const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value || 0);

const CoordinatorDashboardCharts = ({ stats }) => {
    const theme = useTheme();

    return (
        <Grid container spacing={3} sx={{ mb: 4, display: 'flex' }} alignItems="stretch">
            <Grid item xs={12} lg={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                <Panel title="Event Activity Trend" subtitle="Events hosted over the last 5 months">
                    <ResponsiveContainer width="100%" height={260} style={{ marginTop: 8 }}>
                        <AreaChart data={stats?.timeline || []} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="Events" stroke={theme.palette.primary.main} strokeWidth={3} fill="url(#colorEvents)" dot={{ fill: theme.palette.primary.main, r: 4 }} activeDot={{ r: 6 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </Panel>
            </Grid>
            <Grid item xs={12} sm={6} lg={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                <Panel title="Budget Tracking" subtitle="Income vs Expenses tracking">
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pt: 1 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flex: 1 }}>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={stats?.hasBudgetData ? stats.budgetPie : [{ name: 'Empty', value: 1 }]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                        dataKey="value"
                                        strokeWidth={0}
                                    >
                                        {stats?.hasBudgetData
                                            ? stats.budgetPie.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)
                                            : <Cell fill={theme.palette.action.hover} />
                                        }
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <Box sx={{ width: '100%', px: 1, pb: 1 }}>
                                {[
                                    { label: 'Income', value: formatCurrency(stats?.income), color: CHART_COLORS[0] },
                                    { label: 'Expenses', value: formatCurrency(stats?.expenses), color: CHART_COLORS[1] },
                                    { label: 'Pending', value: formatCurrency(stats?.pendingParams), color: CHART_COLORS[2] },
                                ].map((row, index) => (
                                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: row.color }} />
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{row.label}</Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>{row.value}</Typography>
                                    </Box>
                                ))}
                                <Divider sx={{ my: 1.5 }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Net Balance</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>{formatCurrency((stats?.income || 0) - (stats?.expenses || 0))}</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Panel>
            </Grid>
        </Grid>
    );
};

export default CoordinatorDashboardCharts;
