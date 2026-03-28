import { useMemo, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import {
    Assessment,
    Block,
    Cancel,
    CheckCircle,
    EmojiEvents as CertIcon,
    People,
    Search as SearchIcon,
    Undo,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip as ReTip,
    XAxis,
    YAxis,
} from 'recharts';
import { supabase } from '../../services/supabaseClient';
import { useAdminCertificateMutations, useCertificateAnalytics } from '../../hooks/useCertificates';
import LoadingDots from '../../components/LoadingDots';

const TYPE_INFO = {
    participation: { label: 'Participation', color: '#2563eb', badge: 'PC' },
    winner: { label: 'Winner', color: '#f59e0b', badge: 'WN' },
    merit: { label: 'Merit', color: '#8b5cf6', badge: 'MR' },
};

const StatCard = ({ title, value, color, icon }) => (
    <Card sx={{ borderRadius: '18px', border: `1px solid ${color}24`, height: '100%' }}>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: `${color}14`, color, display: 'flex' }}>
                    {icon}
                </Box>
                <Typography variant="caption" color="text.secondary" fontWeight={800} textTransform="uppercase">
                    {title}
                </Typography>
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ color }}>
                {value}
            </Typography>
        </CardContent>
    </Card>
);

const RevokeDialog = ({ open, cert, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');

    const handleClose = () => {
        setReason('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
            <DialogTitle sx={{ fontWeight: 900 }}>Revoke Certificate</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Revoke the certificate for <strong>{cert?.student?.full_name}</strong> from <strong>{cert?.event?.title}</strong>.
                </Typography>
                <TextField
                    fullWidth
                    label="Revocation Reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    variant="filled"
                    multiline
                    rows={3}
                />
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    color="error"
                    disabled={!reason.trim()}
                    onClick={() => {
                        onConfirm(reason);
                        setReason('');
                    }}
                >
                    Revoke
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

    const {
        data: allCertificates = [],
        isLoading: loadingCertificates,
        error: certificatesError,
    } = useQuery({
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
        },
    });

    const filteredCertificates = useMemo(
        () =>
            allCertificates.filter((certificate) => {
                if (filterType !== 'all' && certificate.cert_type !== filterType) return false;
                if (filterStatus !== 'all' && certificate.status !== filterStatus) return false;
                if (!search) return true;

                const query = search.toLowerCase();
                return (
                    certificate.student?.full_name?.toLowerCase().includes(query) ||
                    certificate.student?.email?.toLowerCase().includes(query) ||
                    certificate.event?.title?.toLowerCase().includes(query) ||
                    certificate.certificate_number?.toLowerCase().includes(query)
                );
            }),
        [allCertificates, filterStatus, filterType, search]
    );

    const analyticsData = analytics || {};

    if (loadingAnalytics || loadingCertificates) {
        return <LoadingDots minHeight="50vh" label="Loading certificate management..." />;
    }

    return (
        <Box sx={{ pb: 8 }}>
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 5,
                    p: { xs: 3, md: 4 },
                    borderRadius: '24px',
                    background: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, #140a28 0%, #172554 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Typography variant="overline" sx={{ color: '#f59e0b', fontWeight: 900, letterSpacing: 2.4 }}>
                    CERTIFICATE GOVERNANCE
                </Typography>
                <Typography variant="h4" fontWeight={900} color="text.primary" sx={{ mt: 0.5 }}>
                    Certificate Management
                </Typography>
                <Typography color="text.secondary" fontWeight={600}>
                    Review issuance quality, status, type distribution, and revocation controls from a single workspace.
                </Typography>
            </Box>

            {certificatesError && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: '16px' }}>
                    {certificatesError.message || 'Unable to load certificate records.'}
                </Alert>
            )}

            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={4} lg={2} sx={{ display: 'flex' }}><StatCard title="Total" value={analyticsData.total ?? 0} color="#2563eb" icon={<CertIcon />} /></Grid>
                <Grid item xs={12} sm={6} md={4} lg={2} sx={{ display: 'flex' }}><StatCard title="Valid" value={analyticsData.valid ?? 0} color="#10b981" icon={<CheckCircle />} /></Grid>
                <Grid item xs={12} sm={6} md={4} lg={2} sx={{ display: 'flex' }}><StatCard title="Revoked" value={analyticsData.revoked ?? 0} color="#ef4444" icon={<Cancel />} /></Grid>
                <Grid item xs={12} sm={6} md={4} lg={2} sx={{ display: 'flex' }}><StatCard title="Participation" value={analyticsData.byType?.participation ?? 0} color="#2563eb" icon={<People />} /></Grid>
                <Grid item xs={12} sm={6} md={4} lg={2} sx={{ display: 'flex' }}><StatCard title="Winner" value={analyticsData.byType?.winner ?? 0} color="#f59e0b" icon={<CertIcon />} /></Grid>
                <Grid item xs={12} sm={6} md={4} lg={2} sx={{ display: 'flex' }}><StatCard title="Merit" value={analyticsData.byType?.merit ?? 0} color="#8b5cf6" icon={<Assessment />} /></Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} lg={8} sx={{ display: 'flex' }}>
                    <Paper sx={{ p: 3, borderRadius: '20px', width: '100%', height: '100%' }}>
                        <Typography variant="h6" fontWeight={900} gutterBottom>
                            Monthly Issuance Trend
                        </Typography>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={analyticsData.monthlyTrend || []} margin={{ left: -10 }}>
                                <defs>
                                    <linearGradient id="issuedArea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="revokedArea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} />
                                <Area type="monotone" dataKey="Issued" stroke="#2563eb" fill="url(#issuedArea)" strokeWidth={2.5} dot={false} />
                                <Area type="monotone" dataKey="Revoked" stroke="#ef4444" fill="url(#revokedArea)" strokeWidth={2} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
                <Grid item xs={12} lg={4} sx={{ display: 'flex' }}>
                    <Paper sx={{ p: 3, borderRadius: '20px', width: '100%', height: '100%' }}>
                        <Typography variant="h6" fontWeight={900} gutterBottom>
                            Type Breakdown
                        </Typography>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={analyticsData.pieData || []} cx="50%" cy="50%" innerRadius={56} outerRadius={92} paddingAngle={4} dataKey="value">
                                    {(analyticsData.pieData || []).map((entry, index) => (
                                        <Cell key={index} fill={entry.color || ['#2563eb', '#f59e0b', '#8b5cf6'][index % 3]} />
                                    ))}
                                </Pie>
                                <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            <Paper sx={{ borderRadius: '20px', overflow: 'hidden' }}>
                <Box
                    sx={{
                        p: 2.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                    }}
                >
                    <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1 }}>
                        Certificate Log
                    </Typography>
                    <TextField
                        size="small"
                        placeholder="Search name, email, event..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: '10px' },
                        }}
                        sx={{ width: 280 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Type</InputLabel>
                        <Select value={filterType} onChange={(event) => setFilterType(event.target.value)} label="Type" sx={{ borderRadius: '10px' }}>
                            <MenuItem value="all">All Types</MenuItem>
                            <MenuItem value="participation">Participation</MenuItem>
                            <MenuItem value="winner">Winner</MenuItem>
                            <MenuItem value="merit">Merit</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} label="Status" sx={{ borderRadius: '10px' }}>
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="valid">Valid</MenuItem>
                            <MenuItem value="revoked">Revoked</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
                <TableContainer sx={{ maxHeight: 560 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', bgcolor: 'background.paper' } }}>
                                <TableCell>Student</TableCell>
                                <TableCell>Event</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Certificate No.</TableCell>
                                <TableCell>Rank / Score</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Issued</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCertificates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                        No certificates found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCertificates.map((certificate) => {
                                    const typeInfo = TYPE_INFO[certificate.cert_type] || TYPE_INFO.participation;
                                    const hasRank = certificate.rank !== null && certificate.rank !== undefined;
                                    const hasScore = certificate.score !== null && certificate.score !== undefined;

                                    return (
                                        <TableRow key={certificate.id} hover sx={{ bgcolor: certificate.status === 'revoked' ? '#ef444408' : 'inherit' }}>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1.5}>
                                                    <Avatar src={certificate.student?.avatar_url} sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                                                        {certificate.student?.full_name?.charAt(0)}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={700}>
                                                            {certificate.student?.full_name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {certificate.student?.email}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700}>
                                                    {certificate.event?.title}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {certificate.event?.club?.name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={`${typeInfo.badge} ${typeInfo.label}`}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: `${typeInfo.color}15`,
                                                        color: typeInfo.color,
                                                        fontWeight: 800,
                                                        border: `1px solid ${typeInfo.color}30`,
                                                        fontSize: '0.65rem',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" fontFamily="monospace" fontWeight={700}>
                                                    {certificate.certificate_number || certificate.id?.slice(0, 8)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {hasRank ? <Chip label={`#${certificate.rank}`} size="small" color="warning" sx={{ fontWeight: 800, mr: 0.5 }} /> : null}
                                                {hasScore ? <Typography variant="caption">{certificate.score}</Typography> : null}
                                                {!hasRank && !hasScore ? (
                                                    <Typography color="text.disabled" variant="caption">
                                                        --
                                                    </Typography>
                                                ) : null}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={certificate.status}
                                                    size="small"
                                                    color={certificate.status === 'revoked' ? 'error' : 'success'}
                                                    variant="outlined"
                                                    sx={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'capitalize' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {certificate.generated_at ? new Date(certificate.generated_at).toLocaleDateString() : '--'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {certificate.status === 'valid' ? (
                                                    <Button
                                                        size="small"
                                                        color="error"
                                                        startIcon={<Block fontSize="small" />}
                                                        onClick={() => setRevokeDialog({ open: true, cert: certificate })}
                                                    >
                                                        Revoke
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="small"
                                                        color="success"
                                                        startIcon={<Undo fontSize="small" />}
                                                        onClick={() => {
                                                            if (window.confirm('Reinstate this certificate?')) {
                                                                reinststateCertificate.mutate(certificate.id);
                                                            }
                                                        }}
                                                    >
                                                        Reinstate
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

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
