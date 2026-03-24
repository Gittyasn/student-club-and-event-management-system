import { motion } from 'framer-motion';
import { Target, Users, ShieldCheck, Zap } from 'lucide-react';

const AboutSection = () => {
    const features = [
        {
            icon: Target,
            title: "Centralized Event Approval Workflow",
            description: "Streamlined event approval and management process for seamless coordination."
        },
        {
            icon: Users,
            title: "Real-time Attendance Tracking",
            description: "Live attendance monitoring and participation analytics at your fingertips."
        },
        {
            icon: Zap,
            title: "Automated Certificate Generation",
            description: "Instant generation and distribution of participation certificates."
        },
        {
            icon: ShieldCheck,
            title: "Analytics-driven Governance",
            description: "Data-backed insights for better decision making and club performance tracking."
        },
        {
            icon: ShieldCheck,
            title: "Secure Role-based Access Control",
            description: "Ensuring data privacy and operational integrity with defined user roles."
        }
    ];

    return (
        <section className="py-16 relative overflow-hidden bg-white dark:bg-background border-b border-border">
            {/* Theme-aware subtle tint background */}
            <div className="absolute inset-0 z-0 opacity-20 dark:opacity-[0.03] pointer-events-none"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, transparent 100%)' }}
            />
            {/* Light Theme blurs */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50/80 dark:hidden rounded-full blur-[120px] pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-50/80 dark:hidden rounded-full blur-[120px] pointer-events-none z-0" />

            <div className="container mx-auto px-4 md:px-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="text-primary font-black tracking-[0.2em] text-xs h-sub uppercase block mb-4">
                            About The Matrix
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black text-foreground mb-6 leading-[1.15] tracking-tighter">
                            Bridging the Gap Between <br />
                            <span className="text-primary italic font-serif">Engagement & Efficiency</span>
                        </h2>
                        <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-lg">
                            The Student Club & Event Management System is a centralized digital platform designed to streamline club operations, event management, and student participation across campus.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {features.map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary mt-1 border border-primary/20 shrink-0">
                                        <feature.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-foreground font-bold mb-1 tracking-tight">{feature.title}</h4>
                                        <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative w-full"
                    >
                        <div className="relative rounded-[32px] overflow-hidden border border-border shadow-2xl bg-slate-50 dark:bg-card/50 aspect-[4/3] flex flex-col p-8 sm:p-12">
                            <div className="flex-1 flex flex-col justify-center gap-6">
                                {/* Structural UI elements instead of image */}
                                <div className="p-5 bg-white dark:bg-background border border-border rounded-xl shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-foreground">Global Registry</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Active Student Network</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-primary text-xl tracking-tight">3,000+</p>
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-1">+12% Growth</p>
                                    </div>
                                </div>
                                <div className="p-5 bg-white dark:bg-background border border-border rounded-xl shadow-sm flex items-center justify-between ml-8">
                                    <div>
                                        <p className="font-bold text-foreground">Event Operations</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Successfully Executed</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-primary text-xl tracking-tight">200+</p>
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-1">100% Uptime</p>
                                    </div>
                                </div>
                                <div className="p-5 bg-white dark:bg-background border border-border rounded-xl shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-foreground">Club Organizations</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Approved Entities</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-primary text-xl tracking-tight">50+</p>
                                        <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1">Operating</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-border flex items-center gap-5">
                                <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg">
                                    98%
                                </div>
                                <div>
                                    <p className="text-foreground font-black uppercase tracking-widest text-xs mb-1">Success Protocol</p>
                                    <p className="text-muted-foreground text-sm font-medium">98% User Satisfaction across the university network.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default AboutSection;
