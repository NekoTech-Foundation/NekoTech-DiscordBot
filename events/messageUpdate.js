const { EmbedBuilder } = require("discord.js");
//const fs = require('fs');
//const yaml = require("js-yaml");
const moment = require('moment-timezone');
const { getConfig, getLang, getCommands } = require('../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

function convertPatternToRegex(pattern) {
    if (pattern.startsWith('regex:')) {
        return new RegExp(pattern.slice(6), 'i');
    }

    let regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');

    if (pattern.includes('*')) {
        return new RegExp(regexPattern, 'i');
    }

    return new RegExp(`^${regexPattern}$`, 'i');
}

async function checkBlacklistWords(message, dmSent) {
    if (!config.BlacklistWords.Enabled) return dmSent;

    if (message.member.permissions.has(config.BlacklistWords.BypassPerms)) {
        return dmSent;
    }

    const hasBypassRole = message.member.roles.cache.some(role =>
        config.BlacklistWords.BypassRoles.includes(role.id)
    );
    if (hasBypassRole) {
        return dmSent;
    }

    if (config.BlacklistWords.WhitelistChannels.includes(message.channel.id) ||
        (message.channel.parentId && config.BlacklistWords.WhitelistCategories.includes(message.channel.parentId))) {
        return dmSent;
    }

    const content = message.content;

    const whitelistMatched = config.BlacklistWords.WhitelistWords.some(word => {
        const regex = convertPatternToRegex(word);
        return regex.test(content);
    });

    if (whitelistMatched) {
        return dmSent;
    }

    let triggeredPattern = null;
    for (const pattern of config.BlacklistWords.Patterns) {
        const regex = convertPatternToRegex(pattern);
        if (regex.test(content)) {
            triggeredPattern = pattern;
            break;
        }
    }

    if (triggeredPattern) {
        try {
            await message.delete();

            const filterWordsMsg = config.BlacklistWords.Message
                .replace(/{user}/g, `<@${message.author.id}>`);
            const notificationMsg = await message.channel.send(filterWordsMsg);
            setTimeout(() => notificationMsg.delete().catch(console.error), 3000);

            if (config.BlacklistWords.DM.Enabled && !dmSent) {
                const currentTime = moment().tz(config.Timezone);
                const replacements = {
                    user: message.author.username,
                    blacklistedword: triggeredPattern,
                    shorttime: currentTime.format("HH:mm"),
                    longtime: currentTime.format('MMMM Do YYYY')
                };

                try {
                    if (config.BlacklistWords.DM.Type === "Message") {
                        let dmMessage = config.BlacklistWords.DM.Message;
                        Object.entries(replacements).forEach(([key, value]) => {
                            dmMessage = dmMessage.replace(new RegExp(`{${key}}`, 'g'), value);
                        });
                        await message.author.send(dmMessage);
                    } else if (config.BlacklistWords.DM.Type === "Embed") {
                        const embedConfig = config.BlacklistWords.DM.Embed;
                        const embed = new EmbedBuilder()
                            .setColor(embedConfig.Color)
                            .setTitle(embedConfig.Title)
                            .setDescription(embedConfig.Description.map(line =>
                                Object.entries(replacements).reduce((str, [key, value]) =>
                                    str.replace(new RegExp(`{${key}}`, 'g'), value)
                                    , line)
                            ).join('\n'));

                        if (embedConfig.Footer) {
                            embed.setFooter({
                                text: embedConfig.Footer.replace(/{shorttime}/g, replacements.shorttime)
                            });
                        }

                        if (embedConfig.Thumbnail) {
                            embed.setThumbnail(message.author.displayAvatarURL());
                        }

                        await message.author.send({ embeds: [embed] });
                    }
                    dmSent = true;
                } catch (err) {
                    console.error('Failed to send DM:', err);
                }
            }

            if (config.BlacklistWords.LogsChannelID) {
                const logsChannel = message.guild.channels.cache.get(config.BlacklistWords.LogsChannelID);
                if (logsChannel) {
                    const currentTime = moment().tz(config.Timezone);
                    const embedConfig = config.BlacklistWords.Embed;
                    const embed = new EmbedBuilder()
                        .setColor(embedConfig.Color)
                        .setTitle(embedConfig.Title)
                        .setDescription(embedConfig.Description.map(line =>
                            line.replace(/{user}/g, `<@${message.author.id}>`)
                                .replace(/{blacklistedword}/g, triggeredPattern)
                                .replace(/{shorttime}/g, currentTime.format("HH:mm"))
                                .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'))
                                .replace(/{guildName}/g, message.guild.name)
                        ).join('\n'));

                    if (embedConfig.Footer.Text) {
                        embed.setFooter({
                            text: embedConfig.Footer.Text.replace(/{guildName}/g, message.guild.name),
                            iconURL: message.guild.iconURL()
                        });
                    }

                    if (embedConfig.Thumbnail) {
                        embed.setThumbnail(message.author.displayAvatarURL());
                    }

                    await logsChannel.send({ embeds: [embed] });
                }
            }

            return true;
        } catch (error) {
            console.error('Error handling blacklisted word:', error);
        }
    }

    return dmSent;
}

module.exports = async (client, oldMessage, newMessage) => {
    // Donation Logic (runs for bots too)
    if (newMessage.guild && newMessage.author && newMessage.author.id === '408785106942164992') {
        const processDonation = require('./Donation/processDonation');
        await processDonation(newMessage);
        // Don't return here, might want to log edits? 
        // But the existing code below ignores bots anyway.
    }

    if (!newMessage.guild || !newMessage.author || newMessage.author.bot || !newMessage.content) {
        return;
    }
    if (oldMessage.content === newMessage.content) {
        return;
    }

    let dmSent = false;
    dmSent = await checkBlacklistWords(newMessage, dmSent);

    if (!dmSent && config.MessageUpdateLogs.Enabled) {
        const currentTime = moment().tz(config.Timezone);
        const editLogChannel = newMessage.guild.channels.cache.get(config.MessageUpdateLogs.LogsChannelID);
        if (!editLogChannel) return;

        let embedData = lang.MessageUpdateLogs.Embed;
        let embed = new EmbedBuilder()
            .setColor(embedData.Color || "#FF9800")
            .setTitle(replacePlaceholders(embedData.Title, newMessage, oldMessage, currentTime))
            .setDescription(replacePlaceholders(embedData.Description.join('\n'), newMessage, oldMessage, currentTime));

        if (embedData.Footer.Text) {
            embed.setFooter({ text: embedData.Footer.Text, iconURL: embedData.Footer.Icon || undefined });
        }

        if (embedData.Author.Text) {
            embed.setAuthor({ name: embedData.Author.Text, iconURL: embedData.Author.Icon || undefined });
        }

        if (embedData.Thumbnail) {
            embed.setThumbnail(newMessage.author.displayAvatarURL({ format: 'png', dynamic: true }));
        }

        if (embedData.Image) {
            embed.setImage(embedData.Image);
        }

        editLogChannel.send({ embeds: [embed] }).catch(err => console.error('Failed to send message update log:', err));
    }
};

function replacePlaceholders(text, newMessage, oldMessage, currentTime) {
    return text
        .replace(/{user}/g, `<@${newMessage.author.id}>`)
        .replace(/{userName}/g, newMessage.author.username)
        .replace(/{userTag}/g, newMessage.author.tag)
        .replace(/{userId}/g, newMessage.author.id)
        .replace(/{oldmessage}/g, oldMessage ? oldMessage.content : 'None')
        .replace(/{newmessage}/g, newMessage.content)
        .replace(/{channel}/g, `<#${newMessage.channel.id}>`)
        .replace(/{shorttime}/g, currentTime.format("HH:mm"))
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'))
        .replace(/{guildName}/g, newMessage.guild.name);
}