// eslint-disable-next-line no-unused-vars
import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, TextField, Switch,
    Button, MenuItem,
    // eslint-disable-next-line no-unused-vars
    Stack, Card, CardContent, Divider, useTheme
} from '@mui/material';
import {
    Save as SaveIcon, Visibility as VisIcon,
    Groups as GroupsIcon, Category as CategoryIcon,
    EventAvailable as EventIcon, Image as ImageIcon
} from '@mui/icons-material';
import { useForm, Controller, useWatch } from 'react-hook-form';
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

const SettingsSection = ({ icon, title, subtitle, children, theme }) => (
    <Paper
        sx={{
            p: { xs: 3, md: 3.5 },
            borderRadius: '24px',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(30,41,59,0.5)' : 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.palette.mode === 'dark'
                ? '0 20px 40px rgba(2,6,23,0.25)'
                : '0 18px 42px rgba(15,23,42,0.06)',
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, mb: 2.5 }}>
            <Box
                sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '14px',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(59,130,246,0.08)',
                    color: 'primary.main'
                }}
            >
                {icon}
            </Box>
            <Box>
                <Typography variant="h6" fontWeight={900} color="text.primary">
                    {title}
                </Typography>
                {subtitle ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {subtitle}
                    </Typography>
                ) : null}
            </Box>
        </Box>
        {children}
    </Paper>
);

