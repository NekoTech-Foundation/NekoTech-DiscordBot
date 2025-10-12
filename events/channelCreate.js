const { EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
//const fs = require('fs');
//const yaml = require('js-yaml');
const moment = require('moment-timezone');
const { getConfig, getLang, getCommands } = require('../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

module.exports = async (client, channel) => {
    if (!channel.guild) return;
    if (!config.ChannelCreatedLogs.Enabled) return;

    if (!channel.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;

    try {
        const fetchedLogs = await channel.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.ChannelCreate,
        });

        const creationLog = fetchedLogs.entries.first();
        if (!creationLog) return;
        const { executor } = creationLog;

        if (executor.bot) return;

        let embedData = lang.ChannelCreatedLogs.Embed;
        const currentTime = moment().tz(config.Timezone).format("HH:mm");
        const longTime = moment().tz(config.Timezone).format("MMMM Do YYYY");

        let embed = new EmbedBuilder().setColor(embedData.Color || "#00FF00");

        if (embedData.Title) {
            embed.setTitle(replacePlaceholders(embedData.Title, channel, executor, currentTime, longTime));
        }

        if (embedData.Description.length > 0) {
            embed.setDescription(embedData.Description.map(line =>
                replacePlaceholders(line, channel, executor, currentTime, longTime)
            ).join('\n'));
        }

        if (embedData.Footer && embedData.Footer.Text) {
            embed.setFooter({ text: replacePlaceholders(embedData.Footer.Text, channel, executor, currentTime, longTime), iconURL: embedData.Footer.Icon || undefined });
        }

        if (embedData.Author && embedData.Author.Text) {
            embed.setAuthor({ name: replacePlaceholders(embedData.Author.Text, channel, executor, currentTime, longTime), iconURL: embedData.Author.Icon || undefined });
        }

        if (embedData.Thumbnail) {
            embed.setThumbnail(executor.displayAvatarURL({ format: 'png', dynamic: true }));
        }

        if (embedData.Image) {
            embed.setImage(embedData.Image);
        }

        let createLogChannel = channel.guild.channels.cache.get(config.ChannelCreatedLogs.LogsChannelID);
        if (createLogChannel) createLogChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error("Error in channel create event handler:", error);
    }
};

function replacePlaceholders(text, channel, executor, currentTime, longTime) {
    return text
        .replace(/{channelName}/g, channel.name)
        .replace(/{executor}/g, `<@${executor.id}>`)
        .replace(/{shorttime}/g, currentTime)
        .replace(/{longtime}/g, longTime);
}