// eslint-disable-next-line no-unused-vars
import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Paper, Card, CardContent,
    Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead,
    // eslint-disable-next-line no-unused-vars
    TableRow, Chip, Avatar, TextField, InputAdornment, Stack, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Select,
    MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
    Assessment as AnalyticsIcon, Search as SearchIcon,
    CheckCircle, Cancel, AccessTime, AssignmentTurnedIn,
    LockOpen, Edit, BarChart as BarChartIcon, Groups
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useAttendanceAnalytics, useAdminAttendanceOverrides } from '../../hooks/useAttendance';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTip,
    ResponsiveContainer, Legend, PieChart as RePie, Pie, Cell, BarChart, Bar
} from 'recharts';
import LoadingDots from '../../components/LoadingDots';

const STATUS_MAP = {
    present: { label: 'Present', color: 'success', icon: <CheckCircle fontSize="small" /> },
    late: { label: 'Late', color: 'warning', icon: <AccessTime fontSize="small" /> },
    absent: { label: 'Absent', color: 'error', icon: <Cancel fontSize="small" /> },
    excused: { label: 'Excused', color: 'secondary', icon: <AssignmentTurnedIn fontSize="small" /> },
};

const StatCard = ({ title, value, sub, color, icon }) => (
    <Card sx={{ borderRadius: '18px', border: `1px solid ${color}25`, boxShadow: `0 4px 20px ${color}06`, height: '100%' }}>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box sx={{ p: 1.2, borderRadius: '10px', bgcolor: `${color}15`, color, display: 'flex' }}>{icon}</Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">{title}</Typography>
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ color }}>{value}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
        </CardContent>
    </Card>
);

