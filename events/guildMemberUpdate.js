const { EmbedBuilder, AuditLogEvent } = require('discord.js');
//const fs = require('fs');
//const yaml = require('js-yaml');
const moment = require('moment-timezone');
const { getConfig, getLang, getCommands } = require('../utils/configLoader.js');
const lang = getLang();
const config = getConfig();

module.exports = async (client, oldMember, newMember) => {
    if (newMember.user.bot) {
        return;
    }

    const currentTime = moment().tz(config.Timezone);
    const addLogChannel = newMember.guild.channels.cache.get(config.RoleAddLogs.LogsChannelID);
    const removeLogChannel = newMember.guild.channels.cache.get(config.RoleRemoveLogs.LogsChannelID);
    const updateLogChannel = newMember.guild.channels.cache.get(config.UserUpdateLogs.LogsChannelID);
    const timeoutLogChannel = newMember.guild.channels.cache.get(config.TimeoutLogs.LogsChannelID);
    const untimeLogChannel = newMember.guild.channels.cache.get(config.UntimeLogs.LogsChannelID);

    try {
        if (config.AntiHoist.EnableOnUserUpdate) {
            handleAntiHoist(newMember);
        }

        if (config.UserUpdateLogs.Enabled && oldMember.nickname !== newMember.nickname) {
            handleNicknameChange(oldMember, newMember, updateLogChannel, currentTime);
        }

        const oldTimeout = oldMember.communicationDisabledUntil;
        const newTimeout = newMember.communicationDisabledUntil;
        const timeoutChanged = oldTimeout !== newTimeout;
        const isTimeout = newTimeout && (!oldTimeout || newTimeout > oldTimeout);
        const isUntime = oldTimeout && !newTimeout;

        if (timeoutChanged && (isTimeout || isUntime) && (config.TimeoutLogs.Enabled || config.UntimeLogs.Enabled)) {
            const moderator = await fetchModeratorForTimeoutChange(newMember);
            handleTimeoutChange(oldMember, newMember, timeoutLogChannel, untimeLogChannel, currentTime, moderator, isTimeout);
        }

        if (hasRoleChanged(oldMember, newMember)) {
            handleRoleChange(oldMember, newMember, addLogChannel, removeLogChannel, currentTime);
        }
    } catch (error) {
        console.error('Error handling guild member update:', error);
    }
};

function handleAntiHoist(member) {
    let displayName = member.displayName;
    let originalDisplayName = displayName;

    while (displayName.length > 0 && (config.AntiHoist.DisallowedCharacters.includes(displayName.charAt(0)) || displayName.charAt(0) === ' ')) {
        displayName = displayName.substring(1);
    }

    if (displayName.length === 0) {
        displayName = config.AntiHoist.DefaultDisplayName;
    }

    if (displayName !== originalDisplayName) {
        try {
            member.setNickname(displayName.trim());

            const logChannel = member.guild.channels.cache.get(config.AntiHoist.LogsChannelID);
            if (logChannel) {
                let logEmbed = new EmbedBuilder()
                    .setColor(parseInt(config.AntiHoist.LogEmbed.Color.replace("#", ""), 16))
                    .setTitle(replaceAntiHoistPlaceholders(config.AntiHoist.LogEmbed.Title, member).replace("{oldDisplayName}", originalDisplayName))
                    .setDescription(replaceAntiHoistPlaceholders(config.AntiHoist.LogEmbed.Description.join('\n'), member).replace("{oldDisplayName}", originalDisplayName).replace("{newDisplayName}", displayName))
                    .setFooter({ text: replaceAntiHoistPlaceholders(config.AntiHoist.LogEmbed.Footer, member).replace("{oldDisplayName}", originalDisplayName).replace("{newDisplayName}", displayName) })
                    .setTimestamp();

                logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('Error updating nickname or sending log:', error);
        }
    }
}

function handleRoleChange(oldMember, newMember, addLogChannel, removeLogChannel, currentTime) {
    const oldRoles = new Set(oldMember.roles.cache.map(role => role.id));
    const newRoles = new Set(newMember.roles.cache.map(role => role.id));

    const addedRoles = newMember.roles.cache.filter(role => !oldRoles.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newRoles.has(role.id));

    if (addedRoles.size > 0 && config.RoleAddLogs.Enabled) {
        handleAddRole(newMember, Array.from(addedRoles.values()), addLogChannel, currentTime);
    } else {
    }

    if (removedRoles.size > 0 && config.RoleRemoveLogs.Enabled) {
        handleRemoveRole(newMember, Array.from(removedRoles.values()), removeLogChannel, currentTime);
    } else {
    }
}

function hasRoleChanged(oldMember, newMember) {
    const oldRoles = oldMember.roles.cache.map(role => role.id).sort();
    const newRoles = newMember.roles.cache.map(role => role.id).sort();

    if (oldRoles.length !== newRoles.length) {
        return true;
    }

    for (let i = 0; i < oldRoles.length; i++) {
        if (oldRoles[i] !== newRoles[i]) {
            return true;
        }
    }

    return false;
}

function handleAddRole(member, addedRoles, logChannel, currentTime) {
    const embedData = lang.RoleAddLogs.Embed;
    const addedRoleNames = formatRoles(addedRoles);

    let embed = new EmbedBuilder()
        .setColor(embedData.Color || "#1E90FF");

    if (embedData.Title) {
        embed.setTitle(replacePlaceholders(embedData.Title, member, null, null, addedRoleNames, null, null, null, currentTime));
    }

    if (embedData.Description.length > 0) {
        embed.setDescription(
            embedData.Description.map(line =>
                replacePlaceholders(line, member, null, null, addedRoleNames, null, null, null, currentTime)
            ).join('\n')
        );
    }

    if (embedData.Footer && embedData.Footer.Text) {
        embed.setFooter({ text: embedData.Footer.Text, iconURL: embedData.Footer.Icon || undefined });
    }

    if (embedData.Author && embedData.Author.Text) {
        embed.setAuthor({ name: embedData.Author.Text, iconURL: embedData.Author.Icon || undefined });
    }

    if (embedData.Thumbnail) {
        embed.setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }));
    }

    if (embedData.Image) {
        embed.setImage(embedData.Image);
    }

    if (logChannel) {
        logChannel.send({ embeds: [embed] });
    }
}

