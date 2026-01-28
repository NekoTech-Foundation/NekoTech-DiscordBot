const { EmbedBuilder } = require('discord.js');
const DonationSettings = require('../../models/DonationSettings');
const DonationTransaction = require('../../models/DonationTransaction');

async function processDonation(message) {
    if (!message.guild || message.author.bot === false) return;

    // OwO Bot ID: 408785106942164992
    const OWO_BOT_ID = '408785106942164992';

    if (message.author.id !== OWO_BOT_ID) return;

    const guildId = message.guild.id;
    const settings = await DonationSettings.findOne({ guildId });

    if (!settings || !settings.enabled || !settings.autoReceive) {
        return;
    }

    const allowedChannels = settings.channels || [];
    if (allowedChannels.length > 0 && !allowedChannels.includes(message.channel.id)) return;

    const content = message.content;

    // Improved Regex to handle:
    // 1. Emoji at start (optional)
    // 2. Sender Mention (or bold name)
    // 3. "sent"
    // 4. Amount (with optional bold **) and "cowoncy"
    // 5. "to"
    // 6. Receiver Mention

    // Core Pattern: "sent <amount> cowoncy to"
    // Regex: sent \**?([\d,]+) cowoncy\**? to
    const mainRegex = /sent \**?([\d,]+) cowoncy\**? to/i;
    const match = content.match(mainRegex);

    if (!match) {
        return;
    }

    // Extract Amount
    let amountStr = match[1].replace(/,/g, '');
    const amount = parseInt(amountStr);
    if (isNaN(amount)) return;

    // Extract Users
    // Strategy: Look for the last mention BEFORE "sent" as sender
    // And the first mention AFTER "to" as receiver.

    // We can rely on split logic or just multiple regexes.
    // "💳 <@sender> sent 1 cowoncy to <@receiver>!"

    const senderMatch = content.match(/<@!?(\d+)>.*?sent/i);
    const receiverMatch = content.match(/to.*?<@!?(\d+)>/i);

    let senderId, receiverId;

    if (senderMatch) senderId = senderMatch[1];
    if (receiverMatch) receiverId = receiverMatch[1];

    if (!senderId || !receiverId) {
        return;
    }

    // Check Receiver Validity
    const validReceivers = settings.receivers || [];
    const validRoles = settings.receiverRoles || [];

    let isValidReceiver = false;

    if (validReceivers.includes(receiverId)) {
        isValidReceiver = true;
    } else if (validRoles.length > 0) {
        const receiverMember = await message.guild.members.fetch(receiverId).catch(() => null);
        if (receiverMember && receiverMember.roles.cache.hasAny(...validRoles)) {
            isValidReceiver = true;
        }
    }

    if (!isValidReceiver) {
        // Loopback debug note
        // await message.channel.send(`⚠️ Debug: Donation ignored. Receiver <@${receiverId}> not in whitelist.`);
        return;
    }

    // --- IDEMPOTENCY CHECK ---
    // Prevent double counting if messageUpdate triggers multiple times or if we processed Create then Update.
    // We can check if a transaction with same Guild, Sender, Receiver, Amount, Reason, and recent Timestamp exists.
    // OwO bot updates quite fast.
    // Using a simple dedupe key or just checking last 10 seconds?

    const db = require('../../utils/database');
    const recentTx = db.prepare(`
        SELECT json_extract(data, '$.id') as id 
        FROM donation_transactions 
        WHERE json_extract(data, '$.guildId') = ? 
          AND json_extract(data, '$.userId') = ?
          AND json_extract(data, '$.receiverId') = ?
          AND json_extract(data, '$.amount') = ?
          AND json_extract(data, '$.timestamp') > ?
    `).get(guildId, senderId, receiverId, amount, Date.now() - 10000); // 10 seconds window

    if (recentTx) return; // Already processed

    // --- PROCESS DONATION ---

    await DonationTransaction.create({
        guildId,
        userId: senderId,
        receiverId,
        amount,
        currency: 'OWO',
        timestamp: Date.now(),
        reason: 'Auto-detected from OwO Bot'
    });

    // Calculate total
    const query = `
        SELECT SUM(json_extract(data, '$.amount')) as total 
        FROM donation_transactions 
        WHERE json_extract(data, '$.guildId') = ? 
          AND json_extract(data, '$.userId') = ?`;

    const row = db.prepare(query).get(guildId, senderId);
    const totalDonated = row && row.total ? row.total : amount;

    // Check Rewards
    const levelUpChannelId = settings.announcementChannelId || message.channel.id;
    // We can use announcement channel or current channel for rewards?

    const rewards = settings.rewards || [];
    rewards.sort((a, b) => a.threshold - b.threshold);

    const member = await message.guild.members.fetch(senderId).catch(() => null);
    if (member) {
        for (const reward of rewards) {
            if (totalDonated >= reward.threshold) {
                if (!member.roles.cache.has(reward.roleId)) {
                    await member.roles.add(reward.roleId).catch(e => console.error(`Failed to add reward role: ${e}`));
                }
            }
        }
    }

    // Announcement
    const targetChannelId = settings.announcementChannelId || message.channel.id;
    if (amount >= settings.notificationThreshold) {
        const announceChannel = message.guild.channels.cache.get(targetChannelId);
        if (announceChannel) {

            // Embed Logic
            if (settings.embed && settings.embed.enabled) {
                const embedConfig = settings.embed;

                // Variable replacer
                const replaceVars = (text) => {
                    if (!text) return null; // Return null if falsy (empty string, null, undefined)
                    return String(text)
                        .replace(/{user}/g, `<@${senderId}>`)
                        .replace(/{amount}/g, `${amount.toLocaleString()} OWO`)
                        .replace(/{server_name}/g, message.guild.name)
                        .replace(/{receiver}/g, `<@${receiverId}>`);
                };

                try {
                    const title = replaceVars(embedConfig.title) || 'Donation Received!';
                    const description = replaceVars(embedConfig.description) || `Thank you <@${senderId}> for donating **${amount.toLocaleString()} OWO**!`;
                    const color = embedConfig.color && /^#[0-9A-F]{6}$/i.test(embedConfig.color) ? embedConfig.color : '#FF0000';

                    const embed = new EmbedBuilder()
                        .setTitle(title)
                        .setDescription(description)
                        .setColor(color);

                    if (embedConfig.image) embed.setImage(embedConfig.image);
                    if (embedConfig.thumbnail) embed.setThumbnail(embedConfig.thumbnail);
                    if (embedConfig.footer) {
                        const footerText = replaceVars(embedConfig.footer);
                        if (footerText) embed.setFooter({ text: footerText, iconURL: message.guild.iconURL() });
                    }
                    if (embedConfig.timestamp) embed.setTimestamp();

                    await announceChannel.send({ embeds: [embed] });
                    return;
                } catch (error) {
                    console.error('Failed to send announcement embed. Config:', JSON.stringify(embedConfig), 'Error:', error);
                    // Fallback to text if embed fails
                }
            }

            // Normal Text Logic
            let template = settings.message;
            if (!template) {
                const defaultMessages = [
                    "Thank you {user} for donating {amount}! You're amazing! 💖",
                    "Wow! {user} just donated {amount}. Much appreciated! 🎉",
                    "Big thanks to {user} for the {amount} donation! 🚀",
                    "{user} has supported us with {amount}. Thank you! 🙏",
                    "A wild donation appeared! {user} sent {amount}. Thank you! ⭐"
                ];
                template = defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
            } else if (template.includes('|')) {
                // Allow user to set multiple messages separated by |
                const options = template.split('|');
                template = options[Math.floor(Math.random() * options.length)].trim();
            }

            let msg = template
                .replace(/{user}/g, `<@${senderId}>`)
                .replace(/{amount}/g, `${amount.toLocaleString()} OWO`)
                .replace(/{server_name}/g, message.guild.name)
                .replace(/{receiver}/g, `<@${receiverId}>`);

            const reactMatch = msg.match(/{react_reply:\s*(.+?)\s*}/);
            if (reactMatch) {
                const emoji = reactMatch[1];
                msg = msg.replace(reactMatch[0], '');
                const sentMsg = await announceChannel.send(msg).catch(e => console.error('Failed to send announcement:', e));
                if (sentMsg) sentMsg.react(emoji).catch(() => { });
            } else {
                await announceChannel.send(msg).catch(e => console.error('Failed to send announcement:', e));
            }
        }
    }
}

module.exports = processDonation;
