const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const handleTicketAlertReset = require('./Tickets/handleTicketAlertReset.js');
//const fs = require('fs');
//const yaml = require("js-yaml");
const { getConfig, getLang } = require('../utils/configLoader');

const config = getConfig();
const lang = getLang();

const moment = require('moment-timezone');
const { handleXP } = require('./Levels/handleXP');
const handleMessageCount = require('./Levels/handleMessageCount');
const UserData = require('../models/UserData');
const utils = require('../utils');
const GuildData = require('../models/guildDataSchema');
const AutoReact = require('../models/autoReact');
const AutoResponse = require('../models/autoResponse');
const suggestionActions = require('./Suggestions/suggestionActions');
const SuggestionBlacklist = require('../models/SuggestionBlacklist');

let spamData = new Map();

const convertPatternToRegex = (pattern) => {
    if (pattern.startsWith('regex:')) {
        return new RegExp(pattern.slice(6), 'i');
    }

    let regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');

    if (pattern.includes('*')) {
        return new RegExp(regexPattern, 'i');
    }
    
    return new RegExp(`^${regexPattern}$`, 'i');
};

const checkBlacklistWords = async (message, dmSent) => {
    if (!config.BlacklistWords.Enabled) return dmSent;
    
    if (message.member.permissions.has(config.BlacklistWords.BypassPerms)) {
        return dmSent;
    }

    const hasBypassRole = message.member.roles.cache.some(role => 
        config.BlacklistWords.BypassRoles.includes(role.id)
    );
    if (hasBypassRole) {
        return dmSent;
    }

    if (config.BlacklistWords.WhitelistChannels.includes(message.channel.id) ||
        (message.channel.parentId && config.BlacklistWords.WhitelistCategories.includes(message.channel.parentId))) {
        return dmSent;
    }

    const content = message.content;
    
    const whitelistMatched = config.BlacklistWords.WhitelistWords.some(word => {
        const regex = convertPatternToRegex(word);
        return regex.test(content);
    });

    if (whitelistMatched) {
        return dmSent;
    }

    let triggeredPattern = null;
    for (const pattern of config.BlacklistWords.Patterns) {
        const regex = convertPatternToRegex(pattern);
        if (regex.test(content)) {
            triggeredPattern = pattern;
            break;
        }
    }

    if (triggeredPattern) {
        try {
            await message.delete();
            
            const filterWordsMsg = config.BlacklistWords.Message
                .replace(/{user}/g, `<@${message.author.id}>`);
            const notificationMsg = await message.channel.send(filterWordsMsg);
            setTimeout(() => notificationMsg.delete().catch(console.error), 3000);

            if (config.BlacklistWords.DM.Enabled && !dmSent) {
                const currentTime = moment().tz(config.Timezone);
                const replacements = {
                    user: message.author.username,
                    blacklistedword: triggeredPattern,
                    shorttime: currentTime.format("HH:mm"),
                    longtime: currentTime.format('MMMM Do YYYY')
                };

                try {
                    if (config.BlacklistWords.DM.Type === "Message") {
                        let dmMessage = config.BlacklistWords.DM.Message;
                        Object.entries(replacements).forEach(([key, value]) => {
                            dmMessage = dmMessage.replace(new RegExp(`{${key}}`, 'g'), value);
                        });
                        await message.author.send(dmMessage);
                    } else if (config.BlacklistWords.DM.Type === "Embed") {
                        const embedConfig = config.BlacklistWords.DM.Embed;
                        const embed = new EmbedBuilder()
                            .setColor(embedConfig.Color)
                            .setTitle(embedConfig.Title)
                            .setDescription(embedConfig.Description.map(line => 
                                Object.entries(replacements).reduce((str, [key, value]) => 
                                    str.replace(new RegExp(`{${key}}`, 'g'), value)
                                , line)
                            ).join('\n'));

                        if (embedConfig.Footer) {
                            embed.setFooter({ 
                                text: embedConfig.Footer.replace(/{shorttime}/g, replacements.shorttime) 
                            });
                        }

                        if (embedConfig.Thumbnail) {
                            embed.setThumbnail(message.author.displayAvatarURL());
                        }

                        await message.author.send({ embeds: [embed] });
                    }
                    dmSent = true;
                } catch (err) {
                    console.error('Failed to send DM:', err);
                }
            }

            if (config.BlacklistWords.LogsChannelID) {
                const logsChannel = message.guild.channels.cache.get(config.BlacklistWords.LogsChannelID);
                if (logsChannel) {
                    const currentTime = moment().tz(config.Timezone);
                    const embedConfig = config.BlacklistWords.Embed;
                    const embed = new EmbedBuilder()
                        .setColor(embedConfig.Color)
                        .setTitle(embedConfig.Title)
                        .setDescription(embedConfig.Description.map(line => 
                            line.replace(/{user}/g, `<@${message.author.id}>`)
                                .replace(/{blacklistedword}/g, triggeredPattern)
                                .replace(/{shorttime}/g, currentTime.format("HH:mm"))
                                .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'))
                                .replace(/{guildName}/g, message.guild.name)
                        ).join('\n'));

                    if (embedConfig.Footer.Text) {
                        embed.setFooter({ 
                            text: embedConfig.Footer.Text.replace(/{guildName}/g, message.guild.name),
                            iconURL: message.guild.iconURL()
                        });
                    }

                    if (embedConfig.Thumbnail) {
                        embed.setThumbnail(message.author.displayAvatarURL());
                    }

                    await logsChannel.send({ embeds: [embed] });
                }
            }

            return true;
        } catch (error) {
            console.error('Error handling blacklisted word:', error);
        }
    }
    
    return dmSent;
};

