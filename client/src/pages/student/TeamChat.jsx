import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import ChatWindow from '../../components/ChatWindow';

/**
 * TeamChat Page integration
 * Connects the ChatWindow engine specifically to a team context.
 */
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
                    Squad Intelligence
                </Typography>
            </Box>

            {/* Enterprise Chat Engine Integration */}
            <ChatWindow
                chatType="team"
                referenceId={teamId}
                title="Squad Comms"
            />
        </Box>
    );
};

export default TeamChat;