const PolicyTile = ({ icon, title, description, control, theme, accent }) => (
    <Box
        sx={{
            p: 2.25,
            borderRadius: '18px',
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.55)' : 'rgba(248,250,252,0.9)',
            height: '100%',
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.25, minWidth: 0 }}>
                <Box
                    sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '12px',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: `${accent}14`,
                        color: accent,
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </Box>
                <Box>
                    <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                        {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                        {description}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ flexShrink: 0 }}>
                {control}
            </Box>
        </Box>
    </Box>
);

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

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isDirty, isValid }
    } = useForm({
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

    const [visibility, isAcceptingMembers, allowEventCreation] = useWatch({
        control,
        name: [
            'visibility',
            'is_accepting_members',
            'allow_event_creation'
        ]
    });

    if (isLoading) return <LoadingDots label="Loading settings..." minHeight="50vh" />;
    if (!clubData) return <Box p={4}><Typography color="error">Organization data not found.</Typography></Box>;

    return (
        <Box sx={{ pb: 8, maxWidth: 1120, mx: 'auto' }}>
            <RolePageHeader
                kicker="Coordinator Dashboard"
                title="Governance & Settings"
                subtitle="Shape how your club appears, accepts members, and runs events."
                accent="#10b981"
            />
            <Grid container spacing={2.5} sx={{ mb: 4.5 }}>
                {[
                    {
                        label: 'Visibility',
                        value: visibility ? 'Public' : 'Private',
                        accent: '#3b82f6',
                        tone: 'rgba(59,130,246,0.08)'
                    },
                    {
                        label: 'Memberships',
                        value: isAcceptingMembers ? 'Open' : 'Paused',
                        accent: '#10b981',
                        tone: 'rgba(16,185,129,0.1)'
                    },
                    {
                        label: 'Event Creation',
                        value: allowEventCreation ? 'Enabled' : 'Locked',
                        accent: '#a855f7',
                        tone: 'rgba(168,85,247,0.1)'
                    }
                ].map((item) => (
                    <Grid item xs={12} md={4} key={item.label}>
                        <Paper
                            sx={{
                                p: 2.4,
                                height: '100%',
                                borderRadius: '22px',
                                border: `1px solid ${theme.palette.divider}`,
                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(30,41,59,0.5)' : 'background.paper',
                                boxShadow: theme.palette.mode === 'dark'
                                    ? '0 18px 36px rgba(2,6,23,0.2)'
                                    : '0 16px 36px rgba(15,23,42,0.05)',
                            }}
                        >
                            <Typography
                                variant="overline"
                                sx={{
                                    letterSpacing: '0.18em',
                                    fontWeight: 800,
                                    color: 'text.secondary'
                                }}
                            >
                                {item.label}
                            </Typography>
                            <Box
                                sx={{
                                    mt: 1.5,
                                    px: 1.5,
                                    py: 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    borderRadius: '999px',
                                    bgcolor: item.tone,
                                    color: item.accent,
                                    fontWeight: 800,
                                    fontSize: '0.98rem'
                                }}
                            >
                                {item.value}
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={3.5}>
                    <SettingsSection
                        icon={<CategoryIcon />}
                        title="Identity & Description"
                        subtitle="Keep your club profile clear, trustworthy, and easy to discover."
                        theme={theme}
                    >
                        <Stack spacing={3}>
                            <Controller
                                name="name" control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="Organization Name" fullWidth
                                        error={!!errors.name} helperText={errors.name?.message}
                                        InputProps={{ sx: { borderRadius: '14px' } }} />
                                )}
                            />

                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <Controller
                                        name="category_id" control={control}
                                        render={({ field }) => (
                                            <TextField {...field} select label="Category" fullWidth
                                                value={field.value || ''}
                                                error={!!errors.category_id} helperText={errors.category_id?.message}
                                                InputProps={{ sx: { borderRadius: '14px' } }}>
                                                <MenuItem value=""><em>None</em></MenuItem>
                                                {categories?.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                            </TextField>
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Controller
                                        name="founded_year" control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="Founded Year" type="number" fullWidth
                                                error={!!errors.founded_year} helperText={errors.founded_year?.message}
                                                InputProps={{ sx: { borderRadius: '14px' } }} />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Controller
                                        name="contact_email" control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="Official Contact Email" fullWidth type="email"
                                                error={!!errors.contact_email} helperText={errors.contact_email?.message}
                                                InputProps={{ sx: { borderRadius: '14px' } }} />
                                        )}
                                    />
                                </Grid>
                            </Grid>

                            <Controller
                                name="description" control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="Detailed Description" fullWidth multiline rows={5}
                                        error={!!errors.description} helperText={errors.description?.message}
                                        InputProps={{ sx: { borderRadius: '14px' } }} />
                                )}
                            />
                        </Stack>
                    </SettingsSection>

                    <SettingsSection
                        icon={<ImageIcon sx={{ color: '#f472b6' }} />}
                        title="Visual Assets"
                        subtitle="Set the links used for your club identity across dashboards and listings."
                        theme={theme}
                    >
                        <Grid container spacing={2.5}>
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name="logo_url" control={control}
                                    render={({ field }) => (
                                        <Box
                                            sx={{
                                                p: 2.25,
                                                height: '100%',
                                                borderRadius: '18px',
                                                border: `1px solid ${theme.palette.divider}`,
                                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.55)' : 'rgba(248,250,252,0.9)'
                                            }}
                                        >
                                            <Typography variant="subtitle1" fontWeight={800} color="text.primary" sx={{ mb: 0.75 }}>
                                                Logo Asset
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                Use a square or compact image link for club avatars and badges.
                                            </Typography>
                                            <TextField {...field} label="Logo Image URL" fullWidth
                                                error={!!errors.logo_url} helperText={errors.logo_url?.message}
                                                InputProps={{ sx: { borderRadius: '14px' } }} />
                                        </Box>
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name="banner_url" control={control}
                                    render={({ field }) => (
                                        <Box
                                            sx={{
                                                p: 2.25,
                                                height: '100%',
                                                borderRadius: '18px',
                                                border: `1px solid ${theme.palette.divider}`,
                                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.55)' : 'rgba(248,250,252,0.9)'
                                            }}
                                        >
                                            <Typography variant="subtitle1" fontWeight={800} color="text.primary" sx={{ mb: 0.75 }}>
                                                Banner Asset
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                Add a wide image link for profile headers and club showcase areas.
                                            </Typography>
                                            <TextField {...field} label="Banner Image URL" fullWidth
                                                error={!!errors.banner_url} helperText={errors.banner_url?.message}
                                                InputProps={{ sx: { borderRadius: '14px' } }} />
                                        </Box>
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </SettingsSection>

                    <SettingsSection
                        icon={<VisIcon />}
                        title="Operational Policies"
                        subtitle="Control visibility, membership flow, and event permissions from one place."
                        theme={theme}
                    >
                        <Grid container spacing={2.5} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name="visibility" control={control}
                                    render={({ field: { value, onChange } }) => (
                                        <PolicyTile
                                            icon={<VisIcon sx={{ fontSize: 20 }} />}
                                            title="Public Visibility"
                                            description="Show this club in the public directory for discovery."
                                            accent="#3b82f6"
                                            theme={theme}
                                            control={<Switch checked={value} onChange={e => onChange(e.target.checked)} color="primary" />}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name="allow_event_creation" control={control}
                                    render={({ field: { value, onChange } }) => (
                                        <PolicyTile
                                            icon={<EventIcon sx={{ fontSize: 20 }} />}
                                            title="Event Creation"
                                            description="Allow coordinators to create and manage new events."
                                            accent="#a855f7"
                                            theme={theme}
                                            control={<Switch checked={value} onChange={e => onChange(e.target.checked)} color="secondary" />}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name="is_accepting_members" control={control}
                                    render={({ field: { value, onChange } }) => (
                                        <PolicyTile
                                            icon={<GroupsIcon sx={{ fontSize: 20 }} />}
                                            title="Accept Join Requests"
                                            description="Keep membership requests open for new students."
                                            accent="#10b981"
                                            theme={theme}
                                            control={<Switch checked={value} onChange={e => onChange(e.target.checked)} color="success" />}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name="auto_approve_memberships" control={control}
                                    render={({ field: { value, onChange } }) => (
                                        <PolicyTile
                                            icon={<GroupsIcon sx={{ fontSize: 20 }} />}
                                            title="Auto-Approve Memberships"
                                            description="Automatically approve new join requests when enabled."
                                            accent="#14b8a6"
                                            theme={theme}
                                            control={<Switch checked={value} onChange={e => onChange(e.target.checked)} color="success" />}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name="allow_external_participants" control={control}
                                    render={({ field: { value, onChange } }) => (
                                        <PolicyTile
                                            icon={<EventIcon sx={{ fontSize: 20 }} />}
                                            title="External Participants"
                                            description="Allow non-members to register for public events."
                                            accent="#f59e0b"
                                            theme={theme}
                                            control={<Switch checked={value} onChange={e => onChange(e.target.checked)} color="warning" />}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Box
                                    sx={{
                                        p: 2.25,
                                        borderRadius: '18px',
                                        border: `1px solid ${theme.palette.divider}`,
                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.55)' : 'rgba(248,250,252,0.9)',
                                        height: '100%',
                                    }}
                                >
                                    <Typography variant="subtitle1" fontWeight={800} color="text.primary" sx={{ mb: 1 }}>
                                        Membership Limit
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        Set an optional cap for how many approved members your club can hold.
                                    </Typography>
                                    <Controller
                                        name="max_members" control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="Max Members (Optional)" type="number" fullWidth size="small"
                                                error={!!errors.max_members} helperText={errors.max_members?.message}
                                                InputProps={{ sx: { borderRadius: '14px' } }} />
                                        )}
                                    />
                                </Box>
                            </Grid>
                        </Grid>

                        <Box
                            sx={{
                                p: 2.5,
                                borderRadius: '18px',
                                border: `1px solid ${theme.palette.divider}`,
                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.02)',
                                display: 'flex',
                                flexDirection: { xs: 'column', md: 'row' },
                                alignItems: { xs: 'stretch', md: 'center' },
                                justifyContent: 'space-between',
                                gap: 2
                            }}
                        >
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                                    Save Configuration
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                                    Apply the updated profile and governance rules for your organization.
                                </Typography>
                            </Box>
                            <Box component={motion.div} whileHover={{ scale: isDirty ? 1.02 : 1 }} whileTap={{ scale: 0.98 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    startIcon={<SaveIcon />}
                                    disabled={!isDirty || !isValid || updateClubMutation.isPending}
                                    sx={{
                                        px: 4,
                                        py: 1.5,
                                        minWidth: 240,
                                        borderRadius: '14px',
                                        fontWeight: 800,
                                        bgcolor: isDirty ? '#3b82f6' : 'rgba(148,163,184,0.35)',
                                        color: 'white',
                                        '&:hover': { bgcolor: isDirty ? '#2563eb' : 'rgba(148,163,184,0.35)' }
                                    }}
                                >
                                    {updateClubMutation.isPending ? 'Saving Configuration...' : 'Save Configuration'}
                                </Button>
                            </Box>
                        </Box>
                    </SettingsSection>
                </Stack>
            </form>
        </Box>
    );
};

export default CoordinatorSettings;
