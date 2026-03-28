// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Paper,
    Chip, Stack, TextField, InputAdornment, Button, Avatar, Tabs, Tab,
    Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
    Dialog, DialogTitle, DialogContent, DialogActions, Alert, Autocomplete
} from '@mui/material';
import {
    // eslint-disable-next-line no-unused-vars
    TrendingUp, People as PeopleIcon, Cancel as CancelIcon,
    // eslint-disable-next-line no-unused-vars
    PersonAdd, QueuePlayNext, Lock as LockIcon, Search as SearchIcon,
    Analytics as AnalyticsIcon, EventNote
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useAdminRegistrationOverrides, useRegistrationAnalytics } from '../../hooks/useMyRegistrations';
import {
    // eslint-disable-next-line no-unused-vars
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    // eslint-disable-next-line no-unused-vars
    AreaChart, Area, PieChart, Pie, Legend
} from 'recharts';
import LoadingDots from '../../components/LoadingDots';

const StatCard = ({ title, value, subtitle, icon, color }) => (
    <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: `0 4px 20px ${color}10`, height: '100%' }}>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="h3" fontWeight={900} sx={{ color, lineHeight: 1 }}>
                        {value}
                    </Typography>
                    {subtitle && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{subtitle}</Typography>}
                </Box>
                <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: `${color}15`, color }}>
                    {icon}
                </Box>
            </Box>
        </CardContent>
    </Card>
);

