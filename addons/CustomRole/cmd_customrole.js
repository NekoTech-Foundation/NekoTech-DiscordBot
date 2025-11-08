const { SlashCommandBuilder } = require('discord.js');
const CustomRole = require('../../models/CustomRole');
const CustomRoleSettings = require('../../models/CustomRoleSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('customrole')
        .setDescription('Quản lí role tùy chỉnh của bạn.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Tìm kiếm thông tin một role tùy chỉnh.')
                .addRoleOption(option => option.setName('role').setDescription('Chọn role để tìm kiếm.'))
        )
        .addSubcommandGroup(group =>
            group
                .setName('user')
                .setDescription('Các lệnh cài đặt dành cho người dùng.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Thêm một thành viên vào role tùy chỉnh của bạn.')
                        .addUserOption(option => option.setName('user').setDescription('Chọn một thành viên.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Xóa một thành viên khỏi role tùy chỉnh của bạn.')
                        .addUserOption(option => option.setName('user').setDescription('Chọn một thành viên.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('color')
                        .setDescription('Thay đổi màu của role tùy chỉnh của bạn.')
                        .addStringOption(option => option.setName('color').setDescription('Mã màu hex (ví dụ: #c0cdff)').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('icon')
                        .setDescription('Chỉnh sửa icon của role tùy chỉnh của bạn.')
                        .addAttachmentOption(option => option.setName('icon').setDescription('Tải lên icon của bạn.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('removeicon')
                        .setDescription('Xóa icon từ role tùy chỉnh của bạn.')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('mentionable')
                        .setDescription('Làm cho role tùy chỉnh của bạn có thể nhắc đến.')
                        .addBooleanOption(option => option.setName('action').setDescription('Bật hoặc tắt.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('info')
                        .setDescription('Xem thông tin role tùy chỉnh của bạn.')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('name')
                        .setDescription('Thay đổi tên role tùy chỉnh của bạn.')
                        .addStringOption(option => option.setName('name').setDescription('Tên role mới.').setRequired(true))
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('admin')
                .setDescription('Các lệnh cài đặt dành cho quản trị.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('create')
                        .setDescription('Tạo và gán một Custom Role cho một thành viên.')
                        .addRoleOption(option => option.setName('above_role').setDescription('Role mới sẽ nằm trên role này.').setRequired(true))
                        .addUserOption(option => option.setName('author').setDescription('Chỉ định chủ của role tùy chỉnh.').setRequired(true))
                        .addStringOption(option => option.setName('name').setDescription('Chỉ định tên role.').setRequired(true))
                        .addIntegerOption(option => option.setName('max_users').setDescription('Số người dùng tối đa có thể được gán vào role này.').setRequired(true))
                        .addStringOption(option => option.setName('expire_after').setDescription('Hỗ trợ ngày ở dạng ngắn (ví dụ: 2mon1d2h), nhập ‘0’ để đặt là vĩnh viễn.').setRequired(true))
                        .addStringOption(option => option.setName('color').setDescription('Chỉ định màu của role.'))
                        .addBooleanOption(option => option.setName('edit_name_permission').setDescription('Cho phép chủ của role thay đổi tên role của họ.'))
                        .addBooleanOption(option => option.setName('edit_icon_permission').setDescription('Cho phép chủ của role thay đổi icon của họ.'))
                        .addBooleanOption(option => option.setName('edit_color_permission').setDescription('Cho phép chủ của role thay đổi màu của họ.'))
                        .addBooleanOption(option => option.setName('manage_role_members_permission').setDescription('Cho phép chủ của role thêm/xóa thành viên của role.'))
                        .addBooleanOption(option => option.setName('make_role_mentionable_permission').setDescription('Cho phép chủ của role làm cho role của họ có thể được nhắc đến.'))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('terminate')
                        .setDescription('Ngừng role tùy chỉnh của một thành viên.')
                        .addUserOption(option => option.setName('user').setDescription('Chọn người dùng.').setRequired(true))
                        .addBooleanOption(option => option.setName('delete_role').setDescription('Xóa role hay không, mặc định: không.'))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('migrate')
                        .setDescription('Chuyển một role hiện tại sang role tùy chỉnh của bot.')
                        .addRoleOption(option => option.setName('role').setDescription('Chỉ định một role.').setRequired(true))
                        .addUserOption(option => option.setName('author').setDescription('Chỉ định chủ của role tùy chỉnh.').setRequired(true))
                        .addIntegerOption(option => option.setName('max_users').setDescription('Số người dùng tối đa có thể được gán vào role này.').setRequired(true))
                        .addStringOption(option => option.setName('expire_after').setDescription('Hỗ trợ ngày ở dạng ngắn (ví dụ: 2mon1d2h), nhập ‘0’ để đặt là vĩnh viễn.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('edit_permission')
                        .setDescription('Chỉnh sửa quyền của từng role.')
                        .addRoleOption(option => option.setName('role').setDescription('Chỉ định một role.').setRequired(true))
                        .addBooleanOption(option => option.setName('edit_name').setDescription('Cho phép chủ của role thay đổi tên role của họ.'))
                        .addBooleanOption(option => option.setName('edit_icon').setDescription('Cho phép chủ của role thay đổi icon của họ.'))
                        .addBooleanOption(option => option.setName('edit_color').setDescription('Cho phép chủ của role thay đổi màu của họ.'))
                        .addBooleanOption(option => option.setName('manage_role_members').setDescription('Cho phép chủ của role thêm/xóa thành viên của role.'))
                        .addBooleanOption(option => option.setName('make_role_mentionable').setDescription('Cho phép chủ của role làm cho role của họ có thể được nhắc đến.'))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('max_users')
                        .setDescription('Chỉnh sửa số người tối đa của role.')
                        .addRoleOption(option => option.setName('role').setDescription('Chỉ định một role.').setRequired(true))
                        .addIntegerOption(option => option.setName('users').setDescription('Chỉ định số lượng, từ 1 đến tối đa 100.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('default_author_permission')
                        .setDescription('Chỉnh sửa quyền mặc định cho các role.')
                        .addBooleanOption(option => option.setName('edit_name').setDescription('Cho phép chủ của role thay đổi tên role của họ.'))
                        .addBooleanOption(option => option.setName('edit_icon').setDescription('Cho phép chủ của role thay đổi icon của họ.'))
                        .addBooleanOption(option => option.setName('edit_color').setDescription('Cho phép chủ của role thay đổi màu của họ.'))
                        .addBooleanOption(option => option.setName('manage_role_members').setDescription('Cho phép chủ của role thêm/xóa thành viên của role.'))
                        .addBooleanOption(option => option.setName('make_role_mentionable').setDescription('Cho phép chủ của role làm cho role của họ có thể được nhắc đến.'))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('extend')
                        .setDescription('Gia hạn thêm ngày hết hạn cho một role tùy chỉnh.')
                        .addRoleOption(option => option.setName('role').setDescription('Chọn role.').setRequired(true))
                        .addStringOption(option => option.setName('time_range').setDescription('Chỉ định khoảng thời gian. Nhập ‘0’ để làm vĩnh viễn.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('reduce')
                        .setDescription('Giảm ngày hết hạn của một role tùy chỉnh.')
                        .addRoleOption(option => option.setName('role').setDescription('Chọn role.').setRequired(true))
                        .addStringOption(option => option.setName('time_range').setDescription('Chỉ định khoảng thời gian để giảm.').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('on_expire')
                        .setDescription('Chỉ định sự kiện thực hiện khi role tùy chỉnh của một người dùng hết hạn.')
                        .addStringOption(option => option.setName('action').setDescription('Ghi hành động.').setRequired(true).addChoices(
                            { name: 'Xóa role', value: 'deleteRole' },
                            { name: 'Xóa tất cả thành viên', value: 'removeMembers' }
                        ))
                )
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup();

        if (subcommand === 'search') {
            const role = interaction.options.getRole('role');
            const customRole = await CustomRole.findOne({ roleId: role.id, guildId: interaction.guild.id });

            if (!customRole) {
                return interaction.reply({ content: 'Role này không phải là role tùy chỉnh.', ephemeral: true });
            }

            const author = await interaction.guild.members.fetch(customRole.authorId);
            const expiresAt = customRole.expiresAt ? `<t:${Math.floor(customRole.expiresAt.getTime() / 1000)}:R>` : 'Vĩnh viễn';

            const embed = new EmbedBuilder()
                .setTitle(`Thông tin role tùy chỉnh: ${role.name}`)
                .setColor(role.color)
                .addFields(
                    { name: 'Chủ sở hữu', value: author.toString(), inline: true },
                    { name: 'Hết hạn', value: expiresAt, inline: true },
                    { name: 'Số người dùng tối đa', value: customRole.maxUsers.toString(), inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } else if (group === 'user') {
            const customRole = await CustomRole.findOne({ authorId: interaction.user.id, guildId: interaction.guild.id });

            if (!customRole) {
                return interaction.reply({ content: 'Bạn không sở hữu role tùy chỉnh nào.', ephemeral: true });
            }

            const role = await interaction.guild.roles.fetch(customRole.roleId);
            if (!role) {
                return interaction.reply({ content: 'Không tìm thấy role của bạn. Có thể nó đã bị xóa.', ephemeral: true });
            }

            if (subcommand === 'info') {
                const expiresAt = customRole.expiresAt ? `<t:${Math.floor(customRole.expiresAt.getTime() / 1000)}:R>` : 'Vĩnh viễn';

                const embed = new EmbedBuilder()
                    .setTitle(`Thông tin role tùy chỉnh của bạn: ${role.name}`)
                    .setColor(role.color)
                    .addFields(
                        { name: 'Chủ sở hữu', value: interaction.user.toString(), inline: true },
                        { name: 'Hết hạn', value: expiresAt, inline: true },
                        { name: 'Số người dùng tối đa', value: customRole.maxUsers.toString(), inline: true }
                    );

                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'add') {
                if (!customRole.permissions.manageMembers) {
                    return interaction.reply({ content: 'Bạn không có quyền thêm thành viên vào role này.', ephemeral: true });
                }
                if (role.members.size >= customRole.maxUsers) {
                    return interaction.reply({ content: 'Role của bạn đã đạt số lượng thành viên tối đa.', ephemeral: true });
                }
                const userToAdd = interaction.options.getUser('user');
                const memberToAdd = await interaction.guild.members.fetch(userToAdd.id);
                await memberToAdd.roles.add(role);
                await interaction.reply({ content: `Đã thêm ${userToAdd.toString()} vào role ${role.name}.`, ephemeral: true });
            } else if (subcommand === 'remove') {
                if (!customRole.permissions.manageMembers) {
                    return interaction.reply({ content: 'Bạn không có quyền xóa thành viên khỏi role này.', ephemeral: true });
                }
                const userToRemove = interaction.options.getUser('user');
                const memberToRemove = await interaction.guild.members.fetch(userToRemove.id);
                await memberToRemove.roles.remove(role);
                await interaction.reply({ content: `Đã xóa ${userToRemove.toString()} khỏi role ${role.name}.`, ephemeral: true });
            } else if (subcommand === 'color') {
                if (!customRole.permissions.editColor) {
                    return interaction.reply({ content: 'Bạn không có quyền thay đổi màu của role này.', ephemeral: true });
                }
                const color = interaction.options.getString('color');
                await role.setColor(color);
                await interaction.reply({ content: `Đã thay đổi màu của role ${role.name} thành ${color}.`, ephemeral: true });
            } else if (subcommand === 'name') {
                if (!customRole.permissions.editName) {
                    return interaction.reply({ content: 'Bạn không có quyền thay đổi tên của role này.', ephemeral: true });
                }
                const name = interaction.options.getString('name');
                await role.setName(name);
                await interaction.reply({ content: `Đã thay đổi tên của role thành ${name}.`, ephemeral: true });
            } else if (subcommand === 'icon') {
                if (!customRole.permissions.editIcon) {
                    return interaction.reply({ content: 'Bạn không có quyền thay đổi icon của role này.', ephemeral: true });
                }
                const icon = interaction.options.getAttachment('icon');
                await role.setIcon(icon.url);
                await interaction.reply({ content: `Đã thay đổi icon của role ${role.name}.`, ephemeral: true });
            } else if (subcommand === 'removeicon') {
                if (!customRole.permissions.editIcon) {
                    return interaction.reply({ content: 'Bạn không có quyền thay đổi icon của role này.', ephemeral: true });
                }
                await role.setIcon(null);
                await interaction.reply({ content: `Đã xóa icon của role ${role.name}.`, ephemeral: true });
            } else if (subcommand === 'mentionable') {
                if (!customRole.permissions.mentionable) {
                    return interaction.reply({ content: 'Bạn không có quyền thay đổi việc có thể nhắc đến của role này.', ephemeral: true });
                }
                const mentionable = interaction.options.getBoolean('action');
                await role.setMentionable(mentionable);
                await interaction.reply({ content: `Đã thay đổi việc có thể nhắc đến của role ${role.name} thành ${mentionable}.`, ephemeral: true });
            }
        } else if (group === 'admin') {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: 'Bạn không có quyền sử dụng lệnh này.', ephemeral: true });
            }

            if (subcommand === 'create') {
                const aboveRole = interaction.options.getRole('above_role');
                const author = interaction.options.getUser('author');
                const name = interaction.options.getString('name');
                const maxUsers = interaction.options.getInteger('max_users');
                const expireAfter = interaction.options.getString('expire_after');
                const color = interaction.options.getString('color');
                const editNamePermission = interaction.options.getBoolean('edit_name_permission') ?? false;
                const editIconPermission = interaction.options.getBoolean('edit_icon_permission') ?? false;
                const editColorPermission = interaction.options.getBoolean('edit_color_permission') ?? false;
                const manageRoleMembersPermission = interaction.options.getBoolean('manage_role_members_permission') ?? false;
                const makeRoleMentionablePermission = interaction.options.getBoolean('make_role_mentionable_permission') ?? false;

                let expiresAt = null;
                if (expireAfter !== '0') {
                    const expireMilliseconds = parseDuration(expireAfter);
                    if (expireMilliseconds > 0) {
                        expiresAt = new Date(Date.now() + expireMilliseconds);
                    }
                }

                const roleOptions = {
                    name,
                    position: aboveRole.position - 1,
                };
                if (color) {
                    roleOptions.color = color;
                }
                const newRole = await interaction.guild.roles.create(roleOptions);

                const customRole = new CustomRole({
                    roleId: newRole.id,
                    guildId: interaction.guild.id,
                    authorId: author.id,
                    maxUsers,
                    expiresAt,
                    permissions: {
                        editName: editNamePermission,
                        editIcon: editIconPermission,
                        editColor: editColorPermission,
                        manageMembers: manageRoleMembersPermission,
                        mentionable: makeRoleMentionablePermission,
                    },
                });

                await customRole.save();

                await interaction.reply({ content: `Đã tạo role tùy chỉnh ${newRole.name} cho ${author.toString()}.`, ephemeral: true });
            } else if (subcommand === 'terminate') {
                const user = interaction.options.getUser('user');
                const deleteRole = interaction.options.getBoolean('delete_role') ?? false;

                const customRole = await CustomRole.findOne({ authorId: user.id, guildId: interaction.guild.id });

                if (!customRole) {
                    return interaction.reply({ content: 'Người dùng này không sở hữu role tùy chỉnh nào.', ephemeral: true });
                }

                if (deleteRole) {
                    const role = await interaction.guild.roles.fetch(customRole.roleId);
                    if (role) {
                        await role.delete();
                    }
                }

                await CustomRole.deleteOne({ _id: customRole._id });

                await interaction.reply({ content: `Đã ngừng role tùy chỉnh của ${user.toString()}.`, ephemeral: true });
            } else if (subcommand === 'migrate') {
                const role = interaction.options.getRole('role');
                const author = interaction.options.getUser('author');
                const maxUsers = interaction.options.getInteger('max_users');
                const expireAfter = interaction.options.getString('expire_after');

                let expiresAt = null;
                if (expireAfter !== '0') {
                    const expireMilliseconds = parseDuration(expireAfter);
                    if (expireMilliseconds > 0) {
                        expiresAt = new Date(Date.now() + expireMilliseconds);
                    }
                }

                const customRole = new CustomRole({
                    roleId: role.id,
                    guildId: interaction.guild.id,
                    authorId: author.id,
                    maxUsers,
                    expiresAt,
                });

                await customRole.save();

                await interaction.reply({ content: `Đã chuyển role ${role.name} thành role tùy chỉnh cho ${author.toString()}.`, ephemeral: true });
            } else if (subcommand === 'on_expire') {
                const action = interaction.options.getString('action');
                await CustomRoleSettings.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { onExpireAction: action },
                    { upsert: true }
                );

                await interaction.reply({ content: `Đã đặt hành động khi hết hạn thành: ${action}.`, ephemeral: true });
            } else if (subcommand === 'edit_permission') {
                const role = interaction.options.getRole('role');
                const customRole = await CustomRole.findOne({ roleId: role.id, guildId: interaction.guild.id });

                if (!customRole) {
                    return interaction.reply({ content: 'Role này không phải là role tùy chỉnh.', ephemeral: true });
                }

                customRole.permissions.editName = interaction.options.getBoolean('edit_name') ?? customRole.permissions.editName;
                customRole.permissions.editIcon = interaction.options.getBoolean('edit_icon') ?? customRole.permissions.editIcon;
                customRole.permissions.editColor = interaction.options.getBoolean('edit_color') ?? customRole.permissions.editColor;
                customRole.permissions.manageMembers = interaction.options.getBoolean('manage_role_members') ?? customRole.permissions.manageMembers;
                customRole.permissions.mentionable = interaction.options.getBoolean('make_role_mentionable') ?? customRole.permissions.mentionable;

                await customRole.save();
                await interaction.reply({ content: `Đã cập nhật quyền cho role ${role.name}.`, ephemeral: true });
            } else if (subcommand === 'max_users') {
                const role = interaction.options.getRole('role');
                const users = interaction.options.getInteger('users');
                await CustomRole.updateOne({ roleId: role.id, guildId: interaction.guild.id }, { maxUsers: users });
                await interaction.reply({ content: `Đã cập nhật số người dùng tối đa cho role ${role.name} thành ${users}.`, ephemeral: true });
            } else if (subcommand === 'default_author_permission') {
                const editName = interaction.options.getBoolean('edit_name') ?? false;
                const editIcon = interaction.options.getBoolean('edit_icon') ?? false;
                const editColor = interaction.options.getBoolean('edit_color') ?? false;
                const manageMembers = interaction.options.getBoolean('manage_role_members') ?? false;
                const mentionable = interaction.options.getBoolean('make_role_mentionable') ?? false;

                await CustomRoleSettings.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    {
                        defaultPermissions: {
                            editName,
                            editIcon,
                            editColor,
                            manageMembers,
                            mentionable,
                        }
                    },
                    { upsert: true }
                );

                await interaction.reply({ content: 'Đã cập nhật quyền mặc định cho role tùy chỉnh.', ephemeral: true });
            } else if (subcommand === 'extend') {
                const role = interaction.options.getRole('role');
                const timeRange = interaction.options.getString('time_range');
                const customRole = await CustomRole.findOne({ roleId: role.id, guildId: interaction.guild.id });

                if (!customRole) {
                    return interaction.reply({ content: 'Role này không phải là role tùy chỉnh.', ephemeral: true });
                }

                if (timeRange === '0') {
                    customRole.expiresAt = null;
                } else {
                    const extendMilliseconds = parseDuration(timeRange);
                    if (extendMilliseconds > 0) {
                        customRole.expiresAt = new Date(customRole.expiresAt.getTime() + extendMilliseconds);
                    }
                }

                await customRole.save();
                await interaction.reply({ content: `Đã gia hạn role ${role.name}.`, ephemeral: true });
            } else if (subcommand === 'reduce') {
                const role = interaction.options.getRole('role');
                const timeRange = interaction.options.getString('time_range');
                const customRole = await CustomRole.findOne({ roleId: role.id, guildId: interaction.guild.id });

                if (!customRole) {
                    return interaction.reply({ content: 'Role này không phải là role tùy chỉnh.', ephemeral: true });
                }

                const reduceMilliseconds = parseDuration(timeRange);
                if (reduceMilliseconds > 0) {
                    customRole.expiresAt = new Date(customRole.expiresAt.getTime() - reduceMilliseconds);
                }

                await customRole.save();
                await interaction.reply({ content: `Đã giảm thời gian của role ${role.name}.`, ephemeral: true });
            } else {
                await interaction.reply({ content: 'Lệnh đang được phát triển.', ephemeral: true });
            }
        }
    }
};

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

    return totalMilliseconds;
}

