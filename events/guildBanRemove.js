const { EmbedBuilder, AuditLogEvent } = require('discord.js');
//const fs = require('fs');
//const yaml = require('js-yaml');
const moment = require('moment-timezone');

const UserData = require('../models/UserData');
const GuildData = require('../models/guildDataSchema');
const { getConfig } = require('../utils/configLoader.js');
const config = getConfig();


module.exports = async (client, ban) => {
    try {
        const fetchedLogs = await ban.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberBanRemove,
        });

        const unbanLog = fetchedLogs.entries.first();
        if (!unbanLog || unbanLog.target.id !== ban.user.id) return;

        const { executor: moderator } = unbanLog;
        const reason = unbanLog.reason || "No reason provided";

        let guildData = await GuildData.findOneAndUpdate(
            { guildID: ban.guild.id },
            { $inc: { cases: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        let caseNumber = guildData ? guildData.cases : 'N/A';
        let currentTime = moment().tz(config.Timezone);

        const unbanEmbed = new EmbedBuilder()
            .setColor(config.UnbanLogs.Embed.Color || "#00FF00")
            .setTitle(replacePlaceholders(config.UnbanLogs.Embed.Title, ban, moderator, reason, caseNumber, currentTime))
            .setDescription(replacePlaceholders(config.UnbanLogs.Embed.Description.join('\n'), ban, moderator, reason, caseNumber, currentTime))
            .setFooter({ text: replacePlaceholders(config.UnbanLogs.Embed.Footer, ban, moderator, reason, caseNumber, currentTime) });

        let logsChannel = ban.guild.channels.cache.get(config.UnbanLogs.LogsChannelID);
        if (logsChannel) {
            logsChannel.send({ embeds: [unbanEmbed] });
        }
    } catch (error) {
        console.error('Error handling unban event:', error);
    }
};

function replacePlaceholders(text, ban, moderator, reason, caseNumber, currentTime) {
    return text
        .replace(/{user}/g, `<@${ban.user.id}>`)
        .replace(/{userName}/g, ban.user.username)
        .replace(/{userTag}/g, ban.user.tag)
        .replace(/{userId}/g, ban.user.id)
        .replace(/{moderator}/g, `<@${moderator.id}>`)
        .replace(/{reason}/g, reason)
        .replace(/{guildName}/g, ban.guild.name)
        .replace(/{caseNumber}/g, caseNumber)
        .replace(/{shorttime}/g, currentTime.format("HH:mm"))
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'));
}