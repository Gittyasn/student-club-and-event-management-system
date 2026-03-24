import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Grid,
    MenuItem, Select, FormControl, InputLabel, Alert, CircularProgress
} from '@mui/material';
import { Campaign as CampaignIcon, Send as SendIcon } from '@mui/icons-material';
import { useNotificationStore } from '../../store/notificationStore';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';

const BroadcastNotification = () => {
    const { broadcastNotification } = useNotificationStore();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetRole, setTargetRole] = useState('all');
    const [targetClub, setTargetClub] = useState('');
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingClubs, setFetchingClubs] = useState(true);

    useEffect(() => {
        const fetchClubs = async () => {
            const { data, error } = await supabase.from('clubs').select('id, name').eq('status', 'active');
            if (!error && data) setClubs(data);
            setFetchingClubs(false);
        };
        fetchClubs();
    }, []);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;

        setLoading(true);
        try {
            await broadcastNotification(
                title.trim(),
                message.trim(),
                targetClub ? null : targetRole,
                targetClub || null
            );
            toast.success('System broadcast sent successfully!');
            setTitle('');
            setMessage('');
        } catch (error) {
            console.error("Broadcast failed:", error);
            toast.error(error.message || 'Failed to send broadcast');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, mb: 10 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Box sx={{
                    width: 48, height: 48, borderRadius: '12px',
                    background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                }}>
                    <CampaignIcon sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>Push Notification Alert</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Send targeted system notifications directly to user Notification Centers.
                    </Typography>
                </Box>
            </Box>

            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <form onSubmit={handleSend}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Broadcasts immediately appear in the Notification Bell with a &quot;Broadcast&quot; priority tag.
                            </Alert>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Target Audience Profile</InputLabel>
                                <Select
                                    value={targetRole}
                                    onChange={(e) => { setTargetRole(e.target.value); setTargetClub(''); }}
                                    label="Target Audience Profile"
                                >
                                    <MenuItem value="all">Every Account</MenuItem>
                                    <MenuItem value="student">Students Only</MenuItem>
                                    <MenuItem value="coordinator">Coordinators Only</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth disabled={fetchingClubs || targetRole !== 'student'}>
                                <InputLabel>Or Target Specific Club</InputLabel>
                                <Select
                                    value={targetClub}
                                    onChange={(e) => { setTargetClub(e.target.value); setTargetRole(''); }}
                                    label="Or Target Specific Club"
                                >
                                    <MenuItem value=""><em>None (Use Profile Target)</em></MenuItem>
                                    {clubs.map(club => (
                                        <MenuItem key={club.id} value={club.id}>{club.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Alert Title"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Scheduled Maintenance Downtime"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Notification Message"
                                required
                                multiline
                                rows={4}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Detail what users need to know..."
                            />
                        </Grid>

                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                color="error"
                                size="large"
                                disabled={loading || !title.trim() || !message.trim()}
                                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                sx={{ px: 4, py: 1.5, borderRadius: 2 }}
                            >
                                Dispatch Broadcast
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Paper>
        </Box>
    );
};

export default BroadcastNotification;
