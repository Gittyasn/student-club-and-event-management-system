import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from '../store/authStore';

// ─── Helper: Month name from date string ──────────────────────
const getMonth = (d) => new Date(d).toLocaleString('default', { month: 'short', year: '2-digit' });

// ─── 📊 ADMIN ANALYTICS (Executive Dashboard) ───────────────────────────────────
// Optimised to use server-side SQL Views for lightning-fast loading
export const useAdminAnalytics = () => {
    return useQuery({
        queryKey: ['adminAnalytics'],
        staleTime: 3 * 60 * 1000,
        queryFn: async () => {
            const [
                countsRes, 
                monthlyTrendRes, 
                deptRankingRes, 
                clubPerfRes,
                attendanceRateRes,
                feedbackRes,
                notifsRes
            ] = await Promise.all([
                // Platform counts (Fast headcount)
                Promise.all([
                    supabase.from('clubs').select('*', { count: 'exact', head: true }),
                    supabase.from('profiles').select('*', { count: 'exact', head: true }),
                    supabase.from('events').select('*', { count: 'exact', head: true }),
                    supabase.from('registrations').select('*', { count: 'exact', head: true }),
                    supabase.from('certificates').select('*', { count: 'exact', head: true }),
                    supabase.from('club_memberships').select('*', { count: 'exact', head: true }),
                ]),
                // Optimized Views (Pre-computed on Supabase)
                supabase.from('view_monthly_trends').select('*'),
                supabase.from('view_department_ranking').select('*'),
                supabase.from('view_club_performance').select('*'),
                // Specialized Aggregations
                supabase.from('attendance_records').select('status'),
                supabase.from('feedback').select('rating'),
                supabase.from('notifications').select('id, is_read'),
            ]);

            const [clubsC, profilesC, eventsC, regsC, certsC, membershipsC] = countsRes;

            const attendRecs = attendanceRateRes.data || [];
            const presentCount = attendRecs.filter(r => ['present', 'late'].includes(r.status)).length;
            const attendanceRate = attendRecs.length > 0 ? ((presentCount / attendRecs.length) * 100).toFixed(1) : 0;

            const feedbacks = feedbackRes.data || [];
            const avgRating = feedbacks.length 
                ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.length).toFixed(1) 
                : 'N/A';

            const allNotifs = notifsRes.data || [];
            const readNotifs = allNotifs.filter(n => n.is_read).length;
            const readRate = allNotifs.length > 0 ? ((readNotifs / allNotifs.length) * 100).toFixed(1) : 0;

            return {
                totalClubs: clubsC.count || 0,
                totalUsers: profilesC.count || 0,
                totalEvents: eventsC.count || 0,
                totalRegistrations: regsC.count || 0,
                totalCertificates: certsC.count || 0,
                totalMemberships: membershipsC.count || 0,
                totalNotifications: allNotifs.length,
                readRate,
                attendanceRate,
                avgRating,
                monthlyTrend: monthlyTrendRes.data || [],
                clubPerf: (clubPerfRes.data || []).slice(0, 8),
                deptRanking: (deptRankingRes.data || []).slice(0, 8),
                ratingDist: [1, 2, 3, 4, 5].map(r => ({
                    name: `${r}★`, value: feedbacks.filter(f => Math.round(f.rating) === r).length || 0
                })),
            };
        }
    });
};

// ─── 🎯 COORDINATOR ANALYTICS (Club-focused) ────────────────────────────────────
export const useCoordinatorAnalytics = () => {
    const { profile } = useAuthStore();
    const clubId = profile?.club_id;

    return useQuery({
        queryKey: ['coordinatorAnalytics', clubId],
        enabled: !!clubId,
        staleTime: 2 * 60 * 1000,
        queryFn: async () => {
            const { data: events } = await supabase.from('events')
                .select(`
                    id, title, start_time, status,
                    registrations(count),
                    attendance_records(status),
                    feedback(rating)
                `)
                .eq('club_id', clubId)
                .order('start_time', { ascending: false });

            const evList = events || [];
            const totalEvents = evList.length;
            const totalReg = evList.reduce((s, e) => s + (e.registrations?.[0]?.count || 0), 0);
            const avgReg = totalEvents > 0 ? Math.round(totalReg / totalEvents) : 0;

            const allAtt = evList.flatMap(e => e.attendance_records || []);
            const totalPresent = allAtt.filter(a => ['present', 'late'].includes(a.status)).length;
            const attendancePct = allAtt.length > 0 ? Math.round((totalPresent / allAtt.length) * 100) : 0;

            const allFb = evList.flatMap(e => e.feedback || []);
            const avgRating = allFb.length > 0 ? (allFb.reduce((s, f) => s + (f.rating || 0), 0) / allFb.length).toFixed(1) : 'N/A';

            const eventPerf = evList.slice(0, 10).map(e => ({
                name: e.title?.slice(0, 18),
                Registrations: e.registrations?.[0]?.count || 0,
                Attended: e.attendance_records?.filter(a => ['present', 'late'].includes(a.status)).length || 0,
            }));

            const { data: members } = await supabase.from('club_memberships')
                .select('joined_at, status').eq('club_id', clubId).eq('status', 'approved');
            
            const memberMap = {};
            (members || []).forEach(m => {
                if (!m.joined_at) return;
                const mo = getMonth(m.joined_at);
                if (!memberMap[mo]) memberMap[mo] = { name: mo, Members: 0 };
                memberMap[mo].Members++;
            });

            return {
                totalEvents, totalReg, avgReg, attendancePct, avgRating,
                totalMembers: members?.length || 0,
                eventPerf, memberGrowth: Object.values(memberMap).slice(-10),
            };
        }
    });
};

