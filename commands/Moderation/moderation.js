const { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const UserData = require('../../models/UserData');
const moment = require('moment-timezone');
const { getConfig } = require('../../utils/configLoader.js');
const config = getConfig();

function parseDuration(durationStr) {
    const durationRegex = /(\d+)\s*(mon|d|h|m|s)/g;
    let totalMilliseconds = 0;
    let match;

    while ((match = durationRegex.exec(durationStr)) !== null) {
        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 'mon':
                totalMilliseconds += value * 30 * 24 * 60 * 60 * 1000; // Approximation
                break;
            case 'd':
                totalMilliseconds += value * 24 * 60 * 60 * 1000;
                break;
            case 'h':
                totalMilliseconds += value * 60 * 60 * 1000;
                break;
            case 'm':
                totalMilliseconds += value * 60 * 1000;
                break;
            case 's':
                totalMilliseconds += value * 1000;
                break;
        }
    }

    return totalMilliseconds > 0 ? totalMilliseconds : null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Lệnh dành cho kiểm duyệt viên máy chủ')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('timeout')
                .setDescription('Tạm thời chặn một thành viên')
                .addUserOption(option => option.setName('member').setDescription('Chọn một thành viên trong server, hoặc chỉ định ID thành viên').setRequired(true))
                .addStringOption(option => option.setName('duration').setDescription('Chỉ định thời gian dưới dạng ngắn (vd: 10m25s)').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Hãy nhập lý do cho hành động này').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('untimeout')
                .setDescription('Bỏ chặn tạm thời một thành viên')
                .addUserOption(option => option.setName('member').setDescription('Chọn một thành viên trong server, hoặc chỉ định ID thành viên').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Hãy nhập lý do cho hành động này').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Cấm một thành viên')
                .addUserOption(option => option.setName('user').setDescription('Chọn một người dùng, hoặc chỉ định ID người dùng').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Hãy nhập lý do cho hành động này').setRequired(true))
                .addIntegerOption(option => option.setName('delete_message').setDescription('Chỉ định số ngày tin nhắn cũ để xóa, mặc định là 0').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Bỏ cấm một người dùng')
                .addStringOption(option => option.setName('user').setDescription('Chỉ định ID người dùng').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Hãy nhập lý do cho hành động này').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Cảnh cáo một thành viên')
                .addUserOption(option => option.setName('member').setDescription('Chọn một thành viên trong server, hoặc chỉ định ID thành viên').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Hãy nhập lý do cho hành động này').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unwarn')
                .setDescription('Bỏ cảnh cáo một thành viên')
                .addUserOption(option => option.setName('user').setDescription('Chọn một người dùng, hoặc chỉ định ID người dùng').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Hãy nhập lý do cho hành động này').setRequired(true))
                .addStringOption(option => option.setName('case').setDescription('Chỉ định ID của trường hợp, để trống cho trường hợp gần nhất').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Đuổi một thành viên')
                .addUserOption(option => option.setName('member').setDescription('Chọn một thành viên trong server, hoặc chỉ định ID thành viên').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Hãy nhập lý do cho hành động này').setRequired(true))
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'timeout') {
            const member = interaction.options.getMember('member');
            const duration = interaction.options.getString('duration');
            const reason = interaction.options.getString('reason');
            const timeInMs = parseDuration(duration);

            if (!timeInMs) {
                return interaction.reply({ content: 'Thời gian không hợp lệ.', ephemeral: true });
            }

            await member.timeout(timeInMs, reason);
            await interaction.reply({ content: `Đã timeout ${member.user.tag} trong ${duration}.`, ephemeral: true });
        } else if (subcommand === 'untimeout') {
            const member = interaction.options.getMember('member');
            const reason = interaction.options.getString('reason');

            await member.timeout(null, reason);
            await interaction.reply({ content: `Đã gỡ timeout cho ${member.user.tag}.`, ephemeral: true });
        } else if (subcommand === 'ban') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const deleteMessageDays = interaction.options.getInteger('delete_message') || 0;

            await interaction.guild.members.ban(user, { reason, deleteMessageDays });
            await interaction.reply({ content: `Đã ban ${user.tag}.`, ephemeral: true });
        } else if (subcommand === 'unban') {
            const userId = interaction.options.getString('user');
            const reason = interaction.options.getString('reason');

            await interaction.guild.bans.remove(userId, reason);
            await interaction.reply({ content: `Đã unban người dùng có ID: ${userId}.`, ephemeral: true });
        } else if (subcommand === 'warn') {
            const member = interaction.options.getMember('member');
            const reason = interaction.options.getString('reason');

            const newWarning = {
                reason,
                date: new Date(),
                moderatorId: interaction.user.id
            };

            await UserData.findOneAndUpdate(
                { userId: member.id, guildId: interaction.guild.id },
                { $push: { warnings: newWarning }, $inc: { warns: 1 } },
                { upsert: true, new: true }
            );

            await interaction.reply({ content: `Đã cảnh cáo ${member.user.tag}.`, ephemeral: true });
        } else if (subcommand === 'unwarn') {
            const user = interaction.options.getUser('user');
            const caseId = interaction.options.getString('case');

            const userData = await UserData.findOne({ userId: user.id, guildId: interaction.guild.id });
            if (!userData || userData.warnings.length === 0) {
                return interaction.reply({ content: 'Người dùng này không có cảnh cáo nào.', ephemeral: true });
            }

            if (caseId) {
                userData.warnings = userData.warnings.filter(w => w._id.toString() !== caseId);
            } else {
                userData.warnings.pop();
            }
            userData.warns = userData.warnings.length;
            await userData.save();

            await interaction.reply({ content: `Đã xóa cảnh cáo khỏi ${user.tag}.`, ephemeral: true });
        } else if (subcommand === 'kick') {
            const member = interaction.options.getMember('member');
            const reason = interaction.options.getString('reason');

            await member.kick(reason);
            await interaction.reply({ content: `Đã kick ${member.user.tag}.`, ephemeral: true });
        }
    }
};
