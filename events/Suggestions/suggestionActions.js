const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    MessageFlags
} = require('discord.js');
//const yaml = require('js-yaml');
//const fs = require('fs');
const Suggestion = require('../../models/Suggestion');
const suggestionUtils = require('./suggestionUtils');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();
const GuildData = require('../../models/guildDataSchema');

const formatLongTime = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const formatShortTime = () => {
    return new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

// const toTitleCase = (str) => {
//     return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
// };

function calculatePercent(upvotes, downvotes) {
    const totalVotes = upvotes + downvotes;
    const upvotePercent = totalVotes === 0 ? 0 : (upvotes / totalVotes) * 100;
    const downvotePercent = totalVotes === 0 ? 0 : (downvotes / totalVotes) * 100;
    return {
        upvotePercent: Math.round(upvotePercent),
        downvotePercent: Math.round(downvotePercent)
    };
}

const generateUniqueId = async() => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result;
    let isUnique = false;
    while (!isUnique) {
        result = '';
        for (let i = 0; i < 5; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        const existingSuggestion = await Suggestion.findOne({
            uniqueId: result
        });
        if (!existingSuggestion) {
            isUnique = true;
        }
    }
    return result;
};

const updateSuggestionEmbed = async(client, suggestionId) => {
    try {
        const updatedSuggestion = await Suggestion.findById(suggestionId);
        if (!updatedSuggestion) throw new Error('Updated suggestion not found.');

        const channel = client.channels.cache.get(updatedSuggestion.channelId);
        const message = await channel.messages.fetch(updatedSuggestion.messageId);
        if (!message) throw new Error('Message not found.');
        const oldEmbed = message.embeds[0];
        if (!oldEmbed) throw new Error('Embed not found.');
        const embedDescriptionTemplate = config.SuggestionEmbed.EmbedDescription;

        const modalData = updatedSuggestion.modalData ? Object.fromEntries(updatedSuggestion.modalData) : {};

        const user = await client.users.fetch(updatedSuggestion.authorId);

        const placeholders = {
            user: user.username,
            suggestion: updatedSuggestion.text,
            SuggestionID: updatedSuggestion.uniqueId,
            LongTime: formatLongTime(),
            ShortTime: formatShortTime(),
            upvotecount: updatedSuggestion.upvotes,
            downvotecount: updatedSuggestion.downvotes,
            ...calculatePercent(updatedSuggestion.upvotes, updatedSuggestion.downvotes),
            ...modalData
        };

        const updatedDescription = embedDescriptionTemplate.map(line =>
            replacePlaceholders(line, placeholders)
        ).join('\n');

        const newEmbed = new EmbedBuilder(oldEmbed)
            .setDescription(updatedDescription);

        const upvoteButtonLabel = replacePlaceholders(config.SuggestionUpvote.ButtonName, placeholders);
        const downvoteButtonLabel = replacePlaceholders(config.SuggestionDownvote.ButtonName, placeholders);

        const upvoteButton = new ButtonBuilder()
            .setCustomId(`upvote-${updatedSuggestion.uniqueId}`)
            .setLabel(upvoteButtonLabel)
            .setEmoji(config.SuggestionUpvote.ButtonEmoji)
            .setStyle(mapButtonColor(config.SuggestionUpvote.ButtonColor));

        const downvoteButton = new ButtonBuilder()
            .setCustomId(`downvote-${updatedSuggestion.uniqueId}`)
            .setLabel(downvoteButtonLabel)
            .setEmoji(config.SuggestionDownvote.ButtonEmoji)
            .setStyle(mapButtonColor(config.SuggestionDownvote.ButtonColor));

        const row = new ActionRowBuilder().addComponents(upvoteButton, downvoteButton);

        if (updatedSuggestion.threadId) {
            const thread = await client.channels.cache.get(updatedSuggestion.threadId);
            if (thread) {
                const discussButton = new ButtonBuilder()
                    .setLabel(lang.Suggestion.Embed.Button.Discuss)
                    .setStyle(ButtonStyle.Link)
                    .setURL(thread.url);

                row.addComponents(discussButton);
            }
        }

        await message.edit({
            embeds: [newEmbed],
            components: [row]
        });

    } catch (error) {
        console.error('Error updating suggestion embed:', error);
    }
};


async function createSuggestion(client, interaction, suggestionText, modalData = {}) {
    try {
        const suggestionSettings = config.SuggestionSettings;
        const suggestionChannelId = suggestionSettings.ChannelID.match(/^\d+$/) ? suggestionSettings.ChannelID : null;

        if (!suggestionChannelId) {
            const errorMsg = 'Suggestion channel is not configured.';
            if (interaction.commandId) {
                await interaction.editReply({ content: errorMsg });
            } else if (interaction.author) {
                const msg = await interaction.channel.send({ content: errorMsg });
                if (config.SuggestionSettings.DeleteFailureMessages) {
                    setTimeout(() => msg.delete().catch(console.error), config.SuggestionSettings.FailureMessageTimeout);
                }
            }
            return;
        }

        const suggestionChannel = client.channels.cache.get(suggestionChannelId);
        const userIconUrl = interaction.author ? interaction.author.displayAvatarURL() : interaction.user.displayAvatarURL();
        const uniqueId = await generateUniqueId();

        const user = interaction.author || interaction.user;
        const userId = user.id;
        const username = user.username;

        const placeholders = {
            ...modalData,
            user: username,
            suggestion: suggestionText,
            SuggestionID: uniqueId,
            LongTime: formatLongTime(),
            ShortTime: formatShortTime(),
            upvotecount: 0,
            downvotecount: 0,
            ...calculatePercent(0, 0)
        };

        const embed = new EmbedBuilder()
            .setColor(config.SuggestionEmbed.EmbedColor)
            .setTitle(replacePlaceholders(config.SuggestionEmbed.EmbedTitle, placeholders))
            .setDescription(replacePlaceholders(config.SuggestionEmbed.EmbedDescription.join('\n'), placeholders));

        if (config.SuggestionEmbed.Thumbnail && userIconUrl) {
            embed.setThumbnail(userIconUrl);
        }

        const embedFooterText = replacePlaceholders(config.SuggestionEmbed.EmbedFooter, placeholders);
        embed.setFooter({ text: embedFooterText, iconURL: userIconUrl || undefined });

        const upvoteButtonLabel = replacePlaceholders(config.SuggestionUpvote.ButtonName, placeholders);
        const downvoteButtonLabel = replacePlaceholders(config.SuggestionDownvote.ButtonName, placeholders);

        const upvoteButton = new ButtonBuilder()
            .setCustomId(`upvote-${uniqueId}`)
            .setLabel(upvoteButtonLabel)
            .setEmoji(config.SuggestionUpvote.ButtonEmoji)
            .setStyle(mapButtonColor(config.SuggestionUpvote.ButtonColor));

        const downvoteButton = new ButtonBuilder()
            .setCustomId(`downvote-${uniqueId}`)
            .setLabel(downvoteButtonLabel)
            .setEmoji(config.SuggestionDownvote.ButtonEmoji)
            .setStyle(mapButtonColor(config.SuggestionDownvote.ButtonColor));

        const row = new ActionRowBuilder().addComponents(upvoteButton, downvoteButton);

        const message = await suggestionChannel.send({ embeds: [embed], components: [row] });

        const newSuggestion = await Suggestion.create({
            uniqueId: uniqueId,
            text: suggestionText,
            authorId: userId,
            messageId: message.id,
            channelId: suggestionChannelId,
            upvotes: 0,
            downvotes: 0,
            voters: [],
            modalData: modalData
        });

        const threadName = config.SuggestionSettings.threadName.replace(/{user}/gi, username);
        if (threadName) {
            const thread = await message.startThread({ name: threadName, autoArchiveDuration: 60 });

            if (thread) {
                const discussButton = new ButtonBuilder()
                    .setLabel(lang.Suggestion.Embed.Button.Discuss)
                    .setStyle(ButtonStyle.Link)
                    .setURL(thread.url);

                const updatedRow = new ActionRowBuilder().addComponents(row.components).addComponents(discussButton);

                await message.edit({ components: [updatedRow] });
                newSuggestion.threadId = thread.id;
                await newSuggestion.save();
            }
        }

        const guildId = interaction.guild.id;
        const guildData = await GuildData.findOne({ guildID: guildId });
        if (guildData) {
            guildData.totalSuggestions = (guildData.totalSuggestions || 0) + 1;
            await guildData.save();
        } else {
            const newGuildData = new GuildData({
                guildID: guildId,
                cases: 0,
                totalMessages: 0,
                stars: {},
                totalSuggestions: 1,
                timesBotStarted: 0
            });
            await newGuildData.save();
        }

        if (interaction.commandId) {
            await interaction.editReply({ content: lang.Suggestion.SuggestionCreated });
        } else if (interaction.author && interaction.channel) {
            const msg = await interaction.channel.send({ 
                content: `${interaction.author}, ${lang.Suggestion.SuggestionCreated}`
            });
            setTimeout(() => msg.delete().catch(console.error), 5000);
        }
    } catch (error) {
        console.error('Error in creating suggestion:', error);
        const errorMsg = lang.Suggestion.Error;
        
        if (interaction.commandId) {
            await interaction.editReply({ content: errorMsg });
        } else if (interaction.author && interaction.channel) {
            const msg = await interaction.channel.send({ 
                content: `${interaction.author}, ${errorMsg}`
            });
            setTimeout(() => msg.delete().catch(console.error), 5000);
        }
        throw error;
    }
}

// async function replyOrFollowUp(interaction, message) {
//     if (interaction.channel) {
//         const msg = await interaction.channel.send({ 
//             content: message,
//             flags: MessageFlags.Ephemeral 
//         });
        
//         if (config.SuggestionSettings.DeleteFailureMessages) {
//             setTimeout(() => msg.delete().catch(console.error), 
//                 config.SuggestionSettings.FailureMessageTimeout);
//         }
//         return;
//     }

//     if (!interaction.replied && !interaction.deferred) {
//         await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
//     } else {
//         await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
//     }
// }

async function upvoteSuggestion(client, interaction, uniqueId) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        const suggestion = await Suggestion.findOne({ uniqueId: uniqueId });
        if (!suggestion) {
            return interaction.followUp({
                content: lang.Suggestion.SuggestionNotFound || 'Suggestion not found.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (suggestionUtils.hasUserVoted(suggestion, interaction.user.id)) {
            const previousVoteType = suggestionUtils.getUserVoteType(suggestion, interaction.user.id);
            if (previousVoteType === 'upvote') {
                return interaction.followUp({
                    content: lang.Suggestion.AlreadyUpvoted || 'You have already upvoted this suggestion.',
                    flags: MessageFlags.Ephemeral
                });
            } else if (previousVoteType === 'downvote') {
                await suggestionUtils.removeVote(suggestion, interaction.user.id);
            }
        }

        await suggestionUtils.addVote(suggestion, interaction.user.id, 'upvote');
        await updateSuggestionEmbed(client, suggestion._id);

        await interaction.followUp({
            content: lang.Suggestion.Upvoted || 'You have upvoted the suggestion.',
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error in upvoteSuggestion:', error);
        await interaction.followUp({
            content: lang.Suggestion.Error || 'An error occurred while upvoting the suggestion.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function acceptSuggestion(client, interaction, uniqueId, reason) {
    try {
        const suggestion = await Suggestion.findOne({ uniqueId: uniqueId });
        if (!suggestion) {
            if (interaction.reply) {
                return interaction.reply({ content: lang.Suggestion.SuggestionNotFound, flags: MessageFlags.Ephemeral });
            }
            throw new Error('Suggestion not found');
        }

        if (suggestion.status !== 'Pending') {
            if (interaction.reply) {
                return interaction.reply({ content: lang.Suggestion.AlreadyProcessed, flags: MessageFlags.Ephemeral });
            }
            throw new Error('Suggestion already processed');
        }

        suggestion.status = 'Accepted';
        suggestion.reason = reason;

        if (suggestion.threadId) {
            const thread = await client.channels.cache.get(suggestion.threadId);
            if (thread) await thread.delete().catch(error => console.error('Error deleting thread:', error));
        }

        const user = await client.users.fetch(suggestion.authorId);
        const username = user.username;
        suggestion.UserIcon = user.displayAvatarURL();

        const embed = createSuggestionEmbed(username, suggestion, 'accept', reason);

        const acceptChannelId = config.SuggestionAcceptEmbed.AcceptChannelID.match(/^\d+$/) ? config.SuggestionAcceptEmbed.AcceptChannelID : null;

        if (acceptChannelId) {
            const acceptChannel = await client.channels.fetch(acceptChannelId);
            await acceptChannel.send({ embeds: [embed] });

            const originalChannel = client.channels.cache.get(suggestion.channelId);
            const originalMessage = await originalChannel.messages.fetch(suggestion.messageId);
            await originalMessage.delete();
        } else {
            const channel = client.channels.cache.get(suggestion.channelId);
            const message = await channel.messages.fetch(suggestion.messageId);
            await message.edit({ embeds: [embed], components: [] });
        }

        await suggestion.save();

        if (config.SuggestionSettings.sendDM) {
            await sendSuggestionDM(client, suggestion, 'accept', embed);
        }

        if (interaction.reply) {
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({ content: lang.Suggestion.SuggestionAccepted, flags: MessageFlags.Ephemeral });
            } else {
                return interaction.editReply({ content: lang.Suggestion.SuggestionAccepted });
            }
        }
    } catch (error) {
        console.error('Error in accepting suggestion:', error);
        if (interaction.reply) {
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({ content: lang.Suggestion.Error, flags: MessageFlags.Ephemeral });
            } else {
                return interaction.editReply({ content: lang.Suggestion.Error });
            }
        }
        throw error;
    }
}

async function denySuggestion(client, interaction, uniqueId, reason) {
    try {
        const suggestion = await Suggestion.findOne({ uniqueId: uniqueId });
        if (!suggestion) {
            if (interaction.reply) {
                return interaction.reply({ content: lang.Suggestion.SuggestionNotFound, flags: MessageFlags.Ephemeral });
            }
            throw new Error('Suggestion not found');
        }

        if (suggestion.status !== 'Pending') {
            if (interaction.reply) {
                return interaction.reply({ content: lang.Suggestion.AlreadyProcessed, flags: MessageFlags.Ephemeral });
            }
            throw new Error('Suggestion already processed');
        }

        suggestion.status = 'Denied';
        suggestion.reason = reason;

        if (suggestion.threadId) {
            const thread = await client.channels.cache.get(suggestion.threadId);
            if (thread) await thread.delete().catch(error => console.error('Error deleting thread:', error));
        }

        const user = await client.users.fetch(suggestion.authorId);
        const username = user.username;
        suggestion.UserIcon = user.displayAvatarURL();

        const embed = createSuggestionEmbed(username, suggestion, 'deny', reason);

        const denyChannelId = config.SuggestionDenyEmbed.DenyChannelID.match(/^\d+$/) ? config.SuggestionDenyEmbed.DenyChannelID : null;

        if (denyChannelId) {
            const denyChannel = await client.channels.fetch(denyChannelId);
            await denyChannel.send({ embeds: [embed] });

            const originalChannel = client.channels.cache.get(suggestion.channelId);
            const originalMessage = await originalChannel.messages.fetch(suggestion.messageId);
            await originalMessage.delete();
        } else {
            const channel = client.channels.cache.get(suggestion.channelId);
            const message = await channel.messages.fetch(suggestion.messageId);
            await message.edit({ embeds: [embed], components: [] });
        }

        await suggestion.save();

        if (config.SuggestionSettings.sendDM) {
            await sendSuggestionDM(client, suggestion, 'deny', embed);
        }

        if (interaction.reply) {
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({ content: lang.Suggestion.SuggestionDenied, flags: MessageFlags.Ephemeral });
            } else {
                return interaction.editReply({ content: lang.Suggestion.SuggestionDenied });
            }
        }
    } catch (error) {
        console.error('Error in denying suggestion:', error);
        if (interaction.reply) {
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({ content: lang.Suggestion.Error, flags: MessageFlags.Ephemeral });
            } else {
                return interaction.editReply({ content: lang.Suggestion.Error });
            }
        }
        throw error;
    }
}

async function sendSuggestionDM(client, suggestion, action, embed) {
    try {
        const user = await client.users.fetch(suggestion.authorId);
        const dmMessage = action === 'accept' ?
            lang.Suggestion.DirectMessage.Accepted :
            lang.Suggestion.DirectMessage.Denied;
        await user.send({ content: dmMessage, embeds: [embed] });
    } catch (error) {
        if (error.code === 50007) {} else {
            console.error('Error sending DM:', error);
        }
    }
}

function createSuggestionEmbed(username, suggestion, action, reason) {
    const embedConfig = action === 'accept' ?
        config.SuggestionAcceptEmbed :
        config.SuggestionDenyEmbed;

    const placeholders = {
        user: username,
        suggestion: suggestion.text,
        SuggestionID: suggestion.uniqueId,
        ShortTime: formatShortTime(),
        LongTime: formatLongTime(),
        reason: reason
    };

    const embed = new EmbedBuilder()
        .setColor(embedConfig.EmbedColor)
        .setTitle(replacePlaceholders(embedConfig.EmbedTitle, placeholders))
        .setDescription(embedConfig.EmbedBody.map(line => replacePlaceholders(line, placeholders)).join('\n'))
        .setFooter({
            text: replacePlaceholders(embedConfig.EmbedFooter, placeholders),
            iconURL: embedConfig.AuthorIcon ? suggestion.UserIcon : null
        });

    if (embedConfig.Thumbnail && suggestion.UserIcon) {
        embed.setThumbnail(suggestion.UserIcon);
    }

    return embed;
}

async function downvoteSuggestion(client, interaction, uniqueId) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        const suggestion = await Suggestion.findOne({ uniqueId: uniqueId });
        if (!suggestion) {
            return interaction.followUp({
                content: lang.Suggestion.SuggestionNotFound || 'Suggestion not found.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (suggestionUtils.hasUserVoted(suggestion, interaction.user.id)) {
            const previousVoteType = suggestionUtils.getUserVoteType(suggestion, interaction.user.id);
            if (previousVoteType === 'downvote') {
                return interaction.followUp({
                    content: lang.Suggestion.AlreadyDownvoted || 'You have already downvoted this suggestion.',
                    flags: MessageFlags.Ephemeral
                });
            } else if (previousVoteType === 'upvote') {
                await suggestionUtils.removeVote(suggestion, interaction.user.id);
            }
        }

        await suggestionUtils.addVote(suggestion, interaction.user.id, 'downvote');
        await updateSuggestionEmbed(client, suggestion._id);

        await interaction.followUp({
            content: lang.Suggestion.Downvoted || 'You have downvoted the suggestion.',
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error in downvoteSuggestion:', error);
        await interaction.followUp({
            content: lang.Suggestion.Error || 'An error occurred while downvoting the suggestion.',
            flags: MessageFlags.Ephemeral
        });
    }
}

function replacePlaceholders(text, placeholders) {
    for (const key in placeholders) {
        if (typeof placeholders[key] === 'object' && placeholders[key] !== null) {
            for (const subKey in placeholders[key]) {
                const regex = new RegExp(`{${key}_${subKey}}`, 'g');
                text = text.replace(regex, placeholders[key][subKey]);
            }
        } else {
            const regex = new RegExp(`{${key}}`, 'g');
            text = text.replace(regex, placeholders[key]);
        }
    }
    return text;
}

function mapButtonColor(color) {
    if (!color) return ButtonStyle.Primary;
    const normalizedColor = color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
    return ButtonStyle[normalizedColor] || ButtonStyle.Primary;
}

module.exports = {
    createSuggestion,
    upvoteSuggestion,
    downvoteSuggestion,
    updateSuggestionEmbed,
    acceptSuggestion,
    denySuggestion
};