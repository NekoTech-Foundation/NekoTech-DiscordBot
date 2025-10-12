import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth } from '../../lib/auth/auth';

export default function CallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        async function handleCallback() {
            console.log('[Callback] Starting callback handling');
            try {
                const code = searchParams.get('code');
                const error = searchParams.get('error');
                const errorDescription = searchParams.get('error_description');

                console.log('[Callback] Params:', { code, error, errorDescription });

                if (error) {
                    console.error('[Callback] Discord error:', error, errorDescription);
                    navigate('/auth/signin?error=discord_error', { replace: true });
                    return;
                }

                if (!code) {
                    console.error('[Callback] No code received');
                    navigate('/auth/signin?error=no_code', { replace: true });
                    return;
                }

                console.log('[Callback] Exchanging code for session');
                const result = await auth.handleCallback(code);
                
                if (result.error === 'access_denied') {
                    navigate('/auth/access-denied', { replace: true });
                } else if (result.error) {
                    navigate('/auth/signin?error=callback_error', { replace: true });
                } else if (result.returnUrl) {
                    const authPages = ['/auth/callback', '/auth/signin', '/auth/access-denied'];
                    const returnUrl = result.returnUrl;
                    if (authPages.some(page => returnUrl.startsWith(page))) {
                        navigate('/', { replace: true });
                    } else {
                        window.location.href = returnUrl;
                    }
                } else {
                    navigate('/', { replace: true });
                }
            } catch (error) {
                console.error('[Callback] Error in callback:', error);
                navigate('/auth/signin?error=unknown_error', { replace: true });
            }
        }

        handleCallback();
    }, [searchParams, navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-secondary to-secondary/80">
            <div className="text-foreground text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Authenticating...</p>
            </div>
        </div>
    );
}
