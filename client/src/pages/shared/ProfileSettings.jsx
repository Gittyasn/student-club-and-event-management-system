import { 
    Box, Typography, Paper, Grid, TextField, Button, Avatar, 
    MenuItem, IconButton, Chip, useTheme, Stack,
    Tab, Tabs, InputAdornment, Skeleton, Tooltip, Fade
} from '@mui/material';
import { useAuthStore } from '../../store/authStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'sonner';
import { useState } from 'react';
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

const ProfileSettings = () => {
    const { profile, checkAuth } = useAuthStore();
    const theme = useTheme();
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

    const [prevProfile, setPrevProfile] = useState(null);
    if (profile !== prevProfile) {
        setPrevProfile(profile);
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                department: profile.department || '',
                year: profile.year || '',
                phone: profile.phone || '',
                bio: profile.bio || '',
                avatar_url: profile.avatar_url || '',
                social_links: profile.social_links || { twitter: '', linkedin: '', github: '' }
            });
        }
    }

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


    return (
        <Box sx={{ pb: 8, maxWidth: 1200, mx: 'auto' }}>
            {/* Immersive Header Section */}
            <Paper
                elevation={0}
                sx={{
                    mb: 5, p: { xs: 4, md: 6 }, borderRadius: 6,
                    border: `1px solid ${theme.palette.divider}`,
                    background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, #0f172a 0%, #171717 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
                    position: 'relative', overflow: 'hidden'
                }}
            >
                <Box sx={{ 
                    position: 'absolute', top: -150, right: -50, width: 400, height: 400, 
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)'
                }} />

                <Grid container spacing={4} alignItems="center">
                    <Grid item>
                        <Box sx={{ position: 'relative' }}>
                            <Avatar
                                src={formData.avatar_url}
                                sx={{ 
                                    width: { xs: 120, md: 160 }, height: { xs: 120, md: 160 },
                                    boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
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
                                        position: 'absolute', bottom: 12, right: 12,
                                        bgcolor: 'primary.main', color: 'white',
                                        boxShadow: 4, border: '3px solid white',
                                        '&:hover': { bgcolor: 'primary.dark' }
                                    }}
                                >
                                    <PhotoIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md>
                        <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1.5, color: 'text.primary' }}>
                                    {profile.full_name}
                                </Typography>
                                {profile.account_status === 'active' && <VerifiedIcon color="primary" sx={{ fontSize: 28 }} />}
                            </Box>
                            
                            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.5 }}>
                                {profile.email}
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 1.5, pt: 1, flexWrap: 'wrap' }}>
                                <Chip 
                                    icon={profile.role === 'admin' ? <AdminIcon /> : <UserIcon />} 
                                    label={profile.role?.toUpperCase()} 
                                    color="primary" 
                                    sx={{ fontWeight: 800, borderRadius: 2, height: 32, px: 1, boxShadow: '0 4px 12px rgba(99,102,241,0.2)' }} 
                                />
                                <Chip 
                                    icon={<StarIcon sx={{ color: '#f59e0b !important' }} />} 
                                    label={profile.account_status?.toUpperCase() || 'VERIFIED'} 
                                    variant="outlined"
                                    sx={{ fontWeight: 800, borderRadius: 2, height: 32, px: 1, borderColor: 'divider' }}
                                />
                                {profile.department && (
                                    <Chip 
                                        icon={<SchoolIcon />} 
                                        label={profile.department} 
                                        variant="outlined" 
                                        sx={{ fontWeight: 600, borderRadius: 2, height: 32, px: 1, borderColor: 'divider' }}
                                    />
                                )}
                            </Box>
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            <Grid container spacing={4} alignItems="stretch">
                {/* Navigation Sidebar */}
                <Grid item xs={12} md={3.5} sx={{ display: 'flex' }}>
                    <Paper
                        elevation={0}
                        sx={{
                            width: '100%', borderRadius: 5, border: `1px solid ${theme.palette.divider}`,
                            overflow: 'hidden', height: '100%', flex: 1, display: 'flex', flexDirection: 'column'
                        }}
                    >
                        <Box sx={{ p: 4, pb: 2 }}>
                            <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: 2 }}>Workspace Console</Typography>
                        </Box>
                        <Tabs
                            orientation="vertical"
                            value={tabValue}
                            onChange={(e, v) => setTabValue(v)}
                            sx={{
                                '& .MuiTab-root': {
                                    alignItems: 'flex-start', textAlign: 'left', py: 2.5, px: 4,
                                    fontWeight: 700, fontSize: '0.95rem', color: 'text.secondary',
                                    borderLeft: '4px solid transparent',
                                    transition: 'all 0.2s',
                                    '&.Mui-selected': { 
                                        color: 'primary.main', 
                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.04)',
                                        borderLeftColor: 'primary.main'
                                    }
                                },
                                '& .MuiTabs-indicator': { display: 'none' }
                            }}
                        >
                            <Tab label="Profile Architecture" icon={<UserIcon sx={{ mr: 2 }} />} iconPosition="start" />
                            <Tab label="Security & encryption" icon={<LockIcon sx={{ mr: 2 }} />} iconPosition="start" />
                            <Tab label="Social Ecosystem" icon={<SocialIcon sx={{ mr: 2 }} />} iconPosition="start" />
                        </Tabs>
                        
                        <Box sx={{ mt: 'auto', p: 4 }}>
                            <Paper sx={{ p: 2, borderRadius: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.4)' : 'rgba(241,245,249,1)', border: 'none' }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <SecurityIcon fontSize="inherit" /> SYSTEM LOCK
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4 }}>
                                    Your academic data is synchronized with the NEXTGEN EDUTECH directory. Changes are logged for governance.
                                </Typography>
                            </Paper>
                        </Box>
                    </Paper>
                </Grid>

                {/* Main Content Area */}
                <Grid item xs={12} md={8.5} sx={{ display: 'flex' }}>
                    <Paper
                        elevation={0}
                        sx={{
                            width: '100%', p: { xs: 4, md: 5 }, borderRadius: 5,
                            border: `1px solid ${theme.palette.divider}`,
                            height: '100%', flex: 1, display: 'flex', flexDirection: 'column'
                        }}
                    >
                        <TabPanel value={tabValue} index={0}>
                            <Typography variant="h5" fontWeight={900} sx={{ mb: 4, letterSpacing: -0.5 }}>Identity Configuration</Typography>
                            <form onSubmit={handleFormSubmit}>
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
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth multiline rows={4} label="Professional Bio / Academic Pitch" 
                                            value={formData.bio}
                                            onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                            placeholder="Introduce yourself to the university ecosystem..."
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={12}>
                                        <TextField
                                            fullWidth label="Display Image URL" value={formData.avatar_url}
                                            onChange={(e) => setFormData({...formData, avatar_url: e.target.value})}
                                            placeholder="Paste external image link here"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sx={{ mt: 2 }}>
                                        <Button 
                                            type="submit" variant="contained" size="large" 
                                            startIcon={<SaveIcon />} disabled={updateProfile.isPending}
                                            sx={{ py: 1.8, px: 5, borderRadius: 3, fontWeight: 800, fontSize: '1rem', textTransform: 'none', boxShadow: '0 10px 25px rgba(99,102,241,0.2)' }}
                                        >
                                            {updateProfile.isPending ? 'Synchronizing...' : 'Save Configuration'}
                                        </Button>
                                    </Grid>
                                </Grid>
                            </form>
                        </TabPanel>

                        <TabPanel value={tabValue} index={1}>
                            <Typography variant="h5" fontWeight={900} sx={{ mb: 1, letterSpacing: -0.5 }}>Security Protocol</Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>Manage your vault access and encryption credentials.</Typography>
                            <form onSubmit={handlePasswordSubmit}>
                                <Stack spacing={3.5} sx={{ maxWidth: 500 }}>
                                    <TextField
                                        fullWidth type="password" label="New Master Key"
                                        value={passwordData.password}
                                        onChange={(e) => setPasswordData({...passwordData, password: e.target.value})}
                                        required
                                    />
                                    <TextField
                                        fullWidth type="password" label="Re-verify Master Key"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                        required
                                    />
                                    <Box sx={{ pt: 2 }}>
                                        <Button 
                                            type="submit" variant="contained" color="warning"
                                            startIcon={<LockIcon />} disabled={updatePassword.isPending || !passwordData.password}
                                            sx={{ py: 1.8, px: 5, borderRadius: 3, fontWeight: 800, fontSize: '1rem', textTransform: 'none' }}
                                        >
                                            Update Vault Access
                                        </Button>
                                    </Box>
                                </Stack>
                            </form>
                        </TabPanel>

                        <TabPanel value={tabValue} index={2}>
                            <Typography variant="h5" fontWeight={900} sx={{ mb: 4, letterSpacing: -0.5 }}>Connectivity Matrix</Typography>
                            <Stack spacing={3.5} sx={{ maxWidth: 600 }}>
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
                                <Button 
                                    onClick={handleFormSubmit} variant="contained" 
                                    sx={{ mt: 3, py: 1.8, px: 5, borderRadius: 3, fontWeight: 800, fontSize: '1rem', textTransform: 'none' }}
                                >
                                    Map Social Nodes
                                </Button>
                            </Stack>
                        </TabPanel>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ProfileSettings;
