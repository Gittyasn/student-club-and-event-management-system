import { useMemo } from 'react';
import { Alert, Box, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import { History, LocationOn, MonetizationOn, VerifiedUser } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import LoadingDots from '../../components/LoadingDots';

const formatMoney = (value) => `Rs. ${(Number(value) || 0).toLocaleString('en-IN')}`;

const ApprovalDetails = ({ event }) => {
    const { data: clubHistory, isLoading } = useQuery({
        queryKey: ['clubApprovalHistory', event.club_id, event.id],
        enabled: !!event.club_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select('status, approval_status, max_participants, registrations:registrations(count)')
                .eq('club_id', event.club_id)
                .neq('id', event.id);

            if (error) throw error;
            return data || [];
        }
    });

    const metrics = useMemo(() => {
        if (!clubHistory) return null;

        const previousRejections = clubHistory.filter((item) => item.approval_status === 'rejected').length;
        const cancellations = clubHistory.filter((item) => item.status === 'cancelled').length;
        const completedEvents = clubHistory.filter((item) => ['completed', 'archived'].includes(item.status)).length;

        let totalCapacity = 0;
        let totalRegistrations = 0;

        clubHistory.forEach((item) => {
            if (['completed', 'archived'].includes(item.status)) {
                totalCapacity += item.max_participants || 0;
                totalRegistrations += item.registrations?.[0]?.count || 0;
            }
        });

        const turnoutRate = totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0;
        const risk = previousRejections > 2 || cancellations > 1 || event.resubmission_count > 1
            ? { label: 'High', color: 'error' }
            : previousRejections > 0 || cancellations > 0 || event.resubmission_count > 0
                ? { label: 'Medium', color: 'warning' }
                : { label: 'Low', color: 'success' };

        return {
            previousRejections,
            cancellations,
            completedEvents,
            turnoutRate,
            risk,
        };
    }, [clubHistory, event.resubmission_count]);

    return (
        <Stack spacing={2}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VerifiedUser fontSize="small" />
                        Review summary
                    </Typography>
                    {isLoading ? <LoadingDots inline size={5} color="currentColor" /> : (
                        <Chip
                            label={`Risk: ${metrics?.risk.label || 'Low'}`}
                            color={metrics?.risk.color || 'success'}
                            size="small"
                            sx={{ fontWeight: 800 }}
                        />
                    )}
                </Box>

                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Stack spacing={1.25}>
                            <Typography variant="body2" fontWeight={700}>
                                Description
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {event.description || event.short_description || 'No description provided.'}
                            </Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ mt: 1 }}>
                                Student access
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip label={`Visibility: ${String(event.visibility || 'public').replace(/_/g, ' ')}`} size="small" variant="outlined" />
                                <Chip label={event.requires_membership ? 'Club members only' : 'Open registration'} size="small" variant="outlined" />
                                <Chip label={event.allow_waitlist ? 'Waitlist enabled' : 'No waitlist'} size="small" variant="outlined" />
                            </Stack>
                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Stack spacing={1.25}>
                            <Typography variant="body2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationOn fontSize="small" />
                                Delivery details
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {event.location || 'No location added'}
                            </Typography>
                            {event.meeting_link ? (
                                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                                    {event.meeting_link}
                                </Typography>
                            ) : null}

                            <Typography variant="body2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <MonetizationOn fontSize="small" />
                                Budget
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Requested: {formatMoney(event.budget_requested)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Estimated expense: {formatMoney(event.expense_estimate)}
                            </Typography>
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <History fontSize="small" />
                    Club track record
                </Typography>

                {isLoading ? (
                    <LoadingDots label="Loading club history..." minHeight="96px" />
                ) : (
                    <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary">Completed events</Typography>
                            <Typography variant="h5" fontWeight={900}>{metrics?.completedEvents || 0}</Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary">Average turnout</Typography>
                            <Typography variant="h5" fontWeight={900}>{metrics?.turnoutRate || 0}%</Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary">Previous rejections</Typography>
                            <Typography variant="h5" fontWeight={900}>{metrics?.previousRejections || 0}</Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary">Cancellations</Typography>
                            <Typography variant="h5" fontWeight={900}>{metrics?.cancellations || 0}</Typography>
                        </Grid>
                    </Grid>
                )}

                {event.resubmission_count > 0 ? (
                    <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                        This event has been submitted {event.resubmission_count} time(s). Review the latest changes carefully.
                    </Alert>
                ) : null}
            </Paper>
        </Stack>
    );
};

export default ApprovalDetails;
