
const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configLoader');
const config = getConfig();

const allowedRoles = ["1388890272766623784", "1388890276382380183"];

module.exports = {
    name: 'ban',
    description: 'Cấm người dùng khỏi máy chủ.',
    async run(client, message, args) {
        const member = message.member;
        if (!member.roles.cache.some(role => allowedRoles.includes(role.id))) {
            return message.reply("Bạn không có quyền sử dụng lệnh này.");
        }

        const userId = args[0];
        if (!userId) {
            return message.reply("Vui lòng cung cấp ID người dùng để cấm.");
        }

        const reason = args.slice(1).join(" ") || "Không có lý do được cung cấp.";

        try {
            const userToBan = await client.users.fetch(userId);
            await message.guild.members.ban(userToBan, { reason: reason });

            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Success)
                .setTitle("Cấm thành công")
                .setDescription(`Đã cấm ${userToBan.tag} khỏi máy chủ.`)
                .addFields({ name: "Lý do", value: reason })
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor(config.EmbedColors.Error)
                .setTitle("Lỗi")
                .setDescription(`Không thể cấm người dùng có ID ${userId}. Vui lòng kiểm tra lại ID và đảm bảo tôi có quyền để cấm.`)
                .setTimestamp();
            message.reply({ embeds: [embed] });
        }
    }
};
