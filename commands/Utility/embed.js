const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
//const fs = require('fs');
//const yaml = require('js-yaml');
const mongoose = require('mongoose');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

const embedSchema = new mongoose.Schema({
    name: String,
    embedData: Object,
    linkButtons: Array,
    claimed: { type: Boolean, default: false },
    claimedBy: { type: String, default: null }
});
const EmbedTemplate = mongoose.model('EmbedTemplate', embedSchema);

const activeInteractions = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Manage embeds')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new embed using buttons'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing embed')
                .addStringOption(option =>
                    option.setName('messageid')
                        .setDescription('The ID of the message to edit')
                        .setRequired(true))),
    category: 'Utility',
    async execute(interaction) {
        const member = interaction.member;
        const hasEmbedRole = member.roles.cache.some(role => config.ModerationRoles.embed.includes(role.id));
        const isAdministrator = member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!hasEmbedRole && !isAdministrator) {
            return interaction.reply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
        }

        const userId = interaction.user.id;

        if (activeInteractions.has(userId)) {
            const previousInteraction = activeInteractions.get(userId);
            previousInteraction.stop();
        }

        const subcommand = interaction.options.getSubcommand();
        let embed = new EmbedBuilder()
            .setAuthor({ name: 'Embed Builder' })
            .setColor(config.EmbedColors)
            .setDescription('Welcome to the **interactive embed builder**. Use the buttons below to build the embed, when you\'re done click **Post Embed**!');

        let messageId = null;
        let existingLinkButtons = [];

        if (subcommand === 'edit') {
            messageId = interaction.options.getString('messageid');
            try {
                const message = await interaction.channel.messages.fetch(messageId);
                if (message && message.embeds[0]) {
                    embed = EmbedBuilder.from(message.embeds[0]);
                    existingLinkButtons = message.components.flatMap(row => row.components.filter(component => component.type === 'BUTTON' && component.style === 'LINK'));
                } else {
                    return interaction.reply({ content: 'Message not found or does not contain an embed.', flags: MessageFlags.Ephemeral });
                }
            } catch (error) {
                return interaction.reply({ content: 'Failed to fetch the message. Please ensure the message ID is correct.', flags: MessageFlags.Ephemeral });
            }
        }

        const id = Date.now().toString();
        const linkButtons = [...existingLinkButtons];

        const baseComponents = [
            new ButtonBuilder().setCustomId(`title_${id}`).setLabel('Title').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`description_${id}`).setLabel('Description').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`author_${id}`).setLabel('Author').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`footer_${id}`).setLabel('Footer').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`timestamp_${id}`).setLabel('Timestamp').setStyle(ButtonStyle.Secondary),

            new ButtonBuilder().setCustomId(`addfield_${id}`).setLabel('Add Field').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`removefield_${id}`).setLabel('Remove Field').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`thumbnail_${id}`).setLabel('Thumbnail').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`image_${id}`).setLabel('Image').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`color_${id}`).setLabel('Color').setStyle(ButtonStyle.Secondary),

            new ButtonBuilder().setCustomId(`addlink_${id}`).setLabel('Add Link').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`removelink_${id}`).setLabel('Remove Link').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`toggleping_${id}`).setLabel('Toggle Pings').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`abovetext_${id}`).setLabel('Above Text').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`aboveimage_${id}`).setLabel('Above Image').setStyle(ButtonStyle.Secondary),

            new ButtonBuilder().setCustomId(`save_${id}`).setLabel('Save Template').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`deletetemplate_${id}`).setLabel('Delete Template').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`post_${id}`).setLabel('Post Embed').setStyle(ButtonStyle.Success)
        ];

        const components = [];
        for (let i = 0; i < baseComponents.length; i += 5) {
            components.push(new ActionRowBuilder().addComponents(baseComponents.slice(i, i + 5)));
        }

        const templates = await EmbedTemplate.find().select('name');
        if (templates.length > 0) {
            const options = templates.map((template, index) => ({
                label: template.name,
                value: `template_${index}`
            }));
        
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`loadtemplate_${id}`)
                .setPlaceholder('Load a template')
                .addOptions(options);
        
            components.unshift(new ActionRowBuilder().addComponents(selectMenu));
        }

        await interaction.reply({ embeds: [embed], components: combineComponents(components, linkButtons), flags: MessageFlags.Ephemeral });

        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 900000 });

        activeInteractions.set(userId, collector);

        collector.on('collect', async i => {
            try {
                await handleButtonInteraction(i, embed, components, linkButtons, collector, messageId);
            } catch (error) {
                console.error('Error handling button interaction:', error);
                if (!i.deferred && !i.replied) {
                    await i.reply({ content: 'An unexpected error occurred. Please try again.', flags: MessageFlags.Ephemeral }).catch(console.error);
                }
            }
        });

        collector.on('end', async () => {
            activeInteractions.delete(userId);
        });
    },
    EmbedTemplate
};

