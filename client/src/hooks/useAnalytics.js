import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useCoordinatorClub } from './useCoordinatorClub';

const PRESENT_STATUSES = ['present', 'late'];
const APPROVED_MEMBERSHIP_STATUSES = ['approved', 'core_member', 'sub_coordinator'];
const ACTIVE_REGISTRATION_STATUSES = ['registered', 'confirmed', 'attended', 'waitlisted', 'no_show'];
const CERTIFICATE_WEIGHTS = {
    winner: 20,
    merit: 12,
    participation: 8,
};



const buildMonthSeries = (months = 6) => {
    const now = new Date();
    return Array.from({ length: months }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (months - 1) + index, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return {
            key,
            label: date.toLocaleString('default', { month: 'short' }),
            fullLabel: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
        };
    });
};

const toMonthKey = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const certificatePoints = (certificates) =>
    certificates.reduce((sum, cert) => sum + (CERTIFICATE_WEIGHTS[cert.cert_type] || CERTIFICATE_WEIGHTS.participation), 0);

const computeEngagementScore = ({
    attendedCount = 0,
    membershipCount = 0,
    certificateScore = 0,
    feedbackCount = 0,
    registrationCount = 0,
}) => (attendedCount * 10) + (membershipCount * 5) + certificateScore + (feedbackCount * 2) + (registrationCount * 2);

const getEngagementLevel = (score) => {
    if (score >= 200) return 'Campus Leader';
    if (score >= 100) return 'Highly Active';
    if (score >= 40) return 'Active';
    return 'Beginner';
};

const getNextThreshold = (level) => {
    switch (level) {
        case 'Beginner':
            return 40;
        case 'Active':
            return 100;
        case 'Highly Active':
            return 200;
        default:
            return 300;
    }
};

const ensureNoError = (label, response) => {
    if (response.error) {
        throw new Error(`${label}: ${response.error.message}`);
    }
    return response.data;
};

const safeName = (value, fallback = 'Unknown') => (value && String(value).trim() ? value : fallback);

