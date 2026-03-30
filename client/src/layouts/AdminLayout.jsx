import { Suspense, useState } from 'react';
import { Outlet, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
    // eslint-disable-next-line no-unused-vars
    Box, Drawer, Toolbar, List, Typography, IconButton,
    ListItem, ListItemButton, ListItemIcon, ListItemText,
    // eslint-disable-next-line no-unused-vars
    Avatar, Menu, MenuItem, Tooltip, Divider
} from '@mui/material';
import { motion } from 'framer-motion';
import {
    Menu as MenuIcon, Dashboard as DashboardIcon, People as PeopleIcon,
    Groups as GroupsIcon, Event as EventIcon, Logout as LogoutIcon,
    BarChart as BarChartIcon, RateReview as FeedbackIcon,
    Campaign as AnnouncementIcon, CardMembership as MembershipIcon,
    Gavel as ApprovalIcon, AccountBalanceWallet as BudgetIcon,
    EmojiEvents as ResultsIcon, Shield as SecurityIcon,
    Settings as SettingsIcon, Leaderboard as LeaderboardIcon,
    Person as ProfileIcon,
    // eslint-disable-next-line no-unused-vars
    NotificationsNone, AdminPanelSettings, ChevronRight,
    AppRegistration as RegIcon, FactCheck as AttendanceAdminIcon,
    Leaderboard as ResultsOvIcon, WorkspacePremium as CertAdminIcon,
    Shield as ShieldIcon, Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import NotificationBell from '../components/NotificationBell';
import { ModeToggle } from '../components/mode-toggle';
import CampusGuide from '../components/CampusGuide';
import ProfileQuickViewDialog from '../components/ProfileQuickViewDialog';
import LoadingDots from '../components/LoadingDots';

const DRAWER_WIDTH = 260;

const SIDEBAR_BG = 'linear-gradient(180deg, #0b1220 0%, #0f172a 45%, #0b1220 100%)'; // Executive gradient slate

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin', color: '#60a5fa', exact: true },
    { text: 'Clubs', icon: <GroupsIcon />, path: '/admin/clubs', color: '#a78bfa' },
    { text: 'Club Categories', icon: <LeaderboardIcon />, path: '/admin/club-categories', color: '#f472b6' },
    { text: 'Event Categories', icon: <EventIcon />, path: '/admin/event-categories', color: '#38bdf8' },
    { text: 'Club Leaderboard', icon: <LeaderboardIcon />, path: '/admin/club-leaderboard', color: '#fbbf24' },
    { text: 'Users', icon: <PeopleIcon />, path: '/admin/users', color: '#34d399' },
    { text: 'Events', icon: <EventIcon />, path: '/admin/events', color: '#fb7185' },
    { text: 'Analytics', icon: <BarChartIcon />, path: '/admin/analytics', color: '#38bdf8' },
    { text: 'Feedback', icon: <FeedbackIcon />, path: '/admin/feedback', color: '#f472b6' },
    { text: 'Announcements', icon: <AnnouncementIcon />, path: '/admin/announcements', color: '#fb923c' },
    { text: 'Memberships', icon: <MembershipIcon />, path: '/admin/memberships', color: '#a3e635' },
    { text: 'Approvals', icon: <ApprovalIcon />, path: '/admin/approvals', color: '#f59e0b' },
    { text: 'Registrations', icon: <RegIcon />, path: '/admin/registrations', color: '#34d399' },
    { text: 'Attendance', icon: <AttendanceAdminIcon />, path: '/admin/attendance', color: '#38bdf8' },
    { text: 'Budgets', icon: <BudgetIcon />, path: '/admin/budgets', color: '#10b981' },
    { text: 'Results', icon: <ResultsIcon />, path: '/admin/results', color: '#c084fc' },
    { text: 'Results Overview', icon: <ResultsOvIcon />, path: '/admin/results-overview', color: '#a78bfa' },
    { text: 'Certificates', icon: <CertAdminIcon />, path: '/admin/certificates', color: '#fbbf24' },
    { text: 'Broadcast Chat', icon: <AnnouncementIcon />, path: '/admin/broadcast', color: '#ef4444' },
    { text: 'System Alerts', icon: <AnnouncementIcon />, path: '/admin/broadcast-alerts', color: '#ef4444' },
    { text: 'Insights Hub', icon: <ShieldIcon />, path: '/admin/ai-governance', color: '#8b5cf6' },
    { text: 'Governance Reports', icon: <AssessmentIcon />, path: '/admin/ai-reports', color: '#ec4899' },
    { text: 'Security', icon: <SecurityIcon />, path: '/admin/security', color: '#ef4444' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/admin/settings', color: '#94a3b8' },
];

const adminRoutePreloaders = {
    '/admin/clubs': () => import('../pages/admin/Clubs'),
    '/admin/club-categories': () => import('../pages/admin/ClubCategories'),
    '/admin/event-categories': () => import('../pages/admin/EventCategories'),
    '/admin/club-leaderboard': () => import('../pages/admin/ClubLeaderboard'),
    '/admin/users': () => import('../pages/admin/Users'),
    '/admin/events': () => import('../pages/admin/Events'),
    '/admin/analytics': () => import('../pages/admin/Analytics'),
    '/admin/feedback': () => import('../pages/admin/Feedback'),
    '/admin/announcements': () => import('../pages/admin/Announcements'),
    '/admin/memberships': () => import('../pages/admin/Memberships'),
    '/admin/approvals': () => import('../pages/admin/EventApprovals'),
    '/admin/registrations': () => import('../pages/admin/RegistrationOverview'),
    '/admin/attendance': () => import('../pages/admin/AttendanceOverview'),
    '/admin/budgets': () => import('../pages/admin/Budgets'),
    '/admin/results': () => import('../pages/admin/Results'),
    '/admin/results-overview': () => import('../pages/admin/ResultsOverview'),
    '/admin/certificates': () => import('../pages/admin/CertificateManagement'),
    '/admin/broadcast': () => import('../pages/admin/BroadcastChannel'),
    '/admin/broadcast-alerts': () => import('../pages/admin/BroadcastNotification'),
    '/admin/ai-governance': () => import('../pages/admin/AIGovernance'),
    '/admin/ai-reports': () => import('../pages/admin/AIReports'),
    '/admin/security': () => import('../pages/admin/Security'),
    '/admin/settings': () => import('../pages/admin/Settings'),
};

const preloadedAdminRoutes = new Set();

const preloadAdminRoute = (path) => {
    const load = adminRoutePreloaders[path];
    if (!load || preloadedAdminRoutes.has(path)) return;

    preloadedAdminRoutes.add(path);
    load().catch(() => {
        preloadedAdminRoutes.delete(path);
    });
};

const SidebarContent = ({ location, profile, onPreloadRoute }) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: SIDEBAR_BG, overflow: 'hidden' }}>
        {/* Logo */}
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
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
                background: 'linear-gradient(135deg, #1d4ed8, #c026d3)',
                border: '1px solid rgba(255,255,255,0.22)',
                boxShadow: '0 10px 20px rgba(192,38,211,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Typography sx={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 900, letterSpacing: 0.5, lineHeight: 1 }}>
                    BU
                </Typography>
            </Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: 'white', letterSpacing: 0.2, lineHeight: 1.1, mt: 0.5 }}>
                NEXTGEN EDUTECH UNIVERSITY
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.56)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: 0.6 }}>
                Administration Hub
            </Typography>
        </Box>

        {/* Profile mini */}
        <Box sx={{ px: 2.5, py: 2, mb: 1.2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, p: 1.2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Box sx={{
                    minWidth: 86,
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
                        ADMIN
                    </Typography>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={800} sx={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.9rem', lineHeight: 1.2, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile?.full_name || 'Admin User'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(224,231,255,0.78)', fontWeight: 600, fontSize: '0.72rem', letterSpacing: 0.2 }}>
                        Portal Access
                    </Typography>
                </Box>
            </Box>
        </Box>

        {/* Nav items */}
        <List sx={{
            px: 1.5, flex: 1, overflowY: 'auto', overflowX: 'hidden',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: 4 }
        }}>
            {menuItems.map((item, i) => {
                const isActive = item.exact
                    ? location.pathname === item.path
                    : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                    <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.35, delay: i * 0.04 }}
                            style={{ width: '100%' }}
                        >
                            <ListItemButton
                                component={RouterLink}
                                to={item.path}
                                onMouseEnter={() => onPreloadRoute?.(item.path)}
                                onFocus={() => onPreloadRoute?.(item.path)}
                                onTouchStart={() => onPreloadRoute?.(item.path)}
                                sx={{
                                    borderRadius: '6px', py: 1.2, px: 1.5, position: 'relative', overflow: 'hidden',
                                    background: isActive ? `${item.color}12` : 'transparent',
                                    border: 'none',
                                    '&:hover': {
                                        background: `${item.color}08`,
                                    },
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {/* Active border indicator */}
                                {isActive && (
                                    <Box
                                        component={motion.div}
                                        layoutId="adminActiveBorder"
                                        sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, bgcolor: item.color, borderRadius: '0 4px 4px 0' }}
                                    />
                                )}
                                <ListItemIcon sx={{ minWidth: 36, color: isActive ? item.color : 'rgba(255,255,255,0.45)' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: isActive ? 700 : 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.78)' }}
                                />
                                {isActive && <ChevronRight sx={{ fontSize: 16, color: item.color, opacity: 0.5 }} />}
                            </ListItemButton>
                        </Box>
                    </ListItem>
                );
            })}
        </List>

        {/* Bottom branding */}
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.24)', fontSize: '0.66rem', fontWeight: 700 }}>
                Campus Dashboard v2.0
            </Typography>
        </Box>
    </Box>
);

