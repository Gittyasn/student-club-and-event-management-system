import { useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
    FormControl,
    FormControlLabel,
    FormHelperText,
    Grid,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import { CloudUpload as UploadIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useEventMutations } from '../../hooks/useEventMutations';
import { useEventCategories } from '../../hooks/useEvents';
import { useAuthStore } from '../../store/authStore';
import { useCoordinatorClub } from '../../hooks/useCoordinatorClub';
import RolePageHeader from '../../components/RolePageHeader';
import LoadingDots from '../../components/LoadingDots';

const eventSchema = z.object({
    title: z.string().min(3, 'Enter a title with at least 3 characters.'),
    short_description: z.string().min(10, 'Add a short summary with at least 10 characters.').max(200, 'Keep the short summary under 200 characters.'),
    description: z.string().min(10, 'Add a description with at least 10 characters.'),
    category_id: z.string().uuid('Select an event category.'),
    mode: z.enum(['online', 'offline', 'hybrid']),
    start_time: z.string().refine((value) => new Date(value) > new Date(), { message: 'Choose a future start time.' }),
    end_time: z.string().refine((value) => new Date(value) > new Date(), { message: 'Choose a future end time.' }),
    location: z.string().optional().or(z.literal('')),
    meeting_link: z.string().url('Enter a valid meeting link.').optional().or(z.literal('')),
    registration_deadline: z.string(),
    max_participants: z.number().min(1, 'Maximum participants must be at least 1.'),
    allow_waitlist: z.boolean().default(false),
    visibility: z.enum(['public', 'members_only', 'private', 'hidden']),
    requires_membership: z.boolean().default(false),
    certificate_enabled: z.boolean().default(false),
    result_required: z.boolean().default(false),
    rank_based_certificates: z.boolean().default(false),
    budget_requested: z.number().min(0, 'Budget cannot be negative.').optional().default(0),
    expense_estimate: z.number().min(0, 'Estimated expense cannot be negative.').optional().default(0),
    event_type: z.enum(['normal', 'hackathon']).default('normal'),
    min_team_size: z.number().min(1, 'Minimum team size must be at least 1.').max(10, 'Minimum team size cannot exceed 10.').default(1),
    max_team_size: z.number().min(1, 'Maximum team size must be at least 1.').max(20, 'Maximum team size cannot exceed 20.').default(5),
}).refine((data) => new Date(data.start_time) < new Date(data.end_time), {
    message: 'End time must be after the start time.',
    path: ['end_time'],
}).refine((data) => new Date(data.registration_deadline) < new Date(data.start_time), {
    message: 'Registration must close before the event starts.',
    path: ['registration_deadline'],
}).refine((data) => {
    if ((data.mode === 'online' || data.mode === 'hybrid') && !data.meeting_link) return false;
    return true;
}, {
    message: 'Add a meeting link for online or hybrid events.',
    path: ['meeting_link'],
}).refine((data) => {
    if ((data.mode === 'offline' || data.mode === 'hybrid') && !data.location) return false;
    return true;
}, {
    message: 'Add a location for offline or hybrid events.',
    path: ['location'],
}).refine((data) => {
    if (data.event_type !== 'hackathon') return true;
    return data.min_team_size <= data.max_team_size;
}, {
    message: 'Minimum team size cannot be greater than maximum team size.',
    path: ['max_team_size'],
});

const Section = ({ title, description, children, defaultExpanded = false }) => (
    <Accordion defaultExpanded={defaultExpanded} disableGutters sx={{ borderRadius: '18px !important', border: '1px solid', borderColor: 'divider', boxShadow: 'none', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box>
                <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1rem' }}>
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {description}
                </Typography>
            </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
            {children}
        </AccordionDetails>
    </Accordion>
);

const CreateEvent = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { createEvent, uploadPoster } = useEventMutations();
    const { data: categories, isLoading: categoriesLoading } = useEventCategories();
    const { data: coordinatorClub, isLoading: clubLoading } = useCoordinatorClub();

    const [uploading, setUploading] = useState(false);
    const [posterFile, setPosterFile] = useState(null);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(eventSchema),
        defaultValues: {
            mode: 'offline',
            category_id: '',
            max_participants: 100,
            allow_waitlist: true,
            visibility: 'public',
            requires_membership: false,
            certificate_enabled: false,
            result_required: false,
            rank_based_certificates: false,
            budget_requested: 0,
            expense_estimate: 0,
            event_type: 'normal',
            min_team_size: 1,
            max_team_size: 5,
        }
    });

    // eslint-disable-next-line react-hooks/incompatible-library
    const currentMode = watch('mode');
    const isCertEnabled = watch('certificate_enabled');
    const currentEventType = watch('event_type');

    const handleFileChange = (event) => {
        if (event.target.files?.[0]) {
            setPosterFile(event.target.files[0]);
        }
    };

    const onSubmit = async (data, isDraft = false) => {
        if (!coordinatorClub?.id || !user?.id) {
            toast.error('Missing club or user details. Please sign in again.');
            return;
        }

        try {
            let posterUrl = null;

            if (posterFile) {
                setUploading(true);
                posterUrl = await uploadPoster(posterFile);
                setUploading(false);
            }

            createEvent.mutate({
                title: data.title,
                short_description: data.short_description,
                description: data.description,
                category_id: data.category_id,
                mode: data.mode,
                start_time: new Date(data.start_time).toISOString(),
                end_time: new Date(data.end_time).toISOString(),
                location: data.location || null,
                meeting_link: data.meeting_link || null,
                registration_deadline: new Date(data.registration_deadline).toISOString(),
                max_participants: data.max_participants,
                allow_waitlist: data.allow_waitlist,
                visibility: data.visibility,
                requires_membership: data.requires_membership,
                certificate_enabled: data.certificate_enabled,
                result_required: data.result_required,
                rank_based_certificates: data.rank_based_certificates,
                budget_requested: data.budget_requested,
                expense_estimate: data.expense_estimate,
                event_type: data.event_type,
                min_team_size: data.event_type === 'hackathon' ? data.min_team_size : 1,
                max_team_size: data.event_type === 'hackathon' ? data.max_team_size : 1,
                poster_url: posterUrl || undefined,
                approval_status: isDraft ? 'draft' : 'pending',
                status: isDraft ? 'draft' : 'pending',
                submitted_at: isDraft ? null : new Date().toISOString(),
                club_id: coordinatorClub.id,
                created_by: user.id,
            }, {
                onSuccess: () => navigate('/coordinator/events')
            });
        } catch (error) {
            console.error(error);
            setUploading(false);
            toast.error(error.message || 'Failed to create event.');
        }
    };

    if (clubLoading) {
        return <LoadingDots label="Loading club..." minHeight="40vh" />;
    }

    if (!coordinatorClub?.id) {
        return <Typography color="error">Your coordinator account is not linked to a club.</Typography>;
    }

    return (
        <Box maxWidth="lg" mx="auto" sx={{ pb: 14 }}>
            <RolePageHeader
                kicker="Coordinator"
                title="Create Event"
                subtitle="Prepare the event details, save a draft, or send it for approval."
            />

            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>
                        New Event
                    </Typography>
                    <Typography color="text.secondary">
                        Use short, clear language so students know what the event is and how to join.
                    </Typography>
                </Box>
                <Chip label="Draft not submitted" variant="outlined" sx={{ fontWeight: 700 }} />
            </Box>

            <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
                Keep descriptions short and practical. Detailed instructions can go in the full event description.
            </Alert>

            <form id="event-form" onSubmit={handleSubmit((data) => onSubmit(data, false))}>
                <Stack spacing={2.5}>
                    <Section title="Basics" description="Main event details students will see first." defaultExpanded>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    variant="filled"
                                    label="Event title"
                                    placeholder="Example: Robotics Workshop"
                                    {...register('title')}
                                    error={!!errors.title}
                                    helperText={errors.title?.message}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    variant="filled"
                                    label="Short summary"
                                    placeholder="One short sentence for cards and search results."
                                    {...register('short_description')}
                                    error={!!errors.short_description}
                                    helperText={errors.short_description?.message}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    variant="filled"
                                    multiline
                                    rows={5}
                                    label="Full description"
                                    placeholder="Share the agenda, speakers, requirements, and what students will take away."
                                    {...register('description')}
                                    error={!!errors.description}
                                    helperText={errors.description?.message}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth variant="filled" error={!!errors.category_id} disabled={categoriesLoading}>
                                    <InputLabel>Category</InputLabel>
                                    <Select {...register('category_id')} defaultValue="" sx={{ borderRadius: 2 }}>
                                        <MenuItem value="" disabled>Select a category</MenuItem>
                                        {categories?.map((category) => (
                                            <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>
                                        ))}
                                    </Select>
                                    {errors.category_id ? <FormHelperText>{errors.category_id.message}</FormHelperText> : null}
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <FormControl fullWidth variant="filled">
                                    <InputLabel>Mode</InputLabel>
                                    <Select defaultValue="offline" {...register('mode')} sx={{ borderRadius: 2 }}>
                                        <MenuItem value="offline">Offline</MenuItem>
                                        <MenuItem value="online">Online</MenuItem>
                                        <MenuItem value="hybrid">Hybrid</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <FormControl fullWidth variant="filled">
                                    <InputLabel>Event type</InputLabel>
                                    <Select defaultValue="normal" {...register('event_type')} sx={{ borderRadius: 2 }}>
                                        <MenuItem value="normal">Standard event</MenuItem>
                                        <MenuItem value="hackathon">Hackathon</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <Paper
                                    component="label"
                                    variant="outlined"
                                    sx={{
                                        p: 2.5,
                                        display: 'block',
                                        borderRadius: 3,
                                        border: '1px dashed',
                                        borderColor: 'divider',
                                        cursor: 'pointer',
                                        bgcolor: 'action.hover',
                                        '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.main' + '08' },
                                    }}
                                >
                                    <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <UploadIcon color="primary" />
                                        </Box>
                                        <Box>
                                            <Typography fontWeight={700}>
                                                {posterFile ? posterFile.name : 'Upload event poster'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Optional. Use a clear image for event listings and approval review.
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Section>

                    <Section title="Schedule" description="Set the event timing and how students will attend.">
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    type="datetime-local"
                                    variant="filled"
                                    label="Start time"
                                    InputLabelProps={{ shrink: true }}
                                    {...register('start_time')}
                                    error={!!errors.start_time}
                                    helperText={errors.start_time?.message}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    type="datetime-local"
                                    variant="filled"
                                    label="End time"
                                    InputLabelProps={{ shrink: true }}
                                    {...register('end_time')}
                                    error={!!errors.end_time}
                                    helperText={errors.end_time?.message}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    type="datetime-local"
                                    variant="filled"
                                    label="Registration deadline"
                                    InputLabelProps={{ shrink: true }}
                                    {...register('registration_deadline')}
                                    error={!!errors.registration_deadline}
                                    helperText={errors.registration_deadline?.message}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            {(currentMode === 'offline' || currentMode === 'hybrid') ? (
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        variant="filled"
                                        label="Location"
                                        placeholder="Example: Main auditorium"
                                        {...register('location')}
                                        error={!!errors.location}
                                        helperText={errors.location?.message}
                                        InputProps={{ sx: { borderRadius: 2 } }}
                                    />
                                </Grid>
                            ) : null}
                            {(currentMode === 'online' || currentMode === 'hybrid') ? (
                                <Grid item xs={12} md={currentMode === 'hybrid' ? 6 : 12}>
                                    <TextField
                                        fullWidth
                                        variant="filled"
                                        label="Meeting link"
                                        placeholder="https://..."
                                        {...register('meeting_link')}
                                        error={!!errors.meeting_link}
                                        helperText={errors.meeting_link?.message}
                                        InputProps={{ sx: { borderRadius: 2 } }}
                                    />
                                </Grid>
                            ) : null}
                        </Grid>
                    </Section>

                    <Section title="Registration" description="Control capacity, access, and budget details.">
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    variant="filled"
                                    label="Maximum participants"
                                    {...register('max_participants', { valueAsNumber: true })}
                                    error={!!errors.max_participants}
                                    helperText={errors.max_participants?.message}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth variant="filled" error={!!errors.visibility}>
                                    <InputLabel>Visibility</InputLabel>
                                    <Select defaultValue="public" {...register('visibility')} sx={{ borderRadius: 2 }}>
                                        <MenuItem value="public">Public</MenuItem>
                                        <MenuItem value="members_only">Members only</MenuItem>
                                        <MenuItem value="private">Private</MenuItem>
                                        <MenuItem value="hidden">Hidden</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Stack spacing={1.25} sx={{ pt: 1 }}>
                                    <FormControlLabel
                                        control={<Switch {...register('allow_waitlist')} color="primary" />}
                                        label={<Typography fontWeight={600}>Allow waitlist</Typography>}
                                    />
                                    <FormControlLabel
                                        control={<Switch {...register('requires_membership')} color="primary" />}
                                        label={<Typography fontWeight={600}>Require club membership</Typography>}
                                    />
                                </Stack>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    variant="filled"
                                    label="Budget requested"
                                    {...register('budget_requested', { valueAsNumber: true })}
                                    error={!!errors.budget_requested}
                                    helperText={errors.budget_requested?.message || 'Optional'}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                                        sx: { borderRadius: 2 },
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    variant="filled"
                                    label="Estimated expense"
                                    {...register('expense_estimate', { valueAsNumber: true })}
                                    error={!!errors.expense_estimate}
                                    helperText={errors.expense_estimate?.message || 'Optional'}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                                        sx: { borderRadius: 2 },
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </Section>

                    <Section title="Certificates and Results" description="Turn on results and certificates only when the event needs them.">
                        <Stack spacing={1.5}>
                            <FormControlLabel
                                control={<Switch {...register('result_required')} color="primary" />}
                                label={<Typography fontWeight={600}>Publish results after the event</Typography>}
                            />
                            <FormControlLabel
                                control={<Switch {...register('certificate_enabled')} color="primary" />}
                                label={<Typography fontWeight={600}>Issue certificates</Typography>}
                            />
                            {isCertEnabled ? (
                                <FormControlLabel
                                    control={<Switch {...register('rank_based_certificates')} color="primary" />}
                                    label={<Typography fontWeight={600}>Limit certificates by rank</Typography>}
                                />
                            ) : null}
                        </Stack>
                    </Section>

                    <Section title="Team Settings" description="Use these settings only for team-based hackathons.">
                        {currentEventType === 'hackathon' ? (
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        variant="filled"
                                        label="Minimum team size"
                                        {...register('min_team_size', { valueAsNumber: true })}
                                        error={!!errors.min_team_size}
                                        helperText={errors.min_team_size?.message}
                                        InputProps={{ sx: { borderRadius: 2 } }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        variant="filled"
                                        label="Maximum team size"
                                        {...register('max_team_size', { valueAsNumber: true })}
                                        error={!!errors.max_team_size}
                                        helperText={errors.max_team_size?.message}
                                        InputProps={{ sx: { borderRadius: 2 } }}
                                    />
                                </Grid>
                            </Grid>
                        ) : (
                            <Alert severity="info" sx={{ borderRadius: 3 }}>
                                Team settings are only needed when the event type is set to hackathon.
                            </Alert>
                        )}
                    </Section>
                </Stack>
            </form>

            <Paper
                elevation={4}
                sx={{
                    position: 'sticky',
                    bottom: 16,
                    mt: 3,
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 10,
                }}
            >
                <Box>
                    <Typography fontWeight={800}>Ready to continue?</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Save a draft if you are still collecting details, or submit when the event is ready for review.
                    </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                        variant="outlined"
                        onClick={handleSubmit((data) => onSubmit(data, true))}
                        disabled={isSubmitting || uploading}
                        sx={{ fontWeight: 700, minWidth: 150 }}
                    >
                        Save Draft
                    </Button>
                    <Button
                        form="event-form"
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting || uploading}
                        sx={{ fontWeight: 800, minWidth: 190 }}
                    >
                        {isSubmitting || uploading ? <LoadingDots inline size={5} color="currentColor" /> : 'Submit for Approval'}
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
};

export default CreateEvent;
