import { Box, Paper, Typography, useTheme } from '@mui/material';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts';

const Panel = ({ title, subtitle, children }) => {
    const theme = useTheme();

    return (
        <Paper
            elevation={0}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                flex: 1,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2.5,
                overflow: 'hidden',
                minHeight: 400
            }}
        >
            <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '1rem' }}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
            <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {children}
            </Box>
        </Paper>
    );
};

const CustomTooltip = ({ active, payload, label }) => {
    const theme = useTheme();
    if (!active || !payload?.length) return null;

    return (
        <Paper sx={{ p: 1.5, border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[3] }}>
            {label && <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', display: 'block', mb: 0.5 }}>{label}</Typography>}
            {payload.map((point, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: point.color || point.fill || theme.palette.primary.main }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        {point.name}: {point.value}
                    </Typography>
                </Box>
            ))}
        </Paper>
    );
};

const StudentDashboardActivityChart = ({ data }) => {
    const theme = useTheme();

    return (
        <Panel title="Activity Distribution" subtitle="Your engagement across categories">
            <Box sx={{ height: 200, width: '100%', mt: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data?.radarData || []}>
                        <PolarGrid stroke={theme.palette.divider} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 500 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 'dataMax + 2']} tick={false} axisLine={false} />
                        <Radar name="Activity" dataKey="A" stroke={theme.palette.primary.main} strokeWidth={2} fill={theme.palette.primary.main} fillOpacity={0.2} />
                        <RechartsTooltip content={<CustomTooltip />} />
                    </RadarChart>
                </ResponsiveContainer>
            </Box>
        </Panel>
    );
};

export default StudentDashboardActivityChart;
