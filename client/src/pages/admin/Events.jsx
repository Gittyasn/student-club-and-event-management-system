import { Box, Typography, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useEvents } from '../../hooks/useEvents';

const Events = () => {
    const { data: events, isLoading } = useEvents();

    const columns = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'title', headerName: 'Title', flex: 1 },
        {
            field: 'club_name',
            headerName: 'Organized By',
            flex: 1,
            valueGetter: (_value, row) => row.club?.name || '-'
        },
        {
            field: 'start_time',
            headerName: 'Date',
            width: 120,
            valueFormatter: (value) => value ? new Date(value).toLocaleDateString() : 'TBD'
        },
        { field: 'location', headerName: 'Location', width: 150 },
        {
            field: 'status',
            headerName: 'Status',
            width: 100,
            renderCell: (params) => {
                const color = params.value === 'registration_open' ? 'success' : 'default';
                return <Chip label={params.value} color={color} size="small" />;
            }
        }
    ];

    return (
        <Box sx={{ height: 600, width: '100%' }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>Events Overview</Typography>
            <DataGrid
                rows={events || []}
                columns={columns}
                loading={isLoading}
                initialState={{
                    pagination: { paginationModel: { page: 0, pageSize: 10 } },
                }}
                pageSizeOptions={[5, 10]}
                disableRowSelectionOnClick
            />
        </Box>
    );
};

export default Events;
