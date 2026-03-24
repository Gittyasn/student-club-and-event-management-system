import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Box, Button, TextField, Typography, Paper, Grid, Alert,
    CircularProgress, Stack, Tooltip, IconButton
} from '@mui/material';
import { motion } from 'framer-motion';
import { Github, PlayCircle, Presentation, Send, Lock, HelpCircle } from 'lucide-react';
import { useSubmitProject } from '../../hooks/useHackathon';

const submissionSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    githubLink: z.string().url('Must be a valid GitHub URL').optional().or(z.literal('')),
    demoLink: z.string().url('Must be a valid Demo URL').optional().or(z.literal('')),
    presentationUrl: z.string().url('Must be a valid Presentation URL').optional().or(z.literal('')),
});

const SubmissionPage = ({ eventId, teamId, roundId: _roundId, existingSubmission, onCancel }) => {
    const submitProject = useSubmitProject();

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: zodResolver(submissionSchema),
        defaultValues: {
            title: existingSubmission?.title || '',
            description: existingSubmission?.description || '',
            githubLink: existingSubmission?.github_link || '',
            demoLink: existingSubmission?.demo_link || '',
            presentationUrl: existingSubmission?.presentation_url || '',
        }
    });

    useEffect(() => {
        if (existingSubmission) {
            reset({
                title: existingSubmission.title,
                description: existingSubmission.description,
                githubLink: existingSubmission.github_link,
                demoLink: existingSubmission.demo_link,
                presentationUrl: existingSubmission.presentation_url,
            });
        }
    }, [existingSubmission, reset]);

    const onSubmit = (data) => {
        submitProject.mutate({
            team_id: teamId,
            event_id: eventId,
            title: data.title,
            description: data.description,
            repo_url: data.githubLink,
            demo_url: data.demoLink,
            presentation_url: data.presentationUrl,
            is_final: false
        }, {
            onSuccess: () => {
                if (onCancel) onCancel();
            }
        });
    };

    if (existingSubmission?.is_locked) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
                <Lock size={48} color="#ef4444" style={{ marginBottom: 16 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Submission Locked
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    This submission has been finalized and locked by the coordinator or because the deadline has passed.
                </Typography>
                <Button onClick={onCancel} variant="outlined" sx={{ borderRadius: 2 }}>
                    Return to Dashboard
                </Button>
            </Paper>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
        >
            <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Send size={24} color="#6366f1" /> Project Submission
                    </Typography>
                    <Tooltip title="Submit your project details. You can edit this until the deadline or until it's locked.">
                        <IconButton size="small"><HelpCircle size={18} /></IconButton>
                    </Tooltip>
                </Box>

                <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
                    Make sure your GitHub repository and Demo links are public or accessible to the judges.
                </Alert>

                <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Project Title"
                                placeholder="e.g. EcoTrack: Smart Carbon Monitoring"
                                {...register('title')}
                                error={!!errors.title}
                                helperText={errors.title?.message}
                                variant="filled"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Description / Problem Statement"
                                placeholder="Explain what your project does and the problem it solves..."
                                {...register('description')}
                                error={!!errors.description}
                                helperText={errors.description?.message}
                                variant="filled"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="GitHub Repository Link"
                                placeholder="https://github.com/..."
                                {...register('githubLink')}
                                error={!!errors.githubLink}
                                helperText={errors.githubLink?.message}
                                InputProps={{
                                    startAdornment: <Github size={18} style={{ marginRight: 8, color: '#475569' }} />
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Demo Video Link"
                                placeholder="YouTube, Loom or Drive link"
                                {...register('demoLink')}
                                error={!!errors.demoLink}
                                helperText={errors.demoLink?.message}
                                InputProps={{
                                    startAdornment: <PlayCircle size={18} style={{ marginRight: 8, color: '#475569' }} />
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Presentation / Pitch Deck Link"
                                placeholder="Google Slides or Canva link"
                                {...register('presentationUrl')}
                                error={!!errors.presentationUrl}
                                helperText={errors.presentationUrl?.message}
                                InputProps={{
                                    startAdornment: <Presentation size={18} style={{ marginRight: 8, color: '#475569' }} />
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                                <Button
                                    onClick={onCancel}
                                    variant="text"
                                    sx={{ color: 'text.secondary' }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={submitProject.isPending}
                                    sx={{
                                        px: 4,
                                        borderRadius: 2,
                                        background: 'linear-gradient(45deg, #6366f1, #a855f7)',
                                        fontWeight: 'bold',
                                        textTransform: 'none'
                                    }}
                                >
                                    {submitProject.isPending ? <CircularProgress size={24} color="inherit" /> : 'Submit Project'}
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </motion.div>
    );
};

export default SubmissionPage;
