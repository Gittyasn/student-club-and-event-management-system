import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Avatar,
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Drawer,
    FormControl,
    Grid,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import {
    AdminPanelSettings,
    Block as BlockIcon,
    CheckCircle as UnblockIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Person,
    Search as SearchIcon,
    SupervisorAccount,
} from '@mui/icons-material';
import { useUsers } from '../../hooks/useUsers';
import { useUserMutations } from '../../hooks/useUserMutations';
import { useClubs } from '../../hooks/useClubs';
import { useAuthStore } from '../../store/authStore';
import LoadingDots from '../../components/LoadingDots';

const roleConfig = {
    admin: { bg: '#ef444418', color: '#f87171', border: '#ef444430', icon: <AdminPanelSettings sx={{ fontSize: 14 }} />, label: 'Admin' },
    coordinator: { bg: '#3b82f618', color: '#60a5fa', border: '#3b82f630', icon: <SupervisorAccount sx={{ fontSize: 14 }} />, label: 'Coordinator' },
    student: { bg: '#10b98118', color: '#34d399', border: '#10b98130', icon: <Person sx={{ fontSize: 14 }} />, label: 'Student' },
};

const statusConfig = {
    active: { bg: '#10b98118', color: '#10b981', border: '#10b98130', label: 'Active' },
    blocked: { bg: '#ef444418', color: '#ef4444', border: '#ef444430', label: 'Blocked' },
};

const getEngagementCount = (user) => user.registrations?.[0]?.count || 0;

const DetailRow = ({ label, value }) => (
    <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {label}
        </Typography>
        <Typography variant="body2" fontWeight={700} sx={{ mt: 0.25 }}>
            {value || '-'}
        </Typography>
    </Box>
);

