// eslint-disable-next-line no-unused-vars
import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, TextField, Switch,
    FormControlLabel, Button, MenuItem,
    // eslint-disable-next-line no-unused-vars
    Stack, Card, CardContent, Divider, useTheme
} from '@mui/material';
import {
    Save as SaveIcon, Visibility as VisIcon,
    Groups as GroupsIcon, Category as CategoryIcon,
    EventAvailable as EventIcon, Image as ImageIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useClubCategories } from '../../hooks/useClubCategories';
import { useCoordinatorClub } from '../../hooks/useCoordinatorClub';
import { motion } from 'framer-motion';
import RolePageHeader from '../../components/RolePageHeader';
import LoadingDots from '../../components/LoadingDots';

const settingsSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    description: z.string().max(1000, 'Description is too long').optional(),
    founded_year: z.preprocess((val) => Number(val), z.number().min(1900).max(new Date().getFullYear()).optional()),
    contact_email: z.string().email('Invalid email address').optional().or(z.literal('')),
    logo_url: z.string().url('Invalid URL').optional().or(z.literal('')),
    banner_url: z.string().url('Invalid URL').optional().or(z.literal('')),
    category_id: z.string().uuid('Please select a category').optional().nullable(),
    visibility: z.boolean(),
    is_accepting_members: z.boolean(),
    allow_event_creation: z.boolean(),
    allow_external_participants: z.boolean(),
    max_members: z.preprocess((val) => val ? Number(val) : null, z.number().min(1).optional().nullable()),
    auto_approve_memberships: z.boolean().default(false),
});

