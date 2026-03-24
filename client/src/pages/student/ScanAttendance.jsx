import { useState, lazy, Suspense } from 'react';
import { Box, Typography, Paper, CircularProgress, Button, Chip, Stack, Alert } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    QrCodeScanner as ScanIcon, CheckCircle as SuccessIcon,
    // eslint-disable-next-line no-unused-vars
    Cancel as ErrorIcon, Event as EventIcon, AccessTime
} from '@mui/icons-material';

const LATE_THRESHOLD_MINUTES = 15;
const QrReader = lazy(() => import('react-qr-reader').then((mod) => ({ default: mod.QrReader })));

const ScanAttendance = () => {
    const [step, setStep] = useState('idle'); // idle | scanning | processing | success | error
    const [eventDetails, setEventDetails] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [scannedOnce, setScannedOnce] = useState(false);
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const markMutation = useMutation({
        mutationFn: async ({ eventId, token }) => {
            // 1. Validate QR token against event
            const { data: event, error: evErr } = await supabase
                .from('events')
                .select('id, title, start_time, status, attendance_locked, qr_token, club:clubs(name)')
                .eq('id', eventId)
                .single();

            if (evErr || !event) throw new Error('Event not found.');
            if (event.qr_token !== token) throw new Error('Invalid or expired QR code. Ask coordinator to regenerate.');
            if (event.attendance_locked) throw new Error('Attendance is locked for this event.');
            if (!['ongoing', 'registration_closed', 'completed', 'approved', 'registration_open'].includes(event.status)) {
                throw new Error('Attendance marking is not available for this event status.');
            }

            // 2. Verify registration
            const { data: reg, error: regErr } = await supabase
                .from('registrations')
                .select('id, status')
                .eq('event_id', eventId)
                .eq('user_id', user?.id)
                .in('status', ['registered', 'confirmed'])
                .maybeSingle();

            if (regErr || !reg) throw new Error('You are not registered for this event.');

            // 3. Check duplicate
            const { data: existing } = await supabase
                .from('attendance_records')
                .select('id, status')
                .eq('event_id', eventId)
                .eq('user_id', user?.id)
                .maybeSingle();

            if (existing && ['present', 'late'].includes(existing.status)) {
                throw new Error('Your attendance is already recorded.');
            }

            // 4. Detect late
            const isLate = event.start_time
                ? (Date.now() - new Date(event.start_time).getTime()) > LATE_THRESHOLD_MINUTES * 60 * 1000
                : false;
            const lateMinutes = isLate ? Math.round((Date.now() - new Date(event.start_time).getTime()) / 60000) : 0;
            const finalStatus = isLate ? 'late' : 'present';

            // 5. Upsert attendance record
            const { error: attErr } = await supabase
                .from('attendance_records')
                .upsert({
                    event_id: eventId,
                    registration_id: reg.id,
                    user_id: user?.id,
                    status: finalStatus,
                    is_late: isLate,
                    late_minutes: lateMinutes,
                    method: 'qr',
                    marked_at: new Date().toISOString(),
                    marked_by: user?.id
                }, { onConflict: 'event_id,user_id' });

            if (attErr) throw attErr;

            // 6. Notify student
            await supabase.from('notifications').insert({
                user_id: user?.id,
                message: `Attendance confirmed for "${event.title}"${isLate ? ` (Late – ${lateMinutes}m)` : '.'}`,
                type: 'success'
            });

            return { event, isLate, lateMinutes, finalStatus };
        },
        onSuccess: ({ event, isLate, lateMinutes, finalStatus }) => {
            setEventDetails({ ...event, isLate, lateMinutes, status: finalStatus });
            setStep('success');
            queryClient.invalidateQueries({ queryKey: ['myAttendance'] });
            queryClient.invalidateQueries({ queryKey: ['myRegistrations'] });
        },
        onError: (err) => {
            setErrorMsg(err.message);
            setStep('error');
        }
    });

    const handleResult = (result) => {
        if (!result?.text || scannedOnce || markMutation.isPending) return;
        try {
            const data = JSON.parse(result.text);
            if (data.type === 'attendance_token' && data.eventId && data.token) {
                setScannedOnce(true);
                setStep('processing');
                markMutation.mutate({ eventId: data.eventId, token: data.token });
            } else {
                toast.error('Invalid QR Code format.');
            }
        } catch {
            toast.error('Could not read QR Code.');
        }
    };

    const reset = () => {
        setStep('scanning');
        setScannedOnce(false);
        setErrorMsg('');
        setEventDetails(null);
        markMutation.reset();
    };

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}
        >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 5 }}>
                <Box sx={{ width: 72, height: 72, borderRadius: '20px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2, boxShadow: '0 8px 32px rgba(99,102,241,0.3)' }}>
                    <ScanIcon sx={{ fontSize: 36, color: 'white' }} />
                </Box>
                <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1, mb: 1 }}>Scan Attendance</Typography>
                <Typography color="text.secondary" fontWeight={500}>
                    Point your camera at the event QR code provided by your coordinator.
                </Typography>
            </Box>

            {/* Scanner Card */}
            <Paper sx={{ p: 3, borderRadius: '24px', width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                <AnimatePresence mode="wait">
                    {/* Idle State */}
                    {step === 'idle' && (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Box sx={{ py: 6, textAlign: 'center' }}>
                                <ScanIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography fontWeight={700} color="text.secondary" mb={3}>Ready to scan</Typography>
                                <Button variant="contained" size="large" onClick={() => setStep('scanning')}
                                    sx={{ fontWeight: 800, borderRadius: '14px', px: 5, py: 1.5, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                    Start Scanning
                                </Button>
                            </Box>
                        </motion.div>
                    )}

                    {/* Scanning State */}
                    {step === 'scanning' && (
                        <motion.div key="scanning" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            <Box sx={{ borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                                {/* QR Scanning frame overlay */}
                                <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Box sx={{ width: 200, height: 200, border: '3px solid rgba(99,102,241,0.8)', borderRadius: '16px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)', position: 'relative' }}>
                                        <Box sx={{ position: 'absolute', top: -2, left: -2, width: 24, height: 24, borderTop: '4px solid #6366f1', borderLeft: '4px solid #6366f1', borderRadius: '4px 0 0 0' }} />
                                        <Box sx={{ position: 'absolute', top: -2, right: -2, width: 24, height: 24, borderTop: '4px solid #6366f1', borderRight: '4px solid #6366f1', borderRadius: '0 4px 0 0' }} />
                                        <Box sx={{ position: 'absolute', bottom: -2, left: -2, width: 24, height: 24, borderBottom: '4px solid #6366f1', borderLeft: '4px solid #6366f1', borderRadius: '0 0 0 4px' }} />
                                        <Box sx={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderBottom: '4px solid #6366f1', borderRight: '4px solid #6366f1', borderRadius: '0 0 4px 0' }} />
                                    </Box>
                                </Box>
                                <Suspense fallback={<Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /></Box>}>
                                    <QrReader
                                        onResult={handleResult}
                                        constraints={{ facingMode: 'environment' }}
                                        containerStyle={{ width: '100%' }}
                                    />
                                </Suspense>
                            </Box>
                            <Button fullWidth variant="text" onClick={() => setStep('idle')} sx={{ mt: 2, fontWeight: 700 }}>Cancel</Button>
                        </motion.div>
                    )}

                    {/* Processing State */}
                    {step === 'processing' && (
                        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Box sx={{ py: 6, textAlign: 'center' }}>
                                <CircularProgress size={60} thickness={3} sx={{ mb: 3 }} />
                                <Typography fontWeight={800} gutterBottom>Verifying your attendance...</Typography>
                                <Typography color="text.secondary" variant="body2">Checking registration and event status.</Typography>
                            </Box>
                        </motion.div>
                    )}

                    {/* Success State */}
                    {step === 'success' && eventDetails && (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                                >
                                    <SuccessIcon sx={{ fontSize: 72, color: eventDetails.isLate ? '#f59e0b' : '#10b981', mb: 2 }} />
                                </motion.div>
                                <Typography variant="h5" fontWeight={900} gutterBottom>
                                    {eventDetails.isLate ? 'Marked Late!' : 'Attendance Confirmed!'}
                                </Typography>
                                <Paper sx={{ p: 2.5, borderRadius: '16px', bgcolor: 'action.hover', mb: 3, textAlign: 'left' }}>
                                    <Stack spacing={1.5}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <EventIcon fontSize="small" color="primary" />
                                            <Typography variant="body2" fontWeight={700}>{eventDetails.title}</Typography>
                                        </Box>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <ScanIcon fontSize="small" color="action" />
                                            <Typography variant="caption" color="text.secondary">{eventDetails.club?.name}</Typography>
                                        </Box>
                                        {eventDetails.isLate && (
                                            <Alert severity="warning" sx={{ borderRadius: '10px', py: 0.5 }}>
                                                You arrived {eventDetails.lateMinutes} minutes late.
                                            </Alert>
                                        )}
                                        <Chip
                                            icon={<SuccessIcon fontSize="small" />}
                                            label={eventDetails.isLate ? `Late (via QR)` : `Present (via QR)`}
                                            color={eventDetails.isLate ? 'warning' : 'success'}
                                            sx={{ fontWeight: 800 }}
                                        />
                                    </Stack>
                                </Paper>
                                <Stack direction="row" spacing={2}>
                                    <Button variant="outlined" fullWidth onClick={() => navigate('/student')} sx={{ fontWeight: 700, borderRadius: '12px' }}>
                                        Go to Dashboard
                                    </Button>
                                    <Button variant="contained" fullWidth onClick={() => navigate('/student/attendance')}
                                        sx={{ fontWeight: 800, borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                        View History
                                    </Button>
                                </Stack>
                            </Box>
                        </motion.div>
                    )}

                    {/* Error State */}
                    {step === 'error' && (
                        <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <ErrorIcon sx={{ fontSize: 72, color: '#ef4444', mb: 2 }} />
                                <Typography variant="h6" fontWeight={900} gutterBottom>Scan Failed</Typography>
                                <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', textAlign: 'left' }}>{errorMsg}</Alert>
                                <Stack direction="row" spacing={2}>
                                    <Button variant="outlined" fullWidth onClick={() => navigate('/student')} sx={{ fontWeight: 700, borderRadius: '12px' }}>
                                        Cancel
                                    </Button>
                                    <Button variant="contained" color="primary" fullWidth onClick={reset}
                                        sx={{ fontWeight: 800, borderRadius: '12px' }}>
                                        Try Again
                                    </Button>
                                </Stack>
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Paper>
        </Box>
    );
};

export default ScanAttendance;
