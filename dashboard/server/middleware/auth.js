const fetch = require('node-fetch');
const { getDiscordClient } = require('../bot');

function getAllowedRoles() {
    try {
        return process.env.ALLOWED_ROLES ? JSON.parse(process.env.ALLOWED_ROLES) : [];
    } catch (error) {
        return [];
    }
}

const auth = async(req, res, next) => {
    try {
        const token = req.cookies.auth_token;

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated', code: 'NO_AUTH_TOKEN' });
        }

        const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
            headers: {
                Authorization: `Bearer ${token}`,
                'User-Agent': 'DiscordBot (https://discord.com, v10)'
            }
        });

        if (!userResponse.ok) {
            res.clearCookie('auth_token');
            return res.status(401).json({ error: 'Invalid token' });
        }

        const userData = await userResponse.json();

        const client = getDiscordClient();
        if (!client) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        try {
            const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
            const member = await guild.members.fetch(userData.id);

            const userRoles = Array.from(member.roles.cache.values());

            userData.roles = userRoles.map(role => role.id);
            userData.guildId = process.env.DISCORD_GUILD_ID;

            req.user = userData;
            next();
        } catch (error) {
            res.clearCookie('auth_token');
            return res.status(401).json({ 
                error: 'Access Denied', 
                message: 'You must be a member of the server with appropriate roles to access this dashboard.',
                code: 'NOT_IN_GUILD'
            });
        }
    } catch (error) {
        res.clearCookie('auth_token');
        return res.status(401).json({ 
            error: 'Authentication Failed', 
            message: 'Please try signing in again.',
            code: 'AUTH_FAILED'
        });
    }
};

module.exports = auth;