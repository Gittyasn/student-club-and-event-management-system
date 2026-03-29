import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Switch, FormControlLabel, Divider, Alert } from '@mui/material';
import LoadingDots from '../LoadingDots';
import {
    Email as EmailIcon,
    Event as EventIcon,
    Chat as ChatIcon,
    Group as GroupIcon,
    SettingsSystemDaydream as SystemIcon
} from '@mui/icons-material';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';

const NotificationSettings = () => {
    const { user } = useAuthStore();
    const { preferences, fetchPreferences, updatePreferences } = useNotificationStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchPreferences(user.id).finally(() => setLoading(false));
        }
    }, [user, fetchPreferences]);

    const handleToggle = async (field) => {
        try {
            await updatePreferences(user.id, { [field]: !preferences[field] });
            toast.success('Preference updated successfully');
        // eslint-disable-next-line no-unused-vars
        } catch (error) {
            toast.error('Failed to update preference');
        }
    };

    if (loading) return <LoadingDots label="Loading notification settings..." minHeight="160px" />;

    if (!preferences) return <Alert severity="error">Unable to load notification preferences.</Alert>;

    const options = [
        { id: 'email_enabled', label: 'Email Notifications', desc: 'Receive important updates via email alerts.', icon: <EmailIcon color="primary" /> },
        { id: 'event_reminders_enabled', label: 'Event Reminders', desc: 'Get alerts before registered events begin.', icon: <EventIcon color="info" /> },
        { id: 'chat_enabled', label: 'Chat Alerts', desc: 'Notify me when I receive new module messages.', icon: <ChatIcon color="success" /> },
        { id: 'membership_enabled', label: 'Membership Updates', desc: 'Alerts regarding club approvals, roles, and status.', icon: <GroupIcon color="warning" /> },
        { id: 'system_enabled', label: 'System Alerts', desc: 'Required account and critical platform warnings.', icon: <SystemIcon color="error" /> }
    ];

    return (
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', maxWidth: 800 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Notification Preferences</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Control how and when you want to receive alerts from the platform.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {options.map((option, index) => (
                    <Box key={option.id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 2, display: 'flex' }}>
                                    {option.icon}
                                </Box>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="600">{option.label}</Typography>
                                    <Typography variant="body2" color="text.secondary">{option.desc}</Typography>
                                </Box>
                            </Box>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(preferences[option.id])}
                                        onChange={() => handleToggle(option.id)}
                                        color="primary"
                                        disabled={option.id === 'system_enabled'} // Typically prevent turning off critical system alerts
                                    />
                                }
                                label=""
                            />
                        </Box>
                        {index < options.length - 1 && <Divider sx={{ mt: 3 }} />}
                    </Box>
                ))}
            </Box>
        </Paper>
    );
};

export default NotificationSettings;
