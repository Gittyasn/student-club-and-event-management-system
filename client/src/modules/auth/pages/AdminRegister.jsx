import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import authService from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, Briefcase, UserPlus, Chrome } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const adminRegisterSchema = z.object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    department: z.string().min(1, 'Department is required'),
    registrationKey: z.string().min(1, 'Security key is required'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const AdminRegister = () => {
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(adminRegisterSchema),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const setAuth = useAuthStore((state) => state.setAuth);
    // Prevent redirect during registration
    const isRegistering = useRef(false);

    useEffect(() => {
        if (isRegistering.current) return;
        if (user && profile && profile.role === 'admin') navigate('/admin');
    }, [user, profile, navigate]);

    const onSubmit = async (data) => {
        setIsLoading(true);
        isRegistering.current = true;
        try {
            // Demo security key check
            if (data.registrationKey !== 'BY-ADMIN-2026') {
                throw new Error('Invalid administration registration key.');
            }

            await authService.register({
                email: data.email,
                password: data.password,
                fullName: data.fullName,
                role: 'admin',
                department: data.department,
            });
            // Explicitly clear auth store to prevent redirect
            setAuth(null, null);
            toast.success('Administrator account created. Please sign in.');
            navigate('/admin/login');
        } catch (error) {
            toast.error(error.message || 'Registration failed');
        } finally {
            isRegistering.current = false;
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);
        try {
            await authService.signInWithGoogle();
            // eslint-disable-next-line no-unused-vars
        } catch (error) {
            toast.error('Google authentication failed');
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1562774053-701939374585?w=1920&q=95&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[420px]"
            >
                <Card className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden rounded-2xl hover:border-blue-400 hover:shadow-blue-200/40 dark:hover:border-blue-500 transition-all duration-300 cursor-default">
                    <CardHeader className="space-y-2 pt-6 pb-4 text-center border-b dark:border-slate-800">
                        <div className="flex justify-center">
                            <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                                <UserPlus className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Create Admin Account</CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
                            Register a new system administrator
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-6 pt-5 pb-4">
                        <div className="space-y-3">
                            <Button
                                variant="outline"
                                className="w-full h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-semibold text-sm"
                                onClick={handleGoogleLogin}
                                disabled={isGoogleLoading}
                            >
                                {isGoogleLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Chrome className="mr-2 h-4 w-4" />}
                                Initialize with Google
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <Separator className="w-full" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-500 font-bold">Or enter manual details</span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input {...register('fullName')} placeholder="Dr. John Smith" className="pl-9 h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm" />
                                        </div>
                                        {errors.fullName && <p className="text-[10px] text-red-500 font-bold">{errors.fullName.message}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Official Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input {...register('email')} type="email" placeholder="admin@university.edu" className="pl-9 h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm" />
                                        </div>
                                        {errors.email && <p className="text-[10px] text-red-500 font-bold">{errors.email.message}</p>}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Administrative Role</Label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <select
                                            {...register('department')}
                                            className="flex h-10 w-full pl-9 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                                        >
                                            <option value="" disabled>Select Role</option>
                                            <option value="Principal">Principal</option>
                                            <option value="Vice Principal">Vice Principal</option>
                                            <option value="HOD - Computer Science">HOD - Computer Science</option>
                                            <option value="HOD - Electronics">HOD - Electronics</option>
                                            <option value="HOD - Mechanical">HOD - Mechanical</option>
                                            <option value="HOD - IT">HOD - Information Technology</option>
                                            <option value="Dean of Student Affairs">Dean of Student Affairs</option>
                                            <option value="Student Activity Coordinator">Student Activity Coordinator</option>
                                            <option value="Exam Controller">Exam Controller</option>
                                            <option value="System Administrator">System Administrator</option>
                                        </select>
                                    </div>
                                    {errors.department && <p className="text-[10px] text-red-500 font-bold">{errors.department.message}</p>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input {...register('password')} type="password" placeholder="••••••••" className="pl-9 h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm" />
                                        </div>
                                        {errors.password && <p className="text-[10px] text-red-500 font-bold">{errors.password.message}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input {...register('confirmPassword')} type="password" placeholder="••••••••" className="pl-9 h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm" />
                                        </div>
                                        {errors.confirmPassword && <p className="text-[10px] text-red-500 font-bold">{errors.confirmPassword.message}</p>}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Admin Access Key</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-red-400" />
                                        <Input {...register('registrationKey')} type="password" placeholder="Enter System Key" className="pl-9 h-10 bg-red-50/10 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-sm font-bold text-red-600 dark:text-red-400" />
                                    </div>
                                    {errors.registrationKey && <p className="text-[10px] text-red-500 font-bold">{errors.registrationKey.message}</p>}
                                    <p className="text-[9px] text-slate-500 italic">Required to authorize administrative privileges.</p>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-10 text-sm font-bold transition-all hover:translate-y-[-1px] shadow-lg shadow-primary/20 mt-1"
                                >
                                    {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Create Admin Account'}
                                </Button>
                            </form>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-slate-50/50 dark:bg-slate-950/30 border-t dark:border-slate-800 py-3 px-6 flex justify-center">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Already have an account?{' '}
                            <Link to="/admin/login" className="text-primary hover:underline font-bold">
                                Sign In
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
};

export default AdminRegister;
