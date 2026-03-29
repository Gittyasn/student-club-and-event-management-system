// eslint-disable-next-line no-unused-vars
import { useState, useMemo } from 'react';
import {
    Box, Typography, Paper, Grid, Chip, Stack,
    // eslint-disable-next-line no-unused-vars
    LinearProgress, Alert, Button, Tooltip,
    // eslint-disable-next-line no-unused-vars
    List, ListItem, ListItemIcon, ListItemText,
    // eslint-disable-next-line no-unused-vars
    Divider, useTheme
} from '@mui/material';
import {
    Speed as SpeedIcon,
    // eslint-disable-next-line no-unused-vars
    Storage, Memory, CloudQueue,
    // eslint-disable-next-line no-unused-vars
    CheckCircle, Cancel, Warning,
    DataObject, TableChart, Refresh,
    // eslint-disable-next-line no-unused-vars
    TrendingUp, Architecture, BoltOutlined,
    // eslint-disable-next-line no-unused-vars
    Timeline
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { motion } from 'framer-motion';
import LoadingDots from '../../components/LoadingDots';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer,
    // eslint-disable-next-line no-unused-vars
    RadialBarChart, RadialBar, Cell
} from 'recharts';
import { toast } from 'sonner';
// eslint-disable-next-line no-unused-vars
import { formatBytes } from '../../utils/performance';

// ── Data hooks ───────────────────────────────────────────────────────────────

const useEventStats = () =>
    useQuery({
        queryKey: ['mv-event-stats-sample'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('mv_event_stats')
                .select('event_id, title, registration_count, fill_rate_pct, avg_rating, last_refreshed')
                .order('registration_count', { ascending: false })
                .limit(10);
            if (error) throw error;
            return data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

const useTableSizes = () =>
    useQuery({
        queryKey: ['table-row-counts'],
        queryFn: async () => {
            const tables = [
                { name: 'events', label: 'Events' },
                { name: 'registrations', label: 'Registrations' },
                { name: 'attendance_records', label: 'Attendance' },
                { name: 'notifications', label: 'Notifications' },
                { name: 'messages', label: 'Messages' },
                { name: 'audit_logs', label: 'Audit Logs' },
                { name: 'login_logs', label: 'Login Logs' },
                { name: 'profiles', label: 'Users' },
            ];
            const results = await Promise.all(
                tables.map(async (t) => {
                    const { count } = await supabase.from(t.name).select('*', { count: 'exact', head: true });
                    return { ...t, count: count || 0 };
                })
            );
            return results;
        },
        staleTime: 10 * 60 * 1000,
    });

// ── Performance metric card ──────────────────────────────────────────────────
const MetricCard = ({ title, value, icon, color, subtitle, unit = '', delay = 0 }) => {
    const theme = useTheme();
    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            sx={{
                p: 2.5, borderRadius: '16px',
                background: theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.05)' : '#fff',
                border: `2px solid ${color}22`,
                boxShadow: `0 4px 20px -6px ${color}18`,
                position: 'relative', overflow: 'hidden',
                '&::before': {
                    content: '""', position: 'absolute',
                    top: 0, left: 0, right: 0, height: '3px',
                    background: `linear-gradient(90deg, ${color}, transparent)`,
                }
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: '10px', bgcolor: `${color}15`, color, display: 'flex' }}>
                    {icon}
                </Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}>
                    {title}
                </Typography>
            </Box>
            <Typography variant="h4" fontWeight={900} sx={{ color, letterSpacing: -1, lineHeight: 1 }}>
                {value ?? '—'}<Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 700, ml: 0.5, opacity: 0.8 }}>{unit}</Box>
            </Typography>
            {subtitle && (
                <Typography variant="caption" color="text.disabled" display="block" mt={0.4}>
                    {subtitle}
                </Typography>
            )}
        </Box>
    );
};

