const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const fs = require("fs");
const yaml = require("js-yaml");


const client = require("../../index.js")

const Giveaway = require("../../models/Giveaway.js");
const UserData = require('../../models/UserData.js');



function getButtonStyle(styleString) {
    switch (styleString.toLowerCase()) {
        case "primary":
            return ButtonStyle.Primary;
        case "secondary":
            return ButtonStyle.Secondary;
        case "success":
            return ButtonStyle.Success;
        case "danger":
            return ButtonStyle.Danger;
        default:
            return ButtonStyle.Success;
    }
}

function parseColor(color) {
    if (typeof color === 'string' && color.startsWith('#')) {
        return parseInt(color.replace('#', ''), 16);
    } else {
        return color;
    }
}

function replacePlaceholders(template, placeholders = {}) {
    if (!template) {
        return '\u200b';
    }

    return Object.keys(placeholders).reduce((acc, key) => {
        const regex = new RegExp(`{${key}}`, 'gi');
        return acc.replace(regex, placeholders[key] || '');
    }, template);
}

function parseDuration(durationString) {
    const regex = /^(\d+)([mhdwy])$/;
    const match = durationString.match(regex);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000,
        'y': 365 * 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit];
}

const Invite = require("../../models/inviteSchema");
const { getConfig, getLang } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

async function getUserInviteCount(guildId, userId) {
    const invites = await Invite.find({ guildID: guildId, inviterID: userId });
    let inviteCount = 0;

    for (const invite of invites) {
        inviteCount += invite.uses;
    }

    return inviteCount;
}


