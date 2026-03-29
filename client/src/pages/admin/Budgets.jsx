import { useState, useMemo } from 'react';
import LoadingDots from '../../components/LoadingDots';
import {
    Box, Typography, Grid, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip, Button, TextField,
    useTheme, Dialog, DialogTitle, DialogContent,
    DialogActions, FormControl, InputLabel, Select, MenuItem,
    // eslint-disable-next-line no-unused-vars
    IconButton, Tooltip, LinearProgress, Divider, Alert
} from '@mui/material';
import {
    AccountBalanceWallet as BudgetIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    CheckCircle as ApproveIcon,
    // eslint-disable-next-line no-unused-vars
    TrendingUp, TrendingDown,
    // eslint-disable-next-line no-unused-vars
    EmojiEvents as EventIcon,
    Groups as ClubIcon,
    Refresh as RefreshIcon,
    AccountBalanceWallet as Balance,
    AccessTime as Timer
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#a855f7', '#6b7280'];

const AddItemDialog = ({ open, onClose, clubs, events, onSave }) => {
    const [form, setForm] = useState({ club_id: '', event_id: '', label: '', amount: '', type: 'expense' });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const filteredEvents = events?.filter(e => !form.club_id || e.club_id === form.club_id) || [];

    const handleSave = () => {
        if (!form.label || !form.amount || !form.club_id) { toast.error('Fill all required fields'); return; }
        onSave({ ...form, amount: parseFloat(form.amount) });
        setForm({ club_id: '', event_id: '', label: '', amount: '', type: 'expense' });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
            <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Add Budget Item</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
                <FormControl fullWidth size="small">
                    <InputLabel>Club *</InputLabel>
                    <Select value={form.club_id} label="Club *" onChange={e => set('club_id', e.target.value)}>
                        {(clubs || []).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                    <InputLabel>Event (optional)</InputLabel>
                    <Select value={form.event_id} label="Event (optional)" onChange={e => set('event_id', e.target.value)}>
                        <MenuItem value="">� None �</MenuItem>
                        {filteredEvents.map(e => <MenuItem key={e.id} value={e.id}>{e.title}</MenuItem>)}
                    </Select>
                </FormControl>
                <TextField size="small" label="Label *" value={form.label} onChange={e => set('label', e.target.value)} placeholder="e.g. Venue rental, Registration fee" />
                <TextField size="small" label="Amount (?) *" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} />
                <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select value={form.type} label="Type" onChange={e => set('type', e.target.value)}>
                        <MenuItem value="expense">?? Expense</MenuItem>
                        <MenuItem value="income">?? Income</MenuItem>
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Add Item</Button>
            </DialogActions>
        </Dialog>
    );
};

const Budgets = () => {
    const theme = useTheme();
    const qc = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [filterClub, setFilterClub] = useState('');

    const { data: clubs } = useQuery({
        queryKey: ['adminBudgetClubs'],
        queryFn: async () => {
            const { data } = await supabase.from('clubs').select('id, name, category').eq('status', 'active').order('name');
            return data || [];
        }
    });

    const { data: events } = useQuery({
        queryKey: ['adminBudgetEvents'],
        queryFn: async () => {
            const { data } = await supabase.from('events').select('id, title, club_id, budget').eq('approval_status', 'approved');
            return data || [];
        }
    });

    const { data: items, isLoading, refetch } = useQuery({
        queryKey: ['adminBudgetItems', filterClub],
        queryFn: async () => {
            let q = supabase.from('budget_items')
                .select('id, club_id, event_id, label, amount, type, approved, created_at, clubs(name), events(title)')
                .order('created_at', { ascending: false });
            if (filterClub) q = q.eq('club_id', filterClub);
            const { data } = await q;
            return data || [];
        }
    });

    const addMutation = useMutation({
        mutationFn: async (item) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from('budget_items').insert({ ...item, created_by: user.id });
            if (error) throw error;
        },
        onSuccess: () => { toast.success('Budget item added!'); qc.invalidateQueries(['adminBudgetItems']); setDialogOpen(false); },
        onError: (e) => toast.error(e.message)
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from('budget_items').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['adminBudgetItems']); },
        onError: (e) => toast.error(e.message)
    });

    const approveMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from('budget_items').update({ approved: true }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => { toast.success('Approved!'); qc.invalidateQueries(['adminBudgetItems']); },
        onError: (e) => toast.error(e.message)
    });

    // Summary calculations
    const totalIncome = items?.filter(i => i.type === 'income' && i.approved).reduce((s, i) => s + i.amount, 0) || 0;
    const totalExpense = items?.filter(i => i.type === 'expense' && i.approved).reduce((s, i) => s + i.amount, 0) || 0;
    const pendingRequests = items?.filter(i => !i.approved).length || 0;
    const pendingAmount = items?.filter(i => !i.approved).reduce((s, i) => s + i.amount, 0) || 0;

    const clubExpenditure = useMemo(() => {
        if (!items) return [];
        const clubsMap = {};
        items.filter(i => i.type === 'expense' && i.approved).forEach(i => {
            const name = i.clubs?.name || 'Unknown';
            clubsMap[name] = (clubsMap[name] || 0) + i.amount;
        });
        return Object.entries(clubsMap).map(([name, amount]) => ({ name, value: amount }));
    }, [items]);

    // Pie data
    const pieData = [
        { name: 'Income', value: totalIncome },
        { name: 'Expenses', value: totalExpense }
    ].filter(d => d.value > 0);

    return (
        <Box sx={{ pb: 6 }}>
            {/* Header */}
            <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                sx={{ mb: 4, p: 4, borderRadius: '20px', background: 'linear-gradient(135deg, #10b98120 0%, #3b82f615 100%)', border: '2px solid #10b98130' }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <BudgetIcon sx={{ fontSize: 40, color: '#10b981' }} />
                        <Box>
                            <Typography variant="h3" fontWeight={900} sx={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: -1.5 }}>
                                Budget Management
                            </Typography>
                            <Typography color="text.secondary" sx={{ fontSize: '1rem', fontWeight: 500 }}>
                                Track income, expenses, and allocations across all clubs
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Tooltip title="Refresh"><IconButton onClick={() => refetch()}><RefreshIcon /></IconButton></Tooltip>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}
                            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg, #10b981, #3b82f6)', '&:hover': { background: 'linear-gradient(135deg, #059669, #2563eb)' } }}>
                            Add Item
                        </Button>
                    </Box>
                </Box>
            </Box>

            {/* Premium Metrics Row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                    { label: 'Total Revenue', value: totalIncome, color: '#10b981', icon: <TrendingUp /> },
                    { label: 'Utilized Budget', value: totalExpense, color: '#3b82f6', icon: <TrendingUp sx={{ transform: 'rotate(90deg)' }} /> },
                    { label: 'Active Balance', value: totalIncome - totalExpense, color: '#8b5cf6', icon: <Balance /> },
                    { label: 'Pending Claims', value: pendingAmount, color: '#f59e0b', icon: <Timer />, sub: `${pendingRequests} requests` },
                ].map(s => (
                    <Grid item xs={12} sm={6} md={3} key={s.label}>
                        <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', background: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'white', border: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Box sx={{ p: 1, borderRadius: '10px', bgcolor: `${s.color}15`, color: s.color, display: 'flex' }}>{s.icon}</Box>
                                {s.sub && <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>{s.sub}</Typography>}
                            </Box>
                            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>?{s.value.toLocaleString()}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Charts Row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '14px', background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`, border: `2px solid ${theme.palette.primary.main}20`, height: '100%' }}>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Income vs Expenses</Typography>
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                                        {pieData.map((_, i) => <Cell key={i} fill={i === 0 ? '#10b981' : '#ef4444'} />)}
                                    </Pie>
                                    <ChartTooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '8px' }} formatter={(v) => `?${v.toLocaleString()}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <Box sx={{ py: 6, textAlign: 'center', opacity: 0.4 }}><Typography>No data yet</Typography></Box>}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '14px', background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`, border: `2px solid ${theme.palette.primary.main}20` }}>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Expenses by Club</Typography>
                        {clubExpenditure.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={clubExpenditure}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `?${v.toLocaleString()}`} />
                                    <ChartTooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '8px' }} formatter={(v) => [`?${v.toLocaleString()}`, 'Expense']} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {clubExpenditure.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <Box sx={{ py: 6, textAlign: 'center', opacity: 0.4 }}><Typography>No expense data yet</Typography></Box>}
                    </Paper>
                </Grid>
            </Grid>

            {/* Filter + Table */}
            <Paper elevation={0} sx={{ borderRadius: '16px', background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`, border: `2px solid ${theme.palette.primary.main}20`, overflow: 'hidden' }}>
                <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h6" fontWeight={800}>All Budget Items</Typography>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Filter by Club</InputLabel>
                        <Select value={filterClub} label="Filter by Club" onChange={e => setFilterClub(e.target.value)}>
                            <MenuItem value="">All Clubs</MenuItem>
                            {(clubs || []).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
                {isLoading ? (
                    <LoadingDots label="Loading budgets..." minHeight="180px" />
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.7 } }}>
                                    <TableCell>Label</TableCell>
                                    <TableCell>Club</TableCell>
                                    <TableCell>Event</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell align="center">Status</TableCell>
                                    <TableCell align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(items || []).map((item, idx) => (
                                    <TableRow key={item.id} component={motion.tr} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                        <TableCell><Typography variant="body2" fontWeight={700}>{item.label}</Typography></TableCell>
                                        <TableCell><Chip label={item.clubs?.name || '�'} size="small" icon={<ClubIcon sx={{ fontSize: '14px !important' }} />} sx={{ fontWeight: 600, bgcolor: 'action.selected' }} /></TableCell>
                                        <TableCell><Typography variant="body2" color="text.secondary">{item.events?.title || '�'}</Typography></TableCell>
                                        <TableCell>
                                            <Chip label={item.type === 'income' ? '?? Income' : '?? Expense'} size="small"
                                                sx={{ fontWeight: 700, bgcolor: item.type === 'income' ? '#10b98120' : '#ef444420', color: item.type === 'income' ? '#10b981' : '#ef4444' }} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight={800} sx={{ color: item.type === 'income' ? '#10b981' : '#ef4444' }}>
                                                {item.type === 'income' ? '+' : '-'}?{item.amount.toLocaleString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip label={item.approved ? 'Approved' : 'Pending'} size="small"
                                                sx={{ fontWeight: 700, bgcolor: item.approved ? '#10b98120' : '#f59e0b20', color: item.approved ? '#10b981' : '#f59e0b' }} />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                {!item.approved && (
                                                    <Tooltip title="Approve">
                                                        <IconButton size="small" onClick={() => approveMutation.mutate(item.id)} sx={{ color: '#10b981' }}><ApproveIcon fontSize="small" /></IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Delete">
                                                    <IconButton size="small" onClick={() => deleteMutation.mutate(item.id)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!items || items.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, opacity: 0.5 }}>
                                            <BudgetIcon sx={{ fontSize: 48, mb: 1 }} />
                                            <Typography>No budget items yet. Add your first item!</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            <AddItemDialog open={dialogOpen} onClose={() => setDialogOpen(false)} clubs={clubs} events={events} onSave={(item) => addMutation.mutate(item)} />
        </Box>
    );
};

export default Budgets;
