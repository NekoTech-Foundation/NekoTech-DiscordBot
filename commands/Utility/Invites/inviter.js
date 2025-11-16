const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const Invite = require('../../../models/inviteSchema');

// Map để lưu cooldown
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inviter')
        .setDescription('Hiển thị người đã mời một người dùng cụ thể')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng để kiểm tra người mời')
                .setRequired(false)),
    category: 'Utility',
    cooldown: 3, // Cooldown 3 giây
    async execute(interaction) {
        const userId = interaction.user.id;
        const cooldownKey = `${userId}-inviter`;
        const now = Date.now();
        const cooldownAmount = (this.cooldown || 3) * 1000;

        // Kiểm tra cooldown
        if (cooldowns.has(cooldownKey)) {
            const expirationTime = cooldowns.get(cooldownKey) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
                
                const cooldownEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('⏱️ Vui lòng chờ!')
                    .setDescription(`Bạn cần chờ **${timeLeft}** giây trước khi sử dụng lệnh này tiếp.`)
                    .setFooter({ text: 'Cooldown System' })
                    .setTimestamp();

                return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
            }
        }

        cooldowns.set(cooldownKey, now);
        setTimeout(() => cooldowns.delete(cooldownKey), cooldownAmount);

        await interaction.deferReply({ ephemeral: true });

        const user = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;

        try {
            const inviteData = await Invite.findOne({ guildID: guildId, 'joinedUsers.userID': user.id });

            if (!inviteData) {
                const notFoundEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('🔍 Không tìm thấy')
                    .setDescription(`Không thể tìm thấy người mời cho ${user}.`)
                    .addFields(
                        { name: '💡 Lý do có thể', value: '• Người dùng tham gia trước khi bot được thêm\n• Người dùng tham gia qua vanity URL\n• Dữ liệu chưa được ghi nhận' }
                    )
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp();

                return interaction.editReply({ embeds: [notFoundEmbed] });
            }

            const inviter = await interaction.client.users.fetch(inviteData.inviterID);
            
            // Lấy thông tin member để có join date
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            const joinedAt = member ? member.joinedAt : null;

            // Tính số người inviter đã mời
            const inviterInvites = await Invite.find({ guildID: guildId, inviterID: inviter.id });
            const totalInvites = inviterInvites.reduce((acc, inv) => acc + inv.uses, 0);

            const inviterEmbed = new EmbedBuilder()
                .setColor('#00aaff')
                .setTitle('🎫 Thông tin người mời')
                .setDescription(`${user} được mời bởi ${inviter}`)
                .addFields(
                    { name: '👤 Người được mời', value: `${user}\n\`${user.tag}\``, inline: true },
                    { name: '👥 Người mời', value: `${inviter}\n\`${inviter.tag}\``, inline: true },
                    { name: '📊 Tổng invite của người mời', value: `\`${totalInvites}\` lời mời`, inline: true }
                )
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setImage(inviter.displayAvatarURL({ dynamic: true, size: 256 }))
                .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            if (joinedAt) {
                inviterEmbed.addFields({
                    name: '📅 Ngày tham gia',
                    value: `<t:${Math.floor(joinedAt.getTime() / 1000)}:F>\n(<t:${Math.floor(joinedAt.getTime() / 1000)}:R>)`,
                    inline: false
                });
            }

            return interaction.editReply({ embeds: [inviterEmbed] });
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu người mời:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi')
                .setDescription('Đã có lỗi xảy ra khi lấy dữ liệu người mời.')
                .addFields({ 
                    name: '🔍 Chi tiết lỗi', 
                    value: `\`\`\`${error.message}\`\`\`` 
                })
                .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};