const giveawayActions = {
    handleButtonInteraction: async (interaction) => {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            }
            const lang = await require('../../utils/langLoader').getLang(interaction.guild?.id);
            if (interaction.customId === 'check_percent') {
                const giveaway = await Giveaway.findOne({
                    messageId: interaction.message.id,
                    channelId: interaction.channelId,
                    ended: false
                });

                if (!giveaway) {
                    await interaction.editReply({
                        content: "This giveaway has ended or doesn't exist."
                    });
                    return;
                }

                await giveawayActions.calculateChance(interaction, giveaway, lang);
            } else if (interaction.customId === 'show_entrants') {
                await giveawayActions.showEntrants(interaction, lang);
            }
        } catch (error) {
            console.error('Error handling button interaction:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: "An error occurred while processing your request.",
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.followUp({
                        content: "An error occurred while processing your request.",
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }
    },

    startGiveaway: async (interaction, giveawayDetails, lang) => {
        const { giveawayId, time, prize, channel, winnerCount, whitelistRoles, blacklistRoles, minServerJoinDate, minAccountAge, minInvites, minMessages, hostedBy, notifyUsers } = giveawayDetails;

        // Ensure lang is available if not passed (fallback)
        // Ensure lang is available if not passed (fallback)
        if (!lang) lang = await require('../../utils/langLoader').getLang(interaction.guild?.id);

        const duration = typeof time === 'string' ? parseDuration(time) : time;
        if (duration === null) {
            throw new Error("Invalid time format");
        }

        const serverName = interaction.guild.name;
        const giveawayEndsIn = `<t:${Math.floor((Date.now() + duration) / 1000)}:R>`;

        const endAt = Date.now() + duration;
        const whitelistRoleMentions = whitelistRoles.map(roleId => `<@&${roleId}>`).join(', ');
        const blacklistRoleMentions = blacklistRoles.map(roleId => `<@&${roleId}>`).join(', ');

        const placeholders = {
            prize: prize,
            serverName: serverName,
            hostedBy: hostedBy,
            whitelistRoles: whitelistRoleMentions,
            blacklistRoles: blacklistRoleMentions,
            channel: `${channel}`,
            winnerCount: winnerCount,
            endsIn: giveawayEndsIn,
            minInvites: minInvites,
            entries: 0
        };

        const embed = new EmbedBuilder();

        let useDefaultDesign = true;
        if (giveawayDetails.customEmbed) {
            try {
                let jsonString = giveawayDetails.customEmbed;
                // Simple variable replacement in the raw JSON string first
                Object.keys(placeholders).forEach(key => {
                    const regex = new RegExp(`{${key}}`, 'gi');
                    jsonString = jsonString.replace(regex, placeholders[key] || '');
                });

                const customData = JSON.parse(jsonString);

                if (customData.title) embed.setTitle(customData.title);
                if (customData.description) embed.setDescription(customData.description);
                if (customData.color) embed.setColor(customData.color);
                if (customData.image) embed.setImage(customData.image);
                if (customData.thumbnail) embed.setThumbnail(customData.thumbnail);
                if (customData.fields && Array.isArray(customData.fields)) {
                    embed.addFields(customData.fields);
                }
                if (customData.footer) {
                    // Ensure ID is present if not already
                    let footerText = customData.footer.text || "";
                    if (!footerText.includes(giveawayId)) {
                        footerText += ` | ID: ${giveawayId}`;
                    }
                    embed.setFooter({ text: footerText, iconURL: customData.footer.icon_url || customData.footer.iconURL });
                } else {
                    embed.setFooter({ text: `Giveaway ID: ${giveawayId}`, iconURL: config.Giveaways.Embed.ActiveGiveaway.EmbedFooterIcon });
                }

                useDefaultDesign = false;
            } catch (e) {
                console.error("Invalid Custom Embed JSON:", e);
                // Fallback to default but warn? Or just proceed with default.
                // Notifying user about error via ephemeral would be good, but we are inside logic.
                // We'll proceed with default but maybe log it.
            }
        }

        if (useDefaultDesign) {
            const prizeDescription = replacePlaceholders(lang.Giveaways.Embeds.ActiveGiveaway.Prize, placeholders);

            embed.setTitle(lang.Giveaways.Embeds.ActiveGiveaway.Title || "🎉 GIVEAWAY 🎉");

            if (config.Giveaways.Embed.ActiveGiveaway.ShowTitle) {
                embed.setDescription(`**${prizeDescription}**\n\n${lang.Giveaways.Embeds.ActiveGiveaway.Description || "React with the button below to enter!"}`);
            }

            embed.setColor(config.Giveaways.Embed.ActiveGiveaway.EmbedColor);

            // Row 1: Hosted By, Ends In, Entries
            if (config.Giveaways.Embed.ActiveGiveaway.ShowHostedBy) {
                embed.addFields({ name: lang.Giveaways.Embeds.ActiveGiveaway.HostedByField || "👑 Hosted By", value: `${hostedBy}`, inline: true });
            }

            if (config.Giveaways.Embed.ActiveGiveaway.ShowEndsIn) {
                embed.addFields({ name: lang.Giveaways.Embeds.ActiveGiveaway.EndsInField || "⏳ Ends In", value: `<t:${Math.floor((Date.now() + duration) / 1000)}:R>`, inline: true });
            }

            if (config.Giveaways.Embed.ActiveGiveaway.ShowEntries) {
                embed.addFields({ name: lang.Giveaways.Embeds.ActiveGiveaway.EntriesField || "🎟 Entries", value: `**${0}**`, inline: true });
            }

            // Requirements
            let reqs = [];
            if (config.Giveaways.Embed.ActiveGiveaway.ShowWhitelistRoles && whitelistRoles && whitelistRoles.length > 0) {
                reqs.push(`**${lang.Giveaways.Embeds.ActiveGiveaway.WhitelistRoleField || "Allowed Roles:"}** ${whitelistRoles.map(r => `<@&${r}>`).join(', ')}`);
            }
            if (config.Giveaways.Embed.ActiveGiveaway.ShowBlacklistRoles && blacklistRoles && blacklistRoles.length > 0) {
                reqs.push(`**${lang.Giveaways.Embeds.ActiveGiveaway.BlacklistRoleField || "Forbidden Roles:"}** ${blacklistRoles.map(r => `<@&${r}>`).join(', ')}`);
            }
            if (minInvites > 0) reqs.push(`**Min Invites:** ${minInvites}`); // Need generic key or just keep simple for now? The user didn't specify these but let's try to match existing pattern if possible, though keys might be missing for "Min Invites". I'll leave "Min Invites" hardcoded if no key exists, but wait, vn.yml didn't have MinInvites in list. I'll stick to what I have in YAML.
            if (minMessages > 0) reqs.push(`**Min Messages:** ${minMessages}`);
            if (minServerJoinDate) reqs.push(`**${lang.Giveaways.Embeds.ActiveGiveaway.MinimumSeverJoinDateField || "Joined After:"}** <t:${Math.floor(new Date(minServerJoinDate).getTime() / 1000)}:d>`);
            if (minAccountAge) reqs.push(`**${lang.Giveaways.Embeds.ActiveGiveaway.MinimumAccountAgeField || "Account Created After:"}** <t:${Math.floor(new Date(minAccountAge).getTime() / 1000)}:d>`);

            if (reqs.length > 0) {
                embed.addFields({ name: lang.Giveaways.Embeds.ActiveGiveaway.RequirementsTitle || '📋 Requirements', value: reqs.join('\n'), inline: false });
            }

            if (config.Giveaways.Embed.ActiveGiveaway.ShowImage && config.Giveaways.Embed.ActiveGiveaway.EmbedImage) {
                embed.setImage(config.Giveaways.Embed.ActiveGiveaway.EmbedImage);
            }

            if (config.Giveaways.Embed.ActiveGiveaway.ShowThumbnail && config.Giveaways.Embed.ActiveGiveaway.EmbedThumbnail) {
                embed.setThumbnail(config.Giveaways.Embed.ActiveGiveaway.EmbedThumbnail);
            }

            if (config.Giveaways.Embed.ActiveGiveaway.ShowFooter) {
                // Ensure ID is visible
                let footerText = (lang.Giveaways.Embeds.ActiveGiveaway.FooterID || "Giveaway ID: {id}").replace('{id}', giveawayId);
                if (config.Giveaways.Embed.ActiveGiveaway.EmbedFooterText) {
                    footerText = `${config.Giveaways.Embed.ActiveGiveaway.EmbedFooterText} | ${footerText}`;
                }
                embed.setFooter({ text: footerText, iconURL: config.Giveaways.Embed.ActiveGiveaway.EmbedFooterIcon || null });
            }
        }

        const joinButton = new ButtonBuilder()
            .setLabel(lang.Giveaways.Buttons?.Join || config.Giveaways.Embed.ActiveGiveaway.Button.JoinButton.ButtonText)
            .setStyle(getButtonStyle(config.Giveaways.Embed.ActiveGiveaway.Button.JoinButton.ButtonStyle))
            .setCustomId("join_giveaway")
            .setEmoji(config.Giveaways.Embed.ActiveGiveaway.Button.JoinButton.ButtonEmoji);

        const checkPercentButton = new ButtonBuilder()
            .setLabel(lang.Giveaways.Buttons?.CheckChance || config.Giveaways.Embed.ActiveGiveaway.Button.CheckPercent.ButtonText)
            .setStyle(getButtonStyle(config.Giveaways.Embed.ActiveGiveaway.Button.CheckPercent.ButtonStyle))
            .setCustomId("check_percent")
            .setEmoji(config.Giveaways.Embed.ActiveGiveaway.Button.CheckPercent.ButtonEmoji);

        const buttons = [joinButton, checkPercentButton];

        if (config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntrantsList) {
            const showEntrantsButton = new ButtonBuilder()
                .setLabel(lang.Giveaways.Buttons?.ShowEntrants || config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntrantsList.ButtonText || "Show Entrants")
                .setStyle(getButtonStyle(config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntrantsList.ButtonStyle || "SECONDARY"))
                .setCustomId("show_entrants");

            if (config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntrantsList.ButtonEmoji) {
                showEntrantsButton.setEmoji(config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntrantsList.ButtonEmoji);
            }

            buttons.push(showEntrantsButton);
        }

        if (config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries) {
            const entriesButton = new ButtonBuilder()
                .setLabel(`${lang.Giveaways.Buttons?.Entries || config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries.ButtonText}: 0`)
                .setStyle(getButtonStyle(config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries.ButtonStyle))
                .setCustomId("entries_count")
                .setDisabled(true);

            if (config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries.ButtonEmoji) {
                entriesButton.setEmoji(config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries.ButtonEmoji);
            }

            buttons.push(entriesButton);
        }

        const row = new ActionRowBuilder().addComponents(buttons);
        let messageContent = '';

        if (typeof notifyUsers === 'string' && (notifyUsers === '@everyone' || notifyUsers === '')) {
            messageContent = notifyUsers;
        } else if (Array.isArray(notifyUsers) && notifyUsers.length > 0) {
            const roleMentions = notifyUsers.map(roleId => `<@&${roleId}>`).join(' ');
            messageContent = roleMentions;
        }
        const giveawayMessage = await channel.send({ content: messageContent, embeds: [embed], components: [row] });

        const successEmbed = new EmbedBuilder()
            .setAuthor({
                name: `${lang.SuccessEmbedTitle}`,
                iconURL: `https://i.imgur.com/7SlmRRa.png`,
            })
            .setColor(config.SuccessEmbedColor || "#00FF00");

        const newGiveaway = await Giveaway.create({
            giveawayId: giveawayId,
            messageId: giveawayMessage.id,
            channelId: channel.id,
            guildId: interaction.guildId,
            startAt: Date.now(),
            endAt: endAt,
            ended: false,
            winnerCount: winnerCount,
            hostedBy: hostedBy,
            prize: prize,
            entries: 0,
            messageWinner: false,
            notifyEntrantOnEnter: false,
            requirements: {
                whitelistRoles: whitelistRoles,
                blacklistRoles: blacklistRoles,
                minServerJoinDate: minServerJoinDate,
                minAccountAge: minAccountAge,
                minInvites: minInvites,
                minMessages: minMessages
            },
            winners: [],
            entrants: [],
            extraEntries: giveawayDetails.extraEntries || [],
        });

        if (config.GiveawayLogs.Enabled) {
            let embedData = config.GiveawayLogs.GiveawayStarted.Embed;

            let logEmbed = new EmbedBuilder()
                .setColor(parseColor(embedData.Color || "#00FF00"))
                .setTitle(replacePlaceholders(embedData.Title, placeholders))
                .setDescription(replacePlaceholders(embedData.Description.join('\n'), placeholders))
                .setFooter({ text: replacePlaceholders(embedData.Footer, placeholders) });

            if (config.GiveawayLogs.GiveawayStarted.Embed.Thumbnail && config.GiveawayLogs.GiveawayStarted.Embed.ThumbnailUrl) {
                logEmbed.setThumbnail(config.GiveawayLogs.GiveawayStarted.Embed.ThumbnailUrl)
            }

            let giveawayStartedLog = interaction.guild.channels.cache.get(config.GiveawayLogs.LogsChannelID);
            if (giveawayStartedLog) giveawayStartedLog.send({ embeds: [logEmbed] });
        }

        await interaction.editReply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
    },

    joinGiveaway: async (client, userId, username, member, interaction, channelId, messageId, lang) => {
        // Ensure lang is available (fallback) // Add lang to args
        if (!lang) lang = await require('../../utils/langLoader').getLang(interaction.guild?.id);
        try {
            const giveaway = await Giveaway.findOne({
                messageId: messageId,
                channelId: channelId,
                ended: false
            });

            let placeholders = {
                user: interaction.user,
                prize: giveaway ? giveaway.prize : "Unknown Prize",
                serverName: interaction.guild.name,
                hostedBy: giveaway ? giveaway.hostedBy : "Unknown Host",
                channel: `<#${channelId}>`
            };

            if (!giveaway) {
                const messageContent = replacePlaceholders(lang.Giveaways.GiveawayNotFound, placeholders);
                await interaction.editReply({ content: messageContent, flags: MessageFlags.Ephemeral });
                return;
            }

            const requirements = giveaway.requirements;
            const whitelistRoleMentions = requirements.whitelistRoles.map(roleId => `<@&${roleId}>`).join(', ');
            const blacklistRoleMentions = requirements.blacklistRoles.map(roleId => `<@&${roleId}>`).join(', ');

            // Update placeholders with specific details
            placeholders = {
                ...placeholders,
                whitelistRoles: whitelistRoleMentions,
                blacklistRoles: blacklistRoleMentions,
                channel: `<#${giveaway.channelId}>`,
                winnerCount: giveaway.winnerCount,
                minInvites: requirements.minInvites || 0
            };

            if (giveaway.ended) {
                const messageContent = replacePlaceholders(lang.Giveaways.EndMessage, placeholders);
                await interaction.reply({ content: messageContent, flags: MessageFlags.Ephemeral });
                return;
            }

            if (requirements.whitelistRoles && requirements.whitelistRoles.length > 0 && !requirements.whitelistRoles.some(roleId => member.roles.cache.has(roleId))) {
                const messageContent = replacePlaceholders(lang.Giveaways.IncorrectRoleMessage, placeholders);
                await interaction.editReply({ content: messageContent, flags: MessageFlags.Ephemeral });
                return;
            }

            if (requirements.blacklistRoles && requirements.blacklistRoles.length > 0 && requirements.blacklistRoles.some(roleId => member.roles.cache.has(roleId))) {
                const messageContent = replacePlaceholders(lang.Giveaways.IncorrectRoleMessage, placeholders);
                await interaction.editReply({ content: messageContent, flags: MessageFlags.Ephemeral });
                return;
            }

            if (requirements.minServerJoinDate && member.joinedTimestamp > new Date(requirements.minServerJoinDate).getTime()) {
                const messageContent = replacePlaceholders(lang.Giveaways.IncorrectMinimumServerJoinDateMessage, placeholders);
                await interaction.editReply({ content: messageContent, flags: MessageFlags.Ephemeral });
                return;
            }

            if (requirements.minAccountAge && member.user.createdTimestamp > new Date(requirements.minAccountAge).getTime()) {
                const messageContent = replacePlaceholders(lang.Giveaways.IncorrectMinimumAccountAgeMessage, placeholders);
                await interaction.editReply({ content: messageContent, flags: MessageFlags.Ephemeral });
                return;
            }

            const userInviteCount = await getUserInviteCount(interaction.guild.id, userId);
            if (requirements.minInvites > 0 && userInviteCount < requirements.minInvites) {
                const messageContent = replacePlaceholders(lang.Giveaways.IncorrectInviteCountMessage, placeholders);
                await interaction.editReply({ content: messageContent, flags: MessageFlags.Ephemeral });
                return;
            }

            if (requirements.minMessages > 0) {
                const userData = await UserData.findOne({
                    userId: userId,
                    guildId: interaction.guildId
                });

                const currentMessages = userData ? userData.totalMessages : 0;
                if (currentMessages < requirements.minMessages) {
                    const messageContent = replacePlaceholders(lang.Giveaways.IncorrectMessageCountMessage, {
                        ...placeholders,
                        required: requirements.minMessages,
                        current: currentMessages
                    });
                    await interaction.editReply({ content: messageContent, flags: MessageFlags.Ephemeral });
                    return;
                }
            }

            if (giveaway.entrants.some(entrant => entrant.entrantId === userId)) {
                giveaway.entrants = giveaway.entrants.filter(entrant => entrant.entrantId !== userId);
                giveaway.entries--;

                await giveaway.save();

                const channel = client.channels.cache.get(channelId);
                const message = await channel.messages.fetch(messageId);
                const embed = message.embeds[0];
                const newEmbed = EmbedBuilder.from(embed)
                    .spliceFields(2, 1, { name: replacePlaceholders(lang.Giveaways.Embeds.ActiveGiveaway.EntriesField, placeholders), value: `**${giveaway.entrants.length}**`, inline: true });

                if (config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries) {
                    const components = message.components[0].components;
                    const entriesButtonIndex = components.findIndex(c => c.customId === 'entries_count');
                    if (entriesButtonIndex !== -1) {
                        const updatedButton = new ButtonBuilder()
                            .setLabel(`${lang.Giveaways.Buttons?.Entries || config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries.ButtonText}: ${giveaway.entrants.length}`)
                            .setStyle(getButtonStyle(config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries.ButtonStyle))
                            .setCustomId("entries_count")
                            .setDisabled(true);

                        if (config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries.ButtonEmoji) {
                            updatedButton.setEmoji(config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries.ButtonEmoji);
                        }

                        components[entriesButtonIndex] = updatedButton;
                        const newRow = new ActionRowBuilder().addComponents(components);
                        await message.edit({ embeds: [newEmbed], components: [newRow] });
                    }
                } else {
                    await message.edit({ embeds: [newEmbed] });
                }

                const successMessageContent = replacePlaceholders(lang.Giveaways.LeaveSuccessMessage, placeholders);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: successMessageContent, flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content: successMessageContent, flags: MessageFlags.Ephemeral });
                }

                return;
            }

            let extraEntriesCount = 0;
            const memberRoles = member.roles.cache;

            for (const extraEntry of giveaway.extraEntries) {
                if (memberRoles.has(extraEntry.roleId)) {
                    extraEntriesCount += extraEntry.entries;
                }
            }

            giveaway.entries++;
            giveaway.entrants.push({
                entrantId: userId,
                entrantUsername: username,
                extraEntries: extraEntriesCount
            });
            await giveaway.save();

            const channel = client.channels.cache.get(channelId);
            const message = await channel.messages.fetch(messageId);
            const embed = message.embeds[0];

            const newEmbed = EmbedBuilder.from(embed)
                .spliceFields(2, 1, {
                    name: replacePlaceholders(lang.Giveaways.Embeds.ActiveGiveaway.EntriesField, placeholders),
                    value: `**${giveaway.entrants.length}**`,
                    inline: true
                });

            if (config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries) {
                const components = message.components[0].components;
                const entriesButtonIndex = components.findIndex(c => c.customId === 'entries_count');
                if (entriesButtonIndex !== -1) {
                    const updatedButton = new ButtonBuilder()
                        .setLabel(`${lang.Giveaways.Buttons?.Entries || config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries.ButtonText}: ${giveaway.entrants.length}`)
                        .setStyle(getButtonStyle(config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries.ButtonStyle))
                        .setCustomId("entries_count")
                        .setDisabled(true);

                    if (config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries.ButtonEmoji) {
                        updatedButton.setEmoji(config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntries.ButtonEmoji);
                    }

                    components[entriesButtonIndex] = updatedButton;
                    const newRow = new ActionRowBuilder().addComponents(components);
                    await message.edit({ embeds: [newEmbed], components: [newRow] });
                }
            } else {
                await message.edit({ embeds: [newEmbed] });
            }

            let successMessageContent = replacePlaceholders(lang.Giveaways.EntrySuccessMessage, placeholders);
            if (extraEntriesCount > 0) {
                successMessageContent += `\n${replacePlaceholders(lang.Giveaways.ExtraEntriesMessage, { extraEntries: extraEntriesCount })}`;
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: successMessageContent, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: successMessageContent, flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error(`Error joining giveaway: ${error}`);
            const errorMessageContent = replacePlaceholders(lang.Giveaways.EntryErrorMessage, {});
            await interaction.editReply({ content: errorMessageContent, flags: MessageFlags.Ephemeral });
        }
    },

    endGiveaway: async (giveawayId) => {
        try {
            const giveaways = await Giveaway.find({ giveawayId: giveawayId });
            const giveaway = giveaways[0];
            if (!giveaway) {
                console.error('Giveaway not found:', giveawayId);
                return;
            }

            const lang = await require('../../utils/langLoader').getLang(giveaway.guildId);

            const guild = client.guilds.cache.get(giveaway.guildId);
            if (!guild) {
                console.error('Guild not found:', giveaway.guildId);
                return;
            }

            if (giveaway.ended) {
                console.error('Giveaway already ended:', giveawayId);
                return;
            }

            const channel = client.channels.cache.get(giveaway.channelId);
            if (!channel) {
                console.error('Channel not found:', giveaway.channelId);
                return;
            }

            let messageExists = true;
            try {
                await channel.messages.fetch(giveaway.messageId);
            } catch (error) {
                messageExists = false;
            }

            if (!messageExists) {
                await Giveaway.findOneAndUpdate(
                    { giveawayId: giveawayId },
                    { $set: { winners: [], ended: true } },
                    { new: true, runValidators: true }
                );
                return 'Giveaway ended without winners (message was deleted).';
            }

            const serverName = guild.name;
            const requirements = giveaway.requirements;

            const whitelistRoleMentions = requirements.whitelistRoles.map(roleId => `<@&${roleId}>`).join(', ');
            const blacklistRoleMentions = requirements.blacklistRoles.map(roleId => `<@&${roleId}>`).join(', ');

            const placeholders = {
                prize: giveaway.prize,
                serverName: serverName,
                hostedBy: giveaway.hostedBy,
                whitelistRoles: whitelistRoleMentions,
                blacklistRoles: blacklistRoleMentions,
                channel: `<#${giveaway.channelId}>`,
                winnerCount: giveaway.winnerCount
            };

            const winnerCount = giveaway.winnerCount;
            const entrants = giveaway.entrants;
            let winners = [];

            let weightedPool = [];
            for (const entrant of entrants) {
                const totalEntries = 1 + (entrant.extraEntries || 0);
                for (let i = 0; i < totalEntries; i++) {
                    weightedPool.push(entrant);
                }
            }

            for (let i = 0; i < winnerCount && weightedPool.length > 0; i++) {
                let randomIndex = Math.floor(Math.random() * weightedPool.length);
                let winner = weightedPool[randomIndex];

                weightedPool = weightedPool.filter(entry => entry.entrantId !== winner.entrantId);

                winners.push({ winnerId: winner.entrantId });
            }

            // Direct update on the object since SQLiteModel.findOneAndUpdate is not reliable with non-PK
            giveaway.winners = winners;
            giveaway.ended = true;
            await giveaway.save();
            const updatedGiveaway = giveaway;

            const message = await channel.messages.fetch(giveaway.messageId);
            let winnerList = winners.map(w => `<@${w.winnerId}>`).join('\n');
            if (winnerList.length === 0) {
                winnerList = replacePlaceholders(lang.Giveaways.NoParticipationMessage, placeholders);
            }

            if (config.Giveaways.DirectMessageWinners) {
                winners.forEach(async (winnerObj) => {
                    const winnerId = winnerObj.winnerId;
                    try {
                        const winner = await guild.members.fetch(winnerId);
                        if (winner && winner.user) {
                            await winner.user.send(replacePlaceholders(lang.Giveaways.WinnerDirectMessage, placeholders));
                        }
                    } catch (dmError) {
                        console.error('Error sending DM to winner:', winnerId, dmError);
                    }
                });
            }

            let winnerMentions = winners.map(winner => `<@${winner.winnerId}>`).join(', ');
            if (winnerMentions.length === 0) {
                await channel.send(replacePlaceholders(lang.Giveaways.NoParticipationMessage, placeholders));
            } else {
                await channel.send(replacePlaceholders(lang.Giveaways.WinMessage, placeholders).replace("{winners}", winnerMentions));
            }

            const embed = EmbedBuilder.from(message.embeds[0])
                .setColor(config.Giveaways.Embed.EndedGiveaway.EmbedColor)
                .setDescription(replacePlaceholders(lang.Giveaways.Embeds.EndedGiveaway.Title, placeholders));

            if (config.Giveaways.Embed.EndedGiveaway.ShowFooter) {
                const footerIcon = config.Giveaways.Embed.EndedGiveaway.EmbedFooterIcon;
                embed.setFooter({
                    text: "Giveaway ID: " + giveaway.giveawayId,
                    iconURL: footerIcon && footerIcon.length > 0 ? footerIcon : null
                });
            } else {
                embed.setFooter(null);
            }

            embed.setFields([]);

            if (config.Giveaways.Embed.EndedGiveaway.ShowTitle) {
                embed.setDescription(replacePlaceholders(lang.Giveaways.Embeds.EndedGiveaway.Title, placeholders));
            }
            if (config.Giveaways.Embed.EndedGiveaway.ShowThumbnail && config.Giveaways.Embed.EndedGiveaway.EmbedThumbnail) {
                embed.setThumbnail(config.Giveaways.Embed.EndedGiveaway.EmbedThumbnail);
            }
            if (config.Giveaways.Embed.EndedGiveaway.ShowImage && config.Giveaways.Embed.EndedGiveaway.EmbedImage) {
                embed.setImage(config.Giveaways.Embed.EndedGiveaway.EmbedImage);
            }
            if (config.Giveaways.Embed.EndedGiveaway.ShowWinnersField) {
                embed.addFields({ name: replacePlaceholders(lang.Giveaways.Embeds.EndedGiveaway.WinnersField, placeholders), value: winnerList, inline: true });
            }
            if (config.Giveaways.Embed.EndedGiveaway.ShowEntriesField) {
                embed.addFields({ name: replacePlaceholders(lang.Giveaways.Embeds.EndedGiveaway.EntriesField, placeholders), value: `**${giveaway.entries}**`, inline: true });
            }

            await message.edit({ embeds: [embed], components: [] });

            if (config.GiveawayLogs.Enabled) {
                let embedData = config.GiveawayLogs.GiveawayEnded.Embed;
                let logEmbed = new EmbedBuilder()
                    .setColor(parseColor(embedData.Color || "#00FF00"))
                    .setTitle(replacePlaceholders(embedData.Title, placeholders))
                    .setDescription(replacePlaceholders(embedData.Description.join('\n'), placeholders).replace("{winners}", winnerMentions))
                    .setFooter({ text: replacePlaceholders(embedData.Footer, placeholders) });

                if (config.GiveawayLogs.GiveawayEnded.Embed.Thumbnail && config.GiveawayLogs.GiveawayEnded.Embed.ThumbnailUrl) {
                    logEmbed.setThumbnail(config.GiveawayLogs.GiveawayEnded.Embed.ThumbnailUrl);
                }

                const giveawayEndedLog = guild.channels.cache.get(config.GiveawayLogs.LogsChannelID);
                if (giveawayEndedLog) giveawayEndedLog.send({ embeds: [logEmbed] });
            }

            return 'Giveaway ended successfully.';
        } catch (error) {
            console.error('Error ending the giveaway with ID:', giveawayId, error);
            throw error;
        }
    },
    rerollGiveaway: async (interaction, giveawayId, userIdsToReroll = []) => {
        try {
            const lang = await require('../../utils/langLoader').getLang(interaction.guild?.id);
            const giveaways = await Giveaway.find({ giveawayId: giveawayId });
            const giveaway = giveaways[0];
            if (!giveaway) {
                return await interaction.reply({ content: lang.Giveaways.GiveawayNotFound, flags: MessageFlags.Ephemeral });
            }

            if (!giveaway.ended) {
                return await interaction.reply({ content: lang.Giveaways.GiveawayHasntEnded, flags: MessageFlags.Ephemeral });
            }

            if (userIdsToReroll.length > 0 && !giveaway.winners.some(winner => userIdsToReroll.includes(winner.winnerId))) {
                return await interaction.reply({ content: 'None of the specified users are previous winners.', flags: MessageFlags.Ephemeral });
            }

            let eligibleEntrants = giveaway.entrants.filter(entrant =>
                !giveaway.winners.some(winner => winner.winnerId === entrant.entrantId)
            );

            let rerollCount = userIdsToReroll.length > 0 ? userIdsToReroll.length : giveaway.winnerCount;
            if (userIdsToReroll.length === 0) {
                giveaway.winners = [];
            } else {
                giveaway.winners = giveaway.winners.filter(winner => !userIdsToReroll.includes(winner.winnerId));
            }

            for (let i = 0; i < rerollCount && eligibleEntrants.length > 0; i++) {
                let randomIndex = Math.floor(Math.random() * eligibleEntrants.length);
                giveaway.winners.push({ winnerId: eligibleEntrants[randomIndex].entrantId });
                eligibleEntrants.splice(randomIndex, 1);
            }

            await giveaway.save();

            const guild = client.guilds.cache.get(giveaway.guildId);
            const channel = guild.channels.cache.get(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);

            let winnerMentions = giveaway.winners.map(winner => `<@${winner.winnerId}>`).join(', ');

            const placeholders = {
                prize: giveaway.prize,
                serverName: guild.name,
                hostedBy: giveaway.hostedBy,
                channel: `<#${giveaway.channelId}>`,
                winnerCount: giveaway.winnerCount,
                winners: winnerMentions
            };

            for (const winner of giveaway.winners) {
                try {
                    const user = await client.users.fetch(winner.winnerId);
                    await user.send(replacePlaceholders(lang.Giveaways.WinnerDirectMessage, placeholders));
                } catch (error) {

                }
            }

            const updatedEmbed = EmbedBuilder.from(message.embeds[0]);

            updatedEmbed.setFields([]);
            if (config.Giveaways.Embed.EndedGiveaway.ShowWinnersField) {
                const winnersFieldName = replacePlaceholders(lang.Giveaways.Embeds.EndedGiveaway.WinnersField, placeholders);
                const winnersFieldValue = winnerMentions.length > 0 ? winnerMentions : 'No winners selected';
                updatedEmbed.addFields({ name: winnersFieldName, value: winnersFieldValue, inline: true });
            }

            if (config.Giveaways.Embed.EndedGiveaway.ShowEntriesField) {
                const entriesFieldName = replacePlaceholders(lang.Giveaways.Embeds.EndedGiveaway.EntriesField, placeholders);
                const entriesFieldValue = `**${giveaway.entries}**`;
                updatedEmbed.addFields({ name: entriesFieldName, value: entriesFieldValue, inline: true });
            }

            await message.edit({ embeds: [updatedEmbed] });

            const rerollConfirmationMessage = `Giveaway rerolled! Congratulations to the new winners of the "${placeholders.prize}" giveaway: ${winnerMentions}`;
            await channel.send(rerollConfirmationMessage);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Giveaway winners rerolled successfully.', flags: MessageFlags.Ephemeral });
            }

            try {
                if (config.GiveawayLogs.Enabled) {
                    let embedData = config.GiveawayLogs.GiveawayRerolled.Embed;
                    let logEmbed = new EmbedBuilder()
                        .setColor(parseColor(embedData.Color || "#00FF00"))
                        .setTitle(replacePlaceholders(embedData.Title, placeholders))
                        .setDescription(replacePlaceholders(embedData.Description.join('\n'), placeholders).replace("{winners}", winnerMentions))
                        .setFooter({ text: replacePlaceholders(embedData.Footer, placeholders) });

                    if (config.GiveawayLogs.GiveawayRerolled.Embed.Thumbnail && config.GiveawayLogs.GiveawayRerolled.Embed.ThumbnailUrl) {
                        logEmbed.setThumbnail(config.GiveawayLogs.GiveawayRerolled.Embed.ThumbnailUrl);
                    }

                    const giveawayRerolledChannel = guild.channels.cache.get(config.GiveawayLogs.LogsChannelID);
                    if (giveawayRerolledChannel) {
                        giveawayRerolledChannel.send({ embeds: [logEmbed] });
                    }
                }
            } catch (error) {
                console.error('Error logging giveaway reroll:', error);
            }

        } catch (error) {
            console.error(`Error rerolling the giveaway with ID: ${giveawayId}`, error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'An error occurred while rerolling the giveaway.', flags: MessageFlags.Ephemeral });
            }
        }
    },
    calculateChance: async (interaction, giveaway, lang) => {
        // Ensure lang is available (fallback)
        if (!lang) lang = await require('../../utils/langLoader').getLang(interaction.guild?.id);
        try {
            const userId = interaction.user.id;
            const entrant = giveaway.entrants.find(e => e.entrantId === userId);

            if (!entrant) {
                await interaction.editReply({
                    content: lang.Giveaways.NotJoinedGiveaway,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            let totalEntries = 0;
            for (const e of giveaway.entrants) {
                const entrantEntries = 1 + (e.extraEntries || 0);
                totalEntries += entrantEntries;
            }

            const userEntries = 1 + (entrant.extraEntries || 0);

            const winChance = (userEntries / totalEntries) * 100;

            const placeholders = {
                user: interaction.user,
                winChance: winChance.toFixed(2),
                userEntries: userEntries,
                extraEntries: entrant.extraEntries || 0
            };

            const chanceMessage = replacePlaceholders(lang.Giveaways.chanceMessage, placeholders);

            await interaction.editReply({
                content: chanceMessage,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error calculating chance:', error);
            await interaction.editReply({
                content: lang.Giveaways.CalculationError,
                flags: MessageFlags.Ephemeral
            });
        }
    },
    showEntrants: async (interaction, lang) => {
        try {
            // Ensure lang is available (fallback)
            if (!lang) lang = await require('../../utils/langLoader').getLang(interaction.guild?.id);

            const giveaway = await Giveaway.findOne({
                messageId: interaction.message.id,
                channelId: interaction.channelId
            });

            if (!giveaway) {
                await interaction.editReply({
                    content: "This giveaway has ended or doesn't exist.",
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            if (giveaway.entrants.length === 0) {
                await interaction.editReply({
                    content: "No one has entered this giveaway yet!",
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const ENTRIES_PER_PAGE = 25;
            const userEntries = new Map();
            giveaway.entrants.forEach(entrant => {
                const entries = (entrant.extraEntries || 0) + 1;
                if (userEntries.has(entrant.entrantId)) {
                    userEntries.set(entrant.entrantId, userEntries.get(entrant.entrantId) + entries);
                } else {
                    userEntries.set(entrant.entrantId, entries);
                }
            });

            const sortedEntrants = Array.from(userEntries.entries())
                .sort((a, b) => b[1] - a[1])
                .map((entry, index) => {
                    const [userId, entries] = entry;
                    return `${index + 1}. <@${userId}> (${entries} entries)`;
                });

            const totalPages = Math.ceil(sortedEntrants.length / ENTRIES_PER_PAGE);
            let currentPage = 1;

            const getPageEmbed = (page) => {
                const startIndex = (page - 1) * ENTRIES_PER_PAGE;
                const endIndex = startIndex + ENTRIES_PER_PAGE;
                const pageEntrants = sortedEntrants.slice(startIndex, endIndex);

                const embedConfig = config.Giveaways.Embed.ActiveGiveaway.Button.ShowEntrantsList.Embed;
                const embed = new EmbedBuilder();

                if (embedConfig.Title) {
                    embed.setTitle(embedConfig.Title.replace('{prize}', giveaway.prize));
                }

                if (embedConfig.Description) {
                    const description = embedConfig.Description.join('\n').replace('{entrantsList}', pageEntrants.join('\n'));
                    embed.setDescription(description);
                }

                if (embedConfig.Color) {
                    embed.setColor(embedConfig.Color);
                }

                if (embedConfig.Thumbnail) {
                    embed.setThumbnail(embedConfig.Thumbnail);
                }

                if (embedConfig.Footer) {
                    const footerText = embedConfig.Footer.Text
                        .replace('{totalEntrants}', userEntries.size)
                        .replace('{currentPage}', page)
                        .replace('{totalPages}', totalPages);
                    const iconUrl = embedConfig.Footer.Icon.replace('{footerIcon}', config.Giveaways.Embed.ActiveGiveaway.EmbedFooterIcon);
                    embed.setFooter({
                        text: footerText,
                        iconURL: iconUrl || null
                    });
                }

                return embed;
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('first')
                    .setLabel('≪')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('▶')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(totalPages === 1),
                new ButtonBuilder()
                    .setCustomId('last')
                    .setLabel('≫')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(totalPages === 1)
            );

            const message = await interaction.editReply({
                embeds: [getPageEmbed(currentPage)],
                components: totalPages > 1 ? [row] : [],
                flags: MessageFlags.Ephemeral
            });

            if (totalPages > 1) {
                const collector = message.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 300000
                });

                collector.on('collect', async (i) => {
                    switch (i.customId) {
                        case 'first':
                            currentPage = 1;
                            break;
                        case 'prev':
                            currentPage--;
                            break;
                        case 'next':
                            currentPage++;
                            break;
                        case 'last':
                            currentPage = totalPages;
                            break;
                    }

                    const newRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('≪')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === 1),
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('◀')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === 1),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === totalPages),
                        new ButtonBuilder()
                            .setCustomId('last')
                            .setLabel('≫')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === totalPages)
                    );

                    await i.update({
                        embeds: [getPageEmbed(currentPage)],
                        components: [newRow]
                    });
                });

                collector.on('end', async () => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        row.components.map(component =>
                            ButtonBuilder.from(component).setDisabled(true)
                        )
                    );
                    await message.edit({ components: [disabledRow] }).catch(() => { });
                });
            }
        } catch (error) {
            console.error('Error showing entrants:', error);
            await interaction.editReply({
                content: "An error occurred while fetching the entrants list.",
                flags: MessageFlags.Ephemeral
            });
        }
    }
}


module.exports = giveawayActions;
