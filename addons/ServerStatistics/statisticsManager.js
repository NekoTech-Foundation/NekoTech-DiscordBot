const StatisticsEmbed = require('./utils/embedUtils');
const StatisticsModel = require('./models/StatisticsModel');
const { parseTimeInterval } = require('./utils/timeParser');
const mongoose = require('mongoose');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

class StatisticsManager {
    constructor(client) {
        this.client = client;
        this.config = yaml.load(fs.readFileSync(path.join(__dirname, 'config.yml'), 'utf8'));
        this.embedUtils = new StatisticsEmbed(this.config);
        this.initialized = false;
    }

    log(message) {
        if (this.config.debug) {
            console.log(`[Statistics] ${message}`);
        }
    }

    async init() {
        try {
            if (!this.config.enabled) {
                console.log('[Statistics] Addon is disabled');
                return false;
            }

            if (!mongoose.connection || mongoose.connection.readyState !== 1) {
                console.log('[Statistics] Waiting for database connection...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                if (!mongoose.connection || mongoose.connection.readyState !== 1) {
                    console.error('[Statistics] Database connection not available');
                    return false;
                }
            }

            console.log('[Statistics] Database connected, proceeding with initialization');
            await this.updateStatistics(true);
            this.startUpdateInterval();
            this.initialized = true;
            return true;

        } catch (error) {
            console.error('[Statistics] Initialization error:', error);
            return false;
        }
    }

    async updateStatistics(immediate = false) {
        this.log(`Starting statistics update${immediate ? ' (immediate)' : ''}`);
        
        for (const guild of this.client.guilds.cache.values()) {
            try {
                const stats = await this.collectGuildStats(guild);
                await this.updateDisplay(guild, stats);
            } catch (error) {
                this.log(`Failed to update stats for guild ${guild.id}: ${error.message}`);
            }
        }
    }

    async collectGuildStats(guild) {
        try {
            const stats = {};
            const track = this.config.track;
        
            if (track.members || track.bots) {
                stats.members = guild.members.cache.filter(m => !m.user.bot).size;
                stats.bots = guild.members.cache.filter(m => m.user.bot).size;
                stats.totalUsers = guild.memberCount;
                stats.online = guild.members.cache.filter(m => 
                    ['online', 'idle', 'dnd'].includes(m.presence?.status)).size;
                stats.offline = guild.members.cache.filter(m => 
                    !m.presence || m.presence.status === 'offline').size;
            }
            
            if (track.channels) {
                stats.channels = {
                    text: guild.channels.cache.filter(c => c.type === 0).size,
                    voice: guild.channels.cache.filter(c => c.type === 2).size,
                    categories: guild.channels.cache.filter(c => c.type === 4).size,
                    forum: guild.channels.cache.filter(c => c.type === 15).size,
                    total: guild.channels.cache.size
                };
            }
            
            if (track.roles || track.boosts) {
                stats.roles = guild.roles.cache.size || 0;
                stats.boostTier = guild.premiumTier || 0;
                stats.boosts = guild.premiumSubscriptionCount || 0;
            }
            
            if (track.emojis) {
                const maxEmojis = guild.maximumEmojis || 50;
                stats.emojis = {
                    normal: guild.emojis.cache.filter(e => !e.animated).size,
                    animated: guild.emojis.cache.filter(e => e.animated).size,
                    total: guild.emojis.cache.size,
                    limit: maxEmojis
                };
            }
            
            if (track.stickers) {
                const maxStickers = guild.maximumStickers || 50;
                stats.stickers = {
                    count: guild.stickers?.cache.size || 0,
                    limit: maxStickers
                };
            }
            
            if (track.messages) {
                let messageCount = 0;
                const textChannels = guild.channels.cache.filter(c => c.type === 0);
                for (const channel of textChannels.values()) {
                    try {
                        const messages = await channel.messages.fetch({ limit: 100 });
                        messageCount += messages.size;
                    } catch (error) {
                        this.log(`Error fetching messages for channel ${channel.name}`);
                    }
                }
                stats.messages = messageCount;
            }
            
            if (track.moderation) {
                const bans = await guild.bans.fetch().catch(() => null);
                const auditLogs = await guild.fetchAuditLogs().catch(() => null);
                
                this.log(`Total events: ${guild.scheduledEvents?.cache.size || 0}`);
                
                const upcomingEvents = guild.scheduledEvents?.cache.filter(event => {
                    this.log(`Event ${event.name}: ${event.status}`);
                    return event.status === 1 || event.status === 2;
                });
            
                const activeCount = upcomingEvents?.size || 0;
                this.log(`Found ${activeCount} active/scheduled events`);
                
                stats.moderation = {
                    bans: bans?.size || 0,
                    kicks: auditLogs?.entries.filter(log => log.action === 20)?.size || 0,
                    timeouts: auditLogs?.entries.filter(log => log.action === 24)?.size || 0,
                    events: activeCount
                };
            }
        
            return stats;
        } catch (error) {
            this.log(`Error collecting stats: ${error.message}`);
            return null;
        }
    }

    async updateDisplay(guild, stats) {
        const channel = guild.channels.cache.get(this.config.statistics_channel);
        if (!channel) {
            console.error(`[Statistics] Channel ${this.config.statistics_channel} not found in guild ${guild.name}`);
            return;
        }
    
        if (!channel.permissionsFor(guild.members.me).has(['ViewChannel', 'SendMessages'])) {
            console.error(`[Statistics] Missing permissions in channel ${channel.name}`);
            return;
        }

        const statsDoc = await StatisticsModel.findOne({ guildId: guild.id });
        
        try {
            if (this.config.display_mode === 'single') {
                await this.updateSingleMode(channel, stats, statsDoc);
            } else {
                await this.updateMultipleMode(channel, stats, statsDoc);
            }
        } catch (error) {
            this.log(`Failed to update display: ${error.message}`);
        }
    }

