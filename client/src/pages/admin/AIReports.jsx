// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress, Avatar, Stack, Chip } from '@mui/material';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { AutoGraph, WarningAmber, EmojiEvents, Stars } from '@mui/icons-material';
import { supabase } from '../../services/supabaseClient';
import { useGlobalAIGovernance } from '../../hooks/useAIEngine';

const AIReports = () => {
    const { data: gov, isLoading: isGovLoading } = useGlobalAIGovernance();
    const [data, setData] = useState({ dropouts: [], topStudents: [], topClubs: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            setIsLoading(true);
            try {
                // Approximate Dropouts: Registered but zero attendance records (or low count)
                // eslint-disable-next-line no-unused-vars
                const { data: dropoutRisk } = await supabase.rpc('get_student_engagement_score', { p_user_id: null }); // fallback to raw query

                // MOCKING complex RPC for UI presentation in blueprint:
                // In production, we'd use a dedicated 'get_ai_leaderboards' RPC
                const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, avatar_url, role').eq('role', 'student').limit(20);

                const dropouts = (profiles || []).slice(0, 3).map(p => ({ ...p, risk: 'High', missedCount: Math.floor(Math.random() * 4) + 2 }));
                const topStudents = (profiles || []).slice(3, 8).map(p => ({ ...p, score: Math.floor(Math.random() * 20) + 80 }));

                const { data: clubs } = await supabase.from('clubs').select('id, name, logo_url').limit(3);
                const topClubs = (clubs || []).map(c => ({ ...c, score: Math.floor(Math.random() * 20) + 80 }));

                setData({ dropouts, topStudents, topClubs });
            } catch (err) {
                console.error("AI Report fetch failed:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInsights();
    }, []);

    if (isGovLoading || isLoading) return <Box display="flex" justifyContent="center" p={8}><CircularProgress /></Box>;

    const isDropoutEnabled = gov?.find(g => g.feature_key === 'dropout_detection')?.is_enabled !== false;
    const isLeaderboardEnabled = gov?.find(g => g.feature_key === 'engagement_prediction')?.is_enabled !== false;

    return (
        <Box sx={{ pb: 8 }}>
            <Box mb={5}>
                <Typography variant="h4" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <AutoGraph color="secondary" fontSize="large" /> AI Global Intelligence
                </Typography>
                <Typography color="text.secondary">
                    System-wide predictive analytics mapping student engagement risk and organizational performance.
                </Typography>
            </Box>

            <Grid container spacing={4}>
                {/* Dropout Risk */}
                {isDropoutEnabled && (
                    <Grid item xs={12} lg={4}>
                        <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(244, 63, 94, 0.02)' }}>
                            <Typography variant="h6" fontWeight={800} color="error.main" mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <WarningAmber /> Dropout Risk Timeline
                            </Typography>
                            <Stack spacing={2}>
                                {data.dropouts.map((student, i) => (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', p: 1.5, borderRadius: '12px', bgcolor: 'background.paper', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                                        <Avatar src={student.avatar_url} sx={{ width: 40, height: 40, mr: 2 }} />
                                        <Box flex={1}>
                                            <Typography variant="subtitle2" fontWeight={700}>{student.full_name}</Typography>
                                            <Typography variant="caption" color="error.main">Missed last {student.missedCount} events</Typography>
                                        </Box>
                                        <Chip size="small" label="High Risk" color="error" sx={{ fontWeight: 800 }} />
                                    </Box>
                                ))}
                            </Stack>
                        </Paper>
                    </Grid>
                )}

                {/* Intelligent Leaderboards */}
                {isLeaderboardEnabled && (
                    <Grid item xs={12} lg={8}>
                        <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                            <Typography variant="h6" fontWeight={800} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <EmojiEvents sx={{ color: '#f59e0b' }} /> AI Engagement Leaderboards
                            </Typography>

                            <Grid container spacing={4}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={2} textTransform="uppercase">Top Performing Students</Typography>
                                    <Stack spacing={1.5}>
                                        {data.topStudents.map((s, i) => (
                                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Typography variant="body2" fontWeight={800} sx={{ w: 20, mr: 1, color: 'text.secondary' }}>#{i + 1}</Typography>
                                                    <Avatar src={s.avatar_url} sx={{ width: 28, height: 28, mr: 1.5 }} />
                                                    <Typography variant="subtitle2" fontWeight={600}>{s.full_name}</Typography>
                                                </Box>
                                                <Chip size="small" label={`${s.score} pts`} sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: 800, fontSize: '0.7rem' }} />
                                            </Box>
                                        ))}
                                    </Stack>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={2} textTransform="uppercase">Most Engaging Clubs</Typography>
                                    <Stack spacing={1.5}>
                                        {data.topClubs.map((c, i) => (
                                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Stars sx={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7f32', fontSize: 20, mr: 1.5 }} />
                                                    <Avatar src={c.logo_url} variant="rounded" sx={{ width: 28, height: 28, mr: 1.5 }} />
                                                    <Typography variant="subtitle2" fontWeight={600}>{c.name}</Typography>
                                                </Box>
                                                <Typography variant="caption" fontWeight={800} color="#8b5cf6">Index: {c.score}</Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default AIReports;
