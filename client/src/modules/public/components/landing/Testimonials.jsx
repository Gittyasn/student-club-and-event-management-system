import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

const Testimonials = () => {
    const testimonials = [
        {
            quote: "The platform simplified event registration and made participation seamless. I never miss a hackathon now!",
            author: "Alex Johnson",
            role: "Final Year Student",
            avatar: "AJ"
        },
        {
            quote: "Managing club members and approvals has never been easier. The analytics dashboard is a game changer.",
            author: "Sarah Williams",
            role: "Club Coordinator",
            avatar: "SW"
        },
        {
            quote: "Complete visibility of campus engagement. Governance and transparency are now effortless.",
            author: "Dr. Robert Chen",
            role: "Campus Administrator",
            avatar: "RC"
        }
    ];

    return (
        <section className="py-16 relative bg-slate-50 dark:bg-background border-b border-border overflow-hidden">
            {/* Elegant Light Theme Background Elements */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 dark:hidden pointer-events-none z-0" style={{ maskImage: 'linear-gradient(to bottom, white, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, white, transparent)' }} />
            <div className="container mx-auto px-4 md:px-12">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        What Students Say
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {testimonials.map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1, duration: 0.5 }}
                            className="bg-white dark:bg-card/30 p-6 rounded-xl border border-border relative shadow-sm hover:shadow-md transition-shadow"
                        >
                            <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/20 group-hover:text-primary/40 transition-colors" />

                            <p className="text-muted-foreground text-base italic mb-6 relative z-10 leading-relaxed">
                                &quot;{item.quote}&quot;
                            </p>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-foreground font-bold text-xs">
                                    {item.avatar}
                                </div>
                                <div>
                                    <h4 className="text-foreground font-bold text-sm">{item.author}</h4>
                                    <p className="text-primary text-xs">{item.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
