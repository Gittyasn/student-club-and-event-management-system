import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import {
    // eslint-disable-next-line no-unused-vars
    Box, Paper, Typography, Button, Table, TableBody, TableCell,
    // eslint-disable-next-line no-unused-vars
    TableContainer, TableHead, TableRow, CircularProgress, Alert, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Card, CardContent, Grid, Tabs, Tab, IconButton, Tooltip, Avatar
} from '@mui/material';
import {
    // eslint-disable-next-line no-unused-vars
    CheckCircle as ApproveIcon, Close as RejectIcon, Delete as DeleteIcon,
    // eslint-disable-next-line no-unused-vars
    Edit as EditIcon, Info as InfoIcon, DateRange as CalendarIcon,
    LocationOn as LocationIcon, AttachMoney as BudgetIcon, People as PeopleIcon
} from '@mui/icons-material';

const EventApprovalWorkflow = () => {
    const { profile } = useAuthStore();
    const queryClient = useQueryClient();
    const [tabValue, setTabValue] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    // Fetch all events
    const { data: events, isLoading } = useQuery({
        queryKey: ['allEvents'],
        queryFn: async () => {
            const { data } = await supabase
                .from('events')
                .select(`
                    *,
                    clubs:club_id(id, name, coordinator_id),
                    profiles:created_by(id, full_name, avatar_url, email)
                `)
                .order('created_at', { ascending: false });
            return data || [];
        },
        enabled: profile?.role === 'admin'
    });

    // Separate events by status
    const pendingEvents = events?.filter(e => e.approval_status === 'pending') || [];
    const approvedEvents = events?.filter(e => e.approval_status === 'approved') || [];
    const rejectedEvents = events?.filter(e => e.approval_status === 'rejected') || [];

    // Approve event mutation
    const approveMutation = useMutation({
        mutationFn: async (eventId) => {
            const { error } = await supabase
                .from('events')
                .update({
                    approval_status: 'approved',
                    status: 'registration_open',
                    approved_by: profile?.id,
                    approved_at: new Date().toISOString(),
                    rejection_reason: null,
                    rejected_by: null,
                    rejected_at: null
                })
                .eq('id', eventId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allEvents'] });
        }
    });

    // Reject event mutation
    const rejectMutation = useMutation({
        mutationFn: async ({ eventId, reason }) => {
            const { error } = await supabase
                .from('events')
                .update({
                    approval_status: 'rejected',
                    rejection_reason: reason,
                    rejected_by: profile?.id,
                    rejected_at: new Date().toISOString()
                })
                .eq('id', eventId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allEvents'] });
            setOpenDialog(false);
            setRejectReason('');
            setSelectedEvent(null);
        }
    });

    const writeAuditLog = async ({ action, event }) => {
        await supabase.from('audit_logs').insert({
            actor_id: profile?.id,
            action,
            module: 'Event Approval',
            target_table: 'events',
            target_id: event.id,
            meta: {
                title: event.title,
                approval_status: event.approval_status,
                status: event.status
            }
        });
    };

    const handleRejectClick = (event) => {
        setSelectedEvent(event);
        setOpenDialog(true);
    };

    const handleRejectSubmit = () => {
        const reason = rejectReason?.trim() || 'Rejected by admin';
        rejectMutation.mutate(
            { eventId: selectedEvent.id, reason },
            {
                onSuccess: async () => {
                    await writeAuditLog({
                        action: 'reject_event',
                        event: { ...selectedEvent, approval_status: 'rejected', status: selectedEvent.status }
                    });
                }
            }
        );
    };

    const EventCard = ({ event }) => (
        <Card sx={{ mb: 2, '&:hover': { boxShadow: 3 } }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight="800" sx={{ mb: 0.5 }}>
                            {event.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <Chip label={event.category} size="small" color="primary" variant="outlined" />
                            <Chip label={event.mode} size="small" variant="outlined" />
                            {event.is_paid && <Chip label={`$${event.fee}`} size="small" color="success" />}
                        </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Avatar
                            src={event.profiles?.avatar_url}
                            sx={{ mb: 1, mx: 'auto', width: 40, height: 40 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {event.profiles?.full_name}
                        </Typography>
                    </Box>
                </Box>

                <Typography color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                    {event.description?.substring(0, 120)}...
                </Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary">Date</Typography>
                                <Typography variant="body2" fontWeight="600">
                                    {event.start_time ? new Date(event.start_time).toLocaleDateString() : 'TBD'}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PeopleIcon sx={{ fontSize: 20, color: 'secondary.main' }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary">Max</Typography>
                                <Typography variant="body2" fontWeight="600">
                                    {event.max_participants || '8'}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BudgetIcon sx={{ fontSize: 20, color: 'success.main' }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary">Budget</Typography>
                                <Typography variant="body2" fontWeight="600">
                                    ${event.budget_request || 0}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationIcon sx={{ fontSize: 20, color: 'error.main' }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary">Location</Typography>
                                <Typography variant="body2" fontWeight="600">
                                    {event.location?.substring(0, 12) || 'N/A'}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Club: <strong>{event.clubs?.name}</strong>
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<ApproveIcon />}
                        onClick={() => approveMutation.mutate(event.id, {
                            onSuccess: async () => {
                                await writeAuditLog({
                                    action: 'approve_event',
                                    event: { ...event, approval_status: 'approved', status: 'registration_open' }
                                });
                            }
                        })}
                        disabled={approveMutation.isPending}
                    >
                        Approve
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<RejectIcon />}
                        onClick={() => handleRejectClick(event)}
                        disabled={rejectMutation.isPending}
                    >
                        Reject
                    </Button>
                    <Tooltip title="View Details">
                        <IconButton size="small">
                            <InfoIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </CardContent>
        </Card>
    );

    if (!profile || profile.role !== 'admin') {
        return (
            <Alert severity="error">
                Only admins can access the event approval workflow.
            </Alert>
        );
    }

    if (isLoading) return <CircularProgress />;

    return (
        <Box sx={{ pb: 6 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="900" gutterBottom>
                    Event Approval Workflow
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Review and approve/reject club events before they go live.
                </Typography>

                <Tabs
                    value={tabValue}
                    onChange={(e, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
                >
                    <Tab label={`Pending (${pendingEvents.length})`} />
                    <Tab label={`Approved (${approvedEvents.length})`} />
                    <Tab label={`Rejected (${rejectedEvents.length})`} />
                </Tabs>
            </Box>

            {/* Pending Events Tab */}
            {tabValue === 0 && (
                <Box>
                    {pendingEvents.length === 0 ? (
                        <Alert severity="success">All event requests have been processed!</Alert>
                    ) : (
                        pendingEvents.map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))
                    )}
                </Box>
            )}

            {/* Approved Events Tab */}
            {tabValue === 1 && (
                <Box>
                    {approvedEvents.length === 0 ? (
                        <Alert severity="info">No approved events yet</Alert>
                    ) : (
                        approvedEvents.map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))
                    )}
                </Box>
            )}

            {/* Rejected Events Tab */}
            {tabValue === 2 && (
                <Box>
                    {rejectedEvents.length === 0 ? (
                        <Alert severity="info">No rejected events</Alert>
                    ) : (
                        rejectedEvents.map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))
                    )}
                </Box>
            )}

            {/* Rejection Reason Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Reject Event</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Rejecting event: <strong>{selectedEvent?.title}</strong>
                    </Typography>
                    <TextField
                        fullWidth
                        label="Rejection Reason"
                        multiline
                        rows={4}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explain why this event is being rejected..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleRejectSubmit}
                        disabled={rejectMutation.isPending}
                    >
                        Reject Event
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EventApprovalWorkflow;
