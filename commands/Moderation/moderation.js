const {
    EmbedBuilder,
    SlashCommandBuilder,
    PermissionsBitField,
    MessageFlags
} = require('discord.js');
const UserData = require('../../models/UserData');
const moment = require('moment-timezone');
const { getConfig } = require('../../utils/configLoader.js');

const config = getConfig();

const kickLogCache = new Map();

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
                .addUserOption(option =>
                    option
                        .setName('member')
                        .setDescription(
                            'Chọn một thành viên trong server, hoặc nhập ID thành viên'
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('duration')
                        .setDescription(
                            'Chỉ định thời gian dạng ngắn (vd: 10m, 2h, 1d)'
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Nhập lý do cho hành động này')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('untimeout')
                .setDescription('Gỡ chặn tạm thời một thành viên')
                .addUserOption(option =>
                    option
                        .setName('member')
                        .setDescription(
                            'Chọn một thành viên trong server, hoặc nhập ID thành viên'
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Nhập lý do cho hành động này')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Cấm một thành viên khỏi máy chủ')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Chọn một người dùng, hoặc nhập ID người dùng')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Nhập lý do cho hành động này')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('delete_message')
                        .setDescription(
                            'Số ngày tin nhắn cũ cần xóa (mặc định: 0, tối đa 7)'
                        )
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('dm_user')
                        .setDescription('Gửi DM thông báo ban cho người dùng?')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Gỡ cấm một người dùng')
                .addStringOption(option =>
                    option
                        .setName('user')
                        .setDescription('Nhập ID người dùng')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Nhập lý do cho hành động này')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Cảnh cáo một thành viên')
                .addUserOption(option =>
                    option
                        .setName('member')
                        .setDescription(
                            'Chọn một thành viên trong server, hoặc nhập ID thành viên'
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Nhập lý do cho cảnh cáo')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unwarn')
                .setDescription('Xóa cảnh cáo của một thành viên')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription(
                            'Chọn một người dùng, hoặc nhập ID người dùng'
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Nhập lý do cho hành động này')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('case')
                        .setDescription(
                            'ID của cảnh cáo cần xóa (để trống để xóa cảnh cáo gần nhất)'
                        )
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Đuổi một thành viên khỏi server')
                .addUserOption(option =>
                    option
                        .setName('member')
                        .setDescription(
                            'Chọn một thành viên trong server, hoặc nhập ID thành viên'
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Nhập lý do cho hành động này')
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName('dm_user')
                        .setDescription('Gửi DM thông báo kick cho người dùng?')
                        .setRequired(false)
                )
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'timeout') {
            const member = interaction.options.getMember('member');
            const duration = interaction.options.getString('duration');
            const reason = interaction.options.getString('reason');
            const timeInMs = parseDuration(duration);

            if (!timeInMs) {
                return interaction.reply({
                    content: '⚠️ Thời gian không hợp lệ. Vui lòng dùng các đơn vị mon/d/h/m/s.',
                    flags: MessageFlags.Ephemeral
                });
            }

            await member.timeout(timeInMs, reason);

            const embed = new EmbedBuilder()
                .setColor('#f97316')
                .setTitle('⏱️ Timeout thành viên')
                .setDescription(
                    [
                        `> 👤 **Thành viên:** ${member.user.tag} (${member.id})`,
                        `> 🛡️ **Moderator:** ${interaction.user.tag}`,
                        `> ⏰ **Thời gian:** ${duration}`,
                        `> 📄 **Lý do:** ${reason}`
                    ].join('\n')
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'untimeout') {
            const member = interaction.options.getMember('member');
            const reason = interaction.options.getString('reason');

            await member.timeout(null, reason);

            const embed = new EmbedBuilder()
                .setColor('#22c55e')
                .setTitle('✅ Gỡ timeout thành viên')
                .setDescription(
                    [
                        `> 👤 **Thành viên:** ${member.user.tag} (${member.id})`,
                        `> 🛡️ **Moderator:** ${interaction.user.tag}`,
                        `> 📄 **Lý do:** ${reason}`
                    ].join('\n')
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'ban') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const deleteMessageDays = interaction.options.getInteger('delete_message') || 0;
            const dmUser = interaction.options.getBoolean('dm_user');
            const shouldDM = dmUser === null ? true : dmUser;

            await interaction.deferReply();

            if (shouldDM) {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#ef4444')
                    .setTitle(`🔨 Bạn đã bị ban khỏi ${interaction.guild.name}`)
                    .setDescription(
                        [
                            `> 🛡️ **Moderator:** ${interaction.user.tag}`,
                            `> 📄 **Lý do:** ${reason}`,
                            '',
                            'Nếu bạn nghĩ đây là nhầm lẫn, hãy liên hệ đội ngũ staff (nếu có cách liên hệ).'
                        ].join('\n')
                    )
                    .setTimestamp();

                try {
                    await user.send({ embeds: [dmEmbed] });
                } catch {
                    // ignore DM failures
                }
            }

            await interaction.guild.members.ban(user, { reason, deleteMessageDays });

            const embed = new EmbedBuilder()
                .setColor('#ef4444')
                .setTitle('🔨 Ban thành viên')
                .setDescription(
                    [
                        `> 👤 **Thành viên:** ${user.tag} (${user.id})`,
                        `> 🛡️ **Moderator:** ${interaction.user.tag}`,
                        `> 🗑️ **Xóa tin nhắn:** ${deleteMessageDays} ngày`,
                        `> 📄 **Lý do:** ${reason}`
                    ].join('\n')
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } else if (subcommand === 'unban') {
            const userId = interaction.options.getString('user');
            const reason = interaction.options.getString('reason');

            await interaction.guild.bans.remove(userId, reason);

            const embed = new EmbedBuilder()
                .setColor('#22c55e')
                .setTitle('✅ Unban người dùng')
                .setDescription(
                    [
                        `> 👤 **ID người dùng:** ${userId}`,
                        `> 🛡️ **Moderator:** ${interaction.user.tag}`,
                        `> 📄 **Lý do:** ${reason}`
                    ].join('\n')
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
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

            const embed = new EmbedBuilder()
                .setColor('#facc15')
                .setTitle('⚠️ Cảnh cáo thành viên')
                .setDescription(
                    [
                        `> 👤 **Thành viên:** ${member.user.tag} (${member.id})`,
                        `> 🛡️ **Moderator:** ${interaction.user.tag}`,
                        `> 📄 **Lý do:** ${reason}`
                    ].join('\n')
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'unwarn') {
            const user = interaction.options.getUser('user');
            const caseId = interaction.options.getString('case');

            const userData = await UserData.findOne({
                userId: user.id,
                guildId: interaction.guild.id
            });
            if (!userData || userData.warnings.length === 0) {
                return interaction.reply({
                    content: '⚠️ Người dùng này không có cảnh cáo nào.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (caseId) {
                userData.warnings = userData.warnings.filter(
                    w => w._id.toString() !== caseId
                );
            } else {
                userData.warnings.pop();
            }
            userData.warns = userData.warnings.length;
            await userData.save();

            const embed = new EmbedBuilder()
                .setColor('#22c55e')
                .setTitle('✅ Xóa cảnh cáo')
                .setDescription(
                    [
                        `> 👤 **Người dùng:** ${user.tag} (${user.id})`,
                        `> 🛡️ **Moderator:** ${interaction.user.tag}`,
                        `> 📄 **Case:** ${caseId || 'Gần nhất'}`
                    ].join('\n')
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'kick') {
            const member = interaction.options.getMember('member');
            const reason = interaction.options.getString('reason');
            const dmUser = interaction.options.getBoolean('dm_user');
            const shouldDM = dmUser === null ? true : dmUser;

            await interaction.deferReply();

            if (shouldDM) {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#f97316')
                    .setTitle(`👢 Bạn đã bị kick khỏi ${interaction.guild.name}`)
                    .setDescription(
                        [
                            `> 🛡️ **Moderator:** ${interaction.user.tag}`,
                            `> 📄 **Lý do:** ${reason}`,
                            '',
                            'Bạn có thể tham gia lại nếu được mời quay lại server.'
                        ].join('\n')
                    )
                    .setTimestamp();

                try {
                    await member.user.send({ embeds: [dmEmbed] });
                } catch {
                    // ignore DM failures
                }
            }

            await member.kick(reason);

            kickLogCache.set(member.id, {
                moderator: interaction.user,
                reason,
                timestamp: Date.now()
            });

            setTimeout(() => {
                kickLogCache.delete(member.id);
            }, 10000);

            const embed = new EmbedBuilder()
                .setColor('#f97316')
                .setTitle('👢 Kick thành viên')
                .setDescription(
                    [
                        `> 👤 **Thành viên:** ${member.user.tag} (${member.id})`,
                        `> 🛡️ **Moderator:** ${interaction.user.tag}`,
                        `> 📄 **Lý do:** ${reason}`
                    ].join('\n')
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }
};

module.exports.kickLogCache = kickLogCache;
