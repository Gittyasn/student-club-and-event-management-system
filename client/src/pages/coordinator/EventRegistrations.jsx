// eslint-disable-next-line no-unused-vars
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Chip, CircularProgress, Button, Paper, Stack,
    // eslint-disable-next-line no-unused-vars
    Grid, Card, CardContent, Tabs, Tab, TextField, InputAdornment,
    // eslint-disable-next-line no-unused-vars
    IconButton, Tooltip, Avatar, Divider, Alert, LinearProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import {
    Download as DownloadIcon, Search as SearchIcon, People as PeopleIcon,
    QueuePlayNext as PromoteIcon, PersonRemove as RemoveIcon,
    // eslint-disable-next-line no-unused-vars
    Lock as LockIcon, TrendingUp, PersonAdd, CheckCircle,
    HourglassBottom as WaitlistIcon, Cancel as CancelledIcon
} from '@mui/icons-material';
// eslint-disable-next-line no-unused-vars
import { useQuery } from '@tanstack/react-query';
// eslint-disable-next-line no-unused-vars
import { supabase } from '../../services/supabaseClient';
import { useEventById } from '../../hooks/useEventById';
import { useAdminRegistrationOverrides, useEventRegistrationList } from '../../hooks/useMyRegistrations';
import RolePageHeader from '../../components/RolePageHeader';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

const STATUS_COLORS = {
    registered: '#10b981', waitlisted: '#f59e0b', cancelled: '#ef4444',
    confirmed: '#3b82f6', attended: '#8b5cf6', no_show: '#6b7280'
};

const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ borderRadius: '16px', border: `1px solid ${color}20`, boxShadow: `0 4px 16px ${color}10` }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3, '&:last-child': { pb: 3 } }}>
            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: `${color}15`, color, mr: 2, display: 'flex' }}>
                {icon}
            </Box>
            <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">{title}</Typography>
                <Typography variant="h4" fontWeight={900}>{value}</Typography>
            </Box>
        </CardContent>
    </Card>
);

