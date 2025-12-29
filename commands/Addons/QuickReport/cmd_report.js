const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Report = require('../../../models/Report');
const QuickReportSettings = require('../../../models/QuickReportSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Quản lí các phiếu tố cáo.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('message')
                .setDescription('Báo cáo tin nhắn trong máy chủ.')
                .addChannelOption(option => option.setName('channel').setDescription('Kênh chứa tin nhắn.').setRequired(true))
                .addStringOption(option => option.setName('message_id').setDescription('ID của tin nhắn.').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Lý do báo cáo.').setRequired(true))
                .addBooleanOption(option => option.setName('silent').setDescription('Thực hiện ở chế độ im lặng.'))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('recent')
                .setDescription('Hiển thị các báo cáo gần đây.')
                .addStringOption(option => option.setName('order').setDescription('Sắp xếp kết quả.').setRequired(true).addChoices(
                    { name: 'Mới nhất', value: 'newest' },
                    { name: 'Cũ nhất', value: 'oldest' }
                ))
                .addStringOption(option => option.setName('status').setDescription('Trạng thái báo cáo.').addChoices(
                    { name: 'Đang chờ', value: 'pending' },
                    { name: 'Đã xác nhận', value: 'approved' },
                    { name: 'Đã từ chối', value: 'rejected' }
                ))
                .addUserOption(option => option.setName('reporter').setDescription('Người báo cáo.'))
                .addUserOption(option => option.setName('reported').setDescription('Người bị báo cáo.'))
                .addBooleanOption(option => option.setName('silent').setDescription('Thực hiện ở chế độ im lặng.'))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Hiển thị báo cáo dựa trên ID.')
                .addIntegerOption(option => option.setName('report_id').setDescription('ID của báo cáo.').setRequired(true))
                .addBooleanOption(option => option.setName('silent').setDescription('Thực hiện ở chế độ im lặng.'))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Phê duyệt/Từ chối báo cáo.')
                .addStringOption(option => option.setName('action').setDescription('Hành động.').setRequired(true).addChoices(
                    { name: 'Xác nhận', value: 'approve' },
                    { name: 'Từ chối', value: 'reject' }
                ))
                .addIntegerOption(option => option.setName('report_id').setDescription('ID của báo cáo.').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Lý do cho hành động này.').setRequired(true))
                .addBooleanOption(option => option.setName('silent').setDescription('Thực hiện ở chế độ im lặng.'))
        )
        .addSubcommandGroup(group =>
            group
                .setName('settings')
                .setDescription('Cài đặt tính năng Quick Report.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('enable')
                        .setDescription('Kích hoạt tính năng Quick Report.')
                        .addChannelOption(option => option.setName('receive_channel').setDescription('Kênh để nhận báo cáo.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('disable')
                        .setDescription('Vô hiệu hóa tính năng Quick Report.')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('muterole')
                        .setDescription('Đặt vai trò tắt tiếng (mute role).')
                        .addRoleOption(option => option.setName('role').setDescription('Chọn vai trò.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('manager')
                        .setDescription('Đặt vai trò người quản lý báo cáo.')
                        .addRoleOption(option => option.setName('role').setDescription('Chọn vai trò.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('bypass')
                        .setDescription('Đặt role bảo vệ người dùng khỏi các báo cáo.')
                        .addRoleOption(option => option.setName('role').setDescription('Chọn vai trò.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('blacklist')
                        .setDescription('Đặt vai trò khiến người dùng không thể báo cáo.')
                        .addRoleOption(option => option.setName('role').setDescription('Chọn vai trò.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('autoexpire')
                        .setDescription('Đặt thời gian tự động hết hạn cho các báo cáo.')
                        .addIntegerOption(option => option.setName('after').setDescription('Số giờ sau đó báo cáo sẽ hết hạn.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('concurrent')
                        .setDescription('Đặt số lượng báo cáo đồng thời tối đa cho mỗi người dùng.')
                        .addIntegerOption(option => option.setName('maximum').setDescription('Số lượng tối đa.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('successful_message')
                        .setDescription('Đặt tin nhắn được gửi khi báo cáo thành công.')
                        .addStringOption(option => option.setName('message').setDescription('Nội dung tin nhắn.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('auto_delete')
                        .setDescription('Tự động xóa báo cáo trong một số sự kiện.')
                        .addBooleanOption(option => option.setName('on_user_timeout').setDescription('Khi người dùng bị timeout.'))
                        .addBooleanOption(option => option.setName('on_user_muted').setDescription('Khi người dùng bị mute.'))
                        .addBooleanOption(option => option.setName('on_user_leave').setDescription('Khi người dùng bị cấm/rời máy chủ.'))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('channels')
                        .setDescription('Thêm/xóa kênh vào danh sách blacklist/whitelist.')
                        .addStringOption(option => option.setName('action').setDescription('Hành động.').setRequired(true).addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }))
                        .addChannelOption(option => option.setName('channel').setDescription('Chọn kênh.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('categories')
                        .setDescription('Thêm/xóa danh mục vào danh sách blacklist/whitelist.')
                        .addStringOption(option => option.setName('action').setDescription('Hành động.').setRequired(true).addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }))
                        .addChannelOption(option => option.setName('category').setDescription('Chọn danh mục.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('mode')
                        .setDescription('Chuyển đổi chế độ Quick Report.')
                        .addStringOption(option => option.setName('action').setDescription('Chế độ.').setRequired(true).addChoices(
                            { name: 'Whitelist', value: 'whitelist' },
                            { name: 'Blacklist', value: 'blacklist' },
                            { name: 'Toàn bộ máy chủ', value: 'guild' }
                        ))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('configuration')
                        .setDescription('Hiển thị cấu hình Quick Report hiện tại.')
                )
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup();
        const guildId = interaction.guild.id;

        if (!group) {
            if (subcommand === 'message') {
                const channel = interaction.options.getChannel('channel');
                const messageId = interaction.options.getString('message_id');
                const reason = interaction.options.getString('reason');
                const silent = interaction.options.getBoolean('silent') ?? false;

                const settings = await QuickReportSettings.findOne({ guildId });
                if (!settings || !settings.enabled) {
                    return interaction.reply({ content: 'Tính năng báo cáo chưa được bật trên máy chủ này.', ephemeral: true });
                }

                const message = await channel.messages.fetch(messageId);
                if (!message) {
                    return interaction.reply({ content: 'Không tìm thấy tin nhắn.', ephemeral: true });
                }

                const reportId = await getNextReportId(guildId);

                const report = new Report({
                    reportId,
                    guildId,
                    reporterId: interaction.user.id,
                    reportedUserId: message.author.id,
                    messageId,
                    channelId: channel.id,
                    reason,
                });

                await report.save();

                const receiveChannel = await interaction.client.channels.fetch(settings.receiveChannelId);
                if (receiveChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle(`Báo cáo mới #${reportId}`)
                        .setDescription(`**Người báo cáo:** ${interaction.user}\n**Người bị báo cáo:** ${message.author}\n**Lý do:** ${reason}\n\n**Nội dung tin nhắn:**\n${message.content}`)
                        .addFields({ name: 'Tin nhắn gốc', value: `[Bấm vào đây](${message.url})` })
                        .setColor('Red')
                        .setTimestamp();
                    await receiveChannel.send({ embeds: [embed] });
                }

                await interaction.reply({ content: 'Đã gửi báo cáo của bạn.', ephemeral: silent });
            } else if (subcommand === 'recent') {
                const order = interaction.options.getString('order');
                const status = interaction.options.getString('status');
                const reporter = interaction.options.getUser('reporter');
                const reported = interaction.options.getUser('reported');
                const silent = interaction.options.getBoolean('silent') ?? false;

                const query = { guildId };
                if (status) query.status = status;
                if (reporter) query.reporterId = reporter.id;
                if (reported) query.reportedUserId = reported.id;

                const sortOrder = order === 'newest' ? -1 : 1;
                const reports = await Report.find(query).sort({ createdAt: sortOrder }).limit(10);

                if (reports.length === 0) {
                    return interaction.reply({ content: 'Không tìm thấy báo cáo nào.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle('Các báo cáo gần đây')
                    .setColor('Blue');

                for (const report of reports) {
                    const reporterUser = await interaction.client.users.fetch(report.reporterId);
                    const reportedUser = await interaction.client.users.fetch(report.reportedUserId);
                    embed.addFields({
                        name: `Báo cáo #${report.reportId}`,
                        value: `**Người báo cáo:** ${reporterUser.tag}\n**Người bị báo cáo:** ${reportedUser.tag}\n**Trạng thái:** ${report.status}`
                    });
                }

                await interaction.reply({ embeds: [embed], ephemeral: silent });
            } else if (subcommand === 'check') {
                const reportId = interaction.options.getInteger('report_id');
                const silent = interaction.options.getBoolean('silent') ?? false;

                const report = await Report.findOne({ guildId, reportId });

                if (!report) {
                    return interaction.reply({ content: 'Không tìm thấy báo cáo.', ephemeral: true });
                }

                const reporterUser = await interaction.client.users.fetch(report.reporterId);
                const reportedUser = await interaction.client.users.fetch(report.reportedUserId);
                const channel = await interaction.client.channels.fetch(report.channelId);
                const message = await channel.messages.fetch(report.messageId);

                const embed = new EmbedBuilder()
                    .setTitle(`Báo cáo #${report.reportId}`)
                    .setDescription(`**Người báo cáo:** ${reporterUser}\n**Người bị báo cáo:** ${reportedUser}\n**Lý do:** ${report.reason}\n**Trạng thái:** ${report.status}\n\n**Nội dung tin nhắn:**\n${message.content}`)
                    .addFields({ name: 'Tin nhắn gốc', value: `[Bấm vào đây](${message.url})` })
                    .setColor('Blue')
                    .setTimestamp(report.createdAt);

                await interaction.reply({ embeds: [embed], ephemeral: silent });
            } else if (subcommand === 'update') {
                const action = interaction.options.getString('action');
                const reportId = interaction.options.getInteger('report_id');
                const reason = interaction.options.getString('reason');
                const silent = interaction.options.getBoolean('silent') ?? false;

                const settings = await QuickReportSettings.findOne({ guildId });
                if (!settings.managerRoleId || !interaction.member.roles.cache.has(settings.managerRoleId)) {
                    return interaction.reply({ content: 'Bạn không có quyền thực hiện hành động này.', ephemeral: true });
                }

                const newStatus = action === 'approve' ? 'approved' : 'rejected';
                const report = await Report.findOneAndUpdate(
                    { guildId, reportId },
                    { status: newStatus },
                    { new: true }
                );

                if (!report) {
                    return interaction.reply({ content: 'Không tìm thấy báo cáo.', ephemeral: true });
                }

                await interaction.reply({ content: `Đã cập nhật báo cáo #${reportId} thành ${newStatus}.`, ephemeral: silent });
            }
        } else if (group === 'settings') {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: 'Bạn không có quyền sử dụng lệnh này.', ephemeral: true });
            }

            if (subcommand === 'enable') {
                const receiveChannel = interaction.options.getChannel('receive_channel');
                await QuickReportSettings.findOneAndUpdate(
                    { guildId },
                    { enabled: true, receiveChannelId: receiveChannel.id },
                    { upsert: true }
                );
                await interaction.reply({ content: `Đã bật tính năng Quick Report. Kênh nhận báo cáo: ${receiveChannel}`, ephemeral: true });
            } else if (subcommand === 'disable') {
                await QuickReportSettings.findOneAndUpdate({ guildId }, { enabled: false });
                await interaction.reply({ content: 'Đã tắt tính năng Quick Report.', ephemeral: true });
            } else if (subcommand === 'muterole') {
                const role = interaction.options.getRole('role');
                await QuickReportSettings.findOneAndUpdate({ guildId }, { muteRoleId: role.id }, { upsert: true });
                await interaction.reply({ content: `Đã đặt mute role thành: ${role}`, ephemeral: true });
            } else if (subcommand === 'manager') {
                const role = interaction.options.getRole('role');
                await QuickReportSettings.findOneAndUpdate({ guildId }, { managerRoleId: role.id }, { upsert: true });
                await interaction.reply({ content: `Đã đặt manager role thành: ${role}`, ephemeral: true });
            } else if (subcommand === 'bypass') {
                const role = interaction.options.getRole('role');
                await QuickReportSettings.findOneAndUpdate({ guildId }, { bypassRoleId: role.id }, { upsert: true });
                await interaction.reply({ content: `Đã đặt bypass role thành: ${role}`, ephemeral: true });
            } else if (subcommand === 'blacklist') {
                const role = interaction.options.getRole('role');
                await QuickReportSettings.findOneAndUpdate({ guildId }, { blacklistRoleId: role.id }, { upsert: true });
                await interaction.reply({ content: `Đã đặt blacklist role thành: ${role}`, ephemeral: true });
            } else if (subcommand === 'autoexpire') {
                const after = interaction.options.getInteger('after');
                await QuickReportSettings.findOneAndUpdate({ guildId }, { autoExpireHours: after }, { upsert: true });
                await interaction.reply({ content: `Đã đặt thời gian tự động hết hạn thành: ${after} giờ.`, ephemeral: true });
            } else if (subcommand === 'concurrent') {
                const maximum = interaction.options.getInteger('maximum');
                await QuickReportSettings.findOneAndUpdate({ guildId }, { concurrentReports: maximum }, { upsert: true });
                await interaction.reply({ content: `Đã đặt số lượng báo cáo đồng thời tối đa thành: ${maximum}.`, ephemeral: true });
            } else if (subcommand === 'successful_message') {
                const message = interaction.options.getString('message');
                await QuickReportSettings.findOneAndUpdate({ guildId }, { successfulMessage: message }, { upsert: true });
                await interaction.reply({ content: `Đã đặt tin nhắn báo cáo thành công.`, ephemeral: true });
            } else if (subcommand === 'auto_delete') {
                const onTimeout = interaction.options.getBoolean('on_user_timeout') ?? true;
                const onMute = interaction.options.getBoolean('on_user_muted') ?? true;
                const onLeave = interaction.options.getBoolean('on_user_leave') ?? true;
                await QuickReportSettings.findOneAndUpdate(
                    { guildId },
                    {
                        autoDeleteOnTimeout: onTimeout,
                        autoDeleteOnMute: onMute,
                        autoDeleteOnLeave: onLeave,
                    },
                    { upsert: true }
                );
                await interaction.reply({ content: 'Đã cập nhật cài đặt tự động xóa.', ephemeral: true });
            } else if (subcommand === 'channels') {
                const action = interaction.options.getString('action');
                const channel = interaction.options.getChannel('channel');
                const update = action === 'add' ? { $addToSet: { blacklistedChannels: channel.id } } : { $pull: { blacklistedChannels: channel.id } };
                await QuickReportSettings.findOneAndUpdate({ guildId }, update, { upsert: true });
                await interaction.reply({ content: `Đã ${action === 'add' ? 'thêm' : 'xóa'} kênh ${channel} vào danh sách đen.`, ephemeral: true });
            } else if (subcommand === 'categories') {
                const action = interaction.options.getString('action');
                const category = interaction.options.getChannel('category');
                const update = action === 'add' ? { $addToSet: { blacklistedCategories: category.id } } : { $pull: { blacklistedCategories: category.id } };
                await QuickReportSettings.findOneAndUpdate({ guildId }, update, { upsert: true });
                await interaction.reply({ content: `Đã ${action === 'add' ? 'thêm' : 'xóa'} danh mục ${category} vào danh sách đen.`, ephemeral: true });
            } else if (subcommand === 'mode') {
                const mode = interaction.options.getString('action');
                await QuickReportSettings.findOneAndUpdate({ guildId }, { mode }, { upsert: true });
                await interaction.reply({ content: `Đã chuyển chế độ Quick Report thành: ${mode}.`, ephemeral: true });
            } else if (subcommand === 'configuration') {
                const settings = await QuickReportSettings.findOne({ guildId });
                if (!settings) {
                    return interaction.reply({ content: 'Chưa có cấu hình nào cho máy chủ này.', ephemeral: true });
                }
                const embed = new EmbedBuilder()
                    .setTitle('Cấu hình Quick Report')
                    .addFields(
                        { name: 'Enabled', value: settings.enabled.toString() },
                        { name: 'Receive Channel', value: settings.receiveChannelId ? `<#${settings.receiveChannelId}>` : 'Chưa đặt' },
                        { name: 'Mute Role', value: settings.muteRoleId ? `<@&${settings.muteRoleId}>` : 'Chưa đặt' },
                        { name: 'Manager Role', value: settings.managerRoleId ? `<@&${settings.managerRoleId}>` : 'Chưa đặt' },
                        { name: 'Bypass Role', value: settings.bypassRoleId ? `<@&${settings.bypassRoleId}>` : 'Chưa đặt' },
                        { name: 'Blacklist Role', value: settings.blacklistRoleId ? `<@&${settings.blacklistRoleId}>` : 'Chưa đặt' },
                        { name: 'Auto Expire Hours', value: `${settings.autoExpireHours} giờ` },
                        { name: 'Concurrent Reports', value: `${settings.concurrentReports}` },
                        { name: 'Mode', value: settings.mode },
                    );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    }
};

async function getNextReportId(guildId) {
    const lastReport = await Report.findOne({ guildId }).sort({ reportId: -1 });
    return (lastReport ? lastReport.reportId : 0) + 1;
}
