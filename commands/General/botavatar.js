const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const ALLOWED_USER_ID = '1316287191634149377';

module.exports = {
    owner: true,
    data: new SlashCommandBuilder()
        .setName('botavatar')
        .setDescription('🖼️ Xem avatar của bot')
        .addAttachmentOption(option => option
            .setName('avatar')
            .setDescription('Tệp gif')
            .setRequired(true)),
    category: 'General',
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        if (interaction.user.id !== ALLOWED_USER_ID) {
            await sendReply(interaction, "⛔ | Bạn không có quyền sử dụng lệnh này!");
            return;
        }

        const avatar = interaction.options.getAttachment('avatar');
        if (!isValidGifImage(avatar)) {
            await sendReply(interaction, "⚠️ | Vui lòng cung cấp một hình ảnh GIF.");
            return;
        }

        try {
            await client.user.setAvatar(avatar.url);
            await sendReply(interaction, "✅ | Đã tải lên ảnh đại diện của bot.");
        } catch (error) {
            console.error(error);
            await sendReply(interaction, `❌ | Đã xảy ra lỗi: ${error.message}`);
        }
    }
};

function isValidGifImage(avatar) {
    return avatar.contentType && avatar.contentType === "image/gif";
}

async function sendReply(interaction, message) {
    await interaction.followUp({ content: message });
}
