const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    MessageFlags
} = require('discord.js');
//const mongoose = require('mongoose');
const AutoResponse = require('../../models/autoResponse.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoresponse')
        .setDescription('Manage auto responses')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('create')
                .setDescription('Create a new auto response')
                .addStringOption((option) =>
                    option
                        .setName('trigger')
                        .setDescription('The trigger word/phrase')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('type')
                        .setDescription('Response type')
                        .addChoices(
                            { name: 'Text', value: 'TEXT' },
                            { name: 'Embed', value: 'EMBED' }
                        )
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('whitelist_roles')
                        .setDescription('Comma-separated role IDs to whitelist')
                )
                .addStringOption((option) =>
                    option
                        .setName('blacklist_roles')
                        .setDescription('Comma-separated role IDs to blacklist')
                )
                .addStringOption((option) =>
                    option
                        .setName('whitelist_channels')
                        .setDescription('Comma-separated channel IDs to whitelist')
                )
                .addStringOption((option) =>
                    option
                        .setName('blacklist_channels')
                        .setDescription('Comma-separated channel IDs to blacklist')
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing auto response')
                .addStringOption((option) =>
                    option
                        .setName('trigger')
                        .setDescription('The trigger word/phrase')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('delete')
                .setDescription('Delete an auto response')
                .addStringOption((option) =>
                    option
                        .setName('trigger')
                        .setDescription('The trigger word/phrase')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('list').setDescription('List all auto responses')
        ),
        category: 'Utility',
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        const subcommand = interaction.options.getSubcommand();
        const trigger = interaction.options.getString('trigger');

        switch (subcommand) {
            case 'create':
                await handleCreateAutoResponse(interaction, trigger);
                break;
            case 'edit':
                await handleEditAutoResponse(interaction, trigger);
                break;
            case 'delete':
                await handleDeleteAutoResponse(interaction, trigger);
                break;
            case 'list':
                await handleListAutoResponses(interaction);
                break;
        }
    },
};

async function handleCreateAutoResponse(interaction, trigger) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const existingResponse = await AutoResponse.findOne({ trigger });
        if (existingResponse) {
            return interaction.editReply({
                content: 'An auto response with this trigger already exists.',
            });
        }

        const responseType = interaction.options.getString('type');
        const whitelistRoles = getArrayFromString(interaction.options.getString('whitelist_roles'));
        const blacklistRoles = getArrayFromString(interaction.options.getString('blacklist_roles'));
        const whitelistChannels = getArrayFromString(interaction.options.getString('whitelist_channels'));
        const blacklistChannels = getArrayFromString(interaction.options.getString('blacklist_channels'));

        const options = {
            whitelistRoles,
            blacklistRoles,
            whitelistChannels,
            blacklistChannels,
        };

        if (responseType === 'EMBED') {
            await startEmbedBuilder(interaction, trigger, options);
        } else {
            const filter = (m) => m.author.id === interaction.user.id;
            await interaction.followUp({
                content: 'Please enter the text response for this auto response:',
                flags: MessageFlags.Ephemeral,
            });

            const messages = await interaction.channel.awaitMessages({
                filter,
                max: 1,
                time: 60000,
            });
            const message = messages.first();

            if (message) {
                const newResponse = new AutoResponse({
                    guildId: interaction.guild.id,
                    trigger,
                    responseType: 'TEXT',
                    responseText: message.content.trim(),
                    ...options,
                });
                await newResponse.save();
                await message.delete();
                await interaction.editReply({
                    content: `Auto response for "${trigger}" created!`,
                });
            } else {
                await interaction.editReply({
                    content: 'No text response provided. Auto response creation canceled.',
                });
            }
        }
    } catch (error) {
        console.error("Error in handleCreateAutoResponse:", error);
        await interaction.editReply({
            content: `An error occurred: ${error.message}`,
        });
    }
}

async function handleEditAutoResponse(interaction, trigger) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const autoResponse = await AutoResponse.findOne({ 
        guildId: interaction.guild.id,
        trigger 
    });
    if (!autoResponse) {
        return interaction.editReply({
            content: 'No auto response found with this trigger.',
        });
    }

    const options = {
        guildId: interaction.guild.id,
        whitelistRoles: autoResponse.whitelistRoles,
        blacklistRoles: autoResponse.blacklistRoles,
        whitelistChannels: autoResponse.whitelistChannels,
        blacklistChannels: autoResponse.blacklistChannels,
        embedData: autoResponse.embedData,
    };


    if (autoResponse.responseType === 'EMBED') {
        await startEmbedBuilder(interaction, trigger, options);
    } else if (autoResponse.responseType === 'TEXT') {
        await promptForTextResponse(interaction, autoResponse);
    } else {
        return interaction.editReply({
            content: 'Unknown response type, cannot edit this auto response.',
        });
    }
}

