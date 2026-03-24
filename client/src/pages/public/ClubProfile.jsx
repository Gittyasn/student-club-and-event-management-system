import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import {
    Container, Typography, Box, Grid, Card, CardContent, CircularProgress,
    Avatar, Chip, Stack, Button, Divider, Paper
} from '@mui/material';
import {
    Event as EventIcon, People as PeopleIcon, CalendarMonth as CalendarIcon,
    // eslint-disable-next-line no-unused-vars
    Email as EmailIcon, ConnectWithoutContact as ConnectIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { useJoinClub, useMyMemberships } from '../../hooks/useMemberships';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const ClubProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const joinClubMutation = useJoinClub();
    const { data: myMemberships } = useMyMemberships();

    const { data: club, isLoading } = useQuery({
        queryKey: ['clubProfile', id],
        queryFn: async () => {
            // Fetch club details, category, coordinator, and counts
            const { data: clubData, error: clubError } = await supabase
                .from('clubs')
                .select(`
                    *,
                    category:club_categories(name),
                    coordinator:profiles!coordinator_id(full_name, email, avatar_url),
                    members:club_memberships(count),
                    events:events(count)
                `)
                .eq('id', id)
                .single();

            if (clubError) throw clubError;

            // Fetch upcoming events
            const { data: upcomingEvents } = await supabase
                .from('events')
                .select('id, title, start_time, event_type')
                .eq('club_id', id)
                .eq('approval_status', 'approved')
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
                .limit(3);

            return {
                ...clubData,
                memberCount: clubData.members?.[0]?.count || 0,
                eventCount: clubData.events?.[0]?.count || 0,
                upcomingEvents: upcomingEvents || []
            };
        }
    });

    if (isLoading) return <Box display="flex" justifyContent="center" height="50vh" alignItems="center"><CircularProgress /></Box>;
    if (!club) return <Container sx={{ py: 10, textAlign: 'center' }}><Typography variant="h5" color="error">Organization not found or inactive.</Typography></Container>;

    const membershipStatus = myMemberships?.find(m => m.club_id === club.id)?.status;
    const isStudent = profile?.role === 'student';
    const isCoordinator = profile?.role === 'coordinator' && profile?.club_id === club.id;

    const handleJoinClick = () => {
        if (!user) {
            toast.error("Please login to join.");
            navigate('/login');
            return;
        }
        if (!club.is_accepting_members) {
            toast.error("This organization is not currently accepting new members.");
            return;
        }
        joinClubMutation.mutate({
            clubId: club.id,
            autoApprove: club.auto_approve_memberships
        });
    };

    return (
        <Box sx={{ pb: 8 }}>
            {/* Banner Section */}
            <Box sx={{
                height: 300,
                width: '100%',
                position: 'relative',
                bgcolor: 'grey.900',
                backgroundImage: `url(${club.banner_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=2000'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                '&::after': {
                    content: '""', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'linear-gradient(to top, #0f172a 0%, transparent 100%)'
                }
            }}>
                <Container maxWidth="lg" sx={{ height: '100%', position: 'relative', zIndex: 2 }}>
                    <Box sx={{ position: 'absolute', bottom: -40, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                        <Avatar
                            src={club.logo_url}
                            alt={club.name}
                            sx={{
                                width: 140, height: 140,
                                border: '4px solid #0f172a',
                                bgcolor: 'white',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}
                        />
                        <Box sx={{ pb: 6 }}>
                            <Typography variant="h3" fontWeight={900} color="white" sx={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                                {club.name}
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                {club.category?.name && (
                                    <Chip label={club.category.name} color="primary" size="small" sx={{ fontWeight: 800 }} />
                                )}
                                <Chip
                                    label={club.status.toUpperCase()}
                                    size="small"
                                    color={club.status === 'active' ? 'success' : 'error'}
                                    sx={{ fontWeight: 800 }}
                                />
                            </Stack>
                        </Box>
                    </Box>
                </Container>
            </Box>

            <Container maxWidth="lg" sx={{ mt: 10 }}>
                <Grid container spacing={4}>
                    {/* Main Content */}
                    <Grid item xs={12} md={8}>
                        <Typography variant="h6" fontWeight={800} gutterBottom>About the Organization</Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
                            {club.description || 'No description provided.'}
                        </Typography>

                        <Typography variant="h6" fontWeight={800} gutterBottom sx={{ mt: 4 }}>Upcoming Events</Typography>
                        <Stack spacing={2} sx={{ mb: 4 }}>
                            {club.upcomingEvents.length === 0 ? (
                                <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                                    <Typography color="text.secondary">No upcoming events scheduled.</Typography>
                                </Paper>
                            ) : (
                                club.upcomingEvents.map(event => (
                                    <Paper key={event.id} elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={800}>{event.title}</Typography>
                                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} mt={0.5}>
                                                <CalendarIcon fontSize="inherit" /> {event.start_time ? new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD'}
                                            </Typography>
                                        </Box>
                                        <Button variant="outlined" size="small" onClick={() => navigate(`/events/${event.id}`)}>Details</Button>
                                    </Paper>
                                ))
                            )}
                        </Stack>

                        {isCoordinator && (
                            <Box sx={{ mt: 4, p: 3, borderRadius: '16px', bgcolor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <Typography variant="subtitle2" color="primary" fontWeight={800}>Coordinator Access</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                                    You are the assigned coordinator for this organization. Access the dashboard to manage members and events.
                                </Typography>
                                <Button variant="contained" onClick={() => navigate('/coordinator')} sx={{ fontWeight: 800 }}>Go to Dashboard</Button>
                            </Box>
                        )}
                    </Grid>

                    {/* Sidebar Information */}
                    <Grid item xs={12} md={4}>
                        <Card sx={{ borderRadius: '24px', bgcolor: 'rgba(30,41,59,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight={800} gutterBottom>At a Glance</Typography>

                                <Stack spacing={3} sx={{ mt: 3 }}>
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}><PeopleIcon /></Box>
                                        <Box>
                                            <Typography variant="h6" fontWeight={900}>{club.memberCount}</Typography>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Active Members</Typography>
                                        </Box>
                                    </Box>

                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(16,185,129,0.1)', color: '#34d399' }}><EventIcon /></Box>
                                        <Box>
                                            <Typography variant="h6" fontWeight={900}>{club.eventCount}</Typography>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Events Hosted</Typography>
                                        </Box>
                                    </Box>

                                    {club.founded_year && (
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(244,114,182,0.1)', color: '#f472b6' }}><CalendarIcon /></Box>
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight={800}>{club.founded_year}</Typography>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Established</Typography>
                                            </Box>
                                        </Box>
                                    )}
                                </Stack>

                                <Divider sx={{ my: 3 }} />

                                <Typography variant="subtitle2" fontWeight={800} color="text.secondary" textTransform="uppercase" gutterBottom>Leadership</Typography>
                                {club.coordinator ? (
                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
                                        <Avatar src={club.coordinator.avatar_url}>{club.coordinator.full_name?.charAt(0)}</Avatar>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={800}>{club.coordinator.full_name}</Typography>
                                            <Typography variant="caption" color="text.secondary">Primary Coordinator</Typography>
                                        </Box>
                                    </Stack>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">No coordinator assigned.</Typography>
                                )}

                                <Divider sx={{ my: 3 }} />

                                {/* Action Button */}
                                {(isStudent || !user) && (
                                    <Box component={motion.div} whileHover={{ scale: club.is_accepting_members && !membershipStatus ? 1.02 : 1 }} whileTap={{ scale: 0.98 }}>
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            size="large"
                                            startIcon={membershipStatus === 'approved' ? <ConnectIcon /> : <PeopleIcon />}
                                            onClick={handleJoinClick}
                                            disabled={joinClubMutation.isPending || membershipStatus === 'pending' || !club.is_accepting_members || membershipStatus === 'approved'}
                                            sx={{
                                                py: 1.5, borderRadius: '12px', fontWeight: 800,
                                                bgcolor: membershipStatus ? (membershipStatus === 'approved' ? '#10b981' : 'rgba(255,255,255,0.1)') : '#3b82f6',
                                                color: membershipStatus === 'pending' ? 'white' : undefined
                                            }}
                                        >
                                            {membershipStatus === 'approved' ? 'Active Member' :
                                                membershipStatus === 'pending' ? 'Request Pending' :
                                                    !club.is_accepting_members ? 'Not Accepting Members' : 'Join Organization'}
                                        </Button>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default ClubProfile;
