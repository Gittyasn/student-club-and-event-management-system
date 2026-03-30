// eslint-disable-next-line no-unused-vars
import React, { useMemo } from 'react';
import {
    Box, Typography, Paper, Grid, Chip, LinearProgress,
    // eslint-disable-next-line no-unused-vars
    Stack, Card, CardContent, Divider, Alert, Table, TableBody,
    // eslint-disable-next-line no-unused-vars
    TableCell, TableContainer, TableHead, TableRow, Avatar
} from '@mui/material';
import {
    CheckCircle as PresentIcon, Cancel as AbsentIcon, AccessTime as LateIcon,
    AssignmentTurnedIn as ExcusedIcon, EmojiEvents as TrophyIcon,
    // eslint-disable-next-line no-unused-vars
    Timeline as StatsIcon, Warning as WarnIcon, TrendingUp
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    // eslint-disable-next-line no-unused-vars
    Cell, RadialBarChart, RadialBar, PieChart, Pie, Legend
} from 'recharts';
import { useMyAttendance } from '../../hooks/useAttendance';
import LoadingDots from '../../components/LoadingDots';

const STATUS_CFG = {
    present: { label: 'Present', color: '#10b981', icon: <PresentIcon fontSize="small" />, chip: 'success' },
    late: { label: 'Late', color: '#f59e0b', icon: <LateIcon fontSize="small" />, chip: 'warning' },
    absent: { label: 'Absent', color: '#ef4444', icon: <AbsentIcon fontSize="small" />, chip: 'error' },
    excused: { label: 'Excused', color: '#8b5cf6', icon: <ExcusedIcon fontSize="small" />, chip: 'secondary' },
};

const EngagementBadge = ({ rate }) => {
    const level = rate >= 90 ? { label: 'Elite', color: '#fbbf24', bg: '#fbbf2415' }
        : rate >= 75 ? { label: 'Excellent', color: '#10b981', bg: '#10b98115' }
            : rate >= 50 ? { label: 'Good', color: '#3b82f6', bg: '#3b82f615' }
                : rate >= 25 ? { label: 'Needs Improvement', color: '#f59e0b', bg: '#f59e0b15' }
                    : { label: 'Critical', color: '#ef4444', bg: '#ef444415' };

    return (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 0.5, borderRadius: '20px', bgcolor: level.bg, border: `1px solid ${level.color}30` }}>
            <TrophyIcon sx={{ fontSize: 16, color: level.color }} />
            <Typography variant="caption" fontWeight={800} sx={{ color: level.color }}>{level.label}</Typography>
        </Box>
    );
};

