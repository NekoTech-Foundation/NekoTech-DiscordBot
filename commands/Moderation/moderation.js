const { EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField, ChannelType, MessageFlags } = require('discord.js');
//const fs = require('fs');
//const yaml = require("js-yaml");
const moment = require('moment-timezone');
const UserData = require('../../models/UserData');
const GuildData = require('../../models/guildDataSchema');
const TempRole = require('../../models/TempRole');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

const MAX_WARNINGS_PER_PAGE = 5;

const kickLogCache = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Moderation commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Ban a user by mention or ID')
                .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(false))
                .addStringOption(option => option.setName('user_id').setDescription('The Discord ID of the user to ban').setRequired(false))
                .addStringOption(option => option.setName('reason').setDescription('The reason for the ban').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Unban a user')
                .addStringOption(option => option.setName('userid').setDescription('The user\'s Discord ID').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('The reason for the unban').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('timeout')
                .setDescription('Timeout a user')
                .addUserOption(option => option.setName('user').setDescription('The user to timeout').setRequired(true))
                .addStringOption(option => option.setName('time').setDescription('How long the user should be timed out, for example: 1d, 1h, 1m, or "perm" to perm mute').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('The reason for the timeout').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleartimeout')
                .setDescription('Remove timeout from a user')
                .addUserOption(option => option.setName('user').setDescription('The user to remove the timeout from').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Warn a user')
                .addUserOption(option => option.setName('user').setDescription('The user to warn').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('The reason for the warn').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warnlist')
                .setDescription('List warnings for a user')
                .addUserOption(option => option.setName('user').setDescription('The user to list warnings for').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unwarn')
                .setDescription('Remove a warning from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to unwarn')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('warning_id')
                        .setDescription('The ID of the warning to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Kick a user')
                .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('The reason for the kick').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nickname')
                .setDescription(lang.Nickname.Description)
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription(lang.Nickname.UserOptionDescription)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('nickname')
                        .setDescription(lang.Nickname.NicknameOptionDescription)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clearhistory')
                .setDescription('Clear a user\'s history')
                .addUserOption(option => option.setName('user').setDescription('The user to clear history from').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clearchannel')
                .setDescription('Delete all messages in a channel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('View a user\'s history')
                .addUserOption(option => option.setName('user').setDescription('The user to view history').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('purge')
                .setDescription('Purge specific messages in a channel')
                .addNumberOption(option =>
                    option.setName('amount')
                        .setDescription('The number of messages to purge')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of messages to purge')
                        .addChoices(
                            { name: 'All', value: 'all' },
                            { name: 'Links', value: 'links' },
                            { name: 'Text', value: 'text' },
                            { name: 'Bots', value: 'bots' },
                            { name: 'Embeds', value: 'embeds' },
                            { name: 'Images', value: 'images' })))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slowmode')
                .setDescription('Set slowmode in a channel')
                .addNumberOption(option => option.setName('amount').setDescription('Slowmode time in seconds (1-21600 Seconds), Set to 0 to disable.').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tempban')
                .setDescription('Temporarily ban a user')
                .addStringOption(option => option.setName('duration').setDescription('Ban duration (e.g., 1d 2h 15m)').setRequired(true))
                .addUserOption(option => option.setName('user').setDescription('The user to ban'))
                .addStringOption(option => option.setName('userid').setDescription('The user ID to ban'))
                .addStringOption(option => option.setName('reason').setDescription('Reason for the ban')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('temprole')
                .setDescription('Assign a temporary role to a user')
                .addUserOption(option =>
                    option.setName('user').setDescription('The user to assign the role to').setRequired(true))
                .addRoleOption(option =>
                    option.setName('role').setDescription('The role to assign').setRequired(true))
                .addStringOption(option =>
                    option.setName('duration').setDescription('Duration (e.g., 1s, 15m, 1h, 2d, 1w, 1y)').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('temprolelist')
                .setDescription('List all active temporary role assignments')
                .addUserOption(option =>
                    option.setName('user').setDescription('Filter by specific user').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setnote')
                .setDescription('Set a note on a user')
                .addUserOption(option => option.setName('user').setDescription('The user to set the note on').setRequired(true))
                .addStringOption(option => option.setName('note').setDescription('The note to set on the user').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('viewnote')
                .setDescription('View a user\'s note')
                .addUserOption(option => option.setName('user').setDescription('The user to view the note of').setRequired(true))),
    category: 'Moderation',
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'ban') {
            await executeBan(interaction);
        } else if (subcommand === 'unban') {
            await executeUnban(interaction);
        } else if (subcommand === 'timeout') {
            await executeTimeout(interaction);
        } else if (subcommand === 'cleartimeout') {
            await executeClearTimeout(interaction);
        } else if (subcommand === 'warn') {
            await executeWarn(interaction);
        } else if (subcommand === 'warnlist') {
            await executeWarnList(interaction);
        } else if (subcommand === 'unwarn') {
            await executeUnwarn(interaction);
        } else if (subcommand === 'kick') {
            await executeKick(interaction);
        } else if (subcommand === 'nickname') {
            await executeNickname(interaction);
        } else if (subcommand === 'clearhistory') {
            await executeClearHistory(interaction);
        } else if (subcommand === 'clearchannel') {
            await executeClearChannel(interaction);
        } else if (subcommand === 'history') {
            await executeHistory(interaction);
        } else if (subcommand === 'purge') {
            await executePurge(interaction);
        } else if (subcommand === 'slowmode') {
            await executeSlowmode(interaction);
        } else if (subcommand === 'tempban') {
            await executeTempban(interaction);
        } else if (subcommand === 'setnote') {
            await executeSetNote(interaction);
        } else if (subcommand === 'viewnote') {
            await executeViewNote(interaction);
        } else if (subcommand === 'temprole') {
            await executeTemprole(interaction);
        } else if (subcommand === 'temprolelist') {
            await executeTemproleList(interaction);
        }
    }
};

function parseDuration(durationStr) {
    const regex = /(\d+)([smhdwy])$/;
    const match = durationStr.match(regex);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000,
        'y': 365 * 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit];
}

async function executeSetNote(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requiredRoles = config.ModerationRoles.setnote;
    const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        return interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('user');
    const noteText = interaction.options.getString('note');

    if (noteText.length > 250) {
        return interaction.editReply({ content: lang.SetNote.NoteLongerThan250, flags: MessageFlags.Ephemeral });
    }

    if (user.bot) {
        return interaction.editReply({ content: lang.SetNote.NoteCantAddBot, flags: MessageFlags.Ephemeral });
    }

    try {
        await UserData.findOneAndUpdate(
            { userId: user.id, guildId: interaction.guild.id },
            { $set: { note: noteText } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        const successEmbed = new EmbedBuilder()
            .setAuthor({ name: lang.SuccessEmbedTitle, iconURL: 'https://i.imgur.com/7SlmRRa.png' })
            .setColor(config.SuccessEmbedColor)
            .setDescription(lang.SetNote.NoteSuccess.replace(/{user}/g, `<@!${user.id}>`));

        await interaction.editReply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Error setting note:', error);
        await interaction.editReply({ content: 'There was an error setting the note.', flags: MessageFlags.Ephemeral });
    }
}

async function executeBan(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requiredRoles = config.ModerationRoles.ban;
    const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        await interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
        return;
    }

    const user = interaction.options.getUser('user');
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'Not specified';

    let member;
    if (user) {
        member = await interaction.guild.members.fetch(user.id).catch(() => null);
    } else if (userId) {
        member = await interaction.guild.members.fetch(userId).catch(() => null);
    }

    if (!member) {
        if (userId) {
            const userFetch = await interaction.client.users.fetch(userId).catch(() => null);
            if (!userFetch) {
                await interaction.editReply({ content: lang.Ban.UserNotFound, flags: MessageFlags.Ephemeral });
                return;
            }

            await interaction.guild.bans.create(userId, { reason: reason }).catch(err => {
                console.error('Ban User Error:', err);
                return interaction.editReply({ content: lang.Ban.CantBanUser, flags: MessageFlags.Ephemeral });
            });

            let replyContent = lang.Ban.Success.replace('{userTag}', userFetch.tag).replace('{reason}', reason);
            await interaction.editReply({ content: replyContent, flags: MessageFlags.Ephemeral });
            return;
        } else {
            await interaction.editReply({ content: lang.Ban.UserNotFound, flags: MessageFlags.Ephemeral });
            return;
        }
    }

    if (member.user.id === interaction.user.id) {
        await interaction.editReply({ content: lang.Ban.CantBanSelf, flags: MessageFlags.Ephemeral });
        return;
    }

    if (!member.bannable) {
        await interaction.editReply({ content: lang.Ban.CantBanUser, flags: MessageFlags.Ephemeral });
        return;
    }

    const dmSuccess = await sendBanDM(member, reason, interaction, interaction.guild);
    await banMember(member, reason, interaction);

    let replyContent = lang.Ban.Success.replace('{userTag}', member.user.tag).replace('{reason}', reason);
    if (!dmSuccess) {
        replyContent += "\n" + "Note: Unable to send DM to user.";
    }

    await interaction.editReply({ content: replyContent, flags: MessageFlags.Ephemeral });
}

async function executeUnban(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!hasPermissionToUnban(interaction)) {
        await interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
        return;
    }

    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('reason');

    try {
        await unbanUser(interaction, userId, reason);
    } catch (e) {
        console.error('Unban Command Error:', e);
        await interaction.editReply({ content: lang.Unban.UnbanError, flags: MessageFlags.Ephemeral });
    }
}

const MAX_DISCORD_TIMEOUT = 28 * 24 * 60 * 60 * 1000;

async function executeTimeout(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!hasTimeoutPermission(interaction)) {
        return interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser("user");
    const timeInput = interaction.options.getString("time");
    const reason = interaction.options.getString("reason");
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
        return interaction.editReply({ content: lang.Timeout.UserNotFound, flags: MessageFlags.Ephemeral });
    }

    const timeInMs = parseTimeInput(timeInput);

    if (timeInMs === null) {
        return interaction.editReply({ 
            content: lang.Timeout.InvalidTime || "Invalid time specified. Time must be at least 10 seconds or 'perm' for permanent mute.", 
            flags: MessageFlags.Ephemeral 
        });
    }

    try {
        const guildData = await GuildData.findOne({ guildID: interaction.guild.id });
        
        if (timeInMs === Infinity) {
            await applyMutedRole(interaction, member, reason);
            await interaction.editReply({ content: lang.Timeout.PermanentMuteSuccess.replace('{user}', member.user.tag).replace('{reason}', reason), flags: MessageFlags.Ephemeral });
        } else if (timeInMs <= MAX_DISCORD_TIMEOUT) {
            await member.timeout(timeInMs, reason);
            await interaction.editReply({ content: lang.Timeout.Success.replace('{user}', member.user.tag).replace('{time}', timeInput).replace('{reason}', reason), flags: MessageFlags.Ephemeral });
        } else {
            await applyMutedRole(interaction, member, reason);
            const endTime = new Date(Date.now() + timeInMs);
            await scheduleRoleRemoval(member, endTime, guildData);
            await interaction.editReply({ content: lang.Timeout.LongMuteSuccess.replace('{user}', member.user.tag).replace('{time}', timeInput).replace('{reason}', reason), flags: MessageFlags.Ephemeral });
        }
    } catch (error) {
        console.error('Timeout Error:', error);
        await interaction.editReply({ content: lang.Timeout.Error, flags: MessageFlags.Ephemeral });
    }
}

async function executeClearTimeout(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!hasClearTimeoutPermission(interaction)) {
        return interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser("user");
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
        return interaction.editReply({ content: lang.ClearTimeout.UserNotFound, flags: MessageFlags.Ephemeral });
    }

    try {
        const wasMuted = await removeMutedRole(member);
        await member.timeout(null);
        
        const responseKey = wasMuted ? 'MuteRemoved' : 'TimeoutRemoved';
        await interaction.editReply({ content: lang.ClearTimeout[responseKey].replace('{user}', member.user.tag), flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Clear Timeout Error:', error);
        await interaction.editReply({ content: lang.ClearTimeout.Error, flags: MessageFlags.Ephemeral });
    }
}


function hasTimeoutPermission(interaction) {
    const requiredRoles = config.ModerationRoles.timeout;
    return hasPermission(interaction, requiredRoles);
}

function hasClearTimeoutPermission(interaction) {
    const requiredRoles = config.ModerationRoles.cleartimeout;
    return hasPermission(interaction, requiredRoles);
}

function hasPermission(interaction, requiredRoles) {
    const hasRequiredRole = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    return hasRequiredRole || isAdministrator;
}

function parseTimeInput(timeInput) {
    if (timeInput.toLowerCase() === 'perm') return Infinity;
    
    const timeInMs = parseDuration(timeInput);
    if (!timeInMs || timeInMs < 10000) {
        return null;
    }
    return timeInMs;
}

async function applyMutedRole(interaction, member, reason) {
    const mutedRole = await getOrCreateTimeoutRole(interaction.guild);
    
    await member.roles.add(mutedRole, reason);
    await UserData.findOneAndUpdate(
        { userId: member.id, guildId: interaction.guild.id },
        { isMuted: true },
        { upsert: true }
    );
}

async function getOrCreateTimeoutRole(guild) {
    let guildData = await GuildData.findOne({ guildID: guild.id });
    if (!guildData) {
        guildData = new GuildData({ guildID: guild.id });
    }

    let mutedRole;
    if (guildData.timeoutRoleId) {
        mutedRole = guild.roles.cache.get(guildData.timeoutRoleId);
    }

    if (!mutedRole) {
        mutedRole = await createMutedRole(guild);
        guildData.timeoutRoleId = mutedRole.id;
        await guildData.save();
    }

    return mutedRole;
}

async function createMutedRole(guild) {
    const mutedRole = await guild.roles.create({
        name: 'Muted',
        color: '#808080',
        permissions: []
    });
    await setMutedRolePermissions(guild, mutedRole);
    return mutedRole;
}

async function removeMutedRole(member) {
    const guildData = await GuildData.findOne({ guildID: member.guild.id });
    if (!guildData.timeoutRoleId) return false;

    const mutedRole = member.guild.roles.cache.get(guildData.timeoutRoleId);
    if (!mutedRole) return false;

    if (member.roles.cache.has(mutedRole.id)) {
        await member.roles.remove(mutedRole);
        await UserData.findOneAndUpdate(
            { userId: member.id, guildId: member.guild.id },
            { isMuted: false }
        );
        return true;
    }
    return false;
}

async function scheduleRoleRemoval(member, endTime, guildData) {
    if (!guildData || !guildData.timeoutRoleId) return;

    if (endTime === Infinity) {
        return;
    }

    await TempRole.findOneAndUpdate(
        { userId: member.id, guildId: member.guild.id, roleId: guildData.timeoutRoleId },
        { expiration: endTime },
        { upsert: true }
    );
}

async function setMutedRolePermissions(guild, mutedRole) {
    const channels = guild.channels.cache.filter(channel =>
        [
            ChannelType.GuildText,
            ChannelType.GuildVoice,
            ChannelType.GuildStageVoice,
            ChannelType.GuildAnnouncement,
            ChannelType.AnnouncementThread,
            ChannelType.PublicThread,
            ChannelType.PrivateThread
        ].includes(channel.type)
    );

    for (const [channelId, channel] of channels) {
        try {
            const permissions = {};

            if ([
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
                ChannelType.AnnouncementThread,
                ChannelType.PublicThread,
                ChannelType.PrivateThread
            ].includes(channel.type)) {
                permissions[PermissionsBitField.Flags.SendMessages] = false;
                permissions[PermissionsBitField.Flags.AddReactions] = false;
            }

            if ([
                ChannelType.GuildVoice,
                ChannelType.GuildStageVoice
            ].includes(channel.type)) {
                permissions[PermissionsBitField.Flags.Speak] = false;
            }

            if (channel.permissionOverwrites && typeof channel.permissionOverwrites.edit === 'function') {
                await channel.permissionOverwrites.edit(mutedRole, permissions);
            } else {
            }
        } catch (error) {
            console.error(`Failed to set permissions in channel ${channelId} (${channel.type}):`, error);
        }
    }
}

async function executeWarn(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requiredRoles = config.ModerationRoles.warn;
    const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        return interaction.editReply({ content: lang.Warn.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const member = interaction.guild.members.cache.get(user.id);

    if (!member || member.user.bot || user.id === interaction.user.id) {
        return interaction.editReply({ content: lang.Warn.BotOrSelf, flags: MessageFlags.Ephemeral });
    }

    try {
        const updatedUser = await updateWarningCount(member, reason, interaction);
        await warnMember(member, reason, interaction);

        const placeholders = {
            user: `<@${member.id}>`,
            userName: member.user.username,
            userTag: member.user.tag,
            userId: member.id,
            moderator: `<@${interaction.user.id}>`,
            moderatorName: interaction.user.username,
            moderatorTag: interaction.user.tag,
            moderatorId: interaction.user.id,
            reason: reason,
            shorttime: moment().tz(config.Timezone).format("HH:mm"),
            longtime: moment().tz(config.Timezone).format('MMMM Do YYYY'),
            caseNumber: updatedUser.warnings.length
        };

        interaction.editReply({ content: replacePlaceholders(lang.Warn.Success, placeholders), flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Error warning user:', error);
        interaction.editReply({ content: lang.Warn.Error, flags: MessageFlags.Ephemeral });
    }
}

async function executeWarnList(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser('user');
    try {
        const userData = await UserData.findOne({ userId: user.id, guildId: interaction.guild.id });
        if (userData && userData.warnings.length > 0) {
            const totalPages = Math.ceil(userData.warnings.length / MAX_WARNINGS_PER_PAGE);

            let currentPage = 0;
            const sendPage = async (page) => {
                const start = page * MAX_WARNINGS_PER_PAGE;
                const end = start + MAX_WARNINGS_PER_PAGE;
                const warningsForPage = userData.warnings.slice(start, end);

                const warningEntries = warningsForPage.map((warn, index) => {
                    const formattedLongTime = moment(warn.date).format("MMMM Do YYYY");
                    const formattedShortTime = moment(warn.date).format("HH:mm");

                    return lang.WarnList.Embed.EntryFormat.map(line =>
                        line.replace('{index}', start + index + 1)
                            .replace('{longtime}', formattedLongTime)
                            .replace('{shorttime}', formattedShortTime)
                            .replace('{reason}', warn.reason)
                            .replace('{moderatorId}', warn.moderatorId)
                    ).join('\n');
                }).join('\n\n');

                const embed = new EmbedBuilder()
                    .setTitle(lang.WarnList.Embed.Title.replace('{userName}', user.username))
                    .setDescription(warningEntries)
                    .setColor(lang.WarnList.Embed.Color)
                    .setFooter({ text: lang.WarnList.Embed.Footer.replace('{totalWarnings}', userData.warnings.length) });

                if (lang.WarnList.Embed.Thumbnail) {
                    embed.setThumbnail(user.displayAvatarURL());
                }

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('previous')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === totalPages - 1)
                    );

                await interaction.editReply({ embeds: [embed], components: [buttons] });
            };

            await sendPage(currentPage);

            const filter = i => ['previous', 'next'].includes(i.customId) && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                try {
                    await i.deferUpdate();

                    if (i.customId === 'previous' && currentPage > 0) {
                        currentPage--;
                    } else if (i.customId === 'next' && currentPage < totalPages - 1) {
                        currentPage++;
                    }

                    await sendPage(currentPage);
                } catch (error) {
                    console.error('Error handling button interaction:', error);
                }
            });

            collector.on('end', () => interaction.editReply({ components: [] }));
        } else {
            const noWarningsMessage = lang.WarnList.NoWarnings.replace('{userName}', user.username) || "This user has no warnings.";
            await interaction.editReply({ content: noWarningsMessage });
        }
    } catch (error) {
        console.error('Error listing warnings:', error);
        await interaction.editReply({ content: lang.WarnList.Error, flags: MessageFlags.Ephemeral });
    }
}

async function executeUnwarn(interaction) {
    const requiredRoles = config.ModerationRoles.unwarn;
    const hasPermission = requiredRoles.some(role => interaction.member.roles.cache.has(role));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        return interaction.reply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('user');
    const warningId = interaction.options.getInteger('warning_id');

    const userData = await UserData.findOne({ userId: user.id, guildId: interaction.guild.id });
    if (!userData || userData.warnings.length === 0) {
        return interaction.reply({ content: lang.Unwarn.NoWarnings, flags: MessageFlags.Ephemeral });
    }

    if (warningId < 1 || warningId > userData.warnings.length) {
        return interaction.reply({ content: lang.Unwarn.InvalidWarningID, flags: MessageFlags.Ephemeral });
    }

    const removedWarning = userData.warnings.splice(warningId - 1, 1)[0];
    await userData.save();

    interaction.reply({
        content: lang.Unwarn.WarningRemoved.replace('{userTag}', user.tag).replace('{reason}', removedWarning.reason),
        flags: MessageFlags.Ephemeral
    });

    const modLogChannel = interaction.guild.channels.cache.get(config.ModLogsChannelID);
    if (modLogChannel) {
        const logEmbed = new EmbedBuilder()
            .setTitle('Warning Removed')
            .setDescription(`A warning was removed from ${user.tag} (\`${user.id}\`).\n\n**Reason for Removal:** ${removedWarning.reason}`)
            .setColor('#FFA500')
            .setTimestamp();
        modLogChannel.send({ embeds: [logEmbed] });
    }
}

async function warnMember(member, reason, interaction) {
    const currentTime = moment().tz(config.Timezone);
    const embedData = lang.WarnLogs.Embed;

    let embed = new EmbedBuilder()
        .setColor(embedData.Color || "#FFA500");

    const placeholders = {
        user: `<@${member.id}>`,
        userName: member.user.username,
        userTag: member.user.tag,
        userId: member.id,
        moderator: `<@${interaction.user.id}>`,
        moderatorName: interaction.user.username,
        moderatorTag: interaction.user.tag,
        moderatorId: interaction.user.id,
        reason: reason,
        shorttime: currentTime.format("HH:mm"),
        longtime: currentTime.format('MMMM Do YYYY')
    };

    if (embedData.Title) {
        embed.setTitle(replacePlaceholders(embedData.Title, placeholders));
    }

    if (embedData.Description.length > 0) {
        embed.setDescription(
            embedData.Description.map(line =>
                replacePlaceholders(line, placeholders)
            ).join('\n')
        );
    }

    if (embedData.Footer && embedData.Footer.Text) {
        embed.setFooter({ text: replacePlaceholders(embedData.Footer.Text, placeholders), iconURL: embedData.Footer.Icon || undefined });
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

    try {
        await member.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending DM to user:', error);
    }

    if (config.WarnLogs.Enabled) {
        logWarning(interaction, member, reason, currentTime);
    }

    await applyPunishment(member, interaction);
}

async function logWarning(interaction, member, reason, currentTime) {
    const embedData = lang.WarnLogs.Embed;

    let logEmbed = new EmbedBuilder()
        .setColor(embedData.Color || "#FFA500");

    const placeholders = {
        user: `<@${member.id}>`,
        userName: member.user.username,
        userTag: member.user.tag,
        userId: member.id,
        moderator: `<@${interaction.user.id}>`,
        moderatorName: interaction.user.username,
        moderatorTag: interaction.user.tag,
        moderatorId: interaction.user.id,
        reason: reason,
        shorttime: currentTime.format("HH:mm"),
        longtime: currentTime.format('MMMM Do YYYY')
    };

    if (embedData.Title) {
        logEmbed.setTitle(replacePlaceholders(embedData.Title, placeholders));
    }

    if (embedData.Description.length > 0) {
        logEmbed.setDescription(
            embedData.Description.map(line =>
                replacePlaceholders(line, placeholders)
            ).join('\n')
        );
    }

    if (embedData.Footer && embedData.Footer.Text) {
        logEmbed.setFooter({ text: replacePlaceholders(embedData.Footer.Text, placeholders), iconURL: embedData.Footer.Icon || undefined });
    }

    if (embedData.Author && embedData.Author.Text) {
        logEmbed.setAuthor({ name: embedData.Author.Text, iconURL: embedData.Author.Icon || undefined });
    }

    if (embedData.Thumbnail) {
        logEmbed.setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }));
    }

    if (embedData.Image) {
        logEmbed.setImage(embedData.Image);
    }

    const logsChannel = interaction.guild.channels.cache.get(config.WarnLogs.LogsChannelID);
    if (logsChannel) {
        logsChannel.send({ embeds: [logEmbed] });
    }
}

async function updateWarningCount(member, reason, interaction) {
    const newWarning = {
        reason: reason,
        date: new Date(),
        moderatorId: interaction.user.id
    };

    const updatedUser = await UserData.findOneAndUpdate(
        { userId: member.id, guildId: interaction.guild.id },
        { $push: { warnings: newWarning }, $inc: { warns: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return updatedUser;
}

async function applyPunishment(member, interaction) {
    const userData = await UserData.findOne({ userId: member.id, guildId: interaction.guild.id });
    const warningCount = userData.warnings.length;

    if (config.Warnings.Punishments[warningCount] && config.Warnings.Punishments[warningCount].Timeout) {
        const timeoutDurationStr = config.Warnings.Punishments[warningCount].Timeout;

        if (timeoutDurationStr) {
            const durationMs = parseDuration(timeoutDurationStr);

            if (durationMs) {
                try {
                    if (durationMs <= 28 * 24 * 60 * 60 * 1000) {
                        await member.timeout(durationMs, `Reached ${warningCount} warnings.`);
                        await interaction.followUp({ content: `User ${member.user.tag} has been timed out for ${timeoutDurationStr} due to reaching ${warningCount} warnings.` });
                    } else {
                        await applyMutedRole(interaction, member, `Reached ${warningCount} warnings.`);
                    }
                } catch (error) {
                    console.error(`Error applying timeout to user ${member.user.tag}:`, error);
                    await interaction.followUp({ content: `Failed to apply timeout to ${member.user.tag}.`, flags: MessageFlags.Ephemeral });
                }
            } else {
                console.error(`Invalid duration format for punishment: ${timeoutDurationStr}`);
            }
        }
    }
}

async function executeKick(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requiredRoles = config.ModerationRoles.kick;
    const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        return interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) {
        return interaction.editReply({ content: lang.Kick.UserNotFoundInGuild });
    }

    if (user.id === interaction.user.id) {
        return interaction.editReply({ content: lang.Kick.CannotKickSelf });
    }

    if (!member.kickable || member.roles.highest.comparePositionTo(interaction.member.roles.highest) >= 0) {
        return interaction.editReply({ content: lang.Kick.CannotKickUser });
    }

    const dmSuccess = await sendKickDM(member, reason, interaction.user, interaction.guild).catch(error => {
        return false;
    });

    try {
        await member.kick(reason);

        const placeholders = {
            user: `<@${member.id}>`,
            userName: member.user.username,
            userTag: member.user.tag,
            userId: member.id,
            moderator: `<@${interaction.user.id}>`,
            moderatorName: interaction.user.username,
            moderatorTag: interaction.user.tag,
            moderatorId: interaction.user.id,
            reason: reason,
            shorttime: moment().tz(config.Timezone).format("HH:mm"),
            longtime: moment().tz(config.Timezone).format('MMMM Do YYYY')
        };

        let replyContent = replacePlaceholders(lang.Kick.KickSuccess, placeholders);
        if (!dmSuccess) {
            replyContent += "\nNote: Unable to send DM to user.";
        }

        kickLogCache.set(member.id, {
            moderator: interaction.user,
            reason,
            timestamp: Date.now()
        });

        setTimeout(() => {
            kickLogCache.delete(member.id);
        }, 10000);

        return interaction.editReply({ content: replyContent, flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Kick execution failed:', error);
        return interaction.editReply({ content: lang.Kick.KickError });
    }
}

module.exports.kickLogCache = kickLogCache;

async function sendKickDM(member, reason, moderator, guild) {
    if (!member || !interaction || guild == null) {
        return false;
    }

    try {
        if (config.KickLogs.DM.Enabled) {
            const dmEmbedConfig = config.KickLogs.DM.Embed;
            const currentTime = moment().tz(config.Timezone);
            const placeholders = {
                user: `<@${member.user.id}>`,
                userName: member.user.username,
                userTag: member.user.tag,
                userId: member.user.id,
                moderator: `<@${moderator.id}> (${moderator.tag})`,
                reason,
                guildName: guild.name,
                longtime: currentTime.format('MMMM Do YYYY'),
                shorttime: currentTime.format("HH:mm")
            };

            const color = dmEmbedConfig.Color ? parseInt(dmEmbedConfig.Color.replace('#', ''), 16) : 0xFF5555;
            const dmMessageEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(replacePlaceholders(dmEmbedConfig.Title, placeholders))
                .setDescription(dmEmbedConfig.Description.map(line => replacePlaceholders(line, placeholders)).join('\n'))
                .setFooter({ text: replacePlaceholders(dmEmbedConfig.Footer, placeholders) });

            await member.send({ embeds: [dmMessageEmbed] });
            return true;
        }
    } catch (error) {
        if (error.code === 50007) {
            return false;
        } else {
            throw error;
        }
    }
    return false;
}

async function executeNickname(interaction) {
    await interaction.deferReply;

    const requiredRoles = config.ModerationRoles.nickname;
    const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        return interaction.editReply({ content: lang.Nickname.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('user');
    const nickname = interaction.options.getString('nickname');
    const member = interaction.guild.members.cache.get(user.id);

    if (!member) {
        return interaction.editReply({ content: lang.Nickname.UserNotFound, flags: MessageFlags.Ephemeral });
    }

    try {
        await member.setNickname(nickname);
        return interaction.editReply({
            content: lang.Nickname.NicknameChangeSuccess.replace('{user}', user.username).replace('{nickname}', nickname),
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Failed to set nickname:', error);
        return interaction.editReply({ content: lang.Nickname.NicknameChangeFailure, flags: MessageFlags.Ephemeral });
    }
}

async function executeClearHistory(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requiredRoles = config.ModerationRoles.clearhistory;
    const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        return interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('user');
    await clearUserHistory(user.id, interaction.guild.id);

    const successMessage = lang.ClearhistorySuccess.replace(/{user}/g, user.tag);
    const successEmbed = new EmbedBuilder()
        .setAuthor({ name: lang.SuccessEmbedTitle, iconURL: 'https://i.imgur.com/7SlmRRa.png' })
        .setColor(config.SuccessEmbedColor)
        .setDescription(successMessage);

    interaction.editReply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
}

async function clearUserHistory(userId, guildId) {
    await UserData.findOneAndUpdate(
        { userId: userId, guildId: guildId },
        { $set: { warns: 0, bans: 0, kicks: 0, timeouts: 0, note: "", warnings: [] } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

async function executeClearChannel(interaction) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const requiredRoles = config.ModerationRoles.clearchannel;
        const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
        const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!hasPermission && !isAdministrator) {
            return interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirmClear')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancelClear')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ content: lang.ClearChannel.ClearChannelPrompt, components: [row], flags: MessageFlags.Ephemeral });

        const filter = (i) => i.customId === 'confirmClear' || i.customId === 'cancelClear';
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.customId === 'confirmClear') {
                const position = interaction.channel.position;
                const newChannel = await interaction.channel.clone();
                await interaction.channel.delete();
                newChannel.setPosition(position);

                try {
                    await newChannel.send(lang.ClearChannel.ClearChannelCleared.replace('{user}', interaction.member));
                    await newChannel.send(lang.ClearChannel.ClearChannelGif);
                } catch (error) {
                    console.error('Error sending messages after channel clear:', error);
                }
            } else {
                await interaction.editReply({ content: lang.ClearChannel.CancelClear, components: [] });
            }
        });

        collector.on('end', async collected => {
            if (!collected.size) {
                await interaction.editReply({ content: lang.ClearChannel.ClearTimeout, components: [] });
            }
        });
    } catch (error) {
        console.error(`An error occurred while executing the clearchannel command: ${error.message}`);
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: 'There was an error trying to execute that command! Please try again later.', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: 'There was an error trying to execute that command! Please try again later.', flags: MessageFlags.Ephemeral });
        }
    }
}

async function executeHistory(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requiredRoles = config.ModerationRoles.history;
    const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        return interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('user');
    const userData = await getUserHistory(user.id);

    const historyEmbed = createHistoryEmbed(user, userData, interaction);
    interaction.editReply({ embeds: [historyEmbed], flags: MessageFlags.Ephemeral });
}

async function getUserHistory(userId) {
    const userData = await UserData.findOne({ userId: userId });
    return userData || {};
}

function createHistoryEmbed(user, userData, interaction) {
    const avatarUrl = user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
    const member = interaction.guild.members.cache.get(user.id);
    const joinDate = member ? moment(member.joinedAt).format('DD/MM/YYYY') : 'Not in server';

    return new EmbedBuilder()
        .setColor("#000000")
        .setTitle(lang.History.HistoryEmbedTitle.replace(/{user-tag}/g, user.username))
        .setThumbnail(avatarUrl)
        .addFields(
            { name: lang.History.HistoryEmbedUserInfo, value: `\`\`${lang.History.HistoryEmbedName}\`\` <@!${user.id}>\n\`\`${lang.History.HistoryEmbedJoinedServer}\`\` ${joinDate}\n\`\`${lang.History.HistoryTotalMessages}\`\` ${userData.totalMessages?.toLocaleString() || '0'}\n\`\`${lang.History.HistoryEmbedNote}\`\` ${userData.note || 'None'}`, inline: true },
            { name: lang.History.HistoryEmbedWarnings, value: `${userData.warns || 0}`, inline: true },
            { name: lang.History.HistoryEmbedTimeouts, value: `${userData.timeouts || 0}`, inline: true },
            { name: lang.History.HistoryEmbedKicks, value: `${userData.kicks || 0}`, inline: true },
            { name: lang.History.HistoryEmbedBans, value: `${userData.bans || 0}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: interaction.guild.name });
}

async function executePurge(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requiredRoles = config.ModerationRoles.purge;
    const hasPermission = requiredRoles.some(roleId =>
        interaction.member.roles.cache.has(roleId)
    );
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        return interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    let amount = interaction.options.getNumber('amount');
    const type = interaction.options.getString('type') || 'all';

    try {
        let remainingMessages = amount;
        let totalDeleted = 0;

        while (remainingMessages > 0) {
            const batchSize = Math.min(remainingMessages, 100);
            const deletedCount = await purgeBatch(interaction.channel, batchSize, type);
            
            if (deletedCount === 0) break;

            totalDeleted += deletedCount;
            remainingMessages -= deletedCount;

            if (deletedCount < batchSize) break;

            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        const logEmbed = createLogEmbed(interaction, totalDeleted, type);
        await sendLogMessage(interaction, logEmbed);

        await interaction.editReply({
            content: lang.Purge.PurgeCleared.replace(/{amount}/g, `${totalDeleted}`),
            flags: MessageFlags.Ephemeral,
        });
    } catch (error) {
        console.error('Purge Error:', error);
        await interaction.editReply({ content: lang.Purge.PurgeOld, flags: MessageFlags.Ephemeral });
    }
}

async function purgeBatch(channel, amount, type) {
    const messages = await channel.messages.fetch({ limit: 100 });
    let filteredMessages = filterMessages(messages, type, amount);

    filteredMessages = Array.isArray(filteredMessages) ? filteredMessages : [...filteredMessages.values()];

    if (filteredMessages.length === 0) return 0;

    const deletedMessages = await channel.bulkDelete(filteredMessages, true);
    return deletedMessages.size;
}

function filterMessages(messages, type, limit) {
    const filtered = messages.filter(msg => {
        switch (type) {
            case 'links':
                return msg.content.includes('http');
            case 'text':
                return !msg.embeds.length && !msg.attachments.size;
            case 'bots':
                return msg.author.bot;
            case 'embeds':
                return msg.embeds.length > 0;
            case 'images':
                return msg.attachments.some(att => att.contentType?.startsWith('image/'));
            default:
                return true;
        }
    });

    return [...filtered.values()].slice(0, limit);
}

function createLogEmbed(interaction, amount, type) {
    return new EmbedBuilder()
        .setAuthor({ name: lang.Purge.ModerationEmbedTitle, iconURL: 'https://i.imgur.com/FxQkyLb.png' })
        .setColor('Red')
        .addFields(
            { name: 'Moderation Action', value: 'Purge' },
            { name: 'Purged Type', value: type },
            { name: 'Staff', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Amount', value: `${amount}`, inline: true },
            { name: 'Channel', value: `${interaction.channel}`, inline: true },
        )
        .setTimestamp();
}

async function sendLogMessage(interaction, logEmbed) {
    const logsChannelId = config.PurgeLogChannel;
    const logsChannel = interaction.guild.channels.cache.get(logsChannelId);
    if (logsChannel) {
        await logsChannel.send({ embeds: [logEmbed] });
    }
}

async function executeSlowmode(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requiredRoles = config.ModerationRoles.slowmode;
    const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        return interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    let amount = interaction.options.getNumber("amount");
    amount = Math.max(0, Math.min(amount, 21600));

    try {
        await interaction.channel.setRateLimitPerUser(amount);
        const responseMessage = amount === 0 ? lang.SlowmodeReset : lang.SlowmodeSuccess.replace(/{time}/g, `${amount}`);
        const successEmbed = createResponseEmbed(responseMessage, true);
        await interaction.editReply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Slowmode Error:', error);
        const errorEmbed = createResponseEmbed(lang.SlowmodeFailed, false);
        await interaction.editReply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

function createResponseEmbed(message, isSuccess) {
    return new EmbedBuilder()
        .setAuthor({ name: isSuccess ? lang.SuccessEmbedTitle : lang.ErrorEmbedTitle, iconURL: isSuccess ? 'https://i.imgur.com/7SlmRRa.png' : 'https://i.imgur.com/MdiCK2c.png' })
        .setColor(isSuccess ? config.SuccessEmbedColor : config.ErrorEmbedColor)
        .setDescription(message);
}

async function executeTempban(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requiredRoles = config.ModerationRoles.tempban;
    const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        await interaction.editReply({ content: lang.TempBan.NoPermsMessage, flags: MessageFlags.Ephemeral });
        return;
    }

    const userOption = interaction.options.getUser('user');
    const userIdOption = interaction.options.getString('userid');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    let user = userOption;
    if (!user && userIdOption) {
        user = await interaction.client.users.fetch(userIdOption).catch(() => null);
    }

    if (!user) {
        await interaction.editReply({ content: lang.TempBan.UserNotFound, flags: MessageFlags.Ephemeral });
        return;
    }

    const totalSeconds = parseDuration(durationStr);
    if (totalSeconds === null) {
        await interaction.editReply({ content: lang.TempBan.InvalidDuration, flags: MessageFlags.Ephemeral });
        return;
    }

    const banEndTime = moment().add(totalSeconds, 'seconds').toDate();

    try {
        const member = await interaction.guild.members.fetch(user.id);

        if (!member.bannable) {
            await interaction.editReply({ content: lang.TempBan.CantBanUser, flags: MessageFlags.Ephemeral });
            return;
        }

        const dmSuccess = await sendBanDM(member, reason, interaction);
        await member.ban({ reason });

        let userData = await UserData.findOne({ userId: user.id, guildId: interaction.guild.id });
        if (!userData) {
            userData = new UserData({ userId: user.id, guildId: interaction.guild.id });
        }

        userData.tempBans.push({
            endTime: banEndTime,
            reason,
            moderatorId: interaction.user.id,
        });

        await userData.save();

        let replyContent = lang.TempBan.Success.replace('{userTag}', user.tag)
            .replace('{duration}', durationStr)
            .replace('{reason}', reason);

        if (!dmSuccess) {
            replyContent += "\nNote: Unable to send DM to user.";
        }

        await interaction.editReply({ content: replyContent, flags: MessageFlags.Ephemeral });

    } catch (error) {
        console.error("TempBan Error:", error);
        await interaction.editReply({ content: lang.TempBan.Error, flags: MessageFlags.Ephemeral });
    }
}

async function executeTemprole(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requiredRoles = config.ModerationRoles.temprole || [];
    const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        return interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const moderatorHighestRolePosition = interaction.member.roles.highest.position;
    const targetRolePosition = role.position;

    if (targetRolePosition >= moderatorHighestRolePosition) {
        return interaction.editReply({ content: lang.Temprole.SameOrHigherRoleError, flags: MessageFlags.Ephemeral });
    }

    if (!role || role.id === interaction.guild.id) {
        return interaction.editReply({ content: lang.Temprole.UnknownRoleError, flags: MessageFlags.Ephemeral });
    }

    const durationStr = interaction.options.getString('duration');
    const durationMs = parseDurationTemprole(durationStr);

    if (durationMs <= 0) {
        return interaction.editReply({ content: lang.Temprole.InvalidDurationFormat, flags: MessageFlags.Ephemeral });
    }

    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + durationMs);

    try {
        const member = await interaction.guild.members.fetch(user.id);
        await member.roles.add(role);
        await TempRole.create({
            userId: user.id,
            guildId: interaction.guild.id,
            roleId: role.id,
            expiration: expirationDate,
        });
        const confirmationMessage = lang.Temprole.RoleAssigned
            .replace('{role}', role.name)
            .replace('{user}', user.username)
            .replace('{duration}', durationStr);

        await interaction.editReply({ content: confirmationMessage, flags: MessageFlags.Ephemeral });
    } catch (error) {
        if (error.code === 50013) {
            await interaction.editReply({ content: lang.Temprole.MissingPermissionsError, flags: MessageFlags.Ephemeral });
        } else {
            console.error('Error in executeTemprole:', error);
            await interaction.editReply({ content: lang.Temprole.ErrorAssigningRole, flags: MessageFlags.Ephemeral });
        }
    }
}

function parseDurationTemprole(durationStr) {
    const regex = /(\d+)(w|d|h|m|s|y)/g;
    let totalMilliseconds = 0;
    const timeUnits = {
        w: 604800000,
        d: 86400000,
        h: 3600000,
        m: 60000,
        s: 1000,
        y: 31536000000,
    };

    let match;
    while ((match = regex.exec(durationStr)) !== null) {
        const value = parseInt(match[1], 10);
        const unit = match[2];
        totalMilliseconds += value * (timeUnits[unit] || 0);
    }

    return totalMilliseconds;
}

function replacePlaceholders(text, placeholders) {
    return (text || '')
        .replace(/{user}/g, placeholders.user || '')
        .replace(/{userName}/g, placeholders.userName || '')
        .replace(/{userTag}/g, placeholders.userTag || '')
        .replace(/{userId}/g, placeholders.userId || '')
        .replace(/{moderator}/g, placeholders.moderator || '')
        .replace(/{guildName}/g, placeholders.guildName || '')
        .replace(/{moderatorName}/g, placeholders.moderatorName || '')
        .replace(/{moderatorTag}/g, placeholders.moderatorTag || '')
        .replace(/{moderatorId}/g, placeholders.moderatorId || '')
        .replace(/{reason}/g, placeholders.reason || 'No reason provided')
        .replace(/{shorttime}/g, placeholders.shorttime || '')
        .replace(/{longtime}/g, placeholders.longtime || '')
        .replace(/{caseNumber}/g, placeholders.caseNumber || '');
}

async function sendBanDM(member, reason, interaction, guild) {
    if (!member || !interaction || guild == null) {
        return false;
    }

    try {
        if (config.BanLogs.DM.Enabled) {
            const dmEmbedConfig = config.BanLogs.DM.Embed;
            const currentTime = moment().tz(config.Timezone);

            const placeholders = {
                user: `<@${member.user.id}>`,
                userName: member.user.username,
                userTag: member.user.tag,
                userId: member.user.id,
                moderator: `<@${interaction.user.id}> (${interaction.user.tag})`,
                reason,
                guildName: guild.name,
                longtime: currentTime.format('MMMM Do YYYY'),
                shorttime: currentTime.format("HH:mm")
            };

            const color = dmEmbedConfig.Color ? parseInt(dmEmbedConfig.Color.replace('#', ''), 16) : 0xFF5555;

            const dmMessageEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(replacePlaceholders(dmEmbedConfig.Title, placeholders))
                .setDescription(dmEmbedConfig.Description.map(line => replacePlaceholders(line, placeholders)).join('\n'))
                .setFooter({ text: replacePlaceholders(dmEmbedConfig.Footer, placeholders) });

            await member.send({ embeds: [dmMessageEmbed] });
            return true;
        }
    } catch (error) {
        console.error('SendBanDM Error:', error);
        return false;
    }
}

async function banMember(member, reason, interaction) {
    await member.ban({ reason: reason });
}

async function unbanUser(interaction, userId, reason) {
    const bans = await interaction.guild.bans.fetch();
    if (!bans.has(userId)) {
        await interaction.editReply({ content: lang.Unban.UnbanUserNotBanned, flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.guild.members.unban(userId, reason);
    const successMessage = lang.Unban.UnbanMsg.replace(/{user}/g, `<@!${userId}>`);
    await interaction.editReply({ content: successMessage, flags: MessageFlags.Ephemeral });

    const logsChannel = interaction.guild.channels.cache.get(config.UnbanLogs.LogsChannelID);
    if (logsChannel && config.UnbanLogs.Enabled) {

    }
}

function hasPermissionToUnban(interaction) {
    const requiredRoles = config.ModerationRoles.unban;
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    return requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId)) || isAdministrator;
}

async function executeViewNote(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requiredRoles = config.ModerationRoles.viewnote;
    const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        return interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('user');

    try {
        const userData = await UserData.findOne({ userId: user.id, guildId: interaction.guild.id });
        
        const noteEmbed = new EmbedBuilder()
            .setAuthor({ name: `Note for ${user.tag}`, iconURL: user.displayAvatarURL() })
            .setColor(config.SuccessEmbedColor)
            .setDescription(userData?.note || 'No note set for this user.')
            .setTimestamp();

        await interaction.editReply({ embeds: [noteEmbed], flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Error viewing note:', error);
        await interaction.editReply({ content: 'There was an error viewing the note.', flags: MessageFlags.Ephemeral });
    }
}

async function executeTemproleList(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const requiredRoles = config.ModerationRoles.temprole || [];
    const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
    const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission && !isAdministrator) {
        return interaction.editReply({ content: lang.NoPermsMessage, flags: MessageFlags.Ephemeral });
    }

    const filterUser = interaction.options.getUser('user');
    const query = { guildId: interaction.guild.id };
    if (filterUser) {
        query.userId = filterUser.id;
    }

    try {
        const tempRoles = await TempRole.find(query).sort({ expiration: 1 });
        if (tempRoles.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setDescription(filterUser ? 
                    `No active role assignments for ${filterUser}` : 
                    'No active role assignments in this server')
                .setFooter({ text: interaction.guild.name });

            return interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
            .setColor(0x2F3136)
            .setTitle(filterUser ? 
                `Role Assignments for ${filterUser.tag}` : 
                'Active Role Assignments')
            .setFooter({ text: `${interaction.guild.name} • ${tempRoles.length} Assignment${tempRoles.length !== 1 ? 's' : ''}` });

        const descriptions = [];
        for (const tempRole of tempRoles) {
            const user = await interaction.client.users.fetch(tempRole.userId);
            const role = interaction.guild.roles.cache.get(tempRole.roleId);
            if (user && role) {
                const expirationTime = Math.floor(tempRole.expiration.getTime() / 1000);
                descriptions.push(
                    `${role} • ${user}\n` +
                    `Expires <t:${expirationTime}:R>\n`
                );
            }
        }

        if (descriptions.length > 0) {
            const chunks = [];
            let currentChunk = [];
            let currentLength = 0;

            for (const desc of descriptions) {
                if (currentLength + desc.length > 3800) {
                    chunks.push(currentChunk);
                    currentChunk = [];
                    currentLength = 0;
                }
                currentChunk.push(desc);
                currentLength += desc.length;
            }
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
            }

            if (chunks.length === 1) {
                embed.setDescription(chunks[0].join('\n'));
                await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } else {
                const embeds = chunks.map((chunk, index) => {
                    const pageEmbed = EmbedBuilder.from(embed)
                        .setDescription(chunk.join('\n'))
                        .setFooter({ text: `Page ${index + 1}/${chunks.length} • ${interaction.guild.name} • ${tempRoles.length} Assignment${tempRoles.length !== 1 ? 's' : ''}` });
                    return pageEmbed;
                });

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev_page')
                            .setLabel('◀')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('next_page')
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(embeds.length === 1)
                    );

                const initialMessage = await interaction.editReply({
                    embeds: [embeds[0]],
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });

                let currentPage = 0;
                const collector = initialMessage.createMessageComponentCollector({
                    time: 300000
                });

                collector.on('collect', async (i) => {
                    if (i.user.id !== interaction.user.id) {
                        return i.reply({ content: 'You cannot interact with these buttons.', flags: MessageFlags.Ephemeral });
                    }

                    if (i.customId === 'prev_page' && currentPage > 0) {
                        currentPage--;
                    } else if (i.customId === 'next_page' && currentPage < embeds.length - 1) {
                        currentPage++;
                    }

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev_page')
                                .setLabel('◀')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(currentPage === 0),
                            new ButtonBuilder()
                                .setCustomId('next_page')
                                .setLabel('▶')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(currentPage === embeds.length - 1)
                        );

                    await i.update({
                        embeds: [embeds[currentPage]],
                        components: [row]
                    });
                });

                collector.on('end', () => {
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev_page')
                                .setLabel('◀')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('next_page')
                                .setLabel('▶')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        );

                    initialMessage.edit({ components: [disabledRow] });
                });
            }
        }
    } catch (error) {
        console.error('Error listing temporary roles:', error);
        await interaction.editReply({ content: 'An error occurred while fetching temporary roles.', flags: MessageFlags.Ephemeral });
    }
}