import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box,
    Typography,
    Grid,
    Chip,
    Button,
    CircularProgress,
    Divider
} from '@mui/material';
import {
    AccessTime as PendingIcon,
    CheckCircle as ApprovedIcon,
    Cancel as RejectedIcon,
    ExitToApp as LeaveIcon,
    Explore,
    ChevronRight,
    SearchOff,
    AutoAwesome,
    Chat as ChatIcon
} from '@mui/icons-material';
import { useMyMemberships, useJoinClub, useLeaveClub } from '../../hooks/useMemberships';
import { useClubs } from '../../hooks/useClubs';
import { useNavigate } from 'react-router-dom';
import RolePageHeader from '../../components/RolePageHeader';

const MyClubs = () => {
    const { data: memberships, isLoading: loadingMemberships } = useMyMemberships();
    const { data: allClubs, isLoading: loadingClubs } = useClubs();
    const joinClub = useJoinClub();
    const leaveClub = useLeaveClub();
    const navigate = useNavigate();
    const [joiningClubId, setJoiningClubId] = useState(null);

    if (loadingMemberships || loadingClubs) return <CircularProgress sx={{ display: 'block', m: '50px auto' }} />;

    const handleLeave = (id) => {
        if (window.confirm("Are you sure you want to leave this club?")) {
            leaveClub.mutate(id);
        }
    };

    const joinedClubIds = new Set(memberships?.map(m => m.club_id) || []);
    const availableClubs = allClubs?.filter(club => !joinedClubIds.has(club.id)) || [];

    const getStatusChip = (status, isSub) => {
        if (isSub && status === 'approved') return <Chip label="Sub-Coordinator" color="secondary" size="small" icon={<AutoAwesome />} sx={{ fontWeight: 800, borderRadius: '6px' }} />;

        switch (status) {
            case 'approved': return <Chip label="Member" color="success" size="small" icon={<ApprovedIcon />} sx={{ fontWeight: 800, borderRadius: '6px' }} />;
            case 'pending': return <Chip label="Pending" color="warning" size="small" icon={<PendingIcon />} sx={{ fontWeight: 800, borderRadius: '6px' }} />;
            case 'rejected': return <Chip label="Rejected" color="error" size="small" icon={<RejectedIcon />} sx={{ fontWeight: 800, borderRadius: '6px' }} />;
            default: return <Chip label={status} size="small" sx={{ fontWeight: 800, borderRadius: '6px' }} />;
        }
    };

    return (
        <Box sx={{ pb: 8 }}>
            <RolePageHeader
                title="My Clubs"
                subtitle="Manage memberships, requests, and community spaces."
            />
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ mb: 5 }}
            >
                <Typography variant="h3" className="text-gradient" fontWeight="900" sx={{ letterSpacing: -1.5, mb: 1 }}>
                    Clubs & Communities
                </Typography>
                <Typography color="text.secondary" variant="body1" fontWeight="500">
                    Connect, collaborate, and grow with campus organizations.
                </Typography>
            </Box>

            <Box sx={{ mb: 6 }}>
                <Typography variant="h6" fontWeight="800" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, opacity: 0.9 }}>
                    <AutoAwesome color="primary" /> Your Memberships
                </Typography>

                {(!memberships || memberships.length === 0) ? (
                    <Box
                        className="glass-card"
                        sx={{ p: 6, textAlign: 'center', borderRadius: 4, border: '1px dashed rgba(255,255,255,0.1)' }}
                    >
                        <SearchOff sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                        <Typography color="text.secondary" fontWeight="500">You haven&apos;t joined any clubs yet. Time to explore!</Typography>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        <AnimatePresence>
                            {memberships.map((m, index) => (
                                <Grid item xs={12} sm={6} md={4} key={m.id}>
                                    <Box
                                        component={motion.div}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3, delay: index * 0.1 }}
                                        className="glass-card"
                                        sx={{
                                            height: '100%',
                                            borderRadius: 4,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-8px)',
                                                borderColor: 'success.main'
                                            }
                                        }}
                                    >
                                        <Box sx={{ p: 3, flexGrow: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Typography variant="h5" fontWeight="900" sx={{ letterSpacing: -0.5 }}>{m.club?.name}</Typography>
                                                {getStatusChip(m.status, m.is_sub_coordinator)}
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" fontWeight="500" sx={{ opacity: 0.7 }}>
                                                Member since {new Date(m.joined_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                            </Typography>
                                            {m.status === 'approved' && (
                                                <Typography variant="body2" color="primary.main" fontWeight="600" sx={{ mt: 1 }}>
                                                    {m.club?.events?.[0]?.count || 0} events conducted
                                                </Typography>
                                            )}
                                        </Box>
                                        <Divider sx={{ opacity: 0.05 }} />
                                        <Box sx={{ p: 2, textAlign: 'right', display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                            {m.status === 'approved' && (
                                                <Button
                                                    size="small"
                                                    color="primary"
                                                    variant="contained"
                                                    startIcon={<ChatIcon />}
                                                    onClick={() => navigate(`/student/clubs/${m.club_id}/chat`)}
                                                    sx={{ borderRadius: 2, fontWeight: 700 }}
                                                >
                                                    Chat
                                                </Button>
                                            )}
                                            <Button
                                                size="small"
                                                color="error"
                                                startIcon={<LeaveIcon />}
                                                disabled={m.status === 'pending' || leaveClub.isPending}
                                                onClick={() => handleLeave(m.id)}
                                                sx={{ borderRadius: 2, fontWeight: 700 }}
                                            >
                                                Leave
                                            </Button>
                                        </Box>
                                    </Box>
                                </Grid>
                            ))}
                        </AnimatePresence>
                    </Grid>
                )}
            </Box>

            <Box>
                <Typography variant="h6" fontWeight="800" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, opacity: 0.9 }}>
                    <Explore color="secondary" /> Discover New Communities
                </Typography>

                <Grid container spacing={3}>
                    {availableClubs.map((club, index) => (
                        <Grid item xs={12} sm={6} md={4} key={club.id}>
                            <Box
                                component={motion.div}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                className="glass-card"
                                sx={{
                                    borderRadius: 4,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.3s',
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        borderColor: 'primary.main'
                                    }
                                }}
                            >
                                <Box sx={{ p: 3, flexGrow: 1 }}>
                                    <Typography variant="h5" fontWeight="900" sx={{ mb: 1.5, letterSpacing: -0.5 }}>{club.name}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{
                                        lineHeight: 1.6,
                                        fontWeight: 500,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        opacity: 0.8
                                    }}>
                                        {club.description}
                                    </Typography>
                                </Box>
                                <Divider sx={{ opacity: 0.05 }} />
                                <Box sx={{ p: 2.5 }}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        color="primary"
                                        endIcon={<ChevronRight />}
                                        onClick={() => {
                                            setJoiningClubId(club.id);
                                            joinClub.mutate(
                                                { clubId: club.id, autoApprove: club.auto_approve_memberships },
                                                { onSettled: () => setJoiningClubId(null) }
                                            );
                                        }}
                                        disabled={joiningClubId === club.id}
                                        sx={{
                                            borderRadius: 3,
                                            fontWeight: 800,
                                            py: 1.2,
                                            boxShadow: '0 8px 20px rgba(59, 130, 246, 0.2)'
                                        }}
                                    >
                                        {joiningClubId === club.id ? 'Processing...' : 'Request to Join'}
                                    </Button>
                                </Box>
                            </Box>
                        </Grid>
                    ))}
                    {availableClubs.length === 0 && (
                        <Grid item xs={12}>
                            <Box className="glass-card" sx={{ p: 4, textAlign: 'center', borderRadius: 4, opacity: 0.6 }}>
                                <Typography color="text.secondary" fontWeight="500">No new clubs available to join at this time.</Typography>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </Box>
        </Box >
    );
};

export default MyClubs;
