import { useState } from 'react';
import {
    Box, Typography, Button, Paper, Grid, Stepper, Step, StepLabel,
    StepContent, Alert, Avatar
} from '@mui/material';
import {
    CheckCircle as CheckIcon, QrCodeScanner as AttendanceIcon,
    EmojiEvents as ResultsIcon, WorkspacePremium as CertificateIcon,
    Archive as ArchiveIcon, Flag as FinalizeIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useEvent } from '../../hooks/useCoordinatorEvents';
import RolePageHeader from '../../components/RolePageHeader';
import { useUpdateEventStatus } from '../../hooks/useEvents';
import { toast } from 'sonner';
import AttendancePrediction from '../../components/ai/AttendancePrediction';
import FeedbackSentiment from '../../components/ai/FeedbackSentiment';
import LoadingDots from '../../components/LoadingDots';

const EventCompletion = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: event, isLoading } = useEvent(id || '');
    const updateEventStatus = useUpdateEventStatus();
    const [activeStep, setActiveStep] = useState(0);

    const handleComplete = async () => {
        try {
            await updateEventStatus.mutateAsync({ id, status: 'completed' });
            toast.success('Event officially marked as Completed!');
            navigate('/coordinator/events');
        } catch (error) {
            toast.error('Failed to finalize event');
            console.error(error);
        }
    };

    if (isLoading) return <LoadingDots label="Loading completion workflow..." minHeight="50vh" />;
    if (!event) return <Typography color="error" textAlign="center">Event not localized</Typography>;

    if (event.status === 'completed' || event.status === 'archived') {
        return (
            <Box maxWidth="md" mx="auto" sx={{ pt: 4, pb: 8 }}>
                <Alert severity="info" sx={{ borderRadius: '12px' }}>
                    <Typography fontWeight={700}>Node Finalized</Typography>
                    This event has already been marked as complete or archived. No further operational steps are required.
                </Alert>
                <Button variant="contained" onClick={() => navigate('/coordinator/events')} sx={{ mt: 3, fontWeight: 700 }}>
                    Return to Mission Control
                </Button>
            </Box>
        );
    }

    const steps = [
        {
            label: 'Reconcile Attendance',
            description: 'Ensure all physical or virtual check-ins are recorded to validate participation metrics.',
            icon: <AttendanceIcon />,
            action: () => navigate(`/coordinator/events/${id}/attendance`),
            btnText: 'Verify Attendance Logs',
            required: true
        }
    ];

    if (event.result_required) {
        steps.push({
            label: 'Publish Results',
            description: 'This event strictly requires competitive results to be uploaded before finalization.',
            icon: <ResultsIcon />,
            action: () => navigate(`/coordinator/events/${id}/results`),
            btnText: 'Declare Results',
            required: true
        });
    }

    if (event.certificate_enabled) {
        steps.push({
            label: 'Issue E-Certificates',
            description: 'Generate and route verifiable cryptographic certificates to valid participants.',
            icon: <CertificateIcon />,
            action: () => navigate(`/coordinator/events/${id}/certificates`),
            btnText: 'Launch Certificate Engine',
            required: false // certificates might be issued later, but highly recommended here
        });
    }

    steps.push({
        label: 'Finalize & Archive',
        description: 'Lock final changes, save the closing record, and formally complete the event.',
        icon: <ArchiveIcon />,
        action: handleComplete,
        btnText: 'Mark as Completed',
        isFinal: true
    });

    const handleNext = () => setActiveStep((prev) => prev + 1);
    const handleBack = () => setActiveStep((prev) => prev - 1);

    return (
        <Box maxWidth="md" mx="auto" sx={{ pb: 8 }}>
            <RolePageHeader
                kicker="Coordinator Dashboard"
                title="Event Completion"
                subtitle="Finalize attendance, results, and certificates."
            />
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FinalizeIcon color="primary" fontSize="large" />
                    Post-Event Execution Protocol
                </Typography>
                <Typography color="text.secondary" fontWeight={500}>
                    Follow the guided sequence to properly decommission and archive &quot;{event.title}&quot;.
                </Typography>
            </Box>

            {/* ── AI Insights Dashboard ── */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
                <AttendancePrediction eventId={id} />
                <FeedbackSentiment eventId={id} />
            </Box>

            <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: '24px', border: '1px solid', borderColor: 'divider', boxShadow: '0 12px 40px -12px rgba(0,0,0,0.1)' }}>
                <Stepper activeStep={activeStep} orientation="vertical">
                    {steps.map((step, index) => (
                        <Step key={step.label}>
                            <StepLabel
                                StepIconComponent={() => (
                                    <Avatar sx={{ bgcolor: activeStep === index ? 'primary.main' : activeStep > index ? 'success.main' : 'action.disabledBackground', width: 40, height: 40 }}>
                                        {activeStep > index ? <CheckIcon /> : step.icon}
                                    </Avatar>
                                )}
                            >
                                <Typography variant="h6" fontWeight={800} color={activeStep === index ? 'text.primary' : 'text.secondary'}>
                                    {step.label} {step.required && <Typography component="span" color="error" variant="caption" fontWeight={700} sx={{ ml: 1 }}>*REQUIRED</Typography>}
                                </Typography>
                            </StepLabel>
                            <StepContent>
                                <Typography color="text.secondary" sx={{ mb: 3, mt: 1 }}>{step.description}</Typography>
                                <Box sx={{ mb: 2 }}>
                                    <Grid container spacing={2}>
                                        <Grid item>
                                            <Button
                                                variant="contained"
                                                onClick={step.isFinal ? step.action : handleNext}
                                                sx={{ fontWeight: 800, borderRadius: '8px', px: 3, boxShadow: 'none' }}
                                                color={step.isFinal ? 'success' : 'primary'}
                                            >
                                                {step.isFinal ? step.btnText : 'Acknowledge & Continue'}
                                            </Button>
                                        </Grid>
                                        {!step.isFinal && (
                                            <Grid item>
                                                <Button
                                                    variant="outlined"
                                                    onClick={step.action}
                                                    sx={{ fontWeight: 700, borderRadius: '8px' }}
                                                >
                                                    {step.btnText}
                                                </Button>
                                            </Grid>
                                        )}
                                    </Grid>
                                    <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                                        <Button
                                            disabled={index === 0}
                                            onClick={handleBack}
                                            size="small"
                                            sx={{ fontWeight: 700, color: 'text.secondary' }}
                                        >
                                            Back
                                        </Button>
                                    </Box>
                                </Box>
                            </StepContent>
                        </Step>
                    ))}
                </Stepper>
            </Paper>
        </Box>
    );
};

export default EventCompletion;
