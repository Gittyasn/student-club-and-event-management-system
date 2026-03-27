import HeroSection from '../components/landing/HeroSection';
import AboutSection from '../components/landing/AboutSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import { lazy, Suspense, useEffect, useState } from 'react';

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
    const [showPrimaryDeferred, setShowPrimaryDeferred] = useState(false);
    const [showSecondaryDeferred, setShowSecondaryDeferred] = useState(false);

    useEffect(() => {
        let primaryTimer;
        let secondaryTimer;

        const warmDeferredSections = () => {
            primaryTimer = window.setTimeout(() => setShowPrimaryDeferred(true), 120);
            secondaryTimer = window.setTimeout(() => setShowSecondaryDeferred(true), 260);
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            const idleId = window.requestIdleCallback(warmDeferredSections, { timeout: 350 });
            return () => {
                window.cancelIdleCallback(idleId);
                window.clearTimeout(primaryTimer);
                window.clearTimeout(secondaryTimer);
            };
        }

        warmDeferredSections();
        return () => {
            window.clearTimeout(primaryTimer);
            window.clearTimeout(secondaryTimer);
        };
    }, []);

    return (
        <div className="bg-background min-h-screen w-full overflow-x-hidden">
            <div id="hero"><HeroSection /></div>
            <div id="about"><AboutSection /></div>
            <div id="features"><FeaturesSection /></div>
            <div id="clubs-preview">{showPrimaryDeferred ? <Suspense fallback={<SectionLoader />}><FeaturedClubs /></Suspense> : <SectionLoader />}</div>
            <div id="events-preview">{showPrimaryDeferred ? <Suspense fallback={<SectionLoader />}><UpcomingEvents /></Suspense> : <SectionLoader />}</div>
            <div id="campus-impact">{showPrimaryDeferred ? <Suspense fallback={<SectionLoader />}><StatsSection /></Suspense> : <SectionLoader />}</div>
            <div id="how-it-works">{showSecondaryDeferred ? <Suspense fallback={<SectionLoader />}><HowItWorks /></Suspense> : <SectionLoader />}</div>
            <div id="testimonials">{showSecondaryDeferred ? <Suspense fallback={<SectionLoader />}><Testimonials /></Suspense> : <SectionLoader />}</div>
            <div id="contact">{showSecondaryDeferred ? <Suspense fallback={<SectionLoader />}><CTASection /></Suspense> : <SectionLoader />}</div>
        </div>
    );
};

export default Home;
