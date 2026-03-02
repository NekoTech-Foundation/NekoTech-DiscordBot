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
            type: AuditLogEvent.MemberBanRemove,
        });

        const unbanLog = fetchedLogs.entries.first();
        if (!unbanLog || unbanLog.target.id !== ban.user.id) return;

        const { executor: moderator, reason } = unbanLog;

        let guildData = await GuildData.findOneAndUpdate(
            { guildID: ban.guild.id },
            { $inc: { cases: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        let caseNumber = guildData ? guildData.cases : 'N/A';
        let currentTime = moment().tz(config.Timezone);

        logUnban(ban, reason, moderator, caseNumber, currentTime);
    } catch (error) {
        console.error('Error handling unban event:', error);
    }
};

async function logUnban(ban, reason, moderator, caseNumber, currentTime) {
    const guildSettings = await GuildSettings.findOne({ guildId: ban.guild.id });
    if (!guildSettings) return;

    const logChannelId = guildSettings.moderation?.logChannels?.ban ||
        (guildSettings.logChannels && guildSettings.logChannels['ban']) ||
        (guildSettings.logChannels && guildSettings.logChannels['unban']);

    if (!logChannelId) return;
    const logChannel = ban.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const logMessageEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle('Thành viên được bỏ cấm')
        .setDescription(`${ban.user.tag} đã được bỏ cấm bởi ${moderator.tag}.`)
        .addFields(
            { name: 'Lý do', value: reason || 'Không có lý do' },
            { name: 'Case', value: `#${caseNumber}` }
        )
        .setTimestamp();

    try {
        await logChannel.send({ embeds: [logMessageEmbed] });
    } catch (error) {
        console.error(`Failed to log unban in channel: ${error}`);
    }
}