export const useAdminAnalytics = () => {
    return useQuery({
        queryKey: ['adminAnalytics'],
        staleTime: 3 * 60 * 1000,
        queryFn: async () => {
            const [
                clubsRes,
                profilesRes,
                eventsRes,
                registrationsRes,
                certificatesRes,
                membershipsRes,
                attendanceRes,
                feedbackRes,
                notificationsRes,
            ] = await Promise.all([
                supabase.from('clubs').select('id, name, status, created_at'),
                supabase.from('profiles').select('id, department, role'),
                supabase.from('events').select(`
                    id, club_id, created_at,
                    category:event_categories(name)
                `),
                supabase.from('registrations').select('id, user_id, event_id, created_at, registered_at, status'),
                supabase.from('certificates').select('id, user_id, event_id, cert_type, status, generated_at'),
                supabase.from('club_memberships').select('id, user_id, club_id, status, joined_at'),
                supabase.from('attendance_records').select('user_id, event_id, status, marked_at'),
                supabase.from('feedback').select('user_id, event_id, rating, created_at'),
                supabase.from('notifications').select('id, is_read, delivered, created_at'),
            ]);

            const clubs = ensureNoError('clubs', clubsRes) || [];
            const profiles = ensureNoError('profiles', profilesRes) || [];
            const events = ensureNoError('events', eventsRes) || [];
            const registrations = ensureNoError('registrations', registrationsRes) || [];
            const certificates = ensureNoError('certificates', certificatesRes) || [];
            const memberships = ensureNoError('club_memberships', membershipsRes) || [];
            const attendance = ensureNoError('attendance_records', attendanceRes) || [];
            const feedback = ensureNoError('feedback', feedbackRes) || [];
            const notifications = ensureNoError('notifications', notificationsRes) || [];

            const activeMemberships = memberships.filter((membership) =>
                APPROVED_MEMBERSHIP_STATUSES.includes(membership.status)
            );
            const validCertificates = certificates.filter((certificate) => certificate.status === 'valid');
            const presentAttendance = attendance.filter((record) => PRESENT_STATUSES.includes(record.status));
            const attendanceRate = attendance.length
                ? Number(((presentAttendance.length / attendance.length) * 100).toFixed(1))
                : 0;

            const avgRating = feedback.length
                ? Number((feedback.reduce((sum, item) => sum + (item.rating || 0), 0) / feedback.length).toFixed(1))
                : 'N/A';

            const readRate = notifications.length
                ? Number(((notifications.filter((item) => item.is_read).length / notifications.length) * 100).toFixed(1))
                : 0;

            const hasDeliveryTelemetry = notifications.some((item) => item.delivered === true);
            const deliverySuccess = notifications.length
                ? (hasDeliveryTelemetry
                    ? Math.round((notifications.filter((item) => item.delivered !== false).length / notifications.length) * 100)
                    : 100)
                : 0;

            const categoryCounts = events.reduce((acc, event) => {
                const categoryName = safeName(event.category?.name, 'Uncategorized');
                acc[categoryName] = (acc[categoryName] || 0) + 1;
                return acc;
            }, {});

            const categoryDist = Object.entries(categoryCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 8);

            const departmentByUserId = profiles.reduce((acc, profile) => {
                acc[profile.id] = safeName(profile.department, 'Unknown');
                return acc;
            }, {});

            const departmentCounts = registrations.reduce((acc, registration) => {
                const department = departmentByUserId[registration.user_id] || 'Unknown';
                acc[department] = (acc[department] || 0) + 1;
                return acc;
            }, {});

            const deptRanking = Object.entries(departmentCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 8);



            const eventIdsByClubId = events.reduce((acc, event) => {
                if (!acc[event.club_id]) acc[event.club_id] = [];
                acc[event.club_id].push(event.id);
                return acc;
            }, {});

            const registrationsByEventId = registrations.reduce((acc, registration) => {
                if (!acc[registration.event_id]) acc[registration.event_id] = [];
                acc[registration.event_id].push(registration);
                return acc;
            }, {});

            const attendanceByEventId = attendance.reduce((acc, record) => {
                if (!acc[record.event_id]) acc[record.event_id] = [];
                acc[record.event_id].push(record);
                return acc;
            }, {});

            const clubPerf = clubs
                .map((club) => {
                    const clubEventIds = eventIdsByClubId[club.id] || [];
                    const clubRegistrations = clubEventIds.flatMap((eventId) => registrationsByEventId[eventId] || []);
                    const clubAttendance = clubEventIds.flatMap((eventId) => attendanceByEventId[eventId] || []);
                    const presentCount = clubAttendance.filter((record) => PRESENT_STATUSES.includes(record.status)).length;

                    return {
                        name: safeName(club.name).slice(0, 18),
                        Events: clubEventIds.length,
                        Registrations: clubRegistrations.length,
                        AttendanceRate: clubAttendance.length ? Math.round((presentCount / clubAttendance.length) * 100) : 0,
                    };
                })
                .sort((a, b) => b.Registrations - a.Registrations)
                .slice(0, 8);

            const monthlySeries = buildMonthSeries(6);
            const monthlyTrendMap = monthlySeries.reduce((acc, item) => {
                acc[item.key] = { name: item.label, Events: 0, Registrations: 0, Members: 0 };
                return acc;
            }, {});

            events.forEach((event) => {
                const key = toMonthKey(event.created_at);
                if (key && monthlyTrendMap[key]) monthlyTrendMap[key].Events++;
            });

            registrations.forEach((registration) => {
                const key = toMonthKey(registration.registered_at || registration.created_at);
                if (key && monthlyTrendMap[key]) monthlyTrendMap[key].Registrations++;
            });

            activeMemberships.forEach((membership) => {
                const key = toMonthKey(membership.joined_at);
                if (key && monthlyTrendMap[key]) monthlyTrendMap[key].Members++;
            });

            const attendanceTrendMap = monthlySeries.reduce((acc, item) => {
                acc[item.key] = { name: item.label, Present: 0, Absent: 0 };
                return acc;
            }, {});

            attendance.forEach((record) => {
                const key = toMonthKey(record.marked_at);
                if (!key || !attendanceTrendMap[key]) return;
                if (PRESENT_STATUSES.includes(record.status)) attendanceTrendMap[key].Present++;
                else attendanceTrendMap[key].Absent++;
            });

            const activeClubCount = clubs.some((club) => club.status === 'active')
                ? clubs.filter((club) => club.status === 'active').length
                : clubs.length;

            return {
                totalClubs: activeClubCount,
                totalUsers: profiles.length,
                totalEvents: events.length,
                totalRegistrations: registrations.length,
                totalCertificates: validCertificates.length,
                totalMemberships: activeMemberships.length,
                totalNotifications: notifications.length,
                readRate,
                deliverySuccess,
                attendanceRate,
                avgRating,
                monthlyTrend: Object.values(monthlyTrendMap),
                attendanceTrend: Object.values(attendanceTrendMap),
                clubPerf,
                deptRanking,
                categoryDist,
                ratingDist: [1, 2, 3, 4, 5].map((rating) => ({
                    name: `${rating}*`,
                    value: feedback.filter((item) => Math.round(item.rating || 0) === rating).length,
                })),
            };
        },
    });
};

