import { useEffect, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    AlertTitle,
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
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useEventMutations } from '../../hooks/useEventMutations';
import { useEvent } from '../../hooks/useCoordinatorEvents';
import { useEventCategories } from '../../hooks/useEvents';
import RolePageHeader from '../../components/RolePageHeader';
import LoadingDots from '../../components/LoadingDots';

const eventSchema = z.object({
    title: z.string().min(3, 'Enter a title with at least 3 characters.'),
    short_description: z.string().min(10, 'Add a short summary with at least 10 characters.').max(200, 'Keep the short summary under 200 characters.'),
    description: z.string().min(10, 'Add a description with at least 10 characters.'),
    category_id: z.string().uuid('Select an event category.'),
    mode: z.enum(['online', 'offline', 'hybrid']),
    start_time: z.string().min(1, 'Choose a start time.'),
    end_time: z.string().min(1, 'Choose an end time.'),
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
    status: z.enum(['draft', 'pending', 'approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'archived']).default('draft'),
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
                <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1rem' }}>{title}</Typography>
                <Typography variant="body2" color="text.secondary">{description}</Typography>
            </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>{children}</AccordionDetails>
    </Accordion>
);

const EditEvent = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: event, isLoading: isLoadingEvent } = useEvent(id || '');
    const { updateEvent, uploadPoster } = useEventMutations();
    const { data: categories, isLoading: categoriesLoading } = useEventCategories();
    const [uploading, setUploading] = useState(false);
    const [posterFile, setPosterFile] = useState(null);

    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(eventSchema)
    });

    // eslint-disable-next-line react-hooks/incompatible-library
    const currentMode = watch('mode');
    const isCertEnabled = watch('certificate_enabled');
    const currentEventType = watch('event_type');

    useEffect(() => {
        if (!event) return;
        setValue('title', event.title || '');
        setValue('short_description', event.short_description || '');
        setValue('description', event.description || '');
        setValue('category_id', event.category_id || '');
        setValue('mode', event.mode || 'offline');
        setValue('location', event.location || '');
        setValue('meeting_link', event.meeting_link || '');
        setValue('max_participants', event.max_participants || 100);
        setValue('allow_waitlist', !!event.allow_waitlist);
        setValue('visibility', event.visibility || 'public');
        setValue('requires_membership', !!event.requires_membership);
        setValue('certificate_enabled', !!event.certificate_enabled);
        setValue('result_required', !!event.result_required);
        setValue('rank_based_certificates', !!event.rank_based_certificates);
        setValue('budget_requested', Number(event.budget_requested) || 0);
        setValue('expense_estimate', Number(event.expense_estimate) || 0);
        setValue('event_type', event.event_type || 'normal');
        setValue('min_team_size', Number(event.min_team_size) || 1);
        setValue('max_team_size', Number(event.max_team_size) || 5);
        setValue('status', event.status || 'draft');
        if (event.start_time) setValue('start_time', new Date(event.start_time).toISOString().slice(0, 16));
        if (event.end_time) setValue('end_time', new Date(event.end_time).toISOString().slice(0, 16));
        if (event.registration_deadline) setValue('registration_deadline', new Date(event.registration_deadline).toISOString().slice(0, 16));
    }, [event, setValue]);

    const handleFileChange = (targetEvent) => {
        if (targetEvent.target.files?.[0]) setPosterFile(targetEvent.target.files[0]);
    };

    const onSubmit = async (data, isSubmitForApproval = false) => {
        if (!id) return;

        try {
            let posterUrl = event?.poster_url;
            if (posterFile) {
                setUploading(true);
                posterUrl = await uploadPoster(posterFile);
                setUploading(false);
            }

            const updates = {
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
            };

            if (isSubmitForApproval) {
                updates.status = 'pending';
                if (event.approval_status === 'rejected') updates.resubmission_count = (event.resubmission_count || 0) + 1;
            }

            updateEvent.mutate({ id, updates }, {
                onSuccess: () => navigate('/coordinator/events')
            });
        } catch (error) {
            console.error(error);
            setUploading(false);
            toast.error(error.message || 'Failed to update event.');
        }
    };

    if (isLoadingEvent) return <LoadingDots label="Loading event..." minHeight="50vh" />;
    if (!event) return <Typography color="error" textAlign="center">Event not found.</Typography>;

    return (
        <Box maxWidth="lg" mx="auto" sx={{ pb: 14 }}>
            <RolePageHeader kicker="Coordinator" title="Edit Event" subtitle="Update the details, keep a draft, or send the revised version for review." />

            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>Edit Event</Typography>
                    <Typography color="text.secondary">Review the basics, schedule, registration settings, and supporting details before saving.</Typography>
                </Box>
                <Chip
                    label={`Status: ${(event.approval_status === 'rejected' ? 'rejected' : event.status).replace(/_/g, ' ')}`}
                    color={event.approval_status === 'rejected' ? 'error' : event.status === 'approved' ? 'success' : event.status === 'pending' ? 'warning' : 'default'}
                    sx={{ fontWeight: 700, textTransform: 'capitalize' }}
                />
            </Box>

            {event.status === 'approved' ? (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 3 }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Approved event</AlertTitle>
                    The start time and registration deadline stay locked so students do not see unexpected changes.
                </Alert>
            ) : null}

            {event.approval_status === 'rejected' ? (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Changes requested</AlertTitle>
                    {event.rejection_reason || 'Review the admin comments, update the event, and submit again when ready.'}
                </Alert>
            ) : null}

            <form id="event-form" onSubmit={handleSubmit((data) => onSubmit(data, false))}>
                <Stack spacing={2.5}>
                    <Section title="Basics" description="Main event details students will see first." defaultExpanded>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField fullWidth variant="filled" label="Event title" placeholder="Example: Robotics Workshop" {...register('title')} error={!!errors.title} helperText={errors.title?.message} InputProps={{ sx: { borderRadius: 2 } }} />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField fullWidth variant="filled" label="Short summary" placeholder="One short sentence for cards and search results." {...register('short_description')} error={!!errors.short_description} helperText={errors.short_description?.message} InputProps={{ sx: { borderRadius: 2 } }} />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField fullWidth variant="filled" multiline rows={5} label="Full description" placeholder="Share the agenda, speakers, requirements, and what students will take away." {...register('description')} error={!!errors.description} helperText={errors.description?.message} InputProps={{ sx: { borderRadius: 2 } }} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth variant="filled" error={!!errors.category_id} disabled={categoriesLoading}>
                                    <InputLabel>Category</InputLabel>
                                    <Select {...register('category_id')} defaultValue={event.category_id || ''} sx={{ borderRadius: 2 }}>
                                        <MenuItem value="" disabled>Select a category</MenuItem>
                                        {categories?.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
                                    </Select>
                                    {errors.category_id ? <FormHelperText>{errors.category_id.message}</FormHelperText> : null}
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <FormControl fullWidth variant="filled">
                                    <InputLabel>Mode</InputLabel>
                                    <Select defaultValue={event.mode || 'offline'} {...register('mode')} sx={{ borderRadius: 2 }}>
                                        <MenuItem value="offline">Offline</MenuItem>
                                        <MenuItem value="online">Online</MenuItem>
                                        <MenuItem value="hybrid">Hybrid</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <FormControl fullWidth variant="filled">
                                    <InputLabel>Event type</InputLabel>
                                    <Select defaultValue={event.event_type || 'normal'} {...register('event_type')} sx={{ borderRadius: 2 }}>
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
                                        backgroundImage: !posterFile && event.poster_url ? `linear-gradient(rgba(15,23,42,0.45), rgba(15,23,42,0.45)), url(${event.poster_url})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.main' + '08' },
                                    }}
                                >
                                    <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <UploadIcon color="primary" />
                                        </Box>
                                        <Box>
                                            <Typography fontWeight={700} sx={{ color: !posterFile && event.poster_url ? 'common.white' : 'text.primary' }}>
                                                {posterFile ? posterFile.name : event.poster_url ? 'Replace current poster' : 'Upload event poster'}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: !posterFile && event.poster_url ? 'rgba(255,255,255,0.88)' : 'text.secondary' }}>
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
                                <TextField fullWidth type="datetime-local" variant="filled" label="Start time" InputLabelProps={{ shrink: true }} {...register('start_time')} error={!!errors.start_time} helperText={errors.start_time?.message} disabled={event.status === 'approved'} InputProps={{ sx: { borderRadius: 2 } }} />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField fullWidth type="datetime-local" variant="filled" label="End time" InputLabelProps={{ shrink: true }} {...register('end_time')} error={!!errors.end_time} helperText={errors.end_time?.message} InputProps={{ sx: { borderRadius: 2 } }} />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField fullWidth type="datetime-local" variant="filled" label="Registration deadline" InputLabelProps={{ shrink: true }} {...register('registration_deadline')} error={!!errors.registration_deadline} helperText={errors.registration_deadline?.message} disabled={event.status === 'approved'} InputProps={{ sx: { borderRadius: 2 } }} />
                            </Grid>
                            {(currentMode === 'offline' || currentMode === 'hybrid') ? (
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth variant="filled" label="Location" placeholder="Example: Main auditorium" {...register('location')} error={!!errors.location} helperText={errors.location?.message} InputProps={{ sx: { borderRadius: 2 } }} />
                                </Grid>
                            ) : null}
                            {(currentMode === 'online' || currentMode === 'hybrid') ? (
                                <Grid item xs={12} md={currentMode === 'hybrid' ? 6 : 12}>
                                    <TextField fullWidth variant="filled" label="Meeting link" placeholder="https://..." {...register('meeting_link')} error={!!errors.meeting_link} helperText={errors.meeting_link?.message} InputProps={{ sx: { borderRadius: 2 } }} />
                                </Grid>
                            ) : null}
                        </Grid>
                    </Section>

                    <Section title="Registration" description="Control capacity, access, and budget details.">
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                                <TextField fullWidth type="number" variant="filled" label="Maximum participants" {...register('max_participants', { valueAsNumber: true })} error={!!errors.max_participants} helperText={errors.max_participants?.message} InputProps={{ sx: { borderRadius: 2 } }} />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth variant="filled" error={!!errors.visibility}>
                                    <InputLabel>Visibility</InputLabel>
                                    <Select defaultValue={event.visibility || 'public'} {...register('visibility')} sx={{ borderRadius: 2 }}>
                                        <MenuItem value="public">Public</MenuItem>
                                        <MenuItem value="members_only">Members only</MenuItem>
                                        <MenuItem value="private">Private</MenuItem>
                                        <MenuItem value="hidden">Hidden</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Stack spacing={1.25} sx={{ pt: 1 }}>
                                    <FormControlLabel control={<Switch {...register('allow_waitlist')} color="primary" />} label={<Typography fontWeight={600}>Allow waitlist</Typography>} />
                                    <FormControlLabel control={<Switch {...register('requires_membership')} color="primary" />} label={<Typography fontWeight={600}>Require club membership</Typography>} />
                                </Stack>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField fullWidth type="number" variant="filled" label="Budget requested" {...register('budget_requested', { valueAsNumber: true })} error={!!errors.budget_requested} helperText={errors.budget_requested?.message || 'Optional'} InputProps={{ startAdornment: <InputAdornment position="start">Rs.</InputAdornment>, sx: { borderRadius: 2 } }} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField fullWidth type="number" variant="filled" label="Estimated expense" {...register('expense_estimate', { valueAsNumber: true })} error={!!errors.expense_estimate} helperText={errors.expense_estimate?.message || 'Optional'} InputProps={{ startAdornment: <InputAdornment position="start">Rs.</InputAdornment>, sx: { borderRadius: 2 } }} />
                            </Grid>
                        </Grid>
                    </Section>

                    <Section title="Certificates and Results" description="Turn on results and certificates only when the event needs them.">
                        <Stack spacing={1.5}>
                            <FormControlLabel control={<Switch {...register('result_required')} color="primary" />} label={<Typography fontWeight={600}>Publish results after the event</Typography>} />
                            <FormControlLabel control={<Switch {...register('certificate_enabled')} color="primary" />} label={<Typography fontWeight={600}>Issue certificates</Typography>} />
                            {isCertEnabled ? <FormControlLabel control={<Switch {...register('rank_based_certificates')} color="primary" />} label={<Typography fontWeight={600}>Limit certificates by rank</Typography>} /> : null}
                        </Stack>
                    </Section>

                    <Section title="Team Settings" description="Use these settings only for team-based hackathons.">
                        {currentEventType === 'hackathon' ? (
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth type="number" variant="filled" label="Minimum team size" {...register('min_team_size', { valueAsNumber: true })} error={!!errors.min_team_size} helperText={errors.min_team_size?.message} InputProps={{ sx: { borderRadius: 2 } }} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField fullWidth type="number" variant="filled" label="Maximum team size" {...register('max_team_size', { valueAsNumber: true })} error={!!errors.max_team_size} helperText={errors.max_team_size?.message} InputProps={{ sx: { borderRadius: 2 } }} />
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
                    <Typography fontWeight={800}>Save or resubmit</Typography>
                    <Typography variant="body2" color="text.secondary">Save your changes now, or send the updated event for review if it still needs approval.</Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button form="event-form" type="submit" variant="outlined" disabled={isSubmitting || uploading} sx={{ fontWeight: 700, minWidth: 150 }}>
                        Save Changes
                    </Button>
                    {(event.status === 'draft' || event.approval_status === 'rejected') ? (
                        <Button variant="contained" onClick={handleSubmit((data) => onSubmit(data, true))} disabled={isSubmitting || uploading} sx={{ fontWeight: 800, minWidth: 190 }}>
                            {isSubmitting || uploading ? <LoadingDots inline size={5} color="currentColor" /> : (event.approval_status === 'rejected' ? 'Submit Updated Event' : 'Submit for Review')}
                        </Button>
                    ) : null}
                </Stack>
            </Paper>
        </Box>
    );
};

export default EditEvent;
