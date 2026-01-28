const { EmbedBuilder } = require("discord.js");
//const fs = require('fs');
//const yaml = require("js-yaml");
const moment = require('moment-timezone');
const { getConfig, getLang, getCommands } = require('../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

global.hangmanMessageIDs = global.hangmanMessageIDs || new Set();

module.exports = async (client, message) => {
    if (!message.guild || !message.author || message.author.bot) return;

    if (global.hangmanMessageIDs.has(message.id)) {
        global.hangmanMessageIDs.delete(message.id);
        return;
    }

    if (config.MessageDeleteLogs.Enabled) {
        const logsChannel = message.guild.channels.cache.get(config.MessageDeleteLogs.LogsChannelID);
        if (!logsChannel) return;

        const deletedMessage = message.content.length > 1900 ?
            "*Content truncated due to length* - " + message.content.substr(0, 1900) :
            message.content;

        const currentTime = moment().tz(config.Timezone);

        let embedData = lang.MessageDeleteLogs.Embed;

        let baseEmbed = new EmbedBuilder()
            .setColor(embedData.Color || "#DD2C00")
            .setTitle(replacePlaceholders(embedData.Title, message, deletedMessage, currentTime))
            .setDescription(replacePlaceholders(embedData.Description.join('\n'), message, deletedMessage, currentTime));

        if (embedData.Footer.Text) {
            baseEmbed.setFooter({ text: embedData.Footer.Text, iconURL: embedData.Footer.Icon || undefined });
        }

        if (embedData.Author.Text) {
            baseEmbed.setAuthor({ name: embedData.Author.Text, iconURL: embedData.Author.Icon || undefined });
        }

        if (embedData.Thumbnail) {
            const avatarURL = message.author.displayAvatarURL({ format: 'png', dynamic: true });
            if (avatarURL) {
                baseEmbed.setThumbnail(avatarURL);
            }
        }

        if (embedData.Image) {
            baseEmbed.setImage(embedData.Image);
        }

        let imageAttachments = message.attachments.filter(attachment => attachment.contentType && attachment.contentType.startsWith('image/'));
        if (config.MessageDeleteLogs.LogImages && imageAttachments.size > 0) {
            baseEmbed.setImage(imageAttachments.first().url);
            logsChannel.send({ embeds: [baseEmbed] }).then(() => {
                imageAttachments.forEach((attachment, index) => {
                    if (index > 0) {
                        logsChannel.send({ files: [attachment.url] }).catch(e => console.error('Failed to send attachment log:', e));
                    }
                });
            }).catch(e => console.error('Failed to send delete log:', e));
        } else {
            logsChannel.send({ embeds: [baseEmbed] }).catch(e => console.error('Failed to send delete log:', e));
        }
    }
};

function replacePlaceholders(text, message, deletedMessage, currentTime) {
    return text
        .replace(/{user}/g, `<@${message.author.id}>`)
        .replace(/{userName}/g, message.author.username)
        .replace(/{userTag}/g, message.author.tag)
        .replace(/{userId}/g, message.author.id)
        .replace(/{deletedmessage}/g, deletedMessage)
        .replace(/{channel}/g, `<#${message.channel.id}>`)
        .replace(/{shorttime}/g, currentTime.format("HH:mm"))
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'));
}