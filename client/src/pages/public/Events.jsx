import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, Search, Filter, MapPin, Laptop, Ticket, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { rebrandName } from '../../utils/rebrand';

const Events = () => {
    const { data: events, isLoading, error } = useEvents({ approval_status: 'approved' });
    const [searchTerm, setSearchTerm] = useState('');
    const [eventTypeFilter, setEventTypeFilter] = useState('all');
    const [modeFilter, setModeFilter] = useState('all');

    const filterTypes = ['all', 'normal', 'hackathon', 'workshop', 'competition'];
    const filterModes = ['all', 'offline', 'online'];

    let filteredEvents = (events || []).filter((event) => {
        const matchesSearch = event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.short_description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = eventTypeFilter === 'all' || event.event_type === eventTypeFilter;
        const matchesMode = modeFilter === 'all' || event.mode === modeFilter;
        return matchesSearch && matchesType && matchesMode;
    });

    // Sort by start_time ascending
    filteredEvents = filteredEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    const formatDate = (dateStr) => {
        if (!dateStr) return 'TBD';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'hackathon': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';
            case 'workshop': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            case 'competition': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Header */}
            <div className="border-b border-border relative overflow-hidden bg-muted/20">
                {/* Subtle Theme-aware background tint */}
                <div className="absolute inset-0 z-0 opacity-[0.05] dark:opacity-[0.03] pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, transparent 100%)' }}
                />

                <div className="container mx-auto px-4 md:px-12 py-12 md:py-16 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <span className="text-primary font-bold tracking-widest text-xs uppercase mb-3 block">
                            NEXTGEN EDUTECH UNIVERSITY
                        </span>
                        <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-3 leading-tight">
                            Upcoming Events
                        </h1>
                        <p className="text-muted-foreground text-base md:text-lg max-w-xl">
                            Discover hackathons, workshops, and more. Join events, build skills, and earn certificates.
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="container mx-auto px-4 md:px-12 py-8">
                {/* Search & Filters */}
                <div className="flex flex-col gap-3 mb-8">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search events..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 bg-background border-border rounded-lg"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1 mr-2">
                            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-medium">Type:</span>
                        </div>
                        {filterTypes.map(type => (
                            <button
                                key={type}
                                onClick={() => setEventTypeFilter(type)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all capitalize ${eventTypeFilter === type
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
                                    }`}
                            >
                                {type === 'all' ? 'All Types' : type}
                            </button>
                        ))}
                        <div className="flex items-center gap-1 mx-2">
                            <span className="text-xs text-muted-foreground font-medium">Mode:</span>
                        </div>
                        {filterModes.map(mode => (
                            <button
                                key={mode}
                                onClick={() => setModeFilter(mode)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all capitalize ${modeFilter === mode
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
                                    }`}
                            >
                                {mode === 'all' ? 'All Modes' : mode}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
                                <div className="h-48 bg-muted" />
                                <div className="p-5 space-y-3">
                                    <div className="h-4 bg-muted rounded w-1/3" />
                                    <div className="h-6 bg-muted rounded w-3/4" />
                                    <div className="h-4 bg-muted rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                            <Calendar className="h-8 w-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">Unable to Load Events</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mb-6">
                            Events are visible after logging in. Please log in or register to browse all available events.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" asChild>
                                <Link to="/login">Log In</Link>
                            </Button>
                            <Button asChild>
                                <Link to="/register">Register Free</Link>
                            </Button>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && filteredEvents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Ticket className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">No Events Found</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mb-6">
                            {searchTerm || eventTypeFilter !== 'all' || modeFilter !== 'all'
                                ? 'Try adjusting your filters to find more events.'
                                : 'No upcoming public events right now. Check back soon or register to see all events!'}
                        </p>
                        {(searchTerm || eventTypeFilter !== 'all' || modeFilter !== 'all') && (
                            <Button variant="outline" onClick={() => { setSearchTerm(''); setEventTypeFilter('all'); setModeFilter('all'); }}>
                                Clear Filters
                            </Button>
                        )}
                    </div>
                )}

                {/* Events Grid */}
                {!isLoading && !error && filteredEvents.length > 0 && (
                    <>
                        <p className="text-sm text-muted-foreground mb-5 font-medium">
                            Showing <span className="text-foreground font-bold">{filteredEvents.length}</span> event{filteredEvents.length !== 1 ? 's' : ''}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredEvents.map((event, idx) => {
                                const isFull = event.max_participants && event.registrationsCount >= event.max_participants;
                                const seatsLeft = event.max_participants ? event.max_participants - event.registrationsCount : null;

                                return (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05, duration: 0.4 }}
                                        className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all flex flex-col"
                                    >
                                        {/* Event Image */}
                                        <div className="relative h-48 overflow-hidden bg-muted">
                                            <img
                                                src={event.poster_url || 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?auto=format&fit=crop&q=80&w=600'}
                                                alt={event.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?auto=format&fit=crop&q=80&w=600'; }}
                                            />
                                            {/* Overlay badges */}
                                            <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md capitalize ${getTypeColor(event.event_type)}`}>
                                                    {event.event_type || 'Event'}
                                                </span>
                                                {isFull ? (
                                                    <span className="bg-red-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">FULL</span>
                                                ) : seatsLeft !== null && seatsLeft <= 10 ? (
                                                    <span className="bg-orange-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">{seatsLeft} left</span>
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* Card Content */}
                                        <div className="p-5 flex flex-col flex-grow">
                                            <h3 className="text-base font-bold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                                {rebrandName(event.title)}
                                            </h3>

                                            {event.short_description && (
                                                <p className="text-muted-foreground text-sm leading-relaxed mb-3 line-clamp-2">
                                                    {event.short_description}
                                                </p>
                                            )}

                                            <div className="space-y-1.5 mt-auto mb-4 text-xs text-muted-foreground">
                                                {event.start_time && (
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                                                        <span>{formatDate(event.start_time)} · {formatTime(event.start_time)}</span>
                                                    </div>
                                                )}
                                                {event.club?.name && (
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                                                        <span className="truncate">{rebrandName(event.club?.name)}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    {event.mode === 'online' ? (
                                                        <Laptop className="h-3.5 w-3.5 text-primary shrink-0" />
                                                    ) : (
                                                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                                                    )}
                                                    <span className="capitalize">{event.mode || 'In-person'}{event.location ? ` · ${event.location}` : ''}</span>
                                                </div>
                                            </div>

                                            <Button
                                                asChild
                                                className="w-full h-9 text-sm font-semibold rounded-lg"
                                                variant={isFull ? 'outline' : 'default'}
                                            >
                                                <Link to={`/events/${event.id}`}>
                                                    {isFull ? 'View Details' : 'View & Register'}
                                                    <ChevronRight className="ml-1 h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Events;
