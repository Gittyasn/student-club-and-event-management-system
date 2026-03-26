import { motion } from 'framer-motion';
import { useClubs } from '@/hooks/useClubs';
import { useEvents } from '@/hooks/useEvents';
import { usePublicStats } from '@/hooks/usePublicStats';

const StatsSection = () => {
    const { data: clubs } = useClubs({ publicOnly: true });
    const { data: events } = useEvents({ publicOnly: true });
    const { data: publicStats } = usePublicStats();

    const activeClubs = publicStats?.active_clubs ?? clubs?.length ?? 0;
    const eventsConducted = publicStats?.events_conducted ?? events?.length ?? 0;
    const activeStudents = publicStats?.active_students ?? 0;
    const certificatesIssued = publicStats?.certificates_issued ?? 0;
    const avgAttendance = publicStats?.avg_attendance_rate ?? 0;

    const stats = [
        {
            label: "Active Clubs",
            value: activeClubs,
            suffix: "+"
        },
        {
            label: "Events Conducted",
            value: eventsConducted,
            suffix: "+"
        },
        {
            label: "Active Students",
            value: activeStudents,
            suffix: "+"
        },
        {
            label: "Certificates Issued",
            value: certificatesIssued || "2,800",
            suffix: "+"
        },
        {
            label: "Avg. Attendance",
            value: avgAttendance || "85",
            suffix: "%"
        }
    ];

    return (
        <section className="py-16 border-t border-b border-border bg-slate-50 dark:bg-card relative overflow-hidden">

            <div className="container mx-auto px-4 md:px-12 relative z-10">
                <div className="text-center mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                        Campus Impact
                    </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            className="flex flex-col items-center p-6 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors"
                        >
                            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-1 font-mono">
                                {stat.value}{stat.suffix}
                            </h3>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                                {stat.label}
                            </p>
                        </motion.div>
                    ))
                    }
                </div >
            </div >
        </section >
    );
};

export default StatsSection;
