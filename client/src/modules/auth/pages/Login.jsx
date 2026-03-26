import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import authService from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

import { toast } from 'sonner';
import { Loader2, Mail, Lock, LogIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';



const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    rememberMe: z.boolean().optional(),
});

const Login = () => {
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            rememberMe: false
        }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const setAuth = useAuthStore((state) => state.setAuth);
    const { user, profile } = useAuthStore();

    // Redirect if already logged in (but only if we're on the generic login page or if the role matches the portal)
    useEffect(() => {
        if (user && profile) {
            const isCoordinatorPortal = location.pathname.includes('coordinator');
            const isAdminPortal = location.pathname.includes('admin');
            
            // If user is admin and on admin portal or generic login, redirect to admin dash
            if (profile.role === 'admin' && (isAdminPortal || !isCoordinatorPortal)) {
                navigate('/admin');
            } 
            // If user is coordinator and on coordinator portal or generic login, redirect to coordinator dash
            else if (profile.role === 'coordinator' && (isCoordinatorPortal || !isAdminPortal)) {
                navigate('/coordinator');
            } 
            // If user is student and on student portal (generic login), redirect to student dash
            else if (profile.role === 'student' && !isCoordinatorPortal && !isAdminPortal) {
                navigate('/student');
            }
        }
    }, [user, profile, navigate, location.pathname]);

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const { user, profile } = await authService.login({
                email: data.email,
                password: data.password,
            });

            setAuth(user, profile);
            toast.success('Login successful!');

            // Redirect based on role (safety check for missing profile)
            if (!profile) {
                toast.error('Profile not found. Please try to re-register to complete your profile.', {
                    duration: 6000,
                    action: {
                        label: 'Go to Register',
                        onClick: () => navigate('/register')
                    }
                });
                return;
            }

            if (profile.role === 'admin') navigate('/admin');
            else if (profile.role === 'coordinator') navigate('/coordinator');
            else if (profile.role === 'student') navigate('/student');
            else navigate('/');
        } catch (error) {
            console.error('Login error:', error);
            const message = error?.message || 'Login failed';
            if (message.toLowerCase().includes('email not verified')) {
                toast.error('Email not verified. Please check your inbox.');
                navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
                return;
            }
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };


    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);
        try {
            await authService.signInWithGoogle();
        } catch (error) {
            console.error('Google login error:', error);
            toast.error('Google login failed. Please try again or use email.');
        } finally {
            setIsGoogleLoading(false);
        }
    };


    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1562774053-701939374585?w=1920&q=95&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <Card className="w-full max-w-md bg-white dark:bg-slate-900 text-card-foreground shadow-2xl border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-400 hover:shadow-blue-200/40 dark:hover:border-blue-500 transition-all duration-300 cursor-default">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                            <LogIn className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">
                        Portal Access
                    </CardTitle>
                    <CardDescription className="text-center">
                        Securely sign in to continue to your dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
                        {/* Hidden dummy fields to intercept browser autofill */}
                        <input type="text" name="email_autofill_prevent" style={{ display: 'none' }} tabIndex="-1" />
                        <input type="password" name="password_autofill_prevent" style={{ display: 'none' }} tabIndex="-1" />

                        <div className="space-y-2">
                            <Label htmlFor="auth-email-field">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    id="auth-email-field"
                                    type="email"
                                    placeholder="name@college.edu"
                                    {...register('email')}
                                    autoComplete="off"
                                    className={`${errors.email ? "border-red-500" : ""} pl-10 h-11 bg-slate-50 dark:bg-slate-950`}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-sm text-red-500">{errors.email.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="auth-password-field">Password</Label>
                                <Link
                                    to="/forgot-password"
                                    className="text-xs text-primary hover:underline font-medium"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    id="auth-password-field"
                                    type="password"
                                    placeholder="Enter password"
                                    {...register('password')}
                                    autoComplete="off"
                                    className={`${errors.password ? "border-red-500" : ""} pl-10 h-11 bg-slate-50 dark:bg-slate-950`}
                                />
                            </div>
                            {errors.password && (
                                <p className="text-sm text-red-500">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                {...register('rememberMe')}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                            />
                            <Label htmlFor="rememberMe" className="text-sm font-normal text-muted-foreground">
                                Remember me
                            </Label>
                        </div>

                        <Button className="w-full h-11" type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <LogIn className="mr-2 h-4 w-4" />
                                    Sign In
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full h-11 border-border bg-background hover:bg-muted"
                        onClick={handleGoogleLogin}
                        disabled={isGoogleLoading}
                    >
                        {isGoogleLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                                Google
                            </>
                        )}
                    </Button>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-border py-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                        Don&apos;t have an account?{' '}
                        <Link to="/register" className="text-primary hover:underline font-bold">
                            Join NEXTGEN EDUTECH UNIVERSITY
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Login;
