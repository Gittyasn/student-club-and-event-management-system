import { useState } from 'react';
import { Outlet, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Drawer, List, Typography, IconButton,
    ListItem, ListItemButton, ListItemIcon, ListItemText,
    Avatar, Menu, MenuItem
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu as MenuIcon, Dashboard as DashboardIcon, Event as EventIcon,
    AddCircle as AddIcon, Logout as LogoutIcon, BarChart as BarChartIcon,
    People as PeopleIcon, WorkspacePremium as CertIcon, ChevronRight,
    ManageAccounts, Gavel as ApprovalIcon, Person as ProfileIcon
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import NotificationBell from '../components/NotificationBell';
import { ModeToggle } from '../components/mode-toggle';
import CampusGuide from '../components/CampusGuide';

const DRAWER_WIDTH = 260;
const SIDEBAR_BG = 'linear-gradient(180deg, #0b1220 0%, #0f172a 45%, #0b1220 100%)'; // Executive gradient slate

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/coordinator', color: '#34d399', exact: true },
    { text: 'Profile', icon: <ProfileIcon />, path: '/coordinator/profile', color: '#94a3b8' },
    { text: 'My Events', icon: <EventIcon />, path: '/coordinator/events', color: '#60a5fa' },
    { text: 'Submissions', icon: <ApprovalIcon />, path: '/coordinator/submissions', color: '#f87171' },
    { text: 'Create Event', icon: <AddIcon />, path: '/coordinator/events/create', color: '#a78bfa' },
    { text: 'Members', icon: <PeopleIcon />, path: '/coordinator/members', color: '#fb923c' },
    { text: 'Certificates', icon: <CertIcon />, path: '/coordinator/certificates', color: '#fbbf24' },
    { text: 'Analytics', icon: <BarChartIcon />, path: '/coordinator/analytics', color: '#38bdf8' },
    { text: 'Settings', icon: <ManageAccounts />, path: '/coordinator/settings', color: '#94a3b8' },
];

const SidebarContent = ({ location, profile }) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: SIDEBAR_BG }}>
        {/* Logo */}
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 0.5,
                bgcolor: 'rgba(255,255,255,0.08)',
                borderRadius: 2,
                mb: 2
            }}
        >
            <Box sx={{
                width: 58,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                border: '1px solid rgba(255,255,255,0.22)',
                boxShadow: '0 10px 20px rgba(16,185,129,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Typography sx={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 900, letterSpacing: 0.5, lineHeight: 1 }}>
                    NX
                </Typography>
            </Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: 'white', letterSpacing: 0.2, lineHeight: 1.1, mt: 0.5 }}>
                NEXTGEN EDUTECH
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.56)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: 0.6 }}>
                Faculty Portal
            </Typography>
        </Box>

        {/* Profile mini */}
        <Box sx={{ px: 2.5, py: 2, mb: 1.2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, p: 1.2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Box sx={{
                    minWidth: 124,
                    height: 38,
                    px: 1.2,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 16px rgba(37,99,235,0.35)'
                }}>
                    <Typography sx={{ color: '#fff', fontSize: '0.82rem', fontWeight: 800, letterSpacing: 0.3 }}>
                        COORDINATOR
                    </Typography>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={800} sx={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.9rem', lineHeight: 1.2, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile?.full_name || 'Coordinator User'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(224,231,255,0.78)', fontWeight: 600, fontSize: '0.72rem', letterSpacing: 0.2 }}>
                        Portal Access
                    </Typography>
                </Box>
            </Box>
        </Box>

        {/* Nav */}
        <List sx={{
            px: 1.5, flex: 1, overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: 4 }
        }}>
            {menuItems.map((item, i) => {
                const isActive = item.exact
                    ? location.pathname === item.path
                    : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                    <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                        <Box component={motion.div} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.35, delay: i * 0.05 }} style={{ width: '100%' }}>
                            <ListItemButton component={RouterLink} to={item.path}
                                sx={{
                                    borderRadius: '6px', py: 1.3, px: 1.5, position: 'relative', overflow: 'hidden',
                                    background: isActive ? `${item.color}12` : 'transparent',
                                    border: 'none',
                                    '&:hover': { background: `${item.color}08` },
                                    transition: 'all 0.15s ease'
                                }}>
                                {isActive && (
                                    <Box component={motion.div} layoutId="coordActiveBorder"
                                        sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, bgcolor: item.color, borderRadius: '0 4px 4px 0' }} />
                                )}
                                <ListItemIcon sx={{ minWidth: 36, color: isActive ? item.color : 'rgba(255,255,255,0.45)' }}>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text}
                                    primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : 'rgba(255,255,255,0.55)' }} />
                                {isActive && <ChevronRight sx={{ fontSize: 16, color: item.color, opacity: 0.6 }} />}
                            </ListItemButton>
                        </Box>
                    </ListItem>
                );
            })}
        </List>

        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.24)', fontSize: '0.66rem', fontWeight: 700 }}>
                Campus Dashboard v2.0
            </Typography>
        </Box>
    </Box>
);