async function handleButtonInteraction(i, embed, components, linkButtons, collector, messageId) {
    switch (i.customId.split('_')[0]) {
        case 'title':
            await showTitleModal(i, embed, components, linkButtons);
            break;
        case 'description':
            await showDescriptionModal(i, embed, components, linkButtons);
            break;
        case 'author':
            await showAuthorModal(i, embed, components, linkButtons);
            break;
        case 'footer':
            await showFooterModal(i, embed, components, linkButtons);
            break;
        case 'thumbnail':
            await showThumbnailModal(i, embed, components, linkButtons);
            break;
        case 'image':
            await showImageModal(i, embed, components, linkButtons);
            break;
        case 'color':
            await showColorModal(i, embed, components, linkButtons);
            break;
        case 'timestamp':
            if (embed.data.timestamp) {
                embed.setTimestamp(null);
            } else {
                embed.setTimestamp();
            }
            await i.update({ embeds: [embed], components: combineComponents(components, linkButtons), flags: MessageFlags.Ephemeral });
            break;
        case 'post':
            await postEmbed(i, embed, linkButtons, messageId);
            break;
        case 'save':
            await saveTemplate(i, embed, linkButtons);
            break;
        case 'loadtemplate':
            await loadTemplate(i, embed, components, linkButtons);
            break;
        case 'deletetemplate':
            await promptAndDeleteTemplate(i);
            break;
        case 'addlink':
            await addLinkButton(i, embed, linkButtons, components);
            break;
        case 'removelink':
            await removeLinkButton(i, embed, linkButtons, components);
            break;
        case 'abovetext':
            await showAboveTextModal(i, embed, components, linkButtons);
            break;
        case 'aboveimage':
            await showAboveImageModal(i, embed, components, linkButtons);
            break;
        case 'addfield':
            await showAddFieldModal(i, embed, components, linkButtons);
            break;
        case 'removefield':
            await removeField(i, embed, components, linkButtons);
            break;
        case 'toggleping':
            await togglePings(i, embed, components, linkButtons);
            break;
    }
}

async function showAboveTextModal(interaction, embed, components, linkButtons) {
    const modal = new ModalBuilder()
        .setCustomId('abovetext_modal')
        .setTitle('Set Text Above Embed');

    const aboveTextInput = new TextInputBuilder()
        .setCustomId('aboveText')
        .setLabel('Text Above Embed')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Enter text to appear above the embed (e.g., role mentions)')
        .setRequired(false);

    modal.addComponents(new ActionRowBuilder().addComponents(aboveTextInput));

    try {
        await interaction.showModal(modal);

        const modalInteraction = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === 'abovetext_modal',
            time: 60000
        });

        const aboveText = modalInteraction.fields.getTextInputValue('aboveText');

        if (!interaction.client.embedData) {
            interaction.client.embedData = {};
        }
        if (!interaction.client.embedData[interaction.user.id]) {
            interaction.client.embedData[interaction.user.id] = {};
        }
        
        interaction.client.embedData[interaction.user.id] = {
            ...interaction.client.embedData[interaction.user.id],
            aboveText
        };

        await modalInteraction.update({
            content: aboveText ? `Text above embed has been set to: "${aboveText}"` : 'Text above embed has been cleared.',
            embeds: [embed],
            components: combineComponents(components, linkButtons),
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error in above text modal:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'An error occurred while setting the text above the embed. Please try again.', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.followUp({ content: 'An error occurred while setting the text above the embed. Please try again.', flags: MessageFlags.Ephemeral });
        }
    }
}

