import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, profile, role, loading } = useAuthStore();
    const location = useLocation();

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        if (location.pathname.startsWith('/admin')) {
            return <Navigate to="/admin/login" replace />;
        }
        if (location.pathname.startsWith('/coordinator')) {
            return <Navigate to="/coordinator/login" replace />;
        }
        return <Navigate to="/login" replace />;
    }

    const isVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
    if (!isVerified) {
        return <Navigate to="/verify-email" replace />;
    }

    if (profile?.account_status === 'blocked' || profile?.account_status === 'suspended') {
        return (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="100vh" p={4} textAlign="center">
                <h1 className="text-2xl font-bold text-red-600 mb-2">
                    Account {profile?.account_status === 'blocked' ? 'Blocked' : 'Restricted'}
                </h1>
                <p className="text-slate-600 mb-4">
                    Your account has been {profile?.account_status}. Please contact the administrator.
                </p>
                <button
                    onClick={() => useAuthStore.getState().logout()}
                    className="text-primary hover:underline font-medium"
                >
                    Sign Out
                </button>
            </Box>
        );
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
        return <Navigate to="/unauthorized" replace />;
    }


    return <Outlet />;
};

export default ProtectedRoute;
