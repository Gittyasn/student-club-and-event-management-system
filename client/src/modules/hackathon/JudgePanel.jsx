import { useState } from 'react';
import {
    Box, Typography, Paper, Grid, Card, CardContent,
    Button, Slider, TextField, Divider, Stack, Chip
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Github, PlayCircle, Presentation, Star, FileText, ChevronRight, Trophy, Target, Lightbulb
} from 'lucide-react';
import { useHackathonSubmissions, useSubmitEvaluation } from '../../hooks/useHackathon';
import { useAuthStore } from '../../store/authStore';

const criteriaList = [
    { key: 'technical', label: 'Technical Implementation', icon: <Target size={18} />, weight: 0.35, description: 'Code quality, architecture, and technical depth.' },
    { key: 'innovation', label: 'Innovation & Creativity', icon: <Lightbulb size={18} />, weight: 0.25, description: 'Originality of the idea and creative problem solving.' },
    { key: 'uiux', label: 'UI/UX Design', icon: <Presentation size={18} />, weight: 0.20, description: 'Visual appeal, user experience, and accessibility.' },
    { key: 'impact', label: 'Potential Impact', icon: <Trophy size={18} />, weight: 0.20, description: 'Real-world applicability and value proposition.' },
];

const JudgePanel = ({ eventId }) => {
    const { user } = useAuthStore();
    const { data: submissions, isLoading } = useHackathonSubmissions(eventId);
    const scoreSubmission = useSubmitEvaluation();
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [scores, setScores] = useState({ technical: 5, innovation: 5, uiux: 5, impact: 5 });
    const [remarks, setRemarks] = useState('');

    const handleScoreChange = (key, value) => {
        setScores(prev => ({ ...prev, [key]: value }));
    };

    const calculateTotal = () => {
        return criteriaList.reduce((acc, c) => acc + (scores[c.key] * c.weight), 0).toFixed(2);
    };

    const handleSubmitScore = () => {
        if (!selectedTeam) return;
        scoreSubmission.mutate({
            submission_id: selectedTeam.id,
            judge_id: user.id,
            criteria_scores: scores,
            total_score: parseFloat(calculateTotal()),
            feedback: remarks
        });
    };

    if (isLoading) return <Typography>Loading submissions...</Typography>;

    return (
        <Grid container spacing={4}>
            {/* Sidebar: Submission List */}
            <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Assigned Submissions ({submissions?.length || 0})
                </Typography>
                <Stack spacing={2}>
                    {submissions?.map((sub) => (
                        <Card
                            key={sub.id}
                            component={motion.div}
                            whileHover={{ x: 5 }}
                            onClick={() => setSelectedTeam(sub)}
                            sx={{
                                cursor: 'pointer',
                                borderRadius: 3,
                                border: selectedTeam?.id === sub.id ? '2px solid #6366f1' : '1px solid #e2e8f0',
                                bgcolor: selectedTeam?.id === sub.id ? '#f5f7ff' : 'white'
                            }}
                        >
                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                        {sub.team?.team_name || sub.team?.name}
                                    </Typography>
                                    <ChevronRight size={18} color="#94a3b8" />
                                </Box>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mb: 1 }}>
                                    {sub.title}
                                </Typography>
                                <Chip size="small" label={sub.team?.college_dept} sx={{ height: 20, fontSize: '0.65rem' }} />
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            </Grid>

            {/* Main: Scoring Detail */}
            <Grid item xs={12} md={8}>
                <AnimatePresence mode="wait">
                    {selectedTeam ? (
                        <motion.div
                            key={selectedTeam.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Paper sx={{ p: 4, borderRadius: 4 }}>
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="h4" sx={{ fontWeight: 800 }}>{selectedTeam.team?.team_name || selectedTeam.team?.name}</Typography>
                                    <Typography variant="h6" color="text.secondary" gutterBottom>{selectedTeam.title}</Typography>

                                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                        {selectedTeam.repo_url && (
                                            <Button size="small" startIcon={<Github size={16} />} href={selectedTeam.repo_url} target="_blank" sx={{ color: '#334155' }}>Repl/Repo</Button>
                                        )}
                                        {selectedTeam.demo_url && (
                                            <Button size="small" startIcon={<PlayCircle size={16} />} href={selectedTeam.demo_url} target="_blank" sx={{ color: '#ef4444' }}>Demo</Button>
                                        )}
                                        {selectedTeam.presentation_url && (
                                            <Button size="small" startIcon={<Presentation size={16} />} href={selectedTeam.presentation_url} target="_blank" sx={{ color: '#3b82f6' }}>Pitch</Button>
                                        )}
                                    </Stack>
                                </Box>

                                <Divider sx={{ mb: 4 }} />

                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>Scoring Criteria</Typography>

                                <Grid container spacing={4}>
                                    {criteriaList.map((c) => (
                                        <Grid item xs={12} key={c.key}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                {c.icon}
                                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{c.label}</Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>({(c.weight * 100)}% Weight)</Typography>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                                {c.description}
                                            </Typography>
                                            <Box sx={{ px: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Slider
                                                    value={scores[c.key]}
                                                    min={1}
                                                    max={10}
                                                    step={0.5}
                                                    onChange={(_, v) => handleScoreChange(c.key, v)}
                                                    valueLabelDisplay="auto"
                                                    sx={{ flexGrow: 1 }}
                                                />
                                                <Typography variant="h6" sx={{ minWidth: 40, fontWeight: 900, color: '#6366f1' }}>
                                                    {scores[c.key]}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>

                                <Box sx={{ mt: 6, p: 3, bgcolor: '#f1f5f9', borderRadius: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="h5" sx={{ fontWeight: 800 }}>Total Weighted Score</Typography>
                                        <Typography variant="h3" sx={{ fontWeight: 900, color: '#6366f1' }}>{calculateTotal()}</Typography>
                                    </Box>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        label="Remarks / Feedback for the team"
                                        placeholder="Excellent technical implementation, but UI could be polished..."
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        sx={{ bgcolor: 'white' }}
                                    />
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        startIcon={<Star />}
                                        onClick={handleSubmitScore}
                                        disabled={scoreSubmission.isPending}
                                        sx={{
                                            mt: 3,
                                            py: 1.5,
                                            borderRadius: 2,
                                            background: 'linear-gradient(45deg, #1e293b, #0f172a)',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {scoreSubmission.isPending ? 'Submitting...' : 'Submit Evaluation'}
                                    </Button>
                                </Box>
                            </Paper>
                        </motion.div>
                    ) : (
                        <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 4, bgcolor: '#f8fafc', border: '2px dashed #e2e8f0' }}>
                            <FileText size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
                            <Typography variant="h6" color="text.secondary">
                                Select a team from the list to start evaluating
                            </Typography>
                        </Paper>
                    )}
                </AnimatePresence>
            </Grid>
        </Grid>
    );
};

export default JudgePanel;
