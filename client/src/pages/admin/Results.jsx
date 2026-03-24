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
    Chip,
    CircularProgress,
    Avatar,
    Stack
} from '@mui/material';
import { EmojiEvents as TrophyIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';

const RANK_COLORS = { 1: 'gold', 2: 'silver', 3: '#cd7f32' };

const AdminResults = () => {
    const { data: results, isLoading, error } = useQuery({
        queryKey: ['adminResults'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('results')
                .select(`
                    id,
                    rank,
                    score,
                    remarks,
                    created_at,
                    event:events(id, title, club:clubs(name)),
                    team:teams(name),
                    user:profiles!results_user_id_fkey(full_name, email)
                `)
                .order('rank', { ascending: true });

            if (error) throw error;
            return data || [];
        }
    });

    if (isLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
    if (error) return <Typography color="error">Error loading results: {error.message}</Typography>;

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Global Results Monitoring
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Platform-wide view of all competition results across every club and event.
            </Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Rank</TableCell>
                            <TableCell>Participant / Team</TableCell>
                            <TableCell>Event</TableCell>
                            <TableCell>Club</TableCell>
                            <TableCell align="right">Score</TableCell>
                            <TableCell>Remarks</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {results.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <Stack direction="row" spacing={1} justifyContent="center" color="text.secondary">
                                        <TrophyIcon />
                                        <Typography>No results published yet.</Typography>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ) : (
                            results.map(result => (
                                <TableRow key={result.id} hover>
                                    <TableCell>
                                        <Box
                                            sx={{
                                                width: 32, height: 32,
                                                borderRadius: '50%',
                                                bgcolor: RANK_COLORS[result.rank] || 'grey.300',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 'bold', fontSize: 14
                                            }}
                                        >
                                            {result.rank}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                                                {(result.team?.name || result.user?.full_name || '?').charAt(0)}
                                            </Avatar>
                                            <Typography variant="body2">
                                                {result.team?.name || result.user?.full_name || 'Unknown'}
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{result.event?.title}</TableCell>
                                    <TableCell>{result.event?.club?.name}</TableCell>
                                    <TableCell align="right">
                                        <Chip label={result.score ?? 'N/A'} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="text.secondary">
                                            {result.remarks || '—'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default AdminResults;
