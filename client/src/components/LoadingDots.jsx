import { Box, Typography } from '@mui/material';

const dotStyle = (delay, size, color) => ({
    width: size,
    height: size,
    borderRadius: '999px',
    backgroundColor: color,
    opacity: 0.28,
    animation: 'loadingDotsPulse 1.2s ease-in-out infinite',
    animationDelay: delay,
});

const LoadingDots = ({
    label = 'Loading...',
    minHeight = '40vh',
    size = 10,
    color = 'var(--mui-palette-primary-main, #2563eb)',
    inline = false,
    gap = 1.5,
}) => (
    <Box
        sx={{
            minHeight: inline ? 'auto' : minHeight,
            width: inline ? 'auto' : '100%',
            display: 'flex',
            flexDirection: inline ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap,
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={dotStyle('0ms', size, color)} />
            <Box sx={dotStyle('120ms', size, color)} />
            <Box sx={dotStyle('240ms', size, color)} />
            <Box sx={dotStyle('360ms', size, color)} />
        </Box>
        {!inline && label ? (
            <Typography variant="body2" color="text.secondary" fontWeight={700}>
                {label}
            </Typography>
        ) : null}
    </Box>
);

export default LoadingDots;
