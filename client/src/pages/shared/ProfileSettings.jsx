import { 
    Box, Typography, Paper, Grid, TextField, Button, Avatar, 
    MenuItem, IconButton, Chip, useTheme, Stack,
    Tab, Tabs, InputAdornment, Skeleton, Tooltip, Fade, useMediaQuery
} from '@mui/material';
import { useAuthStore } from '../../store/authStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { 
    Save as SaveIcon, 
    PhotoCamera as PhotoIcon, 
    LockOutlined as LockIcon, 
    VerifiedUser as SecurityIcon,
    PhoneIphone as PhoneIcon,
    School as SchoolIcon,
    Language as SocialIcon,
    AccountCircle as UserIcon,
    Verified as VerifiedIcon,
    AdminPanelSettings as AdminIcon,
    Stars as StarIcon
} from '@mui/icons-material';

const TabPanel = ({ children, value, index, ...other }) => (
    <Fade in={value === index}>
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 1 }}>{children}</Box>}
        </div>
    </Fade>
);

const SurfaceSection = ({ eyebrow, title, description, children }) => (
    <Box
        sx={{
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 2.5, md: 3 },
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.34)' : 'rgba(248,250,252,0.76)',
        }}
    >
        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 0.7 }}>
            {eyebrow}
        </Typography>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 0.7 }}>
            {title}
        </Typography>
        {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.7, mb: 2.5, lineHeight: 1.65 }}>
                {description}
            </Typography>
        ) : null}
        {children}
    </Box>
);

const SummaryMetric = ({ icon, label, value }) => (
    <Box
        sx={{
            borderRadius: 3.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.56)' : 'rgba(255,255,255,0.82)',
            p: 2.1,
            minHeight: 108,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 12px 26px rgba(2,6,23,0.24)'
                : '0 12px 26px rgba(15,23,42,0.05)',
        }}
    >
        <Box sx={{ width: 40, height: 40, borderRadius: '14px', display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'primary.main' }}>
            {icon}
        </Box>
        <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 0.45 }}>
                {label}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 800, mt: 0.7, wordBreak: 'break-word' }}>
                {value}
            </Typography>
        </Box>
    </Box>
);

const SummaryRow = ({ label, value }) => (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            py: 1.4,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:last-of-type': { borderBottom: 'none', pb: 0 },
        }}
    >
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 0.45 }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>
            {value || 'Not added'}
        </Typography>
    </Box>
);

