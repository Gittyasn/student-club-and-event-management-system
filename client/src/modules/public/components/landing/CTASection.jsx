import { Link } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';

const CTASection = () => {
    return (
        <section className="py-24 relative overflow-hidden border-y border-border bg-vibrant">

            <div className="container mx-auto px-4 md:px-12 relative z-10 text-center">
                <div className="max-w-3xl mx-auto">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-8 backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs font-bold text-white uppercase tracking-widest">Join the Ecosystem - NEXTGEN EDUTECH UNIVERSITY</span>
                    </div>

                    <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
                        Ready to Get Started?
                    </h2>

                    <p className="text-white/80 text-lg md:text-xl mb-12 max-w-xl mx-auto leading-relaxed">
                        Join our digital campus ecosystem - manage clubs, organize events, and enhance student engagement all in one place.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        {/* Primary CTA */}
                        <Link
                            to="/register"
                            className="inline-flex items-center justify-center gap-2 h-14 px-10 bg-white text-blue-700 font-bold text-base rounded-full hover:bg-white/95 transition-all shadow-xl hover:scale-105 active:scale-95"
                        >
                            Register Now <ArrowRight className="w-5 h-5" />
                        </Link>
                        {/* Secondary CTA */}
                        <Link
                            to="/events"
                            className="inline-flex items-center justify-center gap-2 h-14 px-10 bg-white/10 border border-white/20 text-white font-bold text-base rounded-full hover:bg-white/20 transition-all backdrop-blur-sm hover:scale-105 active:scale-95"
                        >
                            <Users className="w-5 h-5" />
                            Browse Events
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CTASection;
