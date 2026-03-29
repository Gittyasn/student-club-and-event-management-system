// eslint-disable-next-line no-unused-vars
import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box, Typography, Button, Paper, Grid, Card, CardContent,
    Avatar, Chip, Stack, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    // eslint-disable-next-line no-unused-vars
    Tooltip, IconButton, Tabs, Tab, LinearProgress, Divider,
    // eslint-disable-next-line no-unused-vars
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, useTheme
} from '@mui/material';
import {
    EmojiEvents as CertIcon, Download, Refresh, AutoAwesome,
    // eslint-disable-next-line no-unused-vars
    Lock, LockOpen, CheckCircle, Cancel, People,
    // eslint-disable-next-line no-unused-vars
    QrCode2 as QrIcon, History, Assessment, RocketLaunch
} from '@mui/icons-material';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useEventById } from '../../hooks/useEventById';
import { useEventRegistrations } from '../../hooks/useAttendance';
import {
    useEventCertificates, useCertificateMutations,
    useDownloadCertificate, useCertificateLogs
} from '../../hooks/useCertificates';
import {
    PieChart, Pie, Cell, Tooltip as ReTip, ResponsiveContainer, Legend
} from 'recharts';
import RolePageHeader from '../../components/RolePageHeader';
import { toast } from 'sonner';
import LoadingDots from '../../components/LoadingDots';

const TYPE_CONFIG = {
    participation: { label: 'Participation', color: '#3b82f6', icon: '🎓' },
    winner: { label: 'Winner', color: '#fbbf24', icon: '🏆' },
    merit: { label: 'Merit', color: '#8b5cf6', icon: '⭐' },
};

const STATUS_CONFIG = {
    valid: { label: 'Valid', color: 'success' },
    revoked: { label: 'Revoked', color: 'error' },
    pending: { label: 'Pending', color: 'warning' },
};

const StatCard = ({ label, value, color, icon }) => (
    <Card sx={{ borderRadius: '16px', border: `1px solid ${color}20`, height: '100%' }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">{label}</Typography>
                <Typography>{icon}</Typography>
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ color }}>{value}</Typography>
        </CardContent>
    </Card>
);

