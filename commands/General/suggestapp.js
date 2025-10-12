/*
  _____            _           ____        _   
 |  __ \          | |         |  _ \      | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                             
                                        
 Thank you for choosing Drako Bot!

 Should you encounter any issues, require assistance, or have suggestions for improving the bot,
 we invite you to connect with us on our Discord server and create a support ticket: 

 http://discord.drakodevelopment.net
 
*/

const { ContextMenuCommandBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Suggestion = require('../../models/Suggestion');
const suggestionActions = require('../../events/Suggestions/suggestionActions');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

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
                await interaction.reply({ content: lang.Suggestion.SuggestionsDisabled, flags: MessageFlags.Ephemeral });
                return;
            }

            const commandName = interaction.commandName;
            const message = await interaction.channel.messages.fetch(interaction.targetId);
            const suggestionId = message.id;

            const suggestion = await Suggestion.findOne({ messageId: suggestionId });
            if (!suggestion) {
                await interaction.reply({ content: `Suggestion ${suggestionId} not found.`, flags: MessageFlags.Ephemeral });
                return;
            }

            const acceptDenyRoles = config.SuggestionSettings.SuggestionAcceptDenyRoles;
            const hasAcceptDenyRole = acceptDenyRoles.some(roleId => interaction.member.roles.cache.has(roleId));

            if (!hasAcceptDenyRole) {
                await interaction.reply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
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
                
                await modalSubmission.deferReply({ flags: MessageFlags.Ephemeral });
                
                const reason = modalSubmission.fields.getTextInputValue('reason');

                try {
                    if (commandName === 'Accept') {
                        await suggestionActions.acceptSuggestion(interaction.client, modalSubmission, suggestion.uniqueId, reason);
                    } else if (commandName === 'Deny') {
                        await suggestionActions.denySuggestion(interaction.client, modalSubmission, suggestion.uniqueId, reason);
                    }
                } catch (actionError) {
                    console.error("Error in suggestion action:", actionError);
                    await modalSubmission.editReply({ 
                        content: lang.Suggestion.Error
                    });
                }
            } catch (error) {
                if (error.code === 'InteractionCollectorError') {
                    if (!interaction.replied) {
                        await interaction.followUp({ 
                            content: lang.Suggestion.ModalTimeout, 
                            flags: MessageFlags.Ephemeral 
                        }).catch(console.error);
                    }
                } else {
                    console.error("Error in suggestion modal handling:", error);
                    if (!interaction.replied) {
                        await interaction.followUp({ 
                            content: lang.Suggestion.Error, 
                            flags: MessageFlags.Ephemeral 
                        }).catch(console.error);
                    }
                }
            }
        } catch (error) {
            console.error("Error in suggestion command: ", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: lang.Suggestion.Error, 
                    flags: MessageFlags.Ephemeral 
                }).catch(() => {});
            }
        }
    },
};