async function showTitleModal(interaction, embed, components, linkButtons) {
    const modal = new ModalBuilder()
        .setCustomId('title_modal')
        .setTitle('Set Embed Title');

    const titleInput = new TextInputBuilder()
        .setCustomId('titleText')
        .setLabel('Title')
        .setStyle(TextInputStyle.Short)
        .setValue(embed.data.title || '')
        .setRequired(false);

    modal.addComponents(new ActionRowBuilder().addComponents(titleInput));

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === 'title_modal',
            time: 60000
        });

        const title = modalInteraction.fields.getTextInputValue('titleText');
        embed.setTitle(title || null);
        await modalInteraction.update({ embeds: [embed], components: combineComponents(components, linkButtons), flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Error in title modal:', error);
        if (error.code === 'InteractionCollectorError') {
            await interaction.followUp({ content: 'The title modal timed out. Please try again.', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.followUp({ content: 'An error occurred while setting the title. Please try again.', flags: MessageFlags.Ephemeral });
        }
    }
}

async function showDescriptionModal(interaction, embed, components, linkButtons) {
    const modal = new ModalBuilder()
        .setCustomId('description_modal')
        .setTitle('Set Embed Description');

    const descriptionInput = new TextInputBuilder()
        .setCustomId('descriptionText')
        .setLabel('Description')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(embed.data.description || '')
        .setRequired(false);

    modal.addComponents(new ActionRowBuilder().addComponents(descriptionInput));

    try {
        await interaction.showModal(modal);

        const modalSubmitInteraction = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === 'description_modal' && i.user.id === interaction.user.id,
            time: 120000
        });

        const description = modalSubmitInteraction.fields.getTextInputValue('descriptionText');
        embed.setDescription(description || null);
        
        await modalSubmitInteraction.update({ 
            embeds: [embed], 
            components: combineComponents(components, linkButtons), 
            flags: MessageFlags.Ephemeral 
        });
    } catch (error) {
        if (error.code === 'InteractionCollectorError') {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.followUp({ 
                    content: 'The description modal timed out. Please try again.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        console.error('Error in description modal:', error);
        const errorMessage = 'An error occurred while setting the description. Please try again.';
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
        }
    }
}

async function showAuthorModal(interaction, embed, components, linkButtons) {
    const modal = new ModalBuilder()
        .setCustomId('author_modal')
        .setTitle('Author Settings');

    const authorNameInput = new TextInputBuilder()
        .setCustomId('authorName')
        .setLabel('Author Name')
        .setStyle(TextInputStyle.Short)
        .setValue(embed.data.author?.name || '')
        .setRequired(false);

    const authorIconInput = new TextInputBuilder()
        .setCustomId('authorIcon')
        .setLabel('Author Icon URL')
        .setStyle(TextInputStyle.Short)
        .setValue(embed.data.author?.iconURL || '')
        .setRequired(false);

    const authorUrlInput = new TextInputBuilder()
        .setCustomId('authorUrl')
        .setLabel('Author URL (clickable)')
        .setStyle(TextInputStyle.Short)
        .setValue(embed.data.author?.url || '')
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(authorNameInput),
        new ActionRowBuilder().addComponents(authorIconInput),
        new ActionRowBuilder().addComponents(authorUrlInput)
    );

    try {
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error showing modal:', error);
        return;
    }

    try {
        const modalInteraction = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === 'author_modal',
            time: 60000
        });

        const authorName = modalInteraction.fields.getTextInputValue('authorName');
        const authorIcon = modalInteraction.fields.getTextInputValue('authorIcon');
        const authorUrl = modalInteraction.fields.getTextInputValue('authorUrl');

        if (authorIcon && !isValidHttpUrl(authorIcon)) {
            await modalInteraction.reply({ content: 'Invalid icon URL. Please provide a valid URL for the author icon.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (authorUrl && !isValidHttpUrl(authorUrl)) {
            await modalInteraction.reply({ content: 'Invalid author URL. Please provide a valid URL.', flags: MessageFlags.Ephemeral });
            return;
        }

        try {
            if (authorName || authorIcon || authorUrl) {
                embed.setAuthor({ 
                    name: authorName || null, 
                    iconURL: authorIcon || null,
                    url: authorUrl || null
                });
            } else {
                embed.setAuthor(null);
            }
            await modalInteraction.update({ embeds: [embed], components: combineComponents(components, linkButtons), flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('Error updating interaction:', error);
            if (!modalInteraction.replied) {
                await modalInteraction.reply({ content: 'An error occurred while updating the embed. Please try again.', flags: MessageFlags.Ephemeral });
            }
        }
    } catch (error) {
        console.error('Error in author modal:', error);
        if (error.code === 'InteractionCollectorError') {
            await interaction.followUp({ content: 'The author modal timed out. Please try again.', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.followUp({ content: 'An error occurred while setting the author. Please try again.', flags: MessageFlags.Ephemeral });
        }
    }
}

async function showFooterModal(interaction, embed, components, linkButtons) {
    const modal = new ModalBuilder()
        .setCustomId('footer_modal')
        .setTitle('Footer Settings');

    const footerTextInput = new TextInputBuilder()
        .setCustomId('footerText')
        .setLabel('Footer Text')
        .setStyle(TextInputStyle.Short)
        .setValue(embed.data.footer?.text || '')
        .setRequired(false);

    const footerIconInput = new TextInputBuilder()
        .setCustomId('footerIcon')
        .setLabel('Footer Icon URL')
        .setStyle(TextInputStyle.Short)
        .setValue(embed.data.footer?.iconURL || '')
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(footerTextInput),
        new ActionRowBuilder().addComponents(footerIconInput)
    );

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === 'footer_modal',
            time: 60000
        });

        const footerText = modalInteraction.fields.getTextInputValue('footerText');
        const footerIcon = modalInteraction.fields.getTextInputValue('footerIcon');

        if (footerIcon && !isValidHttpUrl(footerIcon)) {
            await modalInteraction.reply({ content: 'Invalid icon URL. Please provide a valid URL for the footer icon.', flags: MessageFlags.Ephemeral });
            return;
        }

        try {
            if (footerText || footerIcon) {
                embed.setFooter({ 
                    text: footerText || null, 
                    iconURL: footerIcon || null
                });
            } else {
                embed.setFooter(null);
            }
            await modalInteraction.update({ embeds: [embed], components: combineComponents(components, linkButtons), flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('Error setting footer:', error);
            let errorMessage = 'An unexpected error occurred while setting the footer. Please try again.';
            await modalInteraction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
        }
    } catch (error) {
        console.error('Error in footer modal:', error);
        if (error.code === 'InteractionCollectorError') {
            await interaction.followUp({ content: 'The footer modal timed out. Please try again.', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.followUp({ content: 'An error occurred while setting the footer. Please try again.', flags: MessageFlags.Ephemeral });
        }
    }
}

async function showThumbnailModal(interaction, embed, components, linkButtons) {
    const modal = new ModalBuilder()
        .setCustomId('thumbnail_modal')
        .setTitle('Set Thumbnail Image');

    const thumbnailInput = new TextInputBuilder()
        .setCustomId('thumbnailUrl')
        .setLabel('Thumbnail URL')
        .setStyle(TextInputStyle.Short)
        .setValue(embed.data.thumbnail?.url || '')
        .setRequired(false);

    modal.addComponents(new ActionRowBuilder().addComponents(thumbnailInput));

    await interaction.showModal(modal);

    const filter = (interaction) => interaction.customId === 'thumbnail_modal';
    interaction.awaitModalSubmit({ filter, time: 60000 })
        .then(async modalInteraction => {
            const thumbnailUrl = modalInteraction.fields.getTextInputValue('thumbnailUrl');
            if (thumbnailUrl && isValidHttpUrl(thumbnailUrl) && isImageUrl(thumbnailUrl)) {
                embed.setThumbnail(thumbnailUrl);
            } else if (!thumbnailUrl) {
                embed.setThumbnail(null);
            } else {
                await modalInteraction.reply({ content: 'Invalid image URL. Please provide a valid image URL.', flags: MessageFlags.Ephemeral });
                return;
            }
            await modalInteraction.update({ embeds: [embed], components: combineComponents(components, linkButtons), flags: MessageFlags.Ephemeral });
        })
        .catch(error => {
            console.error('Error in thumbnail modal:', error);
            if (error.code === 'InteractionCollectorError') {
                interaction.followUp({ content: 'The thumbnail modal timed out. Please try again.', flags: MessageFlags.Ephemeral });
            } else {
                interaction.followUp({ content: 'An error occurred while setting the thumbnail. Please try again.', flags: MessageFlags.Ephemeral });
            }
        });
}

async function showImageModal(interaction, embed, components, linkButtons) {
    const modal = new ModalBuilder()
        .setCustomId('image_modal')
        .setTitle('Set Large Image');

    const imageInput = new TextInputBuilder()
        .setCustomId('imageUrl')
        .setLabel('Image URL')
        .setStyle(TextInputStyle.Short)
        .setValue(embed.data.image?.url || '')
        .setRequired(false);

    modal.addComponents(new ActionRowBuilder().addComponents(imageInput));

    await interaction.showModal(modal);

    const filter = (interaction) => interaction.customId === 'image_modal';
    interaction.awaitModalSubmit({ filter, time: 60000 })
        .then(async modalInteraction => {
            const imageUrl = modalInteraction.fields.getTextInputValue('imageUrl');
            if (imageUrl && isValidHttpUrl(imageUrl) && isImageUrl(imageUrl)) {
                embed.setImage(imageUrl);
            } else if (!imageUrl) {
                embed.setImage(null);
            } else {
                await modalInteraction.reply({ content: 'Invalid image URL. Please provide a valid image URL.', flags: MessageFlags.Ephemeral });
                return;
            }
            await modalInteraction.update({ embeds: [embed], components: combineComponents(components, linkButtons), flags: MessageFlags.Ephemeral });
        })
        .catch(error => {
            console.error('Error in image modal:', error);
            if (error.code === 'InteractionCollectorError') {
                interaction.followUp({ content: 'The image modal timed out. Please try again.', flags: MessageFlags.Ephemeral });
            } else {
                interaction.followUp({ content: 'An error occurred while setting the image. Please try again.', flags: MessageFlags.Ephemeral });
            }
        });
}

async function showColorModal(interaction, embed, components, linkButtons) {
    const modal = new ModalBuilder()
        .setCustomId('color_modal')
        .setTitle('Set Embed Color');

    const colorInput = new TextInputBuilder()
        .setCustomId('colorValue')
        .setLabel('Color (Hex code or integer)')
        .setStyle(TextInputStyle.Short)
        .setValue(embed.data.color ? embed.data.color.toString(16) : '')
        .setRequired(false);

    modal.addComponents(new ActionRowBuilder().addComponents(colorInput));

    await interaction.showModal(modal);

    const filter = (interaction) => interaction.customId === 'color_modal';
    interaction.awaitModalSubmit({ filter, time: 60000 })
        .then(async modalInteraction => {
            const colorValue = modalInteraction.fields.getTextInputValue('colorValue');
            if (colorValue) {
                try {
                    embed.setColor(colorValue);
                } catch (error) {
                    await modalInteraction.reply({ content: 'Invalid color value. Please provide a valid hex code or integer.', flags: MessageFlags.Ephemeral });
                    return;
                }
            } else {
                embed.setColor(null);
            }
            await modalInteraction.update({ embeds: [embed], components: combineComponents(components, linkButtons), flags: MessageFlags.Ephemeral });
        })
        .catch(error => {
            console.error('Error in color modal:', error);
            if (error.code === 'InteractionCollectorError') {
                interaction.followUp({ content: 'The color modal timed out. Please try again.', flags: MessageFlags.Ephemeral });
            } else {
                interaction.followUp({ content: 'An error occurred while setting the color. Please try again.', flags: MessageFlags.Ephemeral });
            }
        });
}

async function saveTemplate(interaction, embed, linkButtons) {
    const modal = new ModalBuilder()
        .setCustomId('save_template_modal')
        .setTitle('Save Embed Template');

    const templateNameInput = new TextInputBuilder()
        .setCustomId('templateName')
        .setLabel('Template Name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(templateNameInput));

    await interaction.showModal(modal);

    const filter = (interaction) => interaction.customId === 'save_template_modal';
    interaction.awaitModalSubmit({ filter, time: 60000 })
        .then(async modalInteraction => {
            const templateName = modalInteraction.fields.getTextInputValue('templateName');

            const existingTemplate = await EmbedTemplate.findOne({ name: templateName });
            if (existingTemplate) {
                await modalInteraction.reply({ content: 'A template with this name already exists. Please choose a different name.', flags: MessageFlags.Ephemeral });
                return;
            }

            const newTemplate = new EmbedTemplate({
                name: templateName,
                embedData: embed.toJSON(),
                linkButtons: linkButtons.map(button => button.toJSON())
            });

            await newTemplate.save();
            await modalInteraction.reply({ content: 'Template saved successfully!', flags: MessageFlags.Ephemeral });
        })
        .catch(error => {
            console.error('Error in save template modal:', error);
            if (error.code === 'InteractionCollectorError') {
                interaction.followUp({ content: 'The save template modal timed out. Please try again.', flags: MessageFlags.Ephemeral });
            } else {
                interaction.followUp({ content: 'An error occurred while saving the template. Please try again.', flags: MessageFlags.Ephemeral });
            }
        });
}

async function loadTemplate(interaction, embed, components, linkButtons) {
    const templateIndex = parseInt(interaction.values[0].split('_')[1]);
    const templates = await EmbedTemplate.find().select('name');
    const template = await EmbedTemplate.findOne({ name: templates[templateIndex].name });

    if (template) {
        Object.assign(embed, new EmbedBuilder(template.embedData));
        linkButtons.splice(0, linkButtons.length, ...template.linkButtons.map(button => ButtonBuilder.from(button)));

        await interaction.update({ embeds: [embed], components: combineComponents(components, linkButtons), flags: MessageFlags.Ephemeral });
    } else {
        await interaction.reply({ content: 'Template not found.', flags: MessageFlags.Ephemeral });
    }
}

async function promptAndDeleteTemplate(interaction) {
    const templates = await EmbedTemplate.find().select('name');
    if (templates.length === 0) {
        await interaction.reply({ content: 'There are no templates to delete.', flags: MessageFlags.Ephemeral });
        return;
    }

    const options = templates.map(template => ({
        label: template.name,
        value: template.name
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('delete_template_select')
        .setPlaceholder('Select a template to delete')
        .addOptions(options);

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ content: 'Select a template to delete:', components: [actionRow], flags: MessageFlags.Ephemeral });

    const filter = i => i.user.id === interaction.user.id && i.customId === 'delete_template_select';
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async i => {
        const templateName = i.values[0];
        const result = await EmbedTemplate.deleteOne({ name: templateName });

        if (result.deletedCount > 0) {
            await i.update({ content: `Template '${templateName}' deleted successfully.`, components: [], flags: MessageFlags.Ephemeral });
        } else {
            await i.update({ content: `Template '${templateName}' not found.`, components: [], flags: MessageFlags.Ephemeral });
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            interaction.editReply({ content: 'Template deletion cancelled.', components: [], flags: MessageFlags.Ephemeral });
        }
    });
}

async function addLinkButton(interaction, embed, linkButtons, components) {
    const maxActionRows = 5;
    const usedActionRows = Math.ceil(linkButtons.length / 5);
    const availableRows = maxActionRows - 4;
    const maxLinkButtons = availableRows * 5;

    if (linkButtons.length >= maxLinkButtons) {
        await interaction.reply({ 
            content: `Cannot add more link buttons. Maximum of ${maxLinkButtons} link buttons reached.`, 
            flags: MessageFlags.Ephemeral 
        });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId('add_link_button_modal')
        .setTitle('Add Link Button');

    const urlInput = new TextInputBuilder()
        .setCustomId('buttonUrl')
        .setLabel('Button URL')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const labelInput = new TextInputBuilder()
        .setCustomId('buttonLabel')
        .setLabel('Button Label')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const emojiInput = new TextInputBuilder()
        .setCustomId('buttonEmoji')
        .setLabel('Button Emoji')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(urlInput),
        new ActionRowBuilder().addComponents(labelInput),
        new ActionRowBuilder().addComponents(emojiInput)
    );

    await interaction.showModal(modal);

    const filter = (interaction) => interaction.customId === 'add_link_button_modal';
    interaction.awaitModalSubmit({ filter, time: 60000 })
        .then(async modalInteraction => {
            const url = modalInteraction.fields.getTextInputValue('buttonUrl');
            const label = modalInteraction.fields.getTextInputValue('buttonLabel');
            const emoji = modalInteraction.fields.getTextInputValue('buttonEmoji');

            if (!isValidHttpUrl(url)) {
                await modalInteraction.reply({ content: 'Invalid URL. Please provide a valid URL.', flags: MessageFlags.Ephemeral });
                return;
            }

            const newButton = new ButtonBuilder()
                .setURL(url)
                .setLabel(label)
                .setStyle(ButtonStyle.Link);

            if (emoji) {
                newButton.setEmoji(emoji);
            }

            linkButtons.push(newButton);

            await modalInteraction.update({ embeds: [embed], components: combineComponents(components, linkButtons), flags: MessageFlags.Ephemeral });
        })
        .catch(error => {
            console.error('Error in add link button modal:', error);
            if (error.code === 'InteractionCollectorError') {
                interaction.followUp({ content: 'The add link button modal timed out. Please try again.', flags: MessageFlags.Ephemeral });
            } else {
                interaction.followUp({ content: 'An error occurred while adding the link button. Please try again.', flags: MessageFlags.Ephemeral });
            }
        });
}

async function removeLinkButton(interaction, embed, linkButtons, components) {
    if (linkButtons.length === 0) {
        await interaction.reply({ content: 'There are no link buttons to remove.', flags: MessageFlags.Ephemeral });
        return;
    }

    const options = linkButtons.map((button, index) => ({
        label: button.data.label,
        value: index.toString()
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('removelink_select')
        .setPlaceholder('Select a link button to remove')
        .addOptions(options);

    const removeComponents = [
        new ActionRowBuilder().addComponents(selectMenu)
    ];

    await interaction.reply({ content: 'Select a link button to remove:', components: removeComponents, flags: MessageFlags.Ephemeral });

    const filter = i => i.user.id === interaction.user.id && i.customId === 'removelink_select';
    const removeCollector = interaction.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

    removeCollector.on('collect', async i => {
        const selectedId = parseInt(i.values[0], 10);
        linkButtons.splice(selectedId, 1);

        await i.update({ embeds: [embed], components: combineComponents(components, linkButtons), flags: MessageFlags.Ephemeral });
    });

    removeCollector.on('end', async collected => {
        if (collected.size === 0) {
            await interaction.followUp({ content: 'No button selected, operation cancelled.', flags: MessageFlags.Ephemeral });
        }
    });
}

async function postEmbed(i, embed, linkButtons, messageId) {
    const actionRows = linkButtonsToComponents(linkButtons);
    const embedData = i.client.embedData && i.client.embedData[i.user.id] ? i.client.embedData[i.user.id] : {};
    const {
        aboveText = '',
        aboveImageUrl = '',
        suppressPings = false
    } = embedData;

    try {
        if (aboveImageUrl) {
            await i.channel.send({ content: aboveImageUrl });
        }

        const messageOptions = {
            content: aboveText,
            embeds: [embed],
            components: actionRows,
            allowedMentions: suppressPings ? { parse: [] } : undefined
        };

        if (messageId) {
            try {
                const message = await i.channel.messages.fetch(messageId);
                await message.edit(messageOptions);
                await i.reply({ content: 'Successfully edited the embed!', flags: MessageFlags.Ephemeral });
            } catch (error) {
                if (error.code === 50005) {
                    await i.reply({ content: 'I do not have permission to edit this message. Please ensure I have the necessary permissions.', flags: MessageFlags.Ephemeral });
                } else if (error.code === 10008) {
                    await i.reply({ content: 'The message was not found. It might have been deleted.', flags: MessageFlags.Ephemeral });
                } else {
                    throw error;
                }
            }
        } else {
            await i.channel.send(messageOptions);
            await i.reply({ content: 'Successfully posted the embed!', flags: MessageFlags.Ephemeral });
        }

        if (i.client.embedData && i.client.embedData[i.user.id]) {
            delete i.client.embedData[i.user.id];
        }
    } catch (error) {
        console.error('Error posting embed:', error);
        if (!i.replied && !i.deferred) {
            await i.reply({ content: 'An error occurred while posting the embed. Please try again.', flags: MessageFlags.Ephemeral });
        } else {
            await i.followUp({ content: 'An error occurred while posting the embed. Please try again.', flags: MessageFlags.Ephemeral });
        }
    }
}

function combineComponents(mainComponents, linkButtons) {
    const combined = [...mainComponents];
    const linkButtonRows = linkButtonsToComponents(linkButtons);
    const remainingSpace = 5 - combined.length;
    combined.push(...linkButtonRows.slice(0, remainingSpace));
    return combined;
}

function linkButtonsToComponents(linkButtons) {
    const actionRows = [];
    for (let i = 0; i < linkButtons.length; i += 5) {
        const row = new ActionRowBuilder().addComponents(linkButtons.slice(i, Math.min(i + 5, linkButtons.length)));
        actionRows.push(row);
    }
    return actionRows;
}

function isValidHttpUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}

function isImageUrl(url) {
    return /\.(jpeg|jpg|gif|png|svg)$/i.test(url);
}

async function showAboveImageModal(interaction, embed, components, linkButtons) {
    const modal = new ModalBuilder()
        .setCustomId('aboveimage_modal')
        .setTitle('Set Image Above Embed');

    const imageInput = new TextInputBuilder()
        .setCustomId('aboveImageUrl')
        .setLabel('Image URL')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter a valid image URL')
        .setRequired(false);

    modal.addComponents(new ActionRowBuilder().addComponents(imageInput));

    try {
        await interaction.showModal(modal);

        const modalInteraction = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === 'aboveimage_modal',
            time: 60000
        });

        const imageUrl = modalInteraction.fields.getTextInputValue('aboveImageUrl');

        if (!interaction.client.embedData) {
            interaction.client.embedData = {};
        }
        if (!interaction.client.embedData[interaction.user.id]) {
            interaction.client.embedData[interaction.user.id] = {};
        }

        interaction.client.embedData[interaction.user.id] = {
            ...interaction.client.embedData[interaction.user.id],
            aboveImageUrl: imageUrl
        };

        await modalInteraction.update({
            content: imageUrl ? `Image above embed has been set to: "${imageUrl}"` : 'Image above embed has been cleared.',
            embeds: [embed],
            components: combineComponents(components, linkButtons),
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error in above image modal:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'An error occurred while setting the image above the embed. Please try again.', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.followUp({ content: 'An error occurred while setting the image above the embed. Please try again.', flags: MessageFlags.Ephemeral });
        }
    }
}

async function showAddFieldModal(interaction, embed, components, linkButtons) {
    const modal = new ModalBuilder()
        .setCustomId('add_field_modal')
        .setTitle('Add Embed Field');

    const nameInput = new TextInputBuilder()
        .setCustomId('fieldName')
        .setLabel('Field Name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const valueInput = new TextInputBuilder()
        .setCustomId('fieldValue')
        .setLabel('Field Value')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const inlineInput = new TextInputBuilder()
        .setCustomId('fieldInline')
        .setLabel('Inline? (true/false)')
        .setStyle(TextInputStyle.Short)
        .setValue('false')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(valueInput),
        new ActionRowBuilder().addComponents(inlineInput)
    );

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === 'add_field_modal',
            time: 60000
        });

        const name = modalInteraction.fields.getTextInputValue('fieldName');
        const value = modalInteraction.fields.getTextInputValue('fieldValue');
        const inline = modalInteraction.fields.getTextInputValue('fieldInline').toLowerCase() === 'true';

        if (!embed.data.fields) {
            embed.data.fields = [];
        }

        embed.addFields({ name, value, inline });
        await modalInteraction.update({ embeds: [embed], components: combineComponents(components, linkButtons), flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Error in add field modal:', error);
        if (error.code === 'InteractionCollectorError') {
            await interaction.followUp({ content: 'The add field modal timed out. Please try again.', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.followUp({ content: 'An error occurred while adding the field. Please try again.', flags: MessageFlags.Ephemeral });
        }
    }
}

async function removeField(interaction, embed, components, linkButtons) {
    if (!embed.data.fields || embed.data.fields.length === 0) {
        await interaction.reply({ content: 'There are no fields to remove.', flags: MessageFlags.Ephemeral });
        return;
    }

    const options = embed.data.fields.map((field, index) => ({
        label: field.name.substring(0, 100),
        description: field.value.substring(0, 100),
        value: index.toString()
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('removefield_select')
        .setPlaceholder('Select a field to remove')
        .addOptions(options);

    const removeComponents = [
        new ActionRowBuilder().addComponents(selectMenu)
    ];

    const response = await interaction.reply({ 
        content: 'Select a field to remove:', 
        components: removeComponents, 
        flags: MessageFlags.Ephemeral,
        withResponse: true
    });

    try {
        const confirmation = await response.awaitMessageComponent({ 
            filter: i => i.user.id === interaction.user.id && i.customId === 'removefield_select',
            time: 60000 
        });

        const selectedId = parseInt(confirmation.values[0], 10);
        const fields = [...embed.data.fields];
        fields.splice(selectedId, 1);
        embed.setFields(fields);

        await interaction.editReply({ 
            content: 'Field removed successfully!',
            embeds: [embed], 
            components: combineComponents(components, linkButtons), 
            flags: MessageFlags.Ephemeral 
        });
    } catch (error) {
        if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
            await interaction.editReply({ 
                content: 'No field selected, operation cancelled.', 
                components: [], 
                flags: MessageFlags.Ephemeral 
            });
        } else {
            console.error('Error in remove field:', error);
            await interaction.editReply({ 
                content: 'An error occurred while removing the field.', 
                components: [], 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
}

async function togglePings(interaction, embed, components, linkButtons) {
    if (!interaction.client.embedData) {
        interaction.client.embedData = {};
    }
    if (!interaction.client.embedData[interaction.user.id]) {
        interaction.client.embedData[interaction.user.id] = {};
    }

    const currentState = interaction.client.embedData[interaction.user.id].suppressPings || false;
    interaction.client.embedData[interaction.user.id].suppressPings = !currentState;

    await interaction.update({
        embeds: [embed],
        components: combineComponents(components, linkButtons),
        flags: MessageFlags.Ephemeral
    });

    await interaction.followUp({
        content: `🔔 Pings are now ${!currentState ? 'suppressed' : 'enabled'}`,
        flags: MessageFlags.Ephemeral
    });
}

async function showGenericModal(interaction, embed, components, linkButtons) {
    try {
        await interaction.showModal(modal);

        const modalSubmitInteraction = await interaction.awaitModalSubmit({
            filter: (i) => i.customId === modal.data.custom_id && i.user.id === interaction.user.id,
            time: 120000
        });

        await modalSubmitInteraction.update({ 
            embeds: [embed], 
            components: combineComponents(components, linkButtons), 
            flags: MessageFlags.Ephemeral 
        });
    } catch (error) {
        if (error.code === 'InteractionCollectorError') {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.followUp({ 
                    content: 'The modal timed out. Please try again.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        console.error('Error in modal:', error);
        const errorMessage = 'An error occurred. Please try again.';
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
        }
    }
}