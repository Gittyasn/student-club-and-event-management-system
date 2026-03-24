import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useClubs } from '../../hooks/useClubs';
import { useAuthStore } from '../../store/authStore';
import { useJoinClub, useMyMemberships } from '../../hooks/useMemberships';
import { toast } from 'sonner';
import { Users, Search, ExternalLink, ShieldCheck, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';

const Clubs = () => {
    const { data: clubs, isLoading, error } = useClubs();
    const { user, profile } = useAuthStore();
    const navigate = useNavigate();
    const joinClubMutation = useJoinClub();
    const { data: myMemberships } = useMyMemberships();
    const [searchTerm, setSearchTerm] = useState('');
    const [joiningClubId, setJoiningClubId] = useState(null);

    const getMembershipStatus = (clubId) => {
        return myMemberships?.find(m => m.club_id === clubId)?.status;
    };

    const handleJoinClick = (club) => {
        if (!user) {
            toast.error("Please login to join a club");
            navigate('/login');
            return;
        }
        setJoiningClubId(club.id);
        joinClubMutation.mutate(
            { clubId: club.id, autoApprove: club.auto_approve_memberships },
            { onSettled: () => setJoiningClubId(null) }
        );
    };

    const filteredClubs = clubs?.filter(club =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved': return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">Member</Badge>;
            case 'pending': return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-200">Pending</Badge>;
            case 'rejected': return <Badge variant="destructive">Denied</Badge>;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header Section */}
            <div className="border-b border-border relative overflow-hidden bg-muted/20">
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
                            Our Communities
                        </span>
                        <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-3 leading-tight">
                            Student Clubs
                        </h1>
                        <p className="text-muted-foreground text-base md:text-lg max-w-xl">
                            Join vibrant communities, learn new skills, and collaborate on projects that matter.
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="container mx-auto px-4 md:px-12 py-8">
                {/* Search & Actions */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search clubs, categories, or missions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 bg-background border-border rounded-lg"
                        />
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-64 rounded-xl border border-border bg-card/50 animate-pulse" />
                        ))}
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Sync Error</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">{error?.message || 'Unable to fetch club data.'}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 text-xs text-primary underline underline-offset-2"
                        >Try again</button>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && filteredClubs.length === 0 && (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No Clubs Found</h3>
                        <p className="text-muted-foreground">No communities match your search parameters.</p>
                    </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClubs.map((club, idx) => {
                        const status = getMembershipStatus(club.id);
                        const isStudent = profile?.role === 'student';

                        return (
                            <motion.div
                                key={club.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05, duration: 0.4 }}
                                className="group relative"
                            >
                                <div className="h-full bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all flex flex-col p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                                                <AvatarImage src={club.logo_url} />
                                                <AvatarFallback className="bg-muted text-primary font-bold text-xl">
                                                    {club.name.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {getStatusBadge(status)}
                                            {club.category?.name && (
                                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold">
                                                    {club.category.name}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-tight">
                                        {club.name}
                                    </h3>

                                    <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-grow leading-relaxed">
                                        {club.description || "No mission statement defined for this collective."}
                                    </p>

                                    <div className="flex items-center gap-4 mb-6 text-xs text-muted-foreground font-medium pt-4 border-t border-border">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-primary" />
                                            <span>{club.members_count || 0} Members</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Trophy className="w-3.5 h-3.5 text-primary" />
                                            <span>{club.events_count || 0} Events</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            asChild
                                            variant="outline"
                                            className="flex-1 h-10 font-bold text-xs rounded-lg"
                                        >
                                            <Link to={`/clubs/${club.id}`}>
                                                Profile <ExternalLink className="ml-1.5 w-3 h-3" />
                                            </Link>
                                        </Button>

                                        {(isStudent || !user) && !status && (
                                            <Button
                                                className="flex-1 h-10 font-bold text-xs rounded-lg shadow-sm"
                                                onClick={() => handleJoinClick(club)}
                                                disabled={joiningClubId === club.id}
                                            >
                                                {joiningClubId === club.id ? 'Syncing...' : 'Join Collective'}
                                            </Button>
                                        )}

                                        {!isStudent && user && (
                                            <div className="flex-1 flex items-center justify-center">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                                    {profile?.role} Clearance
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Clubs;
