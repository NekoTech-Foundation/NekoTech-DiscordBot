const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.js');
const Suggestion = require('../../../../models/Suggestion.js');
const { getDiscordClient } = require('../../bot');
const { loadConfig } = require('../../lib/config.server.js');
const suggestionActions = require('../../../../events/Suggestions/suggestionActions');

class Cache {
    constructor() {
        this.store = new Map();
        this.TTL = {
            SUGGESTIONS: 60000,
        };
        
        setInterval(() => this.cleanup(), 60000);
    }

    set(key, value, ttl) {
        const expires = Date.now() + ttl;
        this.store.set(key, { value, expires });
    }

    get(key) {
        const item = this.store.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expires) {
            this.store.delete(key);
            return null;
        }
        
        return item.value;
    }

    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.store.entries()) {
            if (now > item.expires) {
                this.store.delete(key);
            }
        }
    }
}

const cache = new Cache();

const checkSuggestionPermissions = async (req, res, next) => {
    try {
        const config = loadConfig();
        const allowedRoles = config?.Dashboard?.Permissions?.Dashboard?.Suggestions || [];
        const userRoles = req.user?.roles || [];

        if (!userRoles.some(role => allowedRoles.includes(role))) {
            return res.status(403).json({ error: 'You do not have permission to manage suggestions' });
        }

        next();
    } catch (error) {
        console.error('Error checking suggestion permissions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

router.get('/', auth, checkSuggestionPermissions, async (req, res) => {
    try {
        const cachedSuggestions = cache.get('suggestions');
        if (cachedSuggestions) {
            return res.json(cachedSuggestions);
        }

        const suggestions = await Suggestion.find()
            .sort({ createdAt: -1 })
            .lean();

        cache.set('suggestions', suggestions, cache.TTL.SUGGESTIONS);
        res.json(suggestions);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

router.post('/:id/accept', auth, checkSuggestionPermissions, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const client = getDiscordClient();

        if (!client) {
            return res.status(500).json({ error: 'Discord client not available' });
        }

        const suggestion = await Suggestion.findOne({ uniqueId: id });
        if (!suggestion) {
            return res.status(404).json({ error: 'Suggestion not found' });
        }

        const guild = await client.guilds.fetch(suggestion.guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const mockInteraction = {
            guild: guild,
            user: { id: req.user.id },
            client: client,
            replied: false,
            deferred: false,
            reply: () => Promise.resolve(),
            editReply: () => Promise.resolve(),
            deferReply: () => Promise.resolve()
        };

        await suggestionActions.acceptSuggestion(client, mockInteraction, id, reason);
        cache.store.delete('suggestions');

        res.json(suggestion);
    } catch (error) {
        console.error('Error accepting suggestion:', error);
        res.status(500).json({ error: 'Failed to accept suggestion' });
    }
});

router.post('/:id/deny', auth, checkSuggestionPermissions, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const client = getDiscordClient();

        if (!client) {
            return res.status(500).json({ error: 'Discord client not available' });
        }

        const suggestion = await Suggestion.findOne({ uniqueId: id });
        if (!suggestion) {
            return res.status(404).json({ error: 'Suggestion not found' });
        }

        const guild = await client.guilds.fetch(suggestion.guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const mockInteraction = {
            guild: guild,
            user: { id: req.user.id },
            client: client,
            replied: false,
            deferred: false,
            reply: () => Promise.resolve(),
            editReply: () => Promise.resolve(),
            deferReply: () => Promise.resolve()
        };

        await suggestionActions.denySuggestion(client, mockInteraction, id, reason);
        cache.store.delete('suggestions');

        res.json(suggestion);
    } catch (error) {
        console.error('Error denying suggestion:', error);
        res.status(500).json({ error: 'Failed to deny suggestion' });
    }
});

router.get('/user/:userId', auth, async(req, res) => {
    try {
        const { userId } = req.params;

        if (!userId || userId === 'undefined' || userId === 'null') {
            return res.status(400).json({
                id: null,
                username: 'Unknown User',
                discriminator: '0000',
                avatar: null,
                globalName: 'Unknown User'
            });
        }

        const client = getDiscordClient();
        if (!client) {
            console.error('[SUGGESTIONS] Discord client not initialized');
            return res.status(500).json({ 
                id: userId,
                username: 'Unknown User',
                discriminator: '0000',
                avatar: null,
                globalName: 'System'
            });
        }

        try {
            const user = await client.users.fetch(userId);
            return res.json({
                id: user.id,
                username: user.username || 'Unknown User',
                discriminator: user.discriminator || '0000',
                avatar: user.avatar,
                globalName: user.globalName || user.username || 'Unknown User'
            });
        } catch (discordError) {
            console.error('[SUGGESTIONS] Discord API error:', discordError);
            return res.status(404).json({
                id: userId,
                username: 'Unknown User',
                discriminator: '0000',
                avatar: null,
                globalName: `User#${userId}`
            });
        }
    } catch (error) {
        console.error('[SUGGESTIONS] Error fetching Discord user:', error);
        return res.status(500).json({
            id: userId || null,
            username: 'Unknown User',
            discriminator: '0000',
            avatar: null,
            globalName: 'System User'
        });
    }
});

router.delete('/:id', auth, checkSuggestionPermissions, async (req, res) => {
    try {
        const { id } = req.params;
        const client = getDiscordClient();

        if (!client) {
            return res.status(500).json({ error: 'Discord client not available' });
        }

        const suggestion = await Suggestion.findOne({ uniqueId: id });
        if (!suggestion) {
            return res.status(404).json({ error: 'Suggestion not found' });
        }

        try {
            const channel = await client.channels.fetch(suggestion.channelId);
            if (channel) {
                const message = await channel.messages.fetch(suggestion.messageId);
                if (message) {
                    await message.delete();
                }
            }
        } catch (error) {
            console.error('Error deleting Discord message:', error);
        }

        await Suggestion.deleteOne({ uniqueId: id });
        cache.store.delete('suggestions');

        res.json({ message: 'Suggestion deleted successfully' });
    } catch (error) {
        console.error('Error deleting suggestion:', error);
        res.status(500).json({ error: 'Failed to delete suggestion' });
    }
});

module.exports = router; 