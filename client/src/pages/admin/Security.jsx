// eslint-disable-next-line no-unused-vars
import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import {
    Box, Typography, Paper, Grid, Chip, CircularProgress,
    Stack, Alert, TextField, FormControl, InputLabel,
    Select, MenuItem, InputAdornment, Avatar, Button,
    Dialog, DialogTitle, DialogContent, DialogActions,
    // eslint-disable-next-line no-unused-vars
    List, ListItem, ListItemText, ListItemIcon,
    // eslint-disable-next-line no-unused-vars
    Divider, Tooltip, IconButton, LinearProgress,
    useTheme
} from '@mui/material';
import {
    Shield as ShieldIcon, Search as SearchIcon,
    Block as BlockIcon, Warning as WarningIcon,
    CheckCircle, Error as ErrorIcon, Info as InfoIcon,
    // eslint-disable-next-line no-unused-vars
    Person as PersonIcon, AdminPanelSettings,
    // eslint-disable-next-line no-unused-vars
    VerifiedUser, Lock, LockOpen, Gavel, BugReport,
    // eslint-disable-next-line no-unused-vars
    Speed, SecurityUpdate, NotificationsActive,
    // eslint-disable-next-line no-unused-vars
    TrendingDown, Fingerprint
} from '@mui/icons-material';
// eslint-disable-next-line no-unused-vars
import { useQuery, useQueryClient } from '@tanstack/react-query';
// eslint-disable-next-line no-unused-vars
import { supabase } from '../../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer,
    // eslint-disable-next-line no-unused-vars
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import {
    useSecurityKPIs, useAuditLogs, useLoginLogs,
    // eslint-disable-next-line no-unused-vars
    useSecurityEvents, useBlockUser, useActiveIncidents,
    useResolveSecurityEvent, useRateLimitStatus
} from '../../hooks/useSecurityAudit';
// eslint-disable-next-line no-unused-vars
import { toast } from 'sonner';

// -- Native relative time helper (no external dep) ---------------------------
// eslint-disable-next-line no-unused-vars
const fromNow = (dateStr) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.round(diffH / 24);
    return `${diffD}d ago`;
};

// eslint-disable-next-line no-unused-vars
const fmtHour = (dateStr) => new Date(dateStr).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

// -- Theme constants ---------------------------------------------------------
const SEVERITY_CONFIG = {
    critical: { color: '#ef4444', bg: '#ef444415', icon: <ErrorIcon /> },
    high: { color: '#f59e0b', bg: '#f59e0b15', icon: <WarningIcon /> },
    medium: { color: '#3b82f6', bg: '#3b82f615', icon: <InfoIcon /> },
    low: { color: '#10b981', bg: '#10b98115', icon: <CheckCircle /> },
};

const ACTION_COLORS = {
    success: '#10b981', failed: '#ef4444', blocked: '#f59e0b', suspicious: '#a855f7'
};

// -- KPI Card ----------------------------------------------------------------
const KPICard = ({ title, value, icon, color, subtitle, loading, delay = 0 }) => {
    const theme = useTheme();
    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            sx={{
                p: 3, borderRadius: '20px', position: 'relative', overflow: 'hidden',
                background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)'
                    : '#fff',
                border: `2px solid ${color}22`,
                boxShadow: `0 4px 24px -8px ${color}20`,
                '&::before': {
                    content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                    background: `linear-gradient(90deg, ${color}, ${color}60, transparent)`,
                    borderRadius: '20px 20px 0 0'
                }
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: `${color}18`, color, display: 'flex' }}>
                    {icon}
                </Box>
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ color, letterSpacing: -1.5, lineHeight: 1, mb: 0.5 }}>
                {loading ? '—' : value ?? 0}
            </Typography>
            <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', fontSize: '0.7rem' }}>
                {title}
            </Typography>
            {subtitle && (
                <Typography variant="caption" display="block" sx={{ color: 'text.disabled', fontSize: '0.68rem', mt: 0.3 }}>
                    {subtitle}
                </Typography>
            )}
        </Box>
    );
};

