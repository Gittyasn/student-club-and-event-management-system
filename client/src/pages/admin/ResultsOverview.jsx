// eslint-disable-next-line no-unused-vars
import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Paper, Card, CardContent,
    // eslint-disable-next-line no-unused-vars
    Chip, Avatar, TextField, InputAdornment, Stack, Button,
    Dialog, DialogTitle, DialogContent, DialogActions, Select,
    MenuItem, FormControl, InputLabel, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow
} from '@mui/material';
import {
    // eslint-disable-next-line no-unused-vars
    Assessment, EmojiEvents as TrophyIcon, Lock, LockOpen,
    Edit, Search as SearchIcon, People, TrendingUp
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useResultsAnalytics, useAdminResultOverride } from '../../hooks/useResults';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as ReTip, ResponsiveContainer,
    CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import LoadingDots from '../../components/LoadingDots';
import RolePageHeader from '../../components/RolePageHeader';

// eslint-disable-next-line no-unused-vars
const STAT_COLORS = { good: '#10b981', warn: '#f59e0b', danger: '#ef4444', blue: '#3b82f6', purple: '#8b5cf6' };

const StatCard = ({ title, value, sub, color = '#3b82f6', icon }) => (
    <Card sx={{ borderRadius: '18px', border: `1px solid ${color}20`, height: '100%' }}>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                <Box sx={{ p: 1.2, borderRadius: '10px', bgcolor: `${color}15`, color, display: 'flex' }}>{icon}</Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">{title}</Typography>
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ color }}>{value}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
        </CardContent>
    </Card>
);

