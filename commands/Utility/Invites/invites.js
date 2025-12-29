const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Invite = require('../../../models/inviteSchema');

// Map để lưu cooldown
const cooldowns = new Map();

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
    cooldown: 5, // Cooldown 5 giây
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        
        // Kiểm tra cooldown (chỉ áp dụng cho admin commands)
        if (subcommand !== 'user') {
            const cooldownKey = `${userId}-${subcommand}`;
            const now = Date.now();
            const cooldownAmount = (this.cooldown || 3) * 1000;

            if (cooldowns.has(cooldownKey)) {
                const expirationTime = cooldowns.get(cooldownKey) + cooldownAmount;

                if (now < expirationTime) {
                    const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
                    
                    const cooldownEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('⏱️ Vui lòng chờ!')
                        .setDescription(`Bạn cần chờ **${timeLeft}** giây trước khi sử dụng lệnh này tiếp.`)
                        .setTimestamp();

                    return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
                }
            }

            cooldowns.set(cooldownKey, now);
            setTimeout(() => cooldowns.delete(cooldownKey), cooldownAmount);
        }

        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guild.id;

        // Kiểm tra quyền admin cho các lệnh không phải 'user'
        if (subcommand !== 'user' && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Không có quyền')
                .setDescription('Bạn cần quyền **Quản trị viên** để sử dụng lệnh này.')
                .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.editReply({ embeds: [noPermEmbed] });
        }

        // Lệnh kiểm tra invite của user
        if (subcommand === 'user') {
            const user = interaction.options.getUser('user') || interaction.user;

            try {
                const userInvites = await Invite.find({ guildID: guildId, inviterID: user.id });
                const inviteCount = userInvites.reduce((acc, invite) => acc + invite.uses, 0);
                const totalInvites = userInvites.length;

                const userEmbed = new EmbedBuilder()
                    .setColor('#00ff88')
                    .setTitle('📊 Thống kê lời mời')
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setDescription(`**Người dùng:** ${user}\n**Tag:** ${user.tag}`)
                    .addFields(
                        { name: '🎯 Tổng lời mời', value: `\`${inviteCount}\``, inline: true },
                        { name: '🔗 Số link mời', value: `\`${totalInvites}\``, inline: true },
                        { name: '📅 ID', value: `\`${user.id}\``, inline: true }
                    )
                    .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp();

                return interaction.editReply({ embeds: [userEmbed] });
            } catch (error) {
                console.error('Lỗi khi lấy dữ liệu lời mời:', error);
                
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Lỗi')
                    .setDescription('Đã có lỗi xảy ra khi lấy dữ liệu lời mời.')
                    .setTimestamp();

                return interaction.editReply({ embeds: [errorEmbed] });
            }
        }

        // Lệnh reset tất cả
        if (subcommand === 'reset-all') {
            const confirmation = interaction.options.getString('confirm');
            
            if (confirmation.toLowerCase() !== 'confirm') {
                const confirmEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚠️ Xác nhận cần thiết')
                    .setDescription('Bạn phải nhập `confirm` để đặt lại tất cả lời mời trong máy chủ.')
                    .addFields({ name: '💡 Lưu ý', value: 'Hành động này không thể hoàn tác!' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [confirmEmbed] });
            }

            try {
                const result = await Invite.updateMany(
                    { guildID: guildId },
                    { $set: { uses: 0 } }
                );

                const resetAllEmbed = new EmbedBuilder()
                    .setColor('#00ff88')
                    .setTitle('✅ Đặt lại thành công')
                    .setDescription('Đã đặt lại tất cả lời mời trong máy chủ về 0.')
                    .addFields(
                        { name: '📊 Số người bị ảnh hưởng', value: `\`${result.modifiedCount}\` người dùng`, inline: true },
                        { name: '👤 Thực hiện bởi', value: `${interaction.user}`, inline: true }
                    )
                    .setFooter({ text: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();

                return interaction.editReply({ embeds: [resetAllEmbed] });
            } catch (error) {
                console.error('Lỗi khi đặt lại tất cả lời mời:', error);
                
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Lỗi')
                    .setDescription('Đã có lỗi xảy ra khi đặt lại tất cả lời mời.')
                    .setTimestamp();

                return interaction.editReply({ embeds: [errorEmbed] });
            }
        }

        // Các lệnh add, remove, reset cho user cụ thể
        const targetUser = interaction.options.getUser('user');
        
        try {
            let userInvite = await Invite.findOne({ guildID: guildId, inviterID: targetUser.id });
            const amount = interaction.options.getInteger('amount');
            let actionMessage = '';
            let actionEmoji = '';
            let actionColor = '#00ff88';

            if (!userInvite) {
                userInvite = await Invite.create({
                    inviteCode: `ADMIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    guildID: guildId,
                    inviterID: targetUser.id,
                    uses: 0
                });
            }

            const oldUses = userInvite.uses;

            switch (subcommand) {
                case 'add':
                    userInvite.uses += amount;
                    actionMessage = `Đã thêm **${amount}** lời mời`;
                    actionEmoji = '➕';
                    actionColor = '#00ff88';
                    break;

                case 'remove':
                    const removeAmount = Math.min(amount, userInvite.uses);
                    userInvite.uses = Math.max(0, userInvite.uses - removeAmount);
                    actionMessage = `Đã xóa **${removeAmount}** lời mời`;
                    actionEmoji = '➖';
                    actionColor = '#ff8800';
                    break;

                case 'reset':
                    userInvite.uses = 0;
                    actionMessage = 'Đã đặt lại lời mời về **0**';
                    actionEmoji = '🔄';
                    actionColor = '#ffaa00';
                    break;
            }

            await userInvite.save();

            const manageEmbed = new EmbedBuilder()
                .setColor(actionColor)
                .setTitle(`${actionEmoji} Quản lý lời mời`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setDescription(`${actionMessage} cho ${targetUser}`)
                .addFields(
                    { name: '📉 Trước đó', value: `\`${oldUses}\` lời mời`, inline: true },
                    { name: '📈 Hiện tại', value: `\`${userInvite.uses}\` lời mời`, inline: true },
                    { name: '👤 Quản trị viên', value: `${interaction.user}`, inline: true }
                )
                .setFooter({ text: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            return interaction.editReply({ embeds: [manageEmbed] });
        } catch (error) {
            console.error('Lỗi khi quản lý lời mời:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi')
                .setDescription('Đã có lỗi xảy ra khi quản lý lời mời.')
                .addFields({ name: '🔍 Chi tiết', value: `\`${error.message}\`` })
                .setTimestamp();

            return interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};