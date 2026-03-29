import { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, CardMedia,
    // eslint-disable-next-line no-unused-vars
    Button, Chip, TextField, IconButton, InputAdornment,
    FormControl, InputLabel, Select, MenuItem, Stack,
    // eslint-disable-next-line no-unused-vars
    Paper, Divider, Badge, Tooltip
} from '@mui/material';
import {
    Search as SearchIcon,
    // eslint-disable-next-line no-unused-vars
    FilterList as FilterIcon,
    LocationOn as VenueIcon,
    // eslint-disable-next-line no-unused-vars
    AccessTime as DeadlineIcon,
    Group as ClubIcon,
    CalendarMonth as DateIcon,
    OnlinePrediction as OnlineIcon,
    WifiOff as OfflineIcon,
    // eslint-disable-next-line no-unused-vars
    TrendingUp,
    People as SeatsIcon,
    // eslint-disable-next-line no-unused-vars
    ArrowForward as DetailsIcon,
    Lock as PrivateIcon,
    QueuePlayNext as WaitlistIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEvents, useEventCategories } from '../../hooks/useEvents';
import { useClubs } from '../../hooks/useClubs';
import { useRegisterEvent } from '../../hooks/useMyRegistrations';
import RolePageHeader from '../../components/RolePageHeader';
import LoadingDots from '../../components/LoadingDots';