// Override dialog
const OverrideDialog = ({ open, result, onClose, onConfirm }) => {
    const [field, setField] = useState('rank');
    const [value, setValue] = useState('');
    const [reason, setReason] = useState('');
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
            <DialogTitle sx={{ fontWeight: 900 }}>Admin Override Result</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Overriding result for <strong>{result?.student?.full_name}</strong>
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }} variant="filled">
                    <InputLabel>Field to Override</InputLabel>
                    <Select value={field} onChange={e => setField(e.target.value)}>
                        <MenuItem value="rank">Rank</MenuItem>
                        <MenuItem value="score">Score</MenuItem>
                        <MenuItem value="grade">Grade</MenuItem>
                        <MenuItem value="prize_title">Prize Title</MenuItem>
                        <MenuItem value="is_winner">Mark as Winner</MenuItem>
                    </Select>
                </FormControl>
                <TextField fullWidth label="New Value" value={value} onChange={e => setValue(e.target.value)}
                    variant="filled" sx={{ mb: 2 }} />
                <TextField fullWidth label="Reason" value={reason} onChange={e => setReason(e.target.value)}
                    variant="filled" multiline rows={2} />
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={onClose} sx={{ fontWeight: 700 }}>Cancel</Button>
                <Button variant="contained" disabled={!value || !reason}
                    onClick={() => { onConfirm({ field, value: field === 'is_winner' ? value === 'true' : value, reason }); }}
                    sx={{ fontWeight: 800, borderRadius: '10px' }}>
                    Apply
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const ResultsOverview = () => {
    const [search, setSearch] = useState('');
    const [overrideDialog, setOverrideDialog] = useState({ open: false, result: null });

    const { data: analytics, isLoading: loadingAnalytics } = useResultsAnalytics();
    const { unlockResults, overrideResult } = useAdminResultOverride();

    // All results with student + event data
    const { data: allResults = [] } = useQuery({
        queryKey: ['adminAllResults'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('results')
                .select(`
                    id, rank, score, max_score, grade, result_type, status,
                    prize_title, is_winner, published_at, event_id, user_id, registration_id,
                    student:profiles!results_user_id_fkey(full_name, email, avatar_url),
                    event:events(id, title, results_locked, club:clubs(name))
                `)
                .in('status', ['published', 'locked'])
                .order('published_at', { ascending: false })
                .limit(1000);
            if (error) throw error;
            return data;
        }
    });

    const filteredResults = useMemo(() =>
        allResults.filter(r =>
            search === '' ||
            r.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            r.student?.email?.toLowerCase().includes(search.toLowerCase()) ||
            r.event?.title?.toLowerCase().includes(search.toLowerCase())
        ), [allResults, search]);

    // Top performers table
    const topPerformers = useMemo(() => {
        const scored = allResults.filter(r => r.score !== null && r.max_score);
        return scored
            .map(r => ({ ...r, pct: Math.round((r.score / r.max_score) * 100) }))
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 10);
    }, [allResults]);

    // Monthly results published trend
    const [monthlyTrend] = useMemo(() => {
        const map = {};
        allResults.forEach(r => {
            if (!r.published_at) return;
            const mo = new Date(r.published_at).toLocaleString('default', { month: 'short', year: '2-digit' });
            if (!map[mo]) map[mo] = { name: mo, Published: 0, Winners: 0 };
            map[mo].Published++;
            if (r.is_winner) map[mo].Winners++;
        });
        return [Object.values(map)];
    }, [allResults]);

    if (loadingAnalytics) return <LoadingDots minHeight="50vh" label="Loading results overview..." />;
    const ana = analytics || {};

    return (
        <Box sx={{ pb: 8 }}>
            <RolePageHeader
                kicker="Admin"
                title="Results Overview"
                subtitle="Campus-wide performance analytics, winner intelligence, and result governance controls."
                accent="#fbbf24"
            />

            {/* Platform Stats */}
            <Grid container spacing={2.5} sx={{ mb: 5 }}>
                <Grid item xs={12} sm={6} md={4} lg={2} sx={{ display: 'flex' }}><StatCard title="Total Results" value={ana.totalResults ?? 0} color="#3b82f6" icon={<Assessment />} /></Grid>
                <Grid item xs={12} sm={6} md={4} lg={2} sx={{ display: 'flex' }}><StatCard title="Winners" value={ana.totalWinners ?? 0} color="#fbbf24" icon={<TrophyIcon />} /></Grid>
                <Grid item xs={12} sm={6} md={4} lg={2} sx={{ display: 'flex' }}><StatCard title="Ranked" value={ana.totalRanked ?? 0} color="#8b5cf6" icon={<People />} /></Grid>
                <Grid item xs={12} sm={6} md={4} lg={2} sx={{ display: 'flex' }}><StatCard title="Avg Score" value={`${ana.avgScore ?? 0}%`} color="#10b981" icon={<TrendingUp />} /></Grid>
                <Grid item xs={12} sm={6} md={4} lg={2} sx={{ display: 'flex' }}><StatCard title="Rank-Based" value={(ana.typeBreakdown || []).find(t => t.name === 'Rank-Based')?.value ?? 0} color="#6366f1" icon={<TrophyIcon />} /></Grid>
                <Grid item xs={12} sm={6} md={4} lg={2} sx={{ display: 'flex' }}><StatCard title="Score-Based" value={(ana.typeBreakdown || []).find(t => t.name === 'Score-Based')?.value ?? 0} color="#10b981" icon={<Assessment />} /></Grid>
            </Grid>

            {/* Charts Grid */}
            <Grid container spacing={4} sx={{ mb: 5 }}>
                {/* Monthly trend */}
                <Grid item xs={12} lg={8} sx={{ display: 'flex' }}>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', width: '100%' }}>
                        <Typography variant="h6" fontWeight={900} gutterBottom>Monthly Results Published</Typography>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={monthlyTrend} margin={{ left: -10 }}>
                                <defs>
                                    <linearGradient id="gPub" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gWin" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} />
                                <Area type="monotone" dataKey="Published" stroke="#6366f1" fill="url(#gPub)" strokeWidth={2.5} dot={false} />
                                <Area type="monotone" dataKey="Winners" stroke="#fbbf24" fill="url(#gWin)" strokeWidth={2} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Type pie */}
                <Grid item xs={12} lg={4} sx={{ display: 'flex' }}>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', height: '100%', width: '100%' }}>
                        <Typography variant="h6" fontWeight={900} gutterBottom>Result Types</Typography>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie data={ana.typeBreakdown || []} cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={3} dataKey="value">
                                    {(ana.typeBreakdown || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Score Distribution */}
                <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', width: '100%' }}>
                        <Typography variant="h6" fontWeight={900} gutterBottom>Score Distribution Buckets</Typography>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={ana.scoreDistribution || []}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Bar dataKey="value" name="Students" radius={[6, 6, 0, 0]} barSize={44}>
                                    {(ana.scoreDistribution || []).map((_, i) => (
                                        <Cell key={i} fill={['#ef4444', '#f59e0b', '#3b82f6', '#10b981'][i]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Top Performers */}
                <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', width: '100%' }}>
                        <Typography variant="h6" fontWeight={900} gutterBottom>Top 10 Performers</Typography>
                        <Box sx={{ maxHeight: 220, overflow: 'auto' }}>
                            {topPerformers.map((r, i) => (
                                <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.8, borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <Typography variant="caption" fontWeight={900} sx={{ width: 20, color: i < 3 ? '#fbbf24' : 'text.secondary' }}>#{i + 1}</Typography>
                                    <Avatar src={r.student?.avatar_url} sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                                        {r.student?.full_name?.charAt(0)}
                                    </Avatar>
                                    <Typography variant="body2" fontWeight={700} flex={1}>{r.student?.full_name}</Typography>
                                    <Chip label={`${r.pct}%`} size="small" color={r.pct >= 80 ? 'success' : r.pct >= 60 ? 'primary' : 'warning'} sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Results Management Table */}
            <Paper sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1 }}>Results Log</Typography>
                    <TextField size="small" placeholder="Search student, event..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, sx: { borderRadius: '10px' } }}
                        sx={{ width: 300 }} />
                    <Typography variant="caption" color="text.secondary">{filteredResults.length} records</Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 550 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', bgcolor: 'background.paper' } }}>
                                <TableCell>Student</TableCell>
                                <TableCell>Event</TableCell>
                                <TableCell>Rank</TableCell>
                                <TableCell>Score</TableCell>
                                <TableCell>Prize</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Lock</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredResults.length === 0 && (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>No results found.</TableCell></TableRow>
                            )}
                            {filteredResults.map(r => (
                                <TableRow key={r.id} hover>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                            <Avatar src={r.student?.avatar_url} sx={{ width: 30, height: 30, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
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
                                        {r.rank ? <Chip label={`#${r.rank}`} size="small" color={r.rank <= 3 ? 'warning' : 'default'} sx={{ fontWeight: 800 }} /> : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {r.score !== null ? <Typography variant="body2" fontWeight={700}>{r.score}{r.max_score ? `/${r.max_score}` : ''}</Typography> : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {r.prize_title ? <Chip label={r.prize_title} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} /> : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={r.status} size="small"
                                            color={r.status === 'locked' ? 'error' : 'success'} variant="outlined"
                                            sx={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'capitalize' }} />
                                    </TableCell>
                                    <TableCell>
                                        {r.event?.results_locked ? (
                                            <Button size="small" startIcon={<LockOpen fontSize="small" />}
                                                onClick={() => { if (window.confirm('Unlock results for this event?')) unlockResults.mutate(r.event_id); }}
                                                sx={{ fontSize: '0.7rem', fontWeight: 700, p: '4px 8px', minWidth: 0 }}>
                                                Unlock
                                            </Button>
                                        ) : (
                                            <Chip label="Open" size="small" color="success" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button size="small" startIcon={<Edit fontSize="small" />}
                                            onClick={() => setOverrideDialog({ open: true, result: r })}
                                            sx={{ fontSize: '0.72rem', fontWeight: 700 }}>
                                            Override
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Override Dialog */}
            <OverrideDialog
                open={overrideDialog.open}
                result={overrideDialog.result}
                onClose={() => setOverrideDialog({ open: false, result: null })}
                onConfirm={({ field, value, reason }) => {
                    const r = overrideDialog.result;
                    overrideResult.mutate({ resultId: r.id, eventId: r.event_id, changes: { [field]: value }, reason });
                    setOverrideDialog({ open: false, result: null });
                }}
            />
        </Box>
    );
};

export default ResultsOverview;

