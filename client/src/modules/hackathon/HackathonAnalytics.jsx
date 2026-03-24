// eslint-disable-next-line no-unused-vars
import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent
} from '@mui/material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';
import { Users, Code2, Award, Zap } from 'lucide-react';

const COLORS = ['#6366f1', '#a855f7', '#f43f5e', '#10b981', '#f59e0b'];

const StatCard = ({ title, value, icon: Icon, color }) => (
    <Card sx={{ borderRadius: 4, height: '100%' }}>
        <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}15`, color: color }}>
                    <Icon size={24} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>{value}</Typography>
            </Box>
            <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        </CardContent>
    </Card>
);

// eslint-disable-next-line no-unused-vars
const HackathonAnalytics = ({ event, teams, submissions, rounds }) => {
    // Mock data based on provided props for demonstration
    const scoreData = [
        { range: '0-20', count: 2 },
        { range: '21-40', count: 5 },
        { range: '41-60', count: 12 },
        { range: '61-80', count: 8 },
        { range: '81-100', count: 3 },
    ];

    const teamSizeData = [
        { name: '2 Members', value: 4 },
        { name: '3 Members', value: 8 },
        { name: '4 Members', value: 15 },
        { name: '5 Members', value: 3 },
    ];

    const submissionTrend = [
        { day: 'Day 1', count: 5 },
        { day: 'Day 2', count: 12 },
        { day: 'Day 3', count: 18 },
        { day: 'Day 4', count: 25 },
        { day: 'Day 5', count: 30 },
    ];

    return (
        <Grid container spacing={4}>
            {/* Quick Stats */}
            <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Total Teams" value={teams?.length || 0} icon={Users} color="#6366f1" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Submissions" value={submissions?.length || 0} icon={Code2} color="#a855f7" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Average Score" value="74.2" icon={Award} color="#10b981" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Completion Rate" value="88%" icon={Zap} color="#f59e0b" />
            </Grid>

            {/* Charts */}
            <Grid item xs={12} md={8}>
                <Paper sx={{ p: 4, borderRadius: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 4 }}>Score Distribution</Typography>
                    <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={scoreData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="range" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
                <Paper sx={{ p: 4, borderRadius: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 4 }}>Team Sizes</Typography>
                    <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={teamSizeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {teamSizeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>

            <Grid item xs={12}>
                <Paper sx={{ p: 4, borderRadius: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 4 }}>Submission Timeline</Typography>
                    <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={submissionTrend}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="count" stroke="#a855f7" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>
        </Grid>
    );
};

export default HackathonAnalytics;