async function handleDeleteAutoResponse(interaction, trigger) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await AutoResponse.deleteOne({ 
        guildId: interaction.guild.id,
        trigger 
    });
    if (result.deletedCount === 0) {
        return interaction.editReply({
            content: 'No auto response found with this trigger.',
        });
    }

    interaction.editReply({ content: `Auto response for "${trigger}" deleted.` });
}

async function handleListAutoResponses(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const responses = await AutoResponse.find({ guildId: interaction.guild.id });
    if (responses.length === 0) {
        return interaction.editReply({ content: 'No auto responses are set.', flags: MessageFlags.Ephemeral });
    }

    const listFields = responses.map((response) => {
        const responseType = response.responseType === 'EMBED' ? 'Embed' : 'Text';
        const whitelistRoles = formatArrayAsMentions(response.whitelistRoles, 'role');
        const blacklistRoles = formatArrayAsMentions(response.blacklistRoles, 'role');
        const whitelistChannels = formatArrayAsMentions(response.whitelistChannels, 'channel');
        const blacklistChannels = formatArrayAsMentions(response.blacklistChannels, 'channel');

        return {
            name: `Trigger: "${response.trigger}" (${responseType})`,
            value: `**Allowed Roles:** ${whitelistRoles}\n**Denied Roles:** ${blacklistRoles}\n**Allowed Channels:** ${whitelistChannels}\n**Denied Channels:** ${blacklistChannels}`,
            inline: false
        };
    });

    const embed = new EmbedBuilder()
        .setTitle('Auto Responses List')
        .setDescription('Here are the currently configured auto responses for this server:')
        .addFields(listFields)
        .setColor('#5865F2')
        .setFooter({ text: 'Use /autoresponse create to add more responses.' });

    return interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function startEmbedBuilder(interaction, trigger, options) {
    try {

        let embed = options.embedData
            ? new EmbedBuilder(options.embedData)
            : new EmbedBuilder()
                .setTitle('Embed Builder')
                .setDescription('Use the buttons below to customize your embed.');

        if (!embed.data.description) {
            embed.setDescription('No description provided');
        }

        const id = Date.now().toString();

        const components = createEmbedBuilderComponents(id);

        await interaction.editReply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 900000,
        });

        collector.on('collect', async (i) => {
            await i.deferUpdate();
            const action = i.customId.split('_')[0];
            await handleEmbedBuilderAction(action, i, embed, trigger, options, collector);
        });

        collector.on('end', async () => {
            if (collector.endedReason !== 'time') return;
            await interaction.editReply({
                content: 'Embed builder session ended due to inactivity.',
                components: [],
                embeds: [],
                flags: MessageFlags.Ephemeral,
            });
        });
    } catch (error) {
        console.error("Error in startEmbedBuilder:", error);
        await interaction.editReply({
            content: `An error occurred while starting the embed builder: ${error.message}`,
        });
    }
}

async function handleEmbedBuilderAction(action, interaction, embed, trigger, options, collector) {
    switch (action) {
        case 'title':
        case 'description':
        case 'author':
        case 'authoricon':
        case 'footer':
        case 'footericon':
        case 'thumbnail':
        case 'image':
        case 'color':
            await promptAndSetField(interaction, action, embed, action === 'color', ['authoricon', 'footericon', 'thumbnail', 'image'].includes(action));
            break;
        case 'timestamp':
            embed.setTimestamp();
            await interaction.editReply({ embeds: [embed], components: interaction.message.components, flags: MessageFlags.Ephemeral });
            break;
        case 'save':
            if (!embed.data.title && !embed.data.description) {
                return interaction.followUp({
                    content: 'Embeds must have at least a title or description before they can be saved.',
                    flags: MessageFlags.Ephemeral,
                });
            }
            console.log('Saving AutoResponse with options:', options);
            await saveAutoResponse(trigger, embed, null, { ...options, guildId: interaction.guild.id });
            collector.stop();
            await interaction.editReply({
                content: `Auto response for "${trigger}" saved!`,
                components: [],
                embeds: [],
                flags: MessageFlags.Ephemeral,
            });
            break;
    }
}

