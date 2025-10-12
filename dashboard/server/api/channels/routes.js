const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { loadConfig } = require('../../lib/config.server.js');
const { getDiscordClient } = require('../../bot');

const checkEmbedPermissions = async (req, res, next) => {
    try {
        const config = loadConfig();
        const allowedRoles = config?.Dashboard?.Permissions?.Dashboard?.Embed || [];
        const userRoles = req.user?.roles || [];

        if (!userRoles.some(role => allowedRoles.includes(role))) {
            return res.status(403).json({ error: 'You do not have permission to use the embed builder' });
        }

        next();
    } catch (error) {
        console.error('Error checking embed permissions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

router.get('/', auth, async (req, res) => {
    try {
        const client = global.client;
        const guild = client.guilds.cache.first();
        
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const channels = guild.channels.cache
            .filter(channel => channel.type === 0 || channel.type === 5)
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                type: channel.type,
                parent: channel.parent ? {
                    id: channel.parent.id,
                    name: channel.parent.name
                } : null
            }));

        res.json(channels);
    } catch (error) {
        console.error('[Channels] Error fetching channels:', error);
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
});

router.post('/:channelId/messages', auth, checkEmbedPermissions, async (req, res) => {
    try {
        const { channelId } = req.params;
        const { embeds, linkButtons } = req.body;
        
        const client = global.client;
        const channel = await client.channels.fetch(channelId);
        
        if (!channel) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        if (!channel.permissionsFor(client.user).has('SendMessages')) {
            return res.status(403).json({ error: 'Bot does not have permission to send messages in this channel' });
        }

        if (!Array.isArray(embeds) || embeds.length === 0) {
            return res.status(400).json({ error: 'Invalid embeds array' });
        }

        const components = [];
        if (linkButtons && linkButtons.length > 0) {
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const buttons = linkButtons.map(button => {
                const btn = new ButtonBuilder()
                    .setLabel(button.label)
                    .setURL(button.url)
                    .setStyle(ButtonStyle.Link);
                
                if (button.emoji) {
                    btn.setEmoji(button.emoji);
                }
                
                return btn;
            });

            for (let i = 0; i < buttons.length; i += 5) {
                const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
                components.push(row);
            }
        }

        const message = await channel.send({ embeds, components });
        res.json({ success: true, message });
    } catch (error) {
        console.error('[Channels] Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

router.post('/:channelId/embeds', auth, checkEmbedPermissions, async (req, res) => {
    try {
        const { channelId } = req.params;
        const { embed } = req.body;
        const client = getDiscordClient();
        const channel = await client.channels.fetch(channelId);

        if (!channel) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        if (embed.color) {
            embed.color = parseInt(embed.color.replace('#', ''), 16);
        }

        const components = [];
        if (embed.linkButtons && embed.linkButtons.length > 0) {
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const buttons = embed.linkButtons.map(button => {
                const btn = new ButtonBuilder()
                    .setLabel(button.label)
                    .setURL(button.url)
                    .setStyle(ButtonStyle.Link);
                
                if (button.emoji) {
                    btn.setEmoji(button.emoji);
                }
                
                return btn;
            });

            for (let i = 0; i < buttons.length; i += 5) {
                const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
                components.push(row);
            }
        }

        const { linkButtons, ...embedData } = embed;

        await channel.send({ embeds: [embedData], components });
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending embed:', error);
        res.status(500).json({ error: 'Failed to send embed' });
    }
});

module.exports = router; 