module.exports = async (client, message) => {
    // if (message.mentions.has(client.user.id) && !message.mentions.everyone) {
    //     const botPing = Math.round(client.ws.ping);
    //     const response = `:small_red_triangle: | ( Shard ${message.guild.shardId}) phản hồi trong (${botPing} ms / trung bình: ${botPing} ms).\n        | Để xem các lệnh có sẵn, sử dụng /help. Để xem các thông tin khác, sử dụng /botinfo`;
    //     message.channel.send(response);
    //     return;
    // }
    if (!message.guild || !message.member || message.author.bot) {
        return;
    }

    handleTicketAlertReset(message);
    
    let dmSent = false;

    if (!client.buttonHandlersRegistered) {
        client.on('interactionCreate', async (interaction) => {
            if (interaction.isButton() && interaction.customId.startsWith('reply_')) {
                await handleButtonInteraction(interaction);
            }
        });
        client.buttonHandlersRegistered = true;
    }

    if (message.content.startsWith(config.CommandsPrefix)) {
        const args = message.content.slice(config.CommandsPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = client.messageCommands.get(commandName);

        if (command) {
            try {
                await command.run(client, message, args);
            } catch (error) {
                console.error(`Error executing message command ${command.name}:`, error);
                message.reply('There was an error trying to execute that command!');
            }
            return; // Command found and executed, so we stop here.
        }
        
        // If not found in messageCommands, it might be a custom command from config.
        try {
            await processCustomCommands(client, message);
        } catch (error) {
            console.error('Error in custom command processing:', error);
        }
    }

    dmSent = await checkBlacklistWords(message, dmSent);
    
    if (message.deletable) {
        await handleMessageCount(message);
        await handleXP(message);
        await checkAutoReact(message);

        dmSent = await checkAntiMassMention(message);
        await checkAntiSpam(message);

        try {
            await GuildData.findOneAndUpdate(
                { guildID: message.guild.id },
                { $inc: { totalMessages: 1 } },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        } catch (error) {
            console.error('Error updating GuildData:', error);
        }

        processAutoResponses(message);
        handleVerificationSettings(message);

        const suggestionInputChannel = config.SuggestionSettings.ChannelSuggestionID || config.SuggestionSettings.ChannelID;
        if (message.channel.id === suggestionInputChannel) {
            if (!config.SuggestionSettings.AllowChannelSuggestions) {
                return;
            }

            const messageContent = message.content;

            const hasAllowedRole = config.SuggestionSettings.AllowedRoles.length === 0 || 
                config.SuggestionSettings.AllowedRoles.some(roleId => message.member.roles.cache.has(roleId));

            if (!hasAllowedRole) {
                const errorMsg = await message.channel.send({ 
                    content: lang.NoPermsMessage
                });
                
                if (config.SuggestionSettings.DeleteFailureMessages) {
                    setTimeout(() => errorMsg.delete().catch(console.error), 
                        config.SuggestionSettings.FailureMessageTimeout);
                }

                if (config.SuggestionSettings.DeleteOriginalMessage) {
                    await message.delete().catch(console.error);
                }
                return;
            }

            const isBlacklisted = await SuggestionBlacklist.findOne({ userId: message.author.id });
            
            if (isBlacklisted) {
                const errorMsg = await message.channel.send({
                    content: lang.Suggestion.BlacklistMessage
                });
                
                if (config.SuggestionSettings.DeleteFailureMessages) {
                    setTimeout(() => errorMsg.delete().catch(console.error), 
                        config.SuggestionSettings.FailureMessageTimeout);
                }

                if (config.SuggestionSettings.DeleteOriginalMessage) {
                    await message.delete().catch(console.error);
                }
                return;
            }

            if (config.SuggestionSettings.blockBlacklistWords) {
                const messageObj = { content: messageContent, member: message.member, channel: message.channel, author: message.author, deletable: true };
                const hasBlacklistedWords = await checkBlacklistWords(messageObj, false);
                if (hasBlacklistedWords) {
                    const errorMsg = await message.channel.send({
                        content: lang.BlacklistWords.Message.replace(/{user}/g, message.author.toString())
                    });
                    
                    if (config.SuggestionSettings.DeleteFailureMessages) {
                        setTimeout(() => errorMsg.delete().catch(console.error), 
                            config.SuggestionSettings.FailureMessageTimeout);
                    }

                    if (config.SuggestionSettings.DeleteOriginalMessage) {
                        await message.delete().catch(console.error);
                    }
                    return;
                }
            }

            try {
                await suggestionActions.createSuggestion(client, message, messageContent);
                
                if (config.SuggestionSettings.DeleteOriginalMessage) {
                    try {
                        await message.delete().catch(error => {
                            if (error.code !== 10008) { 
                                console.error('Error deleting message:', error);
                            }
                        });
                    } catch (error) {
                        if (error.code !== 10008) {
                            console.error('Error deleting message:', error);
                        }
                    }
                }
            } catch (error) {
                console.error('Error creating suggestion:', error);
                const errorMsg = await message.channel.send({ 
                    content: `${message.author}, ${lang.Suggestion.Error}`
                });
                
                setTimeout(() => errorMsg.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Error deleting error message:', error);
                    }
                }), 5000);
            }
        }
    }
};

