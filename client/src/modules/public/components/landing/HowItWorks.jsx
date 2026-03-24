
import { motion } from 'framer-motion';
import { UserPlus, CalendarCheck, Trophy } from 'lucide-react';

const HowItWorks = () => {
    const steps = [
        {
            icon: UserPlus,
            title: "Join & Connect",
            description: "Create your profile and explore clubs that match your interests. Connect with like-minded peers."
        },
        {
            icon: CalendarCheck,
            title: "Participate & Engage",
            description: "Register for events, workshops, and hackathons. Check in via QR code and make your mark."
        },
        {
            icon: Trophy,
            title: "Achieve & Grow",
            description: "Earn certificates, build your portfolio, and track your campus journey with real-time analytics."
        }
    ];

    return (
        <section className="py-24 relative bg-white dark:bg-background border-b border-border overflow-hidden">
            {/* Elegant Light Theme Background Elements */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 dark:hidden pointer-events-none z-0" />
            <div className="container mx-auto px-4 md:px-12">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="text-primary font-bold tracking-widest text-sm uppercase mb-3 block">
                        Simple Workflow
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                        How It Works
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Your journey from joining to achieving in three simple steps.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-100 via-primary/40 to-blue-100 dark:from-slate-800 dark:via-primary/50 dark:to-slate-800 z-0" />

                    {steps.map((step, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.2, duration: 0.6 }}
                            className="relative z-10 flex flex-col items-center text-center"
                        >
                            <div className="w-24 h-24 rounded-2xl bg-card border-4 border-blue-50 dark:border-slate-950 shadow-xl dark:shadow-none flex items-center justify-center mb-8 relative group">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                <step.icon className="w-10 h-10 text-primary" />
                                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-foreground font-bold text-sm">
                                    {idx + 1}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-foreground mb-3">
                                {step.title}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed max-w-xs">
                                {step.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
