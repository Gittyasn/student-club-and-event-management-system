import { useMemo } from 'react';
import {
    Avatar,
    Box,
    Chip,
    Grid,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import {
    AutoGraph,
    EmojiEvents,
    Insights,
    Stars,
    WarningAmber,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useGlobalAIGovernance } from '../../hooks/useGuideEngine';
import LoadingDots from '../../components/LoadingDots';

const PRESENT_STATUSES = ['present', 'late'];
const ACTIVE_MEMBERSHIP_STATUSES = ['approved', 'active', 'core_member', 'sub_coordinator'];
const CERTIFICATE_WEIGHTS = {
    winner: 20,
    merit: 12,
    participation: 8,
};

const getCertificatePoints = (certificates = []) =>
    certificates.reduce(
        (sum, certificate) => sum + (CERTIFICATE_WEIGHTS[certificate.cert_type] || CERTIFICATE_WEIGHTS.participation),
        0
    );

const computeEngagementScore = ({
    attendedCount = 0,
    membershipCount = 0,
    certificateScore = 0,
    feedbackCount = 0,
    registrationCount = 0,
}) => (attendedCount * 10) + (membershipCount * 5) + certificateScore + (feedbackCount * 2) + (registrationCount * 2);

const SectionCard = ({ title, subtitle, icon, children, accent = '#2563eb' }) => (
    <Paper
        sx={{
            p: 3,
            borderRadius: '22px',
            border: '1px solid',
            borderColor: 'divider',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2.5 }}>
            <Box
                sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '14px',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: `${accent}16`,
                    color: accent,
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box>
                <Typography variant="h6" fontWeight={900}>
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    {subtitle}
                </Typography>
            </Box>
        </Box>
        <Box sx={{ flex: 1 }}>{children}</Box>
    </Paper>
);

const RankedRow = ({ index, avatar, primary, secondary, score, scoreLabel, accent = '#2563eb' }) => (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            p: 1.5,
            borderRadius: '16px',
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider',
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
            <Chip
                size="small"
                label={`#${index + 1}`}
                sx={{ fontWeight: 800, bgcolor: `${accent}14`, color: accent }}
            />
            <Avatar src={avatar} sx={{ width: 36, height: 36 }}>
                {primary?.charAt(0) || '?'}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} noWrap>
                    {primary}
                </Typography>
                {secondary ? (
                    <Typography variant="caption" color="text.secondary" noWrap>
                        {secondary}
                    </Typography>
                ) : null}
            </Box>
        </Box>
        <Chip label={`${score} ${scoreLabel}`} size="small" sx={{ fontWeight: 800 }} />
    </Box>
);

