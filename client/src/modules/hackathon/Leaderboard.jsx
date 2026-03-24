// eslint-disable-next-line no-unused-vars
import React, { useEffect, useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
    Chip,
    // eslint-disable-next-line no-unused-vars
    Stack,
    // eslint-disable-next-line no-unused-vars
    IconButton
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
// eslint-disable-next-line no-unused-vars
import { Trophy, Medal, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

const RankIcon = ({ rank }) => {
    if (rank === 1) return <Trophy color="#fbbf24" size={24} fill="#fbbf24" />;
    if (rank === 2) return <Medal color="#94a3b8" size={24} fill="#94a3b8" />;
    if (rank === 3) return <Medal color="#b45309" size={24} fill="#b45309" />;
    return <Typography sx={{ fontWeight: 900, color: 'text.secondary', width: 24, textAlign: 'center' }}>{rank}</Typography>;
};

// eslint-disable-next-line no-unused-vars
const Leaderboard = ({ eventId, roundId, submissions }) => {
    const [liveSubmissions, setLiveSubmissions] = useState(submissions || []);
    const [prevSubmissions, setPrevSubmissions] = useState(submissions);

    if (submissions !== prevSubmissions) {
        setPrevSubmissions(submissions);
        setLiveSubmissions(submissions || []);
    }

    // Real-time subscription for score updates
    useEffect(() => {
        if (!eventId) return;

        const channel = supabase
            .channel('hackathon-leaderboard')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'hackathon_scores'
            }, async (payload) => {
                // When a score changes, we could re-fetch or update state
                // For simplicity in this demo, let's assume we fetch again if something changes
                // In a production app, we'd find the specific submission and update its total
                console.log('Real-time score update:', payload);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [eventId]);

    const getAvgScore = (sub) => {
        if (!sub.evaluations || sub.evaluations.length === 0) return 0;
        const sum = sub.evaluations.reduce((acc, ev) => acc + (ev.total_score || 0), 0);
        return sum / sub.evaluations.length;
    };

    const sortedTeams = useMemo(() => {
        return [...liveSubmissions].sort((a, b) => {
            return getAvgScore(b) - getAvgScore(a);
        });
    }, [liveSubmissions]);

    return (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Trophy size={32} color="#f59e0b" /> Live Leaderboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Updates automatically as judges submit scores
                    </Typography>
                </Box>
                <Chip label="Final Round" color="primary" sx={{ px: 2, fontWeight: 'bold' }} />
            </Box>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Rank</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Team</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Score</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody component={AnimatePresence} mode="popLayout">
                        {sortedTeams.map((sub, index) => (
                            <TableRow
                                key={sub.id}
                                component={motion.tr}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                            >
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <RankIcon rank={index + 1} />
                                        {index < 3 && index > 0 && <ChevronUp size={14} color="#10b981" />}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar sx={{ bgcolor: index === 0 ? '#6366f1' : '#f1f5f9', color: index === 0 ? 'white' : 'text.primary' }}>
                                            {(sub.team?.name || sub.team?.team_name || '?').charAt(0)}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                {sub.team?.name || sub.team?.team_name || 'Unknown Team'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {sub.team?.college_dept}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="h6" sx={{ fontWeight: 900, color: index === 0 ? '#6366f1' : 'text.primary' }}>
                                        {getAvgScore(sub).toFixed(2)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={sub.is_locked ? 'Finalized' : 'Judging'}
                                        size="small"
                                        color={sub.is_locked ? 'success' : 'warning'}
                                        variant="outlined"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {sortedTeams.length === 0 && (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                    <Typography color="text.secondary">No scores recorded yet for this round.</Typography>
                </Box>
            )}
        </Paper>
    );
};

export default Leaderboard;
