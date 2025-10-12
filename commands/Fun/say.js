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

const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');

const MAX_MESSAGE_LENGTH = 2000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Repeats or edits messages sent by the bot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Sends a new message')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('The message to send')
                        .setMaxLength(MAX_MESSAGE_LENGTH)
                        .setRequired(true))
                .addAttachmentOption(option =>
                    option.setName('attachment')
                        .setDescription('Add an attachment to the message')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit a previous bot message')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The ID of the message to edit')
                        .setRequired(true))),
    category: 'Fun',
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'send') {
            const message = interaction.options.getString('message');
            const attachment = interaction.options.getAttachment('attachment');
            
            if (message.length > MAX_MESSAGE_LENGTH) {
                return interaction.reply({ 
                    content: `Message is too long! Maximum length is ${MAX_MESSAGE_LENGTH} characters.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            await interaction.channel.send({
                content: message,
                files: attachment ? [attachment] : []
            });
            
            await interaction.reply({ content: 'Message sent!', flags: MessageFlags.Ephemeral });
        } 
        else if (subcommand === 'edit') {
            const messageId = interaction.options.getString('message_id');
            
            try {
                const targetMessage = await interaction.channel.messages.fetch(messageId);
                
                if (targetMessage.author.id !== interaction.client.user.id) {
                    return interaction.reply({ 
                        content: 'I can only edit messages that were sent by me.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                const modal = new ModalBuilder()
                    .setCustomId(`edit_message_${messageId}`)
                    .setTitle('Edit Message');

                const messageInput = new TextInputBuilder()
                    .setCustomId('edited_content')
                    .setLabel('New Message Content')
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
                            content: `Message is too long! Maximum length is ${MAX_MESSAGE_LENGTH} characters.`, 
                            flags: MessageFlags.Ephemeral 
                        });
                    }

                    await targetMessage.edit(newContent);
                    await submitted.reply({ content: 'Message edited successfully!', flags: MessageFlags.Ephemeral });
                }

            } catch (error) {
                console.error('Error in edit command:', error);
                return interaction.reply({ 
                    content: 'Unable to find the message. Make sure the ID is correct and the message is in this channel.', 
                    flags: MessageFlags.Ephemeral 
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
                content: `Message is too long! Maximum length is ${MAX_MESSAGE_LENGTH} characters.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        try {
            const targetMessage = await interaction.channel.messages.fetch(messageId);
            await targetMessage.edit(newContent);
            await interaction.reply({ content: 'Message edited successfully!', flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('Error in edit message modal submission:', error);
            await interaction.reply({ 
                content: 'Failed to edit the message. It may have been deleted or I no longer have permission to edit it.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
};