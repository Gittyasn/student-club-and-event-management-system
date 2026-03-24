import HeroSection from '../components/landing/HeroSection';
import AboutSection from '../components/landing/AboutSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import { lazy, Suspense } from 'react';

// Lazy load below-the-fold sections
const FeaturedClubs = lazy(() => import('../components/landing/FeaturedClubs'));
const UpcomingEvents = lazy(() => import('../components/landing/UpcomingEvents'));
const StatsSection = lazy(() => import('../components/landing/StatsSection'));
const HowItWorks = lazy(() => import('../components/landing/HowItWorks'));
const Testimonials = lazy(() => import('../components/landing/Testimonials'));
const CTASection = lazy(() => import('../components/landing/CTASection'));

const SectionLoader = () => (
    <div className="w-full h-32 flex items-center justify-center opacity-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
);

const Home = () => {
    return (
        <div className="bg-background min-h-screen w-full overflow-x-hidden">
            <div id="hero"><HeroSection /></div>
            <div id="about"><AboutSection /></div>
            <div id="features"><FeaturesSection /></div>
            <div id="clubs-preview"><Suspense fallback={<SectionLoader />}><FeaturedClubs /></Suspense></div>
            <div id="events-preview"><Suspense fallback={<SectionLoader />}><UpcomingEvents /></Suspense></div>
            <div id="campus-impact"><Suspense fallback={<SectionLoader />}><StatsSection /></Suspense></div>
            <div id="how-it-works"><Suspense fallback={<SectionLoader />}><HowItWorks /></Suspense></div>
            <div id="testimonials"><Suspense fallback={<SectionLoader />}><Testimonials /></Suspense></div>
            <div id="contact"><Suspense fallback={<SectionLoader />}><CTASection /></Suspense></div>
        </div>
    );
};

export default Home;
