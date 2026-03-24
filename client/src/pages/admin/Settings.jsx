import {
    Box,
    Typography,
    Paper,
    Stack,
    Switch,
    // eslint-disable-next-line no-unused-vars
    FormControlLabel,
    Divider,
    CircularProgress,
    Chip,
    Alert,
    List,
    ListItem,
    ListItemText,
    Button,
    Grid,
    TextField
} from '@mui/material';
// eslint-disable-next-line no-unused-vars
import { Settings as SettingsIcon, CheckCircle as SavedIcon, Numbers as NumbersIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';

const SETTING_LABELS = {
    allow_student_registrations: { label: 'Student Registrations', description: 'Allow students to register for events platform-wide.' },
    require_event_approval: { label: 'Require Event Approval', description: 'All events must be approved by admin before going live.' },
    allow_new_signups: { label: 'New User Signups', description: 'Allow new users to register. Disable during maintenance.' },
    maintenance_mode: { label: 'Maintenance Mode', description: 'Put the platform in read-only maintenance mode for all users.' }
};

const AdminSettings = () => {
    const queryClient = useQueryClient();

    // eslint-disable-next-line no-unused-vars
    const { data: settings, isLoading, error } = useQuery({
        queryKey: ['systemSettings'],
        queryFn: async () => {
            const { data, error } = await supabase.from('system_settings').select('*');
            if (error) throw error;
            const map = {};
            (data || []).forEach(row => { map[row.key] = row.value; });
            return map;
        }
    });

    const updateSetting = useMutation({
        mutationFn: async ({ key, value }) => {
            await supabase.from('system_settings').upsert({ key, value: String(value) }, { onConflict: 'key' });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
            toast.success(`Protocol ${variables.key} updated`);
        }
    });

    const handleToggle = (key, currentValue) => {
        const newValue = currentValue === 'true' ? 'false' : 'true';
        updateSetting.mutate({ key, value: newValue });
    };

    const handleUpdateLimit = (e, key) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newLimit = formData.get(key);
        if (newLimit) {
            updateSetting.mutate({ key, value: newLimit });
        }
    };

    if (isLoading) return <Box display="flex" justifyContent="center" p={10}><CircularProgress /></Box>;

    const isMaintenance = settings?.maintenance_mode === 'true';

    return (
        <Box sx={{ pb: 6 }}>
            {/* Header */}
            <Box sx={{
                mb: 4, p: 4, borderRadius: '24px',
                background: isMaintenance
                    ? 'linear-gradient(135deg, #ef444420 0%, #000000 100%)'
                    : 'linear-gradient(135deg, #3b82f620 0%, #1e293b10 100%)',
                border: isMaintenance ? '2px solid #ef444440' : '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.4s ease'
            }}>
                <Stack direction="row" spacing={3} alignItems="center">
                    <Box sx={{ p: 2, borderRadius: '16px', bgcolor: isMaintenance ? '#ef444415' : 'rgba(59,130,246,0.1)', color: isMaintenance ? '#ef4444' : '#3b82f6' }}>
                        <SettingsIcon sx={{ fontSize: 32 }} />
                    </Box>
                    <Box>
                        <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>System Configuration</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {isMaintenance ? 'System is currently restricted' : 'Manage global platform protocols and access levels.'}
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            {isMaintenance && (
                <Alert severity="error" sx={{ mb: 4, borderRadius: '16px', fontWeight: 700, border: '1px solid #ef444430' }}>
                    MAINTENANCE MODE ACTIVE: Student and Coordinator access is restricted to read-only.
                </Alert>
            )}

            <Paper elevation={0} sx={{ borderRadius: '24px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <List disablePadding>
                    {Object.keys(SETTING_LABELS).map((key, idx) => {
                        const meta = SETTING_LABELS[key];
                        const isEnabled = settings?.[key] === 'true';

                        return (
                            <Box key={key}>
                                <ListItem sx={{ px: 4, py: 3, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                    <ListItemText
                                        primary={<Typography variant="subtitle1" fontWeight={800}>{meta.label}</Typography>}
                                        secondary={<Typography variant="caption" color="text.secondary" fontWeight={600}>{meta.description}</Typography>}
                                    />
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Chip
                                            label={isEnabled ? 'Active' : 'Disabled'}
                                            size="small"
                                            sx={{ fontWeight: 900, bgcolor: isEnabled ? '#10b98115' : 'rgba(0,0,0,0.2)', color: isEnabled ? '#10b981' : 'text.secondary', border: '1px solid transparent' }}
                                        />
                                        <Switch
                                            checked={isEnabled}
                                            onChange={() => handleToggle(key, settings?.[key])}
                                            color={key === 'maintenance_mode' ? 'error' : 'primary'}
                                        />
                                    </Stack>
                                </ListItem>
                                {idx < Object.keys(SETTING_LABELS).length - 1 && <Divider />}
                            </Box>
                        );
                    })}
                </List>
            </Paper>

            <Box sx={{ mt: 5, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <NumbersIcon sx={{ color: 'text.secondary' }} />
                <Typography variant="h6" fontWeight={800}>Global Platform Limits</Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Max Clubs Per Student */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight={800} gutterBottom>Max Organizations Per Student</Typography>
                        <Typography variant="body2" color="text.secondary" mb={3}>
                            Limit the maximum number of active club memberships a student can hold simultaneously to ensure fair participation.
                        </Typography>
                        <form onSubmit={(e) => handleUpdateLimit(e, 'max_clubs_per_student')}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <TextField
                                    name="max_clubs_per_student"
                                    type="number"
                                    size="small"
                                    defaultValue={settings?.max_clubs_per_student || '3'}
                                    InputProps={{ sx: { borderRadius: '12px', fontWeight: 800 } }}
                                    sx={{ width: 100 }}
                                />
                                <Button type="submit" variant="contained" size="small" sx={{ borderRadius: '12px', fontWeight: 800, px: 3 }}>
                                    Save Limit
                                </Button>
                            </Stack>
                        </form>
                    </Paper>
                </Grid>

                {/* Membership Approval Timeout */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight={800} gutterBottom>Request Auto-Reject Timeout (Days)</Typography>
                        <Typography variant="body2" color="text.secondary" mb={3}>
                            Automatically reject pending membership requests if a coordinator does not respond within this timeframe.
                        </Typography>
                        <form onSubmit={(e) => handleUpdateLimit(e, 'membership_approval_timeout_days')}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <TextField
                                    name="membership_approval_timeout_days"
                                    type="number"
                                    size="small"
                                    defaultValue={settings?.membership_approval_timeout_days || '14'}
                                    InputProps={{ sx: { borderRadius: '12px', fontWeight: 800 } }}
                                    sx={{ width: 100 }}
                                />
                                <Button type="submit" variant="contained" size="small" color="secondary" sx={{ borderRadius: '12px', fontWeight: 800, px: 3 }}>
                                    Save Timeout
                                </Button>
                            </Stack>
                        </form>
                    </Paper>
                </Grid>
            </Grid>

            <Box sx={{ mt: 4, p: 3, borderRadius: '16px', bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.02)' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Protocol Audit: All configuration changes are recorded in the security audit trail with actor identity and timestamp.
                </Typography>
            </Box>
        </Box>
    );
};

export default AdminSettings;

