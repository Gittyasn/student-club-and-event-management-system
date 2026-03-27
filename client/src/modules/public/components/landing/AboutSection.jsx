import { motion } from 'framer-motion';
import { Target, Users, ShieldCheck, Zap } from 'lucide-react';

const AboutSection = () => {
    const features = [
        {
            icon: Target,
            color: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/20',
            title: "Centralized Event Approval Workflow",
            description: "Keep reviews, status changes, and publishing in one clear workflow."
        },
        {
            icon: Users,
            color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
            title: "Real-time Attendance Tracking",
            description: "Track participation live and keep attendance records accurate."
        },
        {
            icon: Zap,
            color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/20',
            title: "Automated Certificate Generation",
            description: "Generate and deliver certificates without manual follow-up work."
        },
        {
            icon: ShieldCheck,
            color: 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/20',
            title: "Analytics-driven Governance",
            description: "Use clean insights to improve club operations and student engagement."
        }
    ];

    return (
        <section className="py-12 relative overflow-hidden bg-white dark:bg-background border-b border-border">
            {/* Theme-aware subtle tint background */}
            <div className="absolute inset-0 z-0 opacity-20 dark:opacity-[0.03] pointer-events-none"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, transparent 100%)' }}
            />
            {/* Light Theme blurs */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50/80 dark:hidden rounded-full blur-[120px] pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-50/80 dark:hidden rounded-full blur-[120px] pointer-events-none z-0" />

            <div className="container mx-auto px-4 md:px-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="text-primary font-black tracking-[0.2em] text-xs h-sub uppercase block mb-4">
                            Why It Works
                        </span>
                        <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4 leading-[1.12] tracking-tighter">
                            Campus coordination with <br />
                            <span className="text-primary italic font-serif">engagement and efficiency</span>
                        </h2>
                        <p className="text-muted-foreground text-base leading-7 mb-8 max-w-lg">
                            The platform brings club management, event execution, approvals, attendance, certificates, and reporting into one practical workflow for campus teams.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {features.map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-3 rounded-2xl border border-border bg-background/80 p-4">
                                    <div className={`p-2.5 rounded-xl mt-0.5 border shrink-0 ${feature.color}`}>
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
                        <div className="relative rounded-[28px] overflow-hidden border border-border shadow-2xl bg-slate-50 dark:bg-card/50 aspect-[4/3] flex flex-col p-6 sm:p-8">
                            <div className="flex-1 flex flex-col justify-center gap-4">
                                {/* Structural UI elements instead of image */}
                                <div className="p-4 bg-white dark:bg-background border border-border rounded-xl shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-foreground">Global Registry</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Active Student Network</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-primary text-xl tracking-tight">3,000+</p>
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-1">+12% Growth</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-white dark:bg-background border border-border rounded-xl shadow-sm flex items-center justify-between ml-6">
                                    <div>
                                        <p className="font-bold text-foreground">Event Operations</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Successfully Executed</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-primary text-xl tracking-tight">200+</p>
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-1">100% Uptime</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-white dark:bg-background border border-border rounded-xl shadow-sm flex items-center justify-between">
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

                            <div className="mt-6 pt-5 border-t border-border flex items-center gap-4">
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
