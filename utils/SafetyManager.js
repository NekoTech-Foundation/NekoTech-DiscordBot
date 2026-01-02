const guildData = require('../models/guildDataSchema');
const { PermissionFlagsBits } = require('discord.js');

class SafetyManager {
    constructor() {
        this.limits = new Map(); // Map<guildID, Map<userID, { type: { count, lastReset } }>>
    }

    async getGuildSettings(guildID) {
        let data = await guildData.findOne({ guildID });
        if (!data) {
            data = await guildData.create({ guildID });
        }
        // Ensure structure exists if it's an old record
        if (!data.safety) {
            data.safety = {
                antinuke: {
                    enabled: false,
                    whitelistedUsers: [],
                    whitelistedRoles: [],
                    limits: {
                        ban: { threshold: 3, period: 60000 },
                        kick: { threshold: 3, period: 60000 },
                        channelDelete: { threshold: 2, period: 60000 },
                        roleDelete: { threshold: 2, period: 60000 }
                    },
                    actions: {
                        ban: 'ban',
                        kick: 'ban',
                        channelDelete: 'ban',
                        roleDelete: 'ban'
                    }
                },
                antihoist: {
                    enabled: false,
                    disallowedChars: ['!', '"', '#', '$', '%', '&', '\'', '(', ')', '*', '+', ',', '-', '.', '/', ':', ';', '<', '=', '>', '?', '@', '[', '\\', ']', '^', '_', '`', '{', '|', '}', '~'],
                    action: 'nickname'
                }
            };
            await data.save();
        }
        return data.safety;
    }

    async checkAntiNuke(client, guild, executor, type) {
        if (!executor || executor.id === client.user.id || executor.id === guild.ownerId) return;

        const settings = await this.getGuildSettings(guild.id);
        const { antinuke } = settings;

        if (!antinuke.enabled) return;
        if (antinuke.whitelistedUsers.includes(executor.id)) return;
        
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member && member.roles.cache.some(r => antinuke.whitelistedRoles.includes(r.id))) return;

        // Rate Limit Logic
        const limitConfig = antinuke.limits[type];
        if (!limitConfig) return;

        if (!this.limits.has(guild.id)) this.limits.set(guild.id, new Map());
        const guildLimits = this.limits.get(guild.id);

        if (!guildLimits.has(executor.id)) guildLimits.set(executor.id, {});
        const userLimits = guildLimits.get(executor.id);

        const now = Date.now();
        if (!userLimits[type]) userLimits[type] = { count: 0, lastReset: now };

        if (now - userLimits[type].lastReset > limitConfig.period) {
            userLimits[type].count = 0;
            userLimits[type].lastReset = now;
        }

        userLimits[type].count++;

        if (userLimits[type].count > limitConfig.threshold) {
             const action = antinuke.actions[type];
             await this.punishUser(guild, executor, action, `AntiNuke: Exceeded ${type} limit`);
             
             userLimits[type].count = 0; // Reset to avoid repeated spam of punishment in short burst
        }
    }

    async checkAntiHoist(member) {
        if (member.user.bot) return;
        
        const settings = await this.getGuildSettings(member.guild.id);
        const { antihoist } = settings;

        if (!antihoist.enabled) return;

        const disallowedChars = new Set(antihoist.disallowedChars);
        let displayName = member.displayName;
        const originalName = displayName;

        while (displayName.length > 0 && (disallowedChars.has(displayName.charAt(0)) || displayName.charAt(0) === ' ')) {
            displayName = displayName.substring(1);
        }

        if (displayName.length === 0) displayName = "Moderated Name";

        if (originalName !== displayName) {
             if (antihoist.action === 'kick') {
                 if (member.kickable) await member.kick("AntiHoist: Disallowed character in nickname");
             } else {
                 if (member.manageable) await member.setNickname(displayName, "AntiHoist: Disallowed character");
             }
        }
    }

    async punishUser(guild, user, action, reason) {
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        try {
            switch (action) {
                case 'ban':
                    if (member.bannable) await member.ban({ reason });
                    break;
                case 'kick':
                    if (member.kickable) await member.kick(reason);
                    break;
                case 'removeRoles':
                     const roles = member.roles.cache.filter(r => r.id !== guild.id && !r.managed && r.position < guild.members.me.roles.highest.position);
                     if (roles.size > 0) await member.roles.remove(roles, reason);
                    break;
            }
        } catch (err) {
            console.error(`Failed to punish user ${user.tag}:`, err);
        }
    }
}

module.exports = new SafetyManager();
