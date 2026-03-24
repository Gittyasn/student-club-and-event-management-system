// eslint-disable-next-line no-unused-vars
import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Avatar,
    // eslint-disable-next-line no-unused-vars
    IconButton,
    Chip,
    Button,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Divider,
    LinearProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import {
    Users,
    Rocket,
    Mail,
    Building2,
    LogOut,
    CheckCircle2,
    Clock,
    ExternalLink,
    Code2
} from 'lucide-react';
import { useLeaveTeam } from '../../hooks/useHackathon';
import { useAuthStore } from '../../store/authStore';

const TeamDashboard = ({ team, event, onAction }) => {
    const { user } = useAuthStore();
    const leaveTeam = useLeaveTeam(event.id);
    const isLeader = team.leader_id === user.id;

    const handleLeave = () => {
        if (window.confirm(isLeader ? 'Are you sure you want to disband this team?' : 'Are you sure you want to leave this team?')) {
            leaveTeam.mutate({ teamId: team.id, userId: user.id, isLeader });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <Grid container spacing={3}>
                {/* Team Info Header */}
                <Grid item xs={12}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 4,
                            borderRadius: 4,
                            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                            color: 'white',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Decorative background circles */}
                        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', filter: 'blur(40px)' }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                                    {team.team_name}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <Chip
                                        icon={<Building2 size={16} color="white" />}
                                        label={team.college_dept}
                                        sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
                                    />
                                    <Chip
                                        icon={<Mail size={16} color="white" />}
                                        label={team.team_email}
                                        sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
                                    />
                                </Box>
                            </Box>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<LogOut size={18} />}
                                onClick={handleLeave}
                                sx={{ borderRadius: 2, borderColor: 'rgba(239, 68, 68, 0.5)', color: '#ef4444' }}
                            >
                                {isLeader ? 'Disband Team' : 'Leave Team'}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* Team Members */}
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
                            <Users size={20} /> Team Members
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <List>
                            {team.team_members?.map((member) => (
                                <ListItem key={member.user_id} sx={{ px: 0 }}>
                                    <ListItemAvatar>
                                        <Avatar />
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={member.profiles?.full_name}
                                        secondary={member.user_id === team.leader_id ? 'Team Leader' : 'Team Member'}
                                    />
                                    {member.user_id === team.leader_id && (
                                        <Chip label="Lead" size="small" color="primary" variant="outlined" />
                                    )}
                                </ListItem>
                            ))}
                        </List>
                        {isLeader && team.team_members?.length < 5 && (
                            <Button
                                fullWidth
                                variant="dashed"
                                startIcon={<CheckCircle2 size={18} />}
                                sx={{ mt: 2, border: '1px dashed #ccc', borderRadius: 2 }}
                            >
                                Invite Members
                            </Button>
                        )}
                    </Paper>
                </Grid>

                {/* Progress & Submission */}
                <Grid item xs={12} md={7}>
                    <Paper sx={{ p: 3, borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
                                <Rocket size={20} /> Current Status
                            </Typography>
                            <Chip label="Round 1: Screening" color="secondary" />
                        </Box>

                        <Box sx={{ mb: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">Project Progress</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>60%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={60} sx={{ height: 8, borderRadius: 4 }} />
                        </Box>

                        <Box sx={{ flexGrow: 1, bgcolor: '#f8fafc', p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Code2 size={20} /> Project Submission
                            </Typography>

                            {team.github_link ? (
                                <Box>
                                    <Typography variant="body2" sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <CheckCircle2 size={16} /> Submitted
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Last updated: {new Date(team.submitted_at).toLocaleString()}
                                    </Typography>
                                </Box>
                            ) : (
                                <Box>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        No submission found for this round yet. Deadline is approaching!
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        onClick={() => onAction('submit')}
                                        sx={{ borderRadius: 2, background: 'linear-gradient(45deg, #6366f1, #a855f7)' }}
                                    >
                                        Submit Now
                                    </Button>
                                </Box>
                            )}
                        </Box>

                        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                            <Button startIcon={<Clock size={18} />} sx={{ color: 'text.secondary', textTransform: 'none' }}>
                                Timeline
                            </Button>
                            <Button startIcon={<ExternalLink size={18} />} sx={{ color: 'text.secondary', textTransform: 'none' }}>
                                Resources
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </motion.div>
    );
};

export default TeamDashboard;
