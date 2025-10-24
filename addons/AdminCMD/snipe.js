
const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configLoader');
const config = getConfig();

const allowedRoles = ["1388890272766623784", "1388890276382380183"];

module.exports = {
    name: 'snipe',
    description: 'Xem tin nhắn đã bị xóa gần đây nhất trong kênh.',
    async run(client, message, args) {
        const member = message.member;
        if (!member.roles.cache.some(role => allowedRoles.includes(role.id))) {
            return message.reply("Bạn không có quyền sử dụng lệnh này.");
        }

        const guildSnipes = client.snipes.get(message.guild.id);
        if (!guildSnipes) {
            return message.reply({ content: "Không có tin nhắn nào để snipe.", ephemeral: true });
        }

        const snipe = guildSnipes.get(message.channel.id);
        if (!snipe) {
            return message.reply({ content: "Không có tin nhắn nào để snipe trong kênh này.", ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.EmbedColors.Info)
            .setAuthor({ name: snipe.author, iconURL: snipe.member.displayAvatarURL() })
            .setDescription(snipe.content)
            .setTimestamp(snipe.timestamp);

        message.author.send({ embeds: [embed] });
        message.reply({ content: "Đã gửi tin nhắn snipe vào tin nhắn riêng của bạn.", ephemeral: true });
    }
};