function handleRemoveRole(member, removedRoles, logChannel, currentTime) {
    const embedData = lang.RoleRemoveLogs.Embed;
    const removedRoleNames = formatRoles(removedRoles);

    let embed = new EmbedBuilder()
        .setColor(embedData.Color || "#FF4500");

    if (embedData.Title) {
        embed.setTitle(replacePlaceholders(embedData.Title, member, null, null, null, removedRoleNames, null, null, currentTime));
    }

    if (embedData.Description.length > 0) {
        embed.setDescription(
            embedData.Description.map(line =>
                replacePlaceholders(line, member, null, null, null, removedRoleNames, null, null, currentTime)
            ).join('\n')
        );
    }

    if (embedData.Footer && embedData.Footer.Text) {
        embed.setFooter({ text: embedData.Footer.Text, iconURL: embedData.Footer.Icon || undefined });
    }

    if (embedData.Author && embedData.Author.Text) {
        embed.setAuthor({ name: embedData.Author.Text, iconURL: embedData.Author.Icon || undefined });
    }

    if (embedData.Thumbnail) {
        embed.setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }));
    }

    if (embedData.Image) {
        embed.setImage(embedData.Image);
    }

    if (logChannel) {
        logChannel.send({ embeds: [embed] });
    }
}

async function fetchModeratorForTimeoutChange(member) {
    try {
        const fetchedLogs = await member.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberUpdate,
        });
        const timeoutLog = fetchedLogs.entries.first();
        if (!timeoutLog) return null;

        const { executor, target } = timeoutLog;
        if (target.id === member.id) {
            return executor;
        }
    } catch (error) {
        console.error('Error fetching audit logs:', error);
    }
    return null;
}

function handleNicknameChange(oldMember, newMember, logChannel, currentTime) {
    let oldNickname = oldMember.nickname || "None";
    let newNickname = newMember.nickname || "None";
    let embedData = lang.UserUpdateLogs.Embed;

    let embed = new EmbedBuilder()
        .setColor(embedData.Color || "#00FF00");

    if (embedData.Title) {
        embed.setTitle(replacePlaceholders(embedData.Title, newMember, oldNickname, newNickname, null, null, null, null, currentTime));
    }

    if (embedData.Description.length > 0) {
        embed.setDescription(
            embedData.Description.map(line =>
                replacePlaceholders(line, newMember, oldNickname, newNickname, null, null, null, null, currentTime)
            ).join('\n')
        );
    }

    if (embedData.Footer && embedData.Footer.Text) {
        embed.setFooter({ text: replacePlaceholders(embedData.Footer.Text, newMember, oldNickname, newNickname, null, null, null, null, currentTime), iconURL: embedData.Footer.Icon || undefined });
    }

    if (embedData.Author && embedData.Author.Text) {
        embed.setAuthor({ name: replacePlaceholders(embedData.Author.Text, newMember, oldNickname, newNickname, null, null, null, null, currentTime), iconURL: embedData.Author.Icon || undefined });
    }

    if (embedData.Thumbnail) {
        embed.setThumbnail(newMember.user.displayAvatarURL({ format: 'png', dynamic: true }));
    }

    if (embedData.Image) {
        embed.setImage(embedData.Image);
    }

    if (logChannel) {
        logChannel.send({ embeds: [embed] });
    }
}

