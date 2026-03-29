import { useMemo } from 'react';
import { Box, Chip } from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    QrCode as AttendanceIcon,
    RateReview as FeedbackIcon,
    EmojiEvents as ResultsIcon,
    CheckCircle as SubmitIcon,
    People,
    Flag as FinalizeIcon
} from '@mui/icons-material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

const EventsTable = ({ rows, isLoading, statusConfig, navigate, onSubmit, onDelete }) => {
    const columns = useMemo(() => [
        { field: 'title', headerName: 'Event Title', flex: 1.5 },
        { field: 'mode', headerName: 'Mode', width: 90, renderCell: p => <Chip label={p.value} size="small" variant="outlined" /> },
        { field: 'start_time', headerName: 'Start Time', width: 140, valueFormatter: v => v ? new Date(v).toLocaleString() : '-' },
        { field: 'location', headerName: 'Location', flex: 1 },
        {
            field: 'status', headerName: 'Lifecycle State', width: 150,
            renderCell: p => {
                const displayStatus = p.row.approval_status === 'rejected' ? 'rejected' : p.value;
                const config = statusConfig[displayStatus] || statusConfig.draft;
                return <Chip label={config.label} size="small" sx={{ fontWeight: 800, fontSize: '0.7rem', bgcolor: config.bg, color: config.color, border: `1px solid ${config.border}` }} />;
            }
        },
        { field: 'registrations', headerName: 'Regs', width: 80, valueGetter: (_v, row) => row.registrations?.[0]?.count || 0 },
        {
            field: 'actions', type: 'actions', headerName: 'Actions', width: 140,
            getActions: (params) => {
                const displayStatus = params.row.approval_status === 'rejected' ? 'rejected' : params.row.status;
                if (displayStatus === 'draft' || displayStatus === 'rejected') return [
                    <GridActionsCellItem key="edit" icon={<EditIcon color="primary" />} label="Edit" onClick={() => navigate(`/coordinator/events/${params.id}/edit`)} />,
                    <GridActionsCellItem key="submit" icon={<SubmitIcon color="success" />} label="Submit for Approval" onClick={() => onSubmit(params.id)} showInMenu />,
                    <GridActionsCellItem key="delete" icon={<DeleteIcon color="error" />} label="Delete" onClick={() => onDelete(params.id)} />,
                ];
                return [
                    <GridActionsCellItem key="regs" icon={<People color="info" />} label="Registrations" onClick={() => navigate(`/coordinator/events/${params.id}/registrations`)} showInMenu />,
                    <GridActionsCellItem key="attendance" icon={<AttendanceIcon color="primary" />} label="Attendance" onClick={() => navigate(`/coordinator/events/${params.id}/attendance`)} showInMenu />,
                    <GridActionsCellItem key="results" icon={<ResultsIcon color="warning" />} label="Results" onClick={() => navigate(`/coordinator/events/${params.id}/results`)} showInMenu />,
                    <GridActionsCellItem key="feedback" icon={<FeedbackIcon color="success" />} label="Feedback" onClick={() => navigate(`/coordinator/events/${params.id}/feedback`)} showInMenu />,
                    <GridActionsCellItem key="completion" icon={<FinalizeIcon color="secondary" />} label="Completion Wizard" onClick={() => navigate(`/coordinator/events/${params.id}/completion`)} showInMenu />,
                    <GridActionsCellItem key="edit" icon={<EditIcon />} label="Edit" onClick={() => navigate(`/coordinator/events/${params.id}/edit`)} showInMenu />,
                    <GridActionsCellItem key="delete" icon={<DeleteIcon color="error" />} label="Delete" onClick={() => onDelete(params.id)} showInMenu />,
                ];
            }
        }
    ], [navigate, onDelete, onSubmit, statusConfig]);

    return (
        <Box sx={{ height: 560 }}>
            <DataGrid
                rows={rows}
                columns={columns}
                loading={isLoading}
                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
            />
        </Box>
    );
};

export default EventsTable;