// ── Optimization checklist ───────────────────────────────────────────────────
const CHECKLIST_ITEMS = [
    { label: 'React.lazy() route-level splitting', status: 'done' },
    { label: 'Suspense fallback at application root', status: 'done' },
    { label: 'Terser minification (console.log stripped)', status: 'done' },
    { label: 'Fine-grained Vite manual chunk splitting', status: 'done' },
    { label: 'TanStack Query 5-min staleTime (stable data)', status: 'done' },
    { label: 'Mutations retry: 0 (prevent duplicate writes)', status: 'done' },
    { label: 'Composite DB indexes on hot query paths', status: 'done' },
    { label: 'Partial indexes (active rows only)', status: 'done' },
    { label: 'Materialized view for analytics (mv_event_stats)', status: 'done' },
    { label: 'Cursor-based pagination (no OFFSET)', status: 'done' },
    { label: 'useDebounce on all search inputs', status: 'ready' },
    { label: 'Realtime channel scope guards (unmount cleanup)', status: 'done' },
    { label: 'Chat history: load last 50 messages only', status: 'done' },
    { label: 'Source maps disabled in production', status: 'done' },
    { label: 'CDN delivery for static assets (Supabase Storage)', status: 'planned' },
    { label: 'Image WebP + compression on upload', status: 'planned' },
];

const STATUS_CONFIG = {
    done: { color: '#10b981', icon: <CheckCircle sx={{ fontSize: 16 }} />, label: 'Done' },
    ready: { color: '#3b82f6', icon: <CheckCircle sx={{ fontSize: 16 }} />, label: 'Available' },
    planned: { color: '#94a3b8', icon: <Warning sx={{ fontSize: 16 }} />, label: 'Planned' },
    pending: { color: '#f59e0b', icon: <Warning sx={{ fontSize: 16 }} />, label: 'Pending' },
};

// ── Scalability tiers ────────────────────────────────────────────────────────
const SCALABILITY_TIERS = [
    { tier: '10 users', status: '✅ Live', color: '#10b981', desc: 'Current dev/test capacity' },
    { tier: '100 users', status: '✅ Ready', color: '#10b981', desc: 'Supabase free tier ~ 500 concurrent' },
    { tier: '1,000 users', status: '✅ Ready', color: '#3b82f6', desc: 'Pro tier + indexes handle this well' },
    { tier: '10,000 users', status: '📌 Plan', color: '#f59e0b', desc: 'Read replicas + CDN + Queue needed' },
];

// ── Documented chunk info (from build output) ────────────────────────────────
const CHUNK_DATA = [
    { name: 'vendor-mui', est: 280 },
    { name: 'vendor-mui-icons', est: 120 },
    { name: 'vendor-react', est: 145 },
    { name: 'vendor-framer', est: 90 },
    { name: 'vendor-recharts', est: 80 },
    { name: 'vendor-supabase', est: 55 },
    { name: 'vendor-utils', est: 40 },
    { name: 'app (index)', est: 95 },
];