function handleTimeoutChange(oldMember, newMember, timeoutLogChannel, untimeLogChannel, currentTime, moderator, isTimeout) {
    const embedData = isTimeout ? lang.TimeoutLogs.Embed : lang.UntimeLogs.Embed;
    const logChannel = isTimeout ? timeoutLogChannel : untimeLogChannel;
    const duration = isTimeout ? getFormattedDuration(newMember.communicationDisabledUntil) : null;

    let embed = new EmbedBuilder()
        .setColor(embedData.Color || (isTimeout ? "#FFA500" : "#4CAF50"));

    if (embedData.Title) {
        embed.setTitle(replacePlaceholders(embedData.Title, newMember, null, null, null, null, moderator, duration, currentTime));
    }

    if (embedData.Description.length > 0) {
        embed.setDescription(
            embedData.Description.map(line =>
                replacePlaceholders(line, newMember, null, null, null, null, moderator, duration, currentTime)
            ).join('\n')
        );
    }

    if (embedData.Footer && embedData.Footer.Text) {
        embed.setFooter({ text: embedData.Footer.Text, iconURL: embedData.Footer.Icon || undefined });
    }

    if (embedData.Author && embedData.Author.Text) {
        embed.setAuthor({ name: embedData.Author.Text, iconURL: embedData.Author.Icon || undefined });
    }

    if (embedData.Thumbnail) {
        embed.setThumbnail(newMember.user.displayAvatarURL({ format: 'png', dynamic: true }));
    }

    if (embedData.Image) {
        embed.setImage(embedData.Image);
    }

    if (logChannel) {
        logChannel.send({ embeds: [embed] });
    }
}

function getFormattedDuration(communicationDisabledUntil) {
    if (!communicationDisabledUntil) return "None";
    const duration = moment.duration(moment(communicationDisabledUntil).diff(moment()));
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    const seconds = duration.seconds();
    return `${hours}h ${minutes}m ${seconds}s`;
}

function formatRoles(roles) {
    if (!roles || roles.length === 0) {
        return 'None';
    }
    return roles.map(role => `<@&${role.id}>`).join(", ");
}

function replacePlaceholders(text, member, oldNickname, newNickname, addedRoleNames, removedRoleNames, moderator, duration, currentTime) {
    return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{userName}/g, member.user.username)
        .replace(/{userTag}/g, member.user.tag)
        .replace(/{userId}/g, member.user.id)
        .replace(/{oldNickname}/g, oldNickname || 'None')
        .replace(/{newNickname}/g, newNickname || 'None')
        .replace(/{addedRoleNames}/g, addedRoleNames || 'None')
        .replace(/{removedRoleNames}/g, removedRoleNames || 'None')
        .replace(/{duration}/g, duration || 'None')
        .replace(/{moderator}/g, moderator ? `<@${moderator.id}>` : "Unknown")
        .replace(/{moderatorName}/g, moderator ? moderator.username : "Unknown")
        .replace(/{moderatorTag}/g, moderator ? `${moderator.username}#${moderator.discriminator}` : "Unknown")
        .replace(/{shorttime}/g, currentTime.format("HH:mm"))
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'));
}

function replaceAntiHoistPlaceholders(text, member) {
    const currentTime = moment().tz(config.Timezone);

    return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{newDisplayName}/g, member.displayName)
        .replace(/{userName}/g, member.user.username)
        .replace(/{userTag}/g, member.user.tag)
        .replace(/{userId}/g, member.user.id)
        .replace(/{user-createdAt}/g, moment(member.user.createdAt).tz(config.Timezone).format('MM/DD/YYYY'))
        .replace(/{user-joinedAt}/g, moment(member.joinedAt).tz(config.Timezone).format('MM/DD/YYYY'))
        .replace(/{memberCount}/g, member.guild.memberCount)
        .replace(/{guildName}/g, member.guild.name)
        .replace(/{shorttime}/g, currentTime.format("HH:mm"))
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'));
}