// eslint-disable-next-line no-unused-vars
import React, { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, Paper, Grid, TextField, MenuItem,
    CircularProgress, Divider, IconButton, Card, CardContent,
    Stack, Chip, Avatar, Tabs, Tab, Alert, Select, FormControl,
    // eslint-disable-next-line no-unused-vars
    InputLabel, Tooltip, Dialog, DialogTitle, DialogContent,
    // eslint-disable-next-line no-unused-vars
    DialogActions, LinearProgress
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowBack as BackIcon, Publish as PublishIcon, Lock as LockIcon,
    Add as AddIcon, Delete as DeleteIcon, EmojiEvents as TrophyIcon,
    CloudUpload, Download as DownloadIcon, Calculate, People,
    Assessment, History, AutoAwesome
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useEventById } from '../../hooks/useEventById';
import { useEventRegistrations } from '../../hooks/useAttendance';
import { useEventTeams } from '../../hooks/useTeams';
import {
    useEventResults, useSaveResults, usePublishResults,
    useLockResults, useRecalculateRanks, parseResultsCSV, useResultLogs, useEventJudges
} from '../../hooks/useResults';
import RolePageHeader from '../../components/RolePageHeader';
import { toast } from 'sonner';
import {
    BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTip, Cell
} from 'recharts';

const RANK_COLORS = { 1: '#fbbf24', 2: '#94a3b8', 3: '#cd7c2f' };
const PRIZE_PRESETS = ['🥇 Gold', '🥈 Silver', '🥉 Bronze', '🏆 Winner', '🎖 Runner-Up', '👑 Champion', '⭐ Best Project'];
const GRADES = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'];

const RankBadge = ({ rank }) => (
    <Box sx={{
        width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: '0.85rem', flexShrink: 0,
        background: RANK_COLORS[rank] ? `${RANK_COLORS[rank]}25` : 'rgba(148,163,184,0.15)',
        color: RANK_COLORS[rank] || '#94a3b8',
        border: `2px solid ${RANK_COLORS[rank] || '#94a3b8'}40`
    }}>
        #{rank}
    </Box>
);