const EventRegistrations = () => {
    const { id } = useParams();
    // eslint-disable-next-line no-unused-vars
    const navigate = useNavigate();
    // eslint-disable-next-line no-unused-vars
    const [tabValue, setTabValue] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const { data: registrations, isLoading } = useEventRegistrationList(id);
    const { data: event } = useEventById(id);
    const { removeRegistration, manualPromote, lockRegistration } = useAdminRegistrationOverrides();

    const stats = useMemo(() => {
        if (!registrations) return {};
        const registered = registrations.filter(r => ['registered', 'confirmed'].includes(r.status)).length;
        const waitlisted = registrations.filter(r => r.status === 'waitlisted').length;
        const attended = registrations.filter(r => r.status === 'attended').length;
        const cancelled = registrations.filter(r => r.status === 'cancelled').length;
        const fillRate = event?.max_participants ? Math.round((registered / event.max_participants) * 100) : 0;
        const attendanceRate = registered > 0 ? Math.round((attended / registered) * 100) : 0;
        const dropoutRate = (registered + cancelled) > 0 ? Math.round((cancelled / (registered + cancelled)) * 100) : 0;
        const pieData = [
            { name: 'Registered', value: registered, color: '#10b981' },
            { name: 'Waitlisted', value: waitlisted, color: '#f59e0b' },
            { name: 'Attended', value: attended, color: '#8b5cf6' },
            { name: 'Cancelled', value: cancelled, color: '#ef4444' },
        ].filter(d => d.value > 0);

        // Build registration trend
        const trendMap = {};
        registrations.forEach(r => {
            const day = new Date(r.registered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!trendMap[day]) trendMap[day] = { name: day, count: 0 };
            trendMap[day].count++;
        });

        return { registered, waitlisted, attended, cancelled, fillRate, attendanceRate, dropoutRate, pieData, trend: Object.values(trendMap) };
    }, [registrations, event]);

    const filteredRegistrations = useMemo(() => {
        if (!registrations) return [];
        return registrations.filter(r => {
            const matchSearch = search === '' ||
                r.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                r.student?.email?.toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === 'all' || r.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [registrations, search, statusFilter]);

    const handleExportCSV = () => {
        if (!registrations?.length) return;
        const csv = "Student Name,Email,Dept,Status,Registered At,Attended\n" +
            registrations.map(r =>
                `${r.student?.full_name},${r.student?.email},${r.student?.department || 'N/A'},${r.status},${new Date(r.registered_at).toLocaleString()},${r.attended ? 'Yes' : 'No'}`
            ).join("\n");
        const link = document.createElement("a");
        link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
        link.download = `registrations_${event?.title || 'event'}.csv`;
        link.click();
    };

    const columns = [
        {
            field: 'avatar', headerName: '', width: 56,
            renderCell: (params) => (
                <Avatar src={params.row.student?.avatar_url} sx={{ width: 32, height: 32, fontSize: '0.85rem', bgcolor: 'primary.main' }}>
                    {params.row.student?.full_name?.charAt(0)}
                </Avatar>
            )
        },
        { field: 'student_name', headerName: 'Name', flex: 1, valueGetter: (_v, row) => row.student?.full_name || 'Unknown' },
        { field: 'student_email', headerName: 'Email', flex: 1.2, valueGetter: (_v, row) => row.student?.email || '-' },
        { field: 'student_dept', headerName: 'Dept', width: 110, valueGetter: (_v, row) => row.student?.department || 'N/A' },
        {
            field: 'status', headerName: 'Status', width: 130,
            renderCell: (params) => (
                <Chip
                    label={params.value?.replace('_', ' ')}
                    size="small"
                    sx={{
                        fontWeight: 800, fontSize: '0.7rem', textTransform: 'capitalize',
                        bgcolor: `${STATUS_COLORS[params.value]}20`,
                        color: STATUS_COLORS[params.value],
                        border: `1px solid ${STATUS_COLORS[params.value]}40`
                    }}
                />
            )
        },
        {
            field: 'registered_at', headerName: 'Registered', width: 160,
            valueFormatter: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
        },
        {
            field: 'attended', headerName: 'Attended', width: 90,
            renderCell: (params) => params.value
                ? <CheckCircle sx={{ color: '#10b981', fontSize: 20 }} />
                : <CancelledIcon sx={{ color: '#ef444460', fontSize: 20 }} />
        },
        {
            field: 'waitlist_position', headerName: 'Queue#', width: 80,
            renderCell: (params) => params.value ? <Chip label={`#${params.value}`} size="small" color="warning" /> : null
        },
        {
            field: 'actions', type: 'actions', headerName: 'Actions', width: 110,
            getActions: (params) => [
                <GridActionsCellItem
                    key="promote"
                    icon={<Tooltip title="Promote from Waitlist"><PromoteIcon /></Tooltip>}
                    label="Promote"
                    onClick={() => manualPromote.mutate({ registrationId: params.id, eventId: id })}
                    disabled={params.row.status !== 'waitlisted'}
                />,
                <GridActionsCellItem
                    key="remove"
                    icon={<Tooltip title="Remove Registration"><RemoveIcon color="error" /></Tooltip>}
                    label="Remove"
                    onClick={() => {
                        if (window.confirm('Remove this registration? The seat will be released.')) {
                            removeRegistration.mutate({ registrationId: params.id, eventId: id });
                        }
                    }}
                />
            ]
        }
    ];

    if (isLoading) return <Box display="flex" justifyContent="center" p={8}><CircularProgress /></Box>;

    return (
        <Box sx={{ pb: 6 }}>
            <RolePageHeader
                kicker="Coordinator Suite"
                title="Event Registrations"
                subtitle="Manage attendee lists and approval status."
            />
            {/* Header Banner */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 4, p: { xs: 3, md: 4 }, borderRadius: '24px',
                    background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
                    color: 'white', overflow: 'hidden', position: 'relative'
                }}
            >
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5, letterSpacing: -1 }}>
                        Registrations
                    </Typography>
                    <Typography sx={{ opacity: 0.7, fontWeight: 600 }}>{event?.title}</Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap" gap={1}>
                        <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExportCSV}
                            sx={{ bgcolor: 'white', color: '#0f172a', fontWeight: 800, borderRadius: '10px', '&:hover': { bgcolor: '#f1f5f9' } }}>
                            Export CSV
                        </Button>
                        {event?.status === 'registration_open' && (
                            <Button variant="outlined" startIcon={<LockIcon />}
                                onClick={() => { if (window.confirm('Lock registrations early?')) lockRegistration.mutate(id); }}
                                sx={{ borderColor: 'rgba(255,165,0,0.4)', color: '#fbbf24', fontWeight: 700, borderRadius: '10px' }}>
                                Lock Early
                            </Button>
                        )}
                    </Stack>
                </Box>
            </Box>

            {/* Stats Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={6} md={3}>
                    <StatCard title="Registered" value={stats.registered || 0} icon={<PeopleIcon />} color="#10b981" />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard title="Waitlisted" value={stats.waitlisted || 0} icon={<WaitlistIcon />} color="#f59e0b" />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard title="Fill Rate" value={`${stats.fillRate || 0}%`} icon={<TrendingUp />} color="#3b82f6" />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard title="Dropout Rate" value={`${stats.dropoutRate || 0}%`} icon={<CancelledIcon />} color="#ef4444" />
                </Grid>
            </Grid>

            {/* Fill Rate Progress */}
            {event?.max_participants && (
                <Paper sx={{ p: 3, mb: 4, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" fontWeight={800}>Capacity Fill Rate</Typography>
                        <Typography variant="body2" fontWeight={800} color="primary.main">
                            {stats.registered}/{event.max_participants}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(100, stats.fillRate || 0)}
                        sx={{
                            height: 10, borderRadius: 5,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': {
                                background: stats.fillRate >= 90 ? 'linear-gradient(90deg, #ef4444, #f97316)' :
                                    stats.fillRate >= 70 ? 'linear-gradient(90deg, #f59e0b, #10b981)' :
                                        'linear-gradient(90deg, #3b82f6, #10b981)'
                            }
                        }}
                    />
                </Paper>
            )}

            {/* Analytics Charts */}
            <Grid container spacing={4} sx={{ mb: 4 }}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, borderRadius: '16px', height: 280 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary" gutterBottom>
                            Registration Trend
                        </Typography>
                        <ResponsiveContainer width="100%" height="85%">
                            <AreaChart data={stats.trend || []}>
                                <defs>
                                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <ReTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#regGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: '16px', height: 280, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary" gutterBottom>
                            Status Distribution
                        </Typography>
                        <Box flex={1}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.pieData || []} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                                        {(stats.pieData || []).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
                                    <ReTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Registrations Table */}
            <Paper sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', bgcolor: 'background.default', flexWrap: 'wrap' }}>
                    <TextField
                        size="small"
                        placeholder="Search students..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                            sx: { borderRadius: '10px' }
                        }}
                        sx={{ flexGrow: 1, maxWidth: 300 }}
                    />
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {['all', 'registered', 'waitlisted', 'attended', 'cancelled', 'no_show'].map(s => (
                            <Chip
                                key={s}
                                label={s === 'all' ? 'All' : s.replace('_', ' ')}
                                size="small"
                                onClick={() => setStatusFilter(s)}
                                variant={statusFilter === s ? 'filled' : 'outlined'}
                                color={statusFilter === s ? 'primary' : 'default'}
                                sx={{ fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer' }}
                            />
                        ))}
                    </Stack>
                </Box>
                <DataGrid
                    rows={filteredRegistrations}
                    columns={columns}
                    autoHeight
                    initialState={{ pagination: { paginationModel: { page: 0, pageSize: 15 } } }}
                    pageSizeOptions={[15, 30, 50]}
                    disableRowSelectionOnClick
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', fontWeight: 800 },
                        '& .MuiDataGrid-cell:focus': { outline: 'none' }
                    }}
                />
            </Paper>
        </Box>
    );
};

export default EventRegistrations;
