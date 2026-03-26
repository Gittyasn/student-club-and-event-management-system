import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import authService from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
// eslint-disable-next-line no-unused-vars
import { Loader2, Mail, Lock, LogIn, Github, Chrome } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const adminLoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

const AdminLogin = () => {
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(adminLoginSchema),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const setAuth = useAuthStore(state => state.setAuth);
    const { user, profile } = useAuthStore();

    useEffect(() => {
        if (user && profile) {
            // Only auto-redirect to admin dash if they ARE an admin
            if (profile.role === 'admin') {
                navigate('/admin');
            }
            // Do NOT redirect students or coordinators to /unauthorized here, 
            // as they might be trying to log into an admin account.
        }
    }, [user, profile, navigate]);

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const { user, profile } = await authService.login({
                email: data.email,
                password: data.password,
            });

            if (profile?.role !== 'admin') {
                await authService.logout();
                throw new Error('Access Denied: This portal is for administrators only.');
            }

            setAuth(user, profile);
            toast.success('Welcome back to the Admin Panel');
            const from = location.state?.from?.pathname || '/admin';
            navigate(from, { replace: true });
        } catch (error) {
            toast.error(error.message || 'Verification failed');
        } finally {
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
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-[420px]"
            >
                <Card className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden rounded-2xl hover:border-blue-400 hover:shadow-blue-200/40 dark:hover:border-blue-500 transition-all duration-300 cursor-default">
                    <CardHeader className="space-y-3 pt-8 pb-6 text-center">
                        <div className="flex justify-center">
                            <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                                <LogIn className="h-7 w-7 text-primary" />
                            </div>
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Admin Portal</CardTitle>
                            <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                Secure access for system administrators
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="px-8 pb-8">
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-3">
                                <Button
                                    variant="outline"
                                    className="w-full h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-semibold"
                                    onClick={handleGoogleLogin}
                                    disabled={isGoogleLoading}
                                >
                                    {isGoogleLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Chrome className="mr-2 h-4 w-4" />}
                                    Continue with Google
                                </Button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <Separator className="w-full" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-500 font-bold">Or continue with</span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            {...register('email')}
                                            type="email"
                                            placeholder="admin@example.com"
                                            className="pl-10 h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary"
                                        />
                                    </div>
                                    {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</Label>
                                        <Link to="/forgot-password" size="sm" className="text-xs text-primary hover:underline font-bold transition-all">
                                            Forgot Password?
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            {...register('password')}
                                            type="password"
                                            placeholder="Enter password"
                                            className="pl-10 h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary"
                                        />
                                    </div>
                                    {errors.password && <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-11 text-base font-bold transition-all hover:translate-y-[-1px] active:translate-y-[0px] shadow-lg shadow-primary/10"
                                >
                                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign In to Dashboard'}
                                </Button>
                            </form>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-slate-50/50 dark:bg-slate-950/30 border-t dark:border-slate-800 p-6 flex flex-col items-center">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            New administrator?{' '}
                            <Link to="/admin/register" className="text-primary hover:underline font-bold">
                                Create Admin Account
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
};

export default AdminLogin;
