// eslint-disable-next-line no-unused-vars
import React from 'react';
import {
    // eslint-disable-next-line no-unused-vars
    Box, Typography, Grid, Paper, Card, CardContent,
    // eslint-disable-next-line no-unused-vars
    CircularProgress, LinearProgress, Stack, Chip, Avatar
} from '@mui/material';
import {
    Event, FactCheck, Groups, WorkspacePremium,
    // eslint-disable-next-line no-unused-vars
    TrendingUp, EmojiEvents, RateReview, Bolt
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, PieChart, Pie, Cell
} from 'recharts';
import { useStudentAnalytics } from '../../hooks/useAnalytics';
import { useAuthStore } from '../../store/authStore';

const LEVEL_CONFIG = {
    'Campus Leader': { color: '#fbbf24', bg: 'linear-gradient(135deg, #92400e, #fbbf24)', emoji: '👑', next: 300 },
    'Highly Active': { color: '#10b981', bg: 'linear-gradient(135deg, #065f46, #34d399)', emoji: '🔥', next: 200 },
    'Active': { color: '#3b82f6', bg: 'linear-gradient(135deg, #1e3a5f, #60a5fa)', emoji: '⚡', next: 100 },
    'Beginner': { color: '#94a3b8', bg: 'linear-gradient(135deg, #1e293b, #64748b)', emoji: '🌱', next: 40 },
};

