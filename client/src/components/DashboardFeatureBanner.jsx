import { Box, Typography } from '@mui/material';

const DashboardFeatureBanner = ({
    kicker,
    title,
    subtitle,
    accent = '#10b981',
    action = null,
    sx = {},
}) => (
    <Box
        sx={{
            mb: 4,
            p: { xs: 3, md: 4 },
            borderRadius: '24px',
            border: '1px solid',
            borderColor: `${accent}33`,
            background: `linear-gradient(135deg, ${accent}14 0%, rgba(255,255,255,0.96) 18%, rgba(255,255,255,0.98) 100%)`,
            boxShadow: `0 18px 42px -28px ${accent}40`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2.5,
            position: 'relative',
            overflow: 'hidden',
            ...sx,
        }}
    >
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: `radial-gradient(circle at top right, ${accent}18 0%, transparent 35%)`,
            }}
        />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
            {kicker ? (
                <Typography
                    variant="overline"
                    sx={{ color: accent, fontWeight: 900, letterSpacing: 3 }}
                >
                    {kicker}
                </Typography>
            ) : null}
            <Typography
                variant="h4"
                fontWeight={900}
                sx={{ color: 'text.primary', letterSpacing: -1, mb: 0.6 }}
            >
                {title}
            </Typography>
            <Typography
                variant="body1"
                sx={{ color: 'text.secondary', fontWeight: 600, maxWidth: 760 }}
            >
                {subtitle}
            </Typography>
        </Box>
        {action ? (
            <Box sx={{ position: 'relative', zIndex: 1 }}>
                {action}
            </Box>
        ) : null}
    </Box>
);

export default DashboardFeatureBanner;
