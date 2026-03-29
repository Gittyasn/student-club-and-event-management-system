import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as ActiveIcon,
    Block as InactiveIcon,
    PersonAdd as AssignIcon,
    BarChart as AnalyticsIcon
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useClubs } from '../../hooks/useClubs';
import { useClubMutations } from '../../hooks/useClubMutations';
import { useUsers } from '../../hooks/useUsers';
import { useUserMutations } from '../../hooks/useUserMutations';
import { useClubCategories } from '../../hooks/useClubCategories';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';
import LoadingDots from '../../components/LoadingDots';

// Validation Schema
const clubSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    logo_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
    category_id: z.string().uuid('Please select a category').optional().nullable(),
    coordinator_id: z.string().uuid('Please select a coordinator').optional().nullable()
});

// eslint-disable-next-line no-unused-vars
const CATEGORIES = ['General', 'Technical', 'Cultural', 'Sports', 'Academic', 'Social', 'Arts', 'Entrepreneurship'];

const ClubAnalyticsDialog = ({ open, onClose, club }) => {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['clubStats', club?.id],
        enabled: !!club?.id && open,
        queryFn: async () => {
            const [members, events, registrations] = await Promise.all([
                supabase.from('profiles').select('id, role').eq('club_id', club.id),
                supabase.from('events').select('id').eq('club_id', club.id),
                supabase.from('registrations').select(`
                    id,
                    attendance_status,
                    events!inner(club_id)
                `).eq('events.club_id', club.id)
            ]);

            const memberCount = members.data?.length || 0;
            const eventCount = events.data?.length || 0;
            const regCount = registrations.data?.length || 0;
            const attendedCount = registrations.data?.filter(r => r.attendance_status === 'present').length || 0;
            const attendanceRate = regCount > 0 ? Math.round((attendedCount / regCount) * 100) : 0;

            return { memberCount, eventCount, attendanceRate };
        }
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Analytics: {club?.name}</DialogTitle>
            <DialogContent>
                {isLoading ? (
                    <LoadingDots minHeight="180px" label="Loading club analytics..." />
                ) : (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {[
                            { label: 'Total Members', value: stats?.memberCount, color: 'primary.main' },
                            { label: 'Events Hosted', value: stats?.eventCount, color: 'secondary.main' },
                            { label: 'Avg Attendance', value: `${stats?.attendanceRate}%`, color: 'success.main' }
                        ].map(s => (
                            <Grid item xs={12} sm={4} key={s.label}>
                                <Box sx={{
                                    textAlign: 'center', p: 3,
                                    bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                                    border: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                                    borderRadius: '12px'
                                }}>
                                    <Typography variant="h4" sx={{ color: s.color, fontWeight: 900, mb: 0.5 }}>{s.value}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

const Clubs = () => {
    const { data: clubs, isLoading } = useClubs();
    const { data: categories } = useClubCategories();
    const { createClub, updateClub, deleteClub } = useClubMutations();
    const { data: users, isLoading: isLoadingUsers } = useUsers();
    const { updateUser } = useUserMutations();

    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);

    const [assignOpen, setAssignOpen] = useState(false);
    const [selectedClubForAssign, setSelectedClubForAssign] = useState(null);
    const [selectedCoordinator, setSelectedCoordinator] = useState('');

    const [analyticsOpen, setAnalyticsOpen] = useState(false);
    const [selectedClubForAnalytics, setSelectedClubForAnalytics] = useState(null);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(clubSchema)
    });

    const handleOpen = (club) => {
        if (club) {
            setEditId(club.id);
            setValue('name', club.name);
            setValue('description', club.description);
            setValue('logo_url', club.logo_url || '');
            setValue('category_id', club.category_id || null);
            setValue('coordinator_id', club.coordinator_id || null);
        } else {
            setEditId(null);
            reset({ category_id: null, coordinator_id: null });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        reset();
        setEditId(null);
    };

    const onSubmit = (data) => {
        const clubData = {
            name: data.name,
            description: data.description,
            logo_url: data.logo_url || undefined,
            category_id: data.category_id || null,
            coordinator_id: data.coordinator_id || null
        };

        if (editId) {
            updateClub.mutate({ id: editId, updates: clubData }, { 
                onSuccess: () => {
                    // Also update user profile if coordinator changed
                    if (data.coordinator_id) {
                        updateUser.mutate({
                            id: data.coordinator_id,
                            updates: { club_id: editId, role: 'coordinator' }
                        });
                    }
                    handleClose();
                } 
            });
        } else {
            createClub.mutate(clubData, { 
                onSuccess: (newClub) => {
                    if (data.coordinator_id && newClub.id) {
                        updateUser.mutate({
                            id: data.coordinator_id,
                            updates: { club_id: newClub.id, role: 'coordinator' }
                        });
                    }
                    handleClose();
                } 
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this club?')) {
            deleteClub.mutate(id);
        }
    };

    // eslint-disable-next-line no-unused-vars
    const handleToggleStatus = (club) => {
        const newStatus = club.status === 'active' ? 'inactive' : 'active';
        if (window.confirm(`Are you sure you want to mark this club as ${newStatus}?`)) {
            updateClub.mutate({ id: club.id, updates: { status: newStatus } });
        }
    };

    const handleOpenAssign = (club) => {
        setSelectedClubForAssign(club);
        // Find existing coordinator if we wanted it to be the default
        const existingCoord = users?.find(u => u.club_id === club.id && u.role === 'coordinator');
        setSelectedCoordinator(existingCoord ? existingCoord.id : '');
        setAssignOpen(true);
    };

    const handleSaveAssign = () => {
        if (selectedCoordinator && selectedClubForAssign) {
            // 1. Update the User Profile (Set role to coordinator and assign club_id)
            // 2. Update the Club Profile (Set coordinator_id)
            Promise.all([
                updateUser.mutateAsync({
                    id: selectedCoordinator,
                    updates: { club_id: selectedClubForAssign.id, role: 'coordinator' }
                }),
                updateClub.mutateAsync({
                    id: selectedClubForAssign.id,
                    updates: { coordinator_id: selectedCoordinator }
                })
            ]).then(() => {
                setAssignOpen(false);
                toast.success('Governance assigned successfully across system');
            }).catch(err => {
                console.error('Assignment failure:', err);
                toast.error('Failed to complete dual-table assignment');
            });
        }
    };

    const coordinators = useMemo(() => {
        if (!users) return [];
        return users.filter(u => ['coordinator', 'student', 'admin'].includes(u.role?.toLowerCase()));
    }, [users]);

    const columns = [
        { field: 'name', headerName: 'Name', flex: 1, minWidth: 140 },
        {
            field: 'coordinator', headerName: 'Coordinator', flex: 1, minWidth: 150,
            renderCell: (p) => {
                const coord = p.row.coordinator;
                if (!coord) return <Typography variant="caption" color="text.secondary">Unassigned</Typography>;
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{coord.full_name || coord.email?.split('@')[0]}</Typography>
                    </Box>
                );
            }
        },
        { field: 'description', headerName: 'Description', flex: 1, minWidth: 160 },
        {
            field: 'category', headerName: 'Category', width: 130,
            renderCell: (p) => {
                const catName = p.row.category?.name || 'Uncategorized';
                return <Chip label={catName} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />;
            }
        },
        {
            field: 'rating', headerName: 'Tier', width: 120,
            renderCell: (p) => {
                const rating = p.value || 0;
                let tier = { label: 'Bronze', color: '#cd7f32' };
                if (rating >= 4.5) tier = { label: 'Elite', color: '#f59e0b' };
                else if (rating >= 4.0) tier = { label: 'Platinum', color: '#3b82f6' };
                else if (rating >= 3.0) tier = { label: 'Gold', color: '#ffd700' };

                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: tier.color, boxShadow: `0 0 8px ${tier.color}` }} />
                        <Typography variant="caption" fontWeight={900} sx={{ color: tier.color, textTransform: 'uppercase' }}>{tier.label}</Typography>
                    </Box>
                );
            }
        },
        {
            field: 'status',
            headerName: 'Governance',
            width: 130,
            renderCell: (params) => {
                const status = params.value || 'active';
                const color = status === 'active' ? '#10b981' : status === 'suspended' ? '#f43f5e' : '#64748b';
                return (
                    <Chip
                        label={status}
                        size="small"
                        sx={{
                            fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase',
                            letterSpacing: 0.5, bgcolor: `${color}15`, color, border: `1px solid ${color}30`
                        }}
                    />
                );
            }
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Control',
            width: 220,
            getActions: (params) => {
                const club = params.row;
                const status = club.status || 'active';

                return [
                    <GridActionsCellItem
                        key="analytics"
                        icon={<AnalyticsIcon color="info" />}
                        label="Performance Analytics"
                        onClick={() => { setSelectedClubForAnalytics(club); setAnalyticsOpen(true); }}
                        showInMenu
                    />,
                    <GridActionsCellItem
                        key="edit"
                        icon={<EditIcon color="primary" />}
                        label="Edit / Assign Coordinator"
                        onClick={() => handleOpen(club)}
                    />,
                    <GridActionsCellItem
                        key="assign_visible"
                        icon={<AssignIcon color="info" />}
                        label="Assign Governance"
                        onClick={() => handleOpenAssign(club)}
                    />,
                    <GridActionsCellItem
                        key="status"
                        icon={status === 'active' ? <InactiveIcon color="error" /> : <ActiveIcon color="success" />}
                        label={status === 'active' ? "Suspend Club" : "Reinstate Club"}
                        onClick={() => {
                            const next = status === 'active' ? 'suspended' : 'active';
                            if (window.confirm(`Transition club to ${next} status?`)) {
                                updateClub.mutate({ id: club.id, updates: { status: next } });
                            }
                        }}
                        showInMenu
                    />,
                    <GridActionsCellItem
                        key="delete"
                        icon={<DeleteIcon color="error" />}
                        label="Decommission Club"
                        onClick={() => handleDelete(club.id)}
                        showInMenu
                    />
                ];
            }
        }
    ];

    return (
        <Box sx={{ height: 650, width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box component={motion.div} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 4, p: { xs: 3, md: 4 }, borderRadius: '16px',
                    background: theme => theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
                        : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2
                }}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ color: 'text.primary', letterSpacing: -1.5 }}>Club Governance</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mt: 0.5 }}>
                        Oversee club activity, moderate categories, and manage organizational status.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                    sx={{ px: 4, py: 1.5, fontWeight: 800, borderRadius: '12px' }}
                >
                    Initialize New Club
                </Button>
            </Box>

            <DataGrid
                rows={clubs || []}
                columns={columns}
                loading={isLoading}
                initialState={{
                    pagination: {
                        paginationModel: { page: 0, pageSize: 10 },
                    },
                }}
                pageSizeOptions={[5, 10, 20]}
                disableRowSelectionOnClick
                sx={{
                    flex: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    border: 'none',
                    boxShadow: 1
                }}
            />

            {/* Create/Edit Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>{editId ? 'Edit Club' : 'Create New Club'}</DialogTitle>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent>
                        <TextField
                            fullWidth
                            label="Club Name"
                            margin="normal"
                            {...register('name')}
                            error={!!errors.name}
                            helperText={errors.name?.message}
                        />
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Primary Coordinator</InputLabel>
                            <Select defaultValue="" label="Primary Coordinator" {...register('coordinator_id')}>
                                <MenuItem value=""><em>Unassigned</em></MenuItem>
                                {isLoadingUsers ? (
                                    <MenuItem disabled sx={{ justifyContent: 'center', py: 1.5 }}>
                                        <LoadingDots inline size={4} />
                                    </MenuItem>
                                ) : coordinators.length === 0 ? (
                                    <MenuItem disabled><em>No users found</em></MenuItem>
                                ) : (
                                    coordinators.map(u => (
                                        <MenuItem key={u.id} value={u.id}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                <Typography variant="body2">{u.full_name || u.email}</Typography>
                                                <Typography variant="caption" color="text.secondary">{u.role}</Typography>
                                            </Box>
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Category</InputLabel>
                            <Select defaultValue="" label="Category" {...register('category_id')}>
                                <MenuItem value=""><em>None</em></MenuItem>
                                {categories?.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Description"
                            margin="normal"
                            multiline
                            rows={2}
                            {...register('description')}
                            error={!!errors.description}
                            helperText={errors.description?.message}
                        />
                        <TextField
                            fullWidth
                            label="Logo URL (Optional)"
                            margin="normal"
                            {...register('logo_url')}
                            error={!!errors.logo_url}
                            helperText={errors.logo_url?.message}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleClose}>Cancel</Button>
                        <Button type="submit" variant="contained">
                            {editId ? 'Update Club' : 'Create Club'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Assign Coordinator Dialog */}
            <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Assign Coordinator</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Assign a user to manage {selectedClubForAssign?.name}.
                        </Typography>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Select Coordinator</InputLabel>
                            <Select
                                value={selectedCoordinator}
                                label="Select Coordinator"
                                onChange={(e) => setSelectedCoordinator(e.target.value)}
                            >
                                <MenuItem value=""><em>None</em></MenuItem>
                                {coordinators.map(u => (
                                    <MenuItem key={u.id} value={u.id}>
                                        {u.full_name || u.email} ({u.role})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveAssign} disabled={!selectedCoordinator}>Save Assignment</Button>
                </DialogActions>
            </Dialog>

            <ClubAnalyticsDialog
                open={analyticsOpen}
                onClose={() => setAnalyticsOpen(false)}
                club={selectedClubForAnalytics}
            />
        </Box>
    );
};

export default Clubs;