const CoordinatorLayout = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const { logout, profile } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => { setAnchorEl(null); await logout(); navigate('/coordinator/login'); };
    const drawerSx = { '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none', background: 'transparent' } };

    return (
        <Box className="app-style" sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Topbar */}
            <Box sx={{
                position: 'fixed', top: 0, right: 0, zIndex: 1200,
                width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, height: 72,
                bgcolor: 'background.paper',
                borderBottom: '3px solid #10b981',
                boxShadow: '0 4px 16px rgba(16,185,129,0.08)',
                display: 'flex', alignItems: 'center', px: { xs: 2, md: 3 }, gap: 1.5,
            }}>
                <IconButton onClick={() => setMobileOpen(v => !v)} sx={{ display: { sm: 'none' }, color: 'text.secondary' }}>
                    <MenuIcon />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={800} sx={{ color: 'text.primary' }}>
                        {menuItems.find(m => m.exact ? location.pathname === m.path : location.pathname.startsWith(m.path))?.text || 'Coordinator'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        NEXTGEN EDUTECH UNIVERSITY · {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Typography>
                </Box>
                <ModeToggle />
                <CampusGuide triggerMode="topbar" />
                <NotificationBell />
                <Box component={motion.div} whileHover={{ scale: 1.02 }} onClick={e => setAnchorEl(e.currentTarget)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', px: 1.5, py: 0.75, borderRadius: '8px', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
                    <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: '0.8rem', fontWeight: 700 }}>
                        {profile?.full_name?.charAt(0) || 'C'}
                    </Avatar>
                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Typography variant="caption" fontWeight={700} sx={{ color: 'text.primary', display: 'block', lineHeight: 1.2 }}>{profile?.full_name?.split(' ')[0]}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', fontWeight: 500 }}>Coordinator</Typography>
                    </Box>
                </Box>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
                    PaperProps={{ sx: { mt: 1 } }}>
                    <MenuItem onClick={handleLogout} sx={{ color: 'error.main', gap: 1.5 }}>
                        <LogoutIcon fontSize="small" /> Logout
                    </MenuItem>
                </Menu>
            </Box>

            {/* Sidebar */}
            <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
                <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
                    sx={{ display: { xs: 'block', sm: 'none' }, ...drawerSx }}>
                    <SidebarContent location={location} profile={profile} />
                </Drawer>
                <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, ...drawerSx }} open>
                    <SidebarContent location={location} profile={profile} />
                </Drawer>
            </Box>

            {/* Main */}
            <Box component="main" className="role-surface" sx={{ flexGrow: 1, paddingTop: '80px', paddingLeft: { xs: '16px', md: '24px' }, paddingRight: { xs: '16px', md: '24px' }, paddingBottom: '48px', width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, minHeight: '100vh' }}>
                <AnimatePresence mode="wait">
                    <Box component={motion.div} key={location.pathname}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}>
                        <Outlet />
                    </Box>
                </AnimatePresence>
            </Box>

        </Box>
    );
};

export default CoordinatorLayout;
