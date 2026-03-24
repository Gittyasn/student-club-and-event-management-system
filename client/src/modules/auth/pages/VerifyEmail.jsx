import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MailCheck, Loader2 } from 'lucide-react';
import authService from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [isSending, setIsSending] = useState(false);

    const handleResend = async () => {
        if (!email) {
            toast.error('Please enter your email address.');
            return;
        }
        setIsSending(true);
        try {
            await authService.resendVerification(email);
            toast.success('Verification email sent. Please check your inbox.');
        } catch (error) {
            console.error('Resend verification error:', error);
            toast.error(error.message || 'Failed to resend verification email.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1562774053-701939374585?w=1920&q=95&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <Card className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-400 hover:shadow-blue-200/40 dark:hover:border-blue-500 transition-all duration-300 cursor-default">
                <CardHeader className="space-y-2 text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <MailCheck className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
                    <CardDescription>
                        We have sent a verification link to your inbox. Please confirm your email to activate your account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="verify-email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                        <Input
                            id="verify-email"
                            type="email"
                            placeholder="name@college.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm"
                        />
                    </div>
                    <Button className="w-full h-11 transition-all" onClick={handleResend} disabled={isSending}>
                        {isSending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Transmitting...
                            </>
                        ) : (
                            'Resend Verification Email'
                        )}
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center italic">
                        Check your spam or promotions folder if you do not see the email within a few minutes.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 py-4">
                    <p className="text-sm text-muted-foreground">
                        Already verified?{' '}
                        <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-bold">
                            Sign In
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default VerifyEmail;
