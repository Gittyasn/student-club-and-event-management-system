import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import {
    // eslint-disable-next-line no-unused-vars
    Box, Grid, Paper, Typography, Button, Card, CardContent, CardActions,
    Chip, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
    // eslint-disable-next-line no-unused-vars
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    // eslint-disable-next-line no-unused-vars
    Alert, Rating, IconButton, Tooltip, Avatar,
    Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
    // eslint-disable-next-line no-unused-vars
    Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon,
    // eslint-disable-next-line no-unused-vars
    CheckCircle as ApprovedIcon, HourglassEmpty as PendingIcon,
    // eslint-disable-next-line no-unused-vars
    Settings as SettingsIcon, People as PeopleIcon, Event as EventIcon
} from '@mui/icons-material';
import RolePageHeader from '../../components/RolePageHeader';
import LoadingDots from '../../components/LoadingDots';
import { useJoinClub } from '../../hooks/useMemberships';

const ClubManagement = () => {
    const { profile } = useAuthStore();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const joinClub = useJoinClub();
    const [openDialog, setOpenDialog] = useState(false);
    const [editingClub, setEditingClub] = useState(null);
    const [formData, setFormData] = useState({
        name: '', description: '', category: 'academic', status: 'active'
    });

    // Fetch clubs
    const { data: clubs, isLoading } = useQuery({
        queryKey: ['clubs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clubs')
                .select('*')
                .order('member_count', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // Fetch user's club memberships
    const { data: userMemberships } = useQuery({
        queryKey: ['userMemberships', profile?.id],
        enabled: !!profile?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('club_memberships')
                .select('*')
                .eq('user_id', profile.id);
            if (error) throw error;
            return data || [];
        }
    });

    // Create/Update club mutation
    const clubMutation = useMutation({
        mutationFn: async (club) => {
            if (editingClub?.id) {
                const { error } = await supabase
                    .from('clubs')
                    .update(club)
                    .eq('id', editingClub.id);
                if (error) throw error;
                return editingClub.id;
            } else {
                const { data, error } = await supabase
                    .from('clubs')
                    .insert([club])
                    .select();
                if (error) throw error;
                return data[0]?.id;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clubs'] });
            setOpenDialog(false);
            setFormData({ name: '', description: '', category: 'academic', status: 'active' });
            setEditingClub(null);
        }
    });

    const handleOpenDialog = (club = null) => {
        if (club) {
            setEditingClub(club);
            setFormData(club);
        } else {
            setEditingClub(null);
            setFormData({ name: '', description: '', category: 'academic', status: 'active' });
        }
        setOpenDialog(true);
    };

    const handleSubmit = () => {
        clubMutation.mutate(formData);
    };

    if (isLoading) return <LoadingDots label="Loading clubs..." minHeight="40vh" />;

    return (
        <Box sx={{ pb: 6 }}>
            <RolePageHeader
                title="Discover Clubs"
                subtitle="Explore new communities and request membership."
                kicker="Student Dashboard"
                accent="#3b82f6"
            />
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography color="text.secondary">
                        Browse clubs, view what they do, and request membership.
                    </Typography>
                </Box>
                {profile?.role === 'admin' && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        sx={{ fontWeight: 700 }}
                    >
                        Create Club
                    </Button>
                )}
            </Box>

            <Grid container spacing={3}>
                {clubs?.map((club) => {
                    const membership = userMemberships?.find(m => m.club_id === club.id);
                    return (
                        <Grid item xs={12} sm={6} md={4} key={club.id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.3s',
                                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
                                }}
                            >
                                <CardContent sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="h6" fontWeight="800">
                                            {club.name}
                                        </Typography>
                                        <Chip
                                            label={club.category}
                                            size="small"
                                            color={
                                                club.category === 'academic' ? 'primary' :
                                                club.category === 'cultural' ? 'secondary' :
                                                club.category === 'sports' ? 'error' : 'default'
                                            }
                                            variant="outlined"
                                        />
                                    </Box>
                                    <Typography color="text.secondary" sx={{ mb: 2, minHeight: '60px' }}>
                                        {club.description?.substring(0, 100)}...
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Members
                                            </Typography>
                                            <Typography variant="h6" fontWeight="700">
                                                {club.member_count}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Rating
                                            </Typography>
                                            <Rating value={club.rating} readOnly size="small" />
                                        </Box>
                                    </Box>
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'space-between' }}>
                                    <Button size="small" color="primary" onClick={() => navigate(`/clubs/${club.id}`)}>
                                        View Details
                                    </Button>
                                    {!membership ? (
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={() => joinClub.mutate({ clubId: club.id, autoApprove: club.auto_approve_memberships })}
                                            disabled={joinClub.isPending}
                                        >
                                            Join
                                        </Button>
                                    ) : (
                                        <Chip
                                            label={membership.status === 'approved' ? 'Member' : 'Pending'}
                                            size="small"
                                            color={membership.status === 'approved' ? 'success' : 'warning'}
                                        />
                                    )}
                                </CardActions>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Create/Edit Club Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingClub ? 'Edit Club' : 'Create New Club'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2, space: 'y-4' }}>
                    <TextField
                        fullWidth
                        label="Club Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        multiline
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Category</InputLabel>
                        <Select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            label="Category"
                        >
                            <MenuItem value="academic">Academic</MenuItem>
                            <MenuItem value="cultural">Cultural</MenuItem>
                            <MenuItem value="sports">Sports</MenuItem>
                            <MenuItem value="professional">Professional</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            label="Status"
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={clubMutation.isPending}>
                        {editingClub ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ClubManagement;
