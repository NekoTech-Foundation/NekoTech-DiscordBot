const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const Invite = require('../../../models/inviteSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inviter')
        .setDescription('Hiển thị người đã mời một người dùng cụ thể')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng để kiểm tra người mời')
                .setRequired(false)),
    category: 'Utility',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const user = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;

        try {
            const inviteData = await Invite.findOne({ guildID: guildId, 'joinedUsers.userID': user.id });

            if (!inviteData) {
                return interaction.editReply({ content: 'Không thể tìm thấy người mời cho người dùng này.', ephemeral: true });
            }

            const inviter = await interaction.client.users.fetch(inviteData.inviterID);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Thông tin người mời')
                .setDescription(`${user.tag} được mời bởi ${inviter.tag}.`)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu người mời:', error);
            return interaction.editReply({ content: 'Đã có lỗi xảy ra khi lấy dữ liệu người mời.', ephemeral: true });
        }
    }
};
