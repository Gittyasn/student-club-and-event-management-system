import { useAuthStore } from '../../store/authStore';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const { user, profile, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
            <Typography variant="body1">Welcome, {profile?.full_name} ({user?.email})</Typography>
            <Button variant="contained" color="secondary" onClick={handleLogout} sx={{ mt: 2 }}>
                Logout
            </Button>
        </Box>
    );
};

export default AdminDashboard;