const ProfileSettings = () => {
    const { profile, checkAuth } = useAuthStore();
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
    const queryClient = useQueryClient();
    const [tabValue, setTabValue] = useState(0);

    
    const [formData, setFormData] = useState({
        full_name: '',
        department: '',
        year: '',
        phone: '',
        bio: '',
        avatar_url: '',
        social_links: { twitter: '', linkedin: '', github: '' }
    });

    const [passwordData, setPasswordData] = useState({
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (profile) {
            const timeoutId = window.setTimeout(() => {
                setFormData({
                    full_name: profile.full_name || '',
                    department: profile.department || '',
                    year: profile.year || '',
                    phone: profile.phone || '',
                    bio: profile.bio || '',
                    avatar_url: profile.avatar_url || '',
                    social_links: profile.social_links || { twitter: '', linkedin: '', github: '' }
                });
            }, 0);

            return () => window.clearTimeout(timeoutId);
        }
    }, [profile]);

    const updateProfile = useMutation({
        mutationFn: async (updatedData) => {
            const { error } = await supabase
                .from('profiles')
                .update(updatedData)
                .eq('id', profile.id);
            if (error) throw error;
        },
        onSuccess: () => {
            checkAuth();
            queryClient.invalidateQueries({ queryKey: ['profile', profile?.id] });
            toast.success('Identity profile synchronized!');
        },
        onError: (err) => {
            toast.error(`Sync error: ${err.message}`);
        }
    });

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        updateProfile.mutate(formData);
    };

    const updatePassword = useMutation({
        mutationFn: async (newPassword) => {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Security key updated.');
            setPasswordData({ password: '', confirmPassword: '' });
        },
        onError: (err) => {
            toast.error(`Vault error: ${err.message}`);
        }
    });

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (passwordData.password !== passwordData.confirmPassword) {
            return toast.error("Verification mismatch!");
        }
        updatePassword.mutate(passwordData.password);
    };

    if (!profile) return (
        <Box sx={{ p: 4 }}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 4, mb: 4 }} />
            <Grid container spacing={4}>
                <Grid item xs={4}><Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} /></Grid>
                <Grid item xs={8}><Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} /></Grid>
            </Grid>
        </Box>
    );

    const isStudent = profile.role === 'student';
    const roleLabel = profile.role === 'admin' ? 'Administrator' : profile.role === 'coordinator' ? 'Coordinator' : 'Student';
    const profileTabs = [
        { label: 'Profile Details', icon: <UserIcon sx={{ mr: isDesktop ? 2 : 0 }} /> },
        { label: 'Security', icon: <LockIcon sx={{ mr: isDesktop ? 2 : 0 }} /> },
        { label: 'Social Links', icon: <SocialIcon sx={{ mr: isDesktop ? 2 : 0 }} /> },
    ];
    const summaryCards = [
        { label: 'Role Access', value: roleLabel, icon: profile.role === 'admin' ? <AdminIcon fontSize="small" /> : <UserIcon fontSize="small" /> },
        { label: 'Department', value: profile.department || 'Not added', icon: <SchoolIcon fontSize="small" /> },
        { label: isStudent ? 'Year of Study' : 'Account Status', value: isStudent ? (profile.year || 'Not added') : (profile.account_status || 'Active'), icon: isStudent ? <SchoolIcon fontSize="small" /> : <VerifiedIcon fontSize="small" /> },
        { label: 'Phone', value: profile.phone || 'Not added', icon: <PhoneIcon fontSize="small" /> },
    ];


    return (
        <Box sx={{ pb: 8, maxWidth: 1240, mx: 'auto' }}>
            <Paper
                elevation={0}
                sx={{
                    mb: 4,
                    p: { xs: 3, md: 4.25 },
                    borderRadius: 6,
                    border: `1px solid ${theme.palette.divider}`,
                    background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,0.98) 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    boxShadow: '0 24px 60px rgba(15,23,42,0.08)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <Box sx={{ 
                    position: 'absolute', top: -150, right: -50, width: 360, height: 360, 
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)'
                }} />
                <Box sx={{ 
                    position: 'absolute', bottom: -120, left: -40, width: 240, height: 240,
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 72%)'
                }} />

                <Grid container spacing={{ xs: 3, md: 4 }} alignItems="center">
                    <Grid item xs={12} lg={7.5}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }}>
                            <Box
                                sx={{
                                    position: 'relative',
                                    p: 1.15,
                                    borderRadius: '30px',
                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.82)',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    boxShadow: '0 18px 42px rgba(15,23,42,0.10)',
                                }}
                            >
                                <Avatar
                                    src={formData.avatar_url}
                                    sx={{ 
                                        width: { xs: 104, md: 132 }, height: { xs: 104, md: 132 },
                                        boxShadow: '0 18px 40px rgba(15,23,42,0.16)',
                                        border: `4px solid ${theme.palette.background.paper}`,
                                        transition: 'transform 0.3s ease',
                                        '&:hover': { transform: 'scale(1.02)' }
                                    }}
                                >
                                    {profile.full_name?.charAt(0)}
                                </Avatar>
                                <Tooltip title="Update Display Image">
                                    <IconButton
                                        size="small"
                                        sx={{
                                            position: 'absolute', bottom: 10, right: 10,
                                            bgcolor: 'primary.main', color: 'white',
                                            boxShadow: 4, border: '3px solid white',
                                            '&:hover': { bgcolor: 'primary.dark' }
                                        }}
                                    >
                                        <PhotoIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>

                            <Stack spacing={1.6} sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: 1.8 }}>
                                    Your Profile
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                                    <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1.3, color: 'text.primary', fontSize: { xs: '1.95rem', md: '2.45rem' } }}>
                                        {profile.full_name}
                                    </Typography>
                                    {profile.account_status === 'active' && <VerifiedIcon color="primary" sx={{ fontSize: 26 }} />}
                                </Box>
                                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.2, wordBreak: 'break-word' }}>
                                    {profile.email}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1.25, pt: 0.6, flexWrap: 'wrap' }}>
                                    <Chip 
                                        icon={profile.role === 'admin' ? <AdminIcon /> : <UserIcon />} 
                                        label={profile.role?.toUpperCase()} 
                                        color="primary" 
                                        sx={{ fontWeight: 800, borderRadius: '999px', height: 34, px: 1, boxShadow: '0 8px 20px rgba(99,102,241,0.18)' }} 
                                    />
                                    <Chip 
                                        icon={<StarIcon sx={{ color: '#f59e0b !important' }} />} 
                                        label={profile.account_status?.toUpperCase() || 'VERIFIED'} 
                                        variant="outlined"
                                        sx={{ fontWeight: 800, borderRadius: '999px', height: 34, px: 1, borderColor: 'divider' }}
                                    />
                                    {profile.department && (
                                        <Chip 
                                            icon={<SchoolIcon />} 
                                            label={profile.department} 
                                            variant="outlined" 
                                            sx={{ fontWeight: 700, borderRadius: '999px', height: 34, px: 1, borderColor: 'divider' }}
                                        />
                                    )}
                                </Box>
                                <Typography sx={{ color: 'text.secondary', lineHeight: 1.7, maxWidth: 720 }}>
                                    {formData.bio || 'Keep your account details updated so your club, events, certificates, and academic identity stay synchronized across the platform.'}
                                </Typography>
                            </Stack>
                        </Stack>
                    </Grid>
                    <Grid item xs={12} lg={4.5}>
                        <Grid container spacing={1.5}>
                            {summaryCards.map((item) => (
                                <Grid item xs={12} sm={6} key={item.label}>
                                    <SummaryMetric {...item} />
                                </Grid>
                            ))}
                        </Grid>
                    </Grid>
                </Grid>
            </Paper>

            <Grid container spacing={3} alignItems="stretch">
                <Grid item xs={12} lg={3.5} sx={{ display: 'flex' }}>
                    <Stack spacing={3} sx={{ width: '100%' }}>
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 5,
                                border: `1px solid ${theme.palette.divider}`,
                                p: 3,
                                boxShadow: '0 12px 30px rgba(15,23,42,0.04)',
                            }}
                        >
                            <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: 1.8 }}>
                                Profile Summary
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.65 }}>
                                A quick view of the details shown across your clubs, events, certificates, and workspace activity.
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <SummaryRow label="Full Name" value={formData.full_name} />
                                <SummaryRow label="Email" value={profile.email} />
                                <SummaryRow label="Phone" value={formData.phone} />
                                <SummaryRow label="Department" value={formData.department} />
                            </Box>
                        </Paper>

                        <Paper
                            elevation={0}
                            sx={{
                                width: '100%',
                                borderRadius: 5,
                                border: `1px solid ${theme.palette.divider}`,
                                overflow: 'hidden',
                                boxShadow: '0 12px 30px rgba(15,23,42,0.04)',
                            }}
                        >
                            <Box sx={{ p: 3, pb: 2 }}>
                                <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: 1.8 }}>
                                    Workspace Console
                                </Typography>
                            </Box>
                            <Tabs
                                orientation={isDesktop ? 'vertical' : 'horizontal'}
                                variant={isDesktop ? 'standard' : 'fullWidth'}
                                value={tabValue}
                                onChange={(e, v) => setTabValue(v)}
                                sx={{
                                    borderTop: '1px solid',
                                    borderColor: 'divider',
                                    '& .MuiTab-root': {
                                        alignItems: isDesktop ? 'flex-start' : 'center',
                                        textAlign: isDesktop ? 'left' : 'center',
                                        justifyContent: isDesktop ? 'flex-start' : 'center',
                                        py: 2.1,
                                        px: 3,
                                        minHeight: 64,
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                        color: 'text.secondary',
                                        borderLeft: isDesktop ? '4px solid transparent' : 'none',
                                        borderBottom: !isDesktop ? '3px solid transparent' : 'none',
                                        transition: 'all 0.2s',
                                        '&.Mui-selected': { 
                                            color: 'primary.main',
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.04)',
                                            borderLeftColor: isDesktop ? 'primary.main' : 'transparent',
                                            borderBottomColor: !isDesktop ? theme.palette.primary.main : 'transparent',
                                            boxShadow: isDesktop ? 'inset 0 0 0 1px rgba(99,102,241,0.08)' : 'none',
                                        }
                                    },
                                    '& .MuiTabs-indicator': { display: 'none' }
                                }}
                            >
                                {profileTabs.map((tab) => (
                                    <Tab
                                        key={tab.label}
                                        label={tab.label}
                                        icon={tab.icon}
                                        iconPosition={isDesktop ? 'start' : 'top'}
                                    />
                                ))}
                            </Tabs>
                            
                            <Box sx={{ p: 3 }}>
                                <Paper sx={{ p: 2.2, borderRadius: 3.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.4)' : 'rgba(241,245,249,1)', border: 'none' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <SecurityIcon fontSize="inherit" /> ACCOUNT SECURITY
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.5 }}>
                                        Your profile changes stay linked with the platform workspace so permissions, clubs, and certificates remain consistent.
                                    </Typography>
                                </Paper>
                            </Box>
                        </Paper>
                    </Stack>
                </Grid>

                <Grid item xs={12} lg={8.5} sx={{ display: 'flex' }}>
                        <Paper
                            elevation={0}
                            sx={{
                                width: '100%',
                                p: { xs: 3, md: 4 },
                            borderRadius: 5,
                            border: `1px solid ${theme.palette.divider}`,
                            height: '100%',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 12px 30px rgba(15,23,42,0.04)',
                        }}
                    >
                        <TabPanel value={tabValue} index={0}>
                            <Stack spacing={3}>
                                <Box>
                                    <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: -0.5 }}>Profile Details</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Update the personal details shown across your account and campus workspace.
                                    </Typography>
                                </Box>
                                <form onSubmit={handleFormSubmit}>
                                    <Stack spacing={3}>
                                        <SurfaceSection
                                            eyebrow="SECTION 01"
                                            title="Basic Information"
                                            description="Manage the primary details used for your profile and account identity."
                                        >
                                            <Grid container spacing={3}>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        fullWidth label="Full Legal Name" value={formData.full_name}
                                                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                                        InputProps={{ startAdornment: <InputAdornment position="start"><UserIcon fontSize="small" sx={{ opacity: 0.5 }} /></InputAdornment> }}
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        fullWidth label="Communication Number" value={formData.phone}
                                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                                        InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon fontSize="small" sx={{ opacity: 0.5 }} /></InputAdornment> }}
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={isStudent ? 6 : 12}>
                                                    <TextField
                                                        fullWidth label="Academic Department" value={formData.department}
                                                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                                                        InputProps={{ startAdornment: <InputAdornment position="start"><SchoolIcon fontSize="small" sx={{ opacity: 0.5 }} /></InputAdornment> }}
                                                    />
                                                </Grid>
                                                {isStudent && (
                                                    <Grid item xs={12} sm={6}>
                                                        <TextField
                                                            select fullWidth label="Current Semester/Year" value={formData.year}
                                                            onChange={(e) => setFormData({...formData, year: e.target.value})}
                                                        >
                                                            {[1,2,3,4].map(y => <MenuItem key={y} value={y}>{y}{y===1?'st':y===2?'nd':y===3?'rd':'th'} Year</MenuItem>)}
                                                        </TextField>
                                                    </Grid>
                                                )}
                                            </Grid>
                                        </SurfaceSection>

                                        <SurfaceSection
                                            eyebrow="SECTION 02"
                                            title="About You"
                                            description="Add a short bio and profile image so your account feels complete everywhere."
                                        >
                                            <Grid container spacing={3}>
                                                <Grid item xs={12}>
                                                    <TextField
                                                        fullWidth multiline rows={4} label="Professional Bio / Academic Pitch" 
                                                        value={formData.bio}
                                                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                                        placeholder="Introduce yourself to the university ecosystem..."
                                                    />
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <TextField
                                                        fullWidth label="Display Image URL" value={formData.avatar_url}
                                                        onChange={(e) => setFormData({...formData, avatar_url: e.target.value})}
                                                        placeholder="Paste external image link here"
                                                    />
                                                </Grid>
                                            </Grid>
                                        </SurfaceSection>

                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
                                            <Button 
                                                type="submit" variant="contained" size="large" 
                                                startIcon={<SaveIcon />} disabled={updateProfile.isPending}
                                                sx={{ py: 1.5, px: 4.5, borderRadius: 3, fontWeight: 800, fontSize: '0.98rem', textTransform: 'none', boxShadow: '0 10px 25px rgba(99,102,241,0.18)' }}
                                            >
                                                {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                                            </Button>
                                        </Box>
                                    </Stack>
                                </form>
                            </Stack>
                        </TabPanel>

                        <TabPanel value={tabValue} index={1}>
                            <Stack spacing={3}>
                                <Box>
                                    <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: -0.5 }}>Password & Security</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Update your password to keep your account secure.
                                    </Typography>
                                </Box>
                                <SurfaceSection
                                    eyebrow="SECURITY"
                                    title="Change Password"
                                    description="Use a strong password that you do not reuse on other services."
                                >
                                    <form onSubmit={handlePasswordSubmit}>
                                        <Stack spacing={3}>
                                            <TextField
                                                fullWidth type="password" label="New Password"
                                                value={passwordData.password}
                                                onChange={(e) => setPasswordData({...passwordData, password: e.target.value})}
                                                required
                                            />
                                            <TextField
                                                fullWidth type="password" label="Confirm New Password"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                                required
                                            />
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
                                                <Button 
                                                    type="submit" variant="contained" color="warning"
                                                    startIcon={<LockIcon />} disabled={updatePassword.isPending || !passwordData.password}
                                                    sx={{ py: 1.5, px: 4.5, borderRadius: 3, fontWeight: 800, fontSize: '0.98rem', textTransform: 'none' }}
                                                >
                                                    {updatePassword.isPending ? 'Updating...' : 'Update Password'}
                                                </Button>
                                            </Box>
                                        </Stack>
                                    </form>
                                </SurfaceSection>
                            </Stack>
                        </TabPanel>

                        <TabPanel value={tabValue} index={2}>
                            <Stack spacing={3}>
                                <Box>
                                    <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: -0.5 }}>Social Links</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Add your public links to make your profile more complete.
                                    </Typography>
                                </Box>
                                <SurfaceSection
                                    eyebrow="SOCIAL"
                                    title="Connected Profiles"
                                    description="These public links help others discover your work without changing your existing profile data."
                                >
                                    <Stack spacing={3}>
                                        {['Twitter', 'LinkedIn', 'GitHub'].map((plat) => (
                                            <TextField
                                                key={plat}
                                                fullWidth label={`${plat} Ecosystem Profile`}
                                                value={formData.social_links[plat.toLowerCase()]}
                                                onChange={(e) => setFormData({
                                                    ...formData, 
                                                    social_links: { ...formData.social_links, [plat.toLowerCase()]: e.target.value } 
                                                })}
                                                InputProps={{ 
                                                    startAdornment: <InputAdornment position="start"><SocialIcon fontSize="small" sx={{ color: 'primary.main', opacity: 0.6 }} /></InputAdornment> 
                                                }}
                                                placeholder={`https://${plat.toLowerCase()}.com/username`}
                                            />
                                        ))}
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
                                            <Button 
                                                onClick={handleFormSubmit} variant="contained" 
                                                sx={{ py: 1.5, px: 4.5, borderRadius: 3, fontWeight: 800, fontSize: '0.98rem', textTransform: 'none' }}
                                            >
                                                Save Social Links
                                            </Button>
                                        </Box>
                                    </Stack>
                                </SurfaceSection>
                            </Stack>
                        </TabPanel>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ProfileSettings;