const ForceRegisterDialog = ({ open, onClose, eventsList }) => {
    const { forceRegister } = useAdminRegistrationOverrides();
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [studentEmail, setStudentEmail] = useState('');
    const [note, setNote] = useState('');

    const handleSubmit = async () => {
        if (!selectedEvent || !studentEmail) return;
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', studentEmail)
            .single();
        if (!profile) return alert('Student not found with that email.');
        forceRegister.mutate({ eventId: selectedEvent.id, studentId: profile.id, note });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
            <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>Force Register Student</DialogTitle>
            <DialogContent>
                <Alert severity="warning" sx={{ mb: 3, borderRadius: '10px' }}>
                    This action bypasses standard eligibility and capacity checks. All actions are audit-logged.
                </Alert>
                <Stack spacing={3}>
                    <Autocomplete
                        options={eventsList || []}
                        getOptionLabel={(o) => o.title}
                        value={selectedEvent}
                        onChange={(_, v) => setSelectedEvent(v)}
                        renderInput={(params) => <TextField {...params} label="Select Event" variant="filled" />}
                    />
                    <TextField
                        fullWidth
                        label="Student Email"
                        variant="filled"
                        value={studentEmail}
                        onChange={e => setStudentEmail(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        label="Admin Note (optional)"
                        variant="filled"
                        multiline
                        rows={2}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
                <Button onClick={onClose} sx={{ fontWeight: 700 }}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!selectedEvent || !studentEmail} sx={{ fontWeight: 800, borderRadius: '10px' }}>
                    Force Register
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const RegistrationOverview = () => {
    const [tab, setTab] = useState(0);
    const [search, setSearch] = useState('');
    const [forceDialogOpen, setForceDialogOpen] = useState(false);

    const { data: analytics, isLoading: loadingAnalytics } = useRegistrationAnalytics();

    // Fetch platform-wide recent registrations
    const { data: recentRegs, isLoading: loadingRegs } = useQuery({
        queryKey: ['adminAllRegistrations'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('registrations')
                .select(`
                    id, status, registered_at,
                    student:profiles(full_name, email, avatar_url),
                    event:events(id, title, start_time, clubs:clubs(name))
                `)
                .order('registered_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            return data;
        }
    });

    // Platform stats
    const { data: platformStats } = useQuery({
        queryKey: ['adminRegStats'],
        queryFn: async () => {
            const { data } = await supabase
                .from('registrations')
                .select('status');
            if (!data) return {};
            const total = data.length;
            const registered = data.filter(r => ['registered', 'confirmed'].includes(r.status)).length;
            const waitlisted = data.filter(r => r.status === 'waitlisted').length;
            const cancelled = data.filter(r => r.status === 'cancelled').length;
            const attended = data.filter(r => r.status === 'attended').length;
            return { total, registered, waitlisted, cancelled, attended };
        }
    });

    // Fetch events for force-register dialog
    const { data: eventsList } = useQuery({
        queryKey: ['eventsForAdmin'],
        queryFn: async () => {
            const { data } = await supabase
                .from('events')
                .select('id, title')
                .in('status', ['registration_open', 'approved'])
                .order('start_time');
            return data;
        }
    });

    const filteredRegs = recentRegs?.filter(r =>
        search === '' ||
        r.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.event?.title?.toLowerCase().includes(search.toLowerCase())
    );

    const STATUS_CHIP_COLORS = {
        registered: 'success', waitlisted: 'warning', cancelled: 'error',
        confirmed: 'primary', attended: 'secondary', no_show: 'default'
    };

    return (
        <Box sx={{ pb: 8 }}>
            {/* Header */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 5, p: 4, borderRadius: '24px',
                    background: 'linear-gradient(135deg, #0c1445 0%, #1a237e 60%, #283593 100%)',
                    color: 'white', position: 'relative', overflow: 'hidden'
                }}
            >
                <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 50%, rgba(99,102,241,0.2) 0%, transparent 70%)' }} />
                <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 3 }}>
                    <Box>
                        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1.5, mb: 1 }}>
                            Registration Control Center
                        </Typography>
                        <Typography sx={{ opacity: 0.75, fontWeight: 500 }}>
                            Platform-wide enrollment oversight, analytics, and admin overrides.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<PersonAdd />}
                        onClick={() => setForceDialogOpen(true)}
                        sx={{ bgcolor: 'white', color: '#1a237e', fontWeight: 800, borderRadius: '12px', '&:hover': { bgcolor: '#f1f5f9' } }}
                    >
                        Force Register
                    </Button>
                </Box>
            </Box>

            {/* Stats */}
            <Grid container spacing={3} sx={{ mb: 5 }}>
                <Grid item xs={12} sm={6} md={4} lg sx={{ display: 'flex' }}>
                    <StatCard title="Total Registrations" value={platformStats?.total || 0} icon={<PeopleIcon fontSize="large" />} color="#3b82f6" />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg sx={{ display: 'flex' }}>
                    <StatCard title="Active" value={platformStats?.registered || 0} icon={<EventNote fontSize="large" />} color="#10b981" />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg sx={{ display: 'flex' }}>
                    <StatCard title="Waitlisted" value={platformStats?.waitlisted || 0} icon={<QueuePlayNext fontSize="large" />} color="#f59e0b" />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg sx={{ display: 'flex' }}>
                    <StatCard title="Cancelled" value={platformStats?.cancelled || 0} icon={<CancelIcon fontSize="large" />} color="#ef4444" />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg sx={{ display: 'flex' }}>
                    <StatCard title="Attended" value={platformStats?.attended || 0} icon={<AnalyticsIcon fontSize="large" />} color="#8b5cf6" subtitle={`${platformStats?.registered > 0 ? Math.round((platformStats.attended / platformStats.registered) * 100) : 0}% rate`} />
                </Grid>
            </Grid>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 4, '& .MuiTab-root': { fontWeight: 800 } }}>
                <Tab label="Analytics" />
                <Tab label="Registration Log" />
            </Tabs>

            {tab === 0 && loadingAnalytics && (
                <LoadingDots minHeight="320px" label="Loading registration analytics..." />
            )}

            {tab === 0 && !loadingAnalytics && (
                <Grid container spacing={4}>
                    <Grid item xs={12} md={8} sx={{ display: 'flex' }}>
                        <Paper sx={{ p: 3, borderRadius: '16px', height: 320, width: '100%' }}>
                            <Typography variant="subtitle1" fontWeight={800} gutterBottom>Monthly Registration Trend</Typography>
                            <ResponsiveContainer width="100%" height="85%">
                                <AreaChart data={analytics?.monthlyTrend || []}>
                                    <defs>
                                        <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                    <Area type="monotone" dataKey="Registered" stroke="#3b82f6" fill="url(#grad1)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="Cancelled" stroke="#ef4444" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={4} sx={{ display: 'flex' }}>
                        <Paper sx={{ p: 3, borderRadius: '16px', width: '100%', minHeight: 320 }}>
                            <Typography variant="subtitle1" fontWeight={800} gutterBottom>Top 5 Events</Typography>
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                {(analytics?.topEvents || []).slice(0, 5).map((e, i) => (
                                    <Box key={i} display="flex" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="body2" fontWeight={700} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{e.event?.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">{e.event?.club?.name}</Typography>
                                        </Box>
                                        <Chip label={`${e.count} regs`} size="small" color="primary" sx={{ fontWeight: 800 }} />
                                    </Box>
                                ))}
                                {!(analytics?.topEvents?.length) && <Typography color="text.secondary">No data yet.</Typography>}
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {tab === 1 && (
                <Paper sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                        <TextField
                            size="small"
                            placeholder="Search student or event..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                                sx: { borderRadius: '10px' }
                            }}
                            sx={{ width: 300 }}
                        />
                    </Box>
                    <TableContainer sx={{ maxHeight: 600 }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                                    <TableCell>Student</TableCell>
                                    <TableCell>Event</TableCell>
                                    <TableCell>Club</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Registered</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loadingRegs ? (
                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><LoadingDots minHeight="140px" label="Loading registrations..." /></TableCell></TableRow>
                                ) : filteredRegs?.map(reg => (
                                    <TableRow key={reg.id} hover>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar src={reg.student?.avatar_url} sx={{ width: 30, height: 30, fontSize: '0.8rem' }}>
                                                    {reg.student?.full_name?.charAt(0)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={700}>{reg.student?.full_name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{reg.student?.email}</Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell><Typography variant="body2" fontWeight={600}>{reg.event?.title}</Typography></TableCell>
                                        <TableCell><Typography variant="caption" color="text.secondary">{reg.event?.clubs?.name}</Typography></TableCell>
                                        <TableCell>
                                            <Chip
                                                label={reg.status?.replace('_', ' ')}
                                                size="small"
                                                color={STATUS_CHIP_COLORS[reg.status] || 'default'}
                                                sx={{ fontWeight: 800, textTransform: 'capitalize' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption">{new Date(reg.registered_at).toLocaleDateString()}</Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!filteredRegs?.length && !loadingRegs && (
                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>No registrations found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            <ForceRegisterDialog
                open={forceDialogOpen}
                onClose={() => setForceDialogOpen(false)}
                eventsList={eventsList || []}
            />
        </Box>
    );
};

export default RegistrationOverview;
