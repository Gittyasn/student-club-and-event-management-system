import { Grid, Paper, Typography } from '@mui/material';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTip,
    BarChart, Bar, XAxis, YAxis, Legend
} from 'recharts';

const AttendanceChartsTab = ({ eventTitle, stats }) => (
    <Grid container spacing={4}>
        <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: '16px', height: 300 }}>
                <Typography variant="subtitle2" fontWeight={800} color="text.secondary" gutterBottom>Status Distribution</Typography>
                <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                        <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                            {stats.pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                        </Pie>
                        <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: '0.78rem' }} />
                    </PieChart>
                </ResponsiveContainer>
            </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: '16px', height: 300 }}>
                <Typography variant="subtitle2" fontWeight={800} color="text.secondary" gutterBottom>Attendance Breakdown</Typography>
                <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={[{ name: `${eventTitle?.slice(0, 20) || 'Event'}...`, Present: stats.present, Late: stats.late, Absent: stats.absent, Excused: stats.excused }]}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <ReTip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Legend iconSize={10} />
                        <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Excused" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Paper>
        </Grid>
    </Grid>
);

export default AttendanceChartsTab;
