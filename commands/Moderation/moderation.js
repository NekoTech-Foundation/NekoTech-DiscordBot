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
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('lock')
                .setDescription('Khóa kênh hiện tại (ngăn everyone chat)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlock')
                .setDescription('Mở khóa kênh hiện tại')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('purge')
                .setDescription('Xóa một số lượng tin nhắn nhất định')
                .addIntegerOption(option =>
                    option
                        .setName('amount')
                        .setDescription('Số lượng tin nhắn cần xóa (tối đa 999)')
                        .setMinValue(1)
                        .setMaxValue(999)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('autopurge')
                .setDescription('Xóa tin nhắn theo thời gian (trong vòng 2 tuần)')
                .addIntegerOption(option =>
                    option
                        .setName('amount')
                        .setDescription('Số lượng tin nhắn cần kiểm tra (tối đa 999)')
                        .setMinValue(1)
                        .setMaxValue(999)
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('days')
                        .setDescription('Số ngày trở lại đây để xóa tin nhắn (tối đa 14 ngày)')
                        .setMinValue(1)
                        .setMaxValue(14)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('allpurge')
                .setDescription('Xóa toàn bộ kênh và tạo lại (Nuke)')
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

            if (!member.manageable) {
                return interaction.reply({
                    content: 'User có quyền hạn cao hơn tui, Hãy kiểm tra lại role hoặc tạo role có quyền hạn cao hơn',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    content: 'Bạn không thể thực hiện hành động này với người có quyền hạn cao hơn hoặc bằng bạn.',
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

            try {
                const member = await interaction.guild.members.fetch(user.id);
                if (!member.manageable) {
                    return interaction.reply({
                        content: 'User có quyền hạn cao hơn tui, Hãy kiểm tra lại role hoặc tạo role có quyền hạn cao hơn',
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                    return interaction.reply({
                        content: 'Bạn không thể thực hiện hành động này với người có quyền hạn cao hơn hoặc bằng bạn.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (error) {
                // Member not found in guild, proceed with ban
            }

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

            if (!member.manageable) {
                return interaction.reply({
                    content: 'User có quyền hạn cao hơn tui, Hãy kiểm tra lại role hoặc tạo role có quyền hạn cao hơn',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    content: 'Bạn không thể thực hiện hành động này với người có quyền hạn cao hơn hoặc bằng bạn.',
                    flags: MessageFlags.Ephemeral
                });
            }

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
        } else if (subcommand === 'lock') {
            const channel = interaction.channel;
            const everyoneRole = interaction.guild.roles.everyone;

            try {
                await channel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: false
                });

                const embed = new EmbedBuilder()
                    .setColor('#ef4444')
                    .setTitle('🔒 Kênh đã bị khóa')
                    .setDescription(`Kênh này đã bị khóa bởi ${interaction.user}.\nTin nhắn từ @everyone đã bị tắt.`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: '❌ Không thể khóa kênh. Vui lòng kiểm tra quyền của bot.',
                    flags: MessageFlags.Ephemeral
                });
            }
        } else if (subcommand === 'unlock') {
            const channel = interaction.channel;
            const everyoneRole = interaction.guild.roles.everyone;

            try {
                await channel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: null
                });

                const embed = new EmbedBuilder()
                    .setColor('#22c55e')
                    .setTitle('🔓 Kênh đã được mở khóa')
                    .setDescription(`Kênh này đã được mở khóa bởi ${interaction.user}.`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: '❌ Không thể mở khóa kênh. Vui lòng kiểm tra quyền của bot.',
                    flags: MessageFlags.Ephemeral
                });
            }
        } else if (subcommand === 'purge') {
            const amount = interaction.options.getInteger('amount');
            const channel = interaction.channel;

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            let deletedCount = 0;
            let remaining = amount;

            try {
                // Determine loops needed (bulkDelete max 100)
                while (remaining > 0) {
                    const toDelete = Math.min(remaining, 100);
                    // Fetch messsages implicitly via bulkDelete count, or bulkDelete directly
                    // bulkDelete(number) fetches automatically.
                    const deleted = await channel.bulkDelete(toDelete, true);

                    if (deleted.size === 0) break; // Stop if no messages found/deleted

                    deletedCount += deleted.size;
                    remaining -= deleted.size;

                    if (deleted.size < toDelete) break; // Less messages than requested were deleted (end of channel/limit)
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit safety
                }

                await interaction.editReply({
                    content: `✅ Đã xóa ${deletedCount} tin nhắn.`
                });
            } catch (error) {
                console.error(error);
                await interaction.editReply({
                    content: '❌ Đã xảy ra lỗi khi xóa tin nhắn. Hãy đảm bảo tin nhắn không quá 14 ngày.'
                });
            }
        } else if (subcommand === 'autopurge') {
            const amount = interaction.options.getInteger('amount');
            const days = interaction.options.getInteger('days');
            const channel = interaction.channel;

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // Calculate cutoff timestamp
            const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

            try {
                // We need to fetch messages first to filter by date
                // Since we can only fetch 100 at a time, we might need loops if amount > 100
                // But discord collection filtering is easier.

                let remaining = amount;
                let deletedCount = 0;
                let lastMsgId = null;

                while (remaining > 0) {
                    const fetchSize = Math.min(remaining, 100);
                    const options = { limit: fetchSize };
                    if (lastMsgId) options.before = lastMsgId;

                    const messages = await channel.messages.fetch(options);
                    if (messages.size === 0) break;

                    // Filter messages that are NEWER than the cutoff (within the last X days)
                    // AND older than 14 days (discord limit, managed by bulkDelete automatically usually, but we should check)
                    const msgsToDelete = messages.filter(msg => msg.createdTimestamp > cutoff && (Date.now() - msg.createdTimestamp) < (14 * 24 * 60 * 60 * 1000));

                    if (msgsToDelete.size > 0) {
                        await channel.bulkDelete(msgsToDelete, true);
                        deletedCount += msgsToDelete.size;
                    }

                    lastMsgId = messages.last().id;
                    remaining -= messages.size; // We processed this many messages

                    if (messages.size < fetchSize) break; // End of channel
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                await interaction.editReply({
                    content: `✅ Đã xóa ${deletedCount} tin nhắn được gửi trong ${days} ngày qua (trong phạm vi kiểm tra ${amount} tin nhắn).`
                });

            } catch (error) {
                console.error(error);
                await interaction.editReply({
                    content: '❌ Đã xảy ra lỗi khi xóa tin nhắn.'
                });
            }
        } else if (subcommand === 'allpurge') {
            const channel = interaction.channel;

            // Confirmation via ephemeral reply? Or strict action?
            // User requested command, usually we just do it or ask button.
            // For simplicity and speed requested by user "copy name, delete old, create new", we'll do it.
            // But we can't reply to interaction easily if channel is gone.

            try {
                await interaction.reply({ content: '💣 Đang tái tạo kênh...', flags: MessageFlags.Ephemeral });

                const position = channel.position;
                const newChannel = await channel.clone();
                await channel.delete();
                await newChannel.setPosition(position);

                const embed = new EmbedBuilder()
                    .setColor('#ef4444')
                    .setTitle('💣 Kênh đã được tái tạo (Nuke)')
                    .setDescription(`Kênh này đã được làm mới bởi ${interaction.user}.`)
                    .setImage('https://media.tenor.com/gi1Y8j1I-QIAAAAC/explosion-explode.gif') // Fun gif
                    .setTimestamp();

                await newChannel.send({ embeds: [embed] });

            } catch (error) {
                console.error(error);
                // Can't reply if channel is dead, but try logging
            }
        }
    }
};

module.exports.kickLogCache = kickLogCache;