export const useCoordinatorAnalytics = () => {
    const { data: coordinatorClub } = useCoordinatorClub();
    const clubId = coordinatorClub?.id;

    return useQuery({
        queryKey: ['coordinatorAnalytics', clubId],
        enabled: !!clubId,
        staleTime: 2 * 60 * 1000,
        queryFn: async () => {
            const eventsRes = await supabase
                .from('events')
                .select('id, title, start_time, status')
                .eq('club_id', clubId)
                .order('start_time', { ascending: false });

            const events = ensureNoError('coordinator events', eventsRes) || [];
            const eventIds = events.map((event) => event.id);

            if (eventIds.length === 0) {
                return {
                    totalEvents: 0,
                    totalReg: 0,
                    avgReg: 0,
                    attendancePct: 0,
                    avgRating: 'N/A',
                    totalMembers: 0,
                    totalCerts: 0,
                    noShowRate: 0,
                    certByType: { participation: 0, winner: 0, merit: 0 },
                    eventPerf: [],
                    memberGrowth: [],
                    bestEvent: null,
                    worstEvent: null,
                };
            }

            const [
                registrationsRes,
                attendanceRes,
                feedbackRes,
                certificatesRes,
                membershipsRes,
            ] = await Promise.all([
                supabase.from('registrations').select('event_id, status').in('event_id', eventIds),
                supabase.from('attendance_records').select('event_id, status').in('event_id', eventIds),
                supabase.from('feedback').select('event_id, rating').in('event_id', eventIds),
                supabase.from('certificates').select('event_id, cert_type, status').in('event_id', eventIds),
                supabase.from('club_memberships').select('status, joined_at').eq('club_id', clubId),
            ]);

            const registrations = ensureNoError('coordinator registrations', registrationsRes) || [];
            const attendance = ensureNoError('coordinator attendance', attendanceRes) || [];
            const feedback = ensureNoError('coordinator feedback', feedbackRes) || [];
            const certificates = ensureNoError('coordinator certificates', certificatesRes) || [];
            const memberships = ensureNoError('coordinator memberships', membershipsRes) || [];

            const registrationsByEvent = registrations.reduce((acc, registration) => {
                if (!acc[registration.event_id]) acc[registration.event_id] = [];
                acc[registration.event_id].push(registration);
                return acc;
            }, {});

            const attendanceByEvent = attendance.reduce((acc, record) => {
                if (!acc[record.event_id]) acc[record.event_id] = [];
                acc[record.event_id].push(record);
                return acc;
            }, {});

            const feedbackByEvent = feedback.reduce((acc, item) => {
                if (!acc[item.event_id]) acc[item.event_id] = [];
                acc[item.event_id].push(item);
                return acc;
            }, {});

            const validCertificates = certificates.filter((certificate) => certificate.status === 'valid');
            const certByType = validCertificates.reduce((acc, certificate) => {
                const key = certificate.cert_type || 'participation';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, { participation: 0, winner: 0, merit: 0 });

            const eventPerf = events.slice(0, 10).map((event) => {
                const eventRegistrations = registrationsByEvent[event.id] || [];
                const eventAttendance = attendanceByEvent[event.id] || [];
                const eventFeedback = feedbackByEvent[event.id] || [];
                const eventRating = eventFeedback.length
                    ? Number((eventFeedback.reduce((sum, item) => sum + (item.rating || 0), 0) / eventFeedback.length).toFixed(1))
                    : 0;

                return {
                    name: safeName(event.title).slice(0, 18),
                    Registrations: eventRegistrations.length,
                    Attended: eventAttendance.filter((record) => PRESENT_STATUSES.includes(record.status)).length,
                    Rating: eventRating,
                };
            });

            const rankedEvents = events.map((event) => ({
                title: event.title,
                reg: (registrationsByEvent[event.id] || []).length,
            })).sort((a, b) => b.reg - a.reg);

            const approvedMembers = memberships.filter((membership) =>
                APPROVED_MEMBERSHIP_STATUSES.includes(membership.status)
            );

            const memberGrowthMap = buildMonthSeries(6).reduce((acc, item) => {
                acc[item.key] = { name: item.label, Members: 0 };
                return acc;
            }, {});

            approvedMembers.forEach((membership) => {
                const key = toMonthKey(membership.joined_at);
                if (key && memberGrowthMap[key]) memberGrowthMap[key].Members++;
            });

            const totalPresent = attendance.filter((record) => PRESENT_STATUSES.includes(record.status)).length;
            const totalEvents = events.length;
            const totalReg = registrations.length;
            const avgReg = totalEvents ? Math.round(totalReg / totalEvents) : 0;
            const attendancePct = attendance.length ? Math.round((totalPresent / attendance.length) * 100) : 0;
            const avgRating = feedback.length
                ? Number((feedback.reduce((sum, item) => sum + (item.rating || 0), 0) / feedback.length).toFixed(1))
                : 'N/A';
            const noShowRate = registrations.length
                ? Math.round((registrations.filter((registration) => registration.status === 'no_show').length / registrations.length) * 100)
                : 0;

            return {
                totalEvents,
                totalReg,
                avgReg,
                attendancePct,
                avgRating,
                totalMembers: approvedMembers.length,
                totalCerts: validCertificates.length,
                noShowRate,
                certByType: {
                    participation: certByType.participation || 0,
                    winner: certByType.winner || 0,
                    merit: certByType.merit || 0,
                },
                eventPerf,
                memberGrowth: Object.values(memberGrowthMap),
                bestEvent: rankedEvents[0] || null,
                worstEvent: rankedEvents[rankedEvents.length - 1] || null,
            };
        },
    });
};

export const useStudentAnalytics = () => {
    const { user } = useAuthStore();
    const userId = user?.id;

    return useQuery({
        queryKey: ['studentAnalytics', userId],
        enabled: !!userId,
        queryFn: async () => {
            const [registrationsRes, membershipsRes, certificatesRes, feedbackRes, attendanceRes] = await Promise.all([
                supabase.from('registrations').select('event_id, status, registered_at, created_at').eq('user_id', userId),
                supabase.from('club_memberships').select('club_id, status, joined_at').eq('user_id', userId),
                supabase.from('certificates').select('cert_type, generated_at, status').eq('user_id', userId),
                supabase.from('feedback').select('rating, created_at, event_id').eq('user_id', userId),
                supabase.from('attendance_records').select('status, marked_at').eq('user_id', userId),
            ]);

            const registrations = ensureNoError('student registrations', registrationsRes) || [];
            const memberships = ensureNoError('student memberships', membershipsRes) || [];
            const certificates = ensureNoError('student certificates', certificatesRes) || [];
            const feedback = ensureNoError('student feedback', feedbackRes) || [];
            const attendance = ensureNoError('student attendance', attendanceRes) || [];

            const activeRegistrations = registrations.filter((registration) =>
                ACTIVE_REGISTRATION_STATUSES.includes(registration.status)
            );
            const approvedMemberships = memberships.filter((membership) =>
                APPROVED_MEMBERSHIP_STATUSES.includes(membership.status)
            );
            const validCertificates = certificates.filter((certificate) => certificate.status === 'valid');
            const attendedCount = attendance.filter((record) => PRESENT_STATUSES.includes(record.status)).length;
            const totalRegistrationCount = activeRegistrations.length;
            const attRate = totalRegistrationCount ? Math.round((attendedCount / totalRegistrationCount) * 100) : 0;

            const registrationPts = totalRegistrationCount * 2;
            const attendedPts = attendedCount * 10;
            const membershipPts = approvedMemberships.length * 5;
            const certificatePts = certificatePoints(validCertificates);
            const feedbackPts = feedback.length * 2;
            const engScore = computeEngagementScore({
                attendedCount,
                membershipCount: approvedMemberships.length,
                certificateScore: certificatePts,
                feedbackCount: feedback.length,
                registrationCount: totalRegistrationCount,
            });

            const engLevel = getEngagementLevel(engScore);
            const nextTarget = getNextThreshold(engLevel);
            const engPct = Math.min(Math.round((engScore / nextTarget) * 100), 100);

            const activityTrendMap = buildMonthSeries(6).reduce((acc, item) => {
                acc[item.key] = { name: item.label, Registrations: 0, Attended: 0, Certs: 0 };
                return acc;
            }, {});

            activeRegistrations.forEach((registration) => {
                const key = toMonthKey(registration.registered_at || registration.created_at);
                if (key && activityTrendMap[key]) activityTrendMap[key].Registrations++;
            });

            attendance.forEach((record) => {
                const key = toMonthKey(record.marked_at);
                if (key && activityTrendMap[key] && PRESENT_STATUSES.includes(record.status)) {
                    activityTrendMap[key].Attended++;
                }
            });

            validCertificates.forEach((certificate) => {
                const key = toMonthKey(certificate.generated_at);
                if (key && activityTrendMap[key]) activityTrendMap[key].Certs++;
            });

            const certCounts = validCertificates.reduce((acc, certificate) => {
                const type = certificate.cert_type || 'participation';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});

            const chartColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
            const certTypes = Object.entries(certCounts).map(([name, value], index) => ({
                name,
                value,
                color: chartColors[index % chartColors.length],
            }));

            return {
                totalReg: totalRegistrationCount,
                attended: attendedCount,
                attRate,
                clubsJoined: approvedMemberships.length,
                totalCerts: validCertificates.length,
                feedbackCount: feedback.length,
                engScore,
                engLevel,
                engPct,
                registrationPts,
                attendedPts,
                membershipPts,
                certificatePts,
                feedbackPts,
                activityTrend: Object.values(activityTrendMap),
                certTypes,
                avgRating: feedback.length
                    ? Number((feedback.reduce((sum, item) => sum + (item.rating || 0), 0) / feedback.length).toFixed(1))
                    : 0,
            };
        },
    });
};

export const useEngagementLeaderboard = () => {
    return useQuery({
        queryKey: ['engagementLeaderboard'],
        staleTime: 10 * 60 * 1000,
        queryFn: async () => {
            const [profilesRes, attendanceRes, membershipsRes, certificatesRes, feedbackRes, registrationsRes] = await Promise.all([
                supabase.from('profiles').select('id, full_name, avatar_url, department').eq('role', 'student'),
                supabase.from('attendance_records').select('user_id, status'),
                supabase.from('club_memberships').select('user_id, status'),
                supabase.from('certificates').select('user_id, cert_type, status'),
                supabase.from('feedback').select('user_id'),
                supabase.from('registrations').select('user_id, status'),
            ]);

            const students = ensureNoError('leaderboard profiles', profilesRes) || [];
            const attendance = ensureNoError('leaderboard attendance', attendanceRes) || [];
            const memberships = ensureNoError('leaderboard memberships', membershipsRes) || [];
            const certificates = ensureNoError('leaderboard certificates', certificatesRes) || [];
            const feedback = ensureNoError('leaderboard feedback', feedbackRes) || [];
            const registrations = ensureNoError('leaderboard registrations', registrationsRes) || [];

            const attendanceMap = attendance.reduce((acc, record) => {
                if (PRESENT_STATUSES.includes(record.status)) {
                    acc[record.user_id] = (acc[record.user_id] || 0) + 1;
                }
                return acc;
            }, {});

            const membershipMap = memberships.reduce((acc, membership) => {
                if (APPROVED_MEMBERSHIP_STATUSES.includes(membership.status)) {
                    acc[membership.user_id] = (acc[membership.user_id] || 0) + 1;
                }
                return acc;
            }, {});

            const certificateMap = certificates.reduce((acc, certificate) => {
                if (certificate.status === 'valid') {
                    acc[certificate.user_id] = (acc[certificate.user_id] || 0) + (CERTIFICATE_WEIGHTS[certificate.cert_type] || CERTIFICATE_WEIGHTS.participation);
                }
                return acc;
            }, {});

            const feedbackMap = feedback.reduce((acc, item) => {
                acc[item.user_id] = (acc[item.user_id] || 0) + 1;
                return acc;
            }, {});

            const registrationMap = registrations.reduce((acc, registration) => {
                if (ACTIVE_REGISTRATION_STATUSES.includes(registration.status)) {
                    acc[registration.user_id] = (acc[registration.user_id] || 0) + 1;
                }
                return acc;
            }, {});

            return students
                .map((student) => {
                    const attendedCount = attendanceMap[student.id] || 0;
                    const membershipCount = membershipMap[student.id] || 0;
                    const certificateScore = certificateMap[student.id] || 0;
                    const feedbackCount = feedbackMap[student.id] || 0;
                    const registrationCount = registrationMap[student.id] || 0;
                    const score = computeEngagementScore({
                        attendedCount,
                        membershipCount,
                        certificateScore,
                        feedbackCount,
                        registrationCount,
                    });

                    return {
                        ...student,
                        score,
                        level: getEngagementLevel(score),
                    };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 50);
        },
    });
};
