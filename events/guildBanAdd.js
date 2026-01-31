const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const moment = require('moment-timezone');
const UserData = require('../models/UserData');
const GuildData = require('../models/guildDataSchema');
const GuildSettings = require('../models/GuildSettings');
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
    const guildSettings = await GuildSettings.findOne({ guildId: ban.guild.id });
    if (!guildSettings) return;

    // Check for log channel (Supports new moderation.logChannels and legacy logChannels object)
    const logChannelId = guildSettings.moderation?.logChannels?.ban ||
        (guildSettings.logChannels && guildSettings.logChannels['ban']);

    if (!logChannelId) return;
    const logChannel = ban.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    // Using a simplified embed for now, as the original config is being removed.
    const logMessageEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle('Thành viên bị cấm')
        .setDescription(`${ban.user.tag} đã bị cấm bởi ${moderator.tag}.`)
        .addFields(
            { name: 'Lý do', value: reason || 'Không có lý do' },
            { name: 'Case', value: `#${caseNumber}` }
        )
        .setTimestamp();

    try {
        await logChannel.send({ embeds: [logMessageEmbed] });
    } catch (error) {
        console.error(`Failed to log ban in channel: ${error}`);
    }
}
