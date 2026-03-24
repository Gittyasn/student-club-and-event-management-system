import { useQuery } from '@tanstack/react-query';
import { eventService } from '../../services/eventService';
import { attendanceService } from '../../services/attendanceService';
import { certificateService } from '../../services/certificateService';
import { clubService } from '../../services/clubService';
import { useAuth } from '../../auth/AuthContext';
import { Link } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import {
    CalendarCheck,
    Award,
    Users,
    CheckCircle2,
    ArrowRight,
    Activity
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const StudentDashboard = () => {
    const { user } = useAuth();

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    // Queries
    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['studentStats', user?.id],
        queryFn: async () => {
            const [regRes, attRes, certRes, clubsRes] = await Promise.all([
                eventService.getMyRegistrations(user.id).catch(() => ({ data: [] })),
                attendanceService.getMyAttendance(user.id).catch(() => ({ data: [] })),
                certificateService.getMyCertificates(user.id).catch(() => ({ data: [] })),
                clubService.getMyClubs(user.id).catch(() => ({ data: [] }))
            ]);

            return {
                registrations: regRes.data.length || 0,
                attendance: attRes.data.length || 0,
                certificates: certRes.data.length || 0,
                clubs: clubsRes.data.length || 0
            };
        },
        enabled: !!user?.id
    });

    // Chart.js configuration
    const chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'Activity Score',
                data: [12, 19, 15, 25, 22, 30],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                padding: 10,
                cornerRadius: 8,
                displayColors: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f1f5f9',
                },
                ticks: {
                    color: '#64748b',
                    font: { size: 11 }
                },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: {
                    color: '#64748b',
                    font: { size: 11 }
                },
                border: { display: false }
            }
        }
    };

    const statCards = [
        {
            title: 'Registered Events',
            count: stats?.registrations || 0,
            icon: <CalendarCheck className="h-5 w-5 text-blue-600" />,
            color: 'bg-blue-50 border-blue-100',
            link: '/student/events'
        },
        {
            title: 'Events Attended',
            count: stats?.attendance || 0,
            icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
            color: 'bg-emerald-50 border-emerald-100',
            link: '/student/attendance'
        },
        {
            title: 'Certificates Earned',
            count: stats?.certificates || 0,
            icon: <Award className="h-5 w-5 text-amber-600" />,
            color: 'bg-amber-50 border-amber-100',
            link: '/student/certificates'
        },
        {
            title: 'My Clubs',
            count: stats?.clubs || 0,
            icon: <Users className="h-5 w-5 text-purple-600" />,
            color: 'bg-purple-50 border-purple-100',
            link: '/student/clubs'
        },
    ];

    if (isLoading) {
        return (
            <div className="p-8 space-y-8">
                <Skeleton className="h-32 w-full rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
                    <Skeleton className="h-96 rounded-xl" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[50vh] text-red-500">
                Failed to load dashboard data. Please try again later.
            </div>
        );
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans"
        >
            {/* Header Section */}
            <motion.div variants={item}>
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white shadow-xl">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/5 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">
                                Hello, {user?.name?.split(' ')[0]}! 👋
                            </h1>
                            <p className="text-slate-300 text-lg max-w-xl">
                                Welcome back to your campus hub. Here&apos;s what&apos;s happening with your clubs and events today.
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[160px]">
                            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Current Role</p>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                <span className="font-bold text-lg">{user?.role || 'Student'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <motion.div variants={item} key={index}>
                        <Link to={stat.link} className="block group">
                            <Card className={`h-full border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${stat.color.replace('bg-', 'hover:bg-').replace('50', '100')}`}>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-xl ${stat.color} bg-white`}>
                                            {stat.icon}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                                            <ArrowRight size={18} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-3xl font-bold text-slate-900">{stat.count}</h3>
                                        <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Activity Chart */}
                <motion.div variants={item} className="lg:col-span-2">
                    <Card className="h-full border-slate-200 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Activity Overview</CardTitle>
                                    <CardDescription>Your participation trend over the last 6 months</CardDescription>
                                </div>
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Activity size={20} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <Line data={chartData} options={chartOptions} />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Recent/Quick Actions */}
                <motion.div variants={item} className="space-y-6">
                    <Card className="border-slate-200 shadow-sm h-full">
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                            <CardDescription> Shortcuts for common tasks</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                { text: 'Browse Upcoming Events', to: '/student/events', color: 'default', icon: <CalendarCheck size={16} /> },
                                { text: 'Join New Club', to: '/student/clubs', color: 'outline', icon: <Users size={16} /> },
                                { text: 'View Certificates', to: '/student/certificates', color: 'outline', icon: <Award size={16} /> },
                            ].map((action, i) => (
                                <Link key={i} to={action.to} className="block">
                                    <Button
                                        variant={action.color === 'default' ? 'default' : 'outline'}
                                        className="w-full justify-between group h-12 text-sm"
                                    >
                                        <span className="flex items-center gap-2">
                                            {action.icon}
                                            {action.text}
                                        </span>
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                            ))}

                            <div className="pt-4 mt-4 border-t border-slate-100">
                                <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Recently Added</p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                            TC
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Tech Club Hackathon</p>
                                            <p className="text-xs text-slate-500">New event added yesterday</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default StudentDashboard;
