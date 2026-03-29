// eslint-disable-next-line no-unused-vars
import React, { useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { Box, Typography, Paper, Grid, Card, CardContent, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import LoadingDots from '../../components/LoadingDots';
import { fetchAuditLogs } from '../../services/auditLogService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { AssignmentTurnedIn, Block, TrendingUp, AccessTime } from '@mui/icons-material';

const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ bgcolor: 'background.paper', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3, '&:last-child': { pb: 3 } }}>
            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: `${color}15`, color: color, mr: 3, display: 'flex' }}>
                {icon}
            </Box>
            <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={700} gutterBottom>
                    {title}
                </Typography>
                <Typography variant="h4" fontWeight={900}>
                    {value}
                </Typography>
            </Box>
        </CardContent>
    </Card>
);

const ApprovalHistory = () => {
    // Fetch Audit Logs specifically for Event Approvals/Rejections
    const { data: logs, isLoading: logsLoading } = useQuery({
        queryKey: ['governance_logs'],
        queryFn: async () => fetchAuditLogs({ actions: ['approve_event', 'reject_event'], limit: 200 }),
    });

    // Fetch Events to correlate metrics (like SLA and rejection patterns)
    const { data: events, isLoading: eventsLoading } = useQuery({
        queryKey: ['governance_events'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select('id, title, submitted_at, approved_at, status, approval_status, club:clubs(name)')
                .in('approval_status', ['approved', 'rejected']);
            if (error) throw error;
            return data;
        }
    });

    const metrics = useMemo(() => {
        if (!logs || !events) return null;

        const approvedCount = logs.filter(l => l.action === 'approve_event').length;
        const rejectedCount = logs.filter(l => l.action === 'reject_event').length;
        const totalDecisions = approvedCount + rejectedCount;

        const approvalRate = totalDecisions ? Math.round((approvedCount / totalDecisions) * 100) : 0;
        const rejectionRate = totalDecisions ? Math.round((rejectedCount / totalDecisions) * 100) : 0;

        // Calculate Average SLA (Approval Time)
        let totalSlaMs = 0;
        let validSlaCount = 0;

        events.forEach(e => {
            if (e.submitted_at && e.approved_at) {
                const diff = new Date(e.approved_at) - new Date(e.submitted_at);
                if (diff > 0) {
                    totalSlaMs += diff;
                    validSlaCount++;
                }
            }
        });

        const avgSlaHours = validSlaCount ? (totalSlaMs / validSlaCount / (1000 * 60 * 60)).toFixed(1) : 0;

        // Group by month for chart
        const monthlyDataMap = {};
        logs.forEach(log => {
            const month = new Date(log.created_at).toLocaleString('default', { month: 'short' });
            if (!monthlyDataMap[month]) monthlyDataMap[month] = { name: month, Approved: 0, Rejected: 0 };

            if (log.action === 'approve_event') monthlyDataMap[month].Approved++;
            if (log.action === 'reject_event') monthlyDataMap[month].Rejected++;
        });

        const chartData = Object.values(monthlyDataMap);

        // Find most rejected club
        const clubRejections = {};
        events.filter(e => e.approval_status === 'rejected').forEach(e => {
            const name = e.club?.name || 'Unknown';
            clubRejections[name] = (clubRejections[name] || 0) + 1;
        });

        const mostRejectedClub = Object.keys(clubRejections).length > 0
            ? Object.keys(clubRejections).reduce((a, b) => clubRejections[a] > clubRejections[b] ? a : b)
            : 'N/A';

        return {
            totalDecisions,
            approvalRate,
            rejectionRate,
            avgSlaHours,
            chartData,
            mostRejectedClub
        };
    }, [logs, events]);

    if (logsLoading || eventsLoading) return <LoadingDots label="Loading governance history..." minHeight="30vh" />;

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp color="primary" /> Governance Metrics
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Approval Rate" value={`${metrics?.approvalRate || 0}%`} icon={<AssignmentTurnedIn fontSize="large" />} color="#10b981" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Rejection Rate" value={`${metrics?.rejectionRate || 0}%`} icon={<Block fontSize="large" />} color="#ef4444" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Avg. Approval SLA" value={`${metrics?.avgSlaHours || 0} hrs`} icon={<AccessTime fontSize="large" />} color="#f59e0b" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Most Rejections" value={metrics?.mostRejectedClub} icon={<TrendingUp fontSize="large" />} color="#6366f1" />
                </Grid>
            </Grid>

            <Grid container spacing={4}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, borderRadius: '16px', height: 350 }}>
                        <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary" align="center">
                            Decision Volume Over Time
                        </Typography>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={metrics?.chartData}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="Approved" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="Rejected" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: '16px', height: 350, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary" align="center">
                            Approval vs Rejection Ratio
                        </Typography>
                        <Box sx={{ flex: 1 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Approved', value: metrics?.approvalRate },
                                            { name: 'Rejected', value: metrics?.rejectionRate }
                                        ]}
                                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                                    >
                                        <Cell fill="#10b981" />
                                        <Cell fill="#ef4444" />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Box sx={{ mt: 5 }}>
                <Typography variant="h6" fontWeight={800} gutterBottom>
                    Immutable Audit Trail
                </Typography>
                <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 400 }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary', bgcolor: 'background.paper' } }}>
                                    <TableCell>Timestamp</TableCell>
                                    <TableCell>Action</TableCell>
                                    <TableCell>Event Target</TableCell>
                                    <TableCell>Administrator</TableCell>
                                    <TableCell>Remarks</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs?.map(log => (
                                    <TableRow key={log.id} hover>
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                            {new Date(log.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={log.action === 'approve_event' ? 'APPROVED' : 'REJECTED'}
                                                color={log.action === 'approve_event' ? 'success' : 'error'}
                                                size="small" sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>
                                            {log.action === 'approve_event' ? 'Event approved' : 'Event rejected'}
                                        </TableCell>
                                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                            {log.actor?.full_name || 'System'}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: 200 }}>
                                                {log.action === 'approve_event' ? 'Approved through governance workflow.' : 'Rejected through governance workflow.'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!logs || logs.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                            No audit traces found for event governance.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>
        </Box>
    );
};

export default ApprovalHistory;
