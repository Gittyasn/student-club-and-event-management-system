import React, { Suspense, lazy, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, Paper, Tabs, Tab,
    Stack, Chip, Avatar, Tooltip, Alert, LinearProgress, Grid, Card,
    // eslint-disable-next-line no-unused-vars
    CardContent, IconButton, TextField, InputAdornment, Dialog,
    // eslint-disable-next-line no-unused-vars
    DialogTitle, DialogContent, DialogActions, Select, MenuItem,
    // eslint-disable-next-line no-unused-vars
    FormControl, InputLabel
} from '@mui/material';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
    QrCode as QrIcon, Lock as LockIcon, Download as DownloadIcon,
    ArrowBack as BackIcon, CheckCircle, Cancel as CancelIcon,
    HourglassBottom, PersonAdd, AssignmentTurnedIn, AccessTime,
    Search as SearchIcon, CloudUpload, Assessment, FactCheck,
    // eslint-disable-next-line no-unused-vars
    LockOpen, Inventory2
} from '@mui/icons-material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { useEventRegistrations, useAttendanceMutations, useAttendanceLogs } from '../../hooks/useAttendance';
import { useEventById } from '../../hooks/useEventById';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';
import RolePageHeader from '../../components/RolePageHeader';
import LoadingDots from '../../components/LoadingDots';

const AttendanceChartsTab = lazy(() => import('./components/AttendanceChartsTab'));

const STATUS_CFG = {
    present: { label: 'Present', color: '#10b981', chip: 'success' },
    late: { label: 'Late', color: '#f59e0b', chip: 'warning' },
    absent: { label: 'Absent', color: '#ef4444', chip: 'error' },
    excused: { label: 'Excused', color: '#8b5cf6', chip: 'secondary' },
    pending: { label: 'Pending', color: '#94a3b8', chip: 'default' },
};

const StatCard = ({ title, value, color, icon }) => (
    <Card sx={{ borderRadius: '16px', border: `1px solid ${color}25`, boxShadow: `0 4px 20px ${color}08` }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: `${color}15`, color, display: 'flex' }}>{icon}</Box>
            <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">{title}</Typography>
                <Typography variant="h4" fontWeight={900} sx={{ color }}>{value}</Typography>
            </Box>
        </CardContent>
    </Card>
);