async function saveAutoResponse(trigger, embed, autoResponse = null, options = {}) {
    const { whitelistRoles = [], blacklistRoles = [], whitelistChannels = [], blacklistChannels = [], guildId } = options;

    if (!autoResponse) {
        autoResponse = new AutoResponse({
            guildId,
            trigger,
            responseType: 'EMBED',
            embedData: embed.toJSON(),
            whitelistRoles,
            blacklistRoles,
            whitelistChannels,
            blacklistChannels,
        });
    } else {
        autoResponse.responseType = 'EMBED';
        autoResponse.embedData = embed.toJSON();
        autoResponse.whitelistRoles = whitelistRoles;
        autoResponse.blacklistRoles = blacklistRoles;
        autoResponse.whitelistChannels = whitelistChannels;
        autoResponse.blacklistChannels = blacklistChannels;
    }

    await autoResponse.save();
}

async function promptAndSetField(interaction, fieldName, embed, isColor = false, isImage = false) {
    const filter = (m) => m.author.id === interaction.user.id;
    await interaction.followUp({
        content: `Please enter the ${fieldName} (or type "none" to unset):`,
        flags: MessageFlags.Ephemeral,
    });

    const messages = await interaction.channel.awaitMessages({
        filter,
        max: 1,
        time: 60000,
    });

    const message = messages.first();

    if (message) {
        let content = message.content.trim();
        if (content.toLowerCase() === 'none') {
            content = '';
        } else if (isImage && !isValidHttpUrl(content)) {
            await interaction.followUp({
                content: 'Invalid URL, please try again.',
                flags: MessageFlags.Ephemeral,
            });
            await message.delete();
            return;
        } else if (isColor && !/^#[0-9A-F]{6}$/i.test(content)) {
            await interaction.followUp({
                content: 'Invalid color code, please enter a hex code (e.g., #FF5733).',
                flags: MessageFlags.Ephemeral,
            });
            await message.delete();
            return;
        }

        setEmbedField(embed, fieldName, content);
        await message.delete();
        await interaction.editReply({ embeds: [embed], components: interaction.message.components, flags: MessageFlags.Ephemeral });
    } else {
        await interaction.followUp({
            content: 'No input received, operation cancelled.',
            flags: MessageFlags.Ephemeral,
        });
    }
}

function setEmbedField(embed, fieldName, content) {
    switch (fieldName.toLowerCase()) {
        case 'title':
            embed.setTitle(content || null);
            break;
        case 'description':
            embed.setDescription(content || null);
            break;
        case 'author':
            embed.setAuthor({ name: content || null, iconURL: embed.data.author?.iconURL || null });
            break;
        case 'authoricon':
            embed.setAuthor({ name: embed.data.author?.name || null, iconURL: content || null });
            break;
        case 'footer':
            embed.setFooter({ text: content || null, iconURL: embed.data.footer?.iconURL || null });
            break;
        case 'footericon':
            embed.setFooter({ text: embed.data.footer?.text || null, iconURL: content || null });
            break;
        case 'thumbnail':
            embed.setThumbnail(content || null);
            break;
        case 'image':
            embed.setImage(content || null);
            break;
        case 'color':
            embed.setColor(content || null);
            break;
    }
}

function getArrayFromString(string) {
    return string ? string.split(',') : [];
}

function formatArrayAsMentions(array, type) {
    if (!array.length) return 'None';
    const prefix = type === 'role' ? '@&' : '#';
    return array.map(id => `<${prefix}${id}>`).join(', ');
}

function createEmbedBuilderComponents(id) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`title_${id}`).setLabel('Title').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`description_${id}`).setLabel('Description').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`author_${id}`).setLabel('Author').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`authoricon_${id}`).setLabel('Author Icon').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`footer_${id}`).setLabel('Footer').setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`footericon_${id}`).setLabel('Footer Icon').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`thumbnail_${id}`).setLabel('Thumbnail').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`image_${id}`).setLabel('Image').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`color_${id}`).setLabel('Color').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`timestamp_${id}`).setLabel('Timestamp').setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`save_${id}`).setLabel('Save').setStyle(ButtonStyle.Primary)
        ),
    ];
}

function isValidHttpUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}