const StatPill = ({ label, value, color, icon }) => (
    <Box sx={{ p: 2, borderRadius: '14px', bgcolor: `${color}10`, border: `1px solid ${color}25`, textAlign: 'center' }}>
        <Box sx={{ color, display: 'flex', justifyContent: 'center', mb: 0.5 }}>{icon}</Box>
        <Typography variant="h5" fontWeight={900} sx={{ color }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
    </Box>
);

const StudentAnalytics = () => {
    // eslint-disable-next-line no-unused-vars
    const { user, profile } = useAuthStore();
    const { data, isLoading } = useStudentAnalytics();

    if (isLoading) return <Box display="flex" justifyContent="center" p={8}><CircularProgress /></Box>;
    if (!data) return null;

    const d = data;
    const lvl = LEVEL_CONFIG[d.engLevel] || LEVEL_CONFIG['Beginner'];

    return (
        <Box sx={{ pb: 8 }}>
            {/* Hero with engagement badge */}
            <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                sx={{ mb: 5, p: { xs: 3, md: 4 }, borderRadius: '28px', background: lvl.bg, color: 'white', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                        <Avatar src={profile?.avatar_url}
                            sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)', fontSize: '1.5rem' }}>
                            {profile?.full_name?.charAt(0)}
                        </Avatar>
                        <Box>
                            <Typography variant="h5" fontWeight={900}>{profile?.full_name || 'Student'}</Typography>
                            <Chip label={`${lvl.emoji} ${d.engLevel}`}
                                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 900, fontSize: '0.78rem', height: 24 }} />
                        </Box>
                    </Box>
                    <Typography sx={{ opacity: 0.75, mt: 1 }}>Your campus engagement analytics and achievement journey.</Typography>
                </Box>
            </Box>

            {/* Engagement Score Card */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: `2px solid ${lvl.color}40`, textAlign: 'center', height: '100%' }}>
                        <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                            <Bolt sx={{ color: lvl.color }} /> Engagement Score
                        </Typography>
                        {/* Radial gauge */}
                        <Box sx={{ height: 140, position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart cx="50%" cy="80%" innerRadius="65%" outerRadius="90%" startAngle={180} endAngle={0} data={[{ value: d.engPct }]}>
                                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                    <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" angleAxisId={0} fill={lvl.color} cornerRadius={10} />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <Box sx={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                                <Typography variant="h4" fontWeight={900} sx={{ color: lvl.color }}>{d.engScore}</Typography>
                                <Typography variant="caption" color="text.secondary">pts</Typography>
                            </Box>
                        </Box>
                        <LinearProgress variant="determinate" value={d.engPct}
                            sx={{ mt: 1.5, height: 8, borderRadius: '6px', bgcolor: `${lvl.color}20`, '& .MuiLinearProgress-bar': { bgcolor: lvl.color } }} />
                        <Typography variant="caption" color="text.secondary" mt={1} display="block">
                            {d.engPct < 100 ? `${100 - d.engPct}% to next level` : '🎓 Max Level!'}
                        </Typography>

                        {/* Score formula breakdown */}
                        <Box sx={{ mt: 2.5, textAlign: 'left' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={800} textTransform="uppercase">Score Breakdown</Typography>
                            {[
                                { label: 'Events Attended', pts: d.attended * 10, icon: '📅' },
                                { label: 'Club Memberships', pts: d.clubsJoined * 5, icon: '👥' },
                                { label: 'Certificates', pts: d.totalCerts * 8, icon: '🎓' },
                                { label: 'Feedback Given', pts: d.feedbackCount * 2, icon: '⭐' },
                            ].map(row => (
                                <Box key={row.label} display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
                                    <Typography variant="caption">{row.icon} {row.label}</Typography>
                                    <Chip label={`+${row.pts}`} size="small" sx={{ fontWeight: 800, fontSize: '0.65rem', bgcolor: `${lvl.color}15`, color: lvl.color }} />
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>

                {/* Activity stats grid */}
                <Grid item xs={12} md={8}>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        {[
                            { label: 'Registered', value: d.totalReg, color: '#6366f1', icon: <Event /> },
                            { label: 'Attended', value: d.attended, color: '#10b981', icon: <FactCheck /> },
                            { label: 'Att. Rate', value: `${d.attRate}%`, color: '#f59e0b', icon: <TrendingUp /> },
                            { label: 'Clubs', value: d.clubsJoined, color: '#8b5cf6', icon: <Groups /> },
                            { label: 'Certificates', value: d.totalCerts, color: '#ec4899', icon: <WorkspacePremium /> },
                            { label: 'Feedbacks', value: d.feedbackCount, color: '#06b6d4', icon: <RateReview /> },
                        ].map(s => (
                            <Grid item xs={6} sm={4} key={s.label}>
                                <StatPill {...s} />
                            </Grid>
                        ))}
                    </Grid>
                    {/* Engagement levels legend */}
                    <Paper sx={{ p: 2.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase" mb={1.5} display="block">Level Thresholds</Typography>
                        {[
                            { level: 'Beginner', range: '0–39 pts', color: '#94a3b8' },
                            { level: 'Active', range: '40–99 pts', color: '#3b82f6' },
                            { level: 'Highly Active', range: '100–199 pts', color: '#10b981' },
                            { level: 'Campus Leader', range: '200+ pts', color: '#fbbf24' },
                        ].map(l => (
                            <Box key={l.level} display="flex" alignItems="center" justifyContent="space-between" py={0.6}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: l.color }} />
                                    <Typography variant="body2" fontWeight={700}>{l.level}</Typography>
                                </Box>
                                <Chip label={l.range} size="small" sx={{ bgcolor: `${l.color}15`, color: l.color, fontWeight: 700, fontSize: '0.65rem' }} />
                                {d.engLevel === l.level && <Chip label="You" size="small" color="primary" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />}
                            </Box>
                        ))}
                    </Paper>
                </Grid>
            </Grid>

            {/* Activity Trend */}
            <Typography variant="h6" fontWeight={900} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                📈 Your Activity Trend (Last 6 Months)
            </Typography>
            <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', mb: 4 }}>
                <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={d.activityTrend} margin={{ left: -10 }}>
                        <defs>
                            {['Registrations', 'Attended', 'Certs'].map((k, i) => (
                                <linearGradient key={k} id={`sg${k}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={['#6366f1', '#10b981', '#ec4899'][i]} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={['#6366f1', '#10b981', '#ec4899'][i]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Legend iconSize={10} />
                        <Area type="monotone" dataKey="Registrations" stroke="#6366f1" fill="url(#sgRegistrations)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="Attended" stroke="#10b981" fill="url(#sgAttended)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="Certs" stroke="#ec4899" fill="url(#sgCerts)" strokeWidth={1.5} dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </Paper>

            {/* Certificate breakdown */}
            {d.certTypes.length > 0 && (
                <>
                    <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>🎓 Certificate Breakdown</Typography>
                    <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={d.certTypes} cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={4} dataKey="value">
                                    {d.certTypes.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend iconSize={10} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </>
            )}
        </Box>
    );
};

export default StudentAnalytics;
