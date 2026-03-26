import { Box, Paper, Typography } from '@mui/material';

const RolePageHeader = ({ title, subtitle, meta, action, kicker = "Campus Portal" }) => {
    return (
        <Paper
            elevation={0}
            sx={{
                mb: 3,
                p: { xs: 2.5, md: 3 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                background: (theme) => theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(2,6,23,0.7) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,249,255,0.7) 100%)'
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
                <Box>
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 2, fontSize: '0.72rem' }}>
                        {kicker}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary', mb: 0.5, fontFamily: 'Space Grotesk, sans-serif', fontSize: { xs: '2rem', md: '2.5rem' }, lineHeight: 1.2 }}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '1rem', fontWeight: 500, marginTop: 0.75 }}>
                            {subtitle}
                        </Typography>
                    )}
                    {meta && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontSize: '0.85rem', fontWeight: 500 }}>
                            {meta}
                        </Typography>
                    )}
                </Box>
                {action && <Box>{action}</Box>}
            </Box>
        </Paper>
    );
};

export default RolePageHeader;
