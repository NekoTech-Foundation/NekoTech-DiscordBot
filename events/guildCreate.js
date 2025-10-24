const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = async (client, guild) => {
    const channel = guild.channels.cache.find(channel => channel.type === ChannelType.GuildText && channel.permissionsFor(guild.members.me).has('SendMessages'));

    if (channel) {
        const embed = new EmbedBuilder()
            .setTitle('Cảm ơn bạn đã tin tưởng và sử dụng bot Discord của NekoTech Foundations!')
            .setDescription('Hãy bắt đầu từ các bước đầu tiên nhé:\n1. Bạn hãy tạo hoặc thêm bot vào vai trò [bot]với quyền hạn "Administrator/Người Quản Lý" của máy chủ Bạn\nCác Tính năng cơ bản,bạn hãy sử dụng lệnh /help và click vào các phần mục để xem chi tiết.')
            .setFooter({ text: 'Để xem các thông tin về bot, bot đang down hay hoạt động, đọc truyện tranh miễn phí và không quảng cáo, sử dụng các dịch vụ chúng mình sắp triển khai, bạn hãy tham gia máy chủ discord https://dsc.gg/nekocomics' })
            .setColor('#0099ff');

        try {
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(`Could not send welcome message to guild ${guild.name}:`, error);
        }
    }
};