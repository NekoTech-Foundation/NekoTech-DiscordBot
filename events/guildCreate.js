const { EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getConfig } = require('../utils/configLoader');

module.exports = async (client, guild) => {
    const config = getConfig();
    const channel = guild.channels.cache.find(channel =>
        channel.type === ChannelType.GuildText &&
        channel.permissionsFor(guild.members.me).has('SendMessages')
    );

    if (channel) {
        const embed = new EmbedBuilder()
            .setTitle(`🎉 Cảm ơn bạn đã mời ${client.user.username}!`)
            .setDescription(`Chào mừng đến với **${client.user.username}**! Chúng tôi rất vui khi được đồng hành cùng máy chủ **${guild.name}**.`)
            .addFields(
                {
                    name: '🚀 Bắt đầu ngay',
                    value: '> Hãy sử dụng lệnh `/help` để khám phá toàn bộ tính năng của bot. Đừng quên thiết lập quyền hạn phù hợp cho bot nhé!'
                },
                {
                    name: '💡 Tính năng nổi bật',
                    value: '> 🛠️ **Quản lý máy chủ** chuyên nghiệp\n> 💰 **Hệ thống kinh tế** thú vị\n> 🎵 **Nghe nhạc** chất lượng cao\n> 🎁 **Giveaway** và sự kiện tự động'
                },
                {
                    name: '📞 Hỗ trợ & Cộng đồng',
                    value: `> Nếu bạn gặp khó khăn, hãy tham gia [Support Server](${config.MusicBot.Settings.SupportServer}) của chúng tôi để được giải đáp.`
                }
            )
            .setImage('https://i.imgur.com/9t4j16h.png') // Banner chào mừng (có thể thay đổi)
            .setThumbnail(client.user.displayAvatarURL())
            .setColor(config.EmbedColors.Default)
            .setFooter({
                text: 'Make with ❤️ by NekoTech Foundations',
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Hỗ trợ')
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('🆘')
                    .setURL(config.MusicBot.Settings.SupportServer),
                new ButtonBuilder()
                    .setLabel('Website')
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('🌐')
                    .setURL(config.MusicBot.Settings.Website || 'https://nekocomics.xyz'),
                new ButtonBuilder()
                    .setLabel('Bình chọn')
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('⭐')
                    .setURL(`https://top.gg/bot/${client.user.id}/vote`) // Link vote giả định, có thể update sau
            );

        try {
            await channel.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error(`Could not send welcome message to guild ${guild.name}:`, error);
        }
    }
};