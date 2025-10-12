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
            type: AuditLogEvent.MemberBanAdd,
        });

        const banLog = fetchedLogs.entries.first();
        if (!banLog || banLog.target.id !== ban.user.id) return;

        const { executor: moderator, reason } = banLog;

        let guildData = await GuildData.findOneAndUpdate(
            { guildID: ban.guild.id },
            { $inc: { cases: 1 } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        let caseNumber = guildData ? guildData.cases : 'N/A';
        let currentTime = moment().tz(config.Timezone);

        logBan(ban, reason, moderator, caseNumber, currentTime);

        await UserData.findOneAndUpdate(
            { userId: ban.user.id, guildId: ban.guild.id },
            { $inc: { bans: 1 } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        console.error('Error handling ban event:', error);
    }
};

async function logBan(ban, reason, moderator, caseNumber, currentTime) {
    const logChannel = ban.guild.channels.cache.get(config.BanLogs.LogsChannelID);
    if (!logChannel) return;

    const logMessageEmbed = new EmbedBuilder()
        .setColor(config.BanLogs.Embed.Color || "#FF0000")
        .setTitle(replacePlaceholders(config.BanLogs.Embed.Title, ban, reason, moderator, caseNumber, currentTime))
        .setDescription(replacePlaceholders(config.BanLogs.Embed.Description.join('\n'), ban, reason, moderator, caseNumber, currentTime))
        .setFooter({ text: replacePlaceholders(config.BanLogs.Embed.Footer, ban, reason, moderator, caseNumber, currentTime) });

    try {
        await logChannel.send({ embeds: [logMessageEmbed] });
    } catch (error) {
        console.error(`Failed to log ban in channel: ${error}`);
    }
}

function replacePlaceholders(text, ban, reason, moderator, caseNumber, currentTime) {
    return text
        .replace(/{user}/g, `<@${ban.user.id}>`)
        .replace(/{userName}/g, ban.user.username)
        .replace(/{userTag}/g, ban.user.tag)
        .replace(/{userId}/g, ban.user.id)
        .replace(/{guildName}/g, ban.guild.name)
        .replace(/{moderator}/g, `<@${moderator.id}>`)
        .replace(/{reason}/g, reason || 'No reason provided')
        .replace(/{caseNumber}/g, caseNumber)
        .replace(/{shorttime}/g, currentTime.format("HH:mm"))
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'));
}