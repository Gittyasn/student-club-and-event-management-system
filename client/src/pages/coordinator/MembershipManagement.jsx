import { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import {
    Box, Grid, Paper, Typography, Button, Table, TableBody, TableCell,
    // eslint-disable-next-line no-unused-vars
    TableContainer, TableHead, TableRow, Alert, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Avatar,
    Tabs, Tab, Card, CardContent, CardActions, IconButton, Tooltip, Stack, Divider, useTheme
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RolePageHeader from '../../components/RolePageHeader';
import LoadingDots from '../../components/LoadingDots';
// eslint-disable-next-line no-unused-vars
import { toast } from 'sonner';
import {
    // eslint-disable-next-line no-unused-vars
    CheckCircle as ApproveIcon, Block as RejectIcon, Delete as DeleteIcon,
    // eslint-disable-next-line no-unused-vars
    Mail as MailIcon, Phone as PhoneIcon, Stars as RoleIcon
} from '@mui/icons-material';
import { useUpdateMembershipStatus, useUpdateMembershipRole } from '../../hooks/useMemberships';

const MembershipManagement = () => {
    // eslint-disable-next-line no-unused-vars
    const theme = useTheme();
    const { profile } = useAuthStore();
    const queryClient = useQueryClient();
    const [tabValue, setTabValue] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    // ... (keep queries and mutations logically same but ensure they match keys)
    const { data: coordinatorClub } = useQuery({
        queryKey: ['coordinatorClub', profile?.id],
        enabled: !!profile?.id && profile?.role === 'coordinator',
        queryFn: async () => {
            const [profileClub, ownedClub, delegatedClub] = await Promise.all([
                supabase.from('profiles').select('club_id').eq('id', profile.id).maybeSingle(),
                supabase.from('clubs').select('*').eq('coordinator_id', profile.id).maybeSingle(),
                supabase
                    .from('club_memberships')
                    .select('club:clubs(*)')
                    .eq('user_id', profile.id)
                    .eq('role', 'sub_coordinator')
                    .eq('status', 'approved')
                    .limit(1)
                    .maybeSingle()
            ]);

            if (ownedClub.data) return ownedClub.data;

            if (profileClub.data?.club_id) {
                const { data, error } = await supabase
                    .from('clubs')
                    .select('*')
                    .eq('id', profileClub.data.club_id)
                    .maybeSingle();
                if (error) throw error;
                if (data) return data;
            }

            return delegatedClub.data?.club || null;
        }
    });

    const { data: pendingRequests, isLoading: pendingLoading } = useQuery({
        queryKey: ['pendingRequests', coordinatorClub?.id],
        enabled: !!coordinatorClub?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('club_memberships')
                .select('*, profiles:profiles!club_memberships_user_id_fkey(id, full_name, email, avatar_url, department)')
                .eq('club_id', coordinatorClub.id)
                .eq('status', 'pending')
                .order('joined_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const { data: approvedMembers, isLoading: approvedLoading } = useQuery({
        queryKey: ['approvedMembers', coordinatorClub?.id],
        enabled: !!coordinatorClub?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('club_memberships')
                .select('*, profiles:profiles!club_memberships_user_id_fkey(id, full_name, email, avatar_url, department)')
                .eq('club_id', coordinatorClub.id)
                .eq('status', 'approved')
                .order('joined_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const updateStatus = useUpdateMembershipStatus();
    const updateRole = useUpdateMembershipRole();

    const handleRejectClick = (member) => {
        setSelectedMember(member);
        setRejectReason('');
        setOpenDialog('reject');
    };

    const handleRejectSubmit = () => {
        updateStatus.mutate({ id: selectedMember.id, status: 'rejected', rejection_reason: rejectReason }, {
            onSuccess: () => {
                setOpenDialog(null);
                setRejectReason('');
                queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
            }
        });
    };

    const handleRemoveClick = (member) => {
        setSelectedMember(member);
        setRejectReason(''); // reusing state for removal reason
        setOpenDialog('remove');
    };

    const handleRemoveSubmit = () => {
        updateStatus.mutate({ id: selectedMember.id, status: 'removed', removal_reason: rejectReason }, {
            onSuccess: () => {
                setOpenDialog(null);
                setRejectReason('');
                queryClient.invalidateQueries({ queryKey: ['approvedMembers'] });
            }
        });
    };

    const isLoading = pendingLoading || approvedLoading;

    return (
        <Box sx={{ pb: 6 }}>
            <RolePageHeader
                kicker="Coordinator Dashboard"
                title="Membership Management"
                subtitle="Review requests and manage club members."
            />
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 5, p: { xs: 3, md: 5 }, borderRadius: '32px',
                    background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
                    color: 'white', position: 'relative', overflow: 'hidden',
                    boxShadow: '0 24px 60px -12px rgba(15,23,42,0.4)'
                }}
            >
                <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
                    <Box>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1.5 }}>
                                Membership
                            </Typography>
                            <Chip
                                label={coordinatorClub?.name || 'Club'}
                                sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, px: 1 }}
                            />
                        </Stack>
                        <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 500 }}>
                            Review applications and manage your club members
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={3}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight={900}>{approvedMembers?.length || 0}</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 700, textTransform: 'uppercase' }}>Total Members</Typography>
                        </Box>
                        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight={900}>{pendingRequests?.length || 0}</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 700, textTransform: 'uppercase' }}>Pending</Typography>
                        </Box>
                    </Stack>
                </Box>
            </Box>

            <Box sx={{ mb: 4 }}>
                <Paper sx={{ borderRadius: '20px', p: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', display: 'inline-flex' }}>
                    <Tabs
                        value={tabValue}
                        onChange={(e, newValue) => setTabValue(newValue)}
                        sx={{
                            '& .MuiTabs-indicator': { height: '100%', borderRadius: '14px', zIndex: 0, bgcolor: 'background.paper', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
                            '& .MuiTab-root': { zIndex: 1, borderRadius: '14px', fontWeight: 800, minHeight: 'unset', py: 1.5, px: 4, transition: '0.3s' },
                            '& .Mui-selected': { color: 'primary.main' }
                        }}
                    >
                        <Tab label={`Join Requests (${pendingRequests?.length || 0})`} disableRipple />
                        <Tab label={`Club Roll (${approvedMembers?.length || 0})`} disableRipple />
                    </Tabs>
                </Paper>
            </Box>

            <AnimatePresence mode="wait">
                {tabValue === 0 ? (
                    <Box key="requests" component={motion.div} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                        {isLoading ? (
                            <LoadingDots label="Loading requests..." minHeight="40vh" />
                        ) : (!pendingRequests || pendingRequests.length === 0) ? (
                            <Box sx={{ p: 10, textAlign: 'center', opacity: 0.5 }}>
                                <Typography variant="h6" fontWeight={600}>No pending applications</Typography>
                            </Box>
                        ) : (
                            <Grid container spacing={4}>
                                {pendingRequests.map((request) => (
                                    <Grid item xs={12} sm={6} md={4} key={request.id}>
                                        <Card sx={{
                                            borderRadius: '24px', border: '1px solid', borderColor: 'divider',
                                            transition: '0.3s', '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }
                                        }}>
                                            <CardContent sx={{ pt: 4, textAlign: 'center' }}>
                                                <Avatar
                                                    src={request.profiles?.avatar_url}
                                                    sx={{ width: 80, height: 80, mx: 'auto', mb: 2, border: '4px solid', borderColor: 'primary.light' }}
                                                />
                                                <Typography variant="h6" fontWeight={900}>{request.profiles?.full_name}</Typography>
                                                <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
                                                    {request.profiles?.department}
                                                </Typography>

                                                <Stack spacing={1} sx={{ mt: 3, textAlign: 'left' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '12px', bgcolor: 'action.hover' }}>
                                                        <MailIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                        <Typography variant="body2" fontWeight={600}>{request.profiles?.email}</Typography>
                                                    </Box>
                                                </Stack>
                                            </CardContent>
                                            <Divider sx={{ borderStyle: 'dashed' }} />
                                            <CardActions sx={{ p: 2, gap: 1 }}>
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    color="success"
                                                    onClick={() => updateStatus.mutate({ id: request.id, status: 'approved' })}
                                                    disabled={updateStatus.isPending}
                                                    sx={{ borderRadius: '12px', fontWeight: 800, py: 1 }}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    color="error"
                                                    onClick={() => handleRejectClick(request)}
                                                    disabled={updateStatus.isPending}
                                                    sx={{ borderRadius: '12px', fontWeight: 800, py: 1 }}
                                                >
                                                    Reject
                                                </Button>
                                            </CardActions>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </Box>
                ) : (
                    <Box key="members" component={motion.div} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                        <Paper sx={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                            <TableContainer>
                                <Table>
                                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>MEMBER</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>DEPARTMENT</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>EMAIL</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>ROLE</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>ACTION</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(!approvedMembers || approvedMembers.length === 0) ? (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                                    <Typography color="text.secondary">No active members found.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : approvedMembers?.map((member) => (
                                            <TableRow key={member.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Avatar src={member.profiles?.avatar_url} sx={{ width: 40, height: 40, fontWeight: 800 }}>
                                                            {member.profiles?.full_name?.charAt(0)}
                                                        </Avatar>
                                                        <Typography fontWeight={800} variant="body2">{member.profiles?.full_name}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem' }}>
                                                    {member.profiles?.department || 'Not Specified'}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem' }}>
                                                    {member.profiles?.email}
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        select
                                                        size="small"
                                                        value={member.role || 'member'}
                                                        onChange={(e) => updateRole.mutate({ id: member.id, role: e.target.value })}
                                                        SelectProps={{ native: true }}
                                                        sx={{ width: 140, '& .MuiInputBase-root': { fontSize: '0.8rem', fontWeight: 700 } }}
                                                    >
                                                        <option value="member">Member</option>
                                                        <option value="core_member">Core Member</option>
                                                        <option value="sub_coordinator">Sub-Coordinator</option>
                                                        <option value="volunteer">Volunteer</option>
                                                    </TextField>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="Remove Member">
                                                        <IconButton color="error" onClick={() => handleRemoveClick(member)} sx={{ bgcolor: 'rgba(239,68,68,0.1)' }}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Box>
                )}
            </AnimatePresence>

            {/* Rejection / Removal Dialog with Premium Styling */}
            <Dialog
                open={!!openDialog}
                onClose={() => setOpenDialog(null)}
                PaperProps={{ sx: { borderRadius: '28px', p: 2 } }}
            >
                <DialogTitle sx={{ fontWeight: 900, fontSize: '1.5rem' }}>
                    {openDialog === 'reject' ? 'Reject Application' : 'Remove Member'}
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 3, opacity: 0.7 }}>
                        Are you sure you want to {openDialog === 'reject' ? 'reject' : 'remove'} <strong>{selectedMember?.profiles?.full_name}</strong>? This action cannot be undone.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder={`Provide a reason for ${openDialog === 'reject' ? 'rejection' : 'removal'} (optional)...`}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        variant="filled"
                        InputProps={{ sx: { borderRadius: '16px' } }}
                    />
                </DialogContent>
                <DialogActions sx={{ pb: 3, px: 3, gap: 1 }}>
                    <Button onClick={() => setOpenDialog(null)} sx={{ fontWeight: 700 }}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={openDialog === 'reject' ? handleRejectSubmit : handleRemoveSubmit} disabled={updateStatus.isPending} sx={{ borderRadius: '12px', px: 4, fontWeight: 800 }}>
                        {openDialog === 'reject' ? 'Reject User' : 'Confirm Removal'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MembershipManagement;
