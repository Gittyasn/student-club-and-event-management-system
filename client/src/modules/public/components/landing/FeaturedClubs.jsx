import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Trophy } from 'lucide-react';
import { useClubs } from '@/hooks/useClubs';

const SkeletonCard = () => (
    <div className="h-[400px] rounded-xl bg-card/50 border border-border animate-pulse" />
);

const getStableRandom = (seed, min, max) => {
    const charCode = seed ? seed.toString().charCodeAt(0) : 0;
    return (charCode % (max - min)) + min;
};

const getInitials = (name) => {
    if (!name) return "CL";
    const parts = name.trim().split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase() || "CL";
};

// UI-level Branding Standardizer
const standardizeName = (name) => {
    if (!name) return "";
    return name
        .replace(/AI & Data Science Club/g, 'Smart Analytics Club')
        .replace(/Robotics & AI League/g, 'Robotics & Automation League')
        .replace(/AI Workshop/g, 'Smart Systems Workshop')
        .replace(/AI/g, 'Smart Systems');
};

const FeaturedClubs = () => {
    const { data: clubs, isLoading } = useClubs();

    // Select top 3 clubs or random 3 for display
    const displayedClubs = clubs ? clubs.slice(0, 3) : [];

    return (
        <section className="py-16 relative overflow-hidden bg-slate-50 dark:bg-background border-b border-border">

            <div className="container mx-auto px-4 md:px-12 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                    <div>
                        <span className="text-primary font-bold tracking-widest text-xs uppercase mb-2 block">
                            Community
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                            Featured Clubs
                        </h2>
                        <p className="text-muted-foreground text-base max-w-xl">
                            Join vibrant communities, learn new skills, and collaborate on projects that matter.
                        </p>
                    </div>
                    <Link
                        to="/clubs"
                        className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all duration-300"
                    >
                        View All Clubs <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        [1, 2, 3].map((i) => <SkeletonCard key={i} />)
                    ) : (
                        displayedClubs.map((club, idx) => (
                            <motion.div
                                key={club.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1, duration: 0.5 }}
                            >
                                <Link to={`/clubs/${club.id}`} className="group block h-full">
                                    <div className="h-full relative overflow-hidden rounded-xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-primary/30">
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="p-6 flex flex-col h-full relative z-10">
                                            <div className="flex items-start justify-between mb-4">
                                            <div className="h-12 w-12 rounded-lg bg-white/5 border border-border flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <span className="text-sm font-extrabold tracking-wider text-primary">
                                                    {getInitials(standardizeName(club.name))}
                                                </span>
                                            </div>
                                                <span className="bg-white/5 border border-border text-[10px] font-semibold px-2 py-1 rounded-full text-muted-foreground">
                                                    {club.category?.name || "Technology"}
                                                </span>
                                            </div>

                                            <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                                {standardizeName(club.name)}
                                            </h3>

                                            <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-grow">
                                                {club.description?.replace(/AI/gi, 'Smart Systems').replace(/artificial intelligence/gi, 'intelligent systems') || "A community of passionate learners and creators driven to innovate."}
                                            </p>

                                            <div className="flex items-center gap-4 pt-4 border-t border-border text-xs text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3.5 h-3.5" />
                                                    <span>{club.members_count || getStableRandom(club.id, 20, 70)}+ Members</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Trophy className="w-3.5 h-3.5" />
                                                    <span>{club.events_count || getStableRandom(club.id, 5, 15)}+ Events</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
};

export default FeaturedClubs;
