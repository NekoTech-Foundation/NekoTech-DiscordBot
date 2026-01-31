const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const guildData = require('../../models/guildDataSchema');
const SafetyManager = require('../../utils/SafetyManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('safety')
        .setDescription('Cấu hình hệ thống an toàn (AntiNuke, AntiHoist)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommandGroup(group =>
            group.setName('antinuke')
                .setDescription('Cấu hình cài đặt chống Nuke')
                .addSubcommand(sub =>
                    sub.setName('toggle')
                        .setDescription('Bật hoặc tắt AntiNuke')
                        .addBooleanOption(option => option.setName('enabled').setDescription('Bật?').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('limit')
                        .setDescription('Thiết lập giới hạn cho hành động AntiNuke')
                        .addStringOption(option =>
                            option.setName('type')
                                .setDescription('Loại hành động')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Cấm (Ban)', value: 'ban' },
                                    { name: 'Đuổi (Kick)', value: 'kick' },
                                    { name: 'Xóa kênh', value: 'channelDelete' },
                                    { name: 'Xóa vai trò', value: 'roleDelete' }
                                )
                        )
                        .addIntegerOption(option => option.setName('threshold').setDescription('Số lần tối đa cho phép').setRequired(true))
                        .addIntegerOption(option => option.setName('period').setDescription('Khoảng thời gian (giây, mặc định 60)').setRequired(false))
                )
        )
        .addSubcommandGroup(group =>
            group.setName('antihoist')
                .setDescription('Cấu hình cài đặt chống Hoist (Tên gây chú ý)')
                .addSubcommand(sub =>
                    sub.setName('toggle')
                        .setDescription('Bật hoặc tắt AntiHoist')
                        .addBooleanOption(option => option.setName('enabled').setDescription('Bật?').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('action')
                        .setDescription('Thiết lập hành động xử lý AntiHoist')
                        .addStringOption(option =>
                            option.setName('type')
                                .setDescription('Hành động thực hiện')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Đổi biệt danh', value: 'nickname' },
                                    { name: 'Đuổi thành viên (Kick)', value: 'kick' }
                                )
                        )
                )
        )
        .addSubcommandGroup(group =>
            group.setName('whitelist')
                .setDescription('Quản lý danh sách trắng cho hệ thống an toàn')
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Thêm người dùng hoặc vai trò vào danh sách trắng')
                        .addUserOption(option => option.setName('user').setDescription('Người dùng'))
                        .addRoleOption(option => option.setName('role').setDescription('Vai trò'))
                )
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Xóa người dùng hoặc vai trò khỏi danh sách trắng')
                        .addUserOption(option => option.setName('user').setDescription('Người dùng'))
                        .addRoleOption(option => option.setName('role').setDescription('Vai trò'))
                )

        )
        .addSubcommandGroup(group =>
            group.setName('commands')
                .setDescription('Quản lý trạng thái lệnh')
                .addSubcommand(sub =>
                    sub.setName('disable')
                        .setDescription('Vô hiệu hóa một lệnh trong máy chủ này')
                        .addStringOption(option => option.setName('command').setDescription('Tên lệnh cần vô hiệu hóa').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('enable')
                        .setDescription('Bật lại một lệnh đã bị vô hiệu hóa')
                        .addStringOption(option => option.setName('command').setDescription('Tên lệnh cần bật lại').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('Danh sách các lệnh đang bị vô hiệu hóa')
                )
        ),
    category: 'Moderation',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        let data = await guildData.findOne({ guildID: guildId });
        if (!data) data = await guildData.create({ guildID: guildId });
        // Ensure safety object exists
        await SafetyManager.getGuildSettings(guildId);
        // Re-fetch to get the initialized object
        data = await guildData.findOne({ guildID: guildId });

        if (group === 'antinuke') {
            if (subcommand === 'toggle') {
                const enabled = interaction.options.getBoolean('enabled');
                data.safety.antinuke.enabled = enabled;
                await data.save();
                return interaction.editReply(`AntiNuke đã được **${enabled ? 'BẬT' : 'TẮT'}**.`);
            } else if (subcommand === 'limit') {
                const type = interaction.options.getString('type');
                const threshold = interaction.options.getInteger('threshold');
                const period = interaction.options.getInteger('period') || 60;

                data.safety.antinuke.limits[type] = {
                    threshold: threshold,
                    period: period * 1000
                };
                await data.save();
                return interaction.editReply(`Đã thiết lập giới hạn cho **${type}**: tối đa **${threshold}** lần trong **${period}** giây.`);
            }
        } else if (group === 'antihoist') {
            if (subcommand === 'toggle') {
                const enabled = interaction.options.getBoolean('enabled');
                data.safety.antihoist.enabled = enabled;
                await data.save();
                return interaction.editReply(`AntiHoist đã được **${enabled ? 'BẬT' : 'TẮT'}**.`);
            } else if (subcommand === 'action') {
                const action = interaction.options.getString('type');
                data.safety.antihoist.action = action;
                await data.save();
                return interaction.editReply(`Hành động AntiHoist đã được đặt là: **${action === 'nickname' ? 'Đổi biệt danh' : 'Đuổi (Kick)'}**.`);
            }
        } else if (group === 'whitelist') {
            const user = interaction.options.getUser('user');
            const role = interaction.options.getRole('role');
            const target = subcommand === 'add' ? 'thêm vào' : 'xóa khỏi';

            if (user) {
                const list = data.safety.antinuke.whitelistedUsers;
                if (subcommand === 'add' && !list.includes(user.id)) list.push(user.id);
                else if (subcommand === 'remove') {
                    const index = list.indexOf(user.id);
                    if (index > -1) list.splice(index, 1);
                }
                data.safety.antinuke.whitelistedUsers = list; // Mongoose should detect change
                data.markModified('safety.antinuke.whitelistedUsers');
            }

            if (role) {
                const list = data.safety.antinuke.whitelistedRoles;
                if (subcommand === 'add' && !list.includes(role.id)) list.push(role.id);
                else if (subcommand === 'remove') {
                    const index = list.indexOf(role.id);
                    if (index > -1) list.splice(index, 1);
                }
                data.safety.antinuke.whitelistedRoles = list;
                data.markModified('safety.antinuke.whitelistedRoles');
            }

            await data.save();
            return interaction.editReply(`Đã ${target} danh sách trắng thành công.`);
        } else if (group === 'commands') {
            const commandName = interaction.options.getString('command');

            if (subcommand === 'list') {
                const disabled = data.safety.disabledCommands || [];
                if (disabled.length === 0) {
                    return interaction.editReply('✅ Không có lệnh nào bị vô hiệu hóa trong máy chủ này.');
                }
                const embed = new EmbedBuilder()
                    .setTitle('🚫 Các lệnh bị vô hiệu hóa')
                    .setDescription(disabled.map(c => `• \`/${c}\``).join('\n'))
                    .setColor('#FF0000');
                return interaction.editReply({ embeds: [embed] });
            }

            // Validation: Prevent disabling vital commands
            const vitalCommands = ['safety', 'ping', 'help'];
            if (vitalCommands.includes(commandName)) {
                return interaction.editReply(`❌ Bạn không thể vô hiệu hóa lệnh \`/${commandName}\` vì nó rất quan trọng.`);
            }

            // Validation: Check if command exists
            const cmd = interaction.client.slashCommands.get(commandName);
            if (!cmd) {
                return interaction.editReply(`❌ Lệnh \`/${commandName}\` không tồn tại.`);
            }

            let disabled = data.safety.disabledCommands || [];

            if (subcommand === 'disable') {
                if (disabled.includes(commandName)) {
                    return interaction.editReply(`ℹ️ Lệnh \`/${commandName}\` đã bị vô hiệu hóa từ trước.`);
                }
                disabled.push(commandName);
                if (!data.safety.disabledCommands) data.safety.disabledCommands = [];
                data.safety.disabledCommands = disabled;
                data.markModified('safety.disabledCommands'); // Ensure array change is detected
                await data.save();
                return interaction.editReply(`🚫 Lệnh \`/${commandName}\` đã bị **VÔ HIỆU HÓA** trong máy chủ này.`);
            } else if (subcommand === 'enable') {
                if (!disabled.includes(commandName)) {
                    return interaction.editReply(`ℹ️ Lệnh \`/${commandName}\` không bị vô hiệu hóa.`);
                }
                disabled = disabled.filter(c => c !== commandName);
                data.safety.disabledCommands = disabled;
                data.markModified('safety.disabledCommands');
                await data.save();
                return interaction.editReply(`✅ Lệnh \`/${commandName}\` đã được **BẬT** lại.`);
            }
        }
    }
};
