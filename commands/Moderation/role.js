const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, MessageFlags } = require('discord.js');
const fs = require('fs');
const yaml = require("js-yaml");
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('🎭 Quản lý vai trò')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Hành động để thực hiện: thêm hoặc xóa')
                .setRequired(true)
                .addChoices(
                    { name: 'thêm', value: 'add' },
                    { name: 'xóa', value: 'remove' }
                ))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Vai trò để quản lý')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng để thêm/xóa vai trò')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('all')
                .setDescription('Áp dụng cho tất cả người dùng? (Bỏ qua tham số người dùng nếu được đặt thành true)')
                .setRequired(false)),
    category: 'Moderation',
    async execute(interaction) {
        try {
            const action = interaction.options.getString('action');
            const role = interaction.options.getRole('role');
            const user = interaction.options.getUser('user');
            const applyToAll = interaction.options.getBoolean('all') ?? false;
            const member = interaction.member;

            const requiredRoles = applyToAll
                ? config.ModerationRoles.roleall
                : config.ModerationRoles.addrole;

            const hasModeratorRole = requiredRoles.some(roleId => member.roles.cache.has(roleId));
            const isAdministrator = member.permissions.has(PermissionsBitField.Flags.Administrator);

            if (!hasModeratorRole && !isAdministrator) {
                await interaction.reply({ content: 'Bạn không có quyền sử dụng lệnh này.', flags: MessageFlags.Ephemeral });
                return;
            }

            const botHighestRole = interaction.guild.members.resolve(interaction.client.user.id).roles.highest.position;
            const userHighestRole = member.roles.highest.position;
            const rolePosition = role.position;

            if (rolePosition >= botHighestRole) {
                await interaction.reply({ content: 'Tôi không thể quản lý vai trò này vì nó cao hơn hoặc bằng vai trò cao nhất của tôi.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (rolePosition >= userHighestRole) {
                await interaction.reply({ content: 'Bạn không thể quản lý vai trò cao hơn hoặc bằng vai trò cao nhất của bạn.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (!applyToAll) {
                if (!user) {
                    await interaction.reply({ content: 'Vui lòng chỉ định một người dùng hoặc đặt "all" thành true.', flags: MessageFlags.Ephemeral });
                    return;
                }

                if (user.id === interaction.user.id) {
                    await interaction.reply({ content: 'Bạn không thể tự thêm hoặc xóa vai trò cho chính mình.', flags: MessageFlags.Ephemeral });
                    return;
                }

                const targetMember = await interaction.guild.members.fetch(user.id);
                const hasRole = targetMember.roles.cache.has(role.id);

                if (action === 'add' && hasRole) {
                    await interaction.reply({ content: 'Người dùng đã có vai trò này.', flags: MessageFlags.Ephemeral });
                    return;
                }

                try {
                    if (action === 'add') {
                        await targetMember.roles.add(role);
                        await interaction.reply({
                            content: `Đã thêm thành công vai trò ${role.toString()} cho ${user.toString()}`,
                            flags: MessageFlags.Ephemeral
                        });
                    } else {
                        await targetMember.roles.remove(role);
                        await interaction.reply({
                            content: `Đã xóa thành công vai trò ${role.toString()} khỏi ${user.toString()}`,
                            flags: MessageFlags.Ephemeral
                        });
                    }
                } catch (error) {
                    console.error(error);
                    await interaction.reply({ content: 'Đã xảy ra lỗi khi quản lý vai trò.', flags: MessageFlags.Ephemeral });
                }
                return;
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm')
                        .setLabel('Xác nhận')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('cancel')
                        .setLabel('Hủy')
                        .setStyle(ButtonStyle.Danger)
                );

            const confirmationMessage = action === 'add'
                ? `Bạn có chắc chắn muốn thêm vai trò ${role.toString()} cho tất cả người dùng không?`
                : `Bạn có chắc chắn muốn xóa vai trò ${role.toString()} khỏi tất cả người dùng không?`;

            await interaction.reply({ content: confirmationMessage, components: [row], flags: MessageFlags.Ephemeral });

            const filter = i => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

            collector.on('collect', async (i) => {
                if (i.customId === 'confirm') {
                    let cancelRequested = false;
                    const cancelRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('cancel')
                                .setLabel('Hủy')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await i.update({ content: 'Đang xử lý... vui lòng đợi.', components: [cancelRow], flags: MessageFlags.Ephemeral });

                    const members = await interaction.guild.members.fetch();
                    const totalMembers = members.size;
                    let processedMembers = 0;

                    for (const member of members.values()) {
                        if (cancelRequested) break;
                        if (!member.user.bot) {
                            const hasRole = member.roles.cache.has(role.id);
                            if ((action === 'add' && !hasRole) || (action === 'remove' && hasRole)) {
                                try {
                                    if (action === 'add') {
                                        await member.roles.add(role);
                                    } else {
                                        await member.roles.remove(role);
                                    }
                                } catch (error) {
                                    console.error(`Lỗi xử lý thành viên ${member.id}: ${error}`);
                                }
                            }
                            processedMembers++;
                            if (processedMembers % 15 === 0) {
                                await interaction.editReply({
                                    content: `Tiến trình: ${processedMembers}/${totalMembers} thành viên đã được xử lý.`,
                                    components: [cancelRow],
                                    flags: MessageFlags.Ephemeral
                                });
                            }
                            await new Promise(resolve => setTimeout(resolve, 50));
                        }
                    }

                    const successMessage = action === 'add'
                        ? `Đã thêm thành công vai trò ${role.toString()} cho tất cả người dùng.`
                        : `Đã xóa thành công vai trò ${role.toString()} khỏi tất cả người dùng.`;

                    await interaction.editReply({ content: successMessage, components: [], flags: MessageFlags.Ephemeral });
                } else {
                    await i.update({ content: 'Đã hủy hành động.', components: [], flags: MessageFlags.Ephemeral });
                }
            });

            collector.on('end', async (collected) => {
                if (!collected.size) {
                    await interaction.editReply({ content: 'Đã hết thời gian.', components: [], flags: MessageFlags.Ephemeral });
                }
            });

        } catch (error) {
            console.error(`Lỗi trong lệnh quản lý vai trò: ${error}`);
            await interaction.reply({ content: 'Đã xảy ra lỗi khi xử lý yêu cầu của bạn.', flags: MessageFlags.Ephemeral });
        }
    }
};