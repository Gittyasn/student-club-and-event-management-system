import { Box, Typography, Container } from '@mui/material';
import { Campaign as CampaignIcon } from '@mui/icons-material';
import ChatWindow from '../../components/ChatWindow';

const BroadcastChannel = () => {
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{
                    width: 48, height: 48, borderRadius: '12px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
                }}>
                    <CampaignIcon sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                        Campus Broadcasts
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Push campus-wide announcements to all students and staff.
                    </Typography>
                </Box>
            </Box>

            {/* Enterprise Chat Engine Integration */}
            <ChatWindow
                chatType="broadcast"
                referenceId={null}
                title="Global Announcements"
            />
        </Container>
    );
};

export default BroadcastChannel;
