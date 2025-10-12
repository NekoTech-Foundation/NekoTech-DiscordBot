import { useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { auth } from '../../lib/auth/auth';

export default function LoginPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const returnUrl = location.state?.returnUrl || searchParams.get('returnUrl');

    useEffect(() => {
        async function handleAuth() {
            const isAuth = await auth.isAuthenticated();
            if (isAuth) {
                navigate(returnUrl || '/', { replace: true });
                return;
            }

            auth.login(returnUrl || undefined);
        }

        handleAuth();
    }, [navigate, returnUrl]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">Logging in...</h1>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
        </div>
    );
} 