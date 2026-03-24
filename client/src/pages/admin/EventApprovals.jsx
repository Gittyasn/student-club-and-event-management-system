import React, { useState } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip,
    CircularProgress, Stack, Dialog, DialogTitle,
    DialogContent, DialogContentText, DialogActions,
    // eslint-disable-next-line no-unused-vars
    CardMedia, TextField, Collapse, IconButton, Grid, Divider
} from '@mui/material';
import {
    // eslint-disable-next-line no-unused-vars
    Check as CheckIcon, Close as CloseIcon,
    KeyboardArrowDown as ExpandMoreIcon, KeyboardArrowUp as ExpandLessIcon,
    // eslint-disable-next-line no-unused-vars
    MonetizationOn, LocationOn, EventNote
} from '@mui/icons-material';
import { useEvents, useUpdateEventStatus } from '../../hooks/useEvents';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';
import ApprovalDetails from './ApprovalDetails';
import ApprovalHistory from './ApprovalHistory';
import { Tabs, Tab } from '@mui/material';

const EventApprovals = () => {
    // Fetch pending events based on new status lifecycle
    const { data: events, isLoading, error } = useEvents({ status: 'pending' });
    const updateStatusMutation = useUpdateEventStatus();

    const [selectedEvent, setSelectedEvent] = useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [actionType, setActionType] = useState('approve');
    const [rejectionReason, setRejectionReason] = useState('');
    const [expandedRows, setExpandedRows] = useState({});
    const [currentTab, setCurrentTab] = useState(0);

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleActionClick = (event, type) => {
        setSelectedEvent(event);
        setActionType(type);
        setRejectionReason(''); // Reset reason
        setConfirmDialogOpen(true);
    };

    const handleConfirmAction = () => {
        if (!selectedEvent) return;

        if (actionType === 'reject' && !rejectionReason.trim()) {
            toast.error('A rejection reason is required to maintain audit records.');
            return;
        }

        const updates = actionType === 'approve'
            ? { status: 'approved' }
            : { status: 'rejected', rejection_reason: rejectionReason.trim() };

        updateStatusMutation.mutate(
            { id: selectedEvent.id, ...updates },
            {
                onSuccess: async () => {
                    toast.success(`Event ${actionType}d successfully`);
                    setConfirmDialogOpen(false);

                    if (selectedEvent.created_by) {
                        await supabase.from('notifications').insert({
                            user_id: selectedEvent.created_by,
                            message: `Governance Decision: Your event "${selectedEvent.title}" has been ${actionType}d. ${actionType === 'reject' ? 'Reason: ' + rejectionReason.trim() : ''}`,
                            type: actionType === 'approve' ? 'success' : 'alert'
                        });
                    }

                    const { data: { user } } = await supabase.auth.getUser();
                    await supabase.from('audit_logs').insert({
                        actor_id: user?.id,
                        action: `${actionType}_event`,
                        target_table: 'events',
                        target_id: selectedEvent.id,
                        meta: { title: selectedEvent.title, reason: rejectionReason }
                    });

                    setSelectedEvent(null);
                    setRejectionReason('');
                },
                onError: (err) => {
                    toast.error(`Execution failed: ${err.message}`);
                }
            }
        );
    };

    if (isLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
    if (error) return <Typography color="error">Telemetry disconnected. Failed to load node data.</Typography>;

    return (
        <Box sx={{ pb: 6 }}>
            <Box sx={{
                mb: 4, p: 4, borderRadius: '20px',
                background: 'linear-gradient(135deg, #10b98120 0%, #3b82f615 100%)',
                border: '1px solid #10b98130',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2
            }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1.5 }}>Event Authorization</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Review logistical parameters, deep inspect club risk, or audit past governance decisions.
                    </Typography>
                </Box>
                <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: { xs: 2, md: 0 }, '& .MuiTab-root': { fontWeight: 800, minWidth: 120 } }}>
                    <Tab label="Pending Queue" />
                    <Tab label="Audit & Metrics" />
                </Tabs>
                {currentTab === 0 && (
                    <Chip
                        label={`${events?.length || 0} Pending`}
                        color="warning"
                        sx={{ fontWeight: 800, px: 2, fontSize: '0.9rem', height: 32 }}
                    />
                )}
            </Box>

            {currentTab === 1 ? (
                <ApprovalHistory />
            ) : (
                <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                    <TableContainer>
                        <Table>
                            <TableHead sx={{ bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                                <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider' } }}>
                                    <TableCell width={50} />
                                    <TableCell>Event Identity</TableCell>
                                    <TableCell>Organization</TableCell>
                                    <TableCell>Start Time</TableCell>
                                    <TableCell>Mode</TableCell>
                                    <TableCell align="right">Command</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(!events || events.length === 0) ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                            <Box sx={{ opacity: 0.3 }}>
                                                <CheckIcon sx={{ fontSize: 48, mb: 1 }} />
                                                <Typography variant="h6" fontWeight={800}>Queue Empty</Typography>
                                                <Typography variant="body2">No organizational events require authorization.</Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    events.map((event) => (
                                        <React.Fragment key={event.id}>
                                            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                                                <TableCell>
                                                    <IconButton size="small" onClick={() => toggleRow(event.id)}>
                                                        {expandedRows[event.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                    </IconButton>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={2} alignItems="center">
                                                        {event.poster_url && (
                                                            <CardMedia
                                                                component="img"
                                                                sx={{ width: 44, height: 44, borderRadius: 1 }}
                                                                image={event.poster_url}
                                                                alt={event.title}
                                                            />
                                                        )}
                                                        <Box>
                                                            <Typography variant="body2" fontWeight={800}>
                                                                {event.title}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: 250 }}>
                                                                {event.short_description || event.description}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell><Chip label={event.club?.name} size="small" sx={{ fontWeight: 600 }} /></TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {new Date(event.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Submitted: {event.submitted_at ? new Date(event.submitted_at).toLocaleDateString() : 'Unknown'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={event.mode?.toUpperCase()} size="small" variant="outlined" color="primary" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                        <Button size="small" variant="contained" color="success" onClick={() => handleActionClick(event, 'approve')} sx={{ fontWeight: 800 }}>
                                                            Approve
                                                        </Button>
                                                        <Button size="small" variant="outlined" color="error" onClick={() => handleActionClick(event, 'reject')} sx={{ fontWeight: 800 }}>
                                                            Reject
                                                        </Button>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>

                                            {/* Expanded Details Row */}
                                            <TableRow>
                                                <TableCell style={{ paddingBottom: 0, paddingTop: 0, border: 'none' }} colSpan={6}>
                                                    <Collapse in={expandedRows[event.id]} timeout="auto" unmountOnExit>
                                                        <ApprovalDetails event={event} />
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle sx={{ fontWeight: 900 }}>
                    {actionType === 'approve' ? 'Authorize Deployment' : 'Halt & Reject'}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: actionType === 'reject' ? 2 : 0, fontWeight: 500 }}>
                        Confirm intent to <strong>{actionType}</strong> the event &quot;{selectedEvent?.title}&quot;.
                        {actionType === 'approve'
                            ? " This will push the event to Approved status, allowing coordinators to open registration."
                            : " A rejection will kick the event back to the coordinator for revision. Mandatory feedback is required."}
                    </DialogContentText>

                    {actionType === 'reject' && (
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Rejection Reason"
                            type="text"
                            fullWidth
                            multiline
                            rows={3}
                            variant="filled"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            required
                            error={rejectionReason.length > 0 && rejectionReason.trim().length === 0}
                            InputProps={{ sx: { borderRadius: '8px' } }}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={() => setConfirmDialogOpen(false)} sx={{ fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
                    <Button
                        onClick={handleConfirmAction}
                        variant="contained"
                        color={actionType === 'approve' ? 'success' : 'error'}
                        disabled={actionType === 'reject' && !rejectionReason.trim()}
                        sx={{ fontWeight: 800, borderRadius: '8px', px: 3, boxShadow: 'none' }}
                    >
                        Execute {actionType === 'approve' ? 'Approval' : 'Rejection'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EventApprovals;
