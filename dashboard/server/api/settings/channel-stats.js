const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const requireRoles = require('../../middleware/roles');
const ChannelStat = require('../../../../models/channelStatSchema');
const { getDiscordClient } = require('../../bot');
const { PermissionsBitField } = require('discord.js');

function getSettingsRoles() {
    if (process.env.DASHBOARD_SETTINGS_ROLES) {
        const roles = process.env.DASHBOARD_SETTINGS_ROLES.split(',').filter(role => role.trim());
        return roles;
    }
    
    try {
        const configPath = require('path').join(__dirname, '../../../dist/config.js');
        const configContent = require('fs').readFileSync(configPath, 'utf8')
            .replace(/\/\/ Generated from config\.yml - DO NOT EDIT DIRECTLY\s*/, '')
            .replace('window.DASHBOARD_CONFIG = ', '')
            .replace(/;$/, '');
        
        const config = JSON.parse(configContent);
        
        if (config?.PERMISSIONS?.Dashboard?.Settings) {
            const roles = config.PERMISSIONS.Dashboard.Settings.filter(role => role && role !== 'ROLE_ID');
            return roles;
        }
    } catch (error) {
        console.error('[SETTINGS] Error loading config:', error);
    }
    
    return [];
}

const requireSettingsRoles = requireRoles(getSettingsRoles);

router.get('/', [auth, requireSettingsRoles], async (req, res) => {
    try {
        const guildId = req.user.guildId;
        if (!guildId) {
            return res.status(400).json({ error: 'No guild ID available' });
        }

        const stats = await ChannelStat.find({ guildId });
        res.json(stats);
    } catch (error) {
        console.error('[ERROR] Failed to fetch channel stats:', error);
        res.status(500).json({ error: 'Failed to fetch channel stats' });
    }
});

router.post('/', [auth, requireSettingsRoles], async (req, res) => {
    try {
        const guildId = req.user.guildId;
        const { type, channelName, roleId, existingChannelId, createNewChannel } = req.body;

        if (!type) {
            return res.status(400).json({ error: 'Type is required' });
        }

        const client = getDiscordClient();
        const guild = await client.guilds.fetch(guildId);
        
        let channel;
        
        if (createNewChannel) {
            if (!channelName || !channelName.includes('{stats}')) {
                return res.status(400).json({ error: 'Channel name with {stats} placeholder is required when creating a new channel' });
            }

            channel = await guild.channels.create({
                name: channelName.replace('{stats}', '0'),
                type: 2,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.Connect]
                    }
                ]
            });
        } else {
            if (!existingChannelId) {
                return res.status(400).json({ error: 'Existing channel ID is required when not creating a new channel' });
            }

            channel = await guild.channels.fetch(existingChannelId);
            if (!channel) {
                return res.status(400).json({ error: 'Channel not found' });
            }

            if (channel.type !== 2) {
                return res.status(400).json({ error: 'Selected channel must be a voice channel' });
            }

            await channel.permissionOverwrites.create(guild.roles.everyone, {
                [PermissionsBitField.Flags.Connect]: false
            });
        }

        if ((type === 'TotalMembersWithRole' || type === 'OnlineMembersWithRole') && !roleId) {
            return res.status(400).json({ error: 'Role ID is required for role-based stats' });
        }

        const newStat = new ChannelStat({
            guildId,
            type,
            channelId: channel.id,
            channelName: createNewChannel ? channelName : `{stats} ${channel.name}`,
            roleId: roleId || null
        });

        await newStat.save();
        res.json(newStat);
    } catch (error) {
        console.error('[ERROR] Failed to add channel stat:', error);
        res.status(500).json({ error: 'Failed to add channel stat' });
    }
});

router.delete('/:channelId', [auth, requireSettingsRoles], async (req, res) => {
    try {
        const guildId = req.user.guildId;
        const { channelId } = req.params;

        const stat = await ChannelStat.findOneAndDelete({ guildId, channelId });
        if (!stat) {
            return res.status(404).json({ error: 'Channel stat not found' });
        }

        const client = getDiscordClient();
        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(channelId);
        if (channel) {
            await channel.delete();
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[ERROR] Failed to delete channel stat:', error);
        res.status(500).json({ error: 'Failed to delete channel stat' });
    }
});

router.put('/:channelId', [auth, requireSettingsRoles], async (req, res) => {
    try {
        const guildId = req.user.guildId;
        const { channelId } = req.params;
        const { channelName } = req.body;

        if (!channelName || !channelName.includes('{stats}')) {
            return res.status(400).json({ error: 'Channel name must include {stats} placeholder' });
        }

        const stat = await ChannelStat.findOne({ guildId, channelId });
        if (!stat) {
            return res.status(404).json({ error: 'Channel stat not found' });
        }

        stat.channelName = channelName.trim();
        await stat.save();

        res.json(stat);
    } catch (error) {
        console.error('[ERROR] Failed to update channel stat:', error);
        res.status(500).json({ error: 'Failed to update channel stat', details: error.message });
    }
});

module.exports = router; 