import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import authService from '@/services/authService';

import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const resetPasswordSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const ResetPassword = () => {
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(resetPasswordSchema),
    });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if we have a session (user clicked email link)
        const checkSession = async () => {
            // Check if there is a recovery token in the URL Hash
            const hash = window.location.hash;
            if (hash && hash.includes('type=recovery')) {
                return; // Let Supabase process the token
            }

            const data = await authService.getCurrentUser();
            if (!data || !data.user) {
                toast.warning('Preview mode: No reset token detected. Password update will fail without clicking an email link.');
                // We do not redirect here so that you can view and test the UI design.
                // navigate('/forgot-password');
            }
        };
        checkSession();
    }, []);


    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            await authService.updatePassword(data.password);

            toast.success('Password updated successfully! Please log in with your new password.');

            // Sign out to force fresh login
            await authService.logout();
            navigate('/login');
        } catch (error) {
            console.error('Reset password error:', error);
            toast.error(error.message || 'Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1562774053-701939374585?w=1920&q=95&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <Card className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-400 hover:shadow-blue-200/40 dark:hover:border-blue-500 transition-all duration-300 cursor-default">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-green-500/10 rounded-full">
                            <ShieldCheck className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
                    <CardDescription className="text-center">
                        Create a strong new password for your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                {...register('password')}
                                className={errors.password ? "border-red-500" : ""}
                            />
                            {errors.password && (
                                <p className="text-sm text-red-500">{errors.password.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                {...register('confirmPassword')}
                                className={errors.confirmPassword ? "border-red-500" : ""}
                            />
                            {errors.confirmPassword && (
                                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                            )}
                        </div>
                        <Button className="w-full h-11" type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating Password...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ResetPassword;
