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
// const lang = getLang(); // REMOVED: Global lang is a Promise, not object. Loaded in handler instead.
const { handleVerificationInteraction } = require('../commands/Addons/Verification/interaction');
const suggestionActions = require('../events/Suggestions/suggestionActions');
const giveawayActions = require('../events/Giveaways/giveawayActions.js');

const Blacklist = require('../models/blacklist');
const Giveaway = require('../models/Giveaway');

const client = require("../index");
const tiktok = require('@tobyg74/tiktok-api-dl'); // Require the new library
const musicButtonHandler = require('../utils/Music/buttonHandler.js');
const musicModalHandler = require('../utils/Music/modalHandler.js');
const pixivAddon = require('../commands/Addons/Pixiv/pixiv.js');



module.exports = async (client, interaction) => {
    // Parallelize DB calls to prevent timeout
    const loadDataPromise = Promise.all([
        getLang(interaction.guildId),
        interaction.guild ? require('../models/guildDataSchema').findOne({ guildID: interaction.guild.id }).catch(e => {
            console.error("Error fetching guild data:", e);
            return null;
        }) : Promise.resolve(null)
    ]);

    const [lang, guildData] = await loadDataPromise;
    interaction.lang = lang; // Attach to interaction for helpers

    if (interaction.isCommand()) {
        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return;

        // Anti-Grief check: Disabled Commands
        if (guildData && guildData.safety && guildData.safety.disabledCommands) {
            if (guildData.safety.disabledCommands.includes(interaction.commandName)) {
                return interaction.reply({ 
                    content: lang.Errors.CommandDisabled || "❌ This command is currently disabled in this server.", 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }

        try {
            await command.execute(interaction, lang);
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
            if (interaction.customId.startsWith('kb_') || interaction.customId.startsWith('kenta_')) {
                const handler = require('../utils/kentaInteractionManager');
                await handler.handleInteraction(interaction, client);
                return;
            }
            if (interaction.customId === 'check_percent' || interaction.customId === 'show_entrants') {
                await giveawayActions.handleButtonInteraction(interaction);
                return;
            }
            // Music Handler
            if (interaction.customId.startsWith('music_') || 
                interaction.customId.startsWith('search_') || 
                interaction.customId.startsWith('language_') || 
                interaction.customId.startsWith('autoplay_genre') ||
                interaction.customId === 'help_refresh') {
                await musicButtonHandler.execute(interaction);
                return;
            }
            // Pixiv Handler
            if (interaction.customId.startsWith('pixiv_save_')) {
                // ... (Pixiv save logic)
                const PixivApi = require('pixiv-api-client');
                const pixiv = new PixivApi();
                const illustId = interaction.customId.split('_')[2];

                const refreshToken = async () => {
                    if (config.API_Keys.Pixiv && config.API_Keys.Pixiv.RefreshToken) {
                        await pixiv.refreshAccessToken(config.API_Keys.Pixiv.RefreshToken);
                    } else {
                        throw new Error('Pixiv Refresh Token not found in config.yml');
                    }
                };

                try {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    await refreshToken();
                    await pixiv.bookmarkIllust(illustId);
                    return await interaction.editReply({ content: 'Đã lưu ảnh vào bộ sưu tập Pixiv của bạn!' });
                } catch (error) {
                    const { handleError } = require('../utils/errorHandler.js');
                    await handleError(error, interaction);
                }
                return;
            }
            if (interaction.customId.startsWith('pixiv_')) {
                try {
                    const handled = await pixivAddon.handleButtonInteraction(interaction);
                    if (handled) return;
                } catch (error) {
                    const { handleError } = require('../utils/errorHandler.js');
                    await handleError(error, interaction);
                }
            }

            // Verification Captcha Handler
            if (interaction.customId.startsWith('cell_') || interaction.customId === 'submit_captcha') {
                await handleVerificationInteraction(client, interaction);
                return;
            }

            await handleButtonInteraction(client, interaction);
        } else if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('kb_') || interaction.customId.startsWith('kenta_')) {
                 const handler = require('../utils/kentaInteractionManager');
                 await handler.handleInteraction(interaction, client);
                 return;
            }
            // Music Select Handler (if any - based on index.js logic which checked button OR select for music_)
            if (interaction.customId.startsWith('music_') || 
                interaction.customId.startsWith('search_') || 
                interaction.customId.startsWith('language_') || 
                interaction.customId.startsWith('autoplay_genre')) {
                await musicButtonHandler.execute(interaction);
                return;
            }

            await handleSelectMenuInteraction(client, interaction);
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('kb_') || interaction.customId.startsWith('kenta_')) {
                const handler = require('../utils/kentaInteractionManager');
                await handler.handleInteraction(interaction, client);
                return;
            }
            // Music Modal Handler
            if (interaction.customId === 'volume_modal') {
                 await musicModalHandler.execute(interaction);
                 return;
            }

            await handleModalSubmitInteraction(client, interaction);
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
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'An error occurred while processing your interaction. Please try again later.', flags: MessageFlags.Ephemeral }).catch(console.error);
        } else {
            await interaction.reply({ content: 'An error occurred while processing your interaction. Please try again later.', flags: MessageFlags.Ephemeral }).catch(console.error);
        }
    }
};

async function handleSelectMenuInteraction(client, interaction) {
    try {

    } catch (error) {
        console.error('Error handling select menu interaction:', error);
    }
}

async function handleButtonInteraction(client, interaction) {
    const [action, uniqueId, subAction] = interaction.customId.split('-');

    if (interaction.customId.startsWith('music_') || interaction.customId.startsWith('queue_')) {
        const buttonHandler = require('../utils/Music/buttonHandler');
        return buttonHandler.execute(interaction);
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

        case 'join_giveaway':
            await handleJoinGiveaway(client, interaction);
            break;
        case 'check_percent':
            await handleCheckPercent(client, interaction);
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
    const lang = interaction.lang || await getLang(interaction.guildId);
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

        const lang = interaction.lang || await getLang(interaction.guildId);
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