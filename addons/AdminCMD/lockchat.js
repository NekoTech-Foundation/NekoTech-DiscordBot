
const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getConfig } = require('../../utils/configLoader');
const config = getConfig();

const allowedRoles = ["1388890272766623784", "1388890276382380183"];

module.exports = {
    name: 'lockchat',
    description: 'Khóa một kênh chat.',
    async run(client, message, args) {
        const member = message.member;
        if (!member.roles.cache.some(role => allowedRoles.includes(role.id))) {
            return message.reply("Bạn không có quyền sử dụng lệnh này.");
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: false
            });

            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Success)
                .setTitle("Kênh đã được khóa")
                .setDescription(`Đã khóa kênh ${channel}.`)
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Error)
                .setTitle("Lỗi")
                .setDescription(`Không thể khóa kênh ${channel}.`)
                .setTimestamp();
            message.reply({ embeds: [embed] });
        }
    }
};
