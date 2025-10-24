const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Invite = require('../../../models/inviteSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Kiểm tra và quản lý lời mời')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Kiểm tra xem người dùng có bao nhiêu lời mời')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng để kiểm tra lời mời')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Thêm lời mời cho người dùng')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng để thêm lời mời')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Số lượng lời mời để thêm')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Xóa lời mời của người dùng')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng để xóa lời mời')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Số lượng lời mời để xóa')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Đặt lại lời mời của người dùng về 0')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng để đặt lại lời mời')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset-all')
                .setDescription('Đặt lại tất cả lời mời trong máy chủ về 0')
                .addStringOption(option =>
                    option.setName('confirm')
                        .setDescription('Nhập "confirm" để đặt lại tất cả lời mời')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    category: 'Utility',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guild.id;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand !== 'user' && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply({ content: 'Bạn cần quyền Quản trị viên để sử dụng lệnh này.', ephemeral: true });
        }

        if (subcommand === 'user') {
            const user = interaction.options.getUser('user') || interaction.user;

            try {
                const userInvites = await Invite.find({ guildID: guildId, inviterID: user.id });
                const inviteCount = userInvites.reduce((acc, invite) => acc + invite.uses, 0);

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`Thống kê lời mời của ${user.tag}`)
                    .setDescription(`<@${user.id}> có ${inviteCount} lời mời.`)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                console.error('Lỗi khi lấy dữ liệu lời mời:', error);
                return interaction.editReply({ content: 'Đã có lỗi xảy ra khi lấy dữ liệu lời mời.', ephemeral: true });
            }
        }

        if (subcommand === 'reset-all') {
            const confirmation = interaction.options.getString('confirm');
            
            if (confirmation.toLowerCase() !== 'confirm') {
                return interaction.editReply({ 
                    content: 'Bạn phải nhập "confirm" để đặt lại tất cả lời mời trong máy chủ.',
                    ephemeral: true 
                });
            }

            try {
                const result = await Invite.updateMany(
                    { guildID: guildId },
                    { $set: { uses: 0 } }
                );

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Đặt lại lời mời của máy chủ')
                    .setDescription(`Đã đặt lại thành công lời mời cho ${result.modifiedCount} người dùng.`)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                console.error('Lỗi khi đặt lại tất cả lời mời:', error);
                return interaction.editReply({ 
                    content: 'Đã có lỗi xảy ra khi đặt lại tất cả lời mời.',
                    ephemeral: true 
                });
            }
        }

        const targetUser = interaction.options.getUser('user');
        
        try {
            let userInvite = await Invite.findOne({ guildID: guildId, inviterID: targetUser.id });
            const amount = interaction.options.getInteger('amount');
            let message = '';

            // This logic is flawed if a user has multiple invite links.
            // It will only modify the first one found. A better solution would be a dedicated 'bonus' field.
            if (!userInvite) {
                userInvite = new Invite({
                    inviteCode: `ADMIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    guildID: guildId,
                    inviterID: targetUser.id,
                    uses: 0
                });
            }

            switch (subcommand) {
                case 'add':
                    userInvite.uses += amount;
                    message = `Đã thêm ${amount} lời mời cho ${targetUser.tag}`;
                    break;

                case 'remove':
                    const removeAmount = Math.min(amount, userInvite.uses);
                    userInvite.uses = Math.max(0, userInvite.uses - removeAmount);
                    message = `Đã xóa ${removeAmount} lời mời từ ${targetUser.tag}`;
                    break;

                case 'reset':
                    userInvite.uses = 0;
                    message = `Đặt lại lời mời cho ${targetUser.tag}`;
                    break;
            }

            await userInvite.save();

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Quản lý lời mời')
                .setDescription(message)
                .addFields({ name: 'Lời mời hiện tại', value: userInvite.uses.toString() })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Lỗi khi quản lý lời mời:', error);
            return interaction.editReply({ content: 'Đã có lỗi xảy ra khi quản lý lời mời.', ephemeral: true });
        }
    }
};
