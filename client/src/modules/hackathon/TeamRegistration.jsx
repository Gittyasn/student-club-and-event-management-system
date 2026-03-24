// eslint-disable-next-line no-unused-vars
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    Grid,
    Avatar,
    // eslint-disable-next-line no-unused-vars
    IconButton,
    // eslint-disable-next-line no-unused-vars
    List,
    // eslint-disable-next-line no-unused-vars
    ListItem,
    // eslint-disable-next-line no-unused-vars
    ListItemText,
    // eslint-disable-next-line no-unused-vars
    ListItemSecondaryAction,
    // eslint-disable-next-line no-unused-vars
    Divider,
    Chip
} from '@mui/material';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
// eslint-disable-next-line no-unused-vars
import { Plus, UserPlus, X, Shield, Send } from 'lucide-react';
import { useCreateTeam } from '../../hooks/useHackathon';
import { useAuthStore } from '../../store/authStore';

const teamSchema = z.object({
    teamName: z.string().min(3, 'Team name must be at least 3 characters'),
    collegeDept: z.string().min(2, 'College/Department is required'),
    teamEmail: z.string().email('Invalid team contact email'),
});

const TeamRegistration = ({ eventId, onSuccess }) => {
    const { user } = useAuthStore();
    const createTeam = useCreateTeam();

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(teamSchema),
        defaultValues: {
            teamName: '',
            collegeDept: user?.department || '',
            teamEmail: user?.email || '',
        }
    });

    const onSubmit = (data) => {
        createTeam.mutate({
            event_id: eventId,
            name: data.teamName,
            leader_id: user.id,
            college_dept: data.collegeDept,
            contact_email: data.teamEmail
        }, {
            onSuccess: (team) => {
                if (onSuccess) onSuccess(team);
            }
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <Paper elevation={3} sx={{ p: 4, borderRadius: 4, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, background: 'linear-gradient(45deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Create Your Team
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Register your team for the hackathon. You will be the team leader.
                </Typography>

                <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Team Name"
                                {...register('teamName')}
                                error={!!errors.teamName}
                                helperText={errors.teamName?.message}
                                variant="outlined"
                                InputProps={{
                                    sx: { borderRadius: 2 }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="College / Department"
                                {...register('collegeDept')}
                                error={!!errors.collegeDept}
                                helperText={errors.collegeDept?.message}
                                variant="outlined"
                                InputProps={{
                                    sx: { borderRadius: 2 }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Team Contact Email"
                                {...register('teamEmail')}
                                error={!!errors.teamEmail}
                                helperText={errors.teamEmail?.message}
                                variant="outlined"
                                InputProps={{
                                    sx: { borderRadius: 2 }
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{ p: 2, bgcolor: 'rgba(99, 102, 241, 0.1)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar src={user?.avatar_url} sx={{ width: 40, height: 40 }} />
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        Team Leader (You)
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {user?.full_name} ({user?.email})
                                    </Typography>
                                </Box>
                                <Chip
                                    label="Leader"
                                    size="small"
                                    color="primary"
                                    icon={<Shield size={14} />}
                                    sx={{ ml: 'auto' }}
                                />
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <Button
                                fullWidth
                                type="submit"
                                variant="contained"
                                size="large"
                                loading={createTeam.isPending}
                                startIcon={<Plus />}
                                sx={{
                                    py: 1.5,
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem',
                                    background: 'linear-gradient(45deg, #6366f1, #a855f7)',
                                    '&:hover': {
                                        background: 'linear-gradient(45deg, #4f46e5, #9333ea)',
                                    }
                                }}
                            >
                                Register Team
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </motion.div >
    );
};

export default TeamRegistration;
