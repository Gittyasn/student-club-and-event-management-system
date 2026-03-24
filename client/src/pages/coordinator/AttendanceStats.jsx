// eslint-disable-next-line no-unused-vars
import React, { useMemo } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useEventRegistrations, useAttendanceRecords } from '../../hooks/useAttendance';

const AttendanceStats = ({ eventId }) => {
    const { data: registrations = [] } = useEventRegistrations(eventId);
    const { data: records = [] } = useAttendanceRecords(eventId);

    const stats = useMemo(() => {
        const total = registrations.length;
        const presentSet = new Set(records.filter(r => r.status === 'present').map(r => r.registration_id));
        const lateSet = new Set(records.filter(r => r.status === 'late').map(r => r.registration_id));

        const present = presentSet.size;
        const late = lateSet.size;
        const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;

        const absentList = registrations.filter(reg => !presentSet.has(reg.id)).map(r => ({
            id: r.id,
            name: r.profiles?.full_name || 'Unknown',
            email: r.profiles?.email || ''
        }));

        return { total, present, late, attendancePct, absentList };
    }, [registrations, records]);

    const columns = [
        { field: 'name', headerName: 'Name', flex: 1 },
        { field: 'email', headerName: 'Email', flex: 1.5 }
    ];

    return (
        <Box>
            <Paper sx={{ p: 3, mb: 2 }}>
                <Box display="flex" gap={4} flexWrap="wrap">
                    <Box>
                        <Typography variant="h6">Total Registered</Typography>
                        <Typography variant="h4">{stats.total}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="h6">Present</Typography>
                        <Typography variant="h4">{stats.present}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="h6">Late</Typography>
                        <Typography variant="h4">{stats.late}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="h6">Attendance %</Typography>
                        <Typography variant="h4">{stats.attendancePct}%</Typography>
                    </Box>
                </Box>
            </Paper>

            <Paper sx={{ height: 400, p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Absent List</Typography>
                    <Button size="small" onClick={() => {
                        const csv = 'Name,Email\n' + stats.absentList.map(a => `${a.name},${a.email}`).join('\n');
                        const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                        const link = document.createElement('a');
                        link.setAttribute('href', uri);
                        link.setAttribute('download', `absent_list_${eventId}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}>Export CSV</Button>
                </Box>
                <DataGrid rows={stats.absentList} columns={columns} disableRowSelectionOnClick />
            </Paper>
        </Box>
    );
};

export default AttendanceStats;
