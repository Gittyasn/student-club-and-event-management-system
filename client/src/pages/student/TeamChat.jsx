import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import ChatWindow from '../../components/ChatWindow';

const TeamChat = () => {
    const { teamId } = useParams();
    const navigate = useNavigate();

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 2, p: { xs: 1, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ borderRadius: 2 }}>
                    Back to Team
                </Button>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    Team Chat
                </Typography>
            </Box>

            <ChatWindow
                chatType="team"
                referenceId={teamId}
                title="Team Conversation"
            />
        </Box>
    );
};

export default TeamChat;
