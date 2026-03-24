import { useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    TextField,
    Button,
    Stack,
    MenuItem,
    Alert,
    CircularProgress
} from '@mui/material';
import { Campaign as AnnouncementIcon, Send as SendIcon } from '@mui/icons-material';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';

const Announcements = () => {
    const [message, setMessage] = useState('');
    const [type, setType] = useState('announcement');
    const [loading, setLoading] = useState(false);

    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!message) return;

        setLoading(true);
        try {
            // 1. Fetch all user IDs
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id');

            if (profileError) throw profileError;

            // 2. Insert notifications for all users
            if (profiles) {
                const notifications = profiles.map(p => ({
                    user_id: p.id,
                    message,
                    type
                }));

                const { error: notifyError } = await supabase
                    .from('notifications')
                    .insert(notifications);

                if (notifyError) throw notifyError;

                toast.success(`Announcement sent to ${profiles.length} users!`);
                setMessage('');
            }
        } catch (err) {
            toast.error(err.message || 'Failed to send announcement');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                    <AnnouncementIcon color="secondary" sx={{ fontSize: 40 }} />
                    <Typography variant="h4" fontWeight="bold">
                        Platform Announcement
                    </Typography>
                </Stack>

                <Alert severity="info" sx={{ mb: 4 }}>
                    Your message will be sent to all registered users on the platform in real-time.
                </Alert>

                <Box component="form" onSubmit={handleBroadcast}>
                    <Stack spacing={3}>
                        <TextField
                            label="Broadcast Message"
                            multiline
                            rows={4}
                            fullWidth
                            required
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your announcement here..."
                        />

                        <TextField
                            select
                            label="Notification Type"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            <MenuItem value="announcement">Announcement</MenuItem>
                            <MenuItem value="info">Info</MenuItem>
                            <MenuItem value="success">Success</MenuItem>
                            <MenuItem value="alert">Alert/Warning</MenuItem>
                        </TextField>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button
                                variant="outlined"
                                onClick={() => setMessage('')}
                                disabled={loading}
                            >
                                Clear
                            </Button>
                            <Button
                                variant="contained"
                                color="secondary"
                                type="submit"
                                startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                                disabled={loading || !message}
                            >
                                Broadcast Now
                            </Button>
                        </Box>
                    </Stack>
                </Box>
            </Paper>
        </Container>
    );
};

export default Announcements;
