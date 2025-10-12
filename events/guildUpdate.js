const { EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
//const fs = require('fs');
//const yaml = require('js-yaml');
const moment = require('moment-timezone');
const { getConfig, getLang, getCommands } = require('../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

module.exports = async (client, oldGuild, newGuild) => {
    if (!config.GuildUpdateLogs.Enabled) return;

    if (oldGuild.name !== newGuild.name) {
        if (!newGuild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;

        const fetchedLogs = await newGuild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.GuildUpdate,
        });
        const guildUpdateLog = fetchedLogs.entries.first();
        if (!guildUpdateLog) return console.log(`A guild name was changed, but no relevant audit logs were found.`);
        const { executor } = guildUpdateLog;

        let embedData = lang.GuildUpdateLogs.Embed;
        const currentTime = moment().tz(config.Timezone);

        let embed = new EmbedBuilder()
            .setColor(embedData.Color || "#00E676")
            .setTitle(replacePlaceholders(embedData.Title, oldGuild, newGuild, executor, currentTime))
            .setDescription(replacePlaceholders(embedData.Description.join('\n'), oldGuild, newGuild, executor, currentTime));

        if (embedData.Footer.Text) {
            embed.setFooter({ text: embedData.Footer.Text, iconURL: embedData.Footer.Icon || undefined });
        }

        if (embedData.Author.Text) {
            embed.setAuthor({ name: embedData.Author.Text, iconURL: embedData.Author.Icon || undefined });
        }

        if (embedData.Thumbnail) {
            embed.setThumbnail(newGuild.iconURL({ format: 'png', dynamic: true }));
        }

        if (embedData.Image) {
            embed.setImage(embedData.Image);
        }

        let guildNameLog = newGuild.channels.cache.get(config.GuildUpdateLogs.LogsChannelID);
        if (guildNameLog) guildNameLog.send({ embeds: [embed] });
    }
};

function replacePlaceholders(text, oldGuild, newGuild, executor, currentTime) {
    return text
        .replace(/{oldGuildName}/g, oldGuild.name)
        .replace(/{newGuildName}/g, newGuild.name)
        .replace(/{executor}/g, `<@${executor.id}>`)
        .replace(/{shorttime}/g, currentTime.format("HH:mm"))
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'));
}