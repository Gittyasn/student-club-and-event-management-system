import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEvents } from '@/hooks/useEvents';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Calendar, MapPin, ArrowRight, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// UI-level Branding Standardizer
const standardizeName = (name) => {
    if (!name) return "";
    return name
        .replace(/AI Workshop/g, 'Smart Systems Workshop')
        .replace(/Machine Learning/g, 'Intelligent Systems')
        .replace(/AI/g, 'Smart Systems');
};

const UpcomingEvents = () => {
    const { data: events, isLoading } = useEvents({ status: ['registration_open', 'approved'], approval_status: 'approved' });
    const [searchTerm, setSearchTerm] = useState("");
    const { user } = useAuthStore();

    // Filter events
    const filteredEvents = (events || [])
        .filter(event => event.start_time && new Date(event.start_time) >= new Date())
        .filter(event =>
            event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (event.club?.name && event.club.name.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .slice(0, 6);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };
    const SkeletonCard = () => (
        <div className="h-[400px] rounded-2xl bg-card border border-border animate-pulse" />
    );

    return (
        <section className="py-16 relative bg-white dark:bg-background border-b border-border overflow-hidden">

            <div className="container mx-auto px-4 md:px-12 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                    <div>
                        <span className="text-primary font-bold tracking-widest text-xs uppercase mb-2 block">
                            Participate
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                            Upcoming Events
                        </h2>
                        <p className="text-muted-foreground text-base max-w-xl">
                            Discover workshops, hackathons, and seminars happening around you.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="w-full md:w-auto relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search events..."
                            className="bg-card border-border pl-10 w-full md:w-64 focus-visible:ring-primary text-foreground h-10 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        [1, 2, 3].map((i) => <SkeletonCard key={i} />)
                    ) : filteredEvents.length > 0 ? (
                        filteredEvents.map((event, idx) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1, duration: 0.5 }}
                            >
                                <div className="group h-full bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-xl flex flex-col">
                                    <div className="h-40 bg-muted relative overflow-hidden">
                                        <div className="w-full h-full bg-muted flex items-center justify-center">
                                            <Calendar className="w-10 h-10 text-slate-700" />
                                        </div>
                                        <div className="absolute top-3 right-3">
                                            <Badge className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-foreground border-0 text-[10px] px-2 py-0.5">
                                                {event.event_type}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="p-5 flex flex-col flex-grow">
                                        <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-wider mb-2">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(event.start_time)}
                                        </div>

                                        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                                            {standardizeName(event.title)}
                                        </h3>

                                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-border">
                                                <Users className="w-3 h-3 text-primary" />
                                                <span className="text-muted-foreground">
                                                    {(event.max_participants || 0) - (event.registrationsCount || 0) > 0 
                                                        ? `${(event.max_participants || 0) - (event.registrationsCount || 0)} Seats Left`
                                                        : "Registration Full"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-border">
                                                <MapPin className="w-3 h-3 text-primary" />
                                                <span className="text-muted-foreground">
                                                    {event.mode === 'online' ? 'Online' : event.mode === 'hybrid' ? 'Hybrid' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-muted-foreground text-xs line-clamp-2 mb-4 flex-grow">
                                            {standardizeName(event.short_description || event.description || "No description provided.")}
                                        </p>

                                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground mb-4 border-t border-border pt-3">
                                            {event.location && (
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-3 h-3" />
                                                    <span className="line-clamp-1">{event.location}</span>
                                                </div>
                                            )}
                                            {event.club && (
                                                <div className="flex items-center gap-1.5 ml-auto">
                                                    <Users className="w-3 h-3" />
                                                    <span className="line-clamp-1">{standardizeName(event.club.name)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <Button className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground mt-auto h-9 text-xs" variant="secondary" asChild>
                                            <Link to={user ? `/events/${event.id}` : '/login'}>
                                                Register <ArrowRight className="w-3 h-3 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-16 text-center bg-card/30 rounded-xl border border-dashed border-border">
                            <div className="h-14 w-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-6 h-6 text-slate-600" />
                            </div>
                            <h3 className="text-lg text-foreground font-bold mb-2">No Upcoming Events</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto text-sm">
                                We couldn&apos;t find any events matching your criteria. Check back later or try a different search.
                            </p>
                            <Button variant="link" className="text-primary mt-2 text-xs" onClick={() => setSearchTerm("")}>
                                Clear Search
                            </Button>
                        </div>
                    )}
                </div>

                <div className="mt-12 text-center">
                    <Button variant="outline" size="lg" className="h-12 px-8 rounded-full border-border text-foreground hover:bg-white/5 hover:scale-105 transition-all text-sm" asChild>
                        <Link to="/events">Explore All Events</Link>
                    </Button>
                </div>
            </div >
        </section >
    );
};

export default UpcomingEvents;