const CertificatesManager = () => {
    const { id: eventId } = useParams();
    const theme = useTheme();
    const [tab, setTab] = useState(0);
    const [generating, setGenerating] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [revokeDialog, setRevokeDialog] = useState({ open: false, cert: null });
    // eslint-disable-next-line no-unused-vars
    const [revokeReason, setRevokeReason] = useState('');

    const { data: event } = useEventById(eventId);
    const { data: registrations = [] } = useEventRegistrations(eventId);
    const { data: certs = [], isLoading } = useEventCertificates(eventId);
    const { data: logs = [] } = useCertificateLogs(eventId);
    const { generateCertificates, regenerateCertificate } = useCertificateMutations(eventId);
    const { mutate: download } = useDownloadCertificate();

    const attendees = useMemo(() =>
        registrations
            .filter(r => ['present', 'late'].includes(r.attendance?.status))
            .map(r => r.user_id),
        [registrations]
    );

    const stats = useMemo(() => ({
        total: certs.length,
        participation: certs.filter(c => c.cert_type === 'participation').length,
        winner: certs.filter(c => c.cert_type === 'winner').length,
        merit: certs.filter(c => c.cert_type === 'merit').length,
        revoked: certs.filter(c => c.status === 'revoked').length,
    }), [certs]);

    const pieData = [
        { name: 'Participation', value: stats.participation, color: '#3b82f6' },
        { name: 'Winner', value: stats.winner, color: '#fbbf24' },
        { name: 'Merit', value: stats.merit, color: '#8b5cf6' },
    ].filter(d => d.value > 0);

    const isLocked = event?.results_locked;

    const handleGenerateAll = async () => {
        if (!attendees.length) { toast.error('No eligible attendees found.'); return; }
        setGenerating(true);
        try {
            await generateCertificates.mutateAsync({ userIds: attendees, mode: 'all' });
        } finally { setGenerating(false); }
    };

    const handleGenerateWinnersOnly = async () => {
        setGenerating(true);
        try {
            await generateCertificates.mutateAsync({ userIds: attendees, mode: 'winners_only' });
        } finally { setGenerating(false); }
    };

    if (!eventId) {
        return (
            <Box sx={{ pb: 6 }}>
                <RolePageHeader
                    kicker="Coordinator Dashboard"
                    title="Certificates"
                    subtitle="Choose an event before managing certificates."
                />
                <Alert severity="info" sx={{ borderRadius: '12px' }}>
                    Open certificates from an event action so the manager knows which event to work on.
                </Alert>
            </Box>
        );
    }

    if (isLoading) return <LoadingDots label="Loading certificates..." minHeight="50vh" />;

    return (
        <Box sx={{ pb: 6 }}>
            <RolePageHeader
                kicker="Coordinator Dashboard"
                title="Certificates"
                subtitle="Generate and manage event certificates."
            />
            {/* Header */}
            <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 4, p: { xs: 3, md: 4 }, borderRadius: '24px',
                    background: theme.palette.mode === 'dark' 
                        ? 'linear-gradient(135deg, #0a0014 0%, #1a0535 50%, #0d1b3e 100%)'
                        : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
                    color: theme.palette.text.primary, position: 'relative', overflow: 'hidden',
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 4px 20px rgba(0,0,0,0.04)',
                }}>
                <Box sx={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)' }} />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1, mb: 0.5 }}>
                        Certificate Manager
                    </Typography>
                    <Typography sx={{ opacity: 0.7 }}>{event?.title}</Typography>
                    {!event?.results_published && event?.result_required && (
                        <Alert severity="warning" sx={{ mt: 2, borderRadius: '10px', bgcolor: 'rgba(245,158,11,0.15)', color: '#fbbf24', '& .MuiAlert-icon': { color: '#fbbf24' } }}>
                            Results must be published before generating certificates.
                        </Alert>
                    )}
                </Box>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {[
                    { label: 'Total Issued', value: stats.total, color: '#6366f1', icon: '📋' },
                    { label: 'Participation', value: stats.participation, color: '#3b82f6', icon: '🎓' },
                    { label: 'Winners', value: stats.winner, color: '#fbbf24', icon: '🏆' },
                    { label: 'Merit', value: stats.merit, color: '#8b5cf6', icon: '⭐' },
                    { label: 'Eligible', value: attendees.length, color: '#10b981', icon: '👥' },
                    { label: 'Revoked', value: stats.revoked, color: '#ef4444', icon: '🚫' },
                ].map(s => (
                    <Grid item xs={6} md={2} key={s.label}>
                        <StatCard {...s} />
                    </Grid>
                ))}
            </Grid>

            {/* Tabs */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 800 } }}>
                <Tab label="Generate" icon={<RocketLaunch fontSize="small" />} iconPosition="start" />
                <Tab label="Issued Certificates" icon={<CertIcon fontSize="small" />} iconPosition="start" />
                <Tab label="Analytics" icon={<Assessment fontSize="small" />} iconPosition="start" />
                <Tab label="Audit Log" icon={<History fontSize="small" />} iconPosition="start" />
            </Tabs>

            {/* Tab 0: Generate */}
            {tab === 0 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, borderRadius: '20px', border: '2px solid #3b82f650', textAlign: 'center', height: '100%' }}>
                            <Typography fontSize="3rem" mb={1}>🎓</Typography>
                            <Typography variant="h6" fontWeight={900} mb={1}>All Attendees</Typography>
                            <Typography variant="body2" color="text.secondary" mb={3}>
                                Generates Participation, Winner, and Merit certificates for all <strong>{attendees.length}</strong> attendees based on their results.
                            </Typography>
                            <Button fullWidth variant="contained" onClick={handleGenerateAll}
                                disabled={generating || isLocked || !attendees.length}
                                startIcon={generating ? <LoadingDots inline size={5} color="currentColor" /> : <AutoAwesome />}
                                sx={{ bgcolor: '#3b82f6', fontWeight: 800, borderRadius: '12px', py: 1.5, '&:hover': { bgcolor: '#2563eb' } }}>
                                Generate All Certificates
                            </Button>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, borderRadius: '20px', border: '2px solid #fbbf2450', textAlign: 'center', height: '100%' }}>
                            <Typography fontSize="3rem" mb={1}>🏆</Typography>
                            <Typography variant="h6" fontWeight={900} mb={1}>Winners Only</Typography>
                            <Typography variant="body2" color="text.secondary" mb={3}>
                                Generates Winner certificates only for top 3 ranked students. Useful for competitions.
                            </Typography>
                            <Button fullWidth variant="contained" onClick={handleGenerateWinnersOnly}
                                disabled={generating || isLocked}
                                startIcon={<CertIcon />}
                                sx={{ bgcolor: '#f59e0b', fontWeight: 800, borderRadius: '12px', py: 1.5, '&:hover': { bgcolor: '#d97706' } }}>
                                Generate Winner Certs
                            </Button>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', textAlign: 'center', height: '100%' }}>
                            <Typography fontSize="3rem" mb={1}>🔁</Typography>
                            <Typography variant="h6" fontWeight={900} mb={1}>Regenerate All</Typography>
                            <Typography variant="body2" color="text.secondary" mb={3}>
                                Overwrites all existing certificates. Use after result changes or if template was updated.
                            </Typography>
                            <Button fullWidth variant="outlined" color="warning"
                                disabled={generating || isLocked || !certs.length}
                                startIcon={<Refresh />}
                                onClick={() => { if (window.confirm('Regenerate ALL certificates? Existing files will be overwritten.')) handleGenerateAll(); }}
                                sx={{ fontWeight: 800, borderRadius: '12px', py: 1.5 }}>
                                Regenerate All
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Tab 1: Issued certificates table */}
            {tab === 1 && (
                <Paper sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <TableContainer sx={{ maxHeight: 580 }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', bgcolor: 'background.paper' } }}>
                                    <TableCell>Student</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Cert No.</TableCell>
                                    <TableCell>Rank / Score</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Generated</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {certs.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>No certificates issued yet.</TableCell></TableRow>
                                ) : certs.map(cert => {
                                    const tc = TYPE_CONFIG[cert.cert_type] || TYPE_CONFIG.participation;
                                    const sc = STATUS_CONFIG[cert.status] || STATUS_CONFIG.valid;
                                    return (
                                        <TableRow key={cert.id} hover>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1.5}>
                                                    <Avatar src={cert.student?.avatar_url} sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                                                        {cert.student?.full_name?.charAt(0)}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={700}>{cert.student?.full_name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{cert.student?.department}</Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={`${tc.icon} ${tc.label}`} size="small"
                                                    sx={{ bgcolor: `${tc.color}15`, color: tc.color, fontWeight: 800, border: `1px solid ${tc.color}30`, fontSize: '0.7rem' }} />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" fontFamily="monospace" fontWeight={700}>{cert.certificate_number || cert.id?.slice(0, 8)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                {cert.rank ? <Chip label={`#${cert.rank}`} size="small" color="warning" sx={{ fontWeight: 800 }} /> : null}
                                                {cert.score !== null && cert.score !== undefined ? <Typography variant="caption" ml={0.5}>{cert.score}</Typography> : null}
                                                {!cert.rank && (cert.score === null || cert.score === undefined) ? <Typography color="text.disabled" variant="caption">—</Typography> : null}
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={sc.label} size="small" color={sc.color} variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {cert.generated_at ? new Date(cert.generated_at).toLocaleDateString() : '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={0.5}>
                                                    <Tooltip title="Download">
                                                        <IconButton size="small" onClick={() => download({ certId: cert.id, fileUrl: cert.file_url || cert.certificate_url })}>
                                                            <Download fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Regenerate">
                                                        <IconButton size="small" onClick={() => regenerateCertificate.mutate(cert.student?.id)} disabled={isLocked}>
                                                            <Refresh fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Tab 2: Analytics */}
            {tab === 2 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={5}>
                        <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={900} gutterBottom>Certificate Type Distribution</Typography>
                            {pieData.length === 0 ? (
                                <Box textAlign="center" py={4}><Typography color="text.secondary">No data yet.</Typography></Box>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                                            {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        <Legend iconSize={10} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={900} gutterBottom>Summary</Typography>
                            {[
                                { label: 'Total Issued', value: stats.total, pct: 100 },
                                { label: 'Participation', value: stats.participation, pct: stats.total > 0 ? Math.round((stats.participation / stats.total) * 100) : 0 },
                                { label: 'Winner', value: stats.winner, pct: stats.total > 0 ? Math.round((stats.winner / stats.total) * 100) : 0 },
                                { label: 'Merit', value: stats.merit, pct: stats.total > 0 ? Math.round((stats.merit / stats.total) * 100) : 0 },
                                { label: 'Revoked', value: stats.revoked, pct: stats.total > 0 ? Math.round((stats.revoked / stats.total) * 100) : 0 },
                            ].map(row => (
                                <Box key={row.label} mb={2}>
                                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                                        <Typography variant="body2" fontWeight={700}>{row.label}</Typography>
                                        <Typography variant="body2" color="text.secondary">{row.value} ({row.pct}%)</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={row.pct} sx={{ height: 6, borderRadius: '4px' }} />
                                </Box>
                            ))}
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Tab 3: Audit Log */}
            {tab === 3 && (
                <Paper sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    {logs.length === 0 ? (
                        <Box p={4} textAlign="center"><Typography color="text.secondary">No audit entries yet.</Typography></Box>
                    ) : logs.map(log => (
                        <Box key={log.id} sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Chip label={log.action} size="small" variant="outlined" sx={{ fontWeight: 700, mr: 1, textTransform: 'capitalize' }} />
                                <Typography variant="caption" color="text.secondary">by {log.actor?.full_name || 'System'}</Typography>
                                {log.note && <Typography variant="caption" display="block" fontStyle="italic" color="text.secondary">&quot;{log.note}&quot;</Typography>}
                            </Box>
                            <Typography variant="caption" color="text.secondary">{new Date(log.created_at).toLocaleString()}</Typography>
                        </Box>
                    ))}
                </Paper>
            )}
        </Box>
    );
};

export default CertificatesManager;