async function handleButtonInteraction(interaction) {
    if (!interaction.isButton()) return;
    

    const [action, ...contextParts] = interaction.customId.split('_');

    if (action === 'reply') {
        try {
            const buttonIndex = parseInt(contextParts.pop());
            const commandPath = contextParts;

            if (!commandPath.length) {
                console.error('Invalid command path');
                await interaction.reply({ content: 'Invalid command configuration', flags: MessageFlags.Ephemeral });
                return;
            }

            let currentConfig = config.CustomCommands[commandPath[0]];
            
            if (!currentConfig) {
                console.error('Command not found:', commandPath[0]);
                await interaction.reply({ content: 'Command configuration not found', flags: MessageFlags.Ephemeral });
                return;
            }

            for (let i = 1; i < commandPath.length; i += 2) {
                if (commandPath[i] === 'reply') {
                    const prevButtonIndex = parseInt(commandPath[i + 1]);
                    if (!currentConfig.Buttons?.[prevButtonIndex]?.Reply) {
                        console.error('Invalid button configuration at depth:', i);
                        await interaction.reply({ content: 'Invalid button configuration', flags: MessageFlags.Ephemeral });
                        return;
                    }
                    currentConfig = currentConfig.Buttons[prevButtonIndex].Reply;
                }
            }

            const buttonConfig = currentConfig.Buttons?.[buttonIndex];
            
            if (!buttonConfig || buttonConfig.Type !== "REPLY" || !buttonConfig.Reply) {
                console.error('Invalid button configuration:', { buttonIndex, config: buttonConfig });
                await interaction.reply({ content: 'Button configuration not found', flags: MessageFlags.Ephemeral });
                return;
            }

            const replyConfig = buttonConfig.Reply;

            let responseOptions = {
                ephemeral: replyConfig.Ephemeral ?? false
            };

            if (replyConfig.Embed) {
                const embed = new EmbedBuilder();

                if (replyConfig.Embed.Color) {
                    embed.setColor(replyConfig.Embed.Color);
                }

                if (replyConfig.Embed.Title) {
                    embed.setTitle(replyConfig.Embed.Title);
                }

                if (replyConfig.Embed.Description) {
                    const description = Array.isArray(replyConfig.Embed.Description) 
                        ? replyConfig.Embed.Description.join('\n')
                        : replyConfig.Embed.Description;
                    embed.setDescription(description);
                }

                if (replyConfig.Embed.Footer?.Text) {
                    embed.setFooter({
                        text: replyConfig.Embed.Footer.Text,
                        iconURL: replyConfig.Embed.Footer.Icon
                    });
                }

                if (replyConfig.Embed.Author?.Text) {
                    embed.setAuthor({
                        name: replyConfig.Embed.Author.Text,
                        iconURL: replyConfig.Embed.Author.Icon,
                        url: replyConfig.Embed.Author.URL
                    });
                }

                if (replyConfig.Embed.Image) {
                    embed.setImage(replyConfig.Embed.Image);
                }

                if (replyConfig.Embed.Thumbnail) {
                    embed.setThumbnail(replyConfig.Embed.Thumbnail);
                }

                if (replyConfig.Embed.Timestamp) {
                    embed.setTimestamp();
                }

                if (replyConfig.Embed.Fields?.length > 0) {
                    replyConfig.Embed.Fields.forEach(field => {
                        if (field.Name && field.Value) {
                            embed.addFields({
                                name: field.Name,
                                value: field.Value,
                                inline: field.Inline ?? false
                            });
                        }
                    });
                }

                responseOptions.embeds = [embed];
            }

            if (replyConfig.Text) {
                responseOptions.content = replyConfig.Text;
            }

            if (replyConfig.Buttons?.length > 0) {
                const fullPath = [...commandPath, 'reply', buttonIndex].join('_');
                const buttons = createButtons(replyConfig.Buttons, fullPath);
                if (buttons) {
                    responseOptions.components = [buttons];
                }
            }

            if (!responseOptions.content && (!responseOptions.embeds || responseOptions.embeds.length === 0)) {
                responseOptions.content = "No content available for this option.";
            }

            if (interaction.replied) {
                await interaction.followUp(responseOptions);
            } else {
                await interaction.reply(responseOptions);
            }

        } catch (error) {
            console.error('Error handling button interaction:', error);
            if (!interaction.replied) {
                await interaction.reply({ 
                    content: 'An error occurred while processing your request.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
    }
}

function createButtons(buttonsConfig, commandContext) {
    const buttons = [];

    buttonsConfig.forEach((buttonConfig, index) => {
        const button = new ButtonBuilder()
            .setLabel(buttonConfig.Name);

        if (buttonConfig.Emoji) {
            button.setEmoji(buttonConfig.Emoji);
        }

        if (buttonConfig.Type === "REPLY") {
            button.setCustomId(`reply_${commandContext}_${index}`);
            button.setStyle(ButtonStyle[buttonConfig.Style] || ButtonStyle.Primary);
        } else if (buttonConfig.Type === "LINK") {
            button.setStyle(ButtonStyle.Link)
                  .setURL(buttonConfig.Link);
        } else {
            console.error(`Unknown button type: ${buttonConfig.Type}`);
        }

        buttons.push(button);
    });

    return buttons.length > 0 ? new ActionRowBuilder().addComponents(buttons) : null;
}

async function checkAutoReact(message) {
    const autoReactData = await AutoReact.findOne({ guildId: message.guild.id });
    if (!autoReactData || autoReactData.reactions.length === 0) return;

    autoReactData.reactions.forEach(reaction => {
        if (message.content.toLowerCase().includes(reaction.keyword.toLowerCase())) {
            if (isEligibleForReaction(message, reaction)) {
                message.react(reaction.emoji).catch(error => {
                    if (error.code === 10008) {
                    } else {
                        console.error("Error reacting to message:", error);
                    }
                });
            }
        }
    });
}


function isEligibleForReaction(message, reaction) {
    const memberRoles = message.member.roles.cache;
    const channelId = message.channel.id;
    const validRoleIds = reaction.whitelistRoles.filter(roleId => !isNaN(roleId));
    const isRoleEligible = validRoleIds.length === 0 || memberRoles.some(role => validRoleIds.includes(role.id));
    const validChannelIds = reaction.whitelistChannels.filter(channelId => !isNaN(channelId));
    const isChannelEligible = validChannelIds.length === 0 || validChannelIds.includes(channelId);
    return isRoleEligible && isChannelEligible;
}

async function checkAntiMassMention(message) {
    if (!config.AntiMassMention.Enabled) return;

    const mentionBypass = hasPermissionOrRole(message.member, config.AntiMassMention.BypassPerms, config.AntiMassMention.BypassRoles);
    if (mentionBypass) return;

    if (message.mentions.users.size > config.AntiMassMention.Amount) {
        try {
            await message.delete();
        } catch (error) {
            if (error.code === '5152') {
                console.error('Failed to delete message:', error);
            } else {
                console.error(`Error deleting message: ${error}`);
            }
        }

        const warningMsg = await message.channel.send(
            config.AntiMassMention.Message.replace(/{user}/g, `<@${message.author.id}>`)
        );
        setTimeout(() => warningMsg.delete().catch(console.error), 3000);

        if (config.AntiMassMention.TimeoutUser === true) {
            const timeInMs = parseDuration(config.AntiMassMention.TimeoutTime);
            try {
                await message.member.timeout(timeInMs, "Mass Mention (Auto Moderation)");
                await UserData.updateOne(
                    { userId: message.author.id, guildId: message.guild.id },
                    { $inc: { timeouts: 1 } }
                );

                const logEmbed = createLogEmbed(
                    'Auto Moderation',
                    'Red',
                    'Mass Mention Detected',
                    `**User:** <@${message.author.id}> \n**Action:** Timeout`,
                    [
                        { name: 'Reason', value: 'Mass Mention', inline: true },
                        { name: 'Duration', value: humanReadableDuration(timeInMs), inline: true },
                        { name: 'Mentions', value: `${message.mentions.users.size} users`, inline: true }
                    ],
                    `User ID: ${message.author.id}`
                );

                sendLogMessage(message.guild, config.AntiMassMention.LogsChannelID, logEmbed);

                if (config.AntiMassMention.SendDM) {
                    const dmData = {
                        user: message.author.username,
                        time: config.AntiMassMention.TimeoutTime
                    };
                    await sendDirectMessage(message.author, config.AntiMassMention.DirectMessage, dmData);
                }
            } catch (error) {
                console.error('Error applying timeout:', error);
            }
        }
    }
}

function parseDuration(duration) {
    if (!duration) return 0;
    
    const regex = /(\d+)([smhd])/;
    const match = duration.match(regex);
    
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 0;
    }
}

function hasPermissionOrRole(member, permissions = [], roles = []) {
    if (!member) return false;
    
    if (permissions.length > 0) {
        if (member.permissions.has(permissions)) return true;
    }
    
    if (roles.length > 0) {
        return member.roles.cache.some(role => roles.includes(role.id));
    }
    
    return false;
}

function createLogEmbed(title, color, header, description, fields = [], footer = '') {
    const embed = new EmbedBuilder()
        .setTitle(header)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    if (fields.length > 0) {
        fields.forEach(field => {
            embed.addFields({ name: field.name, value: field.value, inline: field.inline || false });
        });
    }

    if (footer) {
        embed.setFooter({ text: footer });
    }

    return embed;
}

function sendLogMessage(guild, channelId, embed) {
    if (!channelId) return;
    const channel = guild.channels.cache.get(channelId);
    if (channel) {
        channel.send({ embeds: [embed] }).catch(console.error);
    }
}

function humanReadableDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}

async function sendDirectMessage(user, message, data) {
    try {
        let formattedMessage = message;
        for (const [key, value] of Object.entries(data)) {
            formattedMessage = formattedMessage.replace(`{${key}}`, value);
        }
        await user.send(formattedMessage);
    } catch (error) {
        console.error('Failed to send DM:', error);
    }
}

async function checkAntiSpam(message) {
    if (!config.AntiSpam.Enabled) return;

    const spamBypass = hasPermissionOrRole(message.member, config.AntiSpam.BypassPerms, config.AntiSpam.BypassRoles);
    if (spamBypass) return;

    const now = Date.now();
    const timeLimit = parseDuration(config.AntiSpam.TimeLimit);

    if (!spamData.has(message.author.id)) {
        spamData.set(message.author.id, {
            msgCount: 1,
            firstMessage: now,
            messages: [message]
        });
    } else {
        const userData = spamData.get(message.author.id);
        const timeDiff = now - userData.firstMessage;

        if (timeDiff < timeLimit) {
            userData.msgCount++;
            userData.messages.push(message);
            spamData.set(message.author.id, userData);

            if (userData.msgCount >= config.AntiSpam.MsgLimit) {
                const timeInMs = parseDuration(config.AntiSpam.TimeoutTime);
                try {
                    const warningMsg = await message.channel.send(
                        config.AntiSpam.Message.replace(/{user}/g, `<@${message.author.id}>`)
                    );
                    setTimeout(() => warningMsg.delete().catch(console.error), 3000);

                    await message.member.timeout(timeInMs, "Spamming (Auto Moderation)");
                    
                    await UserData.updateOne(
                        { userId: message.author.id, guildId: message.guild.id },
                        { $inc: { timeouts: 1 } }
                    ).catch(console.error);

                    const logEmbed = createLogEmbed(
                        'Auto Moderation',
                        'Red',
                        'Spam Detected',
                        `**User:** <@${message.author.id}> \n**Action:** Timeout`,
                        [
                            { name: 'Reason', value: 'Spamming Messages', inline: true },
                            { name: 'Duration', value: humanReadableDuration(timeInMs), inline: true },
                            { name: 'Messages', value: `${userData.msgCount} messages in ${humanReadableDuration(timeLimit)}`, inline: true }
                        ],
                        `User ID: ${message.author.id}`
                    );

                    sendLogMessage(message.guild, config.AntiSpam.LogsChannelID, logEmbed);

                    if (config.AntiSpam.SendDM) {
                        const dmData = {
                            user: message.author.username,
                            guildName: message.guild.name,
                            messageContent: message.content,
                            time: config.AntiSpam.TimeoutTime
                        };
                        await sendDirectMessage(message.author, config.AntiSpam.DirectMessage, dmData);
                    }

                    try {
                        const messagesToDelete = userData.messages.map(m => m.id);
                        await message.channel.bulkDelete(messagesToDelete).catch(console.error);
                    } catch (error) {
                        console.error('Failed to delete messages:', error);
                    }

                } catch (error) {
                    console.error(`Error handling spam timeout: ${error}`);
                }

                spamData.delete(message.author.id);
            }
        } else {
            spamData.set(message.author.id, {
                msgCount: 1,
                firstMessage: now,
                messages: [message]
            });
        }
    }
}

// function isValidHttpUrl(string) {
//     let url;

//     try {
//         url = new URL(string);
//     } catch (_) {
//         return false;
//     }

//     return url.protocol === "http:" || url.protocol === "https:";
// }

function removeTags(text) {
    text = text.replace(/@everyone/gi, "everyone").replace(/@here/gi, "here");
    text = text.replace(/<@&\d+>/g, "(role mention removed)");
    text = text.replace(/@(?!everyone|here)(\w+)/gi, "$1");
    return text;
}

function replaceCustomCommandPlaceholders(template, message, placeholders = {}) {
    if (!template) {
        return '\u200b';
    }

    const defaultPlaceholders = {
        guildName: message.guild.name,
        guildId: message.guild.id,
        userName: message.author.username,
        userId: message.author.id,
        userMention: message.author.toString(),
        channelName: message.channel.name,
        channelId: message.channel.id,
        channelMention: message.channel.toString(),
        commandName: placeholders.commandName || '',
        longTime: moment().tz(config.Timezone).format('MMMM Do YYYY'),
        shortTime: moment().tz(config.Timezone).format("HH:mm"),
        memberCount: message.guild.memberCount
    };

    const allPlaceholders = { ...defaultPlaceholders, ...placeholders };

    return Object.keys(allPlaceholders).reduce((acc, key) => {
        const regex = new RegExp(`{${key}}`, 'gi');
        return acc.replace(regex, allPlaceholders[key] || '');
    }, template);
}

async function processCustomCommands(client, message) {
    try {        
        if (!config) {
            return;
        }
        
        if (!config.CommandsEnabled || message.author.bot || !message.content.startsWith(config.CommandsPrefix)) {
            return;
        }

        const args = message.content.slice(config.CommandsPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = config.CustomCommands[commandName];
        if (!command) return;
        
        if (!command.Roles || !Array.isArray(command.Roles.Whitelist)) {
            return;
        }

        const memberRoles = message.member.roles.cache.map(role => role.id);

        const isWhitelisted = command.Roles.Whitelist.length === 0 || 
            command.Roles.Whitelist.some(roleId => memberRoles.includes(roleId));

        if (!isWhitelisted) {
            return;
        }

        let responseOptions = {};
        if (command.type === "EMBED") {
            const embed = new EmbedBuilder()
                .setColor(command.Embed.Color || null);

            if (command.Embed.Title) {
                embed.setTitle(replaceCustomCommandPlaceholders(command.Embed.Title, message, { commandName }));
            }

            if (command.Embed.Description && command.Embed.Description.length > 0) {
                const description = command.Embed.Description.map(line => 
                    replaceCustomCommandPlaceholders(line, message, { commandName })
                ).join("\n");
                embed.setDescription(description);
            }

            if (command.Embed.Footer && command.Embed.Footer.Text) {
                const footerText = replaceCustomCommandPlaceholders(command.Embed.Footer.Text, message, { commandName });
                const footerIcon = command.Embed.Footer.Icon ? 
                    replaceCustomCommandPlaceholders(command.Embed.Footer.Icon, message, { commandName }) : 
                    undefined;
                embed.setFooter({ text: footerText, iconURL: footerIcon });
            }

            if (command.Embed.Author && command.Embed.Author.Text) {
                const authorName = replaceCustomCommandPlaceholders(command.Embed.Author.Text, message, { commandName });
                const authorIcon = command.Embed.Author.Icon ? 
                    replaceCustomCommandPlaceholders(command.Embed.Author.Icon, message, { commandName }) : 
                    undefined;
                embed.setAuthor({ name: authorName, iconURL: authorIcon });
            }

            if (command.Embed.Thumbnail) {
                embed.setThumbnail(replaceCustomCommandPlaceholders(command.Embed.Thumbnail, message, { commandName }));
            }

            if (command.Embed.Image) {
                embed.setImage(replaceCustomCommandPlaceholders(command.Embed.Image, message, { commandName }));
            }

            if (command.Embed.Fields) {
                command.Embed.Fields.forEach(field => {
                    if (field.Name && field.Value) {
                        const fieldName = replaceCustomCommandPlaceholders(field.Name, message, { commandName });
                        const fieldValue = replaceCustomCommandPlaceholders(field.Value, message, { commandName });
                        embed.addFields({ name: fieldName, value: fieldValue, inline: field.Inline ?? false });
                    }
                });
            }

            responseOptions.embeds = [embed];

            if (command.Buttons && Array.isArray(command.Buttons)) {
                const buttons = createButtons(command.Buttons, commandName);
                if (buttons) {
                    responseOptions.components = [buttons];
                }
            }
        } else if (command.type === "TEXT") {
            responseOptions.content = replaceCustomCommandPlaceholders(command.text, message, { commandName });
        }

        if (!responseOptions.content && (!responseOptions.embeds || responseOptions.embeds.length === 0)) {
            return;
        }

        try {
            if (command.Options.ReplyToUser) {
                await message.reply(responseOptions);
            } else {
                await message.channel.send(responseOptions);
            }

            if (command.Options.DeleteTriggerMessage) {
                try {
                    await message.delete();
                } catch (error) {
                    console.error(`Error deleting message: ${error}`);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    } catch (error) {
        console.error('Error processing custom commands:', error);
    }
}

async function processAutoResponses(message) {
    try {
        const guildId = message.guild.id;
        
        const autoResponses = await AutoResponse.find({ guildId }).lean();
        
        if (!autoResponses || autoResponses.length === 0) {
            return;
        }

        const messageContent = message.content.toLowerCase().trim();
        const messageWords = messageContent.split(/\s+/);

        for (const response of autoResponses) {
            const trigger = response.trigger.toLowerCase().trim();
            
            const isExactMatch = messageContent === trigger || 
                               messageWords.some(word => word === trigger);
            
            if (isExactMatch) {
                
                if (response.whitelistRoles?.length > 0 && !response.whitelistRoles.some(roleId => message.member.roles.cache.has(roleId))) {
                    continue;
                }
                if (response.blacklistRoles?.some(roleId => message.member.roles.cache.has(roleId))) {
                    continue;
                }
                if (response.whitelistChannels?.length > 0 && !response.whitelistChannels.includes(message.channel.id)) {
                    continue;
                }
                if (response.blacklistChannels?.includes(message.channel.id)) {
                    continue;
                }

                if (response.type === 'text' && response.content) {
                    await message.reply(response.content).catch(error => {
                        console.error('Failed to send text response:', error);
                    });
                }
                else if (response.type === 'embed' && response.embed) {
                    const embed = new EmbedBuilder()
                        .setColor(response.embed.color || '#5865F2');

                    if (response.embed.title) {
                        embed.setTitle(response.embed.title);
                    }

                    if (response.embed.description) {
                        embed.setDescription(response.embed.description);
                    }

                    if (response.embed.author?.name) {
                        embed.setAuthor({
                            name: response.embed.author.name,
                            iconURL: response.embed.author.icon_url || null
                        });
                    }

                    if (response.embed.footer?.text) {
                        embed.setFooter({
                            text: response.embed.footer.text,
                            iconURL: response.embed.footer.icon_url || null
                        });
                    }

                    if (response.embed.thumbnail) {
                        embed.setThumbnail(response.embed.thumbnail);
                    }

                    if (response.embed.image) {
                        embed.setImage(response.embed.image);
                    }

                    if (response.embed.fields && response.embed.fields.length > 0) {
                        const limitedFields = response.embed.fields.slice(0, 25);
                        limitedFields.forEach(field => {
                            if (field.name && field.value) {
                                embed.addFields({
                                    name: field.name,
                                    value: field.value,
                                    inline: field.inline || false
                                });
                            }
                        });
                    }

                    await message.reply({ embeds: [embed] }).catch(error => {
                    });
                }
                else if (response.responseType === 'TEXT' && response.responseText) {
                    await message.reply(response.responseText).catch(error => {
                        console.error('Failed to send text response:', error);
                    });
                }
                else if (response.responseType === 'EMBED' && response.embedData) {
                    const embed = new EmbedBuilder()
                        .setColor(response.embedData.color || '#5865F2');

                    if (response.embedData.title) {
                        embed.setTitle(response.embedData.title);
                    }

                    if (response.embedData.description) {
                        embed.setDescription(response.embedData.description);
                    }

                    if (response.embedData.author?.name) {
                        embed.setAuthor({
                            name: response.embedData.author.name,
                            iconURL: response.embedData.author.icon_url || null
                        });
                    }

                    if (response.embedData.footer?.text) {
                        embed.setFooter({
                            text: response.embedData.footer.text,
                            iconURL: response.embedData.footer.icon_url || null
                        });
                    }

                    if (response.embedData.thumbnail?.url) {
                        embed.setThumbnail(response.embedData.thumbnail.url);
                    }

                    if (response.embedData.image?.url) {
                        embed.setImage(response.embedData.image.url);
                    }

                    if (response.embedData.fields && response.embedData.fields.length > 0) {
                        const limitedFields = response.embedData.fields.slice(0, 25);
                        limitedFields.forEach(field => {
                            if (field.name && field.value) {
                                embed.addFields({
                                    name: field.name,
                                    value: field.value,
                                    inline: field.inline || false
                                });
                            }
                        });
                    }

                    await message.reply({ embeds: [embed] }).catch(error => {
                        console.error('Failed to send embed response:', error);
                    });
                }
                else {
                }
                break;
            }
        }
    } catch (error) {
        console.error('Error processing auto responses:', error);
    }
}

// function replacePlaceholders(text, message, additionalPlaceholders = {}) {
//     if (!text || typeof text !== 'string') return '';

//     const currentTime = moment().tz(config.Timezone);

//     const placeholders = {
//         user: message.author ? `<@${message.author.id}>` : 'Unknown User',
//         userName: message.author ? message.author.username : 'Unknown Username',
//         userTag: message.author ? message.author.tag : 'Unknown UserTag',
//         userId: message.author ? message.author.id : 'Unknown UserID',
//         guildName: message.guild ? message.guild.name : 'Unknown Guild',
//         channelName: message.channel ? message.channel.name : 'Unknown Channel',
//         channelId: message.channel ? message.channel.id : 'Unknown ChannelID',
//         blacklistedword: additionalPlaceholders.blacklistedword || 'None',
//         antiinvitelink: additionalPlaceholders.antiInviteLink || 'No Link Detected',
//         shorttime: currentTime.format("HH:mm"),
//         longtime: currentTime.format('MMMM Do YYYY'),
//         ...additionalPlaceholders
//     };

//     return Object.keys(placeholders).reduce((acc, key) => {
//         const regex = new RegExp(`{${key}}`, 'gi');
//         return acc.replace(regex, placeholders[key] || '');
//     }, text);
// }

function handleVerificationSettings(message) {
    try {
        if (config.VerificationSettings.Enabled && message && message.channel) {
            if (config.VerificationSettings.DeleteAllMessages && 
                message.channel.id === config.VerificationSettings.ChannelID) {
                message.delete().catch((error) => {
                    if (error.code !== 10008) {
                        console.error("Error deleting message:", error);
                    }
                });
            }

            if (config.VerificationSettings.SendEmbedOnJoin && message.type === "GUILD_MEMBER_JOIN") {
                const embed = new EmbedBuilder()
                    .setColor(config.VerificationSettings.Embed.Color)
                    .setTitle(config.VerificationSettings.Embed.Title)
                    .setDescription(config.VerificationSettings.Embed.Description)
                    .setFooter({ text: config.VerificationSettings.Embed.Footer });

                const channel = message.guild?.channels.cache.get(config.VerificationSettings.ChannelID);
                if (channel) {
                    channel.send({ embeds: [embed] }).catch(console.error);
                }
            }
        }
    } catch (error) {
        console.error("An unexpected error occurred in handleVerificationSettings:", error);
    }
}