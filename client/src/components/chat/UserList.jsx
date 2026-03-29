import { Drawer, Box, Typography, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, IconButton, Chip } from '@mui/material';
import { Close as CloseIcon, Person as PersonIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import LoadingDots from '../LoadingDots';

const UserList = ({ open, onClose, chatType, referenceId }) => {

    // Fetch members based on chat type
    const { data: members = [], isLoading } = useQuery({
        queryKey: ['chatMembers', chatType, referenceId],
        enabled: open && !!chatType,
        queryFn: async () => {
            if (chatType === 'club') {
                const { data, error } = await supabase
                    .from('club_memberships')
                    .select('profiles:profiles!club_memberships_user_id_fkey(id, full_name, avatar_url, role)')
                    .eq('club_id', referenceId)
                    .eq('status', 'approved');
                if (error) throw error;
                return data?.map(d => d.profiles) || [];
            } else if (chatType === 'event') {
                const { data, error } = await supabase
                    .from('registrations')
                    .select('profiles:profiles!registrations_user_id_fkey(id, full_name, avatar_url, role)')
                    .eq('event_id', referenceId)
                    .eq('status', 'registered');
                if (error) throw error;
                return data?.map(d => d.profiles) || [];
            }
            return [];
        }
    });

    return (
        <Drawer anchor="right" open={open} onClose={onClose}>
            <Box sx={{ width: 300, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
                    <Typography variant="h6">Chat Roster</Typography>
                    <IconButton color="inherit" onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Divider />

                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {isLoading ? (
                        <LoadingDots label="Loading members..." minHeight="140px" />
                    ) : (
                        <List>
                            {members.map(member => (
                                <ListItem key={member.id} divider>
                                    <ListItemAvatar>
                                        <Avatar src={member.avatar_url}>
                                            {member.full_name?.charAt(0) || <PersonIcon />}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={member.full_name}
                                        secondary={
                                            member.role === 'coordinator' ? (
                                                <Chip label="Coordinator" size="small" color="info" sx={{ height: 16, fontSize: '0.65rem', mt: 0.5 }} />
                                            ) : 'Member'
                                        }
                                    />
                                </ListItem>
                            ))}
                            {members.length === 0 && (
                                <Typography sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>No members found.</Typography>
                            )}
                        </List>
                    )}
                </Box>
            </Box>
        </Drawer>
    );
};

export default UserList;
