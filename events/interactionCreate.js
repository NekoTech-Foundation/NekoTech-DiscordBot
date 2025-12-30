const {
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const sharp = require('sharp');
const axios = require('axios');
const { getConfig, getLang, getCommands } = require('../utils/configLoader.js');
const config = getConfig();
const lang = getLang();
const { handleVerificationInteraction } = require('../commands/Addons/Verification/interaction');
const suggestionActions = require('../events/Suggestions/suggestionActions');
const giveawayActions = require('../events/Giveaways/giveawayActions.js');
const Ticket = require('../models/tickets');
const Blacklist = require('../models/blacklist');
const Giveaway = require('../models/Giveaway');
const client = require("../index");
const tiktok = require('@tobyg74/tiktok-api-dl'); // Require the new library

function getFormattedReason(reasonValue, customReason = null) {
    if (customReason) return customReason;
    if (!reasonValue) return config.TicketSettings.CloseReasons.DefaultReason;

    const reasonMap = {
        'resolved': '✅ Issue Resolved',
        'user_request': '👋 User Request',
        'inactive': '⏰ Inactive',
        'invalid': '❌ Invalid'
    };
    return reasonMap[reasonValue] || config.TicketSettings.CloseReasons.DefaultReason;
}

async function processTicketDeletion(client, interaction, ticket, forceDelete = false) {
    try {
        if (!interaction.member) {
            interaction.member = await interaction.guild.members.fetch(client.user.id);
        }

        if (!interaction.guild) {
            throw new Error('Interaction guild is undefined');
        }

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const ticketType = config.TicketTypes[ticket.ticketType];

        if (!forceDelete && ticketType && ticketType.RestrictDeletion) {
            const hasSupportRole = ticketType.SupportRole.some(roleId => memberRoles.includes(roleId));

            if (!hasSupportRole) {
                const responseMessage = 'You do not have permission to delete this ticket.';
                await replyOrFollowUp(interaction, responseMessage);
                return;
            }
        }

        if (ticket.status === 'deleting' || ticket.status === 'deleted') {
            const responseMessage = lang.Tickets.Deleting;
            await replyOrFollowUp(interaction, responseMessage);
            return;
        }

        const updatedTicket = await Ticket.findOneAndUpdate(
            { ticketId: ticket.ticketId, status: { $nin: ['deleting', 'deleted'] } },
            { status: 'deleting' },
            { new: true }
        );

        if (!updatedTicket) {
            const responseMessage = lang.Tickets.Deleting;
            await replyOrFollowUp(interaction, responseMessage);
            return;
        }

        const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
        if (channel) {
            const deletionTime = parseInt(config.TicketSettings.DeletionTime, 10) || 0;

            const fetchedMessages = await channel.messages.fetch({ limit: 100 });
            const userMessages = fetchedMessages.filter(m => !m.author.bot);

            const deleteChannelAndMarkAsDeleted = async () => {
                try {
                    await sendDMEmbedAndTranscript(client, interaction, updatedTicket, 'delete', userMessages);

                    if (channel.deletable) {
                        await channel.delete();

                        await Ticket.findOneAndUpdate(
                            { ticketId: ticket.ticketId },
                            { status: 'deleted', deletedAt: new Date() },
                            { new: true }
                        );
                    } else {
                        console.error('Channel is not deletable.');
                    }
                } catch (channelError) {
                    console.error('Error deleting the channel:', channelError);
                    if (channelError.code === 10003) {
                        await Ticket.findOneAndUpdate(
                            { ticketId: ticket.ticketId },
                            { status: 'deleted', deletedAt: new Date() },
                            { new: true }
                        );
                    }
                }
            };

            if (deletionTime > 0) {
                const countdownEmbed = new EmbedBuilder()
                    .setDescription(lang.Tickets.DeleteCountDown.replace('{time}', deletionTime))
                    .setColor('#FF0000');

                await channel.send({ embeds: [countdownEmbed] });

                setTimeout(deleteChannelAndMarkAsDeleted, deletionTime * 1000);
            } else {
                await deleteChannelAndMarkAsDeleted();
            }
        } else {
            const responseMessage = 'Channel not found.';
            await replyOrFollowUp(interaction, responseMessage);

            await Ticket.findOneAndUpdate(
                { ticketId: ticket.ticketId },
                { status: 'deleted', deletedAt: new Date() },
                { new: true }
            );
        }
    } catch (error) {
        console.error('Error processing ticket deletion:', error);
        const responseMessage = 'An error occurred while processing the ticket. Please try again later.';
        await replyOrFollowUp(interaction, responseMessage);
    }
}

async function handleDeleteTicket(client, interaction, uniqueId) {
    try {
        const ticket = await Ticket.findOne({ ticketId: uniqueId });

        if (!ticket) {
            const responseMessage = 'Ticket not found.';
            console.error(`No ticket found in the database with ticketId: ${uniqueId}`);
            await replyOrFollowUp(interaction, responseMessage);
            return;
        }

        if (!interaction.member) {
            interaction.member = await interaction.guild.members.fetch(client.user.id);
        }

        const deletionHandler = `delete-${ticket.ticketId}-${new Date().getTime()}`;

        await deferIfNeeded(interaction);
        await processTicketDeletion(client, interaction, ticket);
    } catch (error) {
        console.error('Error handling delete ticket:', error);
        await replyOrFollowUp(interaction, 'An error occurred while processing the ticket deletion. Please try again later.');
    }
}

async function handleTicketClose(client, interaction, uniqueId, closeReason = null, customReason = null) {
    try {
        const ticket = await Ticket.findOne({ ticketId: uniqueId });

        if (!ticket) {
            const responseMessage = 'Ticket not found.';
            console.error(`No ticket found in the database with ticketId: ${uniqueId}`);
            await replyOrFollowUp(interaction, responseMessage);
            return;
        }

        if (interaction.isCommand()) {
            const commandReason = interaction.options.getString('reason');
            const customCommandReason = interaction.options.getString('custom_reason');
            
            if (commandReason || customCommandReason) {
                ticket.closeReason = commandReason;
                ticket.customCloseReason = customCommandReason;
                await ticket.save();
            }
        }
        else if (closeReason || customReason) {
            ticket.closeReason = closeReason;
            ticket.customCloseReason = customReason;
            await ticket.save();
        }

        const ticketType = config.TicketTypes[ticket.ticketType];

        if (ticket.status === 'deleting' || ticket.status === 'deleted') {
            const responseMessage = lang.Tickets.Deleting;
            await replyOrFollowUp(interaction, responseMessage);
            return;
        }

        const isAutoAlert = interaction.user?.id === client.user.id && closeReason === 'No response after alert';

        const archiveCategoryId = ticketType && ticketType.ArchiveCategory;
        const isArchived = interaction.channel.parentId === archiveCategoryId;

        if (ticket.status === 'closed' && !isAutoAlert) {
            await deferIfNeeded(interaction);
            if (archiveCategoryId) {
                const archiveCategory = interaction.guild.channels.cache.get(archiveCategoryId);
                if (!isArchived) {
                    await replyOrFollowUp(interaction, lang.Tickets.Archive);
                    if (archiveCategory) {
                        await interaction.channel.setParent(archiveCategory.id);
                    }
                }
                await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    ViewChannel: false
                });

                const member = await interaction.guild.members.fetch(ticket.userId).catch(() => null);
                if (member) {
                    await interaction.channel.permissionOverwrites.edit(ticket.userId, {
                        ViewChannel: true,
                        SendMessages: false,
                        ReadMessageHistory: true,
                        AttachFiles: false,
                        EmbedLinks: false
                    });
                }

                for (const roleid of ticketType.SupportRole) {
                    const role = interaction.guild.roles.cache.get(roleid);
                    if (role) {
                        await interaction.channel.permissionOverwrites.edit(role, {
                            ViewChannel: true,
                            SendMessages: true,
                            ReadMessageHistory: true,
                            AttachFiles: true,
                            EmbedLinks: true
                        });
                    }
                }

                await sendArchiveEmbed(interaction, uniqueId, ticket.userId);
                await replyOrFollowUp(interaction, lang.Tickets.Archive);
                return;
            } else {
                await replyOrFollowUp(interaction, lang.Tickets.Deleting);
                await processTicketDeletion(client, interaction, ticket);
                return;
            }
        }

        await deferIfNeeded(interaction);

        const updatedTicket = await Ticket.findOneAndUpdate(
            { ticketId: uniqueId, status: { $nin: ['deleting', 'deleted', 'closed'] } },
            { status: 'closed', closedAt: new Date() },
            { new: true }
        );

        if (!updatedTicket) {
            const responseMessage = lang.Tickets.Closed;
            await replyOrFollowUp(interaction, responseMessage);
            return;
        }

        if (archiveCategoryId && !isAutoAlert) {
            const archiveCategory = interaction.guild.channels.cache.get(archiveCategoryId);
            if (!isArchived) {
                if (archiveCategory) {
                    await interaction.channel.setParent(archiveCategory.id);
                }
            }
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                ViewChannel: false
            });

            const member = await interaction.guild.members.fetch(ticket.userId).catch(() => null);
            if (member) {
                await interaction.channel.permissionOverwrites.edit(ticket.userId, {
                    ViewChannel: true,
                    SendMessages: false,
                    ReadMessageHistory: true,
                    AttachFiles: false,
                    EmbedLinks: false
                });
            }

            for (const roleid of ticketType.SupportRole) {
                const role = interaction.guild.roles.cache.get(roleid);
                if (role) {
                    await interaction.channel.permissionOverwrites.edit(role, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                        AttachFiles: true,
                        EmbedLinks: true
                    });
                }
            }

            await sendArchiveEmbed(interaction, uniqueId, ticket.userId);
            await replyOrFollowUp(interaction, lang.Tickets.Archive);
        } else {
            await replyOrFollowUp(interaction, lang.Tickets.Deletion);
            const forceDelete = isAutoAlert;
            await processTicketDeletion(client, interaction, updatedTicket, forceDelete);
            await sendDMEmbedAndTranscript(client, interaction, updatedTicket, 'close');
        }
    } catch (error) {
        console.error('Error handling ticket closing:', error);
        await replyOrFollowUp(interaction, 'An error occurred while closing the ticket. Please try again later.');
    }
}

async function deferIfNeeded(interaction) {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }
}

async function replyOrFollowUp(interaction, message) {
    if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    } else {
        await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
    }
}

