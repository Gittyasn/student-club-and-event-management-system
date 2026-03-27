import { useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Paper,
    Rating,
    CircularProgress,
    Card,
    CardContent,
    Grid,
    Stack,
    Button
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Star as StarIcon, EmojiEvents as TrophyIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useAdminFeedbackOverview } from '../../hooks/useFeedback';

const AdminFeedback = () => {
    const navigate = useNavigate();
    const { data, isLoading, isError, error } = useAdminFeedbackOverview();


    if (isLoading) return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="60vh" gap={2}>
            <CircularProgress size={40} thickness={4} />
            <Typography color="text.secondary" fontWeight={500}>Analyzing campus feedback...</Typography>
        </Box>
    );

    if (isError) return (
        <Box p={4} textAlign="center">
            <Typography color="error" variant="h6">Failed to load feedback data</Typography>
            <Typography color="text.secondary">{error?.message || "Unknown error occurred"}</Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => window.location.reload()}>Retry</Button>
        </Box>
    );

    const columns = [
        { field: 'title', headerName: 'Event Title', flex: 1.5 },
        { field: 'clubName', headerName: 'Club', flex: 1 },
        {
            field: 'averageRating',
            headerName: 'Avg Rating',
            width: 150,
            renderCell: (params) => (
                <Box display="flex" alignItems="center" gap={1}>
                    <Rating value={params.value} readOnly size="small" precision={0.1} />
                    <Typography variant="body2">{Number(params.value).toFixed(1)}</Typography>
                </Box>
            )
        },
        { field: 'feedbackCount', headerName: 'Responses', width: 120 },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            renderCell: (params) => (
                <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => navigate(`/coordinator/events/${params.row.id}/feedback`)} // Admins can use the coordinator view
                >
                    View
                </Button>
            )
        }
    ];

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Platform Feedback Overview
            </Typography>

            {data?.mostLiked && data.mostLiked.feedbackCount > 0 && (
                <Card sx={{ mb: 4, borderRadius: 2, bgcolor: 'secondary.main', color: 'white' }}>
                    <CardContent>
                        <Stack direction="row" spacing={3} alignItems="center">
                            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}>
                                <TrophyIcon sx={{ fontSize: 40 }} />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight="bold">Most Liked Event</Typography>
                                <Typography variant="h4">{data.mostLiked.title}</Typography>
                                <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                                    <StarIcon sx={{ color: '#ffc107' }} />
                                    <Typography variant="h6">{data.mostLiked.averageRating.toFixed(1)} / 5.0</Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        ({data.mostLiked.feedbackCount} reviews)
                                    </Typography>
                                </Stack>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={3}>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" gutterBottom>Total Feedback</Typography>
                                <Typography variant="h4" fontWeight="bold">
                                    {data?.overview.reduce((acc, curr) => acc + curr.feedbackCount, 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent>
                                <Typography color="text.secondary" gutterBottom>Average Platform Rating</Typography>
                                <Typography variant="h4" fontWeight="bold">
                                    {(data?.overview.reduce((acc, curr) => acc + curr.averageRating, 0) / (data?.overview.length || 1)).toFixed(1)}
                                </Typography>
                                <Rating
                                    value={data?.overview.reduce((acc, curr) => acc + curr.averageRating, 0) / (data?.overview.length || 1)}
                                    readOnly
                                    precision={0.1}
                                />
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ height: 500, width: '100%', borderRadius: 2 }}>
                        <Box p={2} borderBottom="1px solid #eee">
                            <Typography variant="h6" fontWeight="bold">Event Performance</Typography>
                        </Box>
                        <DataGrid
                            rows={data?.overview || []}
                            columns={columns}
                            disableRowSelectionOnClick
                            initialState={{
                                sorting: {
                                    sortModel: [{ field: 'averageRating', sort: 'desc' }],
                                },
                            }}
                        />
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default AdminFeedback;
