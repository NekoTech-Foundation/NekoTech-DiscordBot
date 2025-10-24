
const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configLoader');
const config = getConfig();

const allowedRoles = ["1388890272766623784", "1388890276382380183"];

module.exports = {
    name: 'channeldelete',
    description: 'Xóa và tạo lại một kênh chat.',
    async run(client, message, args) {
        const member = message.member;
        if (!member.roles.cache.some(role => allowedRoles.includes(role.id))) {
            return message.reply("Bạn không có quyền sử dụng lệnh này.");
        }

        const channelId = args[0];
        if (!channelId) {
            return message.reply("Vui lòng cung cấp ID kênh để xóa.");
        }

        const channel = message.guild.channels.cache.get(channelId);
        if (!channel) {
            return message.reply("Không tìm thấy kênh với ID đã cho.");
        }

        try {
            const channelName = channel.name;
            const channelParent = channel.parent;
            const channelPosition = channel.position;
            const channelPermissions = channel.permissionOverwrites.cache;

            await channel.delete();

            const newChannel = await message.guild.channels.create({
                name: channelName,
                type: channel.type,
                parent: channelParent,
                position: channelPosition,
                permissionOverwrites: channelPermissions
            });

            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Success)
                .setTitle("Kênh đã được tạo lại")
                .setDescription(`Đã xóa và tạo lại kênh ${newChannel}.`)
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Error)
                .setTitle("Lỗi")
                .setDescription(`Không thể tạo lại kênh.`)
                .setTimestamp();
            message.reply({ embeds: [embed] });
        }
    }
};
