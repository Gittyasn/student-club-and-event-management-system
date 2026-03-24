import React from 'react';
import { Box, Typography, Paper, Switch, CircularProgress, Divider, List, ListItem, ListItemText, ListItemSecondaryAction, Alert } from '@mui/material';
import { useGlobalAIGovernance, useToggleAIFeature } from '../../hooks/useAIEngine';
import { AutoAwesome, HealthAndSafety } from '@mui/icons-material';
import { motion } from 'framer-motion';

const AIGovernance = () => {
    const { data: features, isLoading } = useGlobalAIGovernance();
    const { mutate: toggleFeature } = useToggleAIFeature();

    if (isLoading) return <Box display="flex" justifyContent="center" p={8}><CircularProgress /></Box>;
    if (!features) return null;

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', pb: 8 }}>
            <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <HealthAndSafety color="primary" fontSize="large" /> AI Governance Engine
                </Typography>
                <Typography color="text.secondary">
                    Globally enable or disable predictive pipelines. When disabled, AI UI elements will automatically disappear without breaking the application, protecting user data and API quota.
                </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 4, borderRadius: '12px' }}>
                All predictive algorithms are strictly configured to <strong>Assess and Assist</strong>. The AI will never auto-enforce destructive actions (e.g. dropping a student) on its own.
            </Alert>

            <Paper elevation={0} sx={{ borderRadius: '24px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <List disablePadding>
                    {features.map((feature, index) => (
                        <React.Fragment key={feature.feature_key}>
                            <ListItem sx={{ py: 3, px: 4 }}>
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle1" fontWeight={800} textTransform="capitalize" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {feature.feature_key.replace('_', ' ')}
                                            {feature.is_enabled && <AutoAwesome sx={{ fontSize: 16, color: '#8b5cf6' }} />}
                                        </Typography>
                                    }
                                    secondary={feature.description || 'System intelligence module.'}
                                    secondaryTypographyProps={{ sx: { mt: 0.5, fontWeight: 500 } }}
                                />
                                <ListItemSecondaryAction>
                                    <Switch
                                        edge="end"
                                        checked={Boolean(feature.is_enabled)}
                                        onChange={(e) => toggleFeature({ featureKey: feature.feature_key, isEnabled: e.target.checked })}
                                        color="secondary"
                                    />
                                </ListItemSecondaryAction>
                            </ListItem>
                            {index !== features.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </List>
            </Paper>
        </Box>
    );
};

export default AIGovernance;