async function sendDMEmbedAndTranscript(client, interaction, ticket, action, userMessages) {
    try {
        if (!userMessages) userMessages = new Map();

        const minMessages = parseInt(config.TicketTranscript.MinMessages, 10);
        if (userMessages.size < minMessages) {
            return;
        }

        let transcriptAttachment;
        const transcriptType = config.TicketTranscript.Type.toUpperCase();
        const savePath = config.TicketTranscript.SavePath;
        if (!fs.existsSync(savePath)) {
            fs.mkdirSync(savePath, { recursive: true });
        }

        if (transcriptType === "TXT") {
            const transcript = userMessages
                .map(m => `${new Date(m.createdTimestamp).toLocaleString()} - ${m.author.tag}: ${m.content}`)
                .reverse()
                .join('\n');
            const transcriptContent = transcript.length > 0 ? transcript : "No messages in this ticket.";

            const fileName = `${interaction.channel.name}-transcript.${transcriptType.toLowerCase()}`;
            const filePath = path.join(savePath, fileName);
            let tempFilePath = null;
            
            transcriptAttachment = new AttachmentBuilder(Buffer.from(transcriptContent), { name: path.basename(filePath) });

            if (config.TicketTranscript.Save) {
                try {
                    tempFilePath = `${filePath}.temp`;
                    fs.writeFileSync(tempFilePath, transcriptContent, 'utf8');
                    
                    fs.renameSync(tempFilePath, filePath);
                    tempFilePath = null;
                } catch (error) {
                    console.error('Error saving transcript:', error);
                    if (tempFilePath && fs.existsSync(tempFilePath)) {
                        try {
                            fs.unlinkSync(tempFilePath);
                            console.log(`Cleaned up temporary transcript file: ${tempFilePath}`);
                        } catch (cleanupError) {
                            console.error('Error cleaning up temporary transcript file:', cleanupError);
                        }
                    }
                }
            }
        }

        if (config.TicketSettings.Enabled) {
            await sendLog(client, interaction, ticket, userMessages, transcriptAttachment);
        }

        if (config.TicketClosureDM.Enabled) {
            await sendDM(client, interaction, ticket, userMessages, transcriptAttachment);
        }
    } catch (error) {
        console.error('Error in sendDMEmbedAndTranscript:', error);
    }
}

async function sendLog(client, interaction, ticket, userMessages, transcriptAttachment) {
    try {
        const logEmbedConfig = config.Logs.Close.Embed;
        const logsChannelId = config.TicketSettings.LogsChannelID;

        if (!logsChannelId) {
            return;
        }

        const logsChannel = interaction.guild.channels.cache.get(logsChannelId);
        if (!logsChannel) {
            return;
        }

        const logEmbed = new EmbedBuilder()
            .setColor(logEmbedConfig.Color)
            .setTimestamp();

        if (logEmbedConfig.Title) logEmbed.setTitle(logEmbedConfig.Title);
        if (logEmbedConfig.Footer && logEmbedConfig.Footer.Text) {
            logEmbed.setFooter({ text: logEmbedConfig.Footer.Text, iconURL: logEmbedConfig.Footer.Icon || null });
        }
        if (logEmbedConfig.Image) logEmbed.setImage(logEmbedConfig.Image);
        if (logEmbedConfig.Thumbnail) logEmbed.setThumbnail(logEmbedConfig.Thumbnail);

        const userTagReplacementForLog = interaction.user.tag === '/alert'
            ? `<@${interaction.user.id}> (\`/alert\`)`
            : `<@${interaction.user.id}>`;

        const closeReason = ticket.customCloseReason || 
            (ticket.closeReason ? getFormattedReason(ticket.closeReason) : config.TicketSettings.CloseReasons.DefaultReason);

        const descriptionLinesForLog = logEmbedConfig.Description.map(line =>
            replacePlaceholders(line, {
                userTag: userTagReplacementForLog,
                ticketCreator: `<@${ticket.userId}>`,
                messageCount: userMessages.size.toString(),
                priority: ticket.priority || 'N/A',
                rating: ticket.rating || lang.Tickets.ReviewNoRating,
                channelName: interaction.channel.name,
                claimer: ticket.claimed ? `<@${ticket.claimedBy}>` : "Unclaimed",
                reason: closeReason || config.TicketSettings.CloseReasons.DefaultReason
            })
        ).join('\n');

        logEmbed.setDescription(descriptionLinesForLog);

        if (ticket.closeReason || ticket.customCloseReason) {
            const reason = ticket.customCloseReason || ticket.closeReason || 'No reason provided';
            logEmbed.addFields({
                name: 'Close Reason',
                value: reason,
                inline: true
            });
        }

        const messageOptions = { embeds: [logEmbed] };
        const components = [];

        if (config.TicketTranscript.Type.toUpperCase() === "WEB") {
            const baseURL = config.Dashboard.Url;
            const webUrl = `${baseURL}/tickets/${ticket.ticketId}/transcript`;
            const transcriptButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('View Transcript')
                        .setStyle(ButtonStyle.Link)
                        .setURL(webUrl)
                );
            components.push(transcriptButton);
            messageOptions.components = components;
        } else if (transcriptAttachment) {
            messageOptions.files = [transcriptAttachment];
        }

        const logMessage = await logsChannel.send(messageOptions);
        ticket.logMessageId = logMessage.id;
        await ticket.save();
    } catch (error) {
        console.error('Error sending log:', error);
    }
}

async function sendDM(client, interaction, ticket, userMessages, transcriptAttachment) {
    try {
        const dmEmbedConfig = config.TicketClosureDM.Embed;
        const ticketOwner = await client.users.fetch(ticket.userId);
        const closeReason = ticket.customCloseReason || 
            (ticket.closeReason ? getFormattedReason(ticket.closeReason) : config.TicketSettings.CloseReasons.DefaultReason);

        const dmEmbed = new EmbedBuilder()
            .setColor(dmEmbedConfig.Color)
            .setDescription(replacePlaceholders(dmEmbedConfig.Description.join('\n'), {
                user: ticketOwner.username,
                userTag: `<@${ticket.userId}>`,
                guild: interaction.guild.name,
                messageCount: userMessages.size.toString(),
                priority: ticket.priority || 'N/A',
                claimer: ticket.claimed ? `<@${ticket.claimedBy}>` : "Unclaimed",
                reason: closeReason
            }));

        if (dmEmbedConfig.Title) dmEmbed.setTitle(dmEmbedConfig.Title);
        if (dmEmbedConfig.Footer && dmEmbedConfig.Footer.Text) {
            dmEmbed.setFooter({ text: dmEmbedConfig.Footer.Text, iconURL: dmEmbedConfig.Footer.Icon || null });
        }
        if (dmEmbedConfig.Image) dmEmbed.setImage(dmEmbedConfig.Image);
        if (dmEmbedConfig.Thumbnail) dmEmbed.setThumbnail(dmEmbedConfig.Thumbnail);

        const components = [];
        if (config.Reviews.Enabled) {
            const reviewOptions = Array.from({ length: 5 }, (_, i) => ({
                label: `${i + 1} ${config.Reviews.Text}`,
                value: `${i + 1}`,
                emoji: config.Reviews.Emoji
            }));

            const reviewSelect = new StringSelectMenuBuilder()
                .setCustomId(`review_${interaction.channel.id}`)
                .setPlaceholder(config.Reviews.Placeholder)
                .addOptions(reviewOptions);

            const reviewRow = new ActionRowBuilder().addComponents(reviewSelect);
            components.push(reviewRow);
        }

        const messageOptions = { embeds: [dmEmbed], components };

        if (config.TicketClosureDM.Transcript) {
            if (config.TicketTranscript.Type.toUpperCase() === "WEB") {
                const baseURL = config.Dashboard.Url;
                const webUrl = `${baseURL}/tickets/${ticket.ticketId}/transcript`;
                const transcriptButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('View Transcript')
                            .setStyle(ButtonStyle.Link)
                            .setURL(webUrl)
                    );
                components.push(transcriptButton);
            } else if (transcriptAttachment) {
                messageOptions.files = [transcriptAttachment];
            }
        }

        try {
            await ticketOwner.send(messageOptions);
        } catch (dmError) {
            if (dmError.code === 50007) {
                const serverMessage = `Could not send the ticket closure details via DM. Direct messages are disabled.`;
                await interaction.channel.send({ content: serverMessage });
            } else {
                console.error(`Could not send DM to user ${ticket.userId}:`, dmError);
            }
        }
    } catch (error) {
        console.error('Error sending DM:', error);
    }
}

function replacePlaceholders(text, replacements) {
    for (const key in replacements) {
        text = text.replace(new RegExp(`{${key}}`, 'g'), replacements[key]);
    }
    return text;
}

async function sendArchiveEmbed(interaction, uniqueId, userId) {
    const ticketType = config.TicketTypes[interaction.channel.topic.split(" ")[1]];
    const archiveEmbedConfig = config.ArchiveDesign.Embed;
    const archiveEmbed = new EmbedBuilder();

    const ticket = await Ticket.findOne({ ticketId: uniqueId });
    const closeReason = ticket.customCloseReason || 
        (ticket.closeReason ? getFormattedReason(ticket.closeReason) : config.TicketSettings.CloseReasons.DefaultReason);

    if (archiveEmbedConfig.Title) archiveEmbed.setTitle(archiveEmbedConfig.Title);
    if (archiveEmbedConfig.Description) {
        archiveEmbed.setDescription(
            archiveEmbedConfig.Description.join('\n')
                .replace('{user}', interaction.user.username)
                .replace('{userTag}', `<@${ticket.userId}>`)
                .replace('{reason}', closeReason)
        );
    }
    if (archiveEmbedConfig.Color) archiveEmbed.setColor(archiveEmbedConfig.Color);
    if (archiveEmbedConfig.Footer && archiveEmbedConfig.Footer.Text) {
        archiveEmbed.setFooter({ text: archiveEmbedConfig.Footer.Text, iconURL: archiveEmbedConfig.Footer.Icon || null });
    }
    if (archiveEmbedConfig.Image) archiveEmbed.setImage(archiveEmbedConfig.Image);
    if (archiveEmbedConfig.Thumbnail) archiveEmbed.setThumbnail(archiveEmbedConfig.Thumbnail);

    const archiveRow = new ActionRowBuilder();
    const buttons = Object.values(archiveEmbedConfig.Buttons);

    const styleMap = {
        "PRIMARY": ButtonStyle.Primary,
        "SECONDARY": ButtonStyle.Secondary,
        "SUCCESS": ButtonStyle.Success,
        "DANGER": ButtonStyle.Danger,
        "LINK": ButtonStyle.Link
    };

    buttons.forEach(button => {
        const buttonStyle = styleMap[button.Style.toUpperCase()];
        if (buttonStyle) {
            archiveRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticketarchive-${uniqueId}-${button.Type.toLowerCase()}`)
                    .setLabel(button.Name)
                    .setStyle(buttonStyle)
                    .setEmoji(button.Emoji)
            );
        }
    });

    await interaction.channel.send({ embeds: [archiveEmbed], components: [archiveRow] });
}

module.exports = async (client, interaction) => {
    if (interaction.isCommand()) {
        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(`[ERROR] Failed to execute command ${command.id || command.name}:`, error);
            
            // Try to send error message, but handle expired interactions gracefully
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: 'There was an error while executing this command!', 
                        flags: MessageFlags.Ephemeral 
                    });
                } else if (interaction.deferred) {
                    await interaction.editReply({ 
                        content: 'There was an error while executing this command!'
                    });
                }
            } catch (replyError) {
                // Only log if it's not an expired interaction error
                if (replyError.code !== 10062) {
                    console.error('[ERROR] Failed to send error message:', replyError);
                }
                // If interaction expired (10062), silently ignore
            }
        }
        return;
    }
    try {
        if (interaction.isButton()) {
            if (interaction.customId === 'check_percent' || interaction.customId === 'show_entrants') {
                await giveawayActions.handleButtonInteraction(interaction);
                return;
            }
            await handleButtonInteraction(client, interaction);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenuInteraction(client, interaction);
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('reviewWhy_')) {
                await handleReviewFeedbackModal(client, interaction);
            } else if (interaction.customId.startsWith('closeReason-')) {
                const ticketId = interaction.customId.split('-')[1];
                await handleCloseReasonModal(interaction, ticketId);
            } else {
                await handleModalSubmitInteraction(client, interaction);
            }
        } else if (interaction.isAutocomplete()) {
            const command = client.slashCommands.get(interaction.commandName);
            
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            
            if (!command.autocomplete) {
                console.error(`Command ${interaction.commandName} doesn't have an autocomplete handler.`);
                return;
            }
            
            try {
                await command.autocomplete(interaction, client);
            } catch (error) {
                console.error(`Error executing autocomplete for ${interaction.commandName}:`, error);
            }
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        await replyOrFollowUp(interaction, 'An error occurred while processing your interaction. Please try again later.');
    }
};

async function handleSelectMenuInteraction(client, interaction) {
    try {
        if (interaction.customId === 'ticketcreate') {
            await handleTicketCreate(client, interaction);

            const originalMessage = await interaction.channel.messages.fetch(interaction.message.id);
            const selectMenu = interaction.component;
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticketcreate')
                    .setPlaceholder(lang.Tickets.TicketTypePlaceholder)
                    .addOptions(selectMenu.options.map(option => ({
                        label: option.label,
                        emoji: option.emoji,
                        value: option.value,
                        description: option.description,
                    })))
            );

            await originalMessage.edit({ components: [row] });
        } else if (interaction.customId.startsWith('review_')) {
            await handleReviewSelect(client, interaction);
        }
    } catch (error) {
        console.error('Error handling select menu interaction:', error);
    }
}

