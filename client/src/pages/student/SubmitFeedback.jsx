import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Button,
    Paper,
    Rating,
    TextField,
    FormControlLabel,
    Checkbox,
    Stack,
} from '@mui/material';
import LoadingDots from '../../components/LoadingDots';
import { useSubmitFeedback, useCheckFeedback } from '../../hooks/useFeedback';
import { useEventById } from '../../hooks/useEventById';
import { useAuthStore } from '../../store/authStore';
import { useMyRegistrations } from '../../hooks/useMyRegistrations';
import RolePageHeader from '../../components/RolePageHeader';

const SubmitFeedback = () => {
    const { id: eventId } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();

    const { data: event, isLoading: eventLoading } = useEventById(eventId);
    const { registrations, isLoading: regsLoading } = useMyRegistrations();
    const { data: hasSubmitted, isLoading: checkLoading } = useCheckFeedback(eventId, user?.id);
    const submitMutation = useSubmitFeedback();

    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [anonymous, setAnonymous] = useState(false);

    // Check eligibility
    const myRegistration = registrations?.find(r => r.event_id === eventId);
    const isEligible = profile?.role === 'student' && myRegistration?.attendance_status === 'present';

    if (eventLoading || regsLoading || checkLoading) {
        return <LoadingDots label="Loading feedback form..." minHeight="30vh" />;
    }

    if (!isEligible) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Typography color="error" variant="h6">
                    You are not eligible to submit feedback for this event.
                    Only attendees can provide feedback.
                </Typography>
                <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Go Back</Button>
            </Container>
        );
    }

    if (hasSubmitted) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                        Your Feedback
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        {event?.title}
                    </Typography>
                    <Box sx={{ mt: 3, p: 3, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Rating value={hasSubmitted.rating} readOnly size="large" />
                        {hasSubmitted.comment && (
                            <Typography sx={{ mt: 2, fontStyle: 'italic', fontSize: '1.1rem' }}>
                                &quot;{hasSubmitted.comment}&quot;
                            </Typography>
                        )}
                        <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                            Submitted on {new Date(hasSubmitted.created_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {hasSubmitted.anonymous && ' • Anonymously'}
                        </Typography>
                    </Box>
                    <Button onClick={() => navigate(-1)} sx={{ mt: 4 }} variant="outlined">Go Back</Button>
                </Paper>
            </Container>
        );
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!rating) return;

        submitMutation.mutate({
            event_id: eventId,
            user_id: user.id,
            rating,
            comment,
            anonymous
        }, {
            onSuccess: () => {
                navigate(`/events/${eventId}`);
            }
        });
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <RolePageHeader
                title="Submit Feedback"
                subtitle="Share your experience and help improve future events."
            />
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Event Feedback
                </Typography>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    {event?.title}
                </Typography>

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }}>
                    <Stack spacing={4}>
                        <Box>
                            <Typography component="legend" variant="subtitle1" gutterBottom fontWeight="bold">
                                How would you rate this event?
                            </Typography>
                            <Rating
                                name="event-rating"
                                value={rating}
                                onChange={(_event, newValue) => {
                                    setRating(newValue);
                                }}
                                size="large"
                            />
                        </Box>

                        <TextField
                            label="Your Comments"
                            multiline
                            rows={4}
                            fullWidth
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Tell us what you liked or what we can improve..."
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={anonymous}
                                    onChange={(e) => setAnonymous(e.target.checked)}
                                />
                            }
                            label="Submit anonymously"
                        />

                        <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                            <Button
                                variant="contained"
                                size="large"
                                type="submit"
                                disabled={!rating || submitMutation.isPending}
                            >
                                {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                            </Button>
                            <Button variant="outlined" size="large" onClick={() => navigate(-1)}>
                                Cancel
                            </Button>
                        </Box>
                    </Stack>
                </Box>
            </Paper>
        </Container>
    );
};

export default SubmitFeedback;
