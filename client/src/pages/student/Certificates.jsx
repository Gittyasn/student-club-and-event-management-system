import { useMemo } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    Card,
    CardContent,
    Chip,
    Button,
    Avatar,
    Alert,
} from '@mui/material';
import {
    Download,
    EmojiEvents,
    WorkspacePremium,
    AssignmentTurnedIn,
    ErrorOutline,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTip, Legend } from 'recharts';
import { useMyCertificates, useDownloadCertificate } from '../../hooks/useCertificates';
import LoadingDots from '../../components/LoadingDots';

const TYPE_CONFIG = {
    participation: { label: 'Participation', bg: 'linear-gradient(135deg,#1a56db,#0ea5e9)', badge: 'P', accent: '#3b82f6' },
    winner: { label: 'Winner', bg: 'linear-gradient(135deg,#92400e,#f59e0b)', badge: 'W', accent: '#fbbf24' },
    merit: { label: 'Merit', bg: 'linear-gradient(135deg,#5b21b6,#8b5cf6)', badge: 'M', accent: '#8b5cf6' },
};

const CertCard = ({ cert, index, onDownload }) => {
    const tc = TYPE_CONFIG[cert.cert_type] || TYPE_CONFIG.participation;
    const isRevoked = cert.status === 'revoked';

    const rankLabel =
        cert.rank === 1 ? '1st' :
            cert.rank === 2 ? '2nd' :
                cert.rank === 3 ? '3rd' : null;

    return (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
            <Card
                sx={{
                    borderRadius: '20px',
                    overflow: 'hidden',
                    border: `1px solid ${isRevoked ? '#ef444430' : `${tc.accent}30`}`,
                    boxShadow: `0 4px 20px ${tc.accent}08`,
                    opacity: isRevoked ? 0.6 : 1,
                    '&:hover': {
                        boxShadow: `0 8px 40px ${tc.accent}15`,
                        transform: isRevoked ? 'none' : 'translateY(-3px)',
                        transition: 'all 0.2s',
                    },
                }}
            >
                <Box sx={{ height: 5, background: isRevoked ? '#ef4444' : tc.bg }} />
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                <Typography
                                    sx={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '8px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: `${tc.accent}18`,
                                        color: tc.accent,
                                        fontWeight: 900,
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    {tc.badge}
                                </Typography>
                                <Chip
                                    label={tc.label}
                                    size="small"
                                    sx={{
                                        bgcolor: `${tc.accent}15`,
                                        color: tc.accent,
                                        fontWeight: 800,
                                        border: `1px solid ${tc.accent}30`,
                                        fontSize: '0.7rem',
                                    }}
                                />
                                {isRevoked && (
                                    <Chip label="Revoked" size="small" color="error" sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                                )}
                            </Box>
                            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.3 }}>
                                {cert.event?.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {cert.event?.club?.name}
                            </Typography>
                        </Box>
                        <Avatar
                            src={cert.event?.club?.logo_url}
                            sx={{ width: 44, height: 44, bgcolor: `${tc.accent}15`, border: `2px solid ${tc.accent}30` }}
                        >
                            {cert.event?.club?.name?.charAt(0)}
                        </Avatar>
                    </Box>

                    {cert.cert_type === 'winner' && cert.rank && (
                        <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#fbbf2415', mb: 2, display: 'flex', justifyContent: 'center' }}>
                            <Typography variant="h6" fontWeight={900} sx={{ color: '#f59e0b' }}>
                                {rankLabel} Rank #{cert.rank}
                                {cert.prize_title ? ` - ${cert.prize_title}` : ''}
                            </Typography>
                        </Box>
                    )}

                    {cert.cert_type === 'merit' && cert.score !== null && (
                        <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#8b5cf615', mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                Score
                            </Typography>
                            <Typography fontWeight={900} sx={{ color: '#8b5cf6' }}>
                                {cert.score}
                                {cert.max_score ? `/${cert.max_score}` : ''}
                                {cert.grade ? ` (${cert.grade})` : ''}
                            </Typography>
                        </Box>
                    )}

                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                                {cert.certificate_number && (
                                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                        {cert.certificate_number}
                                    </span>
                                )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Event Date: {cert.event?.start_time ? new Date(cert.event.start_time).toLocaleDateString('en-IN') : '-'}
                            </Typography>
                        </Box>
                        {!isRevoked && (cert.file_url || cert.certificate_url) && (
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<Download fontSize="small" />}
                                onClick={() => onDownload({ certId: cert.id, fileUrl: cert.file_url || cert.certificate_url })}
                                sx={{ fontWeight: 800, borderRadius: '10px', fontSize: '0.72rem', background: tc.bg }}
                            >
                                Download
                            </Button>
                        )}
                    </Box>

                    {isRevoked && cert.revocation_reason && (
                        <Alert severity="error" sx={{ mt: 1.5, py: 0.5, fontSize: '0.75rem', borderRadius: '8px' }}>
                            Revoked: {cert.revocation_reason}
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

const MyCertificates = () => {
    const { data: certs = [], isLoading } = useMyCertificates();
    const { mutate: download } = useDownloadCertificate();

    const stats = useMemo(() => ({
        total: certs.length,
        participation: certs.filter((cert) => cert.cert_type === 'participation').length,
        winner: certs.filter((cert) => cert.cert_type === 'winner').length,
        merit: certs.filter((cert) => cert.cert_type === 'merit').length,
    }), [certs]);

    const pieData = [
        { name: 'Participation', value: stats.participation, color: '#3b82f6' },
        { name: 'Winner', value: stats.winner, color: '#fbbf24' },
        { name: 'Merit', value: stats.merit, color: '#8b5cf6' },
    ].filter((entry) => entry.value > 0);

    if (isLoading) return <LoadingDots label="Loading certificates..." minHeight="50vh" />;

    return (
        <Box sx={{ pb: 8 }}>
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 5,
                    p: 4,
                    borderRadius: '28px',
                    background: 'linear-gradient(135deg, #0a0014 0%, #1a0535 50%, #0d1b3e 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: -100,
                        right: -100,
                        width: 400,
                        height: 400,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)',
                    }}
                />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1.5, mb: 1 }}>
                        My Certificates
                    </Typography>
                    <Typography sx={{ opacity: 0.7, fontWeight: 500 }}>
                        Your verified achievements - downloadable, shareable, and QR-verifiable.
                    </Typography>
                </Box>
            </Box>

            <Grid container spacing={2.5} sx={{ mb: 5 }}>
                {[
                    { label: 'Total', value: stats.total, color: '#6366f1', icon: <EmojiEvents /> },
                    { label: 'Participation', value: stats.participation, color: '#3b82f6', icon: <AssignmentTurnedIn /> },
                    { label: 'Winner', value: stats.winner, color: '#fbbf24', icon: <EmojiEvents /> },
                    { label: 'Merit', value: stats.merit, color: '#8b5cf6', icon: <WorkspacePremium /> },
                ].map((item) => (
                    <Grid item xs={6} md={3} key={item.label}>
                        <Paper sx={{ p: 2.5, borderRadius: '16px', textAlign: 'center', border: `1px solid ${item.color}20` }}>
                            <Box sx={{ color: item.color, display: 'flex', justifyContent: 'center', mb: 0.5 }}>{item.icon}</Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                                {item.label}
                            </Typography>
                            <Typography variant="h4" fontWeight={900} sx={{ color: item.color }}>
                                {item.value}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {certs.length === 0 ? (
                <Paper sx={{ p: 6, borderRadius: '20px', textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                    <ErrorOutline sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" fontWeight={700} color="text.secondary">
                        No certificates yet
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                        Certificates will appear here once coordinators generate them after your event attendance.
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {pieData.length > 1 && (
                        <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                                <Typography variant="h6" fontWeight={900} gutterBottom>
                                    Breakdown
                                </Typography>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                                            {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                        </Pie>
                                        <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        <Legend iconSize={10} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                    )}
                    <Grid item xs={12} md={pieData.length > 1 ? 8 : 12}>
                        <Grid container spacing={2}>
                            <AnimatePresence>
                                {certs.map((cert, index) => (
                                    <Grid item xs={12} sm={6} key={cert.id}>
                                        <CertCard cert={cert} index={index} onDownload={download} />
                                    </Grid>
                                ))}
                            </AnimatePresence>
                        </Grid>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};

export default MyCertificates;
