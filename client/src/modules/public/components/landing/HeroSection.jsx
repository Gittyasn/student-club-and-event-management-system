import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const HeroSection = () => {
    const { profile } = useAuthStore();
    return (
        <section className="relative overflow-hidden bg-slate-50 dark:bg-background py-10 md:py-16 border-b border-border min-h-[50vh] flex items-center">
            {/* Unique Background Theme: Grid Pattern + Soft Blobs */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Light Mode Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] dark:hidden" />
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-50 blur-[100px] dark:hidden" />

                {/* Dark Mode Mesh Gradient Overlay */}
                <div
                    className="absolute inset-0 hidden dark:block opacity-[0.08]"
                    style={{
                        backgroundImage: `
                            radial-gradient(at 0% 0%, hsla(222, 100%, 95%, 1) 0px, transparent 50%),
                            radial-gradient(at 100% 0%, hsla(262, 100%, 95%, 1) 0px, transparent 50%),
                            radial-gradient(at 100% 100%, hsla(222, 100%, 98%, 1) 0px, transparent 50%),
                            radial-gradient(at 0% 100%, hsla(210, 100%, 96%, 1) 0px, transparent 50%)
                        `
                    }}
                />

                {/* Light Mode Specific Soft Animated Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 dark:bg-primary/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-400/10 dark:bg-purple-500/20 rounded-full blur-[120px]" />
                <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-sky-300/10 dark:hidden rounded-full blur-[100px]" />

                <div className="absolute inset-0 z-0 bg-transparent dark:bg-background/20" />
            </div>

            <div className="container mx-auto px-4 md:px-12 relative z-20">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    className="max-w-3xl mx-auto text-center"
                >
                    {/* Trust badge */}
                    <div className="inline-flex items-center gap-2 border border-gold/30 rounded-full px-4 py-1.5 mb-8 bg-gold/5 backdrop-blur-sm shadow-sm transition-all hover:bg-gold/10">
                        <div className="w-1.5 h-1.5 bg-[#FFD700] rounded-full animate-pulse shadow-[0_0_8px_#FFD700]" />
                        <span className="text-[10px] font-black text-gold-solid tracking-[0.25em] uppercase">
                            Live Platform - <span className="text-gold">NEXTGEN EDUTECH UNIVERSITY</span>
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl mb-6 text-balance font-bold tracking-tight leading-[1.1] text-foreground">
                        Empowering Campus Innovation <br />
                        <span className="text-primary italic">
                            Through Smart Club & Event Management
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground/80 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
                        A centralized platform to manage clubs, organize events, track participation, and enhance student engagement seamlessly.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button size="lg" className="h-11 px-7 text-sm font-semibold rounded-md shadow-sm" asChild>
                            <Link to="/events">
                                Explore Events <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        {!profile ? (
                            <Button size="lg" variant="outline" className="h-11 px-7 text-sm font-semibold rounded-md" asChild>
                                <Link to="/login">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Login / Register
                                </Link>
                            </Button>
                        ) : (
                            <Button size="lg" variant="outline" className="h-11 px-7 text-sm font-semibold rounded-md" asChild>
                                <Link to={profile?.role === 'admin' ? '/admin' : profile?.role === 'coordinator' ? '/coordinator' : '/student'}>
                                    Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        )}
                    </div>

                    <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-muted-foreground text-xs font-medium divide-x divide-border">
                        <div className="px-4 text-center">
                            <div className="text-2xl font-bold text-foreground mb-0.5">50+</div>
                            Active Clubs
                        </div>
                        <div className="px-4 text-center">
                            <div className="text-2xl font-bold text-foreground mb-0.5">200+</div>
                            Events Hosted
                        </div>
                        <div className="px-4 text-center">
                            <div className="text-2xl font-bold text-foreground mb-0.5">3,000+</div>
                            Students Enrolled
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default HeroSection;
