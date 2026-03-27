import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Layers3,
    Sparkles,
    Users,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { useJoinClub, useMyMemberships } from '@/hooks/useMemberships';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const badgeStyles = {
    category: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20',
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
    neutral: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
};

const scrollAreaClass = 'pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(59,130,246,0.55)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-blue-300/80 dark:[scrollbar-color:rgba(96,165,250,0.55)_transparent] dark:[&::-webkit-scrollbar-thumb]:bg-blue-400/50';

const formatEventDate = (date) => {
    if (!date) return 'Date to be announced';
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const formatEventTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const SectionCard = ({ title, subtitle, children, className = '', contentClassName = '' }) => (
    <Card className={`h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_12px_24px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900/95 ${className}`}>
        <CardHeader className="space-y-1 pb-1.5">
            <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">{title}</CardTitle>
            {subtitle ? (
                <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
            ) : null}
        </CardHeader>
        <CardContent className={`flex h-full min-h-0 flex-col px-5 pb-5 pt-0 ${contentClassName}`}>
            {children}
        </CardContent>
    </Card>
);

const StatTile = ({ icon: Icon, label, value, tintClass }) => (
    <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${tintClass}`}>
            <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
            <div className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">{value}</div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</div>
        </div>
    </div>
);

const ClubProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const joinClubMutation = useJoinClub();
    const { data: myMemberships } = useMyMemberships();

    const { data: club, isLoading, isError } = useQuery({
        queryKey: ['clubProfile', id],
        queryFn: async () => {
            const { data: clubData, error: clubError } = await supabase
                .from('clubs')
                .select(`
                    *,
                    category:club_categories(name),
                    coordinator:profiles!coordinator_id(full_name, email, avatar_url),
                    members:club_memberships(count),
                    events:events(count)
                `)
                .eq('id', id)
                .eq('status', 'active')
                .single();

            if (clubError) throw clubError;

            const { data: upcomingEvents } = await supabase
                .from('events')
                .select('id, title, start_time, event_type')
                .eq('club_id', id)
                .eq('approval_status', 'approved')
                .in('status', ['approved', 'open', 'registration_open', 'ongoing', 'completed'])
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
                .limit(8);

            return {
                ...clubData,
                memberCount: clubData.members?.[0]?.count || 0,
                eventCount: clubData.events?.[0]?.count || 0,
                upcomingEvents: upcomingEvents || [],
            };
        },
    });

    if (isLoading) {
        return (
            <div className="min-h-[70vh] bg-slate-50/70 px-4 py-8 dark:bg-slate-950">
                <div className="mx-auto flex max-w-6xl items-center justify-center rounded-3xl border border-slate-200 bg-white p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
                </div>
            </div>
        );
    }

    if (isError || !club) {
        return (
            <div className="min-h-[70vh] bg-slate-50/70 px-4 py-8 dark:bg-slate-950">
                <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Club not found</h1>
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                        This club profile is unavailable or no longer active.
                    </p>
                    <Button className="mt-6" onClick={() => navigate('/clubs')}>
                        Back to Clubs
                    </Button>
                </div>
            </div>
        );
    }

    const membershipStatus = myMemberships?.find((membership) => membership.club_id === club.id)?.status;
    const isStudent = profile?.role === 'student';
    const isCoordinator = profile?.role === 'coordinator' && profile?.club_id === club.id;

    const handleJoinClick = () => {
        if (!user) {
            toast.error('Please login to join.');
            navigate('/login');
            return;
        }

        if (!club.is_accepting_members) {
            toast.error('This club is not currently accepting new members.');
            return;
        }

        joinClubMutation.mutate({
            clubId: club.id,
            autoApprove: club.auto_approve_memberships,
        });
    };

    const clubVisual = club.logo_url || club.banner_url || '';
    const clubInitial = club.name?.charAt(0)?.toUpperCase() || 'C';

    const headerAction = isCoordinator ? (
        <Button className="w-full sm:w-auto" onClick={() => navigate('/coordinator')}>
            Open Dashboard
        </Button>
    ) : (isStudent || !user) ? (
        <Button
            className="w-full sm:w-auto"
            onClick={handleJoinClick}
            disabled={
                joinClubMutation.isPending ||
                membershipStatus === 'pending' ||
                membershipStatus === 'approved' ||
                !club.is_accepting_members
            }
        >
            {membershipStatus === 'approved'
                ? 'Already Joined'
                : membershipStatus === 'pending'
                    ? 'Request Pending'
                    : !club.is_accepting_members
                        ? 'Membership Closed'
                        : 'Join Club'}
        </Button>
    ) : null;

    return (
        <div className="h-[calc(100vh-4rem)] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_38%),linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.92))] px-3 py-3 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_32%),linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(15,23,42,0.96))] md:px-4 md:py-4">
            <div className="mx-auto flex h-full max-w-4xl flex-col rounded-[26px] border border-slate-200/80 bg-white/55 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/50">
                <Card className="mb-3 rounded-[22px] border border-slate-200/80 bg-white/95 shadow-[0_16px_32px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900/95">
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 flex-1 items-start gap-4">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-[0_12px_24px_rgba(15,23,42,0.12)] dark:border-slate-900 dark:bg-slate-950 md:h-20 md:w-20">
                                    {clubVisual ? (
                                        <img src={clubVisual} alt={club.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-semibold text-blue-600 dark:text-blue-300 md:text-2xl">
                                            {clubInitial}
                                        </span>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                        {club.category?.name ? (
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ${badgeStyles.category}`}>
                                                {club.category.name}
                                            </span>
                                        ) : null}
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ${club.status === 'active' ? badgeStyles.active : badgeStyles.neutral}`}>
                                            {club.status === 'active' ? 'Active' : club.status}
                                        </span>
                                    </div>

                                    <h1 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white md:text-[1.7rem]">
                                        {club.name}
                                    </h1>
                                    <p className="mt-1.5 max-w-3xl line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
                                        {club.description || 'This club is building its public profile and more details will be shared soon.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                                {headerAction}
                                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                    Club Profile
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid min-h-0 flex-1 auto-rows-fr gap-3 md:grid-cols-2">
                    <SectionCard
                        title="About the Organization"
                        subtitle="Overview and purpose of this club."
                    >
                        <div className={`max-h-28 flex-1 overflow-y-auto text-sm leading-6 text-slate-600 dark:text-slate-300 ${scrollAreaClass}`}>
                            <p className="whitespace-pre-line">
                                {club.description || 'No detailed club description has been published yet.'}
                            </p>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="At a Glance"
                        subtitle="Quick stats and activity summary."
                    >
                        <div className={`grid min-h-0 max-h-28 flex-1 gap-2.5 overflow-y-auto ${scrollAreaClass}`}>
                            <StatTile
                                icon={Users}
                                label="Active Members"
                                value={club.memberCount}
                                tintClass="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
                            />
                            <StatTile
                                icon={Layers3}
                                label="Events Hosted"
                                value={club.eventCount}
                                tintClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                            />
                            <StatTile
                                icon={Sparkles}
                                label="Established"
                                value={club.founded_year || 'N/A'}
                                tintClass="bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-300"
                            />
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Upcoming Events"
                        subtitle="Approved events published by this club."
                    >
                        <div className={`min-h-0 max-h-40 flex-1 space-y-2.5 overflow-y-auto ${scrollAreaClass}`}>
                            {club.upcomingEvents.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-center dark:border-slate-800 dark:bg-slate-950/60">
                                    <CalendarDays className="mx-auto mb-2 h-5 w-5 text-slate-400" />
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No upcoming events scheduled</h3>
                                    <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                        Check back later for the next activity from this club.
                                    </p>
                                </div>
                            ) : (
                                club.upcomingEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60 lg:flex-row lg:items-center lg:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <h3 className="truncate text-sm font-semibold text-slate-950 dark:text-white md:text-base">
                                                {event.title}
                                            </h3>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <CalendarDays className="h-3.5 w-3.5" />
                                                    {formatEventDate(event.start_time)}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Clock3 className="h-3.5 w-3.5" />
                                                    {formatEventTime(event.start_time) || 'Time TBD'}
                                                </span>
                                            </div>
                                        </div>

                                        <Button variant="outline" className="shrink-0" onClick={() => navigate(`/events/${event.id}`)}>
                                            View Event
                                            <ChevronRight className="ml-1 h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard title="Leadership" subtitle="Assigned coordinator and club contact.">
                        <div className={`min-h-0 max-h-40 flex-1 space-y-3 overflow-y-auto ${scrollAreaClass}`}>
                            {club.coordinator ? (
                                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                            {club.coordinator.avatar_url ? (
                                                <img
                                                    src={club.coordinator.avatar_url}
                                                    alt={club.coordinator.full_name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-base font-semibold text-blue-600 dark:text-blue-300">
                                                    {club.coordinator.full_name?.charAt(0)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-sm font-semibold text-slate-950 dark:text-white md:text-base">
                                                    {club.coordinator.full_name}
                                                </h3>
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Coordinator
                                                </span>
                                            </div>
                                            <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                                {club.coordinator.email || 'Primary coordinator for this club.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                            <Users className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white md:text-base">
                                                No coordinator assigned
                                            </h3>
                                            <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                                A coordinator has not been linked to this club profile yet.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isCoordinator ? (
                                <div className="mt-4 rounded-2xl border border-blue-200/80 bg-blue-50/80 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        Coordinator access
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-blue-600/90 dark:text-blue-200/80">
                                        Use the coordinator dashboard to review memberships, publish events, and manage participation.
                                    </p>
                                    <Button className="mt-4" onClick={() => navigate('/coordinator')}>
                                        Open Dashboard
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
};

export default ClubProfile;
