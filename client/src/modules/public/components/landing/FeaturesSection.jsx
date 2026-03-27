import { motion } from 'framer-motion';
import {
    Calendar, Users, QrCode, Award, BarChart3, ShieldCheck
} from 'lucide-react';

const FeaturesSection = () => {
    const features = [
        {
            icon: Calendar,
            color: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/20',
            title: "Smart Event Management",
            description: "Create, edit, and schedule events with approval-based publishing."
        },
        {
            icon: Users,
            color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
            title: "Membership Management",
            description: "Join clubs digitally with streamlined approval workflows."
        },
        {
            icon: QrCode,
            color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/20',
            title: "Attendance Tracking",
            description: "QR-based check-in or manual options for accurate records."
        },
        {
            icon: Award,
            color: 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/20',
            title: "Certificates & Results",
            description: "Auto-generate certificates and manage event results effortlessly."
        },
        {
            icon: BarChart3,
            color: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/20',
            title: "Analytics Dashboard",
            description: "Track participation growth and club performance with insights."
        },
        {
            icon: ShieldCheck,
            color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/20',
            title: "Secure Governance",
            description: "Role-based access control with admin moderation ensuring safety."
        }
    ];

    return (
        <section className="py-12 bg-white dark:bg-muted/5 relative border-b border-border overflow-hidden">
            {/* Subtle Background Elements for Light Theme */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 dark:hidden pointer-events-none" />
            <div className="absolute right-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-blue-50/50 blur-[100px] dark:hidden pointer-events-none" />
            <div className="absolute left-0 bottom-0 -z-10 h-[400px] w-[400px] rounded-full bg-purple-50/50 blur-[100px] dark:hidden pointer-events-none" />

            <div className="container mx-auto px-4 md:px-12 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <span className="text-primary font-black tracking-[0.2em] text-xs h-sub uppercase mb-4 block">
                        Platform Highlights
                    </span>
                    <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4 leading-[1.1] tracking-tighter">
                        Everything needed to run <br />
                        <span className="text-primary italic font-serif">clubs and events well</span>
                    </h2>
                    <p className="text-muted-foreground text-base max-w-xl mx-auto leading-7">
                        A complete suite of tools designed to simplify the complex workflows of student organizations.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1, duration: 0.5 }}
                            whileHover={{ y: -5 }}
                            className="bg-card p-5 rounded-2xl border border-border hover:border-primary/40 hover:shadow-md transition-all group"
                        >
                            <div className={`h-11 w-11 rounded-xl flex items-center justify-center mb-4 border transition-colors ${feature.color}`}>
                                <feature.icon className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
