import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputAdornment,
    InputLabel,
    MenuItem,
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
    admin: { bg: '#ef444418', color: '#f87171', border: '#ef444430', icon: <AdminPanelSettings sx={{ fontSize: 14 }} /> },
    coordinator: { bg: '#3b82f618', color: '#60a5fa', border: '#3b82f630', icon: <SupervisorAccount sx={{ fontSize: 14 }} /> },
    student: { bg: '#10b98118', color: '#34d399', border: '#10b98130', icon: <Person sx={{ fontSize: 14 }} /> },
};

const statusConfig = {
    active: { bg: '#10b98118', color: '#10b981', border: '#10b98130' },
    blocked: { bg: '#ef444418', color: '#ef4444', border: '#ef444430' },
};

const Users = () => {
    const { data: users, isLoading } = useUsers();
    const { data: clubs } = useClubs();
    const { updateUser } = useUserMutations();
    const { user: currentUser } = useAuthStore();

    const [open, setOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
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
        if (roleFilter !== 'all') filtered = filtered.filter((entry) => entry.role === roleFilter);
        if (searchTerm) {
            const searchValue = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (entry) =>
                    entry.email?.toLowerCase().includes(searchValue) ||
                    entry.full_name?.toLowerCase().includes(searchValue)
            );
        }
        return filtered;
    }, [users, roleFilter, searchTerm]);

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
            headerName: 'User Profile',
            flex: 1.5,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, py: 1, minWidth: 0 }}>
                    <Avatar
                        src={params.row.avatar_url || undefined}
                        sx={{
                            width: 40,
                            height: 40,
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            background: `linear-gradient(135deg, ${roleConfig[params.row.role]?.color || '#60a5fa'}, ${(roleConfig[params.row.role]?.color || '#60a5fa')}88)`,
                            color: 'white',
                            border: '2px solid white',
                            boxShadow: '0 4px 10px rgba(15,23,42,0.08)',
                        }}
                    >
                        {params.value?.charAt(0) || '?'}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={800} color="text.primary" noWrap>
                            {params.value || 'Anonymous'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap>
                            {params.row.email}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" fontWeight={700} noWrap>
                            {params.row.department || 'Department not set'}
                        </Typography>
                    </Box>
                </Box>
            ),
        },
        {
            field: 'role',
            headerName: 'Designation',
            width: 145,
            renderCell: (params) => {
                const config = roleConfig[params.value] || roleConfig.student;
                return (
                    <Chip
                        icon={config.icon}
                        label={params.value}
                        size="small"
                        sx={{
                            fontWeight: 800,
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
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
            headerName: 'Governance',
            width: 135,
            renderCell: (params) => {
                const config = statusConfig[params.value] || statusConfig.active;
                return (
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: config.color }} />
                        <Typography variant="caption" fontWeight={800} sx={{ color: config.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {params.value || 'active'}
                        </Typography>
                    </Stack>
                );
            },
        },
        {
            field: 'engagement',
            headerName: 'Engagement',
            width: 140,
            renderCell: (params) => {
                const count = params.row.registrations?.[0]?.count || 0;
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Typography variant="body2" fontWeight={800} color="text.primary">
                            {count}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Event registrations
                        </Typography>
                    </Box>
                );
            },
        },
        {
            field: 'club_name',
            headerName: 'Organization',
            flex: 1,
            valueGetter: (_value, row) => row.club?.name || '—',
            renderCell: (params) => (
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} color="text.primary" noWrap>
                        {params.value || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                        {params.row.role === 'coordinator' ? 'Assigned workspace' : 'Linked organization'}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Control',
            width: 100,
            getActions: (params) => {
                const user = params.row;
                const isSelf = user.id === currentUser?.id;
                const isBlocked = user.account_status === 'blocked';
                return [
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
                        label="Revoke Identity"
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
                    borderRadius: '16px',
                    background: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
                            : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
            >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h4" fontWeight={900} sx={{ color: 'text.primary', letterSpacing: -1.5 }}>
                            User Management
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mt: 0.5 }}>
                            Configure system roles, access protocols, and account status across the institution.
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap">
                        {[
                            { label: 'Total', value: stats.total, color: '#3b82f6' },
                            { label: 'Students', value: stats.students, color: '#10b981' },
                            { label: 'Staff', value: stats.coordinators, color: '#a855f7' },
                            { label: 'Blocked', value: stats.blocked, color: '#ef4444' },
                        ].map((item) => (
                            <Box
                                key={item.label}
                                sx={{
                                    textAlign: 'center',
                                    minWidth: 90,
                                    px: 2,
                                    py: 1.5,
                                    borderRadius: '12px',
                                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'white'),
                                    border: (theme) => `1px solid ${theme.palette.divider}`,
                                }}
                            >
                                <Typography variant="h5" fontWeight={900} sx={{ color: item.color, letterSpacing: -1 }}>
                                    {item.value}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
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
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ flex: 1, minWidth: 240 }}
                />
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {['all', 'student', 'coordinator', 'admin'].map((entry) => (
                        <Chip
                            key={entry}
                            label={entry.charAt(0).toUpperCase() + entry.slice(1)}
                            onClick={() => setRoleFilter(entry)}
                            size="small"
                            sx={{
                                fontWeight: 700,
                                cursor: 'pointer',
                                bgcolor: roleFilter === entry ? '#3b82f6' : 'transparent',
                                color: roleFilter === entry ? 'white' : 'text.secondary',
                                border: `1px solid ${roleFilter === entry ? '#3b82f6' : 'rgba(148,163,184,0.35)'}`,
                            }}
                        />
                    ))}
                </Box>
            </Box>

            <Box sx={{ height: 580 }}>
                <DataGrid
                    rows={filteredUsers}
                    columns={columns}
                    loading={isLoading}
                    getRowHeight={() => 84}
                    slots={{
                        loadingOverlay: () => <LoadingDots minHeight="240px" label="Loading users..." />,
                        noRowsOverlay: () => <LoadingDots minHeight="180px" label="No users found for this filter." />,
                    }}
                    initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                    pageSizeOptions={[5, 10, 20]}
                    disableRowSelectionOnClick
                    sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '18px',
                        overflow: 'hidden',
                        '& .MuiDataGrid-cell': { py: 1.25, alignItems: 'center' },
                    }}
                />
            </Box>

            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 900, letterSpacing: -0.5 }}>
                    Edit User Role
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