const AIReports = () => {
    const { data: governance, isLoading: isGovernanceLoading } = useGlobalAIGovernance();

    const { data, isLoading } = useQuery({
        queryKey: ['admin-ai-reports'],
        queryFn: async () => {
            const [
                profilesResponse,
                membershipsResponse,
                registrationsResponse,
                attendanceResponse,
                feedbackResponse,
                certificatesResponse,
                clubsResponse,
                eventsResponse,
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

            if (profilesResponse.error) throw profilesResponse.error;
            if (membershipsResponse.error) throw membershipsResponse.error;
            if (registrationsResponse.error) throw registrationsResponse.error;
            if (attendanceResponse.error) throw attendanceResponse.error;
            if (feedbackResponse.error) throw feedbackResponse.error;
            if (certificatesResponse.error) throw certificatesResponse.error;
            if (clubsResponse.error) throw clubsResponse.error;
            if (eventsResponse.error) throw eventsResponse.error;

            const students = profilesResponse.data || [];
            const memberships = membershipsResponse.data || [];
            const registrations = registrationsResponse.data || [];
            const attendance = attendanceResponse.data || [];
            const feedback = feedbackResponse.data || [];
            const certificates = (certificatesResponse.data || []).filter((certificate) => certificate.status === 'valid');
            const clubs = clubsResponse.data || [];
            const events = eventsResponse.data || [];

            const studentInsights = students.map((student) => {
                const studentMemberships = memberships.filter(
                    (membership) =>
                        membership.user_id === student.id &&
                        ACTIVE_MEMBERSHIP_STATUSES.includes(membership.status)
                );
                const studentRegistrations = registrations.filter((registration) => registration.user_id === student.id);
                const studentAttendance = attendance.filter(
                    (record) =>
                        record.user_id === student.id &&
                        PRESENT_STATUSES.includes(record.status)
                );
                const studentFeedback = feedback.filter((item) => item.user_id === student.id);
                const studentCertificates = certificates.filter((certificate) => certificate.user_id === student.id);

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

            const topStudents = [...studentInsights]
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

            const topClubs = clubs
                .map((club) => {
                    const clubMemberships = memberships.filter(
                        (membership) =>
                            membership.club_id === club.id &&
                            ACTIVE_MEMBERSHIP_STATUSES.includes(membership.status)
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

            return {
                dropouts,
                topStudents,
                topClubs,
                summary: {
                    watchlistCount: dropouts.length,
                    topStudentScore: topStudents[0]?.score || 0,
                    topClubScore: topClubs[0]?.score || 0,
                    activeSignals: (topStudents.length || 0) + (topClubs.length || 0),
                },
            };
        },
        staleTime: 60 * 1000,
    });

    const features = useMemo(() => governance || [], [governance]);

    if (isGovernanceLoading || isLoading) {
        return <LoadingDots minHeight="50vh" label="Loading intelligence reports..." />;
    }

    const isDropoutEnabled =
        features.find((feature) => feature.feature_key === 'dropout_detection')?.is_enabled !== false;
    const isLeaderboardEnabled =
        features.find((feature) => feature.feature_key === 'engagement_prediction')?.is_enabled !== false;

    return (
        <Box sx={{ pb: 8 }}>
            <Box
                sx={{
                    mb: 4,
                    p: { xs: 3, md: 4 },
                    borderRadius: '24px',
                    background: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, #111827 0%, #312e81 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #eef2ff 100%)',
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Typography variant="overline" sx={{ color: '#7c3aed', fontWeight: 900, letterSpacing: 2.2 }}>
                    INTELLIGENCE REPORTING
                </Typography>
                <Typography variant="h4" fontWeight={900} sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <AutoGraph color="secondary" fontSize="large" />
                    Engagement Intelligence
                </Typography>
                <Typography color="text.secondary" fontWeight={600}>
                    Live operational insights built from registrations, attendance, club memberships, certificates, and feedback activity.
                </Typography>
            </Box>

            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
                    <SectionCard title="Watchlist" subtitle="Students needing intervention" icon={<WarningAmber />} accent="#ef4444">
                        <Typography variant="h3" fontWeight={900} color="error.main">
                            {data?.summary?.watchlistCount || 0}
                        </Typography>
                    </SectionCard>
                </Grid>
                <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
                    <SectionCard title="Top Student" subtitle="Highest engagement score" icon={<EmojiEvents />} accent="#f59e0b">
                        <Typography variant="h3" fontWeight={900} sx={{ color: '#f59e0b' }}>
                            {data?.summary?.topStudentScore || 0}
                        </Typography>
                    </SectionCard>
                </Grid>
                <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
                    <SectionCard title="Top Club" subtitle="Best current club index" icon={<Stars />} accent="#8b5cf6">
                        <Typography variant="h3" fontWeight={900} sx={{ color: '#8b5cf6' }}>
                            {data?.summary?.topClubScore || 0}
                        </Typography>
                    </SectionCard>
                </Grid>
                <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
                    <SectionCard title="Signals" subtitle="Combined active insights" icon={<Insights />} accent="#10b981">
                        <Typography variant="h3" fontWeight={900} sx={{ color: '#10b981' }}>
                            {data?.summary?.activeSignals || 0}
                        </Typography>
                    </SectionCard>
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                {isDropoutEnabled && (
                    <Grid item xs={12} lg={4} sx={{ display: 'flex' }}>
                        <SectionCard
                            title="Attendance Watchlist"
                            subtitle="Students missing registered events"
                            icon={<WarningAmber />}
                            accent="#ef4444"
                        >
                            <Stack spacing={1.5}>
                                {data?.dropouts?.length ? (
                                    data.dropouts.map((student, index) => (
                                        <RankedRow
                                            key={student.id}
                                            index={index}
                                            avatar={student.avatar_url}
                                            primary={student.full_name}
                                            secondary={`Missed ${student.missedCount} registered event${student.missedCount === 1 ? '' : 's'}`}
                                            score={student.risk}
                                            scoreLabel=""
                                            accent="#ef4444"
                                        />
                                    ))
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        No students are currently on the watchlist.
                                    </Typography>
                                )}
                            </Stack>
                        </SectionCard>
                    </Grid>
                )}

                {isLeaderboardEnabled && (
                    <Grid item xs={12} lg={8} sx={{ display: 'flex' }}>
                        <Paper
                            sx={{
                                p: 3,
                                borderRadius: '22px',
                                border: '1px solid',
                                borderColor: 'divider',
                                width: '100%',
                                height: '100%',
                            }}
                        >
                            <Typography variant="h6" fontWeight={900} mb={3}>
                                Performance Tables
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
                                    <SectionCard
                                        title="Top Students"
                                        subtitle="Sorted by current engagement score"
                                        icon={<EmojiEvents />}
                                        accent="#f59e0b"
                                    >
                                        <Stack spacing={1.5}>
                                            {data?.topStudents?.map((student, index) => (
                                                <RankedRow
                                                    key={student.id}
                                                    index={index}
                                                    avatar={student.avatar_url}
                                                    primary={student.full_name}
                                                    secondary={`${student.registrationCount} registrations | ${student.attendedCount} attended`}
                                                    score={student.score}
                                                    scoreLabel="pts"
                                                    accent="#f59e0b"
                                                />
                                            ))}
                                        </Stack>
                                    </SectionCard>
                                </Grid>
                                <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
                                    <SectionCard
                                        title="Top Clubs"
                                        subtitle="Ordered by member, event, and activity index"
                                        icon={<Stars />}
                                        accent="#8b5cf6"
                                    >
                                        <Stack spacing={1.5}>
                                            {data?.topClubs?.map((club, index) => (
                                                <RankedRow
                                                    key={club.id}
                                                    index={index}
                                                    avatar={club.logo_url}
                                                    primary={club.name}
                                                    secondary={`${club.memberCount} members | ${club.approvedEvents} approved events`}
                                                    score={club.score}
                                                    scoreLabel="idx"
                                                    accent="#8b5cf6"
                                                />
                                            ))}
                                        </Stack>
                                    </SectionCard>
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