// ─── 👨‍🎓 STUDENT ANALYTICS (Personal Engagement) ─────────────────────────────────
export const useStudentAnalytics = () => {
    const { user } = useAuthStore();
    const userId = user?.id;

    return useQuery({
        queryKey: ['studentAnalytics', userId],
        enabled: !!userId,
        queryFn: async () => {
            const [regsRes, memberRes, certRes, feedbackRes, attRes] = await Promise.all([
                supabase.from('registrations').select('id, event_id, created_at').eq('user_id', userId),
                supabase.from('club_memberships').select('club_id, created_at, status').eq('user_id', userId).eq('status', 'approved'),
                supabase.from('certificates').select('cert_type, generated_at, status').eq('user_id', userId).eq('status', 'valid'),
                supabase.from('feedback').select('rating, created_at, event_id').eq('user_id', userId),
                supabase.from('attendance_records').select('status, created_at').eq('user_id', userId),
            ]);

            const regs = regsRes.data || [];
            const members = memberRes.data || [];
            const certs = certRes.data || [];
            const feedback = feedbackRes.data || [];
            const att = attRes.data || [];

            const attendedCount = att.filter(a => ['present', 'late'].includes(a.status)).length;
            const attRate = regs.length > 0 ? Math.round((attendedCount / regs.length) * 100) : 0;

            // Engagement Score Calculation
            const engScore = (attendedCount * 10) + (members.length * 5) + (certs.length * 8) + (feedback.length * 2);
            
            let engLevel = 'Beginner';
            if (engScore >= 200) engLevel = 'Campus Leader';
            else if (engScore >= 100) engLevel = 'Highly Active';
            else if (engScore >= 40) engLevel = 'Active';

            const thresholds = { 'Beginner': 40, 'Active': 100, 'Highly Active': 200, 'Campus Leader': 300 };
            const nextTarget = thresholds[engLevel] || 300;
            const engPct = Math.min(Math.round((engScore / nextTarget) * 100), 100);

            // Activity Trend (Last 6 Months)
            const now = new Date();
            const last6Months = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
                return d.toLocaleString('default', { month: 'short' });
            });

            const activityTrend = last6Months.map(month => {
                const regsInMonth = regs.filter(r => new Date(r.created_at).toLocaleString('default', { month: 'short' }) === month).length;
                const attInMonth = att.filter(a => new Date(a.created_at).toLocaleString('default', { month: 'short' }) === month && ['present', 'late'].includes(a.status)).length;
                const certsInMonth = certs.filter(c => new Date(c.generated_at).toLocaleString('default', { month: 'short' }) === month).length;
                return { name: month, Registrations: regsInMonth, Attended: attInMonth, Certs: certsInMonth };
            });

            // Cert Breakdown
            const certTypes = [];
            const certCounts = certs.reduce((acc, c) => {
                const type = c.cert_type || 'Participation';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});

            const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
            Object.entries(certCounts).forEach(([name, value], i) => {
                certTypes.push({ name, value, color: COLORS[i % COLORS.length] });
            });

            return {
                totalReg: regs.length,
                attended: attendedCount,
                attRate,
                clubsJoined: members.length,
                totalCerts: certs.length,
                feedbackCount: feedback.length,
                engScore,
                engLevel,
                engPct,
                activityTrend,
                certTypes,
                avgRating: feedback.length 
                    ? (feedback.reduce((s, f) => s + (f.rating || 0), 0) / feedback.length).toFixed(1) 
                    : 0,
            };
        }
    });
};
