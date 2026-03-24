// eslint-disable-next-line no-unused-vars
import React from 'react';
// eslint-disable-next-line no-unused-vars
import { Box, Typography, Paper, Grid, Card, CardContent, CircularProgress, Chip, Stack, Button, IconButton } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { Edit as EditIcon, PendingActions, FactCheck, Rule, Warning } from '@mui/icons-material';
import RolePageHeader from '../../components/RolePageHeader';
import { useNavigate } from 'react-router-dom';

const MySubmissions = () => {
    const { profile } = useAuthStore();
    const navigate = useNavigate();

    // Fetch only pending and rejected events for the coordinator's club
    const { data: submissions, isLoading } = useQuery({
        queryKey: ['my_submissions', profile?.club_id],
        queryFn: async () => {
            if (!profile?.club_id) return [];
            const { data, error } = await supabase
                .from('events')
                .select('id, title, status, submitted_at, rejected_at, rejection_reason, resubmission_count, start_time')
                .eq('club_id', profile.club_id)
                .in('status', ['pending', 'rejected'])
                .order('submitted_at', { ascending: false, nullsFirst: false });
            if (error) throw error;
            return data;
        },
        enabled: !!profile?.club_id
    });

    if (isLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

    const pendingList = submissions?.filter(s => s.status === 'pending') || [];
    const rejectedList = submissions?.filter(s => s.status === 'rejected') || [];

    return (
        <Box sx={{ pb: 6 }}>
            <RolePageHeader
                kicker="Coordinator Suite"
                title="My Submissions"
                subtitle="Track approval status and admin feedback."
            />
            <Box sx={{
                mb: 4, p: 4, borderRadius: '20px',
                background: 'linear-gradient(135deg, #f59e0b15 0%, #3b82f610 100%)',
                border: '1px solid #f59e0b30',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2
            }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>Governance Pipeline</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Monitor pending authorizations and address administrative rejections.
                    </Typography>
                </Box>
                <Chip
                    icon={<Rule fontSize="small" />}
                    label={`${submissions?.length || 0} Actionable`}
                    color="primary"
                    sx={{ fontWeight: 800, px: 1 }}
                />
            </Box>

            <Grid container spacing={4}>
                {/* Rejected Revisions Needs fixing */}
                <Grid item xs={12} md={6}>
                    <Typography variant="h6" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                        <FactCheck /> Requires Revision ({rejectedList.length})
                    </Typography>
                    {rejectedList.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px', bgcolor: 'transparent', border: '1px dashed', borderColor: 'divider' }}>
                            <Typography color="text.secondary" fontWeight={600}>No rejected events. Excellent work!</Typography>
                        </Paper>
                    ) : (
                        <Stack spacing={2}>
                            {rejectedList.map(event => (
                                <Card key={event.id} sx={{ borderRadius: '16px', border: '1px solid #ef444450', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.05)' }}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                            <Typography variant="subtitle1" fontWeight={800}>{event.title}</Typography>
                                            <Chip label="Rejected" color="error" size="small" sx={{ fontWeight: 800 }} />
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                                            Rejected on {new Date(event.rejected_at).toLocaleString()}
                                        </Typography>

                                        <Box sx={{ p: 2, bgcolor: '#ef444410', borderRadius: '8px', mb: 3 }}>
                                            <Typography variant="caption" fontWeight={800} color="error.main" display="flex" alignItems="center" gap={0.5}>
                                                <Warning fontSize="inherit" /> Administrative Feedback
                                            </Typography>
                                            <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                                                &quot;{event.rejection_reason}&quot;
                                            </Typography>
                                        </Box>

                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                                Resubmissions: {event.resubmission_count}
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                startIcon={<EditIcon />}
                                                sx={{ fontWeight: 800, borderRadius: '8px' }}
                                                onClick={() => navigate(`/coordinator/events/${event.id}/edit`)}
                                            >
                                                Fix & Resubmit
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    )}
                </Grid>

                {/* Pending Verification */}
                <Grid item xs={12} md={6}>
                    <Typography variant="h6" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
                        <PendingActions /> Pending Verification ({pendingList.length})
                    </Typography>
                    {pendingList.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px', bgcolor: 'transparent', border: '1px dashed', borderColor: 'divider' }}>
                            <Typography color="text.secondary" fontWeight={600}>No pending authorizations.</Typography>
                        </Paper>
                    ) : (
                        <Stack spacing={2}>
                            {pendingList.map(event => (
                                <Card key={event.id} sx={{ borderRadius: '16px', border: '1px solid #f59e0b50', boxShadow: '0 4px 20px rgba(245, 158, 11, 0.05)' }}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                            <Typography variant="subtitle1" fontWeight={800}>{event.title}</Typography>
                                            <Chip label="In Review" color="warning" size="small" sx={{ fontWeight: 800 }} />
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Submitted on {event.submitted_at ? new Date(event.submitted_at).toLocaleString() : 'Recently'}
                                        </Typography>

                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                            <Typography variant="caption" fontWeight={600} color="text.secondary">
                                                Event Start: {new Date(event.start_time).toLocaleDateString()}
                                            </Typography>
                                            <Button size="small" disabled sx={{ fontWeight: 700 }}>
                                                Locked
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};

export default MySubmissions;
