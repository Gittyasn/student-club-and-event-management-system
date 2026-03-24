import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModeToggle } from './mode-toggle';

const Navbar = () => {
    // Use `profile` (not `user`) as the source of truth.
    // `user` is set immediately from the cached Supabase session, but `profile`
    // is only set after the DB profile row is fetched — so it accurately reflects
    // a fully authenticated & resolved session.
    const { profile, loading } = useAuthStore();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const getDashboardLink = () => {
        if (profile?.role === 'admin') return '/admin';
        if (profile?.role === 'coordinator') return '/coordinator';
        return '/student';
    };

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'About', path: '/#about' },
        { name: 'Features', path: '/#features' },
        { name: 'Clubs', path: '/clubs' },
        { name: 'Events', path: '/events' },
        { name: 'How It Works', path: '/#how-it-works' },
        { name: 'Contact', path: '/#contact' },
    ];

    const isActive = (path) => location.pathname === path;

    // While auth is initialising, render nothing to avoid a flicker
    // between "Dashboard" → "Login/Register".
    const renderAuthButtons = () => {
        if (loading) return null;
        if (profile) {
            return (
                <Button asChild>
                    <Link to={getDashboardLink()}>Dashboard</Link>
                </Button>
            );
        }
        return (
            <>
                <Button variant="ghost" asChild>
                    <Link to="/login">Log in</Link>
                </Button>
                <Button asChild variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link to="/register">Register</Link>
                </Button>
            </>
        );
    };

    const renderMobileAuthButtons = () => {
        if (loading) return null;
        if (profile) {
            return (
                <Button asChild onClick={() => setIsOpen(false)}>
                    <Link to={getDashboardLink()}>Dashboard</Link>
                </Button>
            );
        }
        return (
            <>
                <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
                    <Link to="/login">Log in</Link>
                </Button>
                <Button asChild onClick={() => setIsOpen(false)}>
                    <Link to="/register">Register</Link>
                </Button>
            </>
        );
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <Link to="/" className="flex items-center space-x-3 group">
                    <div className="relative p-1.5 bg-background rounded-xl border border-border shadow-sm group-hover:shadow-md group-hover:border-primary/50 transition-all duration-300">
                        <img src="/university_logo.png" alt="University Logo" className="h-7 w-7 object-contain" />
                        <div className="absolute inset-0 bg-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="font-heading text-base font-black tracking-tight uppercase flex items-center" style={{ letterSpacing: '0.15em', fontFamily: '"Space Grotesk", sans-serif' }}>
                        NEXTGEN EDUTECH <span className="ml-1.5 text-gold-solid" style={{ letterSpacing: '0.25em' }}>UNIVERSITY</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            className={cn(
                                "text-sm font-semibold transition-colors hover:text-primary",
                                isActive(link.path) ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {/* Desktop Auth & Theme */}
                <div className="hidden md:flex items-center gap-4">
                    <ModeToggle />
                    {renderAuthButtons()}
                </div>

                {/* Mobile Nav */}
                <div className="md:hidden flex items-center gap-2">
                    <ModeToggle />
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right">
                            <div className="flex flex-col space-y-4 mt-8">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        to={link.path}
                                        onClick={() => setIsOpen(false)}
                                        className={cn(
                                            "text-lg font-medium transition-colors hover:text-primary",
                                            isActive(link.path) ? "text-primary" : "text-foreground"
                                        )}
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                                <div className="border-t pt-4 flex flex-col gap-2">
                                    {renderMobileAuthButtons()}
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
