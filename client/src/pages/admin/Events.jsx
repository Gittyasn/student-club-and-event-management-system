import { Box, Chip, Stack, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Event as EventIcon, LocationOn as LocationIcon, Place as VenueIcon } from '@mui/icons-material';
import { useEvents } from '../../hooks/useEvents';
import LoadingDots from '../../components/LoadingDots';

const statusColors = {
    draft: 'default',
    pending: 'warning',
    approved: 'success',
    registration_open: 'success',
    registration_closed: 'warning',
    ongoing: 'info',
    completed: 'secondary',
    cancelled: 'error',
};

const Events = () => {
    const { data: events, isLoading } = useEvents();

    const rows = events || [];
    const columns = [
        {
            field: 'title',
            headerName: 'Event Overview',
            flex: 1.6,
            minWidth: 240,
            renderCell: ({ row }) => (
                <Box sx={{ py: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={800} color="text.primary" noWrap>
                        {row.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                        {row.club?.name || 'Independent event'} • {row.category || 'Uncategorized'}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'event_type',
            headerName: 'Format',
            width: 150,
            renderCell: ({ row }) => (
                <Stack spacing={0.5} sx={{ py: 1 }}>
                    <Chip
                        label={(row.event_type || 'general').replaceAll('_', ' ')}
                        size="small"
                        sx={{ fontWeight: 700, textTransform: 'capitalize' }}
                    />
                    <Typography variant="caption" color="text.secondary" noWrap>
                        {row.mode || 'offline'}
                    </Typography>
                </Stack>
            ),
        },
        {
            field: 'start_time',
            headerName: 'Schedule',
            width: 170,
            valueFormatter: (value) => (value ? new Date(value).toLocaleDateString() : 'TBD'),
            renderCell: ({ row }) => (
                <Stack spacing={0.5} sx={{ py: 1 }}>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                        {row.start_time ? new Date(row.start_time).toLocaleDateString() : 'TBD'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {row.start_time ? new Date(row.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time pending'}
                    </Typography>
                </Stack>
            ),
        },
        {
            field: 'location',
            headerName: 'Location Details',
            flex: 1.2,
            minWidth: 220,
            renderCell: ({ row }) => (
                <Box sx={{ py: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <LocationIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                        <Typography variant="body2" fontWeight={700} color="text.primary" noWrap>
                            {row.location || 'Location not added'}
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                        <VenueIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {row.mode === 'online' ? 'Online access' : 'Physical venue'}
                        </Typography>
                    </Stack>
                </Box>
            ),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 150,
            renderCell: ({ row }) => (
                <Stack spacing={0.5} sx={{ py: 1 }}>
                    <Chip
                        label={(row.status || 'draft').replaceAll('_', ' ')}
                        color={statusColors[row.status] || 'default'}
                        size="small"
                        sx={{ fontWeight: 800, textTransform: 'capitalize' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        Approval: {row.approval_status || 'draft'}
                    </Typography>
                </Stack>
            ),
        },
    ];

    return (
        <Box sx={{ pb: 6 }}>
            <Box
                sx={{
                    mb: 4,
                    p: { xs: 3, md: 4 },
                    borderRadius: '20px',
                    background: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, #0f172a 0%, #172554 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(37,99,235,0.12)',
                            color: 'primary.main',
                        }}
                    >
                        <EventIcon />
                    </Box>
                    <Box>
                        <Typography variant="h4" fontWeight={900} color="text.primary">
                            Events Overview
                        </Typography>
                        <Typography color="text.secondary" fontWeight={600}>
                            Track event schedule, venue details, approval state, and delivery status in one place.
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            <Box sx={{ height: 620, width: '100%' }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    loading={isLoading}
                    getRowHeight={() => 82}
                    slots={{
                        loadingOverlay: () => <LoadingDots minHeight="260px" label="Loading events..." />,
                        noRowsOverlay: () => <LoadingDots minHeight="200px" label="No events available yet." />,
                    }}
                    initialState={{
                        pagination: { paginationModel: { page: 0, pageSize: 10 } },
                    }}
                    pageSizeOptions={[5, 10, 20]}
                    disableRowSelectionOnClick
                    sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '18px',
                        overflow: 'hidden',
                        '& .MuiDataGrid-cell': { alignItems: 'center' },
                    }}
                />
            </Box>
        </Box>
    );
};

export default Events;