const AttendanceRecord = () => {
    const { data: records, isLoading } = useMyAttendance();

    const stats = useMemo(() => {
        if (!records) return {};
        const total = records.length;
        const present = records.filter(r => r.status === 'present').length;
        const late = records.filter(r => r.status === 'late').length;
        const absent = records.filter(r => r.status === 'absent').length;
        const excused = records.filter(r => r.status === 'excused').length;
        const attended = present + late;
        const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
        const lateRate = total > 0 ? Math.round((late / total) * 100) : 0;
        const noShows = absent;

        // Group by club for club-level breakdown
        const clubMap = {};
        records.forEach(r => {
            const club = r.event?.club?.name || 'Unknown';
            if (!clubMap[club]) clubMap[club] = { name: club, attended: 0, total: 0 };
            clubMap[club].total++;
            if (['present', 'late'].includes(r.status)) clubMap[club].attended++;
        });
        const byClub = Object.values(clubMap).map(c => ({
            ...c, rate: Math.round((c.attended / c.total) * 100)
        })).sort((a, b) => b.rate - a.rate);

        const pieData = [
            { name: 'Present', value: present, color: '#10b981' },
            { name: 'Late', value: late, color: '#f59e0b' },
            { name: 'Absent', value: absent, color: '#ef4444' },
            { name: 'Excused', value: excused, color: '#8b5cf6' },
        ].filter(d => d.value > 0);

        return { total, present, late, absent, excused, attended, rate, lateRate, noShows, byClub, pieData };
    }, [records]);

    if (isLoading) return <LoadingDots label="Loading attendance..." minHeight="50vh" />;

    return (
        <Box sx={{ pb: 8 }}>
            {/* Hero Header */}
            <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 5, p: 4, borderRadius: '24px',
                    background: 'linear-gradient(135deg, #0c1445 0%, #1a237e 60%, #283593 100%)',
                    color: 'white', position: 'relative', overflow: 'hidden'
                }}>
                <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 50%, rgba(99,102,241,0.2) 0%, transparent 70%)' }} />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1.5, mb: 1, color: '#93c5fd', textShadow: '0 8px 24px rgba(147,197,253,0.18)' }}>My Attendance</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.82)', fontWeight: 500, mb: 3 }}>
                        Track your participation, engagement score, and event attendance history.
                    </Typography>
                    <EngagementBadge rate={stats.rate || 0} />
                </Box>
            </Box>

            {/* No-Show Warning */}
            {stats.noShows >= 3 && (
                <Alert severity="warning" icon={<WarnIcon />} sx={{ mb: 4, borderRadius: '12px', fontWeight: 700 }}>
                    You have {stats.noShows} no-shows. High no-shows may affect future registration eligibility.
                </Alert>
            )}

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 5 }}>
                {[
                    { label: 'Overall Rate', value: `${stats.rate}%`, color: '#3b82f6' },
                    { label: 'Attended', value: stats.attended, color: '#10b981' },
                    { label: 'Late', value: stats.late, color: '#f59e0b' },
                    { label: 'Absent', value: stats.absent, color: '#ef4444' },
                    { label: 'Excused', value: stats.excused, color: '#8b5cf6' },
                    { label: 'Total Events', value: stats.total, color: '#94a3b8' },
                ].map(s => (
                    <Grid item xs={6} sm={4} md={2} key={s.label}>
                        <Paper sx={{ p: 2.5, borderRadius: '16px', textAlign: 'center', border: `1px solid ${s.color}25`, boxShadow: `0 4px 20px ${s.color}08` }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">{s.label}</Typography>
                            <Typography variant="h4" fontWeight={900} sx={{ color: s.color }}>{s.value}</Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Rate Bar */}
            <Paper sx={{ p: 3, mb: 5, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                <Box display="flex" justifyContent="space-between" mb={1.5}>
                    <Typography fontWeight={800}>Attendance Rate</Typography>
                    <Typography fontWeight={900} color={stats.rate >= 75 ? 'success.main' : stats.rate >= 50 ? 'warning.main' : 'error.main'}>
                        {stats.rate}%
                    </Typography>
                </Box>
                <LinearProgress value={stats.rate || 0} variant="determinate" sx={{
                    height: 12, borderRadius: 6, bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                        background: stats.rate >= 75 ? 'linear-gradient(90deg, #10b981, #34d399)' :
                            stats.rate >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' :
                                'linear-gradient(90deg,#ef4444,#f87171)'
                    }
                }} />
                <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">🟢 Target: 75%+</Typography>
                    <Typography variant="caption" color="text.secondary">🟡 Good: 50–74%</Typography>
                    <Typography variant="caption" color="text.secondary">🔴 Below: &lt;50%</Typography>
                </Stack>
            </Paper>

            {/* Charts Row */}
            <Grid container spacing={4} sx={{ mb: 5 }}>
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 3, borderRadius: '16px', height: 280 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary" gutterBottom>Status Breakdown</Typography>
                        <ResponsiveContainer width="100%" height="85%">
                            <PieChart>
                                <Pie data={stats.pieData || []} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                                    {(stats.pieData || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={7}>
                    <Paper sx={{ p: 3, borderRadius: '16px', height: 280 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary" gutterBottom>Attendance by Club</Typography>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={(stats.byClub || []).slice(0, 6)} layout="vertical" margin={{ left: 60 }}>
                                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                                <Tooltip formatter={v => `${v}%`} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={14}>
                                    {(stats.byClub || []).slice(0, 6).map((e, i) => (
                                        <Cell key={i} fill={e.rate >= 75 ? '#10b981' : e.rate >= 50 ? '#f59e0b' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* History Table */}
            <Paper sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <StatsIcon color="primary" />
                    <Typography variant="h6" fontWeight={800}>Attendance History</Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 500 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.73rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                                <TableCell>Event</TableCell>
                                <TableCell>Club</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Method</TableCell>
                                <TableCell>Marked At</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(!records || records.length === 0) && (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 600 }}>
                                    No attendance records yet.
                                </TableCell></TableRow>
                            )}
                            {records?.map(r => {
                                const cfg = STATUS_CFG[r.status] || STATUS_CFG.absent;
                                return (
                                    <TableRow key={r.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={700}>{r.event?.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">{r.event?.category?.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" fontWeight={600}>{r.event?.club?.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{r.event?.start_time ? new Date(r.event.start_time).toLocaleDateString() : 'N/A'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={cfg.icon}
                                                label={r.is_late ? `${cfg.label} (+${r.late_minutes}m)` : cfg.label}
                                                size="small"
                                                color={cfg.chip}
                                                sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={r.method || 'manual'} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.68rem', textTransform: 'capitalize' }} />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {r.marked_at ? new Date(r.marked_at).toLocaleDateString() : '-'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default AttendanceRecord;