    async updateSingleMode(channel, stats, statsDoc) {
        try {
            const embed = this.embedUtils.createSingleEmbed(stats, channel.guild);
    
            if (statsDoc?.messageIds?.single) {
                try {
                    const message = await channel.messages.fetch(statsDoc.messageIds.single);
                    await message.edit({ embeds: [embed] });
                    this.log('Updated existing single mode message');
                    return;
                } catch (error) {
                    this.log(`Failed to edit message, creating new one: ${error.message}`);
                }
            }
    
            const message = await channel.send({ embeds: [embed] });
            await StatisticsModel.findOneAndUpdate(
                { guildId: channel.guild.id },
                { $set: { 'messageIds.single': message.id } },
                { upsert: true }
            ).catch(err => console.error('[Statistics] MongoDB Error:', err));
            
            this.log('Created new single mode message');
        } catch (error) {
            console.error('[Statistics] Critical error in updateSingleMode:', error);
        }
    }

    async updateMultipleMode(channel, stats, statsDoc) {
        const enabledCategories = Object.entries(this.config.categories)
            .filter(([_, config]) => config.enabled)
            .sort((a, b) => a[1].position - b[1].position)
            .map(([name, config]) => ({ name, position: config.position }));
    
        const storedMessages = statsDoc?.messageIds?.multiple || new Map();
    
        let needsRecreation = storedMessages.size === 0;
        if (!needsRecreation) {
            for (const stored of storedMessages.values()) {
                try {
                    await channel.messages.fetch(stored.id);
                } catch {
                    needsRecreation = true;
                    break;
                }
            }
        }
    
        if (needsRecreation) {
            this.log('Recreating all category messages');
            
            for (const stored of storedMessages.values()) {
                try {
                    const message = await channel.messages.fetch(stored.id);
                    await message.delete();
                } catch {}
            }
    
            await StatisticsModel.findOneAndUpdate(
                { guildId: channel.guild.id },
                { $unset: { 'messageIds.multiple': "" } }
            );
    
            const newMessageIds = new Map();
            for (const { name, position } of enabledCategories) {
                const embed = this.embedUtils.createCategoryEmbed(name, stats, channel.guild);
                const message = await channel.send({ embeds: [embed] });
                newMessageIds.set(name, { id: message.id, position });
                await new Promise(resolve => setTimeout(resolve, 100));
            }
    
            await StatisticsModel.findOneAndUpdate(
                { guildId: channel.guild.id },
                { $set: { 'messageIds.multiple': newMessageIds } },
                { upsert: true }
            );
            return;
        }
    
        const newMessageIds = new Map();
        for (const { name, position } of enabledCategories) {
            const stored = storedMessages.get(name);
            const embed = this.embedUtils.createCategoryEmbed(name, stats, channel.guild);
    
            if (!stored) {
                const message = await channel.send({ embeds: [embed] });
                newMessageIds.set(name, { id: message.id, position });
                continue;
            }
    
            if (stored.position !== position) {
                const swapCategory = enabledCategories.find(c => 
                    storedMessages.get(c.name)?.position === position);
                
                if (swapCategory) {
                    const message1 = await channel.messages.fetch(stored.id);
                    const message2 = await channel.messages.fetch(storedMessages.get(swapCategory.name).id);
                    
                    await message1.edit({ embeds: [this.embedUtils.createCategoryEmbed(swapCategory.name, stats, channel.guild)] });
                    await message2.edit({ embeds: [embed] });
    
                    newMessageIds.set(name, { id: message2.id, position });
                    newMessageIds.set(swapCategory.name, { id: message1.id, position: stored.position });
                }
            } else {
                const message = await channel.messages.fetch(stored.id);
                await message.edit({ embeds: [embed] });
                newMessageIds.set(name, { id: stored.id, position });
            }
        }
    
        for (const [oldCategory, stored] of storedMessages) {
            if (!enabledCategories.find(c => c.name === oldCategory)) {
                try {
                    const message = await channel.messages.fetch(stored.id);
                    await message.delete();
                    this.log(`Deleted message for disabled category ${oldCategory}`);
                } catch (error) {
                    this.log(`Failed to delete old category message: ${error.message}`);
                }
            }
        }
    
        await StatisticsModel.findOneAndUpdate(
            { guildId: channel.guild.id },
            { $set: { 'messageIds.multiple': newMessageIds } },
            { upsert: true }
        );
    }

    startUpdateInterval() {
        const interval = parseTimeInterval(this.config.update_interval);
        this.log(`Setting update interval to ${interval}ms`);
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => this.updateStatistics(), interval);
    }

    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            this.log('Cleaned up interval');
        }
    }
}

module.exports.run = async (client) => {
    try {
        console.log('[Statistics] Starting addon initialization...');
        const manager = new StatisticsManager(client);
        const success = await manager.init();
        console.log(`[Statistics] Initialization ${success ? 'successful' : 'failed'}`);
        if (success) {
            client.statsManager = manager;
        }
        return success;
    } catch (error) {
        console.error('[Statistics] Critical error during startup:', error);
        return false;
    }
};

module.exports.cleanup = async (client) => {
    if (client.statsManager) {
        client.statsManager.cleanup();
        client.statsManager = null;
        console.log('[Statistics] Cleaned up successfully');
    }
};