// ─── Result Entry Card (Rank-Based) ──────────────────────────────────────────
const RankEntryCard = ({ entry, index, candidates, onChange, onRemove, isLocked }) => (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}>
        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', mb: 2, display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <RankBadge rank={entry.rank} />
            <Grid container spacing={2} sx={{ flex: 1 }}>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth size="small" variant="filled">
                        <InputLabel>Candidate</InputLabel>
                        <Select value={entry.user_id || ''} onChange={e => onChange(index, 'user_id', e.target.value)} disabled={isLocked}>
                            {candidates.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                    <FormControl fullWidth size="small" variant="filled">
                        <InputLabel>Prize</InputLabel>
                        <Select value={entry.prize_title || ''} onChange={e => onChange(index, 'prize_title', e.target.value)} disabled={isLocked}>
                            {PRIZE_PRESETS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                    <TextField fullWidth size="small" label="Cash Prize (₹)" type="number" variant="filled"
                        value={entry.cash_prize || ''} onChange={e => onChange(index, 'cash_prize', e.target.value)} disabled={isLocked} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField fullWidth size="small" label="Remarks" variant="filled"
                        value={entry.remarks || ''} onChange={e => onChange(index, 'remarks', e.target.value)} disabled={isLocked} />
                </Grid>
                <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Tooltip title="Mark as Winner">
                        <IconButton size="small" onClick={() => onChange(index, 'is_winner', !entry.is_winner)}
                            sx={{ color: entry.is_winner ? '#fbbf24' : 'text.disabled' }}>
                            <TrophyIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    {!isLocked && <IconButton size="small" color="error" onClick={() => onRemove(index)}><DeleteIcon fontSize="small" /></IconButton>}
                </Grid>
            </Grid>
        </Paper>
    </motion.div>
);

// ─── Score Entry Row ──────────────────────────────────────────────────────────
const ScoreGrid = ({ candidates, entries, onChange, isLocked }) => {
    const columns = [
        { field: 'name', headerName: 'Student', flex: 1.5, valueGetter: (_, row) => row.name },
        { field: 'dept', headerName: 'Dept', flex: 1, valueGetter: (_, row) => row.dept },
        {
            field: 'score', headerName: 'Score', width: 120,
            renderCell: (p) => (
                <TextField size="small" type="number" value={p.row.score || ''} disabled={isLocked}
                    onChange={e => onChange(p.row.user_id, 'score', e.target.value)}
                    inputProps={{ style: { padding: '4px 8px', fontWeight: 700 } }} />
            )
        },
        {
            field: 'max_score', headerName: 'Max Score', width: 120,
            renderCell: (p) => (
                <TextField size="small" type="number" value={p.row.max_score || ''} disabled={isLocked}
                    onChange={e => onChange(p.row.user_id, 'max_score', e.target.value)}
                    inputProps={{ style: { padding: '4px 8px' } }} />
            )
        },
        {
            field: 'grade', headerName: 'Grade', width: 90,
            renderCell: (p) => (
                <Select size="small" value={p.row.grade || ''} onChange={e => onChange(p.row.user_id, 'grade', e.target.value)}
                    disabled={isLocked} sx={{ minWidth: 70 }}>
                    {GRADES.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </Select>
            )
        },
        {
            field: 'pct', headerName: 'Pct', width: 80,
            valueGetter: (_, row) => {
                if (row.score && row.max_score) return `${Math.round((row.score / row.max_score) * 100)}%`;
                return '-';
            }
        }
    ];

    return (
        <DataGrid
            rows={candidates.map(c => {
                const entry = entries.find(e => e.user_id === c.id) || {};
                return { id: c.id, user_id: c.id, name: c.name, dept: c.dept, score: entry.score, max_score: entry.max_score, grade: entry.grade };
            })}
            columns={columns}
            autoHeight
            disableRowSelectionOnClick
            sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', fontWeight: 800 } }}
        />
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const PublishResults = () => {
    const { id: eventId } = useParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState(0);
    const [resultType, setResultType] = useState('rank');
    const [rankEntries, setRankEntries] = useState([
        { rank: 1, user_id: '', prize_title: '🥇 Gold', remarks: '', cash_prize: '', is_winner: true, result_type: 'rank' }
    ]);
    const [scoreMap, setScoreMap] = useState({});
    const [csvFile, setCsvFile] = useState(null);
    const fileRef = useRef();

    const { data: event } = useEventById(eventId);
    const { data: registrations = [] } = useEventRegistrations(eventId);
    const { data: teams = [] } = useEventTeams(eventId);
    const { data: results = [], isLoading } = useEventResults(eventId);
    // eslint-disable-next-line no-unused-vars
    const { data: judges = [] } = useEventJudges(eventId);
    const { data: logs = [] } = useResultLogs(eventId);

    const { mutate: saveDraft, isPending: saving } = useSaveResults(eventId);
    const { mutate: publish, isPending: publishing } = usePublishResults(eventId);
    const { mutate: lock, isPending: locking } = useLockResults(eventId);
    const { mutate: recalculate, isPending: recalculating } = useRecalculateRanks(eventId);

    const isLocked = event?.results_locked;
    const isPublished = event?.results_published;

    // Build candidate list (attendees only)
    const attendees = useMemo(() => {
        return registrations
            .filter(r => ['present', 'late'].includes(r.attendance?.status) || r.attendance !== null)
            .map(r => ({
                id: r.user_id,
                name: r.profiles?.full_name || 'Unknown',
                dept: r.profiles?.department || '',
                email: r.profiles?.email
            }));
    }, [registrations]);

    const isHackathon = event?.event_type === 'hackathon';
    const candidates = isHackathon
        ? teams.map(t => ({ id: t.id, name: t.team_name, dept: '' }))
        : attendees;

    // Score distribution chart data from existing results
    const chartData = useMemo(() => {
        if (!results.length) return [];
        const scored = results.filter(r => r.score !== null).sort((a, b) => (b.score || 0) - (a.score || 0));
        return scored.slice(0, 10).map(r => ({
            name: r.student?.full_name?.split(' ')[0] || 'N/A',
            score: r.score,
            pct: r.max_score ? Math.round((r.score / r.max_score) * 100) : Math.round(r.score)
        }));
    }, [results]);

    const handleRankChange = (index, field, value) => {
        const updated = [...rankEntries];
        updated[index] = { ...updated[index], [field]: value };
        setRankEntries(updated);
    };

    const handleAddRank = () => {
        setRankEntries([...rankEntries, { rank: rankEntries.length + 1, user_id: '', prize_title: '', remarks: '', cash_prize: '', is_winner: false, result_type: 'rank' }]);
    };

    const handleScoreChange = (userId, field, value) => {
        setScoreMap(prev => ({ ...prev, [userId]: { ...(prev[userId] || {}), [field]: value } }));
    };

    const buildPayload = () => {
        if (resultType === 'rank') {
            return rankEntries.map(e => ({ ...e, result_type: 'rank' }));
        } else if (resultType === 'score') {
            return candidates.map(c => ({
                user_id: c.id,
                result_type: 'score',
                score: scoreMap[c.id]?.score || null,
                max_score: scoreMap[c.id]?.max_score || null,
                grade: scoreMap[c.id]?.grade || null,
            }));
        } else {
            return candidates.map(c => ({ user_id: c.id, result_type: 'participation', is_winner: false }));
        }
    };

    const handleCSVImport = async () => {
        if (!csvFile) return;
        const { results: parsed, errors } = await parseResultsCSV(csvFile, eventId);
        if (errors.length > 0) toast.error(`${errors.length} rows failed. Check console.`);
        if (parsed.length > 0) {
            saveDraft(parsed);
            setCsvFile(null);
        }
    };

    if (isLoading) return <Box display="flex" justifyContent="center" p={8}><CircularProgress /></Box>;

    return (
        <Box sx={{ pb: 6 }}>
            <RolePageHeader
                kicker="Coordinator Suite"
                title="Publish Results"
                subtitle="Finalize scores and announce winners."
            />
            {/* Header */}
            <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                sx={{
                    mb: 4, p: { xs: 3, md: 4 }, borderRadius: '24px',
                    background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', color: 'white', position: 'relative', overflow: 'hidden'
                }}>
                <Box sx={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)', top: -80, right: -80 }} />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Button startIcon={<BackIcon />} onClick={() => navigate(-1)}
                        sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, mb: 1, pl: 0 }}>Back</Button>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                        <Box>
                            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>Results & Rankings</Typography>
                            <Typography sx={{ opacity: 0.7 }}>{event?.title}</Typography>
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                            {!isLocked && !isPublished && (
                                <>
                                    <Button variant="outlined" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}
                                        onClick={() => saveDraft(buildPayload())} disabled={saving}
                                        sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white', fontWeight: 700, borderRadius: '10px' }}>
                                        Save Draft
                                    </Button>
                                    <Button variant="contained" startIcon={publishing ? <CircularProgress size={16} color="inherit" /> : <PublishIcon />}
                                        onClick={() => { if (window.confirm('Publish results? Students will be notified.')) publish(buildPayload()); }}
                                        disabled={publishing || candidates.length === 0}
                                        sx={{ bgcolor: '#10b981', fontWeight: 800, borderRadius: '10px', '&:hover': { bgcolor: '#059669' } }}>
                                        Publish Results
                                    </Button>
                                </>
                            )}
                            {isPublished && !isLocked && (
                                <Button variant="contained" startIcon={locking ? <CircularProgress size={16} color="inherit" /> : <LockIcon />}
                                    onClick={() => { if (window.confirm('Lock results? Certificates will be finalized.')) lock(); }}
                                    disabled={locking}
                                    sx={{ bgcolor: '#ef4444', fontWeight: 800, borderRadius: '10px' }}>
                                    Lock Results
                                </Button>
                            )}
                            {isLocked && <Chip icon={<LockIcon />} label="Results Locked" color="error" sx={{ fontWeight: 800 }} />}
                            {isPublished && !isLocked && <Chip icon={<PublishIcon />} label="Published" color="success" sx={{ fontWeight: 800 }} />}
                        </Stack>
                    </Box>
                </Box>
            </Box>

            {!event?.attendance_locked && !isLocked && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px', fontWeight: 700 }}>
                    Attendance is not yet locked. Lock attendance before publishing results for accurate eligibility.
                </Alert>
            )}
            {isLocked && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontWeight: 700 }} icon={<LockIcon />}>
                    Results are locked. Contact Admin to make changes.
                </Alert>
            )}

            {/* Tabs */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 800 } }}>
                <Tab label="Enter Results" icon={<TrophyIcon fontSize="small" />} iconPosition="start" />
                <Tab label="Score Distribution" icon={<Assessment fontSize="small" />} iconPosition="start" />
                <Tab label="CSV Import" icon={<CloudUpload fontSize="small" />} iconPosition="start" />
                <Tab label="Audit Log" icon={<History fontSize="small" />} iconPosition="start" />
            </Tabs>

            {/* Tab 0: Enter Results */}
            {tab === 0 && (
                <Box>
                    {/* Result Type Selector */}
                    <Paper sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle1" fontWeight={800} mb={2}>Result Model</Typography>
                        <Stack direction="row" spacing={2}>
                            {[
                                { value: 'rank', label: 'Rank-Based', desc: 'Hackathons, sports, competitions', icon: '🏆' },
                                { value: 'score', label: 'Score-Based', desc: 'Quizzes, workshops, assessments', icon: '📊' },
                                { value: 'participation', label: 'Participation Only', desc: 'Seminars, cultural events', icon: '🎫' },
                            ].map(type => (
                                <Card key={type.value} onClick={() => !isLocked && setResultType(type.value)}
                                    sx={{
                                        flex: 1, cursor: isLocked ? 'default' : 'pointer', borderRadius: '14px',
                                        border: `2px solid ${resultType === type.value ? '#6366f1' : 'transparent'}`,
                                        bgcolor: resultType === type.value ? '#6366f115' : 'background.paper',
                                        transition: 'all 0.2s', '&:hover': { borderColor: isLocked ? 'transparent' : '#6366f160' }
                                    }}>
                                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                        <Typography fontSize="1.8rem" mb={0.5}>{type.icon}</Typography>
                                        <Typography fontWeight={800} variant="body2">{type.label}</Typography>
                                        <Typography color="text.secondary" variant="caption">{type.desc}</Typography>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    </Paper>

                    {/* Rank-Based Form */}
                    {resultType === 'rank' && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" fontWeight={800}>Winner Entries ({rankEntries.length})</Typography>
                                {!isLocked && (
                                    <Stack direction="row" spacing={1}>
                                        <Button variant="outlined" size="small" startIcon={<Calculate />}
                                            onClick={() => recalculate()} disabled={recalculating}
                                            sx={{ fontWeight: 700, borderRadius: '8px' }}>
                                            Auto-Rank
                                        </Button>
                                        <Button variant="contained" size="small" startIcon={<AddIcon />}
                                            onClick={handleAddRank} sx={{ fontWeight: 700, borderRadius: '8px' }}>
                                            Add Entry
                                        </Button>
                                    </Stack>
                                )}
                            </Box>
                            <AnimatePresence>
                                {rankEntries.map((entry, i) => (
                                    <RankEntryCard key={i} index={i} entry={entry} candidates={candidates}
                                        onChange={handleRankChange} onRemove={(idx) => setRankEntries(rankEntries.filter((_, j) => j !== idx))}
                                        isLocked={isLocked} />
                                ))}
                            </AnimatePresence>
                        </Box>
                    )}

                    {/* Score-Based Form */}
                    {resultType === 'score' && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" fontWeight={800}>Score Entry ({candidates.length} attendees)</Typography>
                                <Button variant="outlined" size="small" startIcon={<Calculate />}
                                    onClick={() => recalculate()} disabled={recalculating || isLocked}
                                    sx={{ fontWeight: 700, borderRadius: '8px' }}>
                                    Auto-Rank from Scores
                                </Button>
                            </Box>
                            <Paper sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                                <ScoreGrid candidates={candidates} entries={Object.entries(scoreMap).map(([uid, v]) => ({ user_id: uid, ...v }))}
                                    onChange={handleScoreChange} isLocked={isLocked} />
                            </Paper>
                        </Box>
                    )}

                    {/* Participation Only */}
                    {resultType === 'participation' && (
                        <Paper sx={{ p: 4, borderRadius: '20px', textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                            <Typography fontSize="3rem" mb={2}>🎫</Typography>
                            <Typography variant="h6" fontWeight={800} mb={1}>Participation Mode</Typography>
                            <Typography color="text.secondary" mb={3}>
                                All <strong>{attendees.length}</strong> attendees will receive a participation certificate. No ranking is assigned.
                            </Typography>
                            <Button variant="contained" onClick={() => publish(buildPayload())} disabled={publishing || isLocked}
                                sx={{ fontWeight: 800, borderRadius: '12px', px: 4, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                Publish Participation Results
                            </Button>
                        </Paper>
                    )}
                </Box>
            )}

            {/* Tab 1: Score Distribution */}
            {tab === 1 && (
                <Paper sx={{ p: 4, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                    {results.length === 0 ? (
                        <Box textAlign="center" py={6}><Typography color="text.secondary">No results published yet.</Typography></Box>
                    ) : (
                        <Box>
                            <Typography variant="h6" fontWeight={800} mb={3}>Top Performers by Score</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData} margin={{ bottom: 20 }}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                    <ReTip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }} />
                                    <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={40}>
                                        {chartData.map((_, i) => (
                                            <Cell key={i} fill={i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2f' : '#6366f1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>

                            {/* Leaderboard */}
                            <Divider sx={{ my: 3 }} />
                            <Typography variant="h6" fontWeight={800} mb={2}>Full Leaderboard</Typography>
                            {results.map(r => (
                                <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: '12px', mb: 1, bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}>
                                    {r.rank ? <RankBadge rank={r.rank} /> : <People fontSize="small" color="action" />}
                                    <Avatar src={r.student?.avatar_url} sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                                        {r.student?.full_name?.charAt(0)}
                                    </Avatar>
                                    <Box flex={1}>
                                        <Typography fontWeight={800} variant="body2">{r.student?.full_name || r.team?.team_name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{r.student?.department}</Typography>
                                    </Box>
                                    {r.score !== null && <Chip label={`${r.score}${r.max_score ? `/${r.max_score}` : ''}`} size="small" color="primary" sx={{ fontWeight: 800 }} />}
                                    {r.grade && <Chip label={r.grade} size="small" variant="outlined" sx={{ fontWeight: 700 }} />}
                                    {r.prize_title && <Chip label={r.prize_title} size="small" sx={{ bgcolor: '#fbbf2420', color: '#b45309', fontWeight: 700 }} />}
                                    {r.is_winner && <TrophyIcon sx={{ color: '#fbbf24' }} />}
                                </Box>
                            ))}
                        </Box>
                    )}
                </Paper>
            )}

            {/* Tab 2: CSV Import */}
            {tab === 2 && (
                <Paper sx={{ p: 4, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CloudUpload color="primary" /> CSV Bulk Import
                    </Typography>
                    <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
                        CSV columns: <strong>email, score, max_score, grade, rank, prize_title, remarks, is_winner, result_type</strong>
                    </Alert>
                    <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                        <Button variant="outlined" onClick={() => fileRef.current.click()} startIcon={<CloudUpload />}
                            sx={{ fontWeight: 700, borderRadius: '10px' }}>
                            Choose CSV
                        </Button>
                        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => setCsvFile(e.target.files[0])} />
                        {csvFile && <Typography variant="body2" fontWeight={700}>{csvFile.name}</Typography>}
                        {csvFile && (
                            <Button variant="contained" onClick={handleCSVImport} disabled={isLocked}
                                sx={{ fontWeight: 800, borderRadius: '10px' }}>
                                Import & Save as Draft
                            </Button>
                        )}
                    </Stack>
                    <Button variant="text" startIcon={<DownloadIcon />}
                        onClick={() => {
                            const tmpl = 'email,score,max_score,grade,rank,prize_title,remarks,is_winner,result_type\nstudent@example.com,85,100,A,1,🥇 Gold,Great performance!,true,score';
                            const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURI(tmpl);
                            a.download = 'results_template.csv'; a.click();
                        }}
                        sx={{ fontWeight: 700 }}>
                        Download Template
                    </Button>
                </Paper>
            )}

            {/* Tab 3: Audit Log */}
            {tab === 3 && (
                <Paper sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    {logs.length === 0 ? (
                        <Box p={4} textAlign="center"><Typography color="text.secondary">No audit entries yet.</Typography></Box>
                    ) : logs.map(log => (
                        <Box key={log.id} sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Chip label={log.action} size="small" variant="outlined" sx={{ fontWeight: 700, mr: 1, textTransform: 'capitalize' }} />
                                <Typography variant="caption" color="text.secondary">by {log.actor?.full_name || 'System'}</Typography>
                                {log.note && <Typography variant="caption" display="block" color="text.secondary" fontStyle="italic" mt={0.5}>&quot;{log.note}&quot;</Typography>}
                            </Box>
                            <Typography variant="caption" color="text.secondary">{new Date(log.created_at).toLocaleString()}</Typography>
                        </Box>
                    ))}
                </Paper>
            )}
        </Box>
    );
};

export default PublishResults;
