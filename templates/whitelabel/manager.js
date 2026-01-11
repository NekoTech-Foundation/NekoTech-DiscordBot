const { SlashCommandBuilder, EmbedBuilder, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Quản lý Bot (Dành cho Owner)')
        .addSubcommand(sub =>
            sub.setName('config')
                .setDescription('Upload file config.yml mới')
                .addAttachmentOption(opt => opt.setName('file').setDescription('File config.yml').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('avatar')
                .setDescription('Đổi Avatar Bot')
                .addAttachmentOption(opt => opt.setName('image').setDescription('Ảnh mới').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('Đổi trạng thái Bot')
                .addStringOption(opt => opt.setName('text').setDescription('Nội dung').setRequired(true))
                .addStringOption(opt => opt.setName('type').setDescription('Loại').addChoices(
                    { name: 'Playing', value: 'Playing' },
                    { name: 'Watching', value: 'Watching' },
                    { name: 'Listening', value: 'Listening' },
                    { name: 'Competing', value: 'Competing' }
                ))
        )
        .addSubcommand(sub =>
            sub.setName('restart')
                .setDescription('Khởi động lại Bot')
        ),

    async execute(interaction) {
        // Security Check: Only OwnerIDs from config can use this
        // In Whitelabel, OwnerIDs is set to [CustomerId] during creation
        if (!global.config.OwnerIDs.includes(interaction.user.id)) {
            return interaction.reply({ content: '🚫 Lệnh này chỉ dành cho Owner của bot.', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'config') {
            await interaction.deferReply({ ephemeral: true });
            const attachment = interaction.options.getAttachment('file');

            if (!attachment.name.endsWith('.yml') && !attachment.name.endsWith('.yaml')) {
                return interaction.editReply('❌ Vui lòng upload file **.yml** hoặc **.yaml**.');
            }

            try {
                const response = await axios.get(attachment.url, { responseType: 'text' });
                const newConfigContent = response.data;

                // Validate YAML
                try {
                    yaml.load(newConfigContent);
                } catch (e) {
                    return interaction.editReply(`❌ File Config không hợp lệ: \n\`${e.message}\``);
                }

                fs.writeFileSync(path.join(process.cwd(), 'config.yml'), newConfigContent);

                await interaction.editReply('✅ Đã cập nhật Config thành công! Đang khởi động lại...');
                process.exit(0); // PM2 will restart
            } catch (error) {
                console.error(error);
                return interaction.editReply('❌ Lỗi khi tải file.');
            }

        } else if (sub === 'avatar') {
            await interaction.deferReply();
            const image = interaction.options.getAttachment('image');

            try {
                await interaction.client.user.setAvatar(image.url);
                return interaction.editReply('✅ Đã đổi Avatar thành công!');
            } catch (error) {
                return interaction.editReply(`❌ Lỗi: ${error.message}. (Lưu ý: Bạn không thể đổi avatar quá nhanh).`);
            }

        } else if (sub === 'status') {
            const text = interaction.options.getString('text');
            const typeStr = interaction.options.getString('type') || 'Playing';

            let type = ActivityType.Playing;
            if (typeStr === 'Watching') type = ActivityType.Watching;
            if (typeStr === 'Listening') type = ActivityType.Listening;
            if (typeStr === 'Competing') type = ActivityType.Competing;

            interaction.client.user.setActivity(text, { type });

            // Should verify save to config? 
            // Ideally yes, but for now simple runtime change.
            return interaction.reply(`✅ Đã đổi trạng thái thành: **${typeStr} ${text}**`);

        } else if (sub === 'restart') {
            await interaction.reply('🔄 Đang khởi động lại...');
            process.exit(0);
        }
    }
};
