import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    MenuItem,
    Paper,
    Grid,
    InputLabel,
    FormControl,
    Select,
    CircularProgress,
    FormControlLabel,
    Switch,
    InputAdornment,
    Alert,
    AlertTitle,
    Stack,
    Chip,
    FormHelperText
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useEventMutations } from '../../hooks/useEventMutations';
import { useEvent } from '../../hooks/useCoordinatorEvents';
import { useEventCategories } from '../../hooks/useEvents';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import RolePageHeader from '../../components/RolePageHeader';
import { toast } from 'sonner';

// Advanced Schema for Event Blueprint
const eventSchema = z.object({
    title: z.string().min(3, 'Title connects participants to the vision (min 3 chars).'),
    short_description: z.string().min(10, 'A quick summary is required (min 10 chars).').max(200),
    description: z.string().min(10, 'Detailed agenda is required (min 10 chars).'),
    category_id: z.string().uuid('Please select an authoritative category.'),
    mode: z.enum(['online', 'offline', 'hybrid']),
    start_time: z.string().refine((date) => new Date(date) > new Date(), { message: 'When does the event begin?' }),
    end_time: z.string().refine((date) => new Date(date) > new Date(), { message: 'When does the event conclude?' }),
    location: z.string().optional().or(z.literal('')),
    meeting_link: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
    registration_deadline: z.string(),
    max_participants: z.number().min(1, 'At least 1 soul must attend.'),
    allow_waitlist: z.boolean().default(false),
    visibility: z.enum(['public', 'members_only', 'private', 'hidden']),
    requires_membership: z.boolean().default(false),
    certificate_enabled: z.boolean().default(false),
    result_required: z.boolean().default(false),
    rank_based_certificates: z.boolean().default(false),
    budget_requested: z.number().min(0, 'Budget cannot be negative').optional().default(0),
    expense_estimate: z.number().min(0, 'Estimate cannot be negative').optional().default(0),
    status: z.enum(['draft', 'pending', 'approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'archived']).default('draft')
}).refine((data) => new Date(data.start_time) < new Date(data.end_time), {
    message: "End time must be precisely after start time.",
    path: ["end_time"],
}).refine((data) => new Date(data.registration_deadline) < new Date(data.start_time), {
    message: "Deadline must precede event start time to lock numbers.",
    path: ["registration_deadline"],
}).refine((data) => {
    if ((data.mode === 'online' || data.mode === 'hybrid') && !data.meeting_link) return false;
    return true;
}, {
    message: "Meeting link is structurally required for virtual participants.",
    path: ["meeting_link"]
}).refine((data) => {
    if ((data.mode === 'offline' || data.mode === 'hybrid') && !data.location) return false;
    return true;
}, {
    message: "Physical location is structurally required for in-person gatherings.",
    path: ["location"]
});

const EditEvent = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: event, isLoading: isLoadingEvent } = useEvent(id || '');
    const { updateEvent, uploadPoster } = useEventMutations();
    const { data: categories, isLoading: categoriesLoading } = useEventCategories();

    const [uploading, setUploading] = useState(false);
    const [posterFile, setPosterFile] = useState(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(eventSchema)
    });

    // eslint-disable-next-line react-hooks/incompatible-library
    const currentMode = watch('mode');
    const isCertEnabled = watch('certificate_enabled');

    useEffect(() => {
        if (event) {
            setValue('title', event.title || '');
            setValue('short_description', event.short_description || '');
            setValue('description', event.description || '');
            setValue('category_id', event.category_id || '');
            setValue('mode', event.mode || 'offline');
            if (event.start_time) {
                setValue('start_time', new Date(event.start_time).toISOString().slice(0, 16));
            }
            if (event.end_time) {
                setValue('end_time', new Date(event.end_time).toISOString().slice(0, 16));
            }
            if (event.registration_deadline) {
                setValue('registration_deadline', new Date(event.registration_deadline).toISOString().slice(0, 16));
            }
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
            setValue('status', event.status || 'draft');
        }
    }, [event, setValue]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setPosterFile(e.target.files[0]);
        }
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
                poster_url: posterUrl || undefined
            };

            // If it's a draft or rejected and they submit, it goes to pending.
            if (isSubmitForApproval) {
                updates.status = 'pending';
                if (event.status === 'rejected') {
                    updates.resubmission_count = (event.resubmission_count || 0) + 1;
                }
            }

            updateEvent.mutate({ id: id, updates }, {
                onSuccess: () => navigate('/coordinator/events')
            });

        } catch (error) {
            console.error(error);
            setUploading(false);
            toast.error(error.message || "Execution exception during update");
        }
    };

    if (isLoadingEvent) return <CircularProgress sx={{ display: 'block', m: '50px auto' }} />;
    if (!event) return <Typography color="error" textAlign="center">Event record not localized</Typography>;

    return (
        <Box maxWidth="lg" mx="auto" sx={{ pb: 6 }}>
            <RolePageHeader
                kicker="Coordinator Suite"
                title="Edit Event"
                subtitle="Refine details before publication."
            />
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>
                        Edit Architecture
                    </Typography>
                    <Typography color="text.secondary" fontWeight={500}>
                        Modify logistical parameters for {event.title}
                    </Typography>
                </Box>
                <Chip
                    label={`Status: ${event.status.toUpperCase()}`}
                    color={
                        event.status === 'approved' ? 'success' :
                            event.status === 'pending' ? 'warning' :
                                event.status === 'draft' ? 'default' : 'primary'
                    }
                    variant="outlined"
                    sx={{ fontWeight: 700, px: 1 }}
                />
            </Box>

            {event.status === 'approved' && (
                <Alert severity="success" sx={{ mb: 4, borderRadius: '12px' }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Active Blueprint</AlertTitle>
                    This event is live. Critical timeline modifications are restricted to prevent user disruption.
                </Alert>
            )}

            {event.status === 'rejected' && (
                <Alert severity="error" sx={{ mb: 4, borderRadius: '12px' }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Administrative Rejection Active</AlertTitle>
                    {event.rejection_reason}
                </Alert>
            )}

            <Grid container spacing={4}>
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 4, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                        <form id="event-form" onSubmit={handleSubmit((data) => onSubmit(data, false))}>

                            <Typography variant="h6" fontWeight={800} gutterBottom sx={{ fontSize: '1rem', mb: 3 }}>
                                Primary Information
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        variant="filled"
                                        label="Event Title"
                                        placeholder="Enter an authoritative title..."
                                        {...register('title')}
                                        error={!!errors.title}
                                        helperText={errors.title?.message}
                                        InputProps={{ sx: { borderRadius: '8px', fontWeight: 600 } }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        variant="filled"
                                        label="Short Description"
                                        placeholder="A concise, powerful summary for discovery cards..."
                                        {...register('short_description')}
                                        error={!!errors.short_description}
                                        helperText={errors.short_description?.message}
                                        InputProps={{ sx: { borderRadius: '8px' } }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        variant="filled"
                                        multiline
                                        rows={5}
                                        label="Detailed Agenda"
                                        placeholder="Elaborate on the structural intent, speakers, and expected takeaways."
                                        {...register('description')}
                                        error={!!errors.description}
                                        helperText={errors.description?.message}
                                        InputProps={{ sx: { borderRadius: '8px' } }}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth variant="filled" error={!!errors.category_id} disabled={categoriesLoading}>
                                        <InputLabel>Category Alignment</InputLabel>
                                        <Select
                                            {...register('category_id')}
                                            sx={{ borderRadius: '8px' }}
                                            defaultValue={event.category_id || ""}
                                        >
                                            <MenuItem value="" disabled>Select Core Category</MenuItem>
                                            {categories?.map((cat) => (
                                                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                            ))}
                                        </Select>
                                        {errors.category_id && <FormHelperText>{errors.category_id.message}</FormHelperText>}
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth variant="filled">
                                        <InputLabel>Execution Mode</InputLabel>
                                        <Select
                                            defaultValue="offline"
                                            {...register('mode')}
                                            sx={{ borderRadius: '8px' }}
                                        >
                                            <MenuItem value="offline">Offline (In-person Campus)</MenuItem>
                                            <MenuItem value="online">Online (Virtual Streaming)</MenuItem>
                                            <MenuItem value="hybrid">Hybrid (Omnichannel)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 5, mb: 3 }}><Typography variant="h6" fontWeight={800} sx={{ fontSize: '1rem' }}>Timeline Architecture</Typography></Box>

                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type="datetime-local"
                                        variant="filled"
                                        label="Commencement (Start Time)"
                                        InputLabelProps={{ shrink: true }}
                                        {...register('start_time')}
                                        error={!!errors.start_time}
                                        helperText={errors.start_time?.message}
                                        InputProps={{ sx: { borderRadius: '8px' } }}
                                        disabled={event.status === 'approved'}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type="datetime-local"
                                        variant="filled"
                                        label="Conclusion (End Time)"
                                        InputLabelProps={{ shrink: true }}
                                        {...register('end_time')}
                                        error={!!errors.end_time}
                                        helperText={errors.end_time?.message}
                                        InputProps={{ sx: { borderRadius: '8px' } }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type="datetime-local"
                                        variant="filled"
                                        label="Registration Gate Closure"
                                        InputLabelProps={{ shrink: true }}
                                        {...register('registration_deadline')}
                                        error={!!errors.registration_deadline}
                                        helperText={errors.registration_deadline?.message}
                                        InputProps={{ sx: { borderRadius: '8px' } }}
                                        disabled={event.status === 'approved'}
                                    />
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 5, mb: 3 }}><Typography variant="h6" fontWeight={800} sx={{ fontSize: '1rem' }}>Logistical Execution</Typography></Box>

                            <Grid container spacing={3}>
                                {(currentMode === 'offline' || currentMode === 'hybrid') && (
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            variant="filled"
                                            label="Physical Location"
                                            placeholder="Auditorium / Lab designation"
                                            {...register('location')}
                                            error={!!errors.location}
                                            helperText={errors.location?.message}
                                            InputProps={{ sx: { borderRadius: '8px' } }}
                                        />
                                    </Grid>
                                )}
                                {(currentMode === 'online' || currentMode === 'hybrid') && (
                                    <Grid item xs={12} sm={currentMode === 'hybrid' ? 6 : 12}>
                                        <TextField
                                            fullWidth
                                            variant="filled"
                                            label="Virtual Stream URL"
                                            placeholder="https://zoom.us/..."
                                            {...register('meeting_link')}
                                            error={!!errors.meeting_link}
                                            helperText={errors.meeting_link?.message}
                                            InputProps={{ sx: { borderRadius: '8px' } }}
                                        />
                                    </Grid>
                                )}
                            </Grid>

                            <Box sx={{ mt: 5, mb: 3 }}><Typography variant="h6" fontWeight={800} sx={{ fontSize: '1rem' }}>Visibility & Governance</Typography></Box>

                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth variant="filled" error={!!errors.visibility}>
                                        <InputLabel>Visibility Matrix</InputLabel>
                                        <Select
                                            defaultValue="public"
                                            {...register('visibility')}
                                            sx={{ borderRadius: '8px' }}
                                        >
                                            <MenuItem value="public">Global Public (Open Access)</MenuItem>
                                            <MenuItem value="members_only">Members Shielded</MenuItem>
                                            <MenuItem value="private">Private (Invite Driven)</MenuItem>
                                            <MenuItem value="hidden">Hidden (Admin Shadowing)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={<Switch {...register('requires_membership')} color="primary" />}
                                        label={<Typography variant="body2" fontWeight={600}>Enforce Club Membership Requirement</Typography>}
                                        sx={{ mt: 1 }}
                                    />
                                </Grid>
                            </Grid>

                        </form>
                    </Paper>
                </Grid>

                <Grid item xs={12} lg={4}>
                    <Stack spacing={3}>
                        <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={800} gutterBottom sx={{ fontSize: '1rem' }}>
                                Capacity & Waitlist
                            </Typography>
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Maximum Threshold"
                                    {...register('max_participants', { valueAsNumber: true })}
                                    error={!!errors.max_participants}
                                    helperText={errors.max_participants?.message}
                                />
                                <FormControlLabel
                                    control={<Switch {...register('allow_waitlist')} color="primary" />}
                                    label={<Typography variant="body2" fontWeight={600}>Permit Waitlist Queueing</Typography>}
                                />
                            </Stack>
                        </Paper>

                        <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={800} gutterBottom sx={{ fontSize: '1rem' }}>
                                Results & Certification
                            </Typography>
                            <Stack spacing={1} sx={{ mt: 1 }}>
                                <FormControlLabel
                                    control={<Switch {...register('result_required')} color="primary" />}
                                    label={<Typography variant="body2" fontWeight={600}>Enforce Result Upload (Competitions)</Typography>}
                                />
                                <FormControlLabel
                                    control={<Switch {...register('certificate_enabled')} color="primary" />}
                                    label={<Typography variant="body2" fontWeight={600}>Enable Issue of E-Certificates</Typography>}
                                />
                                {isCertEnabled && (
                                    <FormControlLabel
                                        control={<Switch {...register('rank_based_certificates')} color="primary" />}
                                        label={<Typography variant="body2" fontWeight={600} color="primary">Strict Rank-Based Validation</Typography>}
                                    />
                                )}
                            </Stack>
                        </Paper>

                        <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={800} gutterBottom sx={{ fontSize: '1rem' }}>
                                Financial Allocation
                            </Typography>
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Budget Requested"
                                    {...register('budget_requested', { valueAsNumber: true })}
                                    error={!!errors.budget_requested}
                                    helperText={errors.budget_requested?.message}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                    }}
                                />
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Expense Estimated"
                                    {...register('expense_estimate', { valueAsNumber: true })}
                                    error={!!errors.expense_estimate}
                                    helperText={errors.expense_estimate?.message}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                    }}
                                />
                            </Stack>
                        </Paper>

                        <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" fontWeight={800} gutterBottom sx={{ fontSize: '1rem' }}>
                                Event Poster Payload
                            </Typography>
                            <Box
                                sx={{
                                    mt: 1, p: 3, border: '2px dashed', borderColor: 'divider', borderRadius: '12px',
                                    textAlign: 'center', cursor: 'pointer', bgcolor: 'action.hover',
                                    '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.main' + '08' },
                                    backgroundImage: !posterFile && event.poster_url ? `url(${event.poster_url})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    position: 'relative'
                                }}
                                component="label"
                            >
                                {(!posterFile && event.poster_url) && (
                                    <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.6)', borderRadius: '10px' }} />
                                )}
                                <Box sx={{ position: 'relative', zIndex: 1, color: (!posterFile && event.poster_url) ? 'white' : 'inherit' }}>
                                    <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                                    {posterFile ? (
                                        <Typography variant="body2" fontWeight={700} color="primary">
                                            {posterFile.name}
                                        </Typography>
                                    ) : (
                                        <>
                                            <UploadIcon sx={{ fontSize: 32, color: (!posterFile && event.poster_url) ? 'white' : 'text.disabled', mb: 1 }} />
                                            <Typography variant="caption" display="block">
                                                Inject high-definition graphical asset
                                            </Typography>
                                        </>
                                    )}
                                </Box>
                            </Box>
                        </Paper>

                        <Paper sx={{ p: 3, borderRadius: '16px', bgcolor: 'primary.main', color: 'white' }}>
                            <Typography variant="h6" fontWeight={800} gutterBottom>
                                Execution Directives
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
                                Modify states and persist changes to the architectural database.
                            </Typography>
                            <Stack spacing={1.5}>
                                <Button
                                    form="event-form"
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                    sx={{
                                        bgcolor: 'white', color: 'primary.main', fontWeight: 800,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                                    }}
                                    disabled={isSubmitting || uploading}
                                >
                                    {isSubmitting || uploading ? <CircularProgress size={24} /> : 'Update Event Architecture'}
                                </Button>
                                {(event.status === 'draft' || event.status === 'rejected') && (
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        onClick={handleSubmit((data) => onSubmit(data, true))}
                                        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', fontWeight: 700 }}
                                        disabled={isSubmitting || uploading}
                                    >
                                        {event.status === 'rejected' ? 'Resolve Rejection & Resubmit' : 'Deploy to Pending Review'}
                                    </Button>
                                )}
                            </Stack>
                        </Paper>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};

export default EditEvent;
