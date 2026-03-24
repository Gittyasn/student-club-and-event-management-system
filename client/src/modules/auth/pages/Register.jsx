import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import authService from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const registerSchema = z.object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    role: z.enum(['student', 'coordinator']),
    department: z.string().min(1, 'Department is required'),
    year: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 4), {
        message: "Year must be between 1 and 4"
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const Register = () => {
    const { register, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: 'student'
        }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const setAuth = useAuthStore((state) => state.setAuth);
    const selectedRole = watch('role');
    // Track if registration is in-progress to prevent premature redirect
    const isRegistering = useRef(false);

    // Redirect if already logged in (but NOT during registration)
    useEffect(() => {
        if (isRegistering.current) return;
        if (user && profile) {
            if (profile.role === 'admin') navigate('/admin');
            else if (profile.role === 'coordinator') navigate('/coordinator');
            else if (profile.role === 'student') navigate('/student');
        }
    }, [user, profile, navigate]);

    const onSubmit = async (data) => {
        setIsLoading(true);
        isRegistering.current = true; // block redirect during registration
        try {
            await authService.register({
                email: data.email,
                password: data.password,
                fullName: data.fullName,
                role: data.role,
                department: data.department,
                year: data.year
            });

            // Explicitly clear auth store so useEffect doesn't redirect to dashboard
            setAuth(null, null);

            toast.success('Registration successful. Please verify your email to continue.');
            navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
        } catch (error) {
            console.error('Registration error:', error);
            toast.error(error.message || 'Registration failed');
        } finally {
            isRegistering.current = false;
            setIsLoading(false);
        }
    };

    const handleGoogleRegister = async () => {
        setIsGoogleLoading(true);
        try {
            await authService.signInWithGoogle();
        } catch (error) {
            console.error('Google signup error:', error);
            toast.error('Google signup failed. Please try again or use email.');
        } finally {
            setIsGoogleLoading(false);
        }
    };


    const departments = [
        "Computer Science & Engineering",
        "Electronics & Communication",
        "Mechanical Engineering",
        "Information Technology",
        "Basic Sciences",
        "Business Administration"
    ];

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1562774053-701939374585?w=1920&q=95&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <Card className="w-full max-w-lg bg-white dark:bg-slate-900 text-card-foreground shadow-2xl border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-400 hover:shadow-blue-200/40 dark:hover:border-blue-500 transition-all duration-300 cursor-default">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
                    <CardDescription className="text-center">
                        Enter your details to register for NEXTGEN EDUTECH
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
                        {/* Intercept browser autofill */}
                        <input type="text" name="registry_prevent" style={{ display: 'none' }} tabIndex="-1" />
                        <input type="password" name="registry_p_prevent" style={{ display: 'none' }} tabIndex="-1" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="reg-fullname">Full Name</Label>
                                <Input
                                    id="reg-fullname"
                                    placeholder="John Doe"
                                    {...register('fullName')}
                                    autoComplete="off"
                                    className={errors.fullName ? "border-red-500" : ""}
                                />
                                {errors.fullName && (
                                    <p className="text-sm text-red-500">{errors.fullName.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reg-email">Email</Label>
                                <Input
                                    id="reg-email"
                                    type="email"
                                    placeholder="name@example.com"
                                    {...register('email')}
                                    autoComplete="off"
                                    className={errors.email ? "border-red-500" : ""}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-500">{errors.email.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="role">I am a...</Label>
                                <select
                                    id="role"
                                    {...register('role')}
                                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground"
                                >
                                    <option value="student">Student</option>
                                    <option value="coordinator">Coordinator</option>
                                </select>
                                {errors.role && (
                                    <p className="text-sm text-red-500">{errors.role.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <select
                                    id="department"
                                    {...register('department')}
                                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground"
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((dept) => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                                {errors.department && (
                                    <p className="text-sm text-red-500">{errors.department.message}</p>
                                )}
                            </div>
                        </div>

                        {selectedRole === 'student' && (
                            <div className="space-y-2">
                                <Label htmlFor="year">Year of Study</Label>
                                <Input
                                    id="year"
                                    type="number"
                                    min="1"
                                    max="4"
                                    placeholder="1-4"
                                    {...register('year')}
                                    className={errors.year ? "border-red-500" : ""}
                                />
                                {errors.year && (
                                    <p className="text-sm text-red-500">{errors.year.message}</p>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="reg-password">Password</Label>
                                <Input
                                    id="reg-password"
                                    type="password"
                                    placeholder="••••••••"
                                    {...register('password')}
                                    autoComplete="new-password"
                                    className={errors.password ? "border-red-500" : ""}
                                />
                                {errors.password && (
                                    <p className="text-sm text-red-500">{errors.password.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reg-confirmPassword">Confirm Password</Label>
                                <Input
                                    id="reg-confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    {...register('confirmPassword')}
                                    className={errors.confirmPassword ? "border-red-500" : ""}
                                />
                                {errors.confirmPassword && (
                                    <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                                )}
                            </div>
                        </div>
                        <Button className="w-full" type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                'Sign Up'
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
                        onClick={handleGoogleRegister}
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
                <CardFooter className="flex justify-center mt-4 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary hover:underline font-medium">
                            Sign In
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Register;
