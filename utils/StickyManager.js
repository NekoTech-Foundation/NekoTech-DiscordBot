const StickyMessage = require('../models/StickyMessage');
const KentaScratch = require('./kentaScratch');
const { EmbedBuilder, WebhookClient } = require('discord.js');

class StickyManager {
    constructor() {
        this.timers = new Map(); // Map<channelId, timeout>
        this.processing = new Set(); // Set<channelId> to prevent double sending
    }

    /**
     * Handle new message in a channel
     * @param {Message} message 
     */
    async handleMessage(message) {
        if (message.author.bot) return; // Ignore bots? Maybe sticky ignores bots to avoid loops
        // But what if sticky is triggered by bot commands? Let's ignore only SELF?
        // Safe bet: ignore all bots for activity/threshold counting to prevent loops.
        // Actually, user might want bot messages to reset timer.
        // Let's ignore self (client.user.id) mostly. But to be safe, ignore bots for now.
        if (message.author.bot) return;

        const config = await StickyMessage.findOne({ guildId: message.guild.id, channelId: message.channel.id });
        if (!config) return;

        // Clear existing timer if any (for ChatInactive mode)
        if (this.timers.has(message.channel.id)) {
            clearTimeout(this.timers.get(message.channel.id));
            this.timers.delete(message.channel.id);
        }

        if (config.mode === 'ChatInactive') {
            // Set new timer
            const delayMs = config.delay * 1000;
            const timer = setTimeout(() => {
                this.sendSticky(message.channel, config);
            }, delayMs);
            this.timers.set(message.channel.id, timer);
        }
        else if (config.mode === 'MessageThreshold') {
            config.currentCount += 1;
            if (config.currentCount >= config.threshold) {
                config.currentCount = 0;
                await config.save();
                this.sendSticky(message.channel, config);
            } else {
                await config.save();
            }
        }
    }

    /**
     * Send the sticky message
     * @param {Channel} channel 
     * @param {Object} config 
     */
    async sendSticky(channel, config) {
        if (this.processing.has(channel.id)) return;
        this.processing.add(channel.id);

        try {
            // 1. Delete old message if exists
            if (config.lastMessageId) {
                try {
                    const oldMsg = await channel.messages.fetch(config.lastMessageId).catch(() => null);
                    if (oldMsg) await oldMsg.delete();
                } catch (e) {
                    // Ignore delete errors (msg deleted, no perms)
                    console.error('Failed to delete old sticky message:', e.message);
                }
            }

            // 2. Parse Content
            // Need context. Dummy interaction/user for now? Or just channel/guild context.
            // If triggered by inactivity, there is no specific user.
            const context = {
                guild: channel.guild,
                channel: channel,
                user: null, // No specific user for sticky
                member: null
            };

            const parsed = await KentaScratch.parse(config.content, context);

            // Check allowed mentions
            const allowedMentions = config.allowMentions ? undefined : { parse: [] };

            const payload = {
                content: parsed.content || null,
                embeds: parsed.embeds,
                components: parsed.components,
                allowedMentions: allowedMentions
            };

            // 3. Send Message
            let sentMsg;
            if (config.useWebhook && config.webhookUrl) {
                // To delete later, we need to send it such that we can delete it?
                // Webhooks can verify/delete messages.
                // But we need to store the message ID.
                // DiscordJS WebhookClient.send returns the message if option fetch: true.
                try {
                    const webhookClient = new WebhookClient({ url: config.webhookUrl });
                    // Webhook avatar/name is set in Discord settings, OR we can override here if needed?
                    // User request says "avatar and name custom configured by you".
                    // The command /stickie webhook sets it.
                    // Usually webhooks use their own settings unless overridden.
                    // Let's assume we just use the webhook.

                    sentMsg = await webhookClient.send({
                        ...payload,
                        // username: 'Name', // If stored in config
                        // avatarURL: 'Url', // If stored
                        fetchReply: true // Important to get ID
                    });
                } catch (webhookError) {
                    console.error('Webhook error:', webhookError);
                    // Fallback to normal send?
                    sentMsg = await channel.send(payload);
                    config.useWebhook = false; // Disable invalid webhook?
                }
            } else {
                sentMsg = await channel.send(payload);
            }

            if (sentMsg) {
                config.lastMessageId = sentMsg.id;
                await config.save();
            }

        } catch (error) {
            console.error('[StickyManager] Error sending sticky:', error);
        } finally {
            this.processing.delete(channel.id);
            this.timers.delete(channel.id); // Clear timer ref
        }
    }
}

module.exports = new StickyManager();
