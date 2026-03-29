import { useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Drawer,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { CheckCircleOutline, Visibility as ViewIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import { useEvents, useUpdateEventStatus } from '../../hooks/useEvents';
import { supabase } from '../../services/supabaseClient';
import { sendNotification } from '../../services/notificationService';
import { writeAuditLog } from '../../services/auditLogService';
import LoadingDots from '../../components/LoadingDots';
import ApprovalDetails from './ApprovalDetails';
import ApprovalHistory from './ApprovalHistory';

const formatDateTime = (value) => {
    if (!value) return 'Not set';
    return new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const EventApprovals = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { data: events, isLoading, error } = useEvents({ status: 'pending', approval_status: 'pending' });
    const updateStatusMutation = useUpdateEventStatus();

    const [selectedEvent, setSelectedEvent] = useState(null);
    const [detailEvent, setDetailEvent] = useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [actionType, setActionType] = useState('approve');
    const [rejectionReason, setRejectionReason] = useState('');
    const [currentTab, setCurrentTab] = useState(0);

    const handleActionClick = (event, type) => {
        setSelectedEvent(event);
        setActionType(type);
        setRejectionReason('');
        setConfirmDialogOpen(true);
    };

    const handleConfirmAction = () => {
        if (!selectedEvent) return;

        if (actionType === 'reject' && !rejectionReason.trim()) {
            toast.error('Add a reason before rejecting this event.');
            return;
        }

        const updates = actionType === 'approve'
            ? { status: 'approved' }
            : { status: 'rejected', rejection_reason: rejectionReason.trim() };

        updateStatusMutation.mutate(
            { id: selectedEvent.id, ...updates },
            {
                onSuccess: async () => {
                    toast.success(`Event ${actionType === 'approve' ? 'approved' : 'rejected'}.`);
                    setConfirmDialogOpen(false);

                    if (selectedEvent.created_by) {
                        await sendNotification({
                            user_id: selectedEvent.created_by,
                            title: actionType === 'approve' ? 'Event approved' : 'Event needs updates',
                            message: actionType === 'approve'
                                ? `Your event "${selectedEvent.title}" has been approved.`
                                : `Your event "${selectedEvent.title}" was returned with feedback: ${rejectionReason.trim()}`,
                            type: actionType === 'approve' ? 'success' : 'alert',
                            related_id: selectedEvent.id,
                            related_type: 'event'
                        });
                    }

                    const { data: { user } } = await supabase.auth.getUser();
                    await writeAuditLog({
                        actor_id: user?.id,
                        action: `${actionType}_event`,
                        target_table: 'events',
                        target_id: selectedEvent.id,
                        meta: { title: selectedEvent.title, reason: rejectionReason.trim() }
                    });

                    setSelectedEvent(null);
                    setRejectionReason('');
                },
                onError: (err) => toast.error(`Action failed: ${err.message}`)
            }
        );
    };

    if (isLoading) return <LoadingDots label="Loading approval queue..." minHeight="30vh" />;
    if (error) return <Typography color="error">Failed to load pending events.</Typography>;

    const emptyState = (
        <Paper elevation={0} sx={{ p: 8, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <CheckCircleOutline sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="h6" fontWeight={800}>No pending events</Typography>
            <Typography variant="body2" color="text.secondary">
                There are no submitted events waiting for review right now.
            </Typography>
        </Paper>
    );

    return (
        <Box sx={{ pb: 6 }}>
            <Box
                sx={{
                    mb: 4,
                    p: { xs: 3, md: 4 },
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(37,99,235,0.08) 100%)',
                    border: '1px solid rgba(16,185,129,0.18)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>
                        Event Approvals
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Review submitted events, approve them for students, or return them with clear feedback.
                    </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <Tabs value={currentTab} onChange={(_event, value) => setCurrentTab(value)} sx={{ '& .MuiTab-root': { fontWeight: 800, minWidth: 120 } }}>
                        <Tab label="Pending queue" />
                        <Tab label="History" />
                    </Tabs>
                    {currentTab === 0 ? (
                        <Chip label={`${events?.length || 0} pending`} color="warning" sx={{ fontWeight: 800 }} />
                    ) : null}
                </Stack>
            </Box>

            {currentTab === 1 ? (
                <ApprovalHistory />
            ) : !events?.length ? (
                emptyState
            ) : isMobile ? (
                <Stack spacing={2}>
                    {events.map((event) => (
                        <Paper key={event.id} elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                            <Stack spacing={1.5}>
                                <Box>
                                    <Typography variant="h6" fontWeight={800}>{event.title}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {event.club?.name || 'Unknown club'}
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Chip label={formatDateTime(event.start_time)} size="small" variant="outlined" />
                                    <Chip label={String(event.mode || 'offline').toUpperCase()} size="small" color="primary" variant="outlined" />
                                </Stack>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Button variant="outlined" startIcon={<ViewIcon />} onClick={() => setDetailEvent(event)} sx={{ fontWeight: 700 }}>
                                        Details
                                    </Button>
                                    <Button variant="contained" color="success" onClick={() => handleActionClick(event, 'approve')} sx={{ fontWeight: 800 }}>
                                        Approve
                                    </Button>
                                    <Button variant="outlined" color="error" onClick={() => handleActionClick(event, 'reject')} sx={{ fontWeight: 800 }}>
                                        Reject
                                    </Button>
                                </Stack>
                            </Stack>
                        </Paper>
                    ))}
                </Stack>
            ) : (
                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                    <TableContainer>
                        <Table>
                            <TableHead sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                                <TableRow sx={{ '& th': { fontWeight: 800, color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider' } }}>
                                    <TableCell>Event</TableCell>
                                    <TableCell>Club</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Mode</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {events.map((event) => (
                                    <TableRow key={event.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={800}>{event.title}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{event.club?.name || 'Unknown club'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{formatDateTime(event.start_time)}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={String(event.mode || 'offline').toUpperCase()} size="small" color="primary" variant="outlined" />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Button size="small" variant="outlined" startIcon={<ViewIcon />} onClick={() => setDetailEvent(event)} sx={{ fontWeight: 700 }}>
                                                    Details
                                                </Button>
                                                <Button size="small" variant="contained" color="success" onClick={() => handleActionClick(event, 'approve')} sx={{ fontWeight: 800 }}>
                                                    Approve
                                                </Button>
                                                <Button size="small" variant="outlined" color="error" onClick={() => handleActionClick(event, 'reject')} sx={{ fontWeight: 800 }}>
                                                    Reject
                                                </Button>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            <Drawer
                anchor={isMobile ? 'bottom' : 'right'}
                open={!!detailEvent}
                onClose={() => setDetailEvent(null)}
                PaperProps={{
                    sx: {
                        width: isMobile ? '100%' : 520,
                        maxHeight: isMobile ? '88vh' : '100%',
                        borderTopLeftRadius: isMobile ? 20 : 0,
                        borderTopRightRadius: isMobile ? 20 : 0,
                        p: 3,
                    }
                }}
            >
                {detailEvent ? (
                    <Stack spacing={2.5}>
                        <Box>
                            <Typography variant="h5" fontWeight={900}>{detailEvent.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Submitted by {detailEvent.club?.name || 'Unknown club'}
                            </Typography>
                        </Box>

                        {detailEvent.poster_url ? (
                            <Box
                                component="img"
                                src={detailEvent.poster_url}
                                alt={detailEvent.title}
                                sx={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                            />
                        ) : null}

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label={`Start: ${formatDateTime(detailEvent.start_time)}`} size="small" variant="outlined" />
                            <Chip label={`Submitted: ${formatDateTime(detailEvent.submitted_at)}`} size="small" variant="outlined" />
                            <Chip label={String(detailEvent.mode || 'offline').toUpperCase()} size="small" color="primary" variant="outlined" />
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                            {detailEvent.short_description || 'No short summary provided.'}
                        </Typography>

                        <ApprovalDetails event={detailEvent} />

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <Button variant="contained" color="success" onClick={() => handleActionClick(detailEvent, 'approve')} sx={{ fontWeight: 800 }}>
                                Approve event
                            </Button>
                            <Button variant="outlined" color="error" onClick={() => handleActionClick(detailEvent, 'reject')} sx={{ fontWeight: 800 }}>
                                Reject event
                            </Button>
                        </Stack>
                    </Stack>
                ) : null}
            </Drawer>

            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 900 }}>
                    {actionType === 'approve' ? 'Approve event' : 'Reject event'}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: actionType === 'reject' ? 2 : 0 }}>
                        {actionType === 'approve'
                            ? `Approve "${selectedEvent?.title}" and make it available to the coordinator.`
                            : `Return "${selectedEvent?.title}" to the coordinator with a reason for the requested changes.`}
                    </DialogContentText>
                    {actionType === 'reject' ? (
                        <TextField
                            autoFocus
                            fullWidth
                            multiline
                            rows={3}
                            margin="dense"
                            label="Reason for rejection"
                            value={rejectionReason}
                            onChange={(event) => setRejectionReason(event.target.value)}
                            error={rejectionReason.length > 0 && rejectionReason.trim().length === 0}
                        />
                    ) : null}
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={() => setConfirmDialogOpen(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
                    <Button
                        onClick={handleConfirmAction}
                        variant="contained"
                        color={actionType === 'approve' ? 'success' : 'error'}
                        disabled={actionType === 'reject' && !rejectionReason.trim()}
                        sx={{ fontWeight: 800 }}
                    >
                        {actionType === 'approve' ? 'Approve' : 'Reject'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EventApprovals;