// ── Main component ───────────────────────────────────────────────────────────
const PerformanceDashboard = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);

    const { data: eventStats, isLoading: statsLoading } = useEventStats();
    const { data: tableData, isLoading: tableLoading } = useTableSizes();

    const completedItems = CHECKLIST_ITEMS.filter(i => i.status === 'done').length;
    const completionPct = Math.round((completedItems / CHECKLIST_ITEMS.length) * 100);

    const totalChunkKB = CHUNK_DATA.reduce((a, b) => a + b.est, 0);

    const handleRefreshMV = async () => {
        setRefreshing(true);
        try {
            const { data, error } = await supabase.rpc('refresh_event_stats');
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['mv-event-stats-sample'] });
            toast.success(`Materialized view refreshed: ${data}`);
        } catch (err) {
            toast.error(`Refresh failed: ${err.message}`);
        } finally {
            setRefreshing(false);
        }
    };

    const CHART_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6'];

    return (
        <Box sx={{ pb: 8 }}>
            {/* Header */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                sx={{
                    mb: 4, p: { xs: 3, md: 4 }, borderRadius: '24px',
                    background: 'linear-gradient(135deg, #0f2027 0%, #1a3a4a 50%, #0f2027 100%)',
                    position: 'relative', overflow: 'hidden',
                    boxShadow: '0 24px 64px -12px rgba(16,185,129,0.2)'
                }}
            >
                {[['#10b981', '-80px', null, null, '-80px'], ['#3b82f6', null, '-60px', '40%', null]].map(([c, top, bottom, left, right], i) => (
                    <Box key={i} component={motion.div}
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ repeat: Infinity, duration: 7 + i * 3, ease: 'easeInOut' }}
                        sx={{
                            position: 'absolute', borderRadius: '50%',
                            width: 220, height: 220,
                            background: `radial-gradient(circle, ${c}25, transparent 70%)`,
                            top, bottom, left, right, filter: 'blur(30px)', zIndex: 0
                        }}
                    />
                ))}
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Box sx={{ p: 1.5, borderRadius: '14px', bgcolor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                            <SpeedIcon sx={{ color: '#10b981', fontSize: 28 }} />
                        </Box>
                        <Box>
                            <Typography variant="h4" fontWeight={900} sx={{ color: 'white', letterSpacing: -1, lineHeight: 1 }}>
                                Performance Overview
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                                Optimization and delivery summary
                            </Typography>
                        </Box>
                    </Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', fontWeight: 500 }}>
                        Live database table sizes, bundle composition analysis, optimization checklist, and scalability tracking.
                    </Typography>
                </Box>
            </Box>

            {/* Metric Cards */}
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                {[
                    { title: 'Optimization Score', value: `${completionPct}%`, icon: <BoltOutlined />, color: '#10b981', subtitle: `${completedItems}/${CHECKLIST_ITEMS.length} items complete`, unit: '' },
                    { title: 'Bundle Size (est.)', value: totalChunkKB, icon: <Memory />, color: '#3b82f6', subtitle: 'Total across all vendor chunks', unit: 'KB' },
                    { title: 'DB Indexes', value: 22, icon: <TableChart />, color: '#a855f7', subtitle: 'Composite + partial indexes active', unit: '' },
                    { title: 'Chunk Count', value: CHUNK_DATA.length, icon: <DataObject />, color: '#f59e0b', subtitle: 'Fine-grained code splitting', unit: 'bundles' },
                ].map((m, i) => (
                    <Grid item xs={12} sm={6} md={3} key={m.title}>
                        <MetricCard {...m} delay={i * 0.08} />
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Bundle Composition Chart */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '2px solid #3b82f620', height: '100%' }}>
                        <Typography variant="h6" fontWeight={900} mb={0.5}>Bundle Composition</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={2}>
                            Estimated compressed chunk sizes (KB gzip)
                        </Typography>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={CHUNK_DATA} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} horizontal={false} />
                                <XAxis type="number" unit="KB" tick={{ fontSize: 10 }} tickLine={false} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} tickLine={false} />
                                <RechartsTooltip formatter={(v) => [`${v} KB`, 'Estimated size']} />
                                <Bar dataKey="est" radius={[0, 4, 4, 0]} maxBarSize={18}>
                                    {CHUNK_DATA.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Live Table Sizes */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '2px solid #a855f720', height: '100%' }}>
                        <Typography variant="h6" fontWeight={900} mb={0.5}>Database Table Sizes</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={2}>
                            Live row counts across key tables
                        </Typography>
                        {tableLoading ? <LoadingDots inline size={5} /> : (
                            <Stack spacing={1}>
                                {(tableData || []).map((t, i) => {
                                    const max = Math.max(...(tableData || []).map(x => x.count), 1);
                                    const pct = (t.count / max) * 100;
                                    return (
                                        <Box key={t.name}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="caption" fontWeight={700}>{t.label}</Typography>
                                                <Typography variant="caption" fontWeight={900} color="text.secondary">
                                                    {t.count.toLocaleString()} rows
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={pct}
                                                sx={{
                                                    height: 5, borderRadius: 3,
                                                    '& .MuiLinearProgress-bar': {
                                                        bgcolor: CHART_COLORS[i % CHART_COLORS.length],
                                                        borderRadius: 3
                                                    }
                                                }}
                                            />
                                        </Box>
                                    );
                                })}
                            </Stack>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Optimization Checklist */}
                <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '2px solid #10b98120' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" fontWeight={900}>Optimization Checklist</Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>{completedItems} of {CHECKLIST_ITEMS.length} optimizations active</Typography>
                            </Box>
                            <Chip
                                label={`${completionPct}% Complete`}
                                size="small"
                                sx={{ fontWeight: 800, bgcolor: '#10b98115', color: '#10b981', fontSize: '0.75rem' }}
                            />
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={completionPct}
                            sx={{ height: 6, borderRadius: 3, mb: 2.5, '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 3 } }}
                        />
                        <Stack>
                            {CHECKLIST_ITEMS.map((item, i) => {
                                const cfg = STATUS_CONFIG[item.status];
                                return (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.7, borderBottom: i < CHECKLIST_ITEMS.length - 1 ? `1px solid ${theme.palette.divider}` : 'none' }}>
                                        <Box sx={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</Box>
                                        <Typography variant="body2" sx={{ flex: 1, color: item.status === 'planned' ? 'text.disabled' : 'text.primary' }}>
                                            {item.label}
                                        </Typography>
                                        <Chip label={cfg.label} size="small" sx={{ fontWeight: 700, bgcolor: `${cfg.color}15`, color: cfg.color, fontSize: '0.62rem', height: 20 }} />
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Paper>
                </Grid>

                {/* Scalability Panel */}
                <Grid item xs={12} md={4}>
                    <Stack spacing={3}>
                        {/* Scalability Tiers */}
                        <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '2px solid #f59e0b20' }}>
                            <Typography variant="h6" fontWeight={900} mb={0.5}>Scalability Tiers</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={2}>User capacity readiness</Typography>
                            <Stack spacing={1.5}>
                                {SCALABILITY_TIERS.map(t => (
                                    <Box key={t.tier} sx={{ p: 1.5, borderRadius: '12px', border: `1px solid ${t.color}30`, bgcolor: `${t.color}08` }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                            <Typography variant="body2" fontWeight={800}>{t.tier}</Typography>
                                            <Typography variant="caption" fontWeight={900} sx={{ color: t.color }}>{t.status}</Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.disabled" fontSize="0.66rem">{t.desc}</Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Paper>

                        {/* Materialized View Refresh */}
                        <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '2px solid #3b82f620' }}>
                            <Typography variant="h6" fontWeight={900} mb={0.5}>Analytics Cache</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1.5}>
                                mv_event_stats materialized view
                            </Typography>
                            {statsLoading ? <LoadingDots inline size={5} /> : (
                                <>
                                    <Typography variant="caption" color="text.disabled" display="block" mb={1.5}>
                                        Last refreshed: {eventStats?.[0]?.last_refreshed
                                            ? new Date(eventStats[0].last_refreshed).toLocaleString()
                                            : 'Never'}
                                    </Typography>
                                    <Stack spacing={1}>
                                        {(eventStats || []).slice(0, 4).map(e => (
                                            <Box key={e.event_id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                    {e.title}
                                                </Typography>
                                                <Typography variant="caption" fontWeight={800} sx={{ color: '#3b82f6', flexShrink: 0, ml: 1 }}>
                                                    {e.registration_count} reg
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        startIcon={refreshing ? <LoadingDots inline size={5} color="currentColor" /> : <Refresh />}
                                        onClick={handleRefreshMV}
                                        disabled={refreshing}
                                        sx={{ mt: 2, fontWeight: 700, borderRadius: '10px', textTransform: 'none', borderColor: '#3b82f640', color: '#3b82f6', '&:hover': { bgcolor: '#3b82f610', borderColor: '#3b82f6' } }}
                                    >
                                        {refreshing ? 'Refreshing...' : 'Refresh View'}
                                    </Button>
                                </>
                            )}
                        </Paper>
                    </Stack>
                </Grid>
            </Grid>

            {/* Performance Targets */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '2px solid #06b6d420' }}>
                <Typography variant="h6" fontWeight={900} mb={2}>Performance Targets</Typography>
                <Grid container spacing={2}>
                    {[
                        { metric: 'Landing Page Load', target: '< 2s', icon: '🏠' },
                        { metric: 'Dashboard Load', target: '< 3s', icon: '📊' },
                        { metric: 'Chat Message Latency', target: '< 500ms', icon: '💬' },
                        { metric: 'Registration Response', target: '< 1s', icon: '📝' },
                        { metric: 'Certificate Generation', target: '< 5s', icon: '🏆' },
                        { metric: 'Notification Delivery', target: '< 2s', icon: '🔔' },
                    ].map(t => (
                        <Grid item xs={6} sm={4} md={2} key={t.metric}>
                            <Box sx={{ p: 2, textAlign: 'center', borderRadius: '12px', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
                                <Typography variant="h5" mb={0.5}>{t.icon}</Typography>
                                <Typography variant="caption" fontWeight={900} color="#06b6d4" display="block">{t.target}</Typography>
                                <Typography variant="caption" color="text.secondary" fontSize="0.62rem" display="block">{t.metric}</Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Paper>
        </Box>
    );
};

export default PerformanceDashboard;

