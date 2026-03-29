import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, Paper,
    List, ListItem, ListItemText, ListItemAvatar, Avatar,
    Checkbox, Divider, Chip
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    CardMembership as CertificateIcon,
    CheckCircle as SuccessIcon
} from '@mui/icons-material';
import { useEventById } from '../../hooks/useEventById';
import { useEventRegistrations } from '../../hooks/useAttendance';
import { useEventCertificates, useCertificateMutations } from '../../hooks/useCertificates';
import RolePageHeader from '../../components/RolePageHeader';
import LoadingDots from '../../components/LoadingDots';

const Certificates = () => {
    const { id: eventId } = useParams();
    const navigate = useNavigate();

    const { data: event, isLoading: eventLoading } = useEventById(eventId);
    const { data: registrations, isLoading: regsLoading } = useEventRegistrations(eventId);
    const { data: certificates, isLoading: certsLoading } = useEventCertificates(eventId);
    const { generateCertificates } = useCertificateMutations(eventId);

    const [selectedUsers, setSelectedUsers] = useState([]);

    if (eventLoading || regsLoading || certsLoading) return <LoadingDots label="Loading certificates..." minHeight="50vh" />;

    if (!event?.certificate_enabled) {
        return (
            <Box textAlign="center" mt={10}>
                <Typography variant="h5" color="text.secondary">
                    Certificates are not enabled for this event.
                </Typography>
                <Button sx={{ mt: 2 }} onClick={() => navigate(-1)} variant="outlined">Go Back</Button>
            </Box>
        );
    }

    const presentAttendees = registrations?.filter((registration) =>
        ['present', 'late'].includes(registration.attendance?.status)
    ) || [];

    const handleToggle = (userId) => {
        const currentIndex = selectedUsers.indexOf(userId);
        const newChecked = [...selectedUsers];

        if (currentIndex === -1) {
            newChecked.push(userId);
        } else {
            newChecked.splice(currentIndex, 1);
        }
        setSelectedUsers(newChecked);
    };

    const handleSelectAll = () => {
        if (selectedUsers.length === presentAttendees.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(presentAttendees.map(r => r.user_id));
        }
    };

    const handleGenerate = () => {
        if (selectedUsers.length === 0) return;
        generateCertificates.mutate({ userIds: selectedUsers, mode: 'all' });
        setSelectedUsers([]);
    };

    const hasCertificate = (userId) => {
        return certificates?.some(c => String(c.user_id) === String(userId));
    };

    return (
        <Box sx={{ maxWidth: 800, margin: '0 auto', pb: 5 }}>
            <RolePageHeader
                kicker="Coordinator Dashboard"
                title="Certificate Issuance"
                subtitle="Select recipients and generate certificates."
            />
            <Box display="flex" alignItems="center" mb={3}>
                <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mr: 2 }}>
                    Back
                </Button>
                <Box flexGrow={1}>
                    <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: -0.5 }}>
                        Issue Certificates
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        {event?.title}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={generateCertificates.isPending ? <LoadingDots inline size={5} color="currentColor" /> : <CertificateIcon />}
                    disabled={selectedUsers.length === 0 || generateCertificates.isPending}
                    onClick={handleGenerate}
                    sx={{ borderRadius: 2, px: 3, py: 1.5, fontWeight: 'bold' }}
                >
                    Generate Selected ({selectedUsers.length})
                </Button>
            </Box>

            <Paper sx={{ borderRadius: 2 }}>
                <Box p={2} display="flex" justifyContent="space-between" alignItems="center" bgcolor="grey.50">
                    <Typography variant="subtitle2" color="text.secondary">
                        Showing only attendees marked as &quot;Present&quot; ({presentAttendees.length})
                    </Typography>
                    <Button size="small" onClick={handleSelectAll}>
                        {selectedUsers.length === presentAttendees.length ? 'Deselect All' : 'Select All'}
                    </Button>
                </Box>
                <Divider />
                <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
                    {presentAttendees.map((reg) => {
                        const isIssued = hasCertificate(reg.user_id);
                        return (
                            <ListItem
                                key={reg.id}
                                disablePadding
                                divider
                                onClick={() => handleToggle(reg.user_id)}
                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                            >
                                <Checkbox
                                    edge="start"
                                    checked={selectedUsers.indexOf(reg.user_id) !== -1}
                                    tabIndex={-1}
                                    disableRipple
                                    sx={{ ml: 1 }}
                                />
                                <ListItemAvatar>
                                    <Avatar>{reg.profiles?.full_name?.charAt(0)}</Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={reg.profiles?.full_name}
                                    secondary={reg.profiles?.email}
                                />
                                {isIssued && (
                                    <Chip
                                        icon={<SuccessIcon />}
                                        label="Issued"
                                        color="success"
                                        size="small"
                                        variant="outlined"
                                        sx={{ mr: 2 }}
                                    />
                                )}
                            </ListItem>
                        );
                    })}
                    {presentAttendees.length === 0 && (
                        <ListItem>
                            <ListItemText primary="No attendees marked as present yet." sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }} />
                        </ListItem>
                    )}
                </List>
            </Paper>
        </Box>
    );
};

export default Certificates;