const Users = () => {
    const { data: users, isLoading, error } = useUsers();
    const { data: clubs } = useClubs();
    const { updateUser } = useUserMutations();
    const { user: currentUser } = useAuthStore();

    const [open, setOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [drawerUser, setDrawerUser] = useState(null);
    const [role, setRole] = useState('student');
    const [clubId, setClubId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const handleEdit = (user) => {
        if (user.id === currentUser?.id) {
            window.alert('You cannot edit your own role.');
            return;
        }

        setSelectedUser(user);
        setRole(user.role);
        setClubId(user.club_id || '');
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedUser(null);
    };

    const handleSave = () => {
        if (!selectedUser) return;

        updateUser.mutate(
            {
                id: selectedUser.id,
                updates: { role, club_id: role === 'coordinator' && clubId ? clubId : null },
            },
            { onSuccess: handleClose }
        );
    };

    const handleStatusToggle = (user, newStatus) => {
        if (user.id === currentUser?.id) {
            window.alert('You cannot change your own status.');
            return;
        }

        if (window.confirm(`Mark this user as ${newStatus}?`)) {
            updateUser.mutate({ id: user.id, updates: { account_status: newStatus } });
        }
    };

    const filteredUsers = useMemo(() => {
        if (!users) return [];

        let filtered = users.filter((entry) => entry.account_status !== 'deleted');

        if (roleFilter !== 'all') {
            filtered = filtered.filter((entry) => entry.role === roleFilter);
        }

        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (entry) =>
                    entry.email?.toLowerCase().includes(query) ||
                    entry.full_name?.toLowerCase().includes(query) ||
                    entry.club?.name?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [roleFilter, searchTerm, users]);

    const stats = useMemo(
        () => ({
            total: (users || []).filter((entry) => entry.account_status !== 'deleted').length,
            admins: (users || []).filter((entry) => entry.role === 'admin').length,
            coordinators: (users || []).filter((entry) => entry.role === 'coordinator').length,
            students: (users || []).filter((entry) => entry.role === 'student').length,
            blocked: (users || []).filter((entry) => entry.account_status === 'blocked').length,
        }),
        [users]
    );

    const columns = [
        {
            field: 'full_name',
            headerName: 'User',
            flex: 1.6,
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, minWidth: 0 }}>
                    <Avatar
                        src={params.row.avatar_url || undefined}
                        sx={{
                            width: 42,
                            height: 42,
                            fontWeight: 800,
                            background: `linear-gradient(135deg, ${roleConfig[params.row.role]?.color || '#60a5fa'}, ${(roleConfig[params.row.role]?.color || '#60a5fa')}88)`,
                            color: 'white',
                        }}
                    >
                        {params.value?.charAt(0) || '?'}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={800} noWrap>
                            {params.value || 'Anonymous'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap display="block">
                            {params.row.email}
                        </Typography>
                    </Box>
                </Box>
            ),
        },
        {
            field: 'role',
            headerName: 'Role',
            width: 150,
            renderCell: (params) => {
                const config = roleConfig[params.value] || roleConfig.student;

                return (
                    <Chip
                        icon={config.icon}
                        label={config.label}
                        size="small"
                        sx={{
                            fontWeight: 800,
                            bgcolor: config.bg,
                            color: config.color,
                            border: `1px solid ${config.border}`,
                        }}
                    />
                );
            },
        },
        {
            field: 'account_status',
            headerName: 'Status',
            width: 140,
            renderCell: (params) => {
                const config = statusConfig[params.value] || statusConfig.active;

                return (
                    <Chip
                        label={config.label}
                        size="small"
                        sx={{
                            fontWeight: 800,
                            bgcolor: config.bg,
                            color: config.color,
                            border: `1px solid ${config.border}`,
                        }}
                    />
                );
            },
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 110,
            headerClassName: 'sticky-actions',
            cellClassName: 'sticky-actions',
            getActions: (params) => {
                const user = params.row;
                const isSelf = user.id === currentUser?.id;
                const isBlocked = user.account_status === 'blocked';

                return [
                    <GridActionsCellItem key="details" icon={<Person />} label="View Details" onClick={() => setDrawerUser(user)} showInMenu />,
                    <GridActionsCellItem key="edit" icon={<EditIcon />} label="Edit Access" onClick={() => handleEdit(user)} disabled={isSelf} showInMenu />,
                    <GridActionsCellItem
                        key="toggle"
                        icon={isBlocked ? <UnblockIcon color="success" /> : <BlockIcon color="warning" />}
                        label={isBlocked ? 'Restore Access' : 'Restrict Access'}
                        onClick={() => handleStatusToggle(user, isBlocked ? 'active' : 'blocked')}
                        disabled={isSelf}
                        showInMenu
                    />,
                    <GridActionsCellItem
                        key="delete"
                        icon={<DeleteIcon color="error" />}
                        label="Delete Account"
                        onClick={() => handleStatusToggle(user, 'deleted')}
                        disabled={isSelf}
                        showInMenu
                    />,
                ];
            },
        },
    ];

    return (
        <Box sx={{ pb: 6 }}>
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 4,
                    p: { xs: 3, md: 4 },
                    borderRadius: 3,
                    background: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
                            : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
            >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h4" fontWeight={900} sx={{ color: 'text.primary', letterSpacing: -1 }}>
                            User Management
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            Review accounts, roles, and access without overloading the table.
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                        {[
                            { label: 'Total', value: stats.total, color: '#3b82f6' },
                            { label: 'Students', value: stats.students, color: '#10b981' },
                            { label: 'Coordinators', value: stats.coordinators, color: '#a855f7' },
                            { label: 'Blocked', value: stats.blocked, color: '#ef4444' },
                        ].map((item) => (
                            <Box
                                key={item.label}
                                sx={{
                                    minWidth: 96,
                                    px: 2,
                                    py: 1.5,
                                    textAlign: 'center',
                                    borderRadius: 2,
                                    bgcolor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography variant="h5" fontWeight={900} sx={{ color: item.color, lineHeight: 1 }}>
                                    {item.value}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                    {item.label}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    size="small"
                    placeholder="Search by name, email, or club"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ flex: 1, minWidth: 260 }}
                />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {['all', 'student', 'coordinator', 'admin'].map((entry) => (
                        <Chip
                            key={entry}
                            label={entry.charAt(0).toUpperCase() + entry.slice(1)}
                            onClick={() => setRoleFilter(entry)}
                            sx={{
                                fontWeight: 700,
                                cursor: 'pointer',
                                bgcolor: roleFilter === entry ? '#2563eb' : 'transparent',
                                color: roleFilter === entry ? 'white' : 'text.secondary',
                                border: `1px solid ${roleFilter === entry ? '#2563eb' : 'rgba(148,163,184,0.35)'}`,
                            }}
                        />
                    ))}
                </Stack>
            </Box>

            {error ? (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                    Failed to load user accounts. {error.message}
                </Alert>
            ) : null}

            <Box sx={{ height: 620 }}>
                <DataGrid
                    rows={filteredUsers}
                    columns={columns}
                    loading={isLoading}
                    getRowHeight={() => 84}
                    onRowClick={(params) => setDrawerUser(params.row)}
                    slots={{
                        loadingOverlay: () => <LoadingDots minHeight="240px" label="Loading users..." />,
                        noRowsOverlay: () => <LoadingDots minHeight="180px" label="No users found for this filter." />,
                    }}
                    initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                    pageSizeOptions={[10, 20, 50]}
                    disableRowSelectionOnClick
                    sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 3,
                        overflow: 'hidden',
                        '& .MuiDataGrid-cell': {
                            py: 1.25,
                            alignItems: 'center',
                        },
                        '& .sticky-actions': {
                            position: 'sticky',
                            right: 0,
                            zIndex: 2,
                            bgcolor: 'background.paper',
                        },
                        '& .MuiDataGrid-columnHeaders .sticky-actions': {
                            zIndex: 3,
                        },
                    }}
                />
            </Box>

            <Drawer
                anchor="right"
                open={!!drawerUser}
                onClose={() => setDrawerUser(null)}
                PaperProps={{ sx: { width: 360, p: 3 } }}
            >
                {drawerUser ? (
                    <Stack spacing={2.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar src={drawerUser.avatar_url || undefined} sx={{ width: 56, height: 56 }}>
                                {drawerUser.full_name?.charAt(0) || '?'}
                            </Avatar>
                            <Box>
                                <Typography variant="h6" fontWeight={900}>
                                    {drawerUser.full_name || 'Anonymous'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {drawerUser.email}
                                </Typography>
                            </Box>
                        </Box>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label={roleConfig[drawerUser.role]?.label || 'User'} sx={{ fontWeight: 700 }} />
                            <Chip label={statusConfig[drawerUser.account_status]?.label || 'Active'} color={drawerUser.account_status === 'blocked' ? 'error' : 'success'} sx={{ fontWeight: 700 }} />
                        </Stack>

                        <Divider />

                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <DetailRow label="Department" value={drawerUser.department || 'Not set'} />
                            </Grid>
                            <Grid item xs={6}>
                                <DetailRow label="Club" value={drawerUser.club?.name || 'Not linked'} />
                            </Grid>
                            <Grid item xs={6}>
                                <DetailRow label="Registrations" value={getEngagementCount(drawerUser)} />
                            </Grid>
                            <Grid item xs={6}>
                                <DetailRow label="Joined" value={drawerUser.created_at ? new Date(drawerUser.created_at).toLocaleDateString('en-IN') : '-'} />
                            </Grid>
                        </Grid>

                        <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="body2" fontWeight={800} sx={{ mb: 0.5 }}>
                                Default table view
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                The table keeps only the main identity, role, and account status visible. Secondary details live here to make scanning easier on smaller screens.
                            </Typography>
                        </Paper>

                        <Stack direction="row" spacing={1.5}>
                            <Button variant="outlined" onClick={() => handleEdit(drawerUser)} disabled={drawerUser.id === currentUser?.id} sx={{ fontWeight: 700 }}>
                                Edit role
                            </Button>
                            <Button
                                variant="contained"
                                color={drawerUser.account_status === 'blocked' ? 'success' : 'warning'}
                                onClick={() => handleStatusToggle(drawerUser, drawerUser.account_status === 'blocked' ? 'active' : 'blocked')}
                                disabled={drawerUser.id === currentUser?.id}
                                sx={{ fontWeight: 800 }}
                            >
                                {drawerUser.account_status === 'blocked' ? 'Restore access' : 'Restrict access'}
                            </Button>
                        </Stack>
                    </Stack>
                ) : null}
            </Drawer>

            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 900, letterSpacing: -0.5 }}>
                    Edit user role
                    {selectedUser ? (
                        <Typography variant="caption" display="block" color="text.secondary" fontWeight={600} sx={{ mt: 0.5 }}>
                            {selectedUser.email}
                        </Typography>
                    ) : null}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ pt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select value={role} label="Role" onChange={(event) => setRole(event.target.value)}>
                                <MenuItem value="student">Student</MenuItem>
                                <MenuItem value="coordinator">Coordinator</MenuItem>
                                <MenuItem value="admin">Admin</MenuItem>
                            </Select>
                        </FormControl>
                        {role === 'coordinator' ? (
                            <FormControl fullWidth>
                                <InputLabel>Assign Club</InputLabel>
                                <Select value={clubId} label="Assign Club" onChange={(event) => setClubId(event.target.value)}>
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {clubs?.map((club) => (
                                        <MenuItem key={club.id} value={club.id}>
                                            {club.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        ) : null}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    <Button onClick={handleClose} variant="outlined">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} variant="contained" disabled={updateUser.isPending}>
                        {updateUser.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Users;
