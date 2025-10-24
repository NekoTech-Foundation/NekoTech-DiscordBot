const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');

const MAX_MESSAGE_LENGTH = 2000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Lặp lại hoặc chỉnh sửa tin nhắn do bot gửi')
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Gửi một tin nhắn mới')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Tin nhắn để gửi')
                        .setMaxLength(MAX_MESSAGE_LENGTH)
                        .setRequired(true))
                .addAttachmentOption(option =>
                    option.setName('attachment')
                        .setDescription('Thêm một tệp đính kèm vào tin nhắn')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Chỉnh sửa một tin nhắn trước đó của bot')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID của tin nhắn để chỉnh sửa')
                        .setRequired(true))),
    category: 'Fun',
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: 'Bạn không có quyền sử dụng lệnh này.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'send') {
            const message = interaction.options.getString('message');
            const attachment = interaction.options.getAttachment('attachment');
            
            if (message.length > MAX_MESSAGE_LENGTH) {
                return interaction.reply({ 
                    content: `Tin nhắn quá dài! Độ dài tối đa là ${MAX_MESSAGE_LENGTH} ký tự.`,
                    ephemeral: true 
                });
            }

            await interaction.channel.send({
                content: message,
                files: attachment ? [attachment] : []
            });
            
            await interaction.reply({ content: 'Tin nhắn đã được gửi!', ephemeral: true });
        } 
        else if (subcommand === 'edit') {
            const messageId = interaction.options.getString('message_id');
            
            try {
                const targetMessage = await interaction.channel.messages.fetch(messageId);
                
                if (targetMessage.author.id !== interaction.client.user.id) {
                    return interaction.reply({ 
                        content: 'Tôi chỉ có thể chỉnh sửa những tin nhắn do tôi gửi.',
                        ephemeral: true 
                    });
                }

                const modal = new ModalBuilder()
                    .setCustomId(`edit_message_${messageId}`)
                    .setTitle('Chỉnh sửa tin nhắn');

                const messageInput = new TextInputBuilder()
                    .setCustomId('edited_content')
                    .setLabel('Nội dung tin nhắn mới')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(targetMessage.content)
                    .setMaxLength(MAX_MESSAGE_LENGTH)
                    .setRequired(true);

                const actionRow = new ActionRowBuilder().addComponents(messageInput);
                modal.addComponents(actionRow);

                await interaction.showModal(modal);

                const filter = (i) => i.customId === `edit_message_${messageId}` && i.user.id === interaction.user.id;
                const submitted = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(() => null);

                if (submitted) {
                    const newContent = submitted.fields.getTextInputValue('edited_content');
                    
                    if (newContent.length > MAX_MESSAGE_LENGTH) {
                        return submitted.reply({ 
                            content: `Tin nhắn quá dài! Độ dài tối đa là ${MAX_MESSAGE_LENGTH} ký tự.`,
                            ephemeral: true 
                        });
                    }

                    await targetMessage.edit(newContent);
                    await submitted.reply({ content: 'Đã chỉnh sửa tin nhắn thành công!', ephemeral: true });
                }

            } catch (error) {
                console.error('Lỗi trong lệnh chỉnh sửa:', error);
                return interaction.reply({ 
                    content: 'Không thể tìm thấy tin nhắn. Hãy chắc chắn rằng ID là chính xác và tin nhắn nằm trong kênh này.',
                    ephemeral: true 
                });
            }
        }
    }
};

module.exports.modalSubmit = async function(interaction) {
    if (interaction.customId.startsWith('edit_message_')) {
        const messageId = interaction.customId.replace('edit_message_', '');
        const newContent = interaction.fields.getTextInputValue('edited_content');
        
        if (newContent.length > MAX_MESSAGE_LENGTH) {
            return interaction.reply({ 
                content: `Tin nhắn quá dài! Độ dài tối đa là ${MAX_MESSAGE_LENGTH} ký tự.`,
                ephemeral: true 
            });
        }

        try {
            const targetMessage = await interaction.channel.messages.fetch(messageId);
            await targetMessage.edit(newContent);
            await interaction.reply({ content: 'Đã chỉnh sửa tin nhắn thành công!', ephemeral: true });
        } catch (error) {
            console.error('Lỗi khi gửi modal chỉnh sửa tin nhắn:', error);
            await interaction.reply({ 
                content: 'Không thể chỉnh sửa tin nhắn. Tin nhắn có thể đã bị xóa hoặc tôi không còn quyền chỉnh sửa nó.',
                ephemeral: true 
            });
        }
    }
};