const BrowseEvents = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [clubFilter, setClubFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [modeFilter, setModeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date');

    // We only want students to see events that are strictly open for registration
    const { data: events, isLoading: eventsLoading } = useEvents({
        approval_status: 'approved',
        status: ['registration_open', 'approved'] // 'approved' as fallback if coordinators don't advance the state manually
    });

    const { data: clubs } = useClubs();
    const { data: categories } = useEventCategories();
    const registerMutation = useRegisterEvent();

    const filteredEvents = useMemo(() => {
        if (!events) return [];

        let result = events.filter(event => {
            const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
                event.club?.name?.toLowerCase().includes(search.toLowerCase());
            const matchesClub = clubFilter === 'all' || event.club_id === clubFilter;
            const matchesMode = modeFilter === 'all' || event.mode === modeFilter;
            const matchesCategory = categoryFilter === 'all' || event.category_id === categoryFilter;

            // Strict deadline enforcement
            const isActive = event.registration_deadline ? new Date(event.registration_deadline) >= new Date() : true;

            return matchesSearch && matchesClub && matchesMode && matchesCategory && isActive;
        });

        // Client-side sorting
        result.sort((a, b) => {
            if (sortBy === 'date') return new Date(a.start_time) - new Date(b.start_time);
            if (sortBy === 'popularity') return (b.registrationsCount || 0) - (a.registrationsCount || 0);
            if (sortBy === 'seats') {
                const aSeats = (a.max_participants || 1000) - (a.registrationsCount || 0);
                const bSeats = (b.max_participants || 1000) - (b.registrationsCount || 0);
                return aSeats - bSeats; // Lowest seats left first (Urgency)
            }
            return 0;
        });

        return result;
    }, [events, search, clubFilter, modeFilter, categoryFilter, sortBy]);

    const handleRegister = (event) => {
        // If event is private, registration is blocked. If waitlist required, UI shows "Join Waitlist", mutation hooks handle logic.
        registerMutation.mutate(event.id);
    };

    if (eventsLoading) return <LoadingDots label="Loading events..." minHeight="60vh" />;

    return (
        <Box sx={{ pb: 8 }}>
            <RolePageHeader
                title="Browse Events"
                subtitle="Discover approved events and register in seconds."
            />
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ mb: 6 }}
            >
                <Typography variant="h3" fontWeight="900" sx={{ letterSpacing: -1.5, mb: 1, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Discover Experiences
                </Typography>
                <Typography color="text.secondary" variant="body1" fontWeight="500">
                    Register for active technical, cultural, and campus events.
                </Typography>
            </Box>

            {/* Filters Section */}
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ mb: 4, p: 3, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
            >
                <TextField
                    placeholder="Search by event or club..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="primary" />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ flexGrow: 1 }}
                />

                <FormControl sx={{ minWidth: 160 }}>
                    <InputLabel>Host Club</InputLabel>
                    <Select value={clubFilter} onChange={(e) => setClubFilter(e.target.value)} label="Host Club">
                        <MenuItem value="all">All Clubs</MenuItem>
                        {clubs?.map(club => (
                            <MenuItem key={club.id} value={club.id}>{club.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 140 }}>
                    <InputLabel>Mode</InputLabel>
                    <Select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} label="Mode">
                        <MenuItem value="all">All Modes</MenuItem>
                        <MenuItem value="online">Online</MenuItem>
                        <MenuItem value="offline">Offline</MenuItem>
                        <MenuItem value="hybrid">Hybrid</MenuItem>
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 160 }}>
                    <InputLabel>Category</InputLabel>
                    <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} label="Category">
                        <MenuItem value="all">All Categories</MenuItem>
                        {categories?.map((cat) => (
                            <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 140 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort By">
                        <MenuItem value="date">Chronological</MenuItem>
                        <MenuItem value="popularity">Most Popular</MenuItem>
                        <MenuItem value="seats">Fewest Seats Left</MenuItem>
                    </Select>
                </FormControl>
            </Stack>

            {/* Results Section */}
            <Grid container spacing={3}>
                <AnimatePresence>
                    {filteredEvents.length === 0 ? (
                        <Grid item xs={12}>
                            <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                                <SearchIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">No matching events</Typography>
                                <Typography variant="body2" color="text.secondary">Try adjusting your search or filters to see more events.</Typography>
                                <Button variant="outlined" sx={{ mt: 3, fontWeight: 700 }} onClick={() => { setSearch(''); setClubFilter('all'); setModeFilter('all'); setCategoryFilter('all'); }}>Reset Filters</Button>
                            </Box>
                        </Grid>
                    ) : (
                        filteredEvents.map((event, index) => {
                            const isFull = event.max_participants && (event.registrationsCount || 0) >= event.max_participants;
                            const seatsLeft = event.max_participants ? (event.max_participants - (event.registrationsCount || 0)) : null;

                            return (
                                <Grid item xs={12} sm={6} md={4} key={event.id}>
                                    <Card
                                        component={motion.div}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                        whileHover={{ y: -8 }}
                                        sx={{
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            borderRadius: 4,
                                            border: '1px solid',
                                            borderColor: isFull && !event.allow_waitlist ? 'rgba(239, 68, 68, 0.3)' : 'divider',
                                            transition: 'transform 0.3s, box-shadow 0.3s',
                                            '&:hover': {
                                                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
                                                borderColor: 'primary.main'
                                            }
                                        }}
                                    >
                                        <Box sx={{ position: 'relative' }}>
                                            <CardMedia
                                                component="img"
                                                height="200"
                                                image={event.poster_url || 'https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?q=80&w=600&auto=format&fit=crop&q=75'} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?q=80&w=600&auto=format&fit=crop&q=75'; }}
                                                alt={event.title}
                                                sx={{ objectFit: 'cover', filter: isFull && !event.allow_waitlist ? 'grayscale(100%)' : 'none' }}
                                            />
                                            <Box sx={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 1 }}>
                                                {event.visibility === 'members_only' && (
                                                    <Chip
                                                        label="Members Only"
                                                        size="small"
                                                        icon={<PrivateIcon sx={{ fontSize: '14px !important' }} />}
                                                        sx={{ bgcolor: '#8b5cf6', color: 'white', fontWeight: 900, boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}
                                                    />
                                                )}
                                            </Box>
                                            <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 1 }}>
                                                <Chip
                                                    label={event.mode.toUpperCase()}
                                                    size="small"
                                                    icon={event.mode === 'online' ? <OnlineIcon sx={{ fontSize: '14px !important' }} /> : <OfflineIcon sx={{ fontSize: '14px !important' }} />}
                                                    sx={{ bgcolor: 'background.paper', fontWeight: 900, backdropFilter: 'blur(8px)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                                                />
                                            </Box>
                                        </Box>

                                        <CardContent sx={{ flexGrow: 1, p: 3 }}>
                                            <Stack spacing={1.5}>
                                                <Typography variant="h5" fontWeight="900" sx={{ letterSpacing: -0.5, lineHeight: 1.2 }}>
                                                    {event.title}
                                                </Typography>

                                                <Chip
                                                    icon={<ClubIcon fontSize="small" />}
                                                    label={event.club?.name || 'Independent Club'}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ alignSelf: 'flex-start', fontWeight: 700, borderRadius: '6px' }}
                                                />

                                                <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {event.short_description || event.description}
                                                </Typography>

                                                <Stack spacing={1} sx={{ pt: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                                                        <DateIcon fontSize="small" color="primary" />
                                                        <Typography variant="body2" fontWeight="600">
                                                            {new Date(event.start_time).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                                                        <VenueIcon fontSize="small" color="primary" />
                                                        <Typography variant="body2" fontWeight="500">
                                                            {event.mode === 'online' ? 'Online event link' : (event.location || 'Location to be announced')}
                                                        </Typography>
                                                    </Box>

                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                                                        {seatsLeft !== null && seatsLeft > 0 ? (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: seatsLeft <= 5 ? 'error.main' : 'success.main' }}>
                                                                <SeatsIcon fontSize="small" />
                                                                <Typography variant="caption" fontWeight="800">
                                                                    {seatsLeft} / {event.max_participants} seats open
                                                                </Typography>
                                                            </Box>
                                                        ) : (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: event.allow_waitlist ? 'warning.main' : 'error.main' }}>
                                                                <SeatsIcon fontSize="small" />
                                                                <Typography variant="caption" fontWeight="800">
                                                                    {event.allow_waitlist ? 'Waitlist Active' : 'Capacity Locked'}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </Stack>
                                            </Stack>
                                        </CardContent>

                                        <Divider sx={{ opacity: 0.1 }} />

                                        <Box sx={{ p: 2, display: 'flex', gap: 1.5 }}>
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                onClick={() => navigate(`/events/${event.id}`)}
                                                sx={{ borderRadius: 3, fontWeight: 700, textTransform: 'none' }}
                                            >
                                                View Details
                                            </Button>
                                            <Button
                                                variant={isFull ? "outlined" : "contained"}
                                                fullWidth
                                                color={isFull ? (event.allow_waitlist ? "warning" : "inherit") : "primary"}
                                                disabled={(isFull && !event.allow_waitlist) || registerMutation.isPending}
                                                onClick={() => handleRegister(event)}
                                                startIcon={isFull && event.allow_waitlist ? <WaitlistIcon /> : null}
                                                sx={{
                                                    borderRadius: 3,
                                                    fontWeight: 800,
                                                    textTransform: 'none',
                                                    boxShadow: !isFull ? '0 8px 16px -4px rgba(59, 130, 246, 0.3)' : 'none'
                                                }}
                                            >
                                                {isFull ? (event.allow_waitlist ? 'Join Waitlist' : 'Full') : (registerMutation.isPending ? 'Submitting...' : 'Register')}
                                            </Button>
                                        </Box>
                                    </Card>
                                </Grid>
                            );
                        })
                    )}
                </AnimatePresence>
            </Grid>
        </Box>
    );
};

export default BrowseEvents;
