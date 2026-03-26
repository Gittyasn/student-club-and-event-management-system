import { Link } from 'react-router-dom';
import { Github, Linkedin, Twitter, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Footer = () => {
    return (
        <footer className="bg-card text-muted-foreground py-10 border-t border-border relative overflow-hidden">

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    {/* Brand Column */}
                    <div>
                        <div className="flex items-center space-x-3 text-foreground mb-4">
                            <div className="h-8 w-8 rounded-lg border border-border flex items-center justify-center p-1.5 bg-background shadow-sm">
                                <img src="/university_logo.png" alt="University Logo" className="h-full w-full object-contain" />
                            </div>
                            <span className="font-heading font-black text-base tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif', letterSpacing: '0.1em' }}>
                                NEXTGEN EDUTECH <span className="text-primary-foreground bg-primary px-1.5 py-0.5 rounded ml-1">UNIVERSITY</span>
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground mb-6 max-w-xs font-light">
                            The central hub for student clubs, events, and professional growth.
                        </p>
                        <div className="flex space-x-3">
                            {[Github, Linkedin, Twitter, Instagram].map((Icon, i) => (
                                <button
                                    key={i}
                                    className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all duration-200"
                                >
                                    <Icon className="h-4 w-4" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Platform Links */}
                    <div>
                        <h4 className="font-heading font-black text-foreground mb-4 uppercase tracking-widest text-xs" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Platform</h4>
                        <ul className="space-y-2 text-sm font-medium">
                            {[
                                { label: 'About System', path: '#' },
                                { label: 'Explore Clubs', path: '/clubs' },
                                { label: 'Upcoming Events', path: '/events' },
                                { label: 'Leaderboard', path: '#' },
                            ].map((item, idx) => (
                                <li key={idx}>
                                    <Link to={item.path} className="hover:text-primary transition-colors flex items-center gap-2 group text-sm">
                                        <span className="h-1 w-1 rounded-full bg-border group-hover:bg-primary transition-colors" />
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Role Access & Contacts */}
                    <div>
                        <h4 className="font-heading font-black text-foreground mb-4 uppercase tracking-widest text-xs" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Quick Access</h4>
                        <ul className="space-y-2 text-sm font-medium mb-6">
                            {[
                                { label: 'Portal Login', path: '/login' },
                                { label: 'Club Access', path: '/coordinator/login' },
                                { label: 'Admin Access', path: '/admin/login' },
                            ].map((item, idx) => (
                                <li key={idx}>
                                    <Link to={item.path} className="hover:text-primary transition-colors flex items-center gap-2 group text-sm">
                                        <span className="h-1 w-1 rounded-full bg-border group-hover:bg-primary transition-colors" />
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <h4 className="font-heading font-black text-foreground mb-3 uppercase tracking-widest text-xs" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Contact</h4>
                        <ul className="space-y-2 text-sm font-medium">
                            <li className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-primary shrink-0" />
                                <span>contact@nextgen.edu</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-primary shrink-0" />
                                <span>+1 (555) 014-2222</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary shrink-0" />
                                <span>NEXTGEN EDUTECH UNIVERSITY, Main Campus</span>
                            </li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h4 className="font-heading font-black text-foreground mb-4 uppercase tracking-widest text-xs" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Stay Updated</h4>
                        <p className="text-sm text-muted-foreground mb-4 font-light">
                            Subscribe for the latest updates from NEXTGEN EDUTECH UNIVERSITY.
                        </p>
                        <div className="space-y-2">
                            <Input
                                type="email"
                                placeholder="your@email.com"
                                className="h-9 text-sm"
                            />
                            <Button className="w-full h-9 font-bold text-xs tracking-wide">Subscribe</Button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
                    <p>(c) {new Date().getFullYear()} NEXTGEN EDUTECH UNIVERSITY. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link to="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                        <Link to="#" className="hover:text-foreground transition-colors">Terms of Use</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