// ─── QR Code Modal ─────────────────────────────────────────────────────────────
const QrModal = ({ open, onClose, eventId }) => {
    const [qrUrl, setQrUrl] = useState('');
    const [generating, setGenerating] = useState(false);

    const generate = useCallback(async () => {
        setGenerating(true);
        try {
            const QRCode = await import('qrcode');
            const token = crypto.randomUUID();
            await supabase.from('events').update({ qr_token: token, qr_generated_at: new Date().toISOString() }).eq('id', eventId);
            const payload = JSON.stringify({ type: 'attendance_token', eventId, token });
            setQrUrl(await QRCode.toDataURL(payload, { width: 320, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } }));
        } catch (err) { toast.error('Failed to generate QR: ' + err.message); }
        setGenerating(false);
    }, [eventId]);

    React.useEffect(() => { if (open) generate(); }, [open, generate]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '24px' } }}>
            <DialogTitle sx={{ fontWeight: 900, textAlign: 'center', pb: 0 }}>
                <QrIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                <br />Event QR Code
            </DialogTitle>
            <DialogContent sx={{ textAlign: 'center', pt: '8px !important' }}>
                <Typography variant="body2" color="text.secondary" mb={3}>
                    Display this to students for QR scan attendance. Regenerate to invalidate old codes.
                </Typography>
                {generating ? <LoadingDots label="Generating QR..." minHeight="140px" /> : qrUrl ? (
                    <Box sx={{ p: 2, bgcolor: 'white', borderRadius: '16px', display: 'inline-block', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                        <img src={qrUrl} alt="Event QR" style={{ width: 260, height: 260, display: 'block' }} />
                    </Box>
                ) : null}
            </DialogContent>
            <DialogActions sx={{ p: 3, gap: 1 }}>
                <Button onClick={generate} startIcon={<QrIcon />} variant="outlined" sx={{ fontWeight: 700, borderRadius: '10px', flex: 1 }}>
                    Regenerate
                </Button>
                {qrUrl && (
                    <Button onClick={() => { const a = document.createElement('a'); a.href = qrUrl; a.download = `qr_event.png`; a.click(); }}
                        startIcon={<DownloadIcon />} variant="contained" sx={{ fontWeight: 700, borderRadius: '10px', flex: 1 }}>
                        Download
                    </Button>
                )}
                <Button onClick={onClose} variant="text" sx={{ fontWeight: 700 }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

// ─── Excused Dialog ────────────────────────────────────────────────────────────
const ExcusedDialog = ({ open, student, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
            <DialogTitle sx={{ fontWeight: 900 }}>Mark as Excused</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Mark <strong>{student?.student?.full_name || 'this student'}</strong> as excused.
                </Typography>
                <TextField fullWidth label="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)}
                    variant="filled" multiline rows={2} />
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={onClose} sx={{ fontWeight: 700 }}>Cancel</Button>
                <Button variant="contained" onClick={() => { onConfirm(reason); setReason(''); }} sx={{ fontWeight: 800, borderRadius: '10px' }}>
                    Confirm
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const Attendance = () => {
    const { id: eventId } = useParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState(0);
    const [search, setSearch] = useState('');
    const [qrOpen, setQrOpen] = useState(false);
    const [excusedDialog, setExcusedDialog] = useState({ open: false, student: null });
    const [bulkFile, setBulkFile] = useState(null);
    const fileRef = useRef();

    const { data: registrations = [], isLoading } = useEventRegistrations(eventId);
    const { data: event } = useEventById(eventId);
    const { data: logs = [] } = useAttendanceLogs(eventId);
    const { markAttendance, bulkMarkPresent, bulkMarkAbsent, markExcused, lockAttendance, triggerAutoAbsent, exportCSV } = useAttendanceMutations(eventId);

    const isLocked = event?.attendance_locked;

    const stats = useMemo(() => {
        const total = registrations.length;
        const present = registrations.filter(r => ['present', 'late'].includes(r.attendance?.status)).length;
        const late = registrations.filter(r => r.attendance?.status === 'late').length;
        const absent = registrations.filter(r => r.attendance?.status === 'absent').length;
        const excused = registrations.filter(r => r.attendance?.status === 'excused').length;
        const pending = total - present - absent - excused;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        const pieData = [
            { name: 'Present', value: present, color: '#10b981' },
            { name: 'Late', value: late, color: '#f59e0b' },
            { name: 'Absent', value: absent, color: '#ef4444' },
            { name: 'Excused', value: excused, color: '#8b5cf6' },
            { name: 'Pending', value: pending, color: '#94a3b8' },
        ].filter(d => d.value > 0);
        return { total, present, late, absent, excused, pending, rate, pieData };
    }, [registrations]);

    const filtered = useMemo(() =>
        registrations.filter(r =>
            search === '' ||
            r.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            r.student?.email?.toLowerCase().includes(search.toLowerCase())
        ), [registrations, search]);

    const columns = [
        {
            field: 'avatar', headerName: '', width: 56,
            renderCell: (p) => <Avatar src={p.row.student?.avatar_url} sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
                {p.row.student?.full_name?.charAt(0)}
            </Avatar>
        },
        { field: 'name', headerName: 'Name', flex: 1.2, valueGetter: (_, row) => row.student?.full_name || 'N/A' },
        { field: 'email', headerName: 'Email', flex: 1.5, valueGetter: (_, row) => row.student?.email || 'N/A' },
        { field: 'dept', headerName: 'Dept', width: 110, valueGetter: (_, row) => row.student?.department || 'N/A' },
        {
            field: 'status', headerName: 'Status', width: 130,
            renderCell: (p) => {
                const att = p.row.attendance?.status || 'pending';
                const cfg = STATUS_CFG[att];
                return <Chip label={cfg.label} size="small" color={cfg.chip}
                    icon={att === 'late' ? <AccessTime sx={{ fontSize: '14px !important' }} /> : undefined}
                    sx={{ fontWeight: 800, fontSize: '0.72rem' }} />;
            }
        },
        {
            field: 'late', headerName: 'Late?', width: 90,
            renderCell: (p) => p.row.attendance?.is_late
                ? <Chip label={`+${p.row.attendance.late_minutes}m`} size="small" color="warning" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                : null
        },
        {
            field: 'method', headerName: 'Method', width: 80,
            renderCell: (p) => p.row.attendance?.method
                ? <Chip label={p.row.attendance.method} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.68rem', textTransform: 'capitalize' }} />
                : null
        },
        {
            field: 'actions', type: 'actions', headerName: 'Mark', width: 160,
            getActions: (p) => isLocked ? [] : [
                <GridActionsCellItem key="present"
                    icon={<Tooltip title="Mark Present"><CheckCircle color="success" /></Tooltip>}
                    label="Present"
                    onClick={() => markAttendance.mutate({ userId: p.row.user_id, registrationId: p.row.id, status: 'present', method: 'manual' })}
                    disabled={p.row.attendance?.status === 'present'}
                />,
                <GridActionsCellItem key="absent"
                    icon={<Tooltip title="Mark Absent"><CancelIcon color="error" /></Tooltip>}
                    label="Absent"
                    onClick={() => markAttendance.mutate({ userId: p.row.user_id, registrationId: p.row.id, status: 'absent', method: 'manual' })}
                    disabled={p.row.attendance?.status === 'absent'}
                />,
                <GridActionsCellItem key="excused"
                    icon={<Tooltip title="Mark Excused"><AssignmentTurnedIn color="secondary" /></Tooltip>}
                    label="Excused"
                    onClick={() => setExcusedDialog({ open: true, student: p.row })}
                    disabled={p.row.attendance?.status === 'excused'}
                />
            ]
        }
    ];

    const handleBulkCSVUpload = async () => {
        if (!bulkFile) return;
        const text = await bulkFile.text();
        const lines = text.trim().split('\n').slice(1); // skip header
        let success = 0, fail = 0;
        for (const line of lines) {
            const [email, statusRaw] = line.split(',').map(s => s.trim());
            const status = statusRaw?.toLowerCase();
            if (!email || !['present', 'absent', 'late', 'excused'].includes(status)) { fail++; continue; }
            const reg = registrations.find(r => r.student?.email?.toLowerCase() === email.toLowerCase());
            if (!reg) { fail++; continue; }
            await markAttendance.mutateAsync({ userId: reg.user_id, registrationId: reg.id, status, method: 'bulk' }).catch(() => { fail++; });
            success++;
        }
        toast.success(`CSV import: ${success} updated, ${fail} failed/skipped.`);
        setBulkFile(null);
    };

    if (isLoading) return <LoadingDots label="Loading attendance..." minHeight="50vh" />;

    return (
        <Box sx={{ pb: 6 }}>
            <RolePageHeader
                kicker="Coordinator Dashboard"
                title="Attendance"
                subtitle="Mark, review, and lock attendance records."
            />
            {/* Header */}
            <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 4, p: { xs: 3, md: 4 }, borderRadius: '24px',
                    background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', color: 'white', position: 'relative', overflow: 'hidden'
                }}>
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                        <Box>
                            <Button startIcon={<BackIcon />} onClick={() => navigate(-1)}
                                sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, mb: 1, pl: 0, '&:hover': { color: 'white' } }}>
                                Back
                            </Button>
                            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>Attendance</Typography>
                            <Typography sx={{ opacity: 0.7, fontWeight: 600 }}>{event?.title}</Typography>
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                            <Button variant="outlined" startIcon={<QrIcon />} onClick={() => setQrOpen(true)}
                                sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, borderRadius: '10px' }}>
                                Show QR
                            </Button>
                            {!isLocked ? (
                                <>
                                    <Button variant="outlined" startIcon={<HourglassBottom />}
                                        onClick={() => { if (window.confirm('Auto-mark all unmarked students as Absent?')) triggerAutoAbsent.mutate(); }}
                                        sx={{ borderColor: 'rgba(255,165,0,0.5)', color: '#fbbf24', fontWeight: 700, borderRadius: '10px' }}>
                                        Auto-Absent
                                    </Button>
                                    <Button variant="contained" startIcon={<LockIcon />}
                                        onClick={() => { if (window.confirm('Lock attendance? This will finalize certificates and analytics.')) lockAttendance.mutate(); }}
                                        sx={{ bgcolor: '#ef4444', fontWeight: 800, borderRadius: '10px', '&:hover': { bgcolor: '#dc2626' } }}>
                                        Lock Attendance
                                    </Button>
                                </>
                            ) : (
                                <Chip icon={<LockIcon />} label="Attendance Locked" color="error" sx={{ fontWeight: 800 }} />
                            )}
                            <Button variant="contained" startIcon={<DownloadIcon />}
                                onClick={() => exportCSV(registrations, event?.title)}
                                sx={{ bgcolor: 'rgba(255,255,255,0.15)', fontWeight: 700, borderRadius: '10px' }}>
                                Export
                            </Button>
                        </Stack>
                    </Box>
                </Box>
            </Box>

            {isLocked && (
                <Alert severity="error" icon={<LockIcon />} sx={{ mb: 3, borderRadius: '12px', fontWeight: 700 }}>
                    Attendance is locked. View-only mode. Contact Admin to unlock.
                </Alert>
            )}

            {/* Stats Row */}
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid item xs={6} sm={4} md={2}><StatCard title="Total" value={stats.total} color="#3b82f6" icon={<PersonAdd />} /></Grid>
                <Grid item xs={6} sm={4} md={2}><StatCard title="Present" value={stats.present} color="#10b981" icon={<CheckCircle />} /></Grid>
                <Grid item xs={6} sm={4} md={2}><StatCard title="Late" value={stats.late} color="#f59e0b" icon={<AccessTime />} /></Grid>
                <Grid item xs={6} sm={4} md={2}><StatCard title="Absent" value={stats.absent} color="#ef4444" icon={<CancelIcon />} /></Grid>
                <Grid item xs={6} sm={4} md={2}><StatCard title="Excused" value={stats.excused} color="#8b5cf6" icon={<AssignmentTurnedIn />} /></Grid>
                <Grid item xs={6} sm={4} md={2}><StatCard title="Rate" value={`${stats.rate}%`} color="#10b981" icon={<Assessment />} /></Grid>
            </Grid>

            {/* Attendance Rate Bar */}
            <Paper sx={{ p: 3, mb: 4, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography fontWeight={800} variant="body2">Attendance Fill Rate</Typography>
                    <Typography fontWeight={900} variant="body2" color="success.main">{stats.present}/{stats.total} Present</Typography>
                </Box>
                <LinearProgress value={stats.rate} variant="determinate" sx={{
                    height: 12, borderRadius: 6, bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                        background: stats.rate >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' :
                            stats.rate >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                                'linear-gradient(90deg, #ef4444, #f87171)'
                    }
                }} />
            </Paper>

            {/* Tabs */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 800 } }}>
                <Tab label="Manual Marking" icon={<FactCheck fontSize="small" />} iconPosition="start" />
                <Tab label="Bulk Tools" icon={<Inventory2 fontSize="small" />} iconPosition="start" />
                <Tab label="Report & Charts" icon={<Assessment fontSize="small" />} iconPosition="start" />
                <Tab label="Audit Log" icon={<AssignmentTurnedIn fontSize="small" />} iconPosition="start" />
            </Tabs>

            {/* Tab: Manual Marking */}
            {tab === 0 && (
                <Paper sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ p: 2, bgcolor: 'background.default', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField size="small" placeholder="Search student..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, sx: { borderRadius: '10px' } }}
                            sx={{ flexGrow: 1, maxWidth: 320 }} />
                    </Box>
                    <DataGrid rows={filtered} columns={columns} autoHeight getRowId={r => r.id}
                        initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
                        pageSizeOptions={[20, 50]}
                        sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', fontWeight: 800 } }} />
                </Paper>
            )}

            {/* Tab: Bulk Tools */}
            {tab === 1 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 4, borderRadius: '20px', border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                            <CheckCircle sx={{ fontSize: 48, color: '#10b981', mb: 2 }} />
                            <Typography variant="h6" fontWeight={900} gutterBottom>Mark All Present</Typography>
                            <Typography color="text.secondary" mb={3} variant="body2">Sets every registered student as Present.</Typography>
                            <Button variant="contained" color="success" fullWidth disabled={isLocked}
                                onClick={() => { if (window.confirm('Mark ALL students as Present?')) bulkMarkPresent.mutate(registrations); }}
                                sx={{ fontWeight: 800, borderRadius: '12px', py: 1.5 }}>
                                Mark All Present ({stats.total})
                            </Button>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 4, borderRadius: '20px', border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                            <CancelIcon sx={{ fontSize: 48, color: '#ef4444', mb: 2 }} />
                            <Typography variant="h6" fontWeight={900} gutterBottom>Mark All Absent</Typography>
                            <Typography color="text.secondary" mb={3} variant="body2">Sets all un-marked students as Absent.</Typography>
                            <Button variant="outlined" color="error" fullWidth disabled={isLocked}
                                onClick={() => { if (window.confirm('Mark all PENDING students as Absent?')) bulkMarkAbsent.mutate(registrations.filter(r => !r.attendance)); }}
                                sx={{ fontWeight: 800, borderRadius: '12px', py: 1.5 }}>
                                Mark Pending Absent ({stats.pending})
                            </Button>
                        </Paper>
                    </Grid>
                    <Grid item xs={12}>
                        <Paper sx={{ p: 4, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={900} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CloudUpload /> CSV Bulk Upload
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Upload a CSV with columns: <code>email</code>, <code>status</code> (present/absent/late/excused)
                            </Typography>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Button variant="outlined" onClick={() => fileRef.current.click()} startIcon={<CloudUpload />}
                                    sx={{ fontWeight: 700, borderRadius: '10px' }}>
                                    Choose File
                                </Button>
                                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                                    onChange={e => setBulkFile(e.target.files[0])} />
                                {bulkFile && <Typography variant="body2" fontWeight={700}>{bulkFile.name}</Typography>}
                                {bulkFile && (
                                    <Button variant="contained" onClick={handleBulkCSVUpload} disabled={isLocked}
                                        sx={{ fontWeight: 800, borderRadius: '10px' }}>
                                        Process CSV
                                    </Button>
                                )}
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Tab: Report */}
            {tab === 2 && (
                <Suspense fallback={<LoadingDots label="Loading charts..." minHeight="260px" />}>
                    <AttendanceChartsTab eventTitle={event?.title} stats={stats} />
                </Suspense>
            )}

            {/* Tab: Audit Log */}
            {tab === 3 && (
                <Paper sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                        {logs.length === 0 ? (
                            <Box p={4} textAlign="center"><Typography color="text.secondary">No audit entries yet.</Typography></Box>
                        ) : logs.map(log => (
                            <Box key={log.id} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="body2" fontWeight={700}>{log.student?.full_name || 'Unknown'}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {log.previous_status} → {log.new_status} · {log.method} · by {log.actor?.full_name || 'System'}
                                    </Typography>
                                    {log.action_note && <Typography variant="caption" display="block" color="text.secondary" fontStyle="italic">&quot;{log.action_note}&quot;</Typography>}
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, ml: 2 }}>
                                    {new Date(log.created_at).toLocaleString()}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            )}

            {/* Modals */}
            <QrModal open={qrOpen} onClose={() => setQrOpen(false)} eventId={eventId} />
            <ExcusedDialog
                open={excusedDialog.open}
                student={excusedDialog.student}
                onClose={() => setExcusedDialog({ open: false, student: null })}
                onConfirm={(reason) => {
                    const s = excusedDialog.student;
                    markExcused.mutate({ userId: s.user_id, registrationId: s.id, reason });
                    setExcusedDialog({ open: false, student: null });
                }}
            />
        </Box>
    );
};

export default Attendance;