const AdminLayout = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [profileDialogOpen, setProfileDialogOpen] = useState(false);
    const { logout, profile } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleProfilePreviewOpen = () => { setAnchorEl(null); setProfileDialogOpen(true); };
    const handleProfilePreviewClose = () => setProfileDialogOpen(false);
    const handleProfileEdit = () => { setProfileDialogOpen(false); navigate('/admin/profile'); };
    const handleLogout = async () => { setAnchorEl(null); await logout(); navigate('/admin/login'); };

    const drawerSx = { '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none', background: 'transparent' } };

    return (
        <Box className="app-style" sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Topbar */}
            <Box sx={{
                position: 'fixed', top: 0, right: 0, zIndex: 1200,
                width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
                height: 64,
                bgcolor: 'background.paper',
                borderBottom: '3px solid #2563eb',
                boxShadow: '0 1px 12px rgba(37,99,235,0.12)',
                display: 'flex', alignItems: 'center', px: 3, gap: 2,
            }}>
                <IconButton onClick={() => setMobileOpen(v => !v)} sx={{ display: { sm: 'none' }, color: 'text.secondary' }}>
                    <MenuIcon />
                </IconButton>

                {/* Page title from route */}
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary', letterSpacing: 0.1, fontSize: { xs: '1rem', md: '1.2rem' }, lineHeight: 1.1 }}>
                        {menuItems.find(m => m.exact ? location.pathname === m.path : location.pathname.startsWith(m.path))?.text || 'Admin'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.78rem' }}>
                        NEXTGEN EDUTECH UNIVERSITY | {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Typography>
                </Box>

                <ModeToggle />
                <CampusGuide triggerMode="topbar" />
                <NotificationBell />

                <Box component={motion.div} whileHover={{ scale: 1.05 }} onClick={e => setAnchorEl(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', px: 2, py: 1, borderRadius: '12px', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
                    <Avatar src={profile?.avatar_url || undefined} sx={{ width: 30, height: 30, background: 'linear-gradient(135deg, #3b82f6, #a855f7)', fontSize: '0.8rem', fontWeight: 900 }}>
                        {profile?.full_name?.charAt(0) || 'A'}
                    </Avatar>
                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Typography variant="caption" fontWeight={800} sx={{ color: 'text.primary', display: 'block', lineHeight: 1.2 }}>
                            {profile?.full_name?.split(' ')[0]}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', fontWeight: 600 }}>Administrator</Typography>
                    </Box>
                </Box>

                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
                    PaperProps={{ sx: { bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider', borderRadius: '12px', mt: 1, minWidth: 180 } }}>
                    <MenuItem onClick={handleProfilePreviewOpen} sx={{ gap: 1.5, borderRadius: '8px', mx: 0.5 }}>
                        <ProfileIcon fontSize="small" /> Profile
                    </MenuItem>
                    <Divider sx={{ my: 0.5 }} />
                    <MenuItem onClick={handleLogout} sx={{ color: '#ef4444', gap: 1.5, borderRadius: '8px', mx: 0.5 }}>
                        <LogoutIcon fontSize="small" /> Logout
                    </MenuItem>
                </Menu>
                <ProfileQuickViewDialog
                    open={profileDialogOpen}
                    onClose={handleProfilePreviewClose}
                    profile={profile}
                    onEdit={handleProfileEdit}
                />
            </Box>

            {/* Sidebar */}
            <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
                <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{ display: { xs: 'block', sm: 'none' }, ...drawerSx }}>
                    <SidebarContent location={location} profile={profile} onPreloadRoute={preloadAdminRoute} />
                </Drawer>
                <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, ...drawerSx }} open>
                    <SidebarContent location={location} profile={profile} onPreloadRoute={preloadAdminRoute} />
                </Drawer>
            </Box>

            {/* Main */}
            <Box component="main" className="role-surface" sx={{ flexGrow: 1, paddingTop: '80px', paddingLeft: { xs: '16px', md: '24px' }, paddingRight: { xs: '16px', md: '24px' }, paddingBottom: '48px', width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, minHeight: '100vh', position: 'relative' }}>
                <Box
                    component={motion.div}
                    key={`admin-transition-${location.pathname}`}
                    initial={{ opacity: 0.92 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'background.default',
                        pointerEvents: 'none',
                    }}
                >
                    <LoadingDots label="Opening section..." minHeight="auto" />
                </Box>
                <Suspense
                    fallback={
                        <Box sx={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <LoadingDots label="Loading section..." minHeight="auto" />
                        </Box>
                    }
                >
                    <Box
                        component={motion.div}
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                    >
                        <Outlet />
                    </Box>
                </Suspense>
            </Box>


        </Box>
    );
};

export default AdminLayout;
