const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const auth = require('../../middleware/auth.js');
const { getDiscordClient } = require('../../bot');
const { loadConfig } = require('../../lib/config.server.js');
//const crypto = require('crypto');
const { getCookieSettings } = require('../../middleware/shared');

const DISCORD_API = 'https://discord.com/api/v10';

class AuthError extends Error {
    constructor(message, statusCode = 400, details = null) {
        super(message);
        this.name = 'AuthError';
        this.statusCode = statusCode;
        this.details = details;
    }
}

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const authService = {
    validateConfig() {
        const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
        const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
        const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

        if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
            throw new AuthError('Missing critical OAuth2 configuration', 500);
        }

        return { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI };
    },

    async exchangeCode(code, config) {
        try {
            const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: config.CLIENT_ID,
                    client_secret: config.CLIENT_SECRET,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: config.REDIRECT_URI
                })
            });

            const tokenData = await tokenRes.json();

            if (!tokenRes.ok || !tokenData.access_token) {
                throw new AuthError('Authentication failed', 400);
            }

            return tokenData;
        } catch (error) {
            throw new AuthError('Authentication failed', 400);
        }
    },

    async fetchUserData(accessToken) {
        try {
            const userRes = await fetch(`${DISCORD_API}/users/@me`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const userData = await userRes.json();

            if (!userRes.ok || !userData.id) {
                console.debug('[AUTH] User data fetch failed:', userData);
                throw new AuthError('Failed to get user data', 400);
            }

            return userData;
        } catch (error) {
            console.debug('[AUTH] User data fetch error:', error);
            throw new AuthError('Failed to get user data', 400);
        }
    },

    async verifyGuildMember(userId, userData) {
        const client = getDiscordClient();
        if (!client) {
            throw new AuthError('Service temporarily unavailable', 503);
        }

        try {
            if (!client.isReady()) {
                console.error('[AUTH] Discord client not ready');
                throw new AuthError('Discord service not ready. Please try again later.', 503);
            }

            let guild;
            try {
                guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
            } catch (guildError) {
                console.error('[AUTH] Guild fetch error:', guildError.message);
                throw new AuthError('Unable to access the Discord server. Please check DISCORD_GUILD_ID configuration.', 401);
            }

            let member;
            try {
                member = await guild.members.fetch(userId);
            } catch (memberError) {
                console.error('[AUTH] Member fetch error:', memberError.message);
                throw new AuthError('User is not a member of the server or cannot be verified due to permission issues.', 401);
            }

            const allowedRoles = process.env.DASHBOARD_LOGIN_ROLES ? 
                process.env.DASHBOARD_LOGIN_ROLES.split(',').filter(role => role.trim()) : [];
            
            const userRoles = Array.from(member.roles.cache.keys());
            const hasAllowedRole = allowedRoles.length === 0 || 
                member.roles.cache.some(role => allowedRoles.includes(role.id));

            if (!hasAllowedRole) {
                throw new AuthError('Insufficient permissions', 403);
            }

            return {
                ...userData,
                roles: Array.from(member.roles.cache.values()).map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.color
                })),
                guildId: guild.id
            };
        } catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            console.error('[AUTH] Verification failed:', error.message);
            throw new AuthError('Unable to verify server membership. Please try again.', 401);
        }
    }
};

router.get('/config', asyncHandler(async (req, res) => {
    const config = loadConfig();
    const { CLIENT_ID, REDIRECT_URI } = authService.validateConfig();
    
    const permissions = {
        Dashboard: {
            Login: (config?.Dashboard?.Permissions?.Dashboard?.Login || []).filter(id => id !== 'ROLE_ID'),
            Usage: (config?.Dashboard?.Permissions?.Dashboard?.Usage || []).filter(id => id !== 'ROLE_ID'),
            Settings: (config?.Dashboard?.Permissions?.Dashboard?.Settings || []).filter(id => id !== 'ROLE_ID'),
            Embed: (config?.Dashboard?.Permissions?.Dashboard?.Embed || []).filter(id => id !== 'ROLE_ID'),
            Suggestions: (config?.Dashboard?.Permissions?.Dashboard?.Suggestions || []).filter(id => id !== 'ROLE_ID')
        }
    };

    res.json({ clientId: CLIENT_ID, redirectUri: REDIRECT_URI, permissions });
}));

router.get('/me', auth, asyncHandler(async (req, res) => {
    res.json({ user: req.user });
}));

router.get('/callback', async (req, res) => {
    const baseUrl = process.env.APP_URL || 'http://localhost:3005';
    
    try {
        const { code } = req.query;
        if (!code) {
            return res.redirect(`${baseUrl}/auth/signin?error=no_code`);
        }

        const config = authService.validateConfig();
        const tokenData = await authService.exchangeCode(code, config);
        const userData = await authService.fetchUserData(tokenData.access_token);
        
        try {
            const enhancedUserData = await authService.verifyGuildMember(userData.id, userData);
            
            const isProduction = process.env.NODE_ENV === 'production';
            const cookieSettings = getCookieSettings(isProduction, process.env.DOMAIN, req);
            
            res.cookie('auth_token', tokenData.access_token, {
                ...cookieSettings,
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/',
            });

            if (req.session) {
                req.session.userData = enhancedUserData;
                req.session.authToken = tokenData.access_token;

                await new Promise((resolve, reject) => {
                    req.session.save(err => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            }

            res.redirect(baseUrl);
        } catch (error) {
            console.log('[CALLBACK DEBUG] Error in guild verification:', error.message);
            console.log('[CALLBACK DEBUG] Error details:', {
                userId: userData.id,
                guildId: process.env.DISCORD_GUILD_ID,
                isAuthError: error instanceof AuthError,
                statusCode: error instanceof AuthError ? error.statusCode : null
            });
            
            if (error instanceof AuthError && error.statusCode === 403) {
                return res.redirect(`${baseUrl}/auth/access-denied`);
            }
            throw error;
        }
    } catch (error) {
        console.log('[CALLBACK DEBUG] Callback error:', error.message);
        console.log('[CALLBACK DEBUG] Error stack:', error.stack);
        
        if (error instanceof AuthError) {
            if (error.statusCode === 403) {
                return res.redirect(`${baseUrl}/auth/access-denied`);
            }
            return res.redirect(`${baseUrl}/auth/signin?error=auth_error`);
        }
        
        return res.redirect(`${baseUrl}/auth/signin?error=unknown_error`);
    }
});

router.post('/logout', auth, asyncHandler(async (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true });
}));

router.get('/status', auth, async (req, res) => {
    try {
        const client = getDiscordClient();
        if (!client) {
            return res.status(500).json({ status: 'offline' });
        }

        const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        
        await guild.members.fetch({ withPresences: true });
        
        const member = await guild.members.fetch(req.user.id);

        const status = member.presence?.status || 'offline';

        res.json({ status });
    } catch (error) {
        console.error('Error fetching user status:', error);
        res.status(500).json({ status: 'offline' });
    }
});

router.use((error, req, res, next) => {
    console.error('[AUTH] Error:', error);
    
    if (error instanceof AuthError) {
        return res.status(error.statusCode).json({
            error: error.message,
            ...(error.details && { details: error.details })
        });
    }

    res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;