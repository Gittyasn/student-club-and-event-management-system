import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, MapPin, Users, Laptop, Lock, CheckCircle2,
    ArrowLeft, Info, Trophy, Code, ClipboardList,
    BarChart2, Share2, Heart, ExternalLink, Timer, LayoutGrid, List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEventById } from '../../hooks/useEventById';
import { useAuthStore } from '../../store/authStore';
import { useRegisterEvent, useMyRegistrations } from '../../hooks/useMyRegistrations';
import { useCheckFeedback } from '../../hooks/useFeedback';
import { toast } from 'sonner';

// Hackathon Components
import TeamRegistration from '../../modules/hackathon/TeamRegistration';
import TeamDashboard from '../../modules/hackathon/TeamDashboard';
import SubmissionPage from '../../modules/hackathon/SubmissionPage';
import JudgePanel from '../../modules/hackathon/JudgePanel';
import Leaderboard from '../../modules/hackathon/Leaderboard';
import HackathonAnalytics from '../../modules/hackathon/HackathonAnalytics';

// Hackathon Hooks
import { useUserTeam } from '../../hooks/useTeams';
import { useHackathonRounds, useHackathonSubmissions, useHackathonJudges } from '../../hooks/useHackathon';

const EventDetails = ({ publicOnly = true }) => {
    const { id } = useParams();
    const { data: event, isLoading, error } = useEventById(id, { publicOnly });
    const { user, profile } = useAuthStore();
    const navigate = useNavigate();
    const registerMutation = useRegisterEvent();
    const { registrations } = useMyRegistrations();
    const { data: hasSubmittedFeedback } = useCheckFeedback(event?.id, user?.id);

    const isRegistered = registrations?.some(r => r.event_id === event?.id && (r.status === 'registered' || r.status === 'waitlisted'));
    const isWaitlisted = registrations?.some(r => r.event_id === event?.id && r.status === 'waitlisted');

    // Hackathon Logic
    const isHackathon = event?.event_type === 'hackathon';
    const { data: userTeam } = useUserTeam(event?.id, user?.id);
    const { data: rounds } = useHackathonRounds(event?.id);
    const { data: judges } = useHackathonJudges(event?.id);
    const { data: submissions } = useHackathonSubmissions(event?.id, rounds?.[0]?.id);

    const isJudge = judges?.some(j => j.id === user?.id) || profile?.role === 'coordinator' || profile?.role === 'admin';

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground animate-pulse font-medium">Loading event details...</p>
        </div>
    );

    if (error || !event) return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <Info className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Event unavailable</h2>
            <p className="text-muted-foreground max-w-sm mb-8">This event is not public or could not be found.</p>
            <Button asChild variant="outline">
                <RouterLink to="/events"><ArrowLeft className="mr-2 w-4 h-4" /> Back to Events</RouterLink>
            </Button>
        </div>
    );

    const handleRegister = () => {
        if (!user) {
            toast.error("Please log in to register for this event.");
            navigate('/login');
            return;
        }
        if (profile?.role !== 'student') {
            toast.error("Only student accounts can register for events.");
            return;
        }
        registerMutation.mutate(event.id);
    };

    const isFull = (event.registrations?.[0]?.count || 0) >= (event.max_participants || 0);
    const isPastDeadline = event.registration_deadline && new Date(event.registration_deadline) < new Date();
    const isOpen = event.status === 'registration_open';

    let buttonText = "Register Now";
    let isDisabled = false;

    if (!isOpen) {
        buttonText = "Registration Closed";
        isDisabled = true;
    } else if (isRegistered) {
        buttonText = isWaitlisted ? "On Waitlist" : "Registered";
        isDisabled = true;
    } else if (isPastDeadline) {
        buttonText = "Deadline Expired";
        isDisabled = true;
    } else if (isFull) {
        if (event.allow_waitlist) {
            buttonText = "Join Waitlist";
            isDisabled = false;
        } else {
            buttonText = "Capacity Reached";
            isDisabled = true;
        }
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="container mx-auto px-4 md:px-12 pt-8">
                <Button
                    asChild
                    variant="ghost"
                    className="mb-8 hover:bg-muted font-bold text-muted-foreground hover:text-foreground transition-all"
                >
                    <RouterLink to="/events">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Back to Events
                    </RouterLink>
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Main Content Area */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Event Hero Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card border border-border rounded-[32px] overflow-hidden shadow-2xl relative"
                        >
                            <div className="relative h-[450px]">
                                <img
                                    src={event.poster_url || 'https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?q=80&w=2070&auto=format&fit=crop'}
                                    alt={event.title}
                                    onError={(e) => {
                                        e.target.src = 'https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?q=80&w=2070&auto=format&fit=crop';
                                    }}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent z-10" />

                                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-20">
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        <Badge className="bg-primary hover:bg-primary/90 text-[#0f172a] font-black tracking-widest uppercase py-1 px-4">
                                            {event.event_type}
                                        </Badge>
                                        <Badge variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-md py-1 px-4 font-bold">
                                            {event.mode === 'online' ? <Laptop className="mr-2 w-4 h-4 inline" /> : <MapPin className="mr-2 w-4 h-4 inline" />}
                                            {event.mode}
                                        </Badge>
                                    </div>
                                    <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter leading-tight">
                                        {event.title}
                                    </h1>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border border-white/20">
                                            <AvatarImage src={event.club?.logo_url} />
                                            <AvatarFallback className="bg-white/10 text-white font-bold">
                                                {event.club?.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-white/80 font-medium tracking-wide">
                                            Hosted by <span className="text-white font-black">{event.club?.name || 'Independent Club'}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 md:p-12 space-y-8">
                                <div>
                                    <h3 className="text-primary font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                                        <Info className="w-5 h-5" /> Event Overview
                                    </h3>
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-line">
                                            {event.description || "Event details will be updated soon."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Hackathon Workspace Implementation */}
                        {isHackathon && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-card border border-border rounded-[32px] overflow-hidden p-8 md:p-12"
                            >
                                <Tabs defaultValue="workspace" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-muted/50 rounded-2xl mb-10">
                                        <TabsTrigger value="workspace" className="py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-[#0f172a] font-black text-xs uppercase tracking-widest transition-all">
                                            <Code className="mr-2 w-4 h-4" /> Workspace
                                        </TabsTrigger>
                                        <TabsTrigger value="leaderboard" className="py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-[#0f172a] font-black text-xs uppercase tracking-widest transition-all">
                                            <Trophy className="mr-2 w-4 h-4" /> Leaderboard
                                        </TabsTrigger>
                                        {isJudge && (
                                            <TabsTrigger value="judging" className="py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-[#0f172a] font-black text-xs uppercase tracking-widest transition-all">
                                                <ClipboardList className="mr-2 w-4 h-4" /> Judging
                                            </TabsTrigger>
                                        )}
                                        {(profile?.role === 'coordinator' || profile?.role === 'admin') && (
                                            <TabsTrigger value="analytics" className="py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-[#0f172a] font-black text-xs uppercase tracking-widest transition-all">
                                                <BarChart2 className="mr-2 w-4 h-4" /> Analytics
                                            </TabsTrigger>
                                        )}
                                    </TabsList>

                                    <AnimatePresence mode="wait">
                                        <TabsContent value="workspace" className="min-h-[400px]">
                                            {!isRegistered ? (
                                                <div className="py-20 text-center space-y-4">
                                                    <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                                                    <h3 className="text-2xl font-black">Registration Required</h3>
                                                    <p className="text-muted-foreground">Register for this event to access the team workspace.</p>
                                                </div>
                                            ) : userTeam ? (
                                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                                    <div className="lg:col-span-2">
                                                        <TeamDashboard team={userTeam} event={event} onAction={() => { }} />
                                                    </div>
                                                    <div className="lg:col-span-3">
                                                        <SubmissionPage eventId={event.id} teamId={userTeam.id} roundId={rounds?.[0]?.id} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <TeamRegistration eventId={event.id} onSuccess={() => { }} />
                                            )}
                                        </TabsContent>
                                        <TabsContent value="leaderboard">
                                            <Leaderboard eventId={event.id} roundId={rounds?.[0]?.id} submissions={submissions} />
                                        </TabsContent>
                                        <TabsContent value="judging">
                                            <JudgePanel eventId={event.id} roundId={rounds?.[0]?.id} />
                                        </TabsContent>
                                        <TabsContent value="analytics">
                                            <HackathonAnalytics event={event} teams={[]} submissions={submissions} rounds={rounds} />
                                        </TabsContent>
                                    </AnimatePresence>
                                </Tabs>
                            </motion.div>
                        )}
                    </div>

                    {/* Sidebar Area */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Registration Sidebar */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-[32px] p-8 shadow-xl"
                        >
                            <h3 className="text-[#0f172a] dark:text-primary font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                                <LayoutGrid className="w-5 h-5" /> Registration
                            </h3>

                            {isRegistered && (
                                <div className={`flex items-center gap-3 p-4 rounded-2xl mb-6 ${isWaitlisted ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-green-500/10 text-green-600 border border-green-500/20'}`}>
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                    <span className="font-black text-sm uppercase tracking-wide">
                                        {isWaitlisted ? 'You are on the waitlist' : 'You are registered'}
                                    </span>
                                </div>
                            )}

                            <Button
                                size="lg"
                                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                                onClick={handleRegister}
                                disabled={isDisabled || registerMutation.isPending}
                                variant={isFull && event.allow_waitlist && !isRegistered ? "outline" : "default"}
                            >
                                {registerMutation.isPending ? 'Submitting...' : buttonText}
                            </Button>

                            <div className="mt-6 flex flex-col gap-3">
                                <Button
                                    variant="outline"
                                    className="w-full h-12 rounded-xl font-bold text-xs uppercase tracking-wider"
                                    onClick={() => navigate(`/events/${event.id}/results`)}
                                >
                                    View Results
                                </Button>
                                {profile?.role === 'student' && registrations?.find(r => r.event_id === event.id)?.attendance_status === 'present' && !hasSubmittedFeedback && (
                                    <Button
                                        variant="secondary"
                                        className="w-full h-12 rounded-xl font-bold text-xs uppercase tracking-wider"
                                        onClick={() => navigate(`/student/events/${event.id}/feedback`)}
                                    >
                                        Share Feedback
                                    </Button>
                                )}
                            </div>

                            {isHackathon && isRegistered && !userTeam && (
                                <p className="mt-4 text-xs text-center text-muted-foreground font-medium italic">
                                    You&apos;re registered. Create or join a team to continue.
                                </p>
                            )}
                        </motion.div>

                        {/* Details Sidebar */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-card border border-border rounded-[32px] p-8 shadow-lg"
                        >
                            <h3 className="text-foreground font-black uppercase tracking-widest text-sm mb-8 flex items-center gap-2">
                                <List className="w-5 h-5" /> Event Details
                            </h3>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <Clock className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Schedule</p>
                                        <p className="text-sm font-bold">{new Date(event.start_time).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>

                                <Separator className="opacity-50" />

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                                        <MapPin className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Location</p>
                                        <p className="text-sm font-bold truncate">
                                            {event.mode === 'online' ? (
                                                event.meeting_link ? (
                                                    <a href={event.meeting_link} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                                        Join Meeting <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ) : 'Link will be shared soon'
                                            ) : (event.location || 'TBA')}
                                        </p>
                                    </div>
                                </div>

                                <Separator className="opacity-50" />

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                                        <Timer className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Registration Deadline</p>
                                        <p className="text-sm font-bold">
                                            {event.registration_deadline ? new Date(event.registration_deadline).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No deadline set'}
                                        </p>
                                    </div>
                                </div>

                                <Separator className="opacity-50" />

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                        <Users className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div className="w-full">
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Capacity</p>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold">{event.registrations?.[0]?.count || 0} / {event.max_participants || '\u221E'} registered</span>
                                            <span className="text-[10px] font-black text-muted-foreground">{Math.round(((event.registrations?.[0]?.count || 0) / (event.max_participants || 1)) * 100)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-1000"
                                                style={{ width: `${Math.min(100, ((event.registrations?.[0]?.count || 0) / (event.max_participants || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1 rounded-2xl h-12 hover:bg-muted group">
                                <Share2 className="mr-2 w-4 h-4 group-hover:text-primary" /> Share
                            </Button>
                            <Button variant="outline" className="flex-1 rounded-2xl h-12 hover:bg-muted group text-red-500 hover:text-red-600">
                                <Heart className="mr-2 w-4 h-4 group-hover:fill-current" /> Favorite
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetails;
