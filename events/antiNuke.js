const { AuditLogEvent } = require('discord.js');
const SafetyManager = require('../utils/SafetyManager');

module.exports = (client) => {
    client.on('guildMemberRemove', async (member) => {
        try {
            const auditLogs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 });
            const entry = auditLogs.entries.first();
            if (entry && entry.target.id === member.id && entry.executor) {
                await SafetyManager.checkAntiNuke(client, member.guild, entry.executor, 'kick');
            }
        } catch (e) {
            // Ignore errors (e.g. missing permissions)
        }
    });

    client.on('guildBanAdd', async (ban) => {
        try {
            const auditLogs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
            const entry = auditLogs.entries.first();
            if (entry && entry.target.id === ban.user.id && entry.executor) {
                await SafetyManager.checkAntiNuke(client, ban.guild, entry.executor, 'ban');
            }
        } catch (e) {
             // Ignore
        }
    });

    client.on('channelDelete', async (channel) => {
        try {
            const auditLogs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 });
            const entry = auditLogs.entries.first();
            if (entry && entry.target.id === channel.id && entry.executor) {
                await SafetyManager.checkAntiNuke(client, channel.guild, entry.executor, 'channelDelete');
            }
        } catch (e) {
             // Ignore
        }
    });

    client.on('roleDelete', async (role) => {
        try {
            const auditLogs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 });
            const entry = auditLogs.entries.first();
            if (entry && entry.target.id === role.id && entry.executor) {
                await SafetyManager.checkAntiNuke(client, role.guild, entry.executor, 'roleDelete');
            }
        } catch (e) {
             // Ignore
        }
    });
};