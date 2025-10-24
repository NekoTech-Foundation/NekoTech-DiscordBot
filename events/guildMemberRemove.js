const { EmbedBuilder, AuditLogEvent, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
//const fs = require('fs');
//const yaml = require('js-yaml');
const moment = require('moment-timezone');

const UserData = require('../models/UserData');
const GuildData = require('../models/guildDataSchema');
const Ticket = require('../models/tickets');
const Invite = require('../models/inviteSchema');
const { getConfig } = require('../utils/configLoader.js');
const config = getConfig();

const { kickLogCache } = require('../commands/Moderation/moderation');

const sentLeaveEmbeds = new Set();

function parseTime(timeString) {
    const regex = /^(\d+)([smhd])$/;
    const match = timeString.match(regex);
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

const LEAVE_EMBED_RESET_INTERVAL = parseTime('5m');

setInterval(() => {
    sentLeaveEmbeds.clear();
}, LEAVE_EMBED_RESET_INTERVAL);

const GuildSettings = require('../models/GuildSettings');

// ... (rest of the requires)

module.exports = async (client, member) => {
    if (!member || member.id === client.user.id) return;

    const guildSettings = await GuildSettings.findOne({ guildId: member.guild.id });

    await saveUserRoles(member);
    if (guildSettings && guildSettings.leave && guildSettings.leave.enabled) {
        await sendLeaveMessage(member, guildSettings.leave);
    }
    await updateMemberCount(member);
    await processKickEvent(member);
    await handleUserTickets(client, member);

    if (config.LevelingSystem.Enabled && config.LevelingSystem.ResetDataOnLeave) {
        await resetUserDataOnLeave(member);
    }

    await updateInviteUsage(member);
};

async function saveUserRoles(member) {
    try {
        const roles = member.roles.cache.filter(role => role.id !== member.guild.id).map(role => role.id);

        await UserData.findOneAndUpdate(
            { userId: member.id, guildId: member.guild.id },
            { roles: roles },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('Error saving user roles:', error);
    }
}

async function updateInviteUsage(member) {
    try {
        const invite = await Invite.findOne({ guildID: member.guild.id, 'joinedUsers.userID': member.id });
        if (invite) {
            await Invite.updateOne(
                { guildID: member.guild.id, inviteCode: invite.inviteCode },
                {
                    $inc: { uses: -1 },
                    $pull: { joinedUsers: { userID: member.id } }
                }
            );
        }
    } catch (error) {
        console.error('Error updating invite usage:', error);
    }
}

async function sendLeaveMessage(member, leaveSettings) {
    if (!leaveSettings.enabled || !leaveSettings.channelId) {
        return;
    }

    let leaveChannel = member.guild.channels.cache.get(leaveSettings.channelId);
    if (!leaveChannel) {
        return;
    }

    if (sentLeaveEmbeds.has(member.id)) {
        return;
    }

    const userAvatarURL = member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 });
    const userBannerURL = await getUserBannerURL(member);

    let leaveText = replacePlaceholders(leaveSettings.message || '', member, "", null, "", "", false, userAvatarURL, userBannerURL);

    try {
        await leaveChannel.send(leaveText);
    } catch (error) {
        console.error('[ERROR] Failed to send leave message:', error);
    }

    sentLeaveEmbeds.add(member.id);
}

async function getUserBannerURL(member) {
    try {
        const user = await member.user.fetch();
        return user.bannerURL({ format: 'png', dynamic: true, size: 4096 }) || null;
    } catch (error) {
        console.error('Error fetching user banner:', error);
        return null;
    }
}

async function updateMemberCount(member) {
    let memberCountChannel = member.guild.channels.cache.get(config.MemberCountChannel);
    if (memberCountChannel) {
        let memberCountMsg = replacePlaceholders(config.MemberCountChannelName || '', member, "", null, "", "", false);
        memberCountChannel.setName(memberCountMsg).catch(console.error);
    }
}

async function resetUserDataOnLeave(member) {
    try {
        await UserData.findOneAndUpdate(
            { userId: member.id, guildId: member.guild.id },
            { xp: 0, level: 0 },
            { new: true }
        );
    } catch (error) {
        console.error('Error resetting user data on leave:', error);
    }
}

async function processKickEvent(member) {
    const timeWindowMs = 10000;
    const now = Date.now();

    try {
        const fetchedLogs = await member.guild.fetchAuditLogs({
            limit: 20,
            type: AuditLogEvent.MemberKick,
        });

        const relevantLogs = fetchedLogs.entries.filter(entry => {
            const isWithinTimeWindow = now - entry.createdTimestamp < timeWindowMs;
            const isTargetMember = entry.target.id === member.id;
            return isWithinTimeWindow && isTargetMember;
        });

        const sortedLogs = relevantLogs.sort((a, b) => b.createdTimestamp - a.createdTimestamp);

        const kickLog = sortedLogs.first();

        let moderator = kickLog?.executor || { id: 'unknown', username: 'Unknown', tag: 'Unknown' };
        let reason = kickLog?.reason || "No reason specified";

        if (kickLogCache.has(member.id)) {
            const cachedKick = kickLogCache.get(member.id);
            if (now - cachedKick.timestamp < timeWindowMs) {
                moderator = cachedKick.moderator;
                reason = cachedKick.reason;
            }
        }

        if (kickLog) {
            const updatedGuildData = await GuildData.findOneAndUpdate(
                { guildID: member.guild.id },
                { $inc: { cases: 1 } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            const caseNumber = updatedGuildData ? updatedGuildData.cases : 'N/A';

            await UserData.findOneAndUpdate(
                { userId: member.id, guildId: member.guild.id },
                { $inc: { kicks: 1 } },
                { upsert: true, new: true }
            );

            logKick(member, reason, moderator, caseNumber);
        } else {
        }
    } catch (error) {
        console.error('Error processing kick event:', error);
    }
}

function logKick(member, reason, moderator, caseNumber) {
    const currentTime = moment().tz(config.Timezone);
    const placeholders = {
        user: `<@${member.id}>`,
        userName: member.user.username,
        userTag: member.user.tag,
        userId: member.id,
        moderator: `<@${moderator.id}>`,
        moderatorName: moderator.username,
        moderatorTag: moderator.tag,
        moderatorId: moderator.id,
        reason: reason,
        shorttime: currentTime.format("HH:mm"),
        longtime: currentTime.format('MMMM Do YYYY'),
        caseNumber: caseNumber
    };

    const description = replacePlaceholders(config.KickLogs.Embed.Description.join('\n') || '', member, reason, moderator, caseNumber, "", 0, "", "", true);
    const kickEmbed = new EmbedBuilder()
        .setColor(config.KickLogs.Embed.Color || "#FF5555")
        .setTitle(replacePlaceholders(config.KickLogs.Embed.Title || '', member, reason, moderator, caseNumber, "", 0, "", "", true))
        .setDescription(description);

    const footerText = replacePlaceholders(config.KickLogs.Embed.Footer.Text || '', member, reason, moderator, caseNumber, "", 0, "", "", true);
    if (footerText && footerText.trim() !== "") {
        kickEmbed.setFooter({
            text: footerText,
            iconURL: config.KickLogs.Embed.Footer.Icon || undefined
        });
    }

    const thumbnailURL = member.user.displayAvatarURL({ dynamic: true });
    if (thumbnailURL) {
        kickEmbed.setThumbnail(thumbnailURL);
    }

    const logsChannel = member.guild.channels.cache.get(config.KickLogs.LogsChannelID);
    if (logsChannel) {
        logsChannel.send({ embeds: [kickEmbed] });
    } else {
    }
}

function replacePlaceholders(text, member, reason = '', moderator = {}, caseNumber = '', inviterName = '', inviterCount = 0, userAvatarURL = '', userBannerURL = '', isEmbed = false) {
    if (!text) {
        return '';
    }
    const currentTime = moment().tz(config.Timezone);
    const guildIconURL = member.guild.iconURL({ format: 'png', dynamic: true }) || '';
    const joinDate = moment(member.joinedAt).tz(config.Timezone).format('MMMM Do YYYY');
    const joinTime = moment(member.joinedAt).tz(config.Timezone).format('HH:mm');
    const userCreationDate = moment(member.user.createdAt).tz(config.Timezone).format('MMMM Do YYYY');

    let formattedShortTime = isEmbed ? `<t:${Math.floor(currentTime.unix())}:t>` : currentTime.format("HH:mm");
    let formattedLongTime = isEmbed ? `<t:${Math.floor(currentTime.unix())}:F>` : currentTime.format('MMMM Do YYYY');

    return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{userName}/g, member.user.username)
        .replace(/{userTag}/g, member.user.tag)
        .replace(/{userId}/g, member.user.id)
        .replace(/{user-createdAt}/g, moment(member.user.createdAt).tz(config.Timezone).format('MM/DD/YYYY'))
        .replace(/{user-joinedAt}/g, moment(member.joinedAt).tz(config.Timezone).format('MM/DD/YYYY'))
        .replace(/{reason}/g, reason)
        .replace(/{moderator}/g, moderator ? `<@${moderator.id}>` : 'Unknown')
        .replace(/{caseNumber}/g, caseNumber)
        .replace(/{memberCount}/g, member.guild.memberCount)
        .replace(/{memberCountNumeric}/g, member.guild.memberCount)
        .replace(/{guildName}/g, member.guild.name)
        .replace(/{shortTime}/g, formattedShortTime)
        .replace(/{longTime}/g, formattedLongTime)
        .replace(/{user-avatar}/g, userAvatarURL)
        .replace(/{userBanner}/g, userBannerURL)
        .replace(/{guildIcon}/g, guildIconURL)
        .replace(/{invitedBy}/g, inviterName)
        .replace(/{invitedByCount}/g, inviterCount)
        .replace(/{joinDate}/g, joinDate)
        .replace(/{joinTime}/g, joinTime)
        .replace(/{UserCreation}/g, userCreationDate);
}

async function handleUserTickets(client, member) {
    try {
        const tickets = await Ticket.find({ userId: member.id, status: { $in: ['open', 'closed'] } });
        const userLeftDesign = config.UserLeftDesign.Embed;
        const buttonConfig = config.UserLeftDesign.Button;

        for (const ticket of tickets) {
            const channel = await client.channels.fetch(ticket.channelId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor(userLeftDesign.Color)
                    .setDescription(userLeftDesign.Description.join('\n')
                        .replace('{userId}', member.id)
                        .replace('{user}', `<@${member.id}>`)
                        .replace('{userIcon}', member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 })));

                if (userLeftDesign.Title && userLeftDesign.Title !== "") {
                    embed.setTitle(userLeftDesign.Title
                        .replace('{userId}', member.id)
                        .replace('{user}', `<@${member.id}>`)
                        .replace('{userIcon}', member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 })));
                }

                if (userLeftDesign.Footer && userLeftDesign.Footer.Text && userLeftDesign.Footer.Text !== "") {
                    embed.setFooter({
                        text: userLeftDesign.Footer.Text
                            .replace('{userId}', member.id)
                            .replace('{user}', member.user.username)
                            .replace('{userIcon}', member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 })),
                        iconURL: userLeftDesign.Footer.Icon && userLeftDesign.Footer.Icon !== "" ? userLeftDesign.Footer.Icon.replace('{userIcon}', member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 })) : null
                    });
                }

                if (userLeftDesign.Author && userLeftDesign.Author.Text && userLeftDesign.Author.Text !== "") {
                    embed.setAuthor({
                        name: userLeftDesign.Author.Text
                            .replace('{userId}', member.id)
                            .replace('{user}', member.user.username)
                            .replace('{userIcon}', member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 })),
                        iconURL: userLeftDesign.Author.Icon && userLeftDesign.Author.Icon !== "" ? userLeftDesign.Author.Icon.replace('{userIcon}', member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 })) : null
                    });
                }

                if (userLeftDesign.Image && userLeftDesign.Image !== "") {
                    embed.setImage(userLeftDesign.Image);
                }

                if (userLeftDesign.Thumbnail && userLeftDesign.Thumbnail !== "") {
                    embed.setThumbnail(userLeftDesign.Thumbnail.replace('{userIcon}', member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 })));
                }

                if (buttonConfig && buttonConfig.Name && buttonConfig.Emoji && buttonConfig.Style) {
                    const styleMap = {
                        "PRIMARY": ButtonStyle.Primary,
                        "SECONDARY": ButtonStyle.Secondary,
                        "SUCCESS": ButtonStyle.Success,
                        "DANGER": ButtonStyle.Danger,
                        "LINK": ButtonStyle.Link
                    };

                    const deleteButton = new ButtonBuilder()
                        .setCustomId(`ticketdelete-${ticket.ticketId}`)
                        .setLabel(buttonConfig.Name)
                        .setEmoji(buttonConfig.Emoji)
                        .setStyle(styleMap[buttonConfig.Style.toUpperCase()] || ButtonStyle.Secondary);

                    const row = new ActionRowBuilder().addComponents(deleteButton);

                    await channel.send({ embeds: [embed], components: [row] });
                } else {
                    await channel.send({ embeds: [embed] });
                }

            }
        }
    } catch (error) {
        console.error('Error handling user tickets:', error);
    }
}