async function handleButtonInteraction(client, interaction) {
    const [action, uniqueId, subAction] = interaction.customId.split('-');

    if (interaction.customId.startsWith('music_') || interaction.customId.startsWith('queue_')) {
        const musicInteractionHandler = require('./musicInteraction');
        return musicInteractionHandler(client, interaction);
    }

    switch (action) {
        case 'repost':
            const parts = interaction.customId.split('-');
            const subAction = parts[1];

            if (subAction === 'info') {
                await interaction.deferReply({ ephemeral: true });
                const originalUrl = decodeURIComponent(parts.slice(2).join('-')); // Reconstruct the URL from parts

                if (!originalUrl) {
                    return interaction.editReply('Không thể tìm thấy URL gốc để lấy thông tin.');
                }

                try {
                    // Use the tiktok-api-dl library
                    const downloaderResponse = await tiktok.Downloader(originalUrl, { version: "v1" });

                    if (downloaderResponse.status === 'error' || !downloaderResponse.result) {
                        return interaction.editReply('Không thể lấy thông tin video.');
                    }

                    const videoData = downloaderResponse.result;

                                const embed = new EmbedBuilder()
                                    .setColor('#0099ff')
                                    .setTitle('Thông tin video')
                                    .setURL(originalUrl)
                                    .setDescription(videoData.desc || 'Không có chú thích') // Use desc instead of description
                                    .addFields(
                                        { name: 'Người đăng', value: videoData.author.nickname || 'Không rõ', inline: true },
                                        { name: 'Lượt thích', value: videoData.statistics.likeCount ? videoData.statistics.likeCount.toString() : 'N/A', inline: true },
                                        { name: 'Lượt xem', value: videoData.statistics.playCount ? videoData.statistics.playCount.toString() : 'N/A', inline: true }
                                    )
                                    .setImage(videoData.video.cover[0]) // Use video.cover[0]
                                    .setTimestamp();
                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.error('Lỗi khi lấy thông tin TikTok cho repost (từ tiktok-api-dl):', error);
                    await interaction.editReply('Đã có lỗi xảy ra khi lấy thông tin video.');
                }
            } else if (subAction === 'delete') {
                const originalUserId = parts[2]; // Get originalUserId from customId
                if (interaction.user.id === originalUserId || interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                    await interaction.message.delete();
                } else {
                    await interaction.reply({ content: 'Bạn không có quyền xóa tin nhắn này.', ephemeral: true });
                }
            }
            break;
        case 'verifyButton':
            await handleVerificationInteraction(client, interaction);
            break;
        case 'upvote':
            await suggestionActions.upvoteSuggestion(client, interaction, uniqueId);
            break;
        case 'downvote':
            await suggestionActions.downvoteSuggestion(client, interaction, uniqueId);
            break;
        case 'ticketcreate':
            await handleTicketCreate(client, interaction);
            break;
        case 'ticketdelete':
            await handleDeleteTicket(client, interaction, uniqueId);
            break;
        case 'ticketclose':
            if (config.TicketSettings.CloseReasons.Enabled) {
                const modal = new ModalBuilder()
                    .setCustomId(`closeReason-${uniqueId}`)
                    .setTitle('Close Ticket');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('closeReason')
                    .setLabel('Reason for closing (optional)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setPlaceholder('Enter a reason for closing the ticket');

                modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                await interaction.showModal(modal);
            } else {
                await handleTicketClose(client, interaction, uniqueId);
            }
            break;
        case 'join_giveaway':
            await handleJoinGiveaway(client, interaction);
            break;
        case 'check_percent':
            await handleCheckPercent(client, interaction);
            break;
        case 'ticketarchive':
            if (subAction === 'reopen') {
                await handleReopenTicket(client, interaction, uniqueId);
            } else if (subAction === 'delete') {
                await handleDeleteTicket(client, interaction, uniqueId);
            } else if (subAction === 'transcript') {
                await handleTranscriptTicket(client, interaction, uniqueId);
            } else {
                console.warn(`Unknown sub-action: ${subAction}`);
            }
            break;
        case 'ticketclaim':
            await handleTicketClaim(client, interaction, uniqueId);
            break;
        default:
            break;
    }
}

async function checkBlacklistWords(content) {
    const blacklistRegex = config.BlacklistWords.Patterns.map(pattern => convertSimplePatternToRegex(pattern));
    return blacklistRegex.some(regex => regex.test(content));
}

function convertSimplePatternToRegex(simplePattern) {
    let regexPattern = simplePattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`, 'i');
}

async function handleModalSubmitInteraction(client, interaction) {
    try {
        const [modalAction, actionType] = interaction.customId.split('-');
        if (modalAction === 'suggestionModal') {
            const suggestionText = interaction.fields.getTextInputValue('suggestionText');
            const modalData = {};

            Object.entries(config.SuggestionSettings.AdditionalModalInputs).forEach(([key, inputConfig]) => {
                const value = interaction.fields.getTextInputValue(inputConfig.ID);
                if (value) {
                    modalData[`modal_${inputConfig.ID}`] = value;
                }
            });

            if (config.SuggestionSettings.blockBlacklistWords && await checkBlacklistWords(suggestionText)) {
                const blacklistMessage = config.lang.BlacklistWords && config.lang.BlacklistWords.Message
                    ? config.lang.BlacklistWords.Message.replace(/{user}/g, `${interaction.user.username}`)
                    : 'Your suggestion contains blacklisted words.';
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: blacklistMessage, flags: MessageFlags.Ephemeral });
                } else if (interaction.deferred) {
                    await interaction.followUp({ content: blacklistMessage, flags: MessageFlags.Ephemeral });
                }
                return;
            }

            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            }

            await suggestionActions.createSuggestion(client, interaction, suggestionText, modalData);
            await interaction.editReply({ content: lang.Suggestion.SuggestionCreated });
        }
    } catch (error) {
        console.error('Error handling modal submission:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }
        await interaction.followUp({ content: 'An error occurred while processing your modal submission. Please try again later.', flags: MessageFlags.Ephemeral }).catch(e => console.error('Error sending follow-up:', e));
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    try {
        const ticket = await Ticket.findOne({ channelId: message.channel.id });
        if (ticket) {
            const attachmentPromises = message.attachments.map(async attachment => {
                const attachmentData = {
                    url: attachment.url,
                    proxyURL: attachment.proxyURL,
                    contentType: attachment.contentType,
                    name: attachment.name,
                    id: attachment.id,
                    timestamp: message.createdAt
                };

                if (attachment.contentType?.startsWith('image/')) {
                    try {
                        const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
                        const imageBuffer = Buffer.from(response.data);

                        const compressedImage = await sharp(imageBuffer)
                            .jpeg({ quality: 60, progressive: true })
                            .resize(1920, 1080, {
                                fit: 'inside',
                                withoutEnlargement: true
                            })
                            .toBuffer();

                        const metadata = await sharp(compressedImage).metadata();

                        attachmentData.binaryData = compressedImage;
                        attachmentData.width = metadata.width;
                        attachmentData.height = metadata.height;
                        attachmentData.size = compressedImage.length;
                        attachmentData.compressed = true;
                    } catch (error) {
                        console.error('Error processing image:', error);
                    }
                }

                return attachmentData;
            });

            const attachments = await Promise.all(attachmentPromises);

            const newMessage = {
                author: message.author.tag,
                authorId: message.author.id,
                content: message.content,
                timestamp: message.createdAt,
                attachments: attachments
            };

            ticket.messages.push(newMessage);
            ticket.attachments.push(...attachments);
            ticket.messageCount = (ticket.messageCount || 0) + 1;
            await ticket.save();
        }
    } catch (error) {
        console.error('Error updating ticket messages:', error);
    }
});

async function handleJoinGiveaway(client, interaction) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const member = interaction.member;
        const userId = interaction.user.id;
        const username = interaction.user.username;
        const channelId = interaction.channelId;
        const messageId = interaction.message.id;

        await giveawayActions.joinGiveaway(client, userId, username, member, interaction, channelId, messageId);

    } catch (error) {
        console.error('Error in handleJoinGiveaway:', error);
        await interaction.followUp({ content: 'An error occurred while joining the giveaway. Please try again later.', flags: MessageFlags.Ephemeral });
    }
}

async function handleCheckPercent(client, interaction) {
    try {
        const messageId = interaction.message.id;
        const userId = interaction.user.id;

        const giveaway = await Giveaway.findOne({ messageId });
        if (!giveaway) {
            await interaction.reply({ content: 'Giveaway not found.', flags: MessageFlags.Ephemeral });
            return;
        }

        const totalEntries = giveaway.entries;
        const userEntries = giveaway.entrants.filter(entrant => entrant.entrantId === userId).length;
        let percent = 0;

        if (totalEntries > 0) {
            percent = ((userEntries / totalEntries) * 100).toFixed(2);
        }

        const response = lang.Giveaways.CheckChance
            .replace('{user}', `<@${userId}>`)
            .replace('{percent}', percent)
            .replace('{entries}', totalEntries);

        await interaction.reply({ content: response, flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Error handling check percent interaction:', error);
        await interaction.reply({ content: 'An error occurred while checking your giveaway chance. Please try again later.', flags: MessageFlags.Ephemeral });
    }
}

async function handleTicketCreate(client, interaction) {
    try {
        let ticketTypeKey;

        if (interaction.customId) {
            const parts = interaction.customId.split('-');
            ticketTypeKey = parts[1] ? parts[1] : interaction.values[0];
        } else {
            ticketTypeKey = interaction.values[0];
        }

                const ticketType = config.TicketTypes[ticketTypeKey];

                const blacklistedUser = await Blacklist.findOne({ userId: interaction.user.id });
        if (blacklistedUser) {
            const embedConfig = lang.Tickets.Blacklisted.Embed;
            const blacklistEmbed = new EmbedBuilder();

            if (embedConfig.Title) blacklistEmbed.setTitle(embedConfig.Title);
            if (embedConfig.Description && embedConfig.Description.length > 0) {
                blacklistEmbed.setDescription(embedConfig.Description.join('\n')
                    .replace('{user}', `<@${interaction.user.id}>`)
                    .replace('{reason}', blacklistedUser.reason)
                    .replace('{time}', `<t:${Math.floor(new Date(blacklistedUser.addedAt).getTime() / 1000)}:F>`));
            }
            if (embedConfig.Color) blacklistEmbed.setColor(embedConfig.Color);
            if (embedConfig.Footer && embedConfig.Footer.Text) {
                blacklistEmbed.setFooter({
                    text: embedConfig.Footer.Text || null,
                    iconURL: embedConfig.Footer.Icon || null
                });
            }
            if (embedConfig.Author && embedConfig.Author.Text) {
                blacklistEmbed.setAuthor({
                    name: embedConfig.Author.Text || null,
                    iconURL: embedConfig.Author.Icon || null
                });
            }
            if (embedConfig.Image) blacklistEmbed.setImage(embedConfig.Image);
            if (embedConfig.Thumbnail) blacklistEmbed.setThumbnail(embedConfig.Thumbnail);

            await interaction.reply({ embeds: [blacklistEmbed], flags: MessageFlags.Ephemeral });
            return;
        }

        const userRoles = interaction.member.roles.cache.map(role => role.id);
        const hasValidRole = ticketType.UserRole.some(role => role && userRoles.includes(role));

        if (!hasValidRole && ticketType.UserRole.some(role => role)) {
            await interaction.reply({ content: "You do not have the required roles to create this type of ticket.", flags: MessageFlags.Ephemeral });
            return;
        }

        const existingTickets = await Ticket.find({
            userId: interaction.user.id,
            status: { $in: ['open', 'closed'] }
        });

        for (const ticket of existingTickets) {
            const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
            if (!channel) {
                await Ticket.findOneAndUpdate(
                    { ticketId: ticket.ticketId },
                    { status: 'deleted', deletedAt: new Date() },
                    { new: true }
                );
            }
        }

        const updatedTickets = await Ticket.find({
            userId: interaction.user.id,
            status: { $in: ['open', 'closed'] }
        });

        if (updatedTickets.length >= config.TicketSettings.MaxTickets) {
            await interaction.reply({ content: lang.Tickets.AlreadyOpen, flags: MessageFlags.Ephemeral });
            return;
        }

        if (config.WorkingHours && config.WorkingHours.Enabled) {
            const currentTime = moment().tz(config.WorkingHours.Timezone);
            const currentDay = currentTime.format('dddd');
            
            if (config.WorkingHours.NonWorkingDays && config.WorkingHours.NonWorkingDays.includes(currentDay)) {
                if (!config.WorkingHours.allowOpenTickets) {
                    const workingHoursMessage = lang.Tickets.WorkingHours
                        .replace('{workinghours_start}', 'N/A')
                        .replace('{workinghours_end}', 'N/A');
                    await interaction.reply({ content: workingHoursMessage, flags: MessageFlags.Ephemeral });
                    return;
                }
            } else {
                const workingHours = config.WorkingHours.Schedule[currentDay];

                if (workingHours) {
                    const [start, end] = workingHours.split('-');
                    const startTime = moment.tz(start, 'HH:mm', config.WorkingHours.Timezone);
                    const endTime = moment.tz(end, 'HH:mm', config.WorkingHours.Timezone);

                    if (!currentTime.isBetween(startTime, endTime) && !config.WorkingHours.allowOpenTickets) {
                        const workingHoursMessage = lang.Tickets.WorkingHours
                            .replace('{workinghours_start}', `<t:${startTime.unix()}:t>`)
                            .replace('{workinghours_end}', `<t:${endTime.unix()}:t>`);
                        await interaction.reply({ content: workingHoursMessage, flags: MessageFlags.Ephemeral });
                        return;
                    }
                }
            }
        }

        if (Array.isArray(ticketType.Questions) && ticketType.Questions.length > 0) {
            const modal = new ModalBuilder()
                .setCustomId(`ticketcreate-${ticketTypeKey}`)
                .setTitle(ticketType.Name || 'Create a Ticket');

            ticketType.Questions.forEach(question => {
                const questionKey = Object.keys(question)[0];
                const questionConfig = question[questionKey];

                const styleMap = {
                    Short: TextInputStyle.Short,
                    Paragraph: TextInputStyle.Paragraph
                };

                const input = new TextInputBuilder()
                    .setCustomId(questionKey)
                    .setLabel(questionConfig.Question || '')
                    .setPlaceholder(questionConfig.Placeholder || '')
                    .setStyle(styleMap[questionConfig.Style] || TextInputStyle.Short)
                    .setRequired(questionConfig.Required || false)
                    .setMaxLength(questionConfig.maxLength || 1000);

                const actionRow = new ActionRowBuilder().addComponents(input);
                modal.addComponents(actionRow);
            });

            await interaction.showModal(modal);
        } else {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            }
            await createTicket(client, interaction, ticketTypeKey, [], ticketType.Panel);
        }
    } catch (error) {
        console.error('Error creating ticket:', error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }
        await interaction.followUp({ content: 'An error occurred while creating the ticket. Please try again later.', flags: MessageFlags.Ephemeral }).catch(e => console.error('Error sending follow-up:', e));
    }
}

async function getUserPriority(member) {
    const priorityConfig = config.Priority;
    if (!priorityConfig.Enabled) {
        return priorityConfig.DefaultPriority;
    }

    const priorityOrder = ['Low', 'Medium', 'High'];
    let highestPriority = -1;
    let assignedPriority = priorityConfig.DefaultPriority;

    for (const memberRole of member.roles.cache.values()) {
        for (const [level, levelConfig] of Object.entries(priorityConfig.Levels)) {
            if (levelConfig.Roles.includes(memberRole.id)) {
                const priorityIndex = priorityOrder.indexOf(level);
                if (priorityIndex > highestPriority) {
                    highestPriority = priorityIndex;
                    assignedPriority = level;
                }
            }
        }
    }

    return assignedPriority;
}

async function sendFollowupMessage(ticketCreationMessage, placeholders, ticketTypeKey) {
    const ticketConfig = config.TicketCreation[ticketTypeKey] || config.TicketCreation.Default;
    const followupConfig = ticketConfig.Followup;

    if (followupConfig.Message && followupConfig.Message !== "") {
        const followupMessage = replacePlaceholders(followupConfig.Message, placeholders);
        await ticketCreationMessage.reply(followupMessage);
    }
}

async function createTicket(client, interaction, ticketTypeKey, questions, selectedPanel) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        const ticketType = config.TicketTypes[ticketTypeKey];
        const member = interaction.member;
        const userPriority = await getUserPriority(member);

        if (config.TicketSettings.DelayedResponse && config.TicketSettings.DelayedResponse.Enabled) {
            const openTickets = await Ticket.countDocuments({ 
                guildId: interaction.guild.id,
                status: 'open'
            });

            if (openTickets >= config.TicketSettings.DelayedResponse.TicketThreshold) {
                const delayedResponseConfig = config.TicketSettings.DelayedResponse.Embed;
                const warningEmbed = new EmbedBuilder();

                if (delayedResponseConfig.Title) {
                    warningEmbed.setTitle(delayedResponseConfig.Title);
                }

                const description = delayedResponseConfig.Description
                    .join('\n')
                    .replace('{openTickets}', openTickets.toString());

                warningEmbed
                    .setDescription(description)
                    .setColor(delayedResponseConfig.Color);

                if (delayedResponseConfig.Footer && delayedResponseConfig.Footer.Text) {
                    warningEmbed.setFooter({
                        text: delayedResponseConfig.Footer.Text,
                        iconURL: delayedResponseConfig.Footer.Icon || null
                    });
                }

                if (delayedResponseConfig.Thumbnail) {
                    warningEmbed.setThumbnail(delayedResponseConfig.Thumbnail);
                }

                if (delayedResponseConfig.Image) {
                    warningEmbed.setImage(delayedResponseConfig.Image);
                }

                warningEmbed.setTimestamp();

                await interaction.followUp({
                    embeds: [warningEmbed],
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        const newTicketId = await generateUniqueTicketId();

        const ticketName = ticketType.ChannelName.replace('{ticket-id}', newTicketId)
            .replace('{user}', interaction.user.username)
            .replace('{priority}', userPriority);
        const existingChannel = interaction.guild.channels.cache.find(ch => ch.name === ticketName);

        if (existingChannel) {
            await interaction.followUp({ content: lang.Tickets.AlreadyOpen, flags: MessageFlags.Ephemeral });
            return;
        }

        const ticket = new Ticket({
            ticketId: newTicketId,
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            ticketType: ticketTypeKey,
            priority: userPriority,
            questions: questions,
            messageCount: 0,
            alertTime: ticketType.AutoAlert && ticketType.AutoAlert !== "0" ? 
                new Date(Date.now() + parseDuration(ticketType.AutoAlert)) : null,
            claimed: false,
            claimedBy: null
        });

        let permissionOverwriteArray = [
            {
                id: interaction.guild.roles.everyone.id,
                deny: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]
            },
            {
                id: interaction.user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.EmbedLinks
                ]
            },
            {
                id: client.user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.EmbedLinks
                ]
            }
        ];

        if (ticketType.SupportRole && Array.isArray(ticketType.SupportRole)) {
            for (const roleId of ticketType.SupportRole) {
                if (!roleId) continue;
                const role = interaction.guild.roles.cache.get(roleId);
                if (role) {
                    permissionOverwriteArray.push({
                        id: role.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.EmbedLinks
                        ]
                    });
                }
            }
        }

        const channelOptions = {
            name: ticketName,
            type: 0,
            permissionOverwrites: permissionOverwriteArray
        };

        let targetCategoryId = ticketType.CategoryID;
        let selectedCategory = null;

        if (targetCategoryId) {
            const mainCategory = interaction.guild.channels.cache.get(targetCategoryId);
            if (mainCategory && mainCategory.children.cache.size >= 50 && config.TicketSettings.overFlow) {
                for (const overflowCategoryId of config.TicketSettings.overFlow) {
                    const overflowCategory = interaction.guild.channels.cache.get(overflowCategoryId);
                    if (overflowCategory && overflowCategory.children.cache.size < 50) {
                        targetCategoryId = overflowCategoryId;
                        selectedCategory = overflowCategory;
                        break;
                    }
                }
            } else if (mainCategory) {
                selectedCategory = mainCategory;
            }
        }

        if (selectedCategory) {
            channelOptions.parent = selectedCategory.id;
        }

        let channel;
        try {
            channel = await interaction.guild.channels.create(channelOptions);
            ticket.channelId = channel.id;
            ticket.channelName = channel.name;
            await ticket.save();
        } catch (error) {
            console.error('Error creating channel:', error);
            return await interaction.followUp({ content: 'Failed to create the ticket channel. Please contact an administrator.', flags: MessageFlags.Ephemeral });
        }

        const channelTopic = ticketType.ChannelTopic
            .replace('{ticketType}', ticketType.Name)
            .replace('{userid}', `<@!${interaction.user.id}>`)
            .replace('{priority}', userPriority)
            .replace('{claimer}', ticket.claimed ? `<@${ticket.claimedBy}>` : 'Unclaimed');

        ticket.channelTopic = channelTopic;
        await ticket.save();
        await channel.setTopic(channelTopic);

        const ticketCreationConfig = config.TicketCreation[ticketTypeKey] || config.TicketCreation.Default;
        const ticketEmbedConfig = ticketCreationConfig.Embed;

        let formattedQuestions = '';
        if (questions.length > 0) {
            formattedQuestions = questions.map(q => 
                ticketCreationConfig.QuestionFormat.map(format => 
                    replacePlaceholders(format, { question: q.question, answer: q.answer })
                ).join('\n')
            ).join('\n\n');
        }

        const placeholders = {
            ticketType: ticketType.Name,
            user: `<@${interaction.user.id}>`,
            guild: interaction.guild.name,
            questions: formattedQuestions,
            claimer: ticket.claimed ? `<@${ticket.claimedBy}>` : "Unclaimed",
            userIcon: interaction.user.displayAvatarURL({ dynamic: true })
        };

        const processedEmbedConfig = JSON.parse(JSON.stringify(ticketEmbedConfig), (key, value) => {
            if (typeof value === 'string') {
                return replacePlaceholders(value, placeholders);
            }
            return value;
        });

        const embedMessage = new EmbedBuilder()
            .setTitle(processedEmbedConfig.Title)
            .setDescription(processedEmbedConfig.Description.join('\n'))
            .setColor(processedEmbedConfig.Color);

            if (Array.isArray(processedEmbedConfig.Fields)) {
                processedEmbedConfig.Fields.forEach(field => {
                    if (field.Name && field.Value) {
                        embedMessage.addFields({
                            name: field.Name,
                            value: field.Value,
                            inline: field.Inline === true
                        });
                    }
                });
            }

        if (processedEmbedConfig.Author && processedEmbedConfig.Author.Text) {
            embedMessage.setAuthor({
                name: processedEmbedConfig.Author.Text,
                iconURL: processedEmbedConfig.Author.Icon ? 
                    replacePlaceholders(processedEmbedConfig.Author.Icon, placeholders) : null
            });
        }
        if (processedEmbedConfig.Footer && processedEmbedConfig.Footer.Text) {
            embedMessage.setFooter({
                text: processedEmbedConfig.Footer.Text,
                iconURL: processedEmbedConfig.Footer.Icon ? 
                    replacePlaceholders(processedEmbedConfig.Footer.Icon, placeholders) : null
            });
        }
        if (processedEmbedConfig.Image) embedMessage.setImage(processedEmbedConfig.Image);
        if (processedEmbedConfig.Thumbnail) {
            embedMessage.setThumbnail(replacePlaceholders(processedEmbedConfig.Thumbnail, placeholders));
        }

        const row = new ActionRowBuilder();

        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`ticketclose-${newTicketId}`)
                .setLabel(lang.Tickets.CloseTicketButton)
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        if (ticketType.Claiming && ticketType.Claiming.Enabled) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticketclaim-${newTicketId}`)
                    .setLabel(ticketType.Claiming.Button.Name || "Claim Ticket")
                    .setStyle(ButtonStyle[ticketType.Claiming.Button.Style] || ButtonStyle.Secondary)
                    .setEmoji(ticketType.Claiming.Button.Emoji || '🎫')
            );
        }

        let ticketMessage;
        try {
            ticketMessage = await channel.send({ embeds: [embedMessage], components: [row] });
            ticket.firstMessageId = ticketMessage.id;
            await ticket.save();
        } catch (error) {
            console.error('Error sending ticket creation message:', error);
        }

        if (config.WorkingHours.Enabled) {
            const currentTime = moment().tz(config.WorkingHours.Timezone);
            const currentDay = currentTime.format('dddd');
            
            if (config.WorkingHours.NonWorkingDays && config.WorkingHours.NonWorkingDays.includes(currentDay)) {
                const workingEmbedConfig = config.WorkingEmbed.Embed;
                const workingEmbed = new EmbedBuilder();

                if (workingEmbedConfig.Title) workingEmbed.setTitle(workingEmbedConfig.Title);
                if (workingEmbedConfig.Description) {
                    let nextWorkingDay = currentTime.clone();
                    let schedule;
                    while (true) {
                        nextWorkingDay.add(1, 'day');
                        const dayName = nextWorkingDay.format('dddd');
                        if (!config.WorkingHours.NonWorkingDays.includes(dayName)) {
                            schedule = config.WorkingHours.Schedule[dayName];
                            if (schedule) break;
                        }
                    }
                    const [start, end] = schedule.split('-');
                    const startTime = moment.tz(start, 'HH:mm', config.WorkingHours.Timezone);
                    const endTime = moment.tz(end, 'HH:mm', config.WorkingHours.Timezone);

                    workingEmbed.setDescription(workingEmbedConfig.Description.join('\n')
                        .replace('{workinghours_start}', `<t:${startTime.unix()}:t>`)
                        .replace('{workinghours_end}', `<t:${endTime.unix()}:t>`));
                }
                if (workingEmbedConfig.Color) workingEmbed.setColor(workingEmbedConfig.Color);
                if (workingEmbedConfig.Footer && workingEmbedConfig.Footer.Text) {
                    if (workingEmbedConfig.Footer.Text !== "") {
                        workingEmbed.setFooter({ text: workingEmbedConfig.Footer.Text, iconURL: workingEmbedConfig.Footer.Icon || null });
                    }
                }
                if (workingEmbedConfig.Image) workingEmbed.setImage(workingEmbedConfig.Image);
                if (workingEmbedConfig.Thumbnail) workingEmbed.setThumbnail(workingEmbedConfig.Thumbnail);

                await channel.send({ embeds: [workingEmbed] }).catch(error => console.error('Error sending working hours embed:', error));
            } else {
                const workingHours = config.WorkingHours.Schedule[currentDay];

                if (workingHours) {
                    const [start, end] = workingHours.split('-');
                    const startTime = moment.tz(start, 'HH:mm', config.WorkingHours.Timezone);
                    const endTime = moment.tz(end, 'HH:mm', config.WorkingHours.Timezone);

                    if (!currentTime.isBetween(startTime, endTime)) {
                        const workingEmbedConfig = config.WorkingEmbed.Embed;
                        const workingEmbed = new EmbedBuilder();

                        if (workingEmbedConfig.Title) workingEmbed.setTitle(workingEmbedConfig.Title);
                        if (workingEmbedConfig.Description) {
                            const startTimestamp = `<t:${startTime.unix()}:t>`;
                            const endTimestamp = `<t:${endTime.unix()}:t>`;
                            workingEmbed.setDescription(workingEmbedConfig.Description.join('\n').replace('{workinghours_start}', startTimestamp).replace('{workinghours_end}', endTimestamp));
                        }
                        if (workingEmbedConfig.Color) workingEmbed.setColor(workingEmbedConfig.Color);
                        if (workingEmbedConfig.Footer && workingEmbedConfig.Footer.Text) {
                            if (workingEmbedConfig.Footer.Text !== "") {
                                workingEmbed.setFooter({ text: workingEmbedConfig.Footer.Text, iconURL: workingEmbedConfig.Footer.Icon || null });
                            }
                        }
                        if (workingEmbedConfig.Image) workingEmbed.setImage(workingEmbedConfig.Image);
                        if (workingEmbedConfig.Thumbnail) workingEmbed.setThumbnail(workingEmbedConfig.Thumbnail);

                        await channel.send({ embeds: [workingEmbed] }).catch(error => console.error('Error sending working hours embed:', error));
                    }
                }
            }
        }

        if (ticketType.TagSupport || ticketType.TagCreator) {
            let tagMessageContent = '';
            if (ticketType.TagSupport) {
                const supportTags = ticketType.SupportRole
                    .map(roleId => interaction.guild.roles.cache.has(roleId) ? `<@&${roleId}>` : null)
                    .filter(Boolean)
                    .join(' ');
                tagMessageContent += supportTags;
            }
            if (ticketType.TagCreator) {
                tagMessageContent += ` <@${interaction.user.id}>`;
            }
            if (tagMessageContent) {
                try {
                    const tagMessage = await channel.send({ content: tagMessageContent.trim() });
                    await tagMessage.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Error deleting tag message:', error);
                        }
                    });
                } catch (error) {
                    console.error('Error sending tag message:', error);
                }
            }
        }

        await sendFollowupMessage(ticketMessage, placeholders, ticketTypeKey).catch(error => 
            console.error('Error sending follow-up message:', error)
        );

        const ticketCreatedEmbedConfig = lang.Tickets.TicketCreated.Embed;
        const embed = new EmbedBuilder();

        if (ticketCreatedEmbedConfig.Title) embed.setTitle(ticketCreatedEmbedConfig.Title);
        if (ticketCreatedEmbedConfig.Description && ticketCreatedEmbedConfig.Description.length > 0) {
            embed.setDescription(ticketCreatedEmbedConfig.Description.join('\n')
                .replace('{link}', `[${lang.Tickets.TicketCreated.LinkText}](https://discord.com/channels/${interaction.guild.id}/${channel.id})`));
        }
        if (ticketCreatedEmbedConfig.Color) embed.setColor(ticketCreatedEmbedConfig.Color);
        if (ticketCreatedEmbedConfig.Footer && ticketCreatedEmbedConfig.Footer.Text) {
            if (ticketCreatedEmbedConfig.Footer.Text !== "") {
                embed.setFooter({
                    text: ticketCreatedEmbedConfig.Footer.Text,
                    iconURL: ticketCreatedEmbedConfig.Footer.Icon || null
                });
            }
        }
        if (ticketCreatedEmbedConfig.Author && ticketCreatedEmbedConfig.Author.Text) {
            if (ticketCreatedEmbedConfig.Author.Text !== "") {
                embed.setAuthor({
                    name: ticketCreatedEmbedConfig.Author.Text,
                    iconURL: ticketCreatedEmbedConfig.Author.Icon || null
                });
            }
        }
        if (ticketCreatedEmbedConfig.Image) embed.setImage(ticketCreatedEmbedConfig.Image);
        if (ticketCreatedEmbedConfig.Thumbnail) embed.setThumbnail(ticketCreatedEmbedConfig.Thumbnail);

        const buttonConfig = lang.Tickets.TicketCreated.Button;
        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel(buttonConfig.Text)
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/channels/${interaction.guild.id}/${channel.id}`)
                    .setEmoji(buttonConfig.Emoji || null)
            );

        await interaction.followUp({ embeds: [embed], components: [button], flags: MessageFlags.Ephemeral });

    } catch (error) {
        console.error('Error creating ticket:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }
        await interaction.followUp({ content: 'An error occurred while creating the ticket. Please try again later.', flags: MessageFlags.Ephemeral }).catch(e => console.error('Error sending follow-up:', e));
    }
}

async function handleModalSubmitInteraction(client, interaction) {
    try {
        const [modalAction, ticketTypeKey] = interaction.customId.split('-');
        if (modalAction === 'ticketcreate') {
            const ticketType = config.TicketTypes[ticketTypeKey];
            let questions = [];

            if (Array.isArray(ticketType.Questions) && ticketType.Questions.length > 0) {
                for (const questionConfig of ticketType.Questions) {
                    const questionKey = Object.keys(questionConfig)[0];
                    const question = questionConfig[questionKey].Question;
                    const answer = interaction.fields.getTextInputValue(questionKey) || "N/A";

                    questions.push({ question, answer });
                }

                await createTicket(client, interaction, ticketTypeKey, questions, ticketType.Panel);
            } else {
                await createTicket(client, interaction, ticketTypeKey, [], ticketType.Panel);
            }
        } else if (modalAction === 'suggestionModal') {
            const suggestionText = interaction.fields.getTextInputValue('suggestionText');
            const modalData = {};

            Object.entries(config.SuggestionSettings.AdditionalModalInputs).forEach(([key, inputConfig]) => {
                const value = interaction.fields.getTextInputValue(inputConfig.ID);
                if (value) {
                    modalData[`modal_${inputConfig.ID}`] = value;
                }
            });

            if (config.SuggestionSettings.blockBlacklistWords && await checkBlacklistWords(suggestionText)) {
                const blacklistMessage = lang.BlacklistWords && lang.BlacklistWords.Message
                    ? lang.BlacklistWords.Message.replace(/{user}/g, `${interaction.user}`)
                    : 'Your suggestion contains blacklisted words.';

                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: blacklistMessage, flags: MessageFlags.Ephemeral });
                } else if (interaction.deferred) {
                    await interaction.followUp({ content: blacklistMessage, flags: MessageFlags.Ephemeral });
                }
                return;
            }

            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            }

            await suggestionActions.createSuggestion(client, interaction, suggestionText, modalData);
            await interaction.editReply({ content: lang.Suggestion.SuggestionCreated });
        }
    } catch (error) {
        console.error('Error handling modal submission:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }
        await interaction.followUp({ content: 'An error occurred while processing your modal submission. Please try again later.', flags: MessageFlags.Ephemeral }).catch(e => console.error('Error sending follow-up:', e));
    }
}

async function generateUniqueTicketId() {
    const lastTicket = await Ticket.findOne().sort({ ticketId: -1 });
    const newTicketId = lastTicket ? lastTicket.ticketId + 1 : 1;

    let isUnique = false;
    while (!isUnique) {
        const existingTicket = await Ticket.findOne({ ticketId: newTicketId });
        if (existingTicket) {
            newTicketId++;
        } else {
            isUnique = true;
        }
    }

    return newTicketId;
}

async function handleReviewSelect(client, interaction) {
    try {
        const [_, channelId] = interaction.customId.split('_');
        if (!channelId) {
            throw new Error('No channelId found in the customId.');
        }

        const ticket = await Ticket.findOne({ channelId: channelId });
        if (ticket && ticket.rating !== lang.Tickets.ReviewNoRating) {
            await interaction.reply({ content: lang.Tickets.ReviewAlreadySubmitted, flags: MessageFlags.Ephemeral });
            return;
        }

        const rating = parseInt(interaction.values[0]);
        const ratingEmoji = config.Reviews.Emoji;
        const ratingString = `${ratingEmoji.repeat(rating)} (${rating}/5)`;

        if (config.Reviews.askWhy) {
            const modal = new ModalBuilder()
                .setCustomId(`reviewWhy_${channelId}_${rating}`)
                .setTitle(lang.Tickets.ReviewTitle)
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('reviewFeedback')
                            .setLabel(lang.Tickets.ReviewPlaceholder)
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );

            await interaction.showModal(modal);
        } else {
            await updateReview(channelId, ratingString, interaction);
        }
    } catch (error) {
        console.error('Error handling review select:', error);
        await interaction.reply({ content: 'An error occurred while submitting your review. Please try again later.', flags: MessageFlags.Ephemeral });
    }
}

async function handleReviewFeedbackModal(client, interaction) {
    try {
        const parts = interaction.customId.split('_');
        if (parts.length < 3) {
            throw new Error('Invalid customId format. Expected at least 3 parts.');
        }

        const channelId = parts[1];
        const rating = parts[2];
        if (!channelId || !rating) {
            throw new Error('Missing channelId or rating in the customId.');
        }

        const feedback = interaction.fields.getTextInputValue('reviewFeedback');
        if (!feedback) {
            throw new Error('Review feedback is missing.');
        }

        const ratingEmoji = config.Reviews.Emoji;
        const ratingString = `${ratingEmoji.repeat(rating)} (${rating}/5)`;

        const ticket = await Ticket.findOne({ channelId: channelId });
        if (!ticket) {
            await interaction.reply({ content: 'Ticket not found or already closed.', flags: MessageFlags.Ephemeral });
            return;
        }

        const updatedTicket = await Ticket.findOneAndUpdate(
            { channelId: channelId },
            { rating: ratingString, reviewFeedback: feedback },
            { new: true }
        );

        if (!updatedTicket) {
            await interaction.reply({ content: 'Ticket not found or already closed.', flags: MessageFlags.Ephemeral });
            return;
        }

        const logsChannel = client.channels.cache.get(config.TicketSettings.LogsChannelID);
        if (!logsChannel) {
            console.error('Logs channel not found.');
            await interaction.reply({ content: 'Could not find the logs channel. Please try again later.', flags: MessageFlags.Ephemeral });
            return;
        }

        let logMessage;
        try {
            logMessage = await logsChannel.messages.fetch(updatedTicket.logMessageId);
        } catch (fetchError) {
            console.error('Log message not found:', fetchError);
            await interaction.reply({ content: 'Could not find the log message. Please try again later.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (!logMessage || !logMessage.embeds.length) {
            console.error('Log embed not found or empty.');
            await interaction.reply({ content: 'Could not find the log embed. Please try again later.', flags: MessageFlags.Ephemeral });
            return;
        }

        const logEmbed = logMessage.embeds[0];

        const reviewFormat = config.Logs.Close.Embed.ReviewFormat.replace('{review}', feedback);

        const closeReason = updatedTicket.customCloseReason || 
            (updatedTicket.closeReason ? getFormattedReason(updatedTicket.closeReason) : config.TicketSettings.CloseReasons.DefaultReason);

        const updatedDescription = config.Logs.Close.Embed.Description.map(line =>
            replacePlaceholders(line, {
                userTag: `<@${interaction.user.id}>`,
                ticketCreator: `<@${updatedTicket.userId}>`,
                messageCount: updatedTicket.messageCount !== undefined ? updatedTicket.messageCount.toString() : 'N/A',
                priority: updatedTicket.priority || 'N/A',
                channelName: updatedTicket.channelName || 'Unknown Channel',
                rating: `${ratingString}\n${reviewFormat}`,
                claimer: updatedTicket.claimed ? `<@${updatedTicket.claimedBy}>` : "Unclaimed",
                reason: closeReason
            })
        ).join('\n');

        const updatedEmbed = EmbedBuilder.from(logEmbed).setDescription(updatedDescription);

        await logMessage.edit({ embeds: [updatedEmbed] });

        await interaction.reply({ content: lang.Tickets.ReviewComplete, flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Error handling review feedback modal:', error);
        await interaction.reply({ content: `An error occurred: ${error.message}. Please try again later.`, flags: MessageFlags.Ephemeral });
    }
}

async function updateReview(channelId, ratingString, interaction) {
    try {
        const updatedTicket = await Ticket.findOneAndUpdate(
            { channelId: channelId },
            { rating: ratingString },
            { new: true }
        );

        if (!updatedTicket) {
            await interaction.reply({ content: 'Ticket not found or already closed.', flags: MessageFlags.Ephemeral });
            return;
        }

        const logsChannel = client.channels.cache.get(config.TicketSettings.LogsChannelID);
        if (!logsChannel) {
            console.error('Logs channel not found.');
            await interaction.reply({ content: 'Could not find the logs channel. Please try again later.', flags: MessageFlags.Ephemeral });
            return;
        }

        const logMessage = await logsChannel.messages.fetch(updatedTicket.logMessageId);
        if (!logMessage) {
            console.error('Log message not found.');
            await interaction.reply({ content: 'Could not find the log message. Please try again later.', flags: MessageFlags.Ephemeral });
            return;
        }

        const logEmbed = logMessage.embeds[0];
        if (!logEmbed) {
            console.error('Log embed not found.');
            await interaction.reply({ content: 'Could not find the log embed. Please try again later.', flags: MessageFlags.Ephemeral });
            return;
        }

        const reviewFormat = config.Logs.Close.Embed.ReviewFormat.replace('{review}', 'No additional feedback provided.');

        const closeReason = ticket.customCloseReason || 
            (ticket.closeReason ? getFormattedReason(ticket.closeReason) : config.TicketSettings.CloseReasons.DefaultReason);

        const updatedDescription = config.Logs.Close.Embed.Description.map(line =>
            replacePlaceholders(line, {
                userTag: `<@${interaction.user.id}>`,
                ticketCreator: `<@${ticket.userId}>`,
                messageCount: ticket.messageCount !== undefined ? ticket.messageCount.toString() : 'N/A',
                priority: ticket.priority || 'N/A',
                channelName: ticket.channelName || 'Unknown Channel',
                rating: `${ratingString}\n${reviewFormat}`,
                claimer: ticket.claimed ? `<@${ticket.claimedBy}>` : "Unclaimed",
                reason: closeReason
            })
        ).join('\n');

        const updatedEmbed = EmbedBuilder.from(logEmbed).setDescription(updatedDescription);

        await logMessage.edit({ embeds: [updatedEmbed] });

        await interaction.reply({ content: lang.Tickets.ReviewComplete, flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Error updating review:', error);
        await interaction.reply({ content: 'An error occurred while updating the review. Please try again later.', flags: MessageFlags.Ephemeral });
    }
}

async function handleReopenTicket(client, interaction, uniqueId) {
    try {
        const ticket = await Ticket.findOneAndUpdate(
            { ticketId: uniqueId },
            { status: 'open', closedAt: null },
            { new: true }
        );

        if (!ticket) {
            console.error(`No ticket found in the database with ticketId: ${uniqueId}`);
            await interaction.reply({ content: 'Ticket not found.', flags: MessageFlags.Ephemeral });
            return;
        }

        const channel = await client.channels.fetch(ticket.channelId);
        if (!channel) {
            console.error(`No channel found with channelId: ${ticket.channelId}`);
            await interaction.reply({ content: 'Channel not found.', flags: MessageFlags.Ephemeral });
            return;
        }

        const ticketType = config.TicketTypes[ticket.ticketType];
        if (!ticketType) {
            console.error(`No ticket type found in the configuration for ticketType: ${ticket.ticketType}`);
            await interaction.reply({ content: 'Ticket type configuration not found.', flags: MessageFlags.Ephemeral });
            return;
        }

        const messages = await channel.messages.fetch({ limit: 100 });
        const archiveEmbedMessage = messages.find(msg => 
            msg.embeds.length > 0 && 
            msg.embeds[0].title === config.ArchiveDesign.Embed.Title
        );
        if (archiveEmbedMessage) {
            await archiveEmbedMessage.delete().catch(console.error);
        }

        await channel.setParent(ticketType.CategoryID);

        const permissionOverwrites = [
            {
                id: ticket.userId,
                allow: ['SendMessages', 'ViewChannel', 'AttachFiles', 'EmbedLinks', 'ReadMessageHistory']
            },
            {
                id: channel.guild.roles.everyone.id,
                deny: ['SendMessages', 'ViewChannel']
            },
            {
                id: client.user.id,
                allow: ['SendMessages', 'ViewChannel']
            }
        ];

        ticketType.SupportRole.forEach(roleid => {
            let role = channel.guild.roles.cache.get(roleid);
            if (role) {
                permissionOverwrites.push({
                    id: role.id,
                    allow: ['SendMessages', 'ViewChannel', 'AttachFiles', 'EmbedLinks', 'ReadMessageHistory']
                });
            } else {
            }
        });

        await channel.permissionOverwrites.set(permissionOverwrites);

        const reopenEmbed = new EmbedBuilder()
            .setTitle(lang.Tickets.TicketReopenTitle)
            .setColor("Green")
            .setDescription(replacePlaceholders(lang.Tickets.TicketReopenDescription, { userId: interaction.user.id }))
            .setTimestamp();

        await channel.send({ embeds: [reopenEmbed] });
        await interaction.reply({ content: lang.Tickets.TicketReopen, flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Error handling ticket reopening:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'An error occurred while reopening the ticket. Please try again later.', flags: MessageFlags.Ephemeral }).catch(e => console.error('Error sending reply:', e));
        } else {
            await interaction.followUp({ content: 'An error occurred while reopening the ticket. Please try again later.', flags: MessageFlags.Ephemeral }).catch(e => console.error('Error sending follow-up:', e));
        }
    }
}

async function handleTranscriptTicket(client, interaction, uniqueId) {
    try {
        const ticket = await Ticket.findOne({ ticketId: uniqueId });

        if (!ticket) {
            console.error(`No ticket found in the database with ticketId: ${uniqueId}`);
            await interaction.reply({ content: 'Ticket not found.', flags: MessageFlags.Ephemeral });
            return;
        }

        const channel = await client.channels.fetch(ticket.channelId);
        if (!channel) {
            console.error(`No channel found with channelId: ${ticket.channelId}`);
            await interaction.reply({ content: 'Channel not found.', flags: MessageFlags.Ephemeral });
            return;
        }

        const fetchedMessages = await channel.messages.fetch({ limit: 100 });
        const userMessages = fetchedMessages.filter(m => !m.author.bot);

        const minMessages = parseInt(config.TicketTranscript.MinMessages, 10);

        if (userMessages.size >= minMessages) {
            const transcriptType = config.TicketTranscript.Type.toUpperCase();

            if (transcriptType === "WEB") {
                const baseURL = config.Dashboard.Url;
                const webUrl = `${baseURL}/tickets/${uniqueId}/transcript`;

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('View Transcript')
                            .setStyle(ButtonStyle.Link)
                            .setURL(webUrl)
                    );

                const logEmbed = new EmbedBuilder()
                    .setTitle(lang.Tickets.TranscriptTitle)
                    .setColor("Blue")
                    .setDescription(replacePlaceholders(lang.Tickets.TranscriptDescription, { 
                        ticketId: uniqueId, 
                        userId: interaction.user.id 
                    }))
                    .setTimestamp();

                await interaction.reply({ 
                    content: lang.Tickets.TranscriptTitle, 
                    components: [row],
                    flags: MessageFlags.Ephemeral 
                });

                const logsChannel = interaction.guild.channels.cache.get(config.TicketSettings.LogsChannelID);
                if (logsChannel) {
                    await logsChannel.send({ 
                        embeds: [logEmbed], 
                        components: [row]
                    });
                }

                try {
                    await interaction.user.send({ 
                        content: lang.Tickets.TranscriptReady, 
                        components: [row]
                    });
                } catch (dmError) {
                    console.error('Could not send transcript to user\'s DM:', dmError);
                }
            } else if (transcriptType === "TXT") {
                const transcript = userMessages
                    .map(m => {
                        const attachments = m.attachments.map(a => `[Attachment: ${a.name}](${a.url})`).join('\n');
                        return `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content}${attachments ? '\n' + attachments : ''}`;
                    })
                    .reverse()
                    .join('\n');
                
                const transcriptContent = transcript.length > 0 ? transcript : "No messages in this ticket.";

                const savePath = path.resolve(config.TicketTranscript.SavePath);
                if (!fs.existsSync(savePath)) {
                    fs.mkdirSync(savePath, { recursive: true });
                }

                const fileName = `ticket-${uniqueId}-${Date.now()}.${transcriptType.toLowerCase()}`;
                const filePath = path.join(savePath, fileName);
                let tempFilePath = null;

                if (config.TicketTranscript.Save) {
                    try {
                        tempFilePath = `${filePath}.temp`;
                        fs.writeFileSync(tempFilePath, transcriptContent, 'utf8');

                        fs.renameSync(tempFilePath, filePath);
                        tempFilePath = null;
                    } catch (error) {
                        console.error('Error saving transcript:', error);
                        if (tempFilePath && fs.existsSync(tempFilePath)) {
                            try {
                                fs.unlinkSync(tempFilePath);
                                console.log(`Cleaned up temporary transcript file: ${tempFilePath}`);
                            } catch (cleanupError) {
                                console.error('Error cleaning up temporary transcript file:', cleanupError);
                            }
                        }
                    }
                }

                const transcriptAttachment = new AttachmentBuilder(Buffer.from(transcriptContent), { 
                    name: fileName,
                    description: `Transcript for ticket #${uniqueId}`
                });

                const logEmbed = new EmbedBuilder()
                    .setTitle(lang.Tickets.TranscriptTitle)
                    .setColor("Blue")
                    .setDescription(replacePlaceholders(lang.Tickets.TranscriptDescription, { 
                        ticketId: uniqueId, 
                        userId: interaction.user.id 
                    }))
                    .setTimestamp();

                await interaction.reply({ content: lang.Tickets.TranscriptTitle, flags: MessageFlags.Ephemeral });

                const logsChannel = interaction.guild.channels.cache.get(config.TicketSettings.LogsChannelID);
                if (logsChannel) {
                    await logsChannel.send({ 
                        embeds: [logEmbed], 
                        files: [transcriptAttachment] 
                    });
                }

                try {
                    await interaction.user.send({ 
                        content: lang.Tickets.TranscriptReady, 
                        files: [transcriptAttachment] 
                    });
                } catch (dmError) {
                    console.error('Could not send transcript to user\'s DM:', dmError);
                }
            }
        } else {
            await interaction.reply({ 
                content: `Not enough messages to generate transcript. Minimum required: ${minMessages}`, 
                flags: MessageFlags.Ephemeral 
            });
        }
    } catch (error) {
        console.error('Error handling transcript generation:', error);
        await interaction.reply({ 
            content: 'An error occurred while generating the transcript. Please try again later.', 
            flags: MessageFlags.Ephemeral 
        });
    }
}

async function handleTicketClaim(client, interaction, uniqueId) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const ticket = await Ticket.findOneAndUpdate(
            { 
                ticketId: uniqueId,
                processingClaim: { $ne: true }
            },
            { processingClaim: true },
            { new: true }
        );

        if (!ticket) {
            await interaction.editReply({ content: 'Ticket is currently being processed or not found.' });
            return;
        }

        try {
            const channel = await interaction.guild.channels.fetch(interaction.channel.id);
            if (!channel) {
                await interaction.editReply({ content: 'Channel not found or inaccessible.' });
                return;
            }

            const ticketType = config.TicketTypes[ticket.ticketType];
            if (!ticketType || !ticketType.Claiming || !ticketType.Claiming.Enabled) {
                await interaction.editReply({ content: lang.Tickets.Claim.NotClaimable });
                return;
            }

            const memberRoles = interaction.member.roles.cache.map(role => role.id);
            const hasSupportRole = ticketType.SupportRole.some(roleId => memberRoles.includes(roleId));

            if (!hasSupportRole) {
                await interaction.editReply({ content: 'You do not have permission to claim tickets.' });
                return;
            }

            const ticketMessage = await channel.messages.fetch(ticket.firstMessageId).catch(() => null);
            if (!ticketMessage) {
                await interaction.editReply({ content: 'Could not find the ticket message.' });
                return;
            }

            if (ticket.claimed) {
                if (ticket.claimedBy === interaction.user.id) {
                    await Ticket.findOneAndUpdate(
                        { ticketId: uniqueId },
                        { 
                            claimed: false,
                            claimedBy: null,
                            processingClaim: false
                        }
                    );

                    await Promise.all([
                        updateClaimButton(ticketMessage, ticketType, null),
                        updateTicketEmbed(ticketMessage, ticket, ticketType, null),
                        resetTicketPermissions(channel, ticket, ticketType)
                    ]);

                    const unclaimEmbed = new EmbedBuilder()
                        .setDescription(lang.Tickets.Claim.Unclaimed)
                        .setColor(config.EmbedColors);

                    await interaction.editReply({ embeds: [unclaimEmbed] });

                    if (ticketType.Claiming.AnnounceClaim) {
                        const announceEmbed = new EmbedBuilder()
                            .setColor("Red")
                            .setDescription(lang.Tickets.Claim.Announcements.Unclaimed.replace('{user}', interaction.user.toString()));
                        await channel.send({ embeds: [announceEmbed] });
                    }
                } else {
                    await interaction.editReply({ 
                        content: lang.Tickets.Claim.AlreadyClaimed.replace('{claimer}', `<@${ticket.claimedBy}>`)
                    });
                }
            } else {
                await Ticket.findOneAndUpdate(
                    { ticketId: uniqueId },
                    { 
                        claimed: true,
                        claimedBy: interaction.user.id,
                        processingClaim: false
                    }
                );

                await Promise.all([
                    updateClaimButton(ticketMessage, ticketType, interaction.user),
                    updateTicketEmbed(ticketMessage, ticket, ticketType, interaction.user),
                    setClaimPermissions(channel, ticket, ticketType, interaction.user.id)
                ]);

                const claimEmbed = new EmbedBuilder()
                    .setDescription(lang.Tickets.Claim.Success)
                    .setColor(config.EmbedColors);

                await interaction.editReply({ embeds: [claimEmbed] });

                if (ticketType.Claiming.AnnounceClaim) {
                    const announceEmbed = new EmbedBuilder()
                        .setColor("Green")
                        .setDescription(lang.Tickets.Claim.Announcements.Claimed.replace('{user}', interaction.user.toString()));
                    await channel.send({ embeds: [announceEmbed] });
                }
            }
        } finally {
            await Ticket.findOneAndUpdate(
                { ticketId: uniqueId },
                { processingClaim: false }
            );
        }
    } catch (error) {
        console.error('Error handling ticket claim:', error);
        await interaction.editReply({ 
            content: 'An error occurred while processing the ticket claim.'
        }).catch(console.error);
    }
}

