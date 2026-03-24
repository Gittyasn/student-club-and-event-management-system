// eslint-disable-next-line no-unused-vars
import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Paper, Card, CardContent, Chip,
    CircularProgress, Button, Avatar, TextField, InputAdornment,
    // eslint-disable-next-line no-unused-vars
    Stack, Alert, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Dialog, DialogTitle, DialogContent,
    DialogActions, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
    EmojiEvents as CertIcon, Assessment, Cancel, CheckCircle,
    // eslint-disable-next-line no-unused-vars
    Search as SearchIcon, History, Block, Undo, People, TrendingUp
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import {
    useCertificateAnalytics, useAdminCertificateMutations
} from '../../hooks/useCertificates';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as ReTip, ResponsiveContainer,
    CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

const StatCard = ({ title, value, color, icon }) => (
    <Card sx={{ borderRadius: '18px', border: `1px solid ${color}20`, height: '100%' }}>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                <Box sx={{ p: 1.2, borderRadius: '10px', bgcolor: `${color}15`, color, display: 'flex' }}>{icon}</Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">{title}</Typography>
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ color }}>{value}</Typography>
        </CardContent>
    </Card>
);

// ── Revoke Dialog ─────────────────────────────────────────────────────────────
const RevokeDialog = ({ open, cert, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    return (
        <Dialog open={open} onClose={() => { onClose(); setReason(''); }} maxWidth="xs" fullWidth
            PaperProps={{ sx: { borderRadius: '20px' } }}>
            <DialogTitle sx={{ fontWeight: 900 }}>🚫 Revoke Certificate</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Revoking certificate for <strong>{cert?.student?.full_name}</strong> from event <strong>{cert?.event?.title}</strong>.
                    The verification page will show this certificate as REVOKED.
                </Typography>
                <TextField fullWidth label="Revocation Reason *" value={reason} onChange={e => setReason(e.target.value)}
                    variant="filled" multiline rows={3} placeholder="e.g. Academic misconduct, Invalid registration, Admin error..." />
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={() => { onClose(); setReason(''); }} sx={{ fontWeight: 700 }}>Cancel</Button>
                <Button variant="contained" color="error" disabled={!reason.trim()}
                    onClick={() => { onConfirm(reason); setReason(''); }}
                    sx={{ fontWeight: 800, borderRadius: '10px' }}>
                    Revoke Certificate
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const CertificateManagement = () => {
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [revokeDialog, setRevokeDialog] = useState({ open: false, cert: null });

    const { data: analytics, isLoading: loadingAnalytics } = useCertificateAnalytics();
    const { revokeCertificate, reinststateCertificate } = useAdminCertificateMutations();

    // All certificates with joins
    const { data: allCerts = [], isLoading: loadingCerts } = useQuery({
        queryKey: ['adminAllCerts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('certificates')
                .select(`
                    id, cert_type, status, rank, score, grade, prize_title,
                    certificate_number, generated_at, revoked_at, revocation_reason,
                    is_locked, file_url, certificate_url,
                    student:profiles!certificates_user_id_fkey(full_name, email, avatar_url),
                    event:events(id, title, club:clubs(name))
                `)
                .order('generated_at', { ascending: false })
                .limit(2000);
            if (error) throw error;
            return data || [];
        }
    });

    const filtered = useMemo(() =>
        allCerts.filter(c => {
            if (filterType !== 'all' && c.cert_type !== filterType) return false;
            if (filterStatus !== 'all' && c.status !== filterStatus) return false;
            if (search === '') return true;
            const q = search.toLowerCase();
            return (
                c.student?.full_name?.toLowerCase().includes(q) ||
                c.student?.email?.toLowerCase().includes(q) ||
                c.event?.title?.toLowerCase().includes(q) ||
                c.certificate_number?.toLowerCase().includes(q)
            );
        }), [allCerts, filterType, filterStatus, search]);

    const TYPE_INFO = {
        participation: { label: 'Participation', color: '#3b82f6', icon: '🎓' },
        winner: { label: 'Winner', color: '#fbbf24', icon: '🏆' },
        merit: { label: 'Merit', color: '#8b5cf6', icon: '⭐' },
    };

    const ana = analytics || {};

    if (loadingAnalytics || loadingCerts) return <Box display="flex" justifyContent="center" p={8}><CircularProgress /></Box>;

    return (
        <Box sx={{ pb: 8 }}>
            {/* Hero */}
            <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 5, p: { xs: 3, md: 5 }, borderRadius: '28px',
                    background: 'linear-gradient(135deg, #0a0014 0%, #1a0535 50%, #0d1b3e 100%)', color: 'white', position: 'relative', overflow: 'hidden'
                }}>
                <Box sx={{ position: 'absolute', top: -120, right: -120, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="overline" sx={{ color: '#fbbf24', fontWeight: 900, letterSpacing: 3 }}>ADMIN</Typography>
                    <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1.5, mb: 1 }}>Certificate Management</Typography>
                    <Typography sx={{ opacity: 0.65, fontWeight: 500 }}>
                        Campus-wide certificate analytics, revocation controls, and issuance audit.
                    </Typography>
                </Box>
            </Box>

            {/* Stat Cards */}
            <Grid container spacing={2.5} sx={{ mb: 5 }}>
                <Grid item xs={6} md={2}><StatCard title="Total" value={ana.total ?? 0} color="#3b82f6" icon={<CertIcon />} /></Grid>
                <Grid item xs={6} md={2}><StatCard title="Valid" value={ana.valid ?? 0} color="#10b981" icon={<CheckCircle />} /></Grid>
                <Grid item xs={6} md={2}><StatCard title="Revoked" value={ana.revoked ?? 0} color="#ef4444" icon={<Cancel />} /></Grid>
                <Grid item xs={6} md={2}><StatCard title="Participation" value={ana.byType?.participation ?? 0} color="#3b82f6" icon={<People />} /></Grid>
                <Grid item xs={6} md={2}><StatCard title="Winner" value={ana.byType?.winner ?? 0} color="#fbbf24" icon={<CertIcon />} /></Grid>
                <Grid item xs={6} md={2}><StatCard title="Merit" value={ana.byType?.merit ?? 0} color="#8b5cf6" icon={<Assessment />} /></Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={4} sx={{ mb: 5 }}>
                {/* Monthly trend */}
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" fontWeight={900} gutterBottom>Monthly Issuance Trend</Typography>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={ana.monthlyTrend || []} margin={{ left: -10 }}>
                                <defs>
                                    <linearGradient id="gIssued" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gRevoked" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} />
                                <Area type="monotone" dataKey="Issued" stroke="#6366f1" fill="url(#gIssued)" strokeWidth={2.5} dot={false} />
                                <Area type="monotone" dataKey="Revoked" stroke="#ef4444" fill="url(#gRevoked)" strokeWidth={1.5} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Type pie */}
                <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                        <Typography variant="h6" fontWeight={900} gutterBottom>Type Breakdown</Typography>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie data={ana.pieData || []} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                                    {(ana.pieData || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* By club */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" fontWeight={900} gutterBottom>Certificates by Club</Typography>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={ana.byClub || []} layout="vertical" margin={{ left: 10 }}>
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" width={140} axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                                <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Bar dataKey="count" name="Certificates" radius={[0, 6, 6, 0]} barSize={22} fill="#6366f1" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Management Table */}
            <Paper sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1 }}>Certificate Log</Typography>
                    <TextField size="small" placeholder="Search name, email, event..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, sx: { borderRadius: '10px' } }}
                        sx={{ width: 280 }} />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Type</InputLabel>
                        <Select value={filterType} onChange={e => setFilterType(e.target.value)} label="Type" sx={{ borderRadius: '10px' }}>
                            <MenuItem value="all">All Types</MenuItem>
                            <MenuItem value="participation">Participation</MenuItem>
                            <MenuItem value="winner">Winner</MenuItem>
                            <MenuItem value="merit">Merit</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} label="Status" sx={{ borderRadius: '10px' }}>
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="valid">Valid</MenuItem>
                            <MenuItem value="revoked">Revoked</MenuItem>
                        </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary">{filtered.length} records</Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 560 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', bgcolor: 'background.paper' } }}>
                                <TableCell>Student</TableCell>
                                <TableCell>Event</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Cert No.</TableCell>
                                <TableCell>Rank/Score</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Issued</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.length === 0 && (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>No certificates found.</TableCell></TableRow>
                            )}
                            {filtered.map(cert => {
                                const tc = TYPE_INFO[cert.cert_type] || TYPE_INFO.participation;
                                return (
                                    <TableRow key={cert.id} hover sx={{ bgcolor: cert.status === 'revoked' ? '#ef444408' : 'inherit' }}>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1.5}>
                                                <Avatar src={cert.student?.avatar_url} sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                                                    {cert.student?.full_name?.charAt(0)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={700}>{cert.student?.full_name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{cert.student?.email}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={700}>{cert.event?.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">{cert.event?.club?.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={`${tc.icon} ${tc.label}`} size="small"
                                                sx={{ bgcolor: `${tc.color}15`, color: tc.color, fontWeight: 800, border: `1px solid ${tc.color}30`, fontSize: '0.65rem' }} />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" fontFamily="monospace" fontWeight={700}>
                                                {cert.certificate_number || cert.id?.slice(0, 8)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {cert.rank ? <Chip label={`#${cert.rank}`} size="small" color="warning" sx={{ fontWeight: 800, mr: 0.5 }} /> : null}
                                            {cert.score !== null && cert.score !== undefined ? <Typography variant="caption">{cert.score}</Typography> : null}
                                            {!cert.rank && (cert.score === null || cert.score === undefined) ? <Typography color="text.disabled" variant="caption">—</Typography> : null}
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={cert.status} size="small"
                                                color={cert.status === 'revoked' ? 'error' : 'success'} variant="outlined"
                                                sx={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'capitalize' }} />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {cert.generated_at ? new Date(cert.generated_at).toLocaleDateString() : '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {cert.status === 'valid' ? (
                                                <Button size="small" color="error" startIcon={<Block fontSize="small" />}
                                                    onClick={() => setRevokeDialog({ open: true, cert })}
                                                    sx={{ fontSize: '0.7rem', fontWeight: 700, borderRadius: '8px' }}>
                                                    Revoke
                                                </Button>
                                            ) : (
                                                <Button size="small" color="success" startIcon={<Undo fontSize="small" />}
                                                    onClick={() => { if (window.confirm('Reinstate this certificate?')) reinststateCertificate.mutate(cert.id); }}
                                                    sx={{ fontSize: '0.7rem', fontWeight: 700, borderRadius: '8px' }}>
                                                    Reinstate
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Revoke Dialog */}
            <RevokeDialog
                open={revokeDialog.open}
                cert={revokeDialog.cert}
                onClose={() => setRevokeDialog({ open: false, cert: null })}
                onConfirm={(reason) => {
                    revokeCertificate.mutate({ certId: revokeDialog.cert.id, reason });
                    setRevokeDialog({ open: false, cert: null });
                }}
            />
        </Box>
    );
};

export default CertificateManagement;

