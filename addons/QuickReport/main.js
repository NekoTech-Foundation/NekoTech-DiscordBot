const { EmbedBuilder } = require('discord.js');
const Report = require('../../models/Report');
const QuickReportSettings = require('../../models/QuickReportSettings');

async function getNextReportId(guildId) {
    const lastReport = await Report.findOne({ guildId }).sort({ reportId: -1 });
    return (lastReport ? lastReport.reportId : 0) + 1;
}

module.exports = {
    onLoad: (client) => {
        console.log('QuickReport addon loaded.');

        // Modal Submission
        client.on('interactionCreate', async (interaction) => {
            if (interaction.isModalSubmit() && interaction.customId.startsWith('report-message-modal-')) {
                const [, messageId, channelId] = interaction.customId.split('-');
                const reason = interaction.fields.getTextInputValue('reason');
                const guildId = interaction.guild.id;

                const settings = await QuickReportSettings.findOne({ guildId });
                if (!settings || !settings.enabled) {
                    return interaction.reply({ content: 'Tính năng báo cáo chưa được bật trên máy chủ này.', ephemeral: true });
                }

                const channel = await client.channels.fetch(channelId);
                const message = await channel.messages.fetch(messageId);

                const reportId = await getNextReportId(guildId);

                const report = new Report({
                    reportId,
                    guildId,
                    reporterId: interaction.user.id,
                    reportedUserId: message.author.id,
                    messageId,
                    channelId,
                    reason,
                });

                await report.save();

                const receiveChannel = await client.channels.fetch(settings.receiveChannelId);
                if (receiveChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle(`Báo cáo mới #${reportId}`)
                        .setDescription(`**Người báo cáo:** ${interaction.user}\n**Người bị báo cáo:** ${message.author}\n**Lý do:** ${reason}\n\n**Nội dung tin nhắn:**\n${message.content}`)
                        .addFields({ name: 'Tin nhắn gốc', value: `[Bấm vào đây](${message.url})` })
                        .setColor('Red')
                        .setTimestamp();
                    await receiveChannel.send({ embeds: [embed] });
                }

                await interaction.reply({ content: 'Đã gửi báo cáo của bạn.', ephemeral: true });
            }
        });

        // Auto-delete on mute
        client.on('guildMemberUpdate', async (oldMember, newMember) => {
            const settings = await QuickReportSettings.findOne({ guildId: newMember.guild.id });
            if (!settings || !settings.enabled || !settings.autoDeleteOnMute || !settings.muteRoleId) return;

            const wasMuted = oldMember.roles.cache.has(settings.muteRoleId);
            const isMuted = newMember.roles.cache.has(settings.muteRoleId);

            if (!wasMuted && isMuted) {
                await Report.updateMany({ guildId: newMember.guild.id, reportedUserId: newMember.id, status: 'pending' }, { status: 'approved' });
            }
        });

        // Auto-delete on ban/leave
        client.on('guildBanAdd', async (ban) => {
            const settings = await QuickReportSettings.findOne({ guildId: ban.guild.id });
            if (!settings || !settings.enabled || !settings.autoDeleteOnLeave) return;
            await Report.updateMany({ guildId: ban.guild.id, reportedUserId: ban.user.id, status: 'pending' }, { status: 'approved' });
        });

        client.on('guildMemberRemove', async (member) => {
            const settings = await QuickReportSettings.findOne({ guildId: member.guild.id });
            if (!settings || !settings.enabled || !settings.autoDeleteOnLeave) return;
            await Report.updateMany({ guildId: member.guild.id, reportedUserId: member.id, status: 'pending' }, { status: 'approved' });
        });

        // Auto-expire reports
        setInterval(async () => {
            const guilds = await QuickReportSettings.find({ enabled: true, autoExpireHours: { $gt: 0 } });
            for (const settings of guilds) {
                const expireDate = new Date(Date.now() - settings.autoExpireHours * 60 * 60 * 1000);
                await Report.updateMany(
                    { guildId: settings.guildId, status: 'pending', createdAt: { $lte: expireDate } },
                    { status: 'rejected' }
                );
            }
        }, 60 * 60 * 1000); // Check every hour
    }
};