async function updateClaimButton(ticketMessage, ticketType, user) {
    try {
        const row = ActionRowBuilder.from(ticketMessage.components[0]);
        const claimButton = row.components.find(c => c.data?.custom_id?.startsWith('ticketclaim'));
        if (claimButton) {
            claimButton.setLabel(user ? `Claimed by ${user.username}` : (ticketType.Claiming.Button.Name || "Claim Ticket"));
            await ticketMessage.edit({ components: [row] });
        }
    } catch (error) {
        console.error('Error updating claim button:', error);
    }
}

async function updateTicketEmbed(ticketMessage, ticket, ticketType, user) {
    try {
        if (ticketMessage.embeds[0]) {
            const updatedEmbed = EmbedBuilder.from(ticketMessage.embeds[0]);
            const ticketCreationConfig = config.TicketCreation[ticket.ticketType] || config.TicketCreation.Default;

            let formattedQuestions = '';
            if (ticket.questions && ticket.questions.length > 0) {
                formattedQuestions = ticket.questions.map(q => 
                    ticketCreationConfig.QuestionFormat.map(format => 
                        replacePlaceholders(format, { 
                            question: q.question, 
                            answer: q.answer 
                        })
                    ).join('\n')
                ).join('\n\n');
            }

            const newDescription = ticketCreationConfig.Embed.Description.map(line => 
                replacePlaceholders(line, {
                    ticketType: ticketType.Name,
                    user: `<@${ticket.userId}>`,
                    guild: ticketMessage.guild.name,
                    questions: formattedQuestions,
                    claimer: user ? `<@${user.id}>` : "Unclaimed"
                })
            ).join('\n');
            
            updatedEmbed.setDescription(newDescription);
            await ticketMessage.edit({ embeds: [updatedEmbed] });
        }
    } catch (error) {
        console.error('Error updating ticket embed:', error);
    }
}

