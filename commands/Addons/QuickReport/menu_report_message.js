const { ContextMenuCommandBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Tố cáo tin nhắn này')
        .setType(ApplicationCommandType.Message),
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId(`report-message-modal-${interaction.targetMessage.id}-${interaction.channelId}`)
            .setTitle('Tố cáo tin nhắn');

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Lý do tố cáo')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    }
};
