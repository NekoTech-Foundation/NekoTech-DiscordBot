import axios from 'axios';

const API_URL = window.DASHBOARD_CONFIG?.API_URL;

export interface User {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    global_name: string | null;
    accent_color?: number | null;
    banner?: string | null;
    banner_color?: string | null;
    email?: string;
    flags?: number;
    mfa_enabled?: boolean;
    verified?: boolean;
    premium_type?: number;
    public_flags?: number;
    locale?: string;
    roles?: string[];
}

export interface Session {
    user: User | null;
    accessToken: string | null;
}

interface CallbackResult {
    returnUrl?: string;
    error?: 'access_denied' | 'auth_error';
}

class AuthService {
    private session: Session = {
        user: null,
        accessToken: null
    };
    private sessionPromise: Promise<void> | null = null;
    private oauthConfig: { clientId: string; redirectUri: string } | null = null;
    private readonly authPages = ['/auth/callback', '/auth/signin', '/auth/access-denied'];

    constructor() {
        this.sessionPromise = this.validateSession();
    }

    private async validateSession() {
        try {
            if (this.authPages.some(page => window.location.pathname === page)) {
                return;
            }

            const response = await axios.get(`${API_URL}/auth/me`, { withCredentials: true });
            if (response.data?.user) {
                this.session.user = response.data.user;
            } else {
                const currentPath = window.location.pathname;
                if (!this.authPages.includes(currentPath)) {
                    window.location.href = `/auth/signin${currentPath !== '/' ? `?returnUrl=${currentPath}` : ''}`;
                }
            }
        } catch (error) {
            this.session = { user: null, accessToken: null };
            const currentPath = window.location.pathname;
            if (!this.authPages.includes(currentPath)) {
                window.location.href = `/auth/signin${currentPath !== '/' ? `?returnUrl=${currentPath}` : ''}`;
            }
        } finally {
            this.sessionPromise = null;
        }
    }

    async isAuthenticated(): Promise<boolean> {
        if (this.sessionPromise) {
            await this.sessionPromise;
        }
        return !!this.session.user;
    }

    async getUser(): Promise<User | null> {
        if (this.sessionPromise) {
            await this.sessionPromise;
        }
        return this.session.user;
    }

    private async getOAuthConfig() {
        if (this.oauthConfig) return this.oauthConfig;
        
        try {
            const response = await axios.get(`${API_URL}/auth/config`);
            this.oauthConfig = response.data;
            return this.oauthConfig;
        } catch (error) {
            console.error('[Auth] Failed to load OAuth config:', error);
            return null;
        }
    }

    async login(returnUrl?: string) {
        if (returnUrl) {
            sessionStorage.setItem('returnUrl', returnUrl);
        }

        const config = await this.getOAuthConfig();

        const params = new URLSearchParams({
            client_id: config?.clientId || '',
            redirect_uri: config?.redirectUri || '',
            response_type: 'code',
            scope: 'identify email guilds guilds.members.read'
        });

        const url = `https://discord.com/api/oauth2/authorize?${params}`;
        window.location.href = url;
    }

    async handleCallback(code: string): Promise<CallbackResult> {
        console.log('[Callback] Handling callback with code');
        try {
            const response = await axios.get(`${API_URL}/auth/callback?code=${code}`, {
                withCredentials: true
            });

            const { user, token } = response.data;

            if (!user) {
                throw new Error('Invalid response from server');
            }

            this.session = { user, accessToken: token };

            const returnUrl = sessionStorage.getItem('returnUrl');
            sessionStorage.removeItem('returnUrl');

            return { returnUrl: returnUrl || '/' };
        } catch (error: any) {
            this.session = { user: null, accessToken: null };
            sessionStorage.removeItem('returnUrl');

            if (error.response?.status === 403) {
                return { error: 'access_denied' };
            }

            return { error: 'auth_error' };
        }
    }

    async logout() {
        try {
            await axios.post(`${API_URL}/auth/logout`, {}, {
                withCredentials: true
            });
        } finally {
            this.session = { user: null, accessToken: null };
            window.location.href = '/auth/signin';
        }
    }

    async getSession(): Promise<Session | null> {
        try {
            const response = await axios.get(`${API_URL}/auth/me`, {
                withCredentials: true
            });
            
            const { user } = response.data;
            if (!user) return null;
            
            return { user, accessToken: null };
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                window.location.href = `/auth/signin${window.location.pathname !== '/' ? `?returnUrl=${window.location.pathname}` : ''}`;
                return null;
            }
            console.error('[Auth] Error getting session:', error);
            return null;
        }
    }
}

export const auth = new AuthService();