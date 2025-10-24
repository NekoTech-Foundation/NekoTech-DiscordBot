const { ContextMenuCommandBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const Suggestion = require('../../models/Suggestion');
const suggestionActions = require('../../events/Suggestions/suggestionActions');
const { getConfig, getLang } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

const acceptCommand = new ContextMenuCommandBuilder()
    .setName('Accept')
    .setType(ApplicationCommandType.Message);

const denyCommand = new ContextMenuCommandBuilder()
    .setName('Deny')
    .setType(ApplicationCommandType.Message);

module.exports = {
    data: [acceptCommand, denyCommand],
    category: 'General',
    async execute(interaction) {
        try {
            if (!config.SuggestionSettings.Enabled) {
                await interaction.reply({ content: lang.Suggestion.SuggestionsDisabled, ephemeral: true });
                return;
            }

            const commandName = interaction.commandName;
            const message = await interaction.channel.messages.fetch(interaction.targetId);
            const suggestionId = message.id;

            const suggestion = await Suggestion.findOne({ messageId: suggestionId });
            if (!suggestion) {
                await interaction.reply({ content: `Không tìm thấy đề xuất ${suggestionId}.`, ephemeral: true });
                return;
            }

            const acceptDenyRoles = config.SuggestionSettings.SuggestionAcceptDenyRoles;
            const hasAcceptDenyRole = acceptDenyRoles.some(roleId => interaction.member.roles.cache.has(roleId));

            if (!hasAcceptDenyRole) {
                await interaction.reply({ content: lang.NoPermsMessage, ephemeral: true });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId(`suggestion_${commandName.toLowerCase()}_${suggestion.uniqueId}`)
                .setTitle(lang.Suggestion.ReasonModalTitle);

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel(lang.Suggestion.ReasonModalTitle)
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(1000);

            const actionRow = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);

            const filter = (i) => i.customId === `suggestion_${commandName.toLowerCase()}_${suggestion.uniqueId}`;
            try {
                const modalSubmission = await interaction.awaitModalSubmit({ filter, time: 300000 });
                
                await modalSubmission.deferReply({ ephemeral: true });
                
                const reason = modalSubmission.fields.getTextInputValue('reason');

                try {
                    if (commandName === 'Accept') {
                        await suggestionActions.acceptSuggestion(interaction.client, modalSubmission, suggestion.uniqueId, reason);
                    } else if (commandName === 'Deny') {
                        await suggestionActions.denySuggestion(interaction.client, modalSubmission, suggestion.uniqueId, reason);
                    }
                } catch (actionError) {
                    console.error("Lỗi trong hành động đề xuất:", actionError);
                    await modalSubmission.editReply({ 
                        content: lang.Suggestion.Error
                    });
                }
            } catch (error) {
                if (error.code === 'InteractionCollectorError') {
                    if (!interaction.replied) {
                        await interaction.followUp({ 
                            content: lang.Suggestion.ModalTimeout, 
                            ephemeral: true 
                        }).catch(console.error);
                    }
                } else {
                    console.error("Lỗi trong việc xử lý modal đề xuất:", error);
                    if (!interaction.replied) {
                        await interaction.followUp({ 
                            content: lang.Suggestion.Error, 
                            ephemeral: true 
                        }).catch(console.error);
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi trong lệnh đề xuất: ", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: lang.Suggestion.Error, 
                    ephemeral: true 
                }).catch(() => {});
            }
        }
    },
};
