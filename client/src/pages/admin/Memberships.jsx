import { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Avatar,
    Stack,
    TextField,
    InputAdornment,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Search as SearchIcon,
    CheckCircle as ApproveIcon,
    Cancel as RejectIcon,
    Delete as RemoveIcon,
    Block as SuspendIcon
} from '@mui/icons-material';
import { useClubMemberships, useUpdateMembershipStatus } from '../../hooks/useMemberships';
import { useClubs } from '../../hooks/useClubs';
import LoadingDots from '../../components/LoadingDots';

const AdminMemberships = () => {
    const { data: memberships, isLoading, error } = useClubMemberships(); // Fetch all
    const { data: clubs } = useClubs();
    const updateStatus = useUpdateMembershipStatus();

    const [statusFilter, setStatusFilter] = useState('all');
    const [clubFilter, setClubFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const handleUpdateStatus = (id, newStatus) => {
        if (window.confirm(`Are you sure you want to force ${newStatus} this membership?`)) {
            updateStatus.mutate({ id, status: newStatus, removal_reason: newStatus === 'removed' ? 'Force removed by Admin' : null });
        }
    };

    if (isLoading) return <LoadingDots label="Loading memberships..." minHeight="40vh" />;
    if (error) return <Typography color="error">Error loading memberships</Typography>;

    const filteredMemberships = memberships?.filter(member => {
        const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
        const matchesClub = clubFilter === 'all' || member.club_id === clubFilter;
        const matchesSearch = member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesClub && matchesSearch;
    });

    return (
        <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
                Global Membership Management
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                        label="Search User"
                        variant="outlined"
                        size="small"
                        fullWidth
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Filter by Status</InputLabel>
                        <Select
                            value={statusFilter}
                            label="Filter by Status"
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <MenuItem value="all">All Statuses</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="approved">Approved</MenuItem>
                            <MenuItem value="rejected">Rejected</MenuItem>
                            <MenuItem value="removed">Removed</MenuItem>
                            <MenuItem value="left">Left</MenuItem>
                            <MenuItem value="suspended">Suspended</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Filter by Club</InputLabel>
                        <Select
                            value={clubFilter}
                            label="Filter by Club"
                            onChange={(e) => setClubFilter(e.target.value)}
                        >
                            <MenuItem value="all">All Clubs</MenuItem>
                            {clubs?.map((club) => (
                                <MenuItem key={club.id} value={club.id}>{club.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Club</TableCell>
                            <TableCell>System Role</TableCell>
                            <TableCell>Club Role</TableCell>
                            <TableCell>Joined At</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Global Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(!filteredMemberships || filteredMemberships.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">No memberships found.</TableCell>
                            </TableRow>
                        ) : (
                            filteredMemberships?.map((member) => (
                                <TableRow key={member.id} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Avatar>{member.profile?.full_name?.charAt(0)}</Avatar>
                                            <Typography variant="body2">{member.profile?.full_name}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{member.profile?.email}</TableCell>
                                    <TableCell>{member.club?.name}</TableCell>
                                    <TableCell sx={{ textTransform: 'capitalize' }}>{member.profile?.role}</TableCell>
                                    <TableCell sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{member.role?.replace('_', ' ') || 'Member'}</TableCell>
                                    <TableCell>{new Date(member.joined_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={member.status}
                                            color={member.status === 'approved' ? 'success' : member.status === 'pending' ? 'warning' : member.status === 'left' ? 'default' : 'error'}
                                            size="small"
                                            variant="outlined"
                                            sx={{ textTransform: 'capitalize' }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            {member.status !== 'approved' && (
                                                <Tooltip title="Force Approve">
                                                    <IconButton
                                                        color="success"
                                                        size="small"
                                                        onClick={() => handleUpdateStatus(member.id, 'approved')}
                                                    >
                                                        <ApproveIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {member.status !== 'rejected' && member.status !== 'removed' && (
                                                <Tooltip title="Force Reject">
                                                    <IconButton
                                                        color="warning"
                                                        size="small"
                                                        onClick={() => handleUpdateStatus(member.id, 'rejected')}
                                                    >
                                                        <RejectIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {member.status !== 'suspended' && (
                                                <Tooltip title="Suspend Membership">
                                                    <IconButton
                                                        color="error"
                                                        size="small"
                                                        onClick={() => handleUpdateStatus(member.id, 'suspended')}
                                                    >
                                                        <SuspendIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {member.status !== 'removed' && (
                                                <Tooltip title="Remove Membership">
                                                    <IconButton
                                                        color="error"
                                                        size="small"
                                                        onClick={() => handleUpdateStatus(member.id, 'removed')}
                                                    >
                                                        <RemoveIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default AdminMemberships;
