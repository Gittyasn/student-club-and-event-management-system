import { useMemo } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress, Avatar, Stack, Chip } from '@mui/material';
import { AutoGraph, WarningAmber, EmojiEvents, Stars } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useGlobalAIGovernance } from '../../hooks/useGuideEngine';

const PRESENT_STATUSES = ['present', 'late'];
const ACTIVE_MEMBERSHIP_STATUSES = ['approved', 'active', 'core_member', 'sub_coordinator'];
const CERTIFICATE_WEIGHTS = {
    winner: 20,
    merit: 12,
    participation: 8,
};

const getCertificatePoints = (certificates = []) =>
    certificates.reduce(
        (sum, cert) => sum + (CERTIFICATE_WEIGHTS[cert.cert_type] || CERTIFICATE_WEIGHTS.participation),
        0
    );

const computeEngagementScore = ({
    attendedCount = 0,
    membershipCount = 0,
    certificateScore = 0,
    feedbackCount = 0,
    registrationCount = 0,
}) => (attendedCount * 10) + (membershipCount * 5) + certificateScore + (feedbackCount * 2) + (registrationCount * 2);

const AIReports = () => {
    const { data: gov, isLoading: isGovLoading } = useGlobalAIGovernance();

    const { data, isLoading } = useQuery({
        queryKey: ['admin-ai-reports'],
        queryFn: async () => {
            const [
                profilesRes,
                membershipsRes,
                registrationsRes,
                attendanceRes,
                feedbackRes,
                certificatesRes,
                clubsRes,
                eventsRes,
            ] = await Promise.all([
                supabase.from('profiles').select('id, full_name, email, avatar_url, role, club_id').eq('role', 'student'),
                supabase.from('club_memberships').select('user_id, club_id, status'),
                supabase.from('registrations').select('user_id, event_id, status'),
                supabase.from('attendance_records').select('user_id, event_id, status'),
                supabase.from('feedback').select('user_id, event_id'),
                supabase.from('certificates').select('user_id, cert_type, status'),
                supabase.from('clubs').select('id, name, logo_url, rating'),
                supabase.from('events').select('id, club_id, approval_status'),
            ]);

            if (profilesRes.error) throw profilesRes.error;
            if (membershipsRes.error) throw membershipsRes.error;
            if (registrationsRes.error) throw registrationsRes.error;
            if (attendanceRes.error) throw attendanceRes.error;
            if (feedbackRes.error) throw feedbackRes.error;
            if (certificatesRes.error) throw certificatesRes.error;
            if (clubsRes.error) throw clubsRes.error;
            if (eventsRes.error) throw eventsRes.error;

            const students = profilesRes.data || [];
            const memberships = membershipsRes.data || [];
            const registrations = registrationsRes.data || [];
            const attendance = attendanceRes.data || [];
            const feedback = feedbackRes.data || [];
            const certificates = (certificatesRes.data || []).filter((cert) => cert.status === 'valid');
            const clubs = clubsRes.data || [];
            const events = eventsRes.data || [];

            const studentInsights = students.map((student) => {
                const studentMemberships = memberships.filter(
                    (membership) => membership.user_id === student.id && ACTIVE_MEMBERSHIP_STATUSES.includes(membership.status)
                );
                const studentRegistrations = registrations.filter((registration) => registration.user_id === student.id);
                const studentAttendance = attendance.filter(
                    (record) => record.user_id === student.id && PRESENT_STATUSES.includes(record.status)
                );
                const studentFeedback = feedback.filter((item) => item.user_id === student.id);
                const studentCertificates = certificates.filter((cert) => cert.user_id === student.id);

                const registrationCount = studentRegistrations.length;
                const attendedCount = studentAttendance.length;
                const missedCount = Math.max(registrationCount - attendedCount, 0);
                const score = computeEngagementScore({
                    attendedCount,
                    membershipCount: studentMemberships.length,
                    certificateScore: getCertificatePoints(studentCertificates),
                    feedbackCount: studentFeedback.length,
                    registrationCount,
                });

                return {
                    ...student,
                    registrationCount,
                    attendedCount,
                    missedCount,
                    score,
                };
            });

            const dropouts = studentInsights
                .filter((student) => student.registrationCount > 0 && student.missedCount > 0)
                .sort((a, b) => {
                    if (b.missedCount !== a.missedCount) return b.missedCount - a.missedCount;
                    return a.score - b.score;
                })
                .slice(0, 4)
                .map((student) => ({
                    ...student,
                    risk: student.missedCount >= 3 ? 'High Risk' : 'Watchlist',
                }));

            const topStudents = studentInsights
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

            const topClubs = clubs
                .map((club) => {
                    const clubMemberships = memberships.filter(
                        (membership) => membership.club_id === club.id && ACTIVE_MEMBERSHIP_STATUSES.includes(membership.status)
                    );
                    const clubEvents = events.filter((event) => event.club_id === club.id);
                    const approvedEvents = clubEvents.filter((event) => event.approval_status === 'approved').length;
                    const clubEventIds = new Set(clubEvents.map((event) => event.id));
                    const clubRegistrations = registrations.filter((registration) => clubEventIds.has(registration.event_id));

                    const score = Math.round(
                        (clubMemberships.length * 4) +
                        (approvedEvents * 8) +
                        (clubRegistrations.length * 2) +
                        ((club.rating || 0) * 10)
                    );

                    return {
                        ...club,
                        score,
                        memberCount: clubMemberships.length,
                        approvedEvents,
                    };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

            return { dropouts, topStudents, topClubs };
        },
        staleTime: 60 * 1000,
    });

    const features = useMemo(() => gov || [], [gov]);

    if (isGovLoading || isLoading) {
        return <Box display="flex" justifyContent="center" p={8}><CircularProgress /></Box>;
    }

    const isDropoutEnabled = features.find((feature) => feature.feature_key === 'dropout_detection')?.is_enabled !== false;
    const isLeaderboardEnabled = features.find((feature) => feature.feature_key === 'engagement_prediction')?.is_enabled !== false;

    return (
        <Box sx={{ pb: 8 }}>
            <Box mb={5}>
                <Typography variant="h4" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <AutoGraph color="secondary" fontSize="large" /> Engagement Intelligence
                </Typography>
                <Typography color="text.secondary">
                    Live operational insights built from registrations, attendance, club memberships, certificates, and feedback activity.
                </Typography>
            </Box>

            <Grid container spacing={4}>
                {isDropoutEnabled && (
                    <Grid item xs={12} lg={4}>
                        <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(244, 63, 94, 0.02)' }}>
                            <Typography variant="h6" fontWeight={800} color="error.main" mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <WarningAmber /> Attendance Watchlist
                            </Typography>
                            <Stack spacing={2}>
                                {data?.dropouts?.map((student) => (
                                    <Box key={student.id} sx={{ display: 'flex', alignItems: 'center', p: 1.5, borderRadius: '12px', bgcolor: 'background.paper', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                                        <Avatar src={student.avatar_url} sx={{ width: 40, height: 40, mr: 2 }}>
                                            {student.full_name?.charAt(0) || 'S'}
                                        </Avatar>
                                        <Box flex={1}>
                                            <Typography variant="subtitle2" fontWeight={700}>{student.full_name}</Typography>
                                            <Typography variant="caption" color="error.main">
                                                Missed {student.missedCount} registered event{student.missedCount === 1 ? '' : 's'}
                                            </Typography>
                                        </Box>
                                        <Chip size="small" label={student.risk} color="error" sx={{ fontWeight: 800 }} />
                                    </Box>
                                ))}
                                {!data?.dropouts?.length && (
                                    <Typography variant="body2" color="text.secondary">
                                        No students are currently on the watchlist.
                                    </Typography>
                                )}
                            </Stack>
                        </Paper>
                    </Grid>
                )}

                {isLeaderboardEnabled && (
                    <Grid item xs={12} lg={8}>
                        <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                            <Typography variant="h6" fontWeight={800} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <EmojiEvents sx={{ color: '#f59e0b' }} /> Campus Performance Tables
                            </Typography>

                            <Grid container spacing={4}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={2} textTransform="uppercase">
                                        Top Students
                                    </Typography>
                                    <Stack spacing={1.5}>
                                        {data?.topStudents?.map((student, index) => (
                                            <Box key={student.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Typography variant="body2" fontWeight={800} sx={{ width: 20, mr: 1, color: 'text.secondary' }}>
                                                        #{index + 1}
                                                    </Typography>
                                                    <Avatar src={student.avatar_url} sx={{ width: 28, height: 28, mr: 1.5 }}>
                                                        {student.full_name?.charAt(0) || 'S'}
                                                    </Avatar>
                                                    <Typography variant="subtitle2" fontWeight={600}>{student.full_name}</Typography>
                                                </Box>
                                                <Chip size="small" label={`${student.score} pts`} sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: 800, fontSize: '0.7rem' }} />
                                            </Box>
                                        ))}
                                    </Stack>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={2} textTransform="uppercase">
                                        Top Clubs
                                    </Typography>
                                    <Stack spacing={1.5}>
                                        {data?.topClubs?.map((club, index) => (
                                            <Box key={club.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Stars sx={{ color: index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : '#cd7f32', fontSize: 20, mr: 1.5 }} />
                                                    <Avatar src={club.logo_url} variant="rounded" sx={{ width: 28, height: 28, mr: 1.5 }}>
                                                        {club.name?.charAt(0) || 'C'}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="subtitle2" fontWeight={600}>{club.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {club.memberCount} members | {club.approvedEvents} approved events
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Typography variant="caption" fontWeight={800} color="#8b5cf6">Index: {club.score}</Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default AIReports;
