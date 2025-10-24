const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Kiểm tra độ trễ của NekoBuckets.'),
    category: 'General',
    async execute(interaction) {
        // The initial reply is not needed as we will just send the final message.
        await interaction.deferReply();

        const botPing = Math.round(interaction.client.ws.ping);

        const response = `:small_red_triangle: | ( Shard ${interaction.guild.shardId}) phản hồi trong (${botPing} ms / trung bình: ${botPing} ms).
        | Để xem các lệnh có sẵn, sử dụng /help. Để xem các thông tin khác, sử dụng /botinfo`;

        await interaction.editReply({ content: response });
    }
};
