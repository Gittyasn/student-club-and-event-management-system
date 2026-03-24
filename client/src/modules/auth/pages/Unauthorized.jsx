import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';

const Unauthorized = () => {
    const navigate = useNavigate();
    const { role } = useAuthStore();

    const handleBack = () => {
        if (role === 'admin') navigate('/admin');
        else if (role === 'coordinator') navigate('/coordinator');
        else if (role === 'student') navigate('/student');
        else navigate('/');
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-slate-50 px-4">
            <Card className="w-full max-w-md shadow-lg border-slate-200 text-center">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-red-100 rounded-full">
                            <ShieldAlert className="h-10 w-10 text-red-600" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold text-slate-900">Access Denied</CardTitle>
                    <CardDescription className="text-lg">
                        You don&apos;t have permission to view this page.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <p className="text-slate-600">
                        This area is restricted to authorized roles. If you believe this is an error, please contact the administrator.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button
                        className="w-full flex items-center gap-2"
                        variant="default"
                        onClick={handleBack}
                    >
                        <Home className="h-4 w-4" />
                        Go to Dashboard
                    </Button>
                    <Button
                        className="w-full flex items-center gap-2"
                        variant="outline"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Unauthorized;
