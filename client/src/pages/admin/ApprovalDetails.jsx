// eslint-disable-next-line no-unused-vars
import React, { useMemo } from 'react';
import { Box, Typography, Grid, Stack, Chip, CircularProgress, Alert } from '@mui/material';
import { LocationOn, EventNote, MonetizationOn, Warning, VerifiedUser, History } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';

const ApprovalDetails = ({ event }) => {
    // Fetch club historical performance to assess risk
    const { data: clubHistory, isLoading } = useQuery({
        queryKey: ['club_risk_history', event.club_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select('status, max_participants, registrations:registrations(count)')
                .eq('club_id', event.club_id)
                .neq('id', event.id);
            if (error) throw error;
            return data || [];
        },
        enabled: !!event.club_id
    });

    const metrics = useMemo(() => {
        if (!clubHistory) return null;

        const totalPast = clubHistory.length;
        const rejectedPast = clubHistory.filter(e => e.status === 'rejected').length;
        const cancelledPast = clubHistory.filter(e => e.status === 'cancelled').length;
        const completedPast = clubHistory.filter(e => e.status === 'completed' || e.status === 'archived').length;

        let totalCapacity = 0;
        let totalTurnout = 0;

        clubHistory.forEach(e => {
            if (e.status === 'completed' || e.status === 'archived') {
                totalCapacity += (e.max_participants || 100);
                totalTurnout += (e.registrations?.[0]?.count || 0);
            }
        });

        const turnoutRate = totalCapacity > 0 ? Math.round((totalTurnout / totalCapacity) * 100) : 0;

        let riskLevel = 'Low';
        let riskColor = 'success';
        if (rejectedPast > 2 || turnoutRate < 30 || event.resubmission_count > 1) {
            riskLevel = 'High';
            riskColor = 'error';
        } else if (rejectedPast > 0 || turnoutRate < 60 || event.resubmission_count > 0 || cancelledPast > 0) {
            riskLevel = 'Moderate';
            riskColor = 'warning';
        }

        return { totalPast, rejectedPast, cancelledPast, completedPast, turnoutRate, riskLevel, riskColor };
    }, [clubHistory, event.resubmission_count]);

    return (
        <Box sx={{ p: 4, mb: 2, mx: 2, bgcolor: 'background.default', borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1rem', color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VerifiedUser fontSize="small" /> Deep Inspection & Risk Analysis
                </Typography>

                {isLoading ? <CircularProgress size={20} /> : (
                    <Chip
                        icon={<Warning fontSize="small" />}
                        label={`Risk Level: ${metrics?.riskLevel}`}
                        color={metrics?.riskColor}
                        size="small"
                        sx={{ fontWeight: 800 }}
                    />
                )}
            </Box>

            <Grid container spacing={4}>
                {/* Logistics Column */}
                <Grid item xs={12} md={4}>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="flex" alignItems="center" gap={1}>
                                <LocationOn fontSize="small" /> Logistics Protocol
                            </Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>Location: {event.location || 'Not Specified'}</Typography>
                            <Typography variant="body2" fontWeight={600}>Link: {event.meeting_link || 'Not Applicable'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="flex" alignItems="center" gap={1}>
                                <EventNote fontSize="small" /> Scale & Capacity Guard
                            </Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>Target Audience: {event.max_participants || 'Unlimited'}</Typography>
                            <Typography variant="body2" fontWeight={600}>Waitlisting: {event.allow_waitlist ? 'Enabled (Auto-Queuing)' : 'Disabled'}</Typography>
                        </Box>
                    </Stack>
                </Grid>

                {/* Financial Overlay */}
                <Grid item xs={12} md={4}>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="flex" alignItems="center" gap={1}>
                                <MonetizationOn fontSize="small" /> Audited Financials
                            </Typography>
                            <Box sx={{ mt: 1, p: 2, bgcolor: 'rgba(245,158,11,0.1)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <Grid container spacing={1}>
                                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Projected Expense:</Typography></Grid>
                                    <Grid item xs={6} textAlign="right"><Typography variant="body2" fontWeight={800}>?{event.expense_estimate || 0}</Typography></Grid>
                                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Budget Requested:</Typography></Grid>
                                    <Grid item xs={6} textAlign="right"><Typography variant="body2" fontWeight={800} color="warning.main">?{event.budget_requested || 0}</Typography></Grid>
                                </Grid>
                            </Box>

                            <Stack spacing={1} sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>System Configuration</Typography>
                                <Chip label={`Visibility: ${event.visibility}`} size="small" variant="outlined" />
                                <Chip label={event.requires_membership ? 'Members Only' : 'Open Access'} size="small" variant="outlined" color={event.requires_membership ? 'secondary' : 'default'} />
                            </Stack>
                        </Box>
                    </Stack>
                </Grid>

                {/* Historical Performance */}
                <Grid item xs={12} md={4}>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="flex" alignItems="center" gap={1}>
                                <History fontSize="small" /> Organizer Track Record
                            </Typography>

                            {isLoading ? (
                                <CircularProgress size={20} sx={{ mt: 2 }} />
                            ) : (
                                <Box sx={{ mt: 1 }}>
                                    {event.resubmission_count > 0 && (
                                        <Alert severity="warning" sx={{ mb: 2, py: 0, px: 2, '& .MuiAlert-message': { fontSize: '0.75rem', fontWeight: 700 } }}>
                                            Resubmitted {event.resubmission_count} time(s). Check revisions carefully.
                                        </Alert>
                                    )}
                                    <Stack spacing={1}>
                                        <Grid container justifyContent="space-between">
                                            <Typography variant="caption" color="text.secondary">Historical Turnout:</Typography>
                                            <Typography variant="body2" fontWeight={800} color={metrics?.turnoutRate > 70 ? 'success.main' : 'text.primary'}>
                                                {metrics?.turnoutRate || 0}%
                                            </Typography>
                                        </Grid>
                                        <Grid container justifyContent="space-between">
                                            <Typography variant="caption" color="text.secondary">Past Cancellations:</Typography>
                                            <Typography variant="body2" fontWeight={800} color={metrics?.cancelledPast > 0 ? 'error.main' : 'text.primary'}>
                                                {metrics?.cancelledPast}
                                            </Typography>
                                        </Grid>
                                        <Grid container justifyContent="space-between">
                                            <Typography variant="caption" color="text.secondary">Previous Rejections:</Typography>
                                            <Typography variant="body2" fontWeight={800} color={metrics?.rejectedPast > 0 ? 'warning.main' : 'text.primary'}>
                                                {metrics?.rejectedPast}
                                            </Typography>
                                        </Grid>
                                        <Grid container justifyContent="space-between">
                                            <Typography variant="caption" color="text.secondary">Success Target:</Typography>
                                            <Typography variant="body2" fontWeight={800}>
                                                {metrics?.completedPast} events
                                            </Typography>
                                        </Grid>
                                    </Stack>
                                </Box>
                            )}
                        </Box>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ApprovalDetails;
