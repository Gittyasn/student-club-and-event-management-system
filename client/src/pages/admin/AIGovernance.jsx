import {
    Alert,
    Box,
    Chip,
    Paper,
    Stack,
    Switch,
    Typography,
} from '@mui/material';
import {
    AutoAwesome,
    HealthAndSafety,
    Insights,
    Policy,
    Psychology,
} from '@mui/icons-material';
import { useGlobalAIGovernance, useToggleAIFeature } from '../../hooks/useGuideEngine';
import LoadingDots from '../../components/LoadingDots';
import RolePageHeader from '../../components/RolePageHeader';

const FEATURE_ICONS = {
    event_recommendations: <AutoAwesome />,
    club_recommendations: <AutoAwesome />,
    dropout_detection: <Insights />,
    engagement_prediction: <AutoAwesome />,
    sentiment_analysis: <Psychology />,
};

const AIGovernance = () => {
    const { data: governanceState, isLoading } = useGlobalAIGovernance();
    const { mutate: toggleFeature } = useToggleAIFeature();
    const features = governanceState?.features || [];

    if (isLoading) {
        return <LoadingDots minHeight="50vh" label="Loading governance controls..." />;
    }

    if (!features?.length) {
        return (
            <Alert severity="info" sx={{ borderRadius: '16px' }}>
                No governance features are available yet.
            </Alert>
        );
    }

    return (
        <Box sx={{ pb: 8 }}>
            <RolePageHeader
                kicker="AI Settings"
                title="AI Feature Controls"
                subtitle="Manage which recommendation and reporting features are active across dashboards and student guidance."
                accent="#2563eb"
                action={
                    <Box
                        sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '18px',
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: 'rgba(37,99,235,0.12)',
                            color: 'primary.main',
                            border: '1px solid rgba(37,99,235,0.18)'
                        }}
                    >
                        <HealthAndSafety fontSize="large" />
                    </Box>
                }
            />

            {governanceState?.isFallback ? (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: '18px', '& .MuiAlert-message': { fontWeight: 600 } }}>
                    Live AI governance tables were not available, so the page is showing safe built-in defaults. Apply the AI alignment SQL patch to enable database-backed controls.
                </Alert>
            ) : null}

            <Alert
                severity="info"
                icon={<Policy fontSize="inherit" />}
                sx={{ mb: 4, borderRadius: '18px', '& .MuiAlert-message': { fontWeight: 600 } }}
            >
                These features provide suggestions and summaries only. They do not automatically modify student records or execute destructive actions.
            </Alert>

            <Stack spacing={2.5}>
                {features.map((feature) => {
                    const enabled = Boolean(feature.is_enabled);
                    const icon = FEATURE_ICONS[feature.feature_key] || <AutoAwesome />;

                    return (
                        <Paper
                            key={feature.feature_key}
                            sx={{
                                p: 3,
                                borderRadius: '20px',
                                border: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 2,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1, minWidth: 260 }}>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '14px',
                                        display: 'grid',
                                        placeItems: 'center',
                                        bgcolor: enabled ? 'primary.main' : 'action.hover',
                                        color: enabled ? '#fff' : 'text.secondary',
                                        flexShrink: 0,
                                    }}
                                >
                                    {icon}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                                        <Typography variant="h6" fontWeight={800} sx={{ textTransform: 'capitalize' }}>
                                            {feature.feature_key.replaceAll('_', ' ')}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={enabled ? 'Enabled' : 'Paused'}
                                            color={enabled ? 'success' : 'default'}
                                            variant={enabled ? 'filled' : 'outlined'}
                                            sx={{ fontWeight: 700 }}
                                        />
                                    </Box>
                                    <Typography color="text.secondary" fontWeight={500}>
                                        {feature.description || 'Operational assistance module.'}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
                                <Typography variant="body2" fontWeight={700} color={enabled ? 'success.main' : 'text.secondary'}>
                                    {enabled ? 'Live' : 'Disabled'}
                                </Typography>
                                <Switch
                                    checked={enabled}
                                    onChange={(event) =>
                                        toggleFeature({
                                            featureKey: feature.feature_key,
                                            isEnabled: event.target.checked,
                                        })
                                    }
                                    color="primary"
                                />
                            </Box>
                        </Paper>
                    );
                })}
            </Stack>
        </Box>
    );
};

export default AIGovernance;
