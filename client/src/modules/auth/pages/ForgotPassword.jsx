import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import authService from '@/services/authService';

import { toast } from 'sonner';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

const ForgotPassword = () => {
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(forgotPasswordSchema),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            await authService.resetPassword(data.email);
            setIsSent(true);
            toast.success('Reset link sent to your email!');
        } catch (error) {
            console.error('Forgot password error:', error);
            toast.error(error.message || 'Failed to send reset link');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1562774053-701939374585?w=1920&q=95&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <Card className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-400 hover:shadow-blue-200/40 dark:hover:border-blue-500 transition-all duration-300 cursor-default">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Mail className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
                    <CardDescription className="text-center">
                        {isSent
                            ? "Check your email for the reset link"
                            : "Enter your email to receive a password reset link"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!isSent ? (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@college.edu"
                                        {...register('email')}
                                        className={`${errors.email ? "border-red-500" : ""} pl-10 h-11 bg-slate-50 dark:bg-slate-950`}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-sm text-red-500">{errors.email.message}</p>
                                )}
                            </div>
                            <Button className="w-full h-11" type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending Link...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Send Reset Link
                                    </>
                                )}
                            </Button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4">
                            <p className="text-sm text-slate-600 font-light">
                                We&apos;ve sent an email with instructions to reset your password.
                                Please check your inbox and spam folder.
                            </p>
                            <Button variant="outline" className="w-full" onClick={() => setIsSent(false)}>
                                Try another email
                            </Button>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center border-t border-slate-50 py-4">
                    <Link
                        to="/login"
                        className="text-sm text-slate-600 hover:text-primary flex items-center gap-2 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
};

export default ForgotPassword;