const CoordinatorSettings = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const { data: categories } = useClubCategories();
    const { data: coordinatorClub } = useCoordinatorClub();

    const { data: clubData, isLoading } = useQuery({
        queryKey: ['coordinatorClubSettings', coordinatorClub?.id],
        enabled: !!coordinatorClub?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clubs')
                .select('*')
                .eq('id', coordinatorClub.id)
                .single();
            if (error) throw error;
            return data;
        }
    });

    const updateClubMutation = useMutation({
        mutationFn: async (updates) => {
            const { error } = await supabase
                .from('clubs')
                .update(updates)
                .eq('id', coordinatorClub.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coordinatorClubSettings'] });
            queryClient.invalidateQueries({ queryKey: ['coordinatorClub'] }); // Invalidate layout query
            toast.success('Organization settings updated successfully');
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to update settings');
        }
    });

    const { control, handleSubmit, reset, formState: { errors, isDirty, isValid } } = useForm({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            name: '', description: '', founded_year: '', contact_email: '',
            logo_url: '', banner_url: '', category_id: null, visibility: true,
            is_accepting_members: true, allow_event_creation: true, allow_external_participants: false,
            max_members: '', auto_approve_memberships: false
        }
    });

    useEffect(() => {
        if (clubData) {
            reset({
                name: clubData.name || '',
                description: clubData.description || '',
                founded_year: clubData.founded_year || '',
                contact_email: clubData.contact_email || '',
                logo_url: clubData.logo_url || '',
                banner_url: clubData.banner_url || '',
                category_id: clubData.category_id || null,
                visibility: clubData.visibility ?? true,
                is_accepting_members: clubData.is_accepting_members ?? true,
                allow_event_creation: clubData.allow_event_creation ?? true,
                allow_external_participants: clubData.allow_external_participants ?? false,
                max_members: clubData.max_members || '',
                auto_approve_memberships: clubData.auto_approve_memberships ?? false,
            });
        }
    }, [clubData, reset]);

    const onSubmit = (data) => {
        // Sanitize empty strings to null for text/uuid fields if needed, 
        // Supabase handles mostly fine but good practice
        const payload = { ...data };
        if (!payload.category_id) payload.category_id = null;
        if (!payload.founded_year) payload.founded_year = null;
        if (!payload.max_members) payload.max_members = null;
        updateClubMutation.mutate(payload);
    };

    if (isLoading) return <LoadingDots label="Loading settings..." minHeight="50vh" />;
    if (!clubData) return <Box p={4}><Typography color="error">Organization data not found.</Typography></Box>;

    return (
        <Box sx={{ pb: 8, maxWidth: 1000, mx: 'auto' }}>
            <RolePageHeader
                kicker="Coordinator Dashboard"
                title="Settings"
                subtitle="Control preferences, policies, and notifications."
            />
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h3" fontWeight={900} color="text.primary" gutterBottom sx={{ letterSpacing: -1 }}>
                    Governance & Settings
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>
                    Manage how your organization is presented and operates on the platform.
                </Typography>
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={4}>

                    {/* Left Column: Basic Info & Branding */}
                    <Grid item xs={12} md={7}>
                        {/* Basic Info */}
                        <Paper sx={{ 
                            p: 4, borderRadius: '24px', mb: 4, 
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(30,41,59,0.4)' : 'background.paper', 
                            border: `1px solid ${theme.palette.divider}` 
                        }}>
                            <Box display="flex" alignItems="center" gap={2} mb={3}>
                                <CategoryIcon color="primary" />
                                <Typography variant="h6" fontWeight={800} color="text.primary">Identity & Description</Typography>
                            </Box>

                            <Stack spacing={3}>
                                <Controller
                                    name="name" control={control}
                                    render={({ field }) => (
                                        <TextField {...field} label="Organization Name" fullWidth
                                            error={!!errors.name} helperText={errors.name?.message}
                                            InputProps={{ sx: { borderRadius: '12px' } }} />
                                    )}
                                />

                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Controller
                                            name="category_id" control={control}
                                            render={({ field }) => (
                                                <TextField {...field} select label="Category" fullWidth
                                                    value={field.value || ''}
                                                    error={!!errors.category_id} helperText={errors.category_id?.message}
                                                    InputProps={{ sx: { borderRadius: '12px' } }}>
                                                    <MenuItem value=""><em>None</em></MenuItem>
                                                    {categories?.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                                </TextField>
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Controller
                                            name="founded_year" control={control}
                                            render={({ field }) => (
                                                <TextField {...field} label="Founded Year" type="number" fullWidth
                                                    error={!!errors.founded_year} helperText={errors.founded_year?.message}
                                                    InputProps={{ sx: { borderRadius: '12px' } }} />
                                            )}
                                        />
                                    </Grid>
                                </Grid>

                                <Controller
                                    name="contact_email" control={control}
                                    render={({ field }) => (
                                        <TextField {...field} label="Official Contact Email" fullWidth type="email"
                                            error={!!errors.contact_email} helperText={errors.contact_email?.message}
                                            InputProps={{ sx: { borderRadius: '12px' } }} />
                                    )}
                                />

                                <Controller
                                    name="description" control={control}
                                    render={({ field }) => (
                                        <TextField {...field} label="Detailed Description" fullWidth multiline rows={5}
                                            error={!!errors.description} helperText={errors.description?.message}
                                            InputProps={{ sx: { borderRadius: '12px' } }} />
                                    )}
                                />
                            </Stack>
                        </Paper>

                        {/* Branding */}
                        <Paper sx={{ 
                            p: 4, borderRadius: '24px', 
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(30,41,59,0.4)' : 'background.paper', 
                            border: `1px solid ${theme.palette.divider}` 
                        }}>
                            <Box display="flex" alignItems="center" gap={2} mb={3}>
                                <ImageIcon sx={{ color: '#f472b6' }} />
                                <Typography variant="h6" fontWeight={800} color="text.primary">Visual Assets</Typography>
                            </Box>

                            <Stack spacing={3}>
                                <Controller
                                    name="logo_url" control={control}
                                    render={({ field }) => (
                                        <TextField {...field} label="Logo Image URL" fullWidth
                                            error={!!errors.logo_url} helperText={errors.logo_url?.message}
                                            InputProps={{ sx: { borderRadius: '12px' } }} />
                                    )}
                                />
                                <Controller
                                    name="banner_url" control={control}
                                    render={({ field }) => (
                                        <TextField {...field} label="Banner Image URL" fullWidth
                                            error={!!errors.banner_url} helperText={errors.banner_url?.message}
                                            InputProps={{ sx: { borderRadius: '12px' } }} />
                                    )}
                                />
                            </Stack>
                        </Paper>
                    </Grid>

                    {/* Right Column: Toggles & Policies */}
                    <Grid item xs={12} md={5}>
                        <Paper sx={{ 
                            p: 4, borderRadius: '24px', mb: 4, 
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(30,41,59,0.4)' : 'background.paper', 
                            border: `1px solid ${theme.palette.divider}`,
                            position: 'sticky', top: 100 
                        }}>
                            <Typography variant="h6" fontWeight={800} color="text.primary" mb={3}>Operational Policies</Typography>

                            <Stack spacing={2} divider={<Divider sx={{ borderColor: theme.palette.divider }} />}>

                                {/* Visibility */}
                                <Box py={1}>
                                    <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
                                        <VisIcon sx={{ color: '#3b82f6', fontSize: 20 }} />
                                        <Typography variant="subtitle2" fontWeight={800} color="text.primary">Public Visibility</Typography>
                                    </Box>
                                    <Controller
                                        name="visibility" control={control}
                                        render={({ field: { value, onChange } }) => (
                                            <FormControlLabel
                                                control={<Switch checked={value} onChange={e => onChange(e.target.checked)} color="primary" />}
                                                label={<Typography variant="body2" color="text.secondary">Show in public club directory</Typography>}
                                            />
                                        )}
                                    />
                                </Box>

                                {/* Membership */}
                                <Box py={1}>
                                    <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
                                        <GroupsIcon sx={{ color: '#10b981', fontSize: 20 }} />
                                        <Typography variant="subtitle2" fontWeight={800} color="text.primary">Membership Status</Typography>
                                    </Box>
                                    <Controller
                                        name="is_accepting_members" control={control}
                                        render={({ field: { value, onChange } }) => (
                                            <FormControlLabel
                                                control={<Switch checked={value} onChange={e => onChange(e.target.checked)} color="success" />}
                                                label={<Typography variant="body2" color="text.secondary">Accept new join requests</Typography>}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="auto_approve_memberships" control={control}
                                        render={({ field: { value, onChange } }) => (
                                            <FormControlLabel
                                                control={<Switch checked={value} onChange={e => onChange(e.target.checked)} color="success" />}
                                                label={<Typography variant="body2" color="text.secondary">Auto-approve memberships</Typography>}
                                                sx={{ mt: 1 }}
                                            />
                                        )}
                                    />
                                    <Box mt={2}>
                                        <Controller
                                            name="max_members" control={control}
                                            render={({ field }) => (
                                                <TextField {...field} label="Max Members (Optional)" type="number" fullWidth size="small"
                                                    error={!!errors.max_members} helperText={errors.max_members?.message}
                                                    InputProps={{ sx: { borderRadius: '12px' } }} />
                                            )}
                                        />
                                    </Box>
                                </Box>

                                {/* Events */}
                                <Box py={1}>
                                    <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
                                        <EventIcon sx={{ color: '#a855f7', fontSize: 20 }} />
                                        <Typography variant="subtitle2" fontWeight={800} color="text.primary">Event Creation</Typography>
                                    </Box>
                                    <Controller
                                        name="allow_event_creation" control={control}
                                        render={({ field: { value, onChange } }) => (
                                            <FormControlLabel
                                                control={<Switch checked={value} onChange={e => onChange(e.target.checked)} color="secondary" />}
                                                label={<Typography variant="body2" color="text.secondary">Enable hosting new events</Typography>}
                                            />
                                        )}
                                    />
                                </Box>

                                <Box py={1}>
                                    <Controller
                                        name="allow_external_participants" control={control}
                                        render={({ field: { value, onChange } }) => (
                                            <FormControlLabel
                                                control={<Switch checked={value} onChange={e => onChange(e.target.checked)} color="warning" />}
                                                label={<Typography variant="body2" color="text.secondary">Allow non-members to register for public events</Typography>}
                                            />
                                        )}
                                    />
                                </Box>

                            </Stack>

                            <Box mt={4} component={motion.div} whileHover={{ scale: isDirty ? 1.02 : 1 }} whileTap={{ scale: 0.98 }}>
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    startIcon={<SaveIcon />}
                                    disabled={!isDirty || !isValid || updateClubMutation.isPending}
                                    sx={{
                                        py: 1.5, borderRadius: '12px', fontWeight: 800,
                                        bgcolor: isDirty ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                                        color: isDirty ? 'white' : 'rgba(255,255,255,0.3)',
                                        '&:hover': { bgcolor: isDirty ? '#2563eb' : 'rgba(255,255,255,0.05)' }
                                    }}
                                >
                                    {updateClubMutation.isPending ? 'Saving Limits...' : 'Save Configuration'}
                                </Button>
                            </Box>
                        </Paper>
                    </Grid>

                </Grid>
            </form>
        </Box>
    );
};

export default CoordinatorSettings;
