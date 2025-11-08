const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const AutoResponse = require('../../models/autoResponse');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoresponder')
        .setDescription('Cài đặt và quản lí auto-responder.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('placeholders')
                .setDescription('Hiển thị danh sách các placeholders và functions.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Thêm một auto-responder.')
                .addStringOption(option => option.setName('trigger').setDescription('Từ khóa để kích hoạt.').setRequired(true))
                .addStringOption(option => option.setName('response').setDescription('Chuỗi để trả lời.').setRequired(true))
                .addStringOption(option => option.setName('mode').setDescription('Chế độ khớp.').setRequired(true).addChoices(
                    { name: 'Chính xác', value: 'exact' },
                    { name: 'Chứa', value: 'contains' },
                    { name: 'Bắt đầu bằng', value: 'startswith' },
                    { name: 'Kết thúc bằng', value: 'endswith' }
                ))
                .addBooleanOption(option => option.setName('ignorecase').setDescription('Bỏ qua trường hợp (chữ hoa/thường).'))
                .addAttachmentOption(option => option.setName('attachment').setDescription('Tệp đính kèm (ảnh/video) để gửi cùng.'))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Xem cài đặt của một auto-responder.')
                .addStringOption(option => option.setName('trigger').setDescription('Từ khóa của auto-responder.').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Chỉnh sửa một auto-responder.')
                .addStringOption(option => option.setName('trigger').setDescription('Từ khóa của auto-responder.').setRequired(true))
                .addStringOption(option => option.setName('response').setDescription('Chuỗi trả lời mới.'))
                .addAttachmentOption(option => option.setName('attachment').setDescription('Tệp đính kèm mới (ảnh/video).'))
                .addBooleanOption(option => option.setName('remove_attachment').setDescription('Chọn true để xóa tệp đính kèm hiện tại.'))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('matchmode')
                .setDescription('Chỉnh sửa chế độ khớp của một auto-responder.')
                .addStringOption(option => option.setName('trigger').setDescription('Từ khóa của auto-responder.').setRequired(true))
                .addStringOption(option => option.setName('mode').setDescription('Chế độ khớp mới.').setRequired(true).addChoices(
                    { name: 'Chính xác', value: 'exact' },
                    { name: 'Chứa', value: 'contains' },
                    { name: 'Bắt đầu bằng', value: 'startswith' },
                    { name: 'Kết thúc bằng', value: 'endswith' }
                ))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Xóa một auto-responder.')
                .addStringOption(option => option.setName('trigger').setDescription('Từ khóa của auto-responder.').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Liệt kê tất cả auto-responder trên máy chủ.')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'add') {
            const trigger = interaction.options.getString('trigger');
            
            const existing = await AutoResponse.findOne({ guildId, trigger });
            if (existing) {
                return interaction.reply({ content: `Một auto-responder với trigger \`${trigger}\` đã tồn tại.`, ephemeral: true });
            }

            const response = interaction.options.getString('response');
            const mode = interaction.options.getString('mode');
            const ignoreCase = interaction.options.getBoolean('ignorecase') || false;
            const attachment = interaction.options.getAttachment('attachment');
            const attachmentUrl = attachment ? attachment.url : null;

            const newAutoResponse = new AutoResponse({
                guildId,
                trigger,
                response,
                mode,
                ignoreCase,
                attachmentUrl
            });

            await newAutoResponse.save();
            await interaction.reply({ content: `Đã tạo auto-responder cho trigger: \`${trigger}\``, ephemeral: true });

        } else if (subcommand === 'view') {
            const trigger = interaction.options.getString('trigger');
            const autoResponse = await AutoResponse.findOne({ guildId, trigger });

            if (!autoResponse) {
                return interaction.reply({ content: 'Không tìm thấy auto-responder với trigger này.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle(`Auto-responder: ${trigger}`)
                .addFields(
                    { name: 'Response', value: `\`\`\`${autoResponse.response}\`\`\`` },
                    { name: 'Mode', value: autoResponse.mode, inline: true },
                    { name: 'Ignore Case', value: autoResponse.ignoreCase.toString(), inline: true }
                );
            
            if (autoResponse.attachmentUrl) {
                embed.addFields({ name: 'Attachment URL', value: autoResponse.attachmentUrl });
                embed.setImage(autoResponse.attachmentUrl);
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'edit') {
            const trigger = interaction.options.getString('trigger');
            const newResponse = interaction.options.getString('response');
            const newAttachment = interaction.options.getAttachment('attachment');
            const removeAttachment = interaction.options.getBoolean('remove_attachment');

            if (newAttachment && removeAttachment) {
                return interaction.reply({ content: 'Bạn không thể vừa thêm tệp đính kèm mới vừa xóa tệp hiện có. Vui lòng chọn một hành động.', ephemeral: true });
            }

            const update = {};
            if (newResponse) {
                update.response = newResponse;
            }
            if (removeAttachment) {
                update.attachmentUrl = null;
            } else if (newAttachment) {
                update.attachmentUrl = newAttachment.url;
            }

            if (Object.keys(update).length === 0) {
                return interaction.reply({ content: 'Bạn phải cung cấp ít nhất một tùy chọn để chỉnh sửa (response, attachment, hoặc remove_attachment).', ephemeral: true });
            }

            const updated = await AutoResponse.findOneAndUpdate(
                { guildId, trigger },
                update,
                { new: true }
            );

            if (!updated) {
                return interaction.reply({ content: 'Không tìm thấy auto-responder với trigger này.', ephemeral: true });
            }
            await interaction.reply({ content: `Đã cập nhật auto-responder cho trigger: \`${trigger}\``, ephemeral: true });

        } else if (subcommand === 'matchmode') {
            const trigger = interaction.options.getString('trigger');
            const newMode = interaction.options.getString('mode');

            const updated = await AutoResponse.findOneAndUpdate(
                { guildId, trigger },
                { mode: newMode },
                { new: true }
            );

            if (!updated) {
                return interaction.reply({ content: 'Không tìm thấy auto-responder với trigger này.', ephemeral: true });
            }
            await interaction.reply({ content: `Đã cập nhật mode cho trigger \`${trigger}\` thành \`${newMode}\`.`, ephemeral: true });

        } else if (subcommand === 'delete') {
            const trigger = interaction.options.getString('trigger');
            const deleted = await AutoResponse.findOneAndDelete({ guildId, trigger });

            if (!deleted) {
                return interaction.reply({ content: 'Không tìm thấy auto-responder với trigger này.', ephemeral: true });
            }
            await interaction.reply({ content: `Đã xóa auto-responder cho trigger: \`${trigger}\``, ephemeral: true });

        } else if (subcommand === 'list') {
            const responses = await AutoResponse.find({ guildId });
            if (responses.length === 0) {
                return interaction.reply({ content: 'Không có auto-responder nào trên máy chủ này.', ephemeral: true });
            }

            const list = responses.map(r => `\`${r.trigger}\``).join(', ');
            const embed = new EmbedBuilder()
                .setTitle('Danh sách Auto-responder')
                .setDescription(list);
            await interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'placeholders') {
            // This will be a very long message. I will create a separate file for it.
            const placeholderEmbed = new EmbedBuilder()
                .setTitle('Placeholders & Functions')
                .setDescription('Đây là danh sách các placeholders và functions bạn có thể sử dụng trong response của auto-responder. (Đang trong quá trình phát triển)');
            await interaction.reply({ embeds: [placeholderEmbed], ephemeral: true });
        }
    }
};
