const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const AutoResponse = require('../../models/autoResponse');
const { loadLang } = require('../../utils/langLoader');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoresponder')
        .setDescription('🤖 Quản lý hệ thống trả lời tự động')
        .addSubcommand(subcommand =>
            subcommand
                .setName('placeholders')
                .setDescription('📋 Xem danh sách biến và hàm hỗ trợ')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('➕ Thêm phản hồi tự động mới')
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
                .setDescription('👀 Xem chi tiết phản hồi tự động')
                .addStringOption(option => option.setName('trigger').setDescription('Từ khóa của auto-responder.').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('✏️ Chỉnh sửa phản hồi tự động')
                .addStringOption(option => option.setName('trigger').setDescription('Từ khóa của auto-responder.').setRequired(true))
                .addStringOption(option => option.setName('response').setDescription('Chuỗi trả lời mới.'))
                .addAttachmentOption(option => option.setName('attachment').setDescription('Tệp đính kèm mới (ảnh/video).'))
                .addBooleanOption(option => option.setName('remove_attachment').setDescription('Chọn true để xóa tệp đính kèm hiện tại.'))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('matchmode')
                .setDescription('🎯 Cài đặt chế độ so khớp từ khóa')
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
                .setDescription('🗑️ Xóa phản hồi tự động')
                .addStringOption(option => option.setName('trigger').setDescription('Từ khóa của auto-responder.').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('📜 Danh sách phản hồi tự động hiện có')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const lang = loadLang(guildId);
        const autoLang = lang.Addons.Autoresponder;

        if (subcommand === 'add') {
            const trigger = interaction.options.getString('trigger');

            const existing = await AutoResponse.findOne({ guildId, trigger });
            if (existing) {
                return interaction.reply({ content: autoLang.Errors.AlreadyExists.replace('{trigger}', trigger), ephemeral: true });
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
            await newAutoResponse.save();
            await interaction.reply({ content: autoLang.UI.AddSuccess.replace('{trigger}', trigger), ephemeral: true });

        } else if (subcommand === 'view') {
            const trigger = interaction.options.getString('trigger');
            const autoResponse = await AutoResponse.findOne({ guildId, trigger });

            if (!autoResponse) {
                return interaction.reply({ content: autoLang.Errors.NotFound, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle(autoLang.UI.ViewTitle.replace('{trigger}', trigger))
                .addFields(
                    { name: 'Response', value: `\`\`\`${autoResponse.response}\`\`\`` },
                    { name: autoLang.UI.ViewMode, value: autoResponse.mode, inline: true },
                    { name: autoLang.UI.ViewIgnoreCase, value: autoResponse.ignoreCase.toString(), inline: true }
                );

            if (autoResponse.attachmentUrl) {
                embed.addFields({ name: autoLang.UI.ViewAttachment, value: autoResponse.attachmentUrl });
                embed.setImage(autoResponse.attachmentUrl);
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'edit') {
            const trigger = interaction.options.getString('trigger');
            const newResponse = interaction.options.getString('response');
            const newAttachment = interaction.options.getAttachment('attachment');
            const removeAttachment = interaction.options.getBoolean('remove_attachment');

            if (newAttachment && removeAttachment) {
                return interaction.reply({ content: autoLang.Errors.ConflictError, ephemeral: true });
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
                return interaction.reply({ content: autoLang.Errors.InvalidEdit, ephemeral: true });
            }

            const updated = await AutoResponse.findOneAndUpdate(
                { guildId, trigger },
                update,
                { new: true }
            );

            if (!updated) {
                return interaction.reply({ content: autoLang.Errors.NotFound, ephemeral: true });
            }
            await interaction.reply({ content: autoLang.UI.EditSuccess.replace('{trigger}', trigger), ephemeral: true });

        } else if (subcommand === 'matchmode') {
            const trigger = interaction.options.getString('trigger');
            const newMode = interaction.options.getString('mode');

            const updated = await AutoResponse.findOneAndUpdate(
                { guildId, trigger },
                { mode: newMode },
                { new: true }
            );

            if (!updated) {
                return interaction.reply({ content: autoLang.Errors.NotFound, ephemeral: true });
            }
            await interaction.reply({ content: autoLang.UI.ModeUpdateSuccess.replace('{trigger}', trigger).replace('{mode}', newMode), ephemeral: true });

        } else if (subcommand === 'delete') {
            const trigger = interaction.options.getString('trigger');
            const deleted = await AutoResponse.findOneAndDelete({ guildId, trigger });

            if (!deleted) {
                return interaction.reply({ content: autoLang.Errors.NotFound, ephemeral: true });
            }
            await interaction.reply({ content: autoLang.UI.DeleteSuccess.replace('{trigger}', trigger), ephemeral: true });

        } else if (subcommand === 'list') {
            const responses = await AutoResponse.find({ guildId });
            if (responses.length === 0) {
                return interaction.reply({ content: autoLang.UI.ListEmpty, ephemeral: true });
            }

            const list = responses.map(r => `\`${r.trigger}\``).join(', ');
            const embed = new EmbedBuilder()
                .setTitle(autoLang.UI.ListTitle)
                .setDescription(list);
            await interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'placeholders') {
            // This will be a very long message. I will create a separate file for it.
            const placeholderEmbed = new EmbedBuilder()
                .setTitle(autoLang.UI.PlaceholdersTitle)
                .setDescription(autoLang.UI.PlaceholdersDesc);
            await interaction.reply({ embeds: [placeholderEmbed], ephemeral: true });
        }
    }
};