// Admin Override Dialog
const OverrideDialog = ({ open, record, onClose, onConfirm }) => {
    const [newStatus, setNewStatus] = useState('');
    const [reason, setReason] = useState('');
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
            <DialogTitle sx={{ fontWeight: 900 }}>Override Attendance</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Changing attendance for <strong>{record?.student?.full_name}</strong>
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }} variant="filled">
                    <InputLabel>New Status</InputLabel>
                    <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                        <MenuItem value="present">Present</MenuItem>
                        <MenuItem value="late">Late</MenuItem>
                        <MenuItem value="absent">Absent</MenuItem>
                        <MenuItem value="excused">Excused</MenuItem>
                    </Select>
                </FormControl>
                <TextField fullWidth label="Reason for override" value={reason} onChange={e => setReason(e.target.value)} variant="filled" multiline rows={2} />
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={onClose} sx={{ fontWeight: 700 }}>Cancel</Button>
                <Button variant="contained" disabled={!newStatus}
                    onClick={() => { onConfirm({ newStatus, reason }); setNewStatus(''); setReason(''); }}
                    sx={{ fontWeight: 800, borderRadius: '10px' }}>
                    Apply Override
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const AttendanceOverview = () => {
    const [tab, setTab] = useState(0);
    const [search, setSearch] = useState('');
    const [overrideDialog, setOverrideDialog] = useState({ open: false, record: null });

    const { data: analytics, isLoading: loadingAnalytics } = useAttendanceAnalytics();
    const { unlockAttendance, adminOverrideAttendance } = useAdminAttendanceOverrides();

    // Recent attendance log
    const { data: recentLog = [] } = useQuery({
        queryKey: ['adminAttendanceLog'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('attendance_records')
                .select(`
                    id, status, is_late, late_minutes, method, marked_at, event_id, user_id, registration_id,
                    student:profiles!attendance_records_user_id_fkey(full_name, email, avatar_url),
                    event:events(id, title, attendance_locked, club:clubs(name))
                `)
                .order('marked_at', { ascending: false })
                .limit(500);
            if (error) throw error;
            return data;
        }
    });

    const filteredLog = useMemo(() =>
        recentLog.filter(r =>
            search === '' ||
            r.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            r.student?.email?.toLowerCase().includes(search.toLowerCase()) ||
            r.event?.title?.toLowerCase().includes(search.toLowerCase())
        ), [recentLog, search]);

    // Top events by attendance
    const topEvents = useMemo(() => {
        const map = {};
        recentLog.forEach(r => {
            if (!map[r.event_id]) map[r.event_id] = { name: r.event?.title?.slice(0, 28), total: 0, present: 0 };
            map[r.event_id].total++;
            if (['present', 'late'].includes(r.status)) map[r.event_id].present++;
        });
        return Object.values(map)
            .map(e => ({ ...e, rate: e.total > 0 ? Math.round((e.present / e.total) * 100) : 0 }))
            .sort((a, b) => b.present - a.present)
            .slice(0, 8);
    }, [recentLog]);

    if (loadingAnalytics) return <LoadingDots minHeight="50vh" label="Loading attendance overview..." />;

    const ana = analytics || {};

    return (
        <Box sx={{ pb: 8 }}>
            {/* Header */}
            <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 5, p: { xs: 3, md: 5 }, borderRadius: '28px',
                    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0533 50%, #0d1b3e 100%)', color: 'white', position: 'relative', overflow: 'hidden'
                }}>
                <Box sx={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', top: -100, right: -100, pointerEvents: 'none' }} />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="overline" sx={{ color: '#a78bfa', fontWeight: 900, letterSpacing: 3 }}>ADMIN</Typography>
                    <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1.5, mb: 1 }}>Attendance Overview</Typography>
                    <Typography sx={{ opacity: 0.65, fontWeight: 500 }}>
                        Campus-wide attendance intelligence, integrity controls, and override capabilities.
                    </Typography>
                </Box>
            </Box>

            {/* Platform Stats */}
            <Grid container spacing={2.5} sx={{ mb: 5 }}>
                {[
                    { title: 'Total Records', value: ana.total ?? 0, color: '#3b82f6', sub: 'all time records', icon: <Groups /> },
                    { title: 'Present / Late', value: ana.present ?? 0, color: '#10b981', sub: `${ana.overallRate ?? 0}% attendance rate`, icon: <CheckCircle /> },
                    { title: 'Late Arrivals', value: ana.late ?? 0, color: '#f59e0b', icon: <AccessTime /> },
                    { title: 'Absent', value: ana.absent ?? 0, color: '#ef4444', icon: <Cancel /> },
                    { title: 'Excused', value: ana.excused ?? 0, color: '#8b5cf6', icon: <AssignmentTurnedIn /> },
                    { title: 'Overall Rate', value: `${ana.overallRate ?? 0}%`, color: '#10b981', icon: <AnalyticsIcon /> },
                ].map(s => (
                    <Grid item xs={12} sm={6} md={4} lg={2} key={s.title} sx={{ display: 'flex' }}>
                        <StatCard {...s} />
                    </Grid>
                ))}
            </Grid>

            {/* Tabs */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 4, '& .MuiTab-root': { fontWeight: 800 } }}>
                <Tab label="Analytics" icon={<BarChartIcon fontSize="small" />} iconPosition="start" />
                <Tab label="Attendance Log" icon={<AssignmentTurnedIn fontSize="small" />} iconPosition="start" />
            </Tabs>

            {/* Tab 0: Analytics */}
            {tab === 0 && (
                <Grid container spacing={4}>
                    {/* Monthly Trend */}
                    <Grid item xs={12} lg={8} sx={{ display: 'flex' }}>
                        <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', width: '100%' }}>
                            <Typography variant="h6" fontWeight={900} gutterBottom>Monthly Attendance Trend</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={ana.monthlyTrend || []} margin={{ left: -10 }}>
                                    <defs>
                                        <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gAbsent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                    <ReTip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }} />
                                    <Legend iconSize={10} />
                                    <Area type="monotone" dataKey="Present" stroke="#10b981" fill="url(#gPresent)" strokeWidth={2.5} dot={false} />
                                    <Area type="monotone" dataKey="Late" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                                    <Area type="monotone" dataKey="Absent" stroke="#ef4444" fill="url(#gAbsent)" strokeWidth={2} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Pie Chart */}
                    <Grid item xs={12} lg={4} sx={{ display: 'flex' }}>
                        <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', height: '100%', width: '100%' }}>
                            <Typography variant="h6" fontWeight={900} gutterBottom>Status Distribution</Typography>
                            <ResponsiveContainer width="100%" height={260}>
                                <RePie>
                                    <Pie data={ana.pieData || []} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                                        {(ana.pieData || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                    <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
                                </RePie>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Top Events */}
                    <Grid item xs={12} sx={{ display: 'flex' }}>
                        <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', width: '100%' }}>
                            <Typography variant="h6" fontWeight={900} gutterBottom>Top Events by Attendance</Typography>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={topEvents} margin={{ left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                    <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                    <Legend iconSize={10} />
                                    <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Tab 1: Attendance Log */}
            {tab === 1 && (
                <Paper sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <TextField size="small" placeholder="Search student, event..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, sx: { borderRadius: '10px' } }}
                            sx={{ flexGrow: 1, maxWidth: 360 }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{filteredLog.length} records</Typography>
                    </Box>
                    <TableContainer sx={{ maxHeight: 600 }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', bgcolor: 'background.paper' } }}>
                                    <TableCell>Student</TableCell>
                                    <TableCell>Event</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Method</TableCell>
                                    <TableCell>Marked At</TableCell>
                                    <TableCell>Lock</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredLog.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>No records found.</TableCell></TableRow>
                                ) : filteredLog.map(r => {
                                    const cfg = STATUS_MAP[r.status] || STATUS_MAP.absent;
                                    return (
                                        <TableRow key={r.id} hover>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1.5}>
                                                    <Avatar src={r.student?.avatar_url} sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.8rem' }}>
                                                        {r.student?.full_name?.charAt(0)}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={700}>{r.student?.full_name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{r.student?.email}</Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700}>{r.event?.title}</Typography>
                                                <Typography variant="caption" color="text.secondary">{r.event?.club?.name}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    icon={cfg.icon}
                                                    label={r.is_late ? `Late +${r.late_minutes}m` : cfg.label}
                                                    size="small"
                                                    color={cfg.color}
                                                    sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={r.method || 'manual'} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.68rem', textTransform: 'capitalize' }} />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">{new Date(r.marked_at).toLocaleString()}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                {r.event?.attendance_locked ? (
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <Chip label="Locked" size="small" color="error" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                                                        <Button size="small" startIcon={<LockOpen fontSize="small" />}
                                                            onClick={() => { if (window.confirm('Unlock attendance for this event?')) unlockAttendance.mutate(r.event_id); }}
                                                            sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', p: 0.5 }}>
                                                            Unlock
                                                        </Button>
                                                    </Stack>
                                                ) : (
                                                    <Chip label="Open" size="small" color="success" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Button size="small" startIcon={<Edit fontSize="small" />}
                                                    onClick={() => setOverrideDialog({ open: true, record: r })}
                                                    sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                                                    Override
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Override Dialog */}
            <OverrideDialog
                open={overrideDialog.open}
                record={overrideDialog.record}
                onClose={() => setOverrideDialog({ open: false, record: null })}
                onConfirm={({ newStatus, reason }) => {
                    const r = overrideDialog.record;
                    adminOverrideAttendance.mutate({
                        eventId: r.event_id, userId: r.user_id,
                        registrationId: r.registration_id, newStatus, reason
                    });
                    setOverrideDialog({ open: false, record: null });
                }}
            />
        </Box>
    );
};

export default AttendanceOverview;

