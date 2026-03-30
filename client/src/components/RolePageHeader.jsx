import { Box, Paper, Typography } from '@mui/material';

const RolePageHeader = ({ title, subtitle, meta, action, kicker = "Campus Portal", accent }) => {
    const resolvedAccent = accent || (
        typeof kicker === 'string' && kicker.toLowerCase().includes('coordinator')
            ? '#10b981'
            : undefined
    );
    const tintedBackground = resolvedAccent
        ? `linear-gradient(135deg, ${resolvedAccent}14 0%, rgba(255,255,255,0.96) 22%, rgba(255,255,255,0.98) 100%)`
        : null;

    return (
        <Paper
            elevation={0}
            sx={{
                mb: 3,
                p: { xs: 2.5, md: 3 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: resolvedAccent ? `${resolvedAccent}2a` : 'divider',
                background: (theme) => theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(2,6,23,0.7) 100%)'
                    : (tintedBackground || 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,249,255,0.7) 100%)'),
                position: 'relative',
                overflow: 'hidden',
                boxShadow: resolvedAccent ? `0 18px 42px -30px ${resolvedAccent}45` : undefined,
            }}
        >
            {resolvedAccent ? (
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        background: `radial-gradient(circle at top right, ${resolvedAccent}16 0%, transparent 38%)`,
                    }}
                />
            ) : null}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="overline" sx={{ color: resolvedAccent || 'text.secondary', fontWeight: 700, letterSpacing: 2, fontSize: '0.72rem' }}>
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
                {action && <Box sx={{ position: 'relative', zIndex: 1 }}>{action}</Box>}
            </Box>
        </Paper>
    );
};

export default RolePageHeader;
