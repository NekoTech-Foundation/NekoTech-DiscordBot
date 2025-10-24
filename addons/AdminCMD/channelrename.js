
const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configLoader');
const config = getConfig();

const allowedRoles = ["1388890272766623784", "1388890276382380183"];

module.exports = {
    name: 'channelrename',
    description: 'Đổi tên một kênh chat.',
    async run(client, message, args) {
        const member = message.member;
        if (!member.roles.cache.some(role => allowedRoles.includes(role.id))) {
            return message.reply("Bạn không có quyền sử dụng lệnh này.");
        }

        const channelId = args[0];
        if (!channelId) {
            return message.reply("Vui lòng cung cấp ID kênh để đổi tên.");
        }

        const newName = args.slice(1).join(" ");
        if (!newName) {
            return message.reply("Vui lòng cung cấp tên mới cho kênh.");
        }

        const channel = message.guild.channels.cache.get(channelId);
        if (!channel) {
            return message.reply("Không tìm thấy kênh với ID đã cho.");
        }

        try {
            await channel.setName(newName);

            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Success)
                .setTitle("Kênh đã được đổi tên")
                .setDescription(`Đã đổi tên kênh thành ${channel}.`)
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Error)
                .setTitle("Lỗi")
                .setDescription(`Không thể đổi tên kênh.`)
                .setTimestamp();
            message.reply({ embeds: [embed] });
        }
    }
};