async function setClaimPermissions(channel, ticket, ticketType, claimerId) {
    try {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            ViewChannel: false,
            SendMessages: false,
            ReadMessageHistory: false
        });

        if (ticket.userId) {
            try {
                await channel.permissionOverwrites.edit(ticket.userId, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true
                });
            } catch (error) {
                console.error(`Error setting permissions for user ${ticket.userId}:`, error);
            }
        }

        if (claimerId) {
            try {
                await channel.permissionOverwrites.edit(claimerId, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true
                });
            } catch (error) {
                console.error(`Error setting permissions for claimer ${claimerId}:`, error);
            }
        }

        if (ticketType.SupportRole && Array.isArray(ticketType.SupportRole)) {
            const restrictResponse = ticketType.Claiming && ticketType.Claiming.RestrictResponse;
            
            for (const roleId of ticketType.SupportRole) {
                if (!roleId) continue;
                const supportRole = channel.guild.roles.cache.get(roleId);
                if (!supportRole) continue;
                
                try {
                    await channel.permissionOverwrites.edit(supportRole, {
                        ViewChannel: true,
                        SendMessages: restrictResponse ? false : true,
                        ReadMessageHistory: true,
                        AttachFiles: restrictResponse ? false : true,
                        EmbedLinks: restrictResponse ? false : true
                    });
                } catch (error) {
                    console.error(`Error updating permissions for role ${roleId}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error in setClaimPermissions:', error);
    }
}

async function resetTicketPermissions(channel, ticket, ticketType) {
    try {
        if (ticket.claimedBy) {
            try {
                await channel.permissionOverwrites.delete(ticket.claimedBy);
            } catch (removeError) {
                console.error('Error removing claimer permissions:', removeError);
            }
        }

        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            ViewChannel: false,
            SendMessages: false,
            ReadMessageHistory: false
        });

        if (ticket.userId) {
            await channel.permissionOverwrites.edit(ticket.userId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                AttachFiles: true,
                EmbedLinks: true
            });
        }

        if (ticketType.SupportRole && Array.isArray(ticketType.SupportRole)) {
            for (const roleId of ticketType.SupportRole) {
                if (!roleId) continue;
                const role = channel.guild.roles.cache.get(roleId);
                if (!role) continue;

                await channel.permissionOverwrites.edit(role, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true
                });
            }
        }

    } catch (error) {
        console.error('Error in resetTicketPermissions:', error);
        throw error;
    }
}

async function handleCloseReasonModal(interaction, ticketId) {
    try {
        await interaction.deferUpdate();
        
        const reason = interaction.fields.getTextInputValue('closeReason');
        await handleTicketClose(interaction.client, interaction, ticketId, null, reason);
    } catch (error) {
        console.error('Error handling close reason modal:', error);
        try {
            await handleTicketClose(interaction.client, interaction, ticketId);
        } catch (secondError) {
            console.error('Error handling fallback ticket close:', secondError);
            try {
                await interaction.followUp({ 
                    content: 'An error occurred while closing the ticket. Please try again.',
                    flags: MessageFlags.Ephemeral 
                });
            } catch (finalError) {
                console.error('Failed to send error message:', finalError);
            }
        }
    }
}



function parseDuration(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000
    };
    
    return value * multipliers[unit];
}

async function handleResetTicket(client, interaction) {
    const member = interaction.member;
    const channel = interaction.channel;

    try {
        if (!config.TicketSettings.StaffRoles.some(r => member.roles.cache.has(r))) {
            return interaction.reply({
                content: 'You do not have permission to reset this ticket!',
                ephemeral: true
            });
        }

        await channel.messages.fetch().then(async messages => {
            const userMessages = [];
            messages.forEach(message => {
                if (message.author.bot) return;
                userMessages.push(message);
            });

            if (userMessages.length > 0) {
                try {
                    await channel.bulkDelete(userMessages);
                } catch (error) {
                    console.error('Error bulk deleting messages:', error);
                    return interaction.reply({
                        content: 'Failed to delete messages. They might be too old to bulk delete.',
                        ephemeral: true
                    });
                }
            }
        });

        await interaction.deferReply({ ephemeral: true });

        try {
            const welcomeEmbed = new EmbedBuilder()
                .setTitle(config.TicketSettings.WelcomeMessage.Title)
                .setDescription(config.TicketSettings.WelcomeMessage.Description)
                .setColor(config.TicketSettings.WelcomeMessage.Color);

            const ticketRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel(config.TicketSettings.CloseTicketButton.Label)
                        .setStyle(ButtonStyle[config.TicketSettings.CloseTicketButton.Style])
                        .setEmoji(config.TicketSettings.CloseTicketButton.Emoji)
                );

            await channel.send({ embeds: [welcomeEmbed], components: [ticketRow] });
        } catch (error) {
            console.error('Error sending welcome message:', error);
            return interaction.editReply({
                content: 'Failed to send welcome message. Please check console for details.',
                ephemeral: true
            });
        }

        const tickets = loadTickets();
        const ticketChannelId = channel.id;
        
        if (tickets[ticketChannelId]) {
            try {
                tickets[ticketChannelId].claimed = false;
                tickets[ticketChannelId].claimedBy = null;
                
                const ticketsPath = path.join(__dirname, '..', 'tickets.json');
                const tempFilePath = `${ticketsPath}.temp`;
                
                try {
                    fs.writeFileSync(tempFilePath, JSON.stringify(tickets, null, 4), 'utf8');

                    fs.renameSync(tempFilePath, ticketsPath);
                } catch (error) {
                    console.error('Error saving tickets data:', error);
                    if (fs.existsSync(tempFilePath)) {
                        try {
                            fs.unlinkSync(tempFilePath);
                        } catch (cleanupError) {
                            console.error('Error cleaning up temporary file:', cleanupError);
                        }
                    }
                    throw new Error('Failed to save ticket data');
                }
            } catch (error) {
                console.error('Error updating ticket claim status:', error);
                return interaction.editReply({
                    content: 'Failed to update ticket status. Please check console for details.',
                    ephemeral: true
                });
            }
        }

        return interaction.editReply({
            content: 'Ticket has been reset!',
            ephemeral: true
        });
    } catch (error) {
        console.error('Error in handleResetTicket:', error);
        return interaction.reply({
            content: 'An error occurred while resetting the ticket. Please try again later.',
            ephemeral: true
        }).catch(() => {
            interaction.editReply({
                content: 'An error occurred while resetting the ticket. Please try again later.',
                ephemeral: true
            }).catch(console.error);
        });
    }
}