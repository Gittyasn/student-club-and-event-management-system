import {
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import {
    BusinessRounded,
    CallRounded,
    CloseRounded,
    EditRounded,
    MailOutlineRounded,
    SchoolRounded,
    VerifiedRounded,
} from '@mui/icons-material';

const roleLabelMap = {
    admin: 'Administrator',
    coordinator: 'Coordinator',
    student: 'Student',
};

const DetailRow = ({ icon, label, value }) => (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            borderRadius: '14px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            px: 1.75,
            py: 1.4,
            minHeight: 68,
        }}
    >
        <Box
            sx={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'action.hover',
                color: 'primary.main',
                flexShrink: 0,
            }}
        >
            {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.3 }}>
                {label}
            </Typography>
            <Typography
                variant="body2"
                sx={{
                    color: 'text.primary',
                    fontWeight: 700,
                    mt: 0.35,
                    wordBreak: 'break-word',
                }}
            >
                {value || 'Not added yet'}
            </Typography>
        </Box>
    </Box>
);

const ProfileQuickViewDialog = ({ open, onClose, profile, onEdit }) => {
    if (!profile) return null;

    const roleLabel = roleLabelMap[profile.role] || 'Member';
    const statusLabel = profile.account_status || 'active';
    const initials = profile.full_name?.trim()?.charAt(0)?.toUpperCase() || roleLabel.charAt(0);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '24px',
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundImage: 'none',
                    boxShadow: '0 24px 80px rgba(15,23,42,0.22)',
                },
            }}
        >
            <DialogContent sx={{ p: 0 }}>
                <Box
                    sx={{
                        px: 3,
                        pt: 2.5,
                        pb: 2,
                        background: (theme) =>
                            theme.palette.mode === 'dark'
                                ? 'linear-gradient(180deg, rgba(59,130,246,0.14) 0%, rgba(15,23,42,0.98) 100%)'
                                : 'linear-gradient(180deg, rgba(59,130,246,0.08) 0%, rgba(255,255,255,1) 100%)',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary' }}>
                            Profile
                        </Typography>
                        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
                            <CloseRounded fontSize="small" />
                        </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.25 }}>
                        <Avatar
                            src={profile.avatar_url || undefined}
                            sx={{
                                width: 78,
                                height: 78,
                                fontSize: '1.75rem',
                                fontWeight: 900,
                                bgcolor: 'primary.main',
                                color: '#fff',
                                border: '3px solid',
                                borderColor: 'background.paper',
                                boxShadow: '0 10px 24px rgba(59,130,246,0.24)',
                            }}
                        >
                            {initials}
                        </Avatar>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary', lineHeight: 1.2 }}>
                                {profile.full_name || 'User Profile'}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'text.secondary',
                                    mt: 0.6,
                                    wordBreak: 'break-word',
                                }}
                            >
                                {profile.email}
                            </Typography>

                            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
                                <Chip
                                    label={roleLabel}
                                    sx={{
                                        fontWeight: 800,
                                        borderRadius: '999px',
                                        bgcolor: 'primary.main',
                                        color: '#fff',
                                    }}
                                />
                                <Chip
                                    icon={<VerifiedRounded sx={{ color: 'inherit !important', fontSize: 16 }} />}
                                    label={statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
                                    variant="outlined"
                                    sx={{ fontWeight: 800, borderRadius: '999px' }}
                                />
                            </Stack>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ px: 3, pb: 2.5 }}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 1.5,
                            mt: 1,
                        }}
                    >
                        <DetailRow icon={<MailOutlineRounded fontSize="small" />} label="Email" value={profile.email} />
                        <DetailRow icon={<BusinessRounded fontSize="small" />} label="Department" value={profile.department} />
                        <DetailRow
                            icon={<SchoolRounded fontSize="small" />}
                            label={profile.role === 'student' ? 'Year of Study' : 'Role Access'}
                            value={profile.role === 'student' ? profile.year : roleLabel}
                        />
                        <DetailRow icon={<CallRounded fontSize="small" />} label="Phone" value={profile.phone} />
                    </Box>

                    {profile.bio ? (
                        <Box
                            sx={{
                                mt: 1.5,
                                borderRadius: '16px',
                                border: '1px solid',
                                borderColor: 'divider',
                                px: 2,
                                py: 1.75,
                                bgcolor: 'action.hover',
                            }}
                        >
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.3 }}>
                                BIO
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'text.primary',
                                    mt: 0.7,
                                    lineHeight: 1.65,
                                    maxHeight: 76,
                                    overflowY: 'auto',
                                }}
                            >
                                {profile.bio}
                            </Typography>
                        </Box>
                    ) : null}
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1.25 }}>
                <Button
                    onClick={onEdit}
                    variant="contained"
                    startIcon={<EditRounded />}
                    sx={{
                        flex: 1,
                        borderRadius: '14px',
                        py: 1.2,
                        fontWeight: 800,
                        textTransform: 'none',
                    }}
                >
                    Edit Profile
                </Button>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{
                        flex: 1,
                        borderRadius: '14px',
                        py: 1.2,
                        fontWeight: 800,
                        textTransform: 'none',
                    }}
                >
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ProfileQuickViewDialog;