// -- Security Event Row -------------------------------------------------------
const SecurityEventRow = ({ event, onResolve }) => {
    const cfg = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.medium;
    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            sx={{
                display: 'flex', alignItems: 'center', gap: 2, p: 2,
                borderRadius: '12px', mb: 1,
                border: `1px solid ${cfg.color}30`,
                bgcolor: cfg.bg,
            }}
        >
            <Box sx={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} sx={{ color: cfg.color }}>
                    {event.event_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {event.description || 'No description'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                    {event.actor?.full_name || 'System'} · {dayjs(event.created_at).fromNow()}
                </Typography>
            </Box>
            <Chip label={event.severity} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '0.68rem', border: `1px solid ${cfg.color}40`, textTransform: 'capitalize', flexShrink: 0 }} />
            {onResolve && (
                <Tooltip title="Mark as Resolved">
                    <IconButton size="small" onClick={() => onResolve(event.id)} sx={{ color: '#10b981' }}>
                        <CheckCircle fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    );
};

// -- Main Component -----------------------------------------------------------
const AdminSecurity = () => {
    const theme = useTheme();
    // eslint-disable-next-line no-unused-vars
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [blockDialog, setBlockDialog] = useState({ open: false, userId: '', reason: '' });
    const [activeTab, setActiveTab] = useState('incidents');

    // Data hooks
    const { data: kpis, isLoading: kpiLoading } = useSecurityKPIs();
    const { data: logs, isLoading: logsLoading } = useAuditLogs(200);
    const { data: loginLogs, isLoading: loginLoading } = useLoginLogs(100);
    const { data: securityEvents, isLoading: eventsLoading } = useSecurityEvents(false);
    const { data: rateLimitData } = useRateLimitStatus();
    const { mutate: blockUser, isPending: blocking } = useBlockUser();
    const { mutate: resolveEvent } = useResolveSecurityEvent();

    // Filter audit logs
    const filteredLogs = useMemo(() => {
        return (logs || []).filter(l => {
            const matchSearch = !search ||
                l.action?.toLowerCase().includes(search.toLowerCase()) ||
                l.actor?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                l.target_table?.toLowerCase().includes(search.toLowerCase());
            const matchAction = !filterAction || l.action?.toLowerCase().includes(filterAction.toLowerCase());
            return matchSearch && matchAction;
        });
    }, [logs, search, filterAction]);

    // Login trend chart data (last 24 hours by hour)
    const loginTrendData = useMemo(() => {
        if (!loginLogs) return [];
        const hours = {};
        for (let i = 23; i >= 0; i--) {
            const hour = dayjs().subtract(i, 'hour').format('HH:00');
            hours[hour] = { hour, success: 0, failed: 0, blocked: 0 };
        }
        loginLogs.forEach(log => {
            const hour = dayjs(log.created_at).format('HH:00');
            if (hours[hour]) {
                if (log.status === 'success') hours[hour].success++;
                else if (log.status === 'failed') hours[hour].failed++;
                else if (log.status === 'blocked') hours[hour].blocked++;
            }
        });
        return Object.values(hours);
    }, [loginLogs]);

    // Audit action distribution
    const auditDistribution = useMemo(() => {
        const counts = {};
        (logs || []).forEach(l => {
            counts[l.action] = (counts[l.action] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [logs]);

    const BAR_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

    const handleBlockUser = () => {
        if (!blockDialog.userId) return;
        blockUser({ userId: blockDialog.userId, reason: blockDialog.reason });
        setBlockDialog({ open: false, userId: '', reason: '' });
    };

    const TAB_CONFIG = [
        { key: 'incidents', label: 'Active Incidents', icon: <WarningIcon sx={{ fontSize: 16 }} />, color: '#ef4444' },
        { key: 'logins', label: 'Login Activity', icon: <Fingerprint sx={{ fontSize: 16 }} />, color: '#3b82f6' },
        { key: 'audit', label: 'Audit Logs', icon: <Gavel sx={{ fontSize: 16 }} />, color: '#a855f7' },
        { key: 'ratelimit', label: 'Rate Limits', icon: <Speed sx={{ fontSize: 16 }} />, color: '#f59e0b' },
    ];

    return (
        <Box sx={{ pb: 8 }}>
            {/* Header */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                sx={{
                    mb: 5, p: { xs: 3, md: 4.5 }, borderRadius: '24px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1040 50%, #0d1f3c 100%)',
                    position: 'relative', overflow: 'hidden',
                    boxShadow: '0 24px 64px -12px rgba(239,68,68,0.2)'
                }}
            >
                {/* Background blobs */}
                {['#ef4444', '#f59e0b', '#3b82f6'].map((c, i) => (
                    <Box key={i} component={motion.div}
                        animate={{ scale: [1, 1.15, 1], x: [0, 8, 0], y: [0, -8, 0] }}
                        transition={{ repeat: Infinity, duration: 6 + i * 2, ease: 'easeInOut', delay: i }}
                        sx={{
                            position: 'absolute', borderRadius: '50%',
                            width: 200 + i * 60, height: 200 + i * 60,
                            background: `radial-gradient(circle, ${c}30, transparent 70%)`,
                            top: i === 0 ? '-80px' : 'auto', bottom: i === 2 ? '-60px' : 'auto',
                            right: i === 0 ? '-80px' : 'auto', left: i === 1 ? '35%' : i === 2 ? '-60px' : 'auto',
                            filter: 'blur(30px)', zIndex: 0
                        }}
                    />
                ))}
                <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Box sx={{ p: 1.5, borderRadius: '14px', bgcolor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                <ShieldIcon sx={{ color: '#ef4444', fontSize: 28 }} />
                            </Box>
                            <Box>
                                <Typography variant="h4" fontWeight={900} sx={{ color: 'white', letterSpacing: -1, lineHeight: 1 }}>
                                    Security Intelligence
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                                    Defense Command Center — Module 18
                                </Typography>
                            </Box>
                        </Box>
                        <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', fontWeight: 500, maxWidth: 480 }}>
                            Real-time threat monitoring, access control, and immutable audit trails across the entire platform.
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1.5}>
                        <Button
                            variant="contained"
                            startIcon={<BlockIcon />}
                            onClick={() => setBlockDialog({ open: true, userId: '', reason: '' })}
                            sx={{
                                fontWeight: 800, borderRadius: '12px', textTransform: 'none',
                                bgcolor: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                border: '1px solid rgba(239,68,68,0.3)',
                                '&:hover': { bgcolor: 'rgba(239,68,68,0.25)' }
                            }}
                        >
                            Block User
                        </Button>
                    </Stack>
                </Box>
            </Box>

            {/* KPI Row */}
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                {[
                    { title: 'Failed Logins (24h)', value: kpis?.failed_logins_24h, icon: <ErrorIcon />, color: '#ef4444', subtitle: 'Authentication failures', delay: 0.1 },
                    { title: 'Blocked Users', value: kpis?.blocked_users, icon: <BlockIcon />, color: '#f59e0b', subtitle: 'Currently restricted accounts', delay: 0.18 },
                    { title: 'Active Incidents', value: kpis?.active_incidents, icon: <WarningIcon />, color: '#a855f7', subtitle: `${kpis?.critical_incidents || 0} critical`, delay: 0.26 },
                    { title: 'Cert Revocations', value: kpis?.revoked_certificates, icon: <SecurityUpdate />, color: '#06b6d4', subtitle: 'Certificates revoked', delay: 0.34 },
                    { title: 'Audit Actions (24h)', value: kpis?.audit_actions_24h, icon: <Gavel />, color: '#10b981', subtitle: 'Logged operations', delay: 0.42 },
                ].map(kpi => (
                    <Grid item xs={12} sm={6} md={4} lg={2.4} key={kpi.title}>
                        <KPICard {...kpi} loading={kpiLoading} />
                    </Grid>
                ))}
            </Grid>

            {/* Login Trend Chart */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 3.5, borderRadius: '20px', border: `2px solid #3b82f620`, height: '100%' }}>
                        <Typography variant="h6" fontWeight={900} mb={0.5}>Login Activity (24h)</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={2}>
                            Authentication attempts over the last 24 hours
                        </Typography>
                        {loginLoading ? <CircularProgress size={24} /> : (
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={loginTrendData}>
                                    <defs>
                                        <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <RechartsTooltip />
                                    <Area type="monotone" dataKey="success" name="Successful" stroke="#10b981" fill="url(#successGrad)" strokeWidth={2.5} />
                                    <Area type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" fill="url(#failedGrad)" strokeWidth={2.5} />
                                    <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4 4" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                        <Stack direction="row" spacing={2} justifyContent="center" mt={1}>
                            {[['#10b981', 'Successful'], ['#ef4444', 'Failed'], ['#f59e0b', 'Blocked']].map(([c, l]) => (
                                <Box key={l} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c }} />
                                    <Typography variant="caption" fontWeight={700} sx={{ color: c, fontSize: '0.68rem' }}>{l}</Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 3.5, borderRadius: '20px', border: `2px solid #a855f720`, height: '100%' }}>
                        <Typography variant="h6" fontWeight={900} mb={0.5}>Audit Action Types</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={2}>
                            Distribution of logged operations
                        </Typography>
                        {logsLoading ? <CircularProgress size={24} /> : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={auditDistribution} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} tickLine={false} />
                                    <RechartsTooltip />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                                        {auditDistribution.map((_, i) => (
                                            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* Tab Navigation */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
                {TAB_CONFIG.map(tab => (
                    <Button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        startIcon={tab.icon}
                        variant={activeTab === tab.key ? 'contained' : 'outlined'}
                        sx={{
                            fontWeight: 800, borderRadius: '12px', textTransform: 'none', fontSize: '0.8rem',
                            ...(activeTab === tab.key
                                ? { bgcolor: tab.color, color: 'white', border: 'none', '&:hover': { bgcolor: tab.color, opacity: 0.9 } }
                                : { color: tab.color, borderColor: `${tab.color}40`, '&:hover': { bgcolor: `${tab.color}10`, borderColor: tab.color } })
                        }}
                    >
                        {tab.label}
                    </Button>
                ))}
            </Box>

            {/* Tab Panels */}
            <AnimatePresence mode="wait">
                {/* INCIDENTS TAB */}
                {activeTab === 'incidents' && (
                    <Box key="incidents" component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <Paper elevation={0} sx={{ p: 3.5, borderRadius: '20px', border: `2px solid #ef444420` }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={900}>Active Security Incidents</Typography>
                                    <Typography variant="body2">Security insights are updated in real-time. No issues detected in this account&apos;s recent activity.</Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Unresolved platform-wide security events</Typography>
                                </Box>
                                <Chip label={`${securityEvents?.length || 0} unresolved`} size="small" color="error" sx={{ fontWeight: 700 }} />
                            </Box>
                            {eventsLoading ? <CircularProgress size={24} /> : (
                                (!securityEvents || securityEvents.length === 0) ? (
                                    <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: '12px' }}>
                                        <Typography fontWeight={700}>No active incidents</Typography>
                                        All security events have been resolved.
                                    </Alert>
                                ) : (
                                    securityEvents?.map(event => (
                                        <SecurityEventRow key={event.id} event={event} onResolve={resolveEvent} />
                                    ))
                                )
                            )}
                        </Paper>
                    </Box>
                )}

                {/* LOGIN ACTIVITY TAB */}
                {activeTab === 'logins' && (
                    <Box key="logins" component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <Paper elevation={0} sx={{ p: 3.5, borderRadius: '20px', border: `2px solid #3b82f620` }}>
                            <Typography variant="h6" fontWeight={900} mb={0.5}>Login Attempt Log</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={2.5}>Last 100 authentication events</Typography>
                            {loginLoading ? <CircularProgress size={24} /> : (
                                <Stack spacing={1}>
                                    {(loginLogs || []).map(log => (
                                        <Box key={log.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: '10px', '&:hover': { bgcolor: 'action.hover' } }}>
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ACTION_COLORS[log.status] || '#6b7280', flexShrink: 0 }} />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={700} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {log.email}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {log.ip_address || 'Unknown IP'} · {log.failure_reason || ''}
                                                </Typography>
                                            </Box>
                                            <Chip label={log.status} size="small" sx={{ fontWeight: 700, bgcolor: `${ACTION_COLORS[log.status]}15`, color: ACTION_COLORS[log.status], fontSize: '0.68rem', textTransform: 'capitalize' }} />
                                            <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, fontSize: '0.66rem' }}>
                                                {dayjs(log.created_at).fromNow()}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Paper>
                    </Box>
                )}

                {/* AUDIT LOG TAB */}
                {activeTab === 'audit' && (
                    <Box key="audit" component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <Paper elevation={0} sx={{ p: 3.5, borderRadius: '20px', border: `2px solid #a855f720` }}>
                            <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={900}>Immutable Audit Log</Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Tamper-proof record of every platform action</Typography>
                                </Box>
                                <Stack direction="row" spacing={1.5}>
                                    <TextField
                                        size="small"
                                        placeholder="Search actions..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                                        sx={{ width: 220 }}
                                    />
                                    <FormControl size="small" sx={{ minWidth: 140 }}>
                                        <InputLabel>Action Filter</InputLabel>
                                        <Select value={filterAction} label="Action Filter" onChange={e => setFilterAction(e.target.value)}>
                                            <MenuItem value="">All Actions</MenuItem>
                                            {['create', 'update', 'delete', 'approve', 'reject', 'block', 'login', 'logout', 'profile_update'].map(a => (
                                                <MenuItem key={a} value={a} sx={{ textTransform: 'capitalize' }}>{a.replace(/_/g, ' ')}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Stack>
                            </Box>
                            {logsLoading ? <CircularProgress size={24} /> : (
                                <Stack spacing={0.5}>
                                    {filteredLogs.slice(0, 100).map((log) => (
                                        <Box key={log.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: '10px', '&:hover': { bgcolor: 'action.hover' } }}>
                                            <Avatar sx={{ width: 28, height: 28, bgcolor: '#a855f715', color: '#a855f7', fontSize: '0.7rem', fontWeight: 900 }}>
                                                {log.actor?.full_name?.charAt(0) || '?'}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={700} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {log.actor?.full_name || 'System'} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>· {log.action}</Box>
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {log.target_table}{log.target_table && ' ·'} {log.module}
                                                </Typography>
                                            </Box>
                                            <Chip label={log.action} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'capitalize' }} />
                                            <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, fontSize: '0.65rem' }}>
                                                {dayjs(log.created_at).fromNow()}
                                            </Typography>
                                        </Box>
                                    ))}
                                    <Typography variant="caption" color="text.disabled" textAlign="center" display="block" mt={1}>
                                        Showing {Math.min(filteredLogs.length, 100)} of {filteredLogs.length} entries
                                    </Typography>
                                </Stack>
                            )}
                        </Paper>
                    </Box>
                )}

                {/* RATE LIMIT TAB */}
                {activeTab === 'ratelimit' && (
                    <Box key="ratelimit" component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <Paper elevation={0} sx={{ p: 3.5, borderRadius: '20px', border: `2px solid #f59e0b20` }}>
                            <Typography variant="h6" fontWeight={900} mb={0.5}>Rate Limit Monitor</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={2.5}>Per-action request counters across the platform</Typography>
                            <Alert severity="info" sx={{ mb: 2.5, borderRadius: '12px' }}>
                                Rate limits reset hourly per user. Actions exceeding their threshold are automatically logged as security events.
                            </Alert>
                            {(rateLimitData || []).length === 0 ? (
                                <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: '12px' }}>
                                    <Typography fontWeight={700}>No rate limit violations detected</Typography>
                                    All user actions are within normal thresholds.
                                </Alert>
                            ) : (
                                <Stack spacing={1.5}>
                                    {(rateLimitData || []).map(item => (
                                        <Box key={item.action} sx={{ p: 2, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                                                    {item.action.replace(/_/g, ' ')}
                                                </Typography>
                                                <Typography variant="body2" fontWeight={900} sx={{ color: item.total > 50 ? '#ef4444' : '#3b82f6' }}>
                                                    {item.total} hits · {item.users} user{item.users !== 1 ? 's' : ''}
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min((item.total / 100) * 100, 100)}
                                                sx={{
                                                    height: 6, borderRadius: 3,
                                                    '& .MuiLinearProgress-bar': {
                                                        bgcolor: item.total > 50 ? '#ef4444' : '#3b82f6',
                                                        borderRadius: 3
                                                    }
                                                }}
                                            />
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Paper>
                    </Box>
                )}
            </AnimatePresence>

            {/* Block User Dialog */}
            <Dialog open={blockDialog.open} onClose={() => setBlockDialog({ open: false, userId: '', reason: '' })} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
                <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <BlockIcon color="error" />
                        Block User Account
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2, borderRadius: '12px' }}>
                        This action will immediately restrict the user&apos;s access. All their active sessions will be invalidated.
                    </Alert>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth label="User ID (UUID)"
                            value={blockDialog.userId}
                            onChange={e => setBlockDialog(d => ({ ...d, userId: e.target.value }))}
                            placeholder="e.g. 550e8400-e29b-41d4-a716-..."
                            size="small"
                        />
                        <TextField
                            fullWidth multiline rows={3} label="Reason for blocking"
                            value={blockDialog.reason}
                            onChange={e => setBlockDialog(d => ({ ...d, reason: e.target.value }))}
                            placeholder="Describe the reason (this will be logged in audit trail)..."
                            size="small"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setBlockDialog({ open: false, userId: '', reason: '' })} sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}>Cancel</Button>
                    <Button
                        variant="contained" color="error"
                        onClick={handleBlockUser}
                        disabled={!blockDialog.userId || blocking}
                        sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
                    >
                        {blocking ? 'Blocking...' : 'Confirm Block'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdminSecurity;
