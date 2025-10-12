/*
  _____            _           ____        _   
 |  __ \          | |         |  _ \      | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                             
                                        
 Thank you for choosing Drako Bot!

 Should you encounter any issues, require assistance, or have suggestions for improving the bot,
 we invite you to connect with us on our Discord server and create a support ticket: 

 http://discord.drakodevelopment.net
 
*/

const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags, PermissionsBitField, StringSelectMenuBuilder } = require('discord.js');
//const fs = require('fs');
//const path = require('path');
const moment = require('moment');
const Ticket = require('../../../models/tickets');
const Blacklist = require('../../../models/blacklist');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');

const { handleTicketClose } = require('../../../events/interactionCreate');

const config = getConfig();
const lang = getLang();

const channelRenameQueue = new Map();
const RENAME_COOLDOWN = 60000;
const MAX_RETRIES = 5;
let lastRenameTime = 0;
let isProcessing = false;

const priorityChangeCooldowns = new Map();
const PRIORITY_CHANGE_COOLDOWN = 5000;

const PRIORITY_COLORS = {
    'High': '#ff0000',
    'Medium': '#ffff00',
    'Low': '#00ff00'
};

async function processRenameQueue() {
    if (isProcessing) {
        return;
    }
    
    isProcessing = true;

    try {
        const entries = Array.from(channelRenameQueue.entries());
        for (const [channelId, data] of entries) {
            const now = Date.now();
            
            if (now - lastRenameTime < RENAME_COOLDOWN) {
                continue;
            }

            try {
                const freshChannel = await data.channel.guild.channels.fetch(channelId);
                
                const updateData = { name: data.name.toLowerCase() };
                
                if (data.ticket && data.ticketType && data.ticketType.ChannelTopic) {
                    const topic = data.ticketType.ChannelTopic
                        .replace('{ticketType}', data.ticketType.Name)
                        .replace('{userid}', `<@${data.ticket.userId}>`)
                        .replace('{user}', `<@${data.ticket.userId}>`)
                        .replace('{ticket-id}', data.ticket.ticketId)
                        .replace('{priority}', data.ticket.priority)
                        .replace('{created-at}', moment(data.ticket.createdAt).format('MMMM Do YYYY, h:mm:ss a'))
                        .replace('{category}', freshChannel.parent?.name || 'None');
                    
                    updateData.topic = topic;
                }

                let updatedChannel = null;
                let retryCount = 0;
                const maxRetries = 3;

                while (retryCount < maxRetries) {
                    try {
                        updatedChannel = await freshChannel.edit(updateData, 'Ticket priority update');
                        break;
                    } catch (retryError) {
                        console.error(`Retry ${retryCount + 1} failed:`, retryError);
                        retryCount++;
                        if (retryCount < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }

                if (!updatedChannel) {
                    throw new Error('Failed to update channel after retries');
                }

                if (updatedChannel.name === updateData.name) {
                    lastRenameTime = now;
                    channelRenameQueue.delete(channelId);
                } else {
                    throw new Error('Channel name did not update as expected');
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error updating channel ${channelId}:`, error);
                
                if (error.message.includes('rate limit')) {
                    data.queuedAt = now;
                    data.retries = (data.retries || 0) + 1;
                    
                    if (data.retries > MAX_RETRIES) {
                        channelRenameQueue.delete(channelId);
                    }
                } else {
                    channelRenameQueue.delete(channelId);
                }
            }
        }
    } finally {
        isProcessing = false;
    }
}

async function queueChannelRename(channel, newName, ticket = null, ticketType = null) {
    const now = Date.now();

    if (now - lastRenameTime >= RENAME_COOLDOWN && !isProcessing) {
        try {
            
            const freshChannel = await channel.guild.channels.fetch(channel.id);
            
            const updateData = { name: newName.toLowerCase() };
            
            if (ticket && ticketType && ticketType.ChannelTopic) {
                const topic = ticketType.ChannelTopic
                    .replace('{ticketType}', ticketType.Name)
                    .replace('{userid}', `<@${ticket.userId}>`)
                    .replace('{user}', `<@${ticket.userId}>`)
                    .replace('{ticket-id}', ticket.ticketId)
                    .replace('{priority}', ticket.priority)
                    .replace('{created-at}', moment(ticket.createdAt).format('MMMM Do YYYY, h:mm:ss a'))
                    .replace('{category}', freshChannel.parent?.name || 'None');
                
                updateData.topic = topic;
            }

            let updatedChannel = null;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    updatedChannel = await freshChannel.edit(updateData, 'Ticket priority update');
                    break;
                } catch (retryError) {
                    console.error(`Retry ${retryCount + 1} failed:`, retryError);
                    retryCount++;
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            if (!updatedChannel) {
                throw new Error('Failed to update channel after retries');
            }


            if (updatedChannel.name === updateData.name) {
                lastRenameTime = now;
                return true;
            } else {
                throw new Error('Channel name did not update as expected');
            }
        } catch (error) {
            console.error('Error during immediate channel update:', error);
            if (error.message.includes('rate limit')) {
            } else {
                console.error('Unexpected error during channel update:', error);
            }

        }
    } else {
    }

    channelRenameQueue.set(channel.id, {
        channel,
        name: newName.toLowerCase(),
        ticket,
        ticketType,
        queuedAt: now,
        retries: 0
    });

    return false;
}

const queueProcessor = setInterval(processRenameQueue, 5000);

process.on('exit', () => {
    clearInterval(queueProcessor);
});

function parseDuration(duration) {
    const timeUnits = {
        s: 1000,
        m: 1000 * 60,
        h: 1000 * 60 * 60,
        d: 1000 * 60 * 60 * 24,
        w: 1000 * 60 * 60 * 24 * 7
    };

    const matches = duration.match(/(\d+\s*[smhdw])/g);
    if (!matches) return 0;

    return matches.reduce((total, match) => {
        const value = parseInt(match.match(/\d+/)[0]);
        const unit = match.match(/[smhdw]/)[0];
        return total + value * timeUnits[unit];
    }, 0);
}

function isValidHttpUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}

// function hasSupportRole(member, roles) {
//     return member.roles.cache.some(role => roles.includes(role.id));
// }

function formatDuration(ms) {
    const duration = moment.duration(ms);
    const days = duration.days();
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

async function getUserPriority(member) {
    const priorityConfig = config.Priority;
    if (!priorityConfig.Enabled) {
        return priorityConfig.DefaultPriority;
    }

    for (const level of Object.keys(priorityConfig.Levels)) {
        const levelConfig = priorityConfig.Levels[level];
        for (const roleId of levelConfig.Roles) {
            if (member.roles.cache.has(roleId)) {
                return level;
            }
        }
    }

    return priorityConfig.DefaultPriority;
}

const replacePlaceholders = (text, workingHours) => {
    if (!text) return '';
    return text
        .replace('{workinghours_start}', workingHours.start)
        .replace('{workinghours_end}', workingHours.end)
        .replace('{workinghours_start_monday}', workingHours.mondayStart)
        .replace('{workinghours_end_monday}', workingHours.mondayEnd)
        .replace('{workinghours_start_tuesday}', workingHours.tuesdayStart)
        .replace('{workinghours_end_tuesday}', workingHours.tuesdayEnd)
        .replace('{workinghours_start_wednesday}', workingHours.wednesdayStart)
        .replace('{workinghours_end_wednesday}', workingHours.wednesdayEnd)
        .replace('{workinghours_start_thursday}', workingHours.thursdayStart)
        .replace('{workinghours_end_thursday}', workingHours.thursdayEnd)
        .replace('{workinghours_start_friday}', workingHours.fridayStart)
        .replace('{workinghours_end_friday}', workingHours.fridayEnd)
        .replace('{workinghours_start_saturday}', workingHours.saturdayStart)
        .replace('{workinghours_end_saturday}', workingHours.saturdayEnd)
        .replace('{workinghours_start_sunday}', workingHours.sundayStart)
        .replace('{workinghours_end_sunday}', workingHours.sundayEnd);
};

async function updateChannelPermissions(channel, newTicketType, userId) {
    try {
        const permissionOverwrites = [
            {
                id: channel.guild.roles.everyone.id,
                deny: ['SendMessages', 'ViewChannel']
            },
            {
                id: userId,
                allow: ['SendMessages', 'ViewChannel', 'AttachFiles', 'EmbedLinks', 'ReadMessageHistory']
            }
        ];

        newTicketType.SupportRole.forEach(roleId => {
            const role = channel.guild.roles.cache.get(roleId);
            if (role) {
                permissionOverwrites.push({
                    id: role.id,
                    allow: ['SendMessages', 'ViewChannel', 'AttachFiles', 'EmbedLinks', 'ReadMessageHistory']
                });
            }
        });

        await channel.permissionOverwrites.set(permissionOverwrites);
    } catch (error) {
        console.error('Error updating channel permissions:', error);
        throw new Error('Failed to update channel permissions');
    }
}

async function moveChannel(channel, newCategoryId) {
    try {
        await channel.setParent(newCategoryId, { lockPermissions: false });
    } catch (error) {
        console.error('Error moving channel:', error);
        throw new Error('Failed to move channel');
    }
}

async function renameChannel(channel, newName) {
    try {
        await channel.setName(newName);
    } catch (error) {
        console.error('Error renaming channel:', error);
        throw new Error('Failed to rename channel');
    }
}

async function handlePriorityChange(interaction, ticket, newPriority) {
    const now = Date.now();
    const channel = interaction.channel;
    const ticketType = config.TicketTypes[ticket.ticketType];
    const oldPriority = ticket.priority;

    if (!interaction.member.roles.cache.some(role => ticketType.SupportRole.includes(role.id))) {
        throw new Error('NO_PERMISSION');
    }

    const lastChange = priorityChangeCooldowns.get(ticket.channelId);
    if (lastChange && now - lastChange < PRIORITY_CHANGE_COOLDOWN) {
        const remainingTime = Math.ceil((PRIORITY_CHANGE_COOLDOWN - (now - lastChange)) / 1000);
        throw new Error(`COOLDOWN:${remainingTime}`);
    }

    ticket.priority = newPriority;
    await ticket.save();
    priorityChangeCooldowns.set(ticket.channelId, now);

    const member = await interaction.guild.members.fetch(ticket.userId);
    const newName = ticketType.ChannelName
        .replace('{ticket-id}', ticket.ticketId)
        .replace('{user}', member?.user.username || 'unknown')
        .replace('{priority}', newPriority);

    const willBeQueued = now - lastRenameTime < RENAME_COOLDOWN || channelRenameQueue.size > 0;
    const description = `Ticket priority has been changed from **${oldPriority}** to **${newPriority}** by <@${interaction.user.id}>` +
        (willBeQueued ? '\n\n⏳ This action has been queued, it can take up to 1 minute.' : '');

    const responseEmbed = new EmbedBuilder()
        .setColor(PRIORITY_COLORS[newPriority])
        .setDescription(description);

    await interaction.reply({ embeds: [responseEmbed], flags: MessageFlags.Ephemeral });

    await queueChannelRename(channel, newName, ticket, ticketType);

    if (config.Priority.Levels[newPriority]?.MoveTop) {
        const category = channel.parent;
        if (category) {
            const firstPosition = category.children.cache
                .filter(ch => ch.id !== channel.id)
                .first()?.position || 0;
            await channel.setPosition(firstPosition);
        }
    }

    const notificationEmbed = new EmbedBuilder()
        .setColor(PRIORITY_COLORS[newPriority])
        .setDescription(`🔄 **Priority Update**\n\nPriority changed from **${oldPriority}** to **${newPriority}**\nUpdated by: <@${interaction.user.id}>`);

    await channel.send({ embeds: [notificationEmbed] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('Various ticket commands for managing tickets')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to the ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to add to the ticket')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('alert')
                .setDescription('Send an alert about pending ticket closure.')
                .addStringOption(option => 
                    option
                        .setName('reason')
                        .setDescription('Reason for the alert')
                        .setRequired(false)
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('blacklist')
                .setDescription('Manage the blacklist')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Blacklist a user from opening tickets')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('The user to blacklist')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName('reason')
                                .setDescription('Reason for blacklisting')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('view')
                        .setDescription('View the blacklist reason for a user')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('The user to check')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove a user from the blacklist')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('The user to remove from the blacklist')
                                .setRequired(true)
                        )
                )
        )
        .addSubcommand(subcommand => {
            const closeCommand = subcommand
                .setName('close')
                .setDescription('Close the current ticket')
                .addBooleanOption(option =>
                    option
                        .setName('silent')
                        .setDescription('Silently close and delete the ticket without triggering any events')
                        .setRequired(false)
                );

            if (config.TicketSettings.CloseReasons.Enabled) {
                closeCommand.addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for closing the ticket')
                        .setRequired(false)
                        .addChoices(
                            ...config.TicketSettings.CloseReasons.Reasons.map(reason => ({
                                name: `${reason.emoji} ${reason.name}`,
                                value: reason.value
                            }))
                        )
                );

                if (config.TicketSettings.CloseReasons.AllowCustomReason) {
                    closeCommand.addStringOption(option =>
                        option
                            .setName('custom_reason')
                            .setDescription('Custom reason for closing the ticket')
                            .setRequired(false)
                    );
                }
            }

            return closeCommand;
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Send the ticket panel')
                .addStringOption(option => {
                    option.setName('panel')
                        .setDescription('The panel to display')
                        .setRequired(true);

                    Object.keys(config.TicketPanelSettings).forEach(panel => {
                        option.addChoices({ name: panel, value: panel });
                    });

                    return option;
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from the ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to remove from the ticket')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('rename')
                .setDescription('Rename the ticket channel')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The new name for the ticket channel')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Show general ticket stats')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('transfer')
                .setDescription('Transfer a ticket to a new type')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('The new ticket type')
                        .setRequired(true)
                        .addChoices(
                            ...Object.keys(config.TicketTypes).map(key => ({
                                name: config.TicketTypes[key].Name,
                                value: key
                            }))
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('priority')
                .setDescription('Change the priority of the ticket')
                .addStringOption(option => {
                    const priorityOption = option
                        .setName('priority')
                        .setDescription('The new priority level')
                        .setRequired(true);

                    const priorityEmojis = {
                        'Low': '🟢',
                        'Medium': '🟡',
                        'High': '🔴'
                    };

                    const choices = Object.keys(config.Priority.Levels).map(level => ({
                        name: `${priorityEmojis[level] || ''} ${level} Priority`,
                        value: level
                    }));

                    priorityOption.addChoices(...choices);
                    return priorityOption;
                })
        ),
    category: 'Utility',
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup(false);

        if (subcommand === 'add' && !group) {
            try {
                const userToAdd = interaction.options.getUser('user');
                const ticket = await Ticket.findOne({ channelId: interaction.channel.id });

                if (!ticket) {
                    return interaction.reply({ content: 'This command can only be used within a ticket channel.', flags: MessageFlags.Ephemeral });
                }

                const supportRoles = config.TicketTypes[ticket.ticketType].SupportRole;
                const hasSupportRole = interaction.member.roles.cache.some(role => supportRoles.includes(role.id));

                if (!hasSupportRole) {
                    return interaction.reply({ content: 'You do not have permissions to use this command.', flags: MessageFlags.Ephemeral });
                }

                const channel = interaction.channel;

                const memberPermissions = channel.permissionsFor(userToAdd);
                if (memberPermissions && memberPermissions.has(PermissionsBitField.Flags.ViewChannel, false)) {
                    return interaction.reply({ content: 'User is already added to this ticket.', flags: MessageFlags.Ephemeral });
                }

                await channel.permissionOverwrites.create(userToAdd, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true
                });

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription(`Successfully added ${userToAdd.tag} to the ticket.`);

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

                const notificationEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription(`<@${userToAdd.id}> has been added to the ticket by <@${interaction.user.id}>.`);

                await channel.send({ embeds: [notificationEmbed] });
            } catch (error) {
                console.error('Error adding user to ticket:', error);
                await interaction.reply({ content: 'An error occurred while adding the user to the ticket. Please try again later.', flags: MessageFlags.Ephemeral });
            }

        } else if (subcommand === 'alert' && !group) {
            const supportRoles = config.TicketTypes.TicketType1.SupportRole;
            if (!interaction.member.roles.cache.some(role => supportRoles.includes(role.id))) {
                return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
            }

            if (!config.Alert.Enabled) {
                return interaction.reply({ content: 'Alert feature is disabled.', flags: MessageFlags.Ephemeral });
            }

            const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
            if (!ticket) {
                return interaction.reply({ content: 'This command can only be used in ticket channels.', flags: MessageFlags.Ephemeral });
            }

            const reason = interaction.options.getString('reason') || 'No reason provided';
            const timeDuration = config.Alert.Time;
            const alertDurationMs = parseDuration(timeDuration);
            const alertTime = new Date(Date.now() + alertDurationMs);
            const discordTimestamp = `<t:${Math.floor(alertTime.getTime() / 1000)}:R>`;

            ticket.alertTime = alertTime;
            ticket.alertReason = reason;
            await ticket.save();

            const alertConfig = config.Alert.Embed;
            const embed = new EmbedBuilder()
                .setDescription(alertConfig.Description.join('\n')
                    .replace('{user}', `<@${ticket.userId}>`)
                    .replace('{time}', discordTimestamp)
                    .replace('{reason}', reason));

            if (alertConfig.Title) embed.setTitle(alertConfig.Title);
            if (alertConfig.Color) embed.setColor(alertConfig.Color);
            if (alertConfig.Footer?.Text) {
                embed.setFooter({
                    text: alertConfig.Footer.Text,
                    iconURL: alertConfig.Footer.Icon || null
                });
            }
            if (alertConfig.Author?.Text) {
                embed.setAuthor({
                    name: alertConfig.Author.Text,
                    iconURL: alertConfig.Author.Icon || null
                });
            }
            if (alertConfig.Image) embed.setImage(alertConfig.Image);
            if (alertConfig.Thumbnail) embed.setThumbnail(alertConfig.Thumbnail);

            const closeButton = new ButtonBuilder()
                .setCustomId(`ticketclose-${ticket.ticketId}`)
                .setLabel(alertConfig.Button?.Label || 'Close Ticket')
                .setStyle(ButtonStyle[alertConfig.Button?.Style || 'Danger'])
                .setEmoji(alertConfig.Button?.Emoji || '🔒');

            const actionRow = new ActionRowBuilder()
                .addComponents(closeButton);

            const tagMessage = await interaction.channel.send(`<@${ticket.userId}>`);
            const alertMessage = await interaction.channel.send({ embeds: [embed], components: [actionRow] });

            setTimeout(() => tagMessage.delete(), 500);

            if (config.Alert.DM?.Enabled) {
                try {
                    const user = await interaction.client.users.fetch(ticket.userId);
                    const guild = interaction.guild;
                    
                    const dmEmbed = new EmbedBuilder();
                    const dmConfig = config.Alert.DM.Embed;

                    if (dmConfig.Title) dmEmbed.setTitle(dmConfig.Title);
                    if (dmConfig.Color) dmEmbed.setColor(dmConfig.Color);
                    
                    const description = dmConfig.Description
                        .join('\n')
                        .replace('{user}', `<@${ticket.userId}>`)
                        .replace('{guild}', guild.name)
                        .replace('{time}', discordTimestamp)
                        .replace('{reason}', reason);
                    
                    dmEmbed.setDescription(description);

                    if (dmConfig.Footer?.Text) {
                        dmEmbed.setFooter({
                            text: dmConfig.Footer.Text,
                            iconURL: dmConfig.Footer.Icon || null
                        });
                    }
                    if (dmConfig.Author?.Text) {
                        dmEmbed.setAuthor({
                            name: dmConfig.Author.Text,
                            iconURL: dmConfig.Author.Icon || null
                        });
                    }
                    if (dmConfig.Image) dmEmbed.setImage(dmConfig.Image);
                    if (dmConfig.Thumbnail) dmEmbed.setThumbnail(dmConfig.Thumbnail);

                    const ticketButton = new ButtonBuilder()
                        .setLabel(dmConfig.Button?.Label || 'Go to Ticket')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://discord.com/channels/${guild.id}/${ticket.channelId}`)
                        .setEmoji(dmConfig.Button?.Emoji || '🎫');

                    const dmActionRow = new ActionRowBuilder()
                        .addComponents(ticketButton);

                    await user.send({
                        embeds: [dmEmbed],
                        components: [dmActionRow]
                    }).catch(() => {
                        if (config.Alert.DM?.LogFailures) {
                            interaction.channel.send({
                                content: 'Unable to send DM to the user. They may have DMs disabled.',
                                flags: MessageFlags.Ephemeral
                            }).catch(() => {});
                        }
                    });
                } catch (error) {
                    if (error.code !== 50007) {
                        console.error('Error sending DM:', error);
                    }
                }
            }

            ticket.alertMessageId = alertMessage.id;
            await ticket.save();

        } else if (group === 'blacklist') {
            if (subcommand === 'add') {
                try {
                    const userToBlacklist = interaction.options.getUser('user');
                    const reason = interaction.options.getString('reason') || 'No reason provided';
                    const supportRoles = config.ModerationRoles.blacklist;
                    const hasPermission = interaction.member.roles.cache.some(role => supportRoles.includes(role.id)) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

                    if (!hasPermission) {
                        return interaction.reply({ content: 'You do not have permissions to use this command.', flags: MessageFlags.Ephemeral });
                    }

                    const existingEntry = await Blacklist.findOne({ userId: userToBlacklist.id });
                    if (existingEntry) {
                        return interaction.reply({ content: `${userToBlacklist.tag} is already blacklisted.`, flags: MessageFlags.Ephemeral });
                    }

                    const blacklistEntry = new Blacklist({
                        userId: userToBlacklist.id,
                        addedBy: interaction.user.id,
                        addedAt: new Date(),
                        reason: reason
                    });

                    await blacklistEntry.save();

                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('🚫 User Blacklisted')
                        .setDescription(`**<@${userToBlacklist.id}>** has been blacklisted from opening tickets.`)
                        .addFields(
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Blacklisted By', value: `<@${interaction.user.id}>`, inline: true },
                            { name: 'Date', value: `<t:${Math.floor(new Date(blacklistEntry.addedAt).getTime() / 1000)}:F>`, inline: true }
                        )
                        .setThumbnail(userToBlacklist.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: 'Contact an admin if you believe this is a mistake.' });

                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                } catch (error) {
                    console.error('Error blacklisting user:', error);
                    await interaction.reply({ content: 'An error occurred while blacklisting the user. Please try again later.', flags: MessageFlags.Ephemeral });
                }
            } else if (subcommand === 'view') {
                try {
                    const userToCheck = interaction.options.getUser('user');
                    const supportRoles = config.ModerationRoles.blacklist;
                    const hasPermission = interaction.member.roles.cache.some(role => supportRoles.includes(role.id)) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

                    if (!hasPermission) {
                        return interaction.reply({ content: 'You do not have permissions to use this command.', flags: MessageFlags.Ephemeral });
                    }

                    const blacklistEntry = await Blacklist.findOne({ userId: userToCheck.id });

                    if (!blacklistEntry) {
                        return interaction.reply({ content: `${userToCheck.tag} is not blacklisted.`, flags: MessageFlags.Ephemeral });
                    }

                    const embed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('📋 Blacklist Information')
                        .addFields(
                            { name: 'User', value: `<@${blacklistEntry.userId}>`, inline: true },
                            { name: 'Blacklisted By', value: `<@${blacklistEntry.addedBy}>`, inline: true },
                            { name: 'Reason', value: blacklistEntry.reason, inline: false },
                            { name: 'Date', value: `<t:${Math.floor(new Date(blacklistEntry.addedAt).getTime() / 1000)}:F>`, inline: true }
                        )
                        .setThumbnail(userToCheck.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: 'Contact an admin if you need more information.' });

                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                } catch (error) {
                    console.error('Error fetching blacklist information:', error);
                    await interaction.reply({ content: 'An error occurred while fetching the blacklist information. Please try again later.', flags: MessageFlags.Ephemeral });
                }
            } else if (subcommand === 'remove') {
                try {
                    const userToRemove = interaction.options.getUser('user');
                    const supportRoles = config.ModerationRoles.blacklist;
                    const hasPermission = interaction.member.roles.cache.some(role => supportRoles.includes(role.id)) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

                    if (!hasPermission) {
                        return interaction.reply({ content: 'You do not have permissions to use this command.', flags: MessageFlags.Ephemeral });
                    }

                    const result = await Blacklist.findOneAndDelete({ userId: userToRemove.id });

                    if (!result) {
                        return interaction.reply({ content: `${userToRemove.tag} is not blacklisted.`, flags: MessageFlags.Ephemeral });
                    }

                    const embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('✅ User Removed from Blacklist')
                        .setDescription(`**<@${userToRemove.id}>** has been removed from the blacklist.`)
                        .addFields(
                            { name: 'Removed By', value: `<@${interaction.user.id}>`, inline: true },
                            { name: 'Date', value: `<t:${Math.floor(new Date().getTime() / 1000)}:F>`, inline: true }
                        )
                        .setThumbnail(userToRemove.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: 'The user can now open tickets again.' });

                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                } catch (error) {
                    console.error('Error removing user from blacklist:', error);
                    await interaction.reply({ content: 'An error occurred while removing the user from the blacklist. Please try again later.', flags: MessageFlags.Ephemeral });
                }
            }
        } else if (subcommand === 'close' && !group) {
            try {
                const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
                if (!ticket) {
                    return interaction.reply({ content: 'Ticket not found or already closed.', flags: MessageFlags.Ephemeral });
                }

                const ticketType = config.TicketTypes[ticket.ticketType];
                if (ticketType.RestrictDeletion) {
                    const hasSupportRole = interaction.member.roles.cache.some(role => ticketType.SupportRole.includes(role.id));
                    if (!hasSupportRole) {
                        return interaction.reply({ content: 'You do not have permission to close this ticket.', flags: MessageFlags.Ephemeral });
                    }
                }

                const isSilent = interaction.options.getBoolean('silent') || false;
                const reason = interaction.options.getString('reason');
                const customReason = interaction.options.getString('custom_reason');

                if (isSilent) {
                    ticket.status = 'deleted';
                    ticket.closedAt = new Date();
                    ticket.closedBy = interaction.user.id;
                    await ticket.save();

                    await interaction.channel.delete();
                    return;
                }
                
                await handleTicketClose(interaction.client, interaction, ticket.ticketId, reason, customReason);

                if (interaction.channel && !interaction.channel.deleted) {
                    try {
                        await interaction.followUp({ content: 'Ticket closed.', flags: MessageFlags.Ephemeral });
                    } catch (error) {
                        console.error('Follow-up failed:', error);
                    }
                }
            } catch (error) {
                console.error('Error executing /close command:', error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: 'An error occurred while closing the ticket. Please try again later.', flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content: 'An error occurred while closing the ticket. Please try again later.', flags: MessageFlags.Ephemeral });
                }
            }

        } else if (subcommand === 'panel' && !group) {
            try {
                if (!config.TicketSettings?.Enabled) {
                    return interaction.reply({ content: 'This command has been disabled in the config!', flags: MessageFlags.Ephemeral });
                }

                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({ content: 'You do not have permissions to use this command.', flags: MessageFlags.Ephemeral });
                }

                const selectedPanel = interaction.options.getString('panel');
                const panelConfig = config.TicketPanelSettings[selectedPanel];

                if (!panelConfig) {
                    return interaction.reply({ content: 'Invalid panel selected!', flags: MessageFlags.Ephemeral });
                }

                const embedConfig = panelConfig.Embed || {};
                const embed = new EmbedBuilder();

                const currentTime = moment().tz(config.WorkingHours.Timezone);
                const currentDay = currentTime.format('dddd');
                const formattedDay = currentDay.charAt(0).toUpperCase() + currentDay.slice(1).toLowerCase();
                const workingHoursPlaceholders = {};
                
                if (config.WorkingHours.NonWorkingDays && config.WorkingHours.NonWorkingDays.includes(formattedDay)) {
                    workingHoursPlaceholders.start = "N/A";
                    workingHoursPlaceholders.end = "N/A";
                } else {
                    const workingHours = config.WorkingHours.Schedule[formattedDay];
                    if (workingHours) {
                        const [start, end] = workingHours.split('-');
                        workingHoursPlaceholders.start = `<t:${moment.tz(start, 'HH:mm', config.WorkingHours.Timezone).unix()}:t>`;
                        workingHoursPlaceholders.end = `<t:${moment.tz(end, 'HH:mm', config.WorkingHours.Timezone).unix()}:t>`;
                    }
                }
                
                Object.keys(config.WorkingHours.Schedule).forEach(day => {
                    if (config.WorkingHours.NonWorkingDays && config.WorkingHours.NonWorkingDays.includes(day)) {
                        workingHoursPlaceholders[`${day.toLowerCase()}Start`] = "N/A";
                        workingHoursPlaceholders[`${day.toLowerCase()}End`] = "N/A";
                    } else {
                        const [dayStart, dayEnd] = config.WorkingHours.Schedule[day].split('-');
                        workingHoursPlaceholders[`${day.toLowerCase()}Start`] = `<t:${moment.tz(dayStart, 'HH:mm', config.WorkingHours.Timezone).unix()}:t>`;
                        workingHoursPlaceholders[`${day.toLowerCase()}End`] = `<t:${moment.tz(dayEnd, 'HH:mm', config.WorkingHours.Timezone).unix()}:t>`;
                    }
                });

                if (embedConfig.Title) {
                    embed.setTitle(replacePlaceholders(embedConfig.Title, workingHoursPlaceholders));
                }

                if (embedConfig.Description && Array.isArray(embedConfig.Description)) {
                    const description = embedConfig.Description.join('\n');
                    if (description.trim()) {
                        embed.setDescription(replacePlaceholders(description, workingHoursPlaceholders));
                    }
                }

                if (embedConfig.Color) {
                    embed.setColor(embedConfig.Color);
                } else {
                    embed.setColor('#1769FF');
                }

                if (embedConfig.Footer?.Text) {
                    embed.setFooter({
                        text: replacePlaceholders(embedConfig.Footer.Text, workingHoursPlaceholders),
                        iconURL: embedConfig.Footer.Icon || null
                    });
                }

                if (embedConfig.Author?.Text) {
                    embed.setAuthor({
                        name: replacePlaceholders(embedConfig.Author.Text, workingHoursPlaceholders),
                        iconURL: embedConfig.Author.Icon || null
                    });
                }

                if (embedConfig.Image && isValidHttpUrl(embedConfig.Image)) {
                    embed.setImage(embedConfig.Image);
                }

                if (embedConfig.Thumbnail && isValidHttpUrl(embedConfig.Thumbnail)) {
                    embed.setThumbnail(embedConfig.Thumbnail);
                }

                if (embedConfig.Fields && Array.isArray(embedConfig.Fields)) {
                    embedConfig.Fields.forEach(field => {
                        const name = replacePlaceholders(field.name, workingHoursPlaceholders);
                        const value = replacePlaceholders(field.value, workingHoursPlaceholders);
                        if (name && value) {
                            embed.addFields({
                                name: name,
                                value: value,
                                inline: field.inline || false
                            });
                        }
                    });
                }

                const { useSelectMenu } = config.TicketSettings;

                const rows = [];
                let currentRow = new ActionRowBuilder();

                if (useSelectMenu) {
                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId('ticketcreate')
                        .setPlaceholder(lang.Tickets.TicketTypePlaceholder);

                    Object.keys(config.TicketTypes).forEach(key => {
                        const ticketType = config.TicketTypes[key];
                        if (ticketType.Enabled && ticketType.Panel === selectedPanel) {
                            selectMenu.addOptions({
                                label: replacePlaceholders(ticketType.Button.Name || 'Unnamed Ticket', workingHoursPlaceholders),
                                emoji: ticketType.Button.Emoji || '',
                                value: key,
                                description: replacePlaceholders(ticketType.Button.Description || '', workingHoursPlaceholders)
                            });
                        }
                    });

                    if (selectMenu.options.length > 0) {
                        currentRow.addComponents(selectMenu);
                        rows.push(currentRow);
                    } else {
                        throw new Error('No ticket types are enabled for this panel.');
                    }
                } else {
                    Object.keys(config.TicketTypes).forEach(key => {
                        const ticketType = config.TicketTypes[key];
                        if (ticketType.Enabled && ticketType.Panel === selectedPanel) {
                            const buttonStyleMap = {
                                'Primary': ButtonStyle.Primary,
                                'Secondary': ButtonStyle.Secondary,
                                'Success': ButtonStyle.Success,
                                'Danger': ButtonStyle.Danger
                            };
                            const buttonStyle = buttonStyleMap[ticketType.Button.Style] || ButtonStyle.Primary;

                            currentRow.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`ticketcreate-${key}`)
                                    .setLabel(replacePlaceholders(ticketType.Button.Name || 'Unnamed Ticket', workingHoursPlaceholders))
                                    .setEmoji(ticketType.Button.Emoji || '')
                                    .setStyle(buttonStyle)
                            );

                            if (currentRow.components.length === 5) {
                                rows.push(currentRow);
                                currentRow = new ActionRowBuilder();
                            }
                        }
                    });

                    if (currentRow.components.length > 0) {
                        rows.push(currentRow);
                    }

                    if (rows.length === 0) {
                        throw new Error('No buttons are enabled for this panel.');
                    }
                }

                await interaction.reply({ content: 'Ticket panel sent!', flags: MessageFlags.Ephemeral });
                await interaction.channel.send({ embeds: [embed], components: rows });
            } catch (error) {
                console.error('Error sending ticket panel:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'An error occurred while sending the ticket panel.', flags: MessageFlags.Ephemeral }).catch(e => console.error('Error sending reply:', e));
                } else {
                    await interaction.followUp({ content: 'An error occurred while sending the ticket panel.', flags: MessageFlags.Ephemeral }).catch(e => console.error('Error sending follow-up:', e));
                }
            }
        } else if (subcommand === 'remove' && !group) {
            try {
                const userToRemove = interaction.options.getUser('user');
                const ticket = await Ticket.findOne({ channelId: interaction.channel.id });

                if (!ticket) {
                    return interaction.reply({ content: 'This command can only be used within a ticket channel.', flags: MessageFlags.Ephemeral });
                }

                const supportRoles = config.TicketTypes[ticket.ticketType].SupportRole;
                const hasSupportRole = interaction.member.roles.cache.some(role => supportRoles.includes(role.id));

                if (!hasSupportRole) {
                    return interaction.reply({ content: 'You do not have permissions to use this command.', flags: MessageFlags.Ephemeral });
                }

                const channel = interaction.channel;

                const memberPermissions = channel.permissionsFor(userToRemove);
                if (!memberPermissions || !memberPermissions.has(PermissionsBitField.Flags.ViewChannel)) {
                    return interaction.reply({ content: 'User is not part of this ticket.', flags: MessageFlags.Ephemeral });
                }

                await channel.permissionOverwrites.create(userToRemove, {
                    ViewChannel: false,
                    SendMessages: false,
                    ReadMessageHistory: false,
                    AttachFiles: false,
                    EmbedLinks: false
                });

                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription(`Successfully removed ${userToRemove.tag} from the ticket.`);

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

                const notificationEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription(`<@${userToRemove.id}> has been removed from the ticket by <@${interaction.user.id}>.`);

                await channel.send({ embeds: [notificationEmbed] });
            } catch (error) {
                console.error('Error removing user from ticket:', error);
                await interaction.reply({ content: 'An error occurred while removing the user from the ticket. Please try again later.', flags: MessageFlags.Ephemeral });
            }

        } else if (subcommand === 'rename' && !group) {
            try {
                const newName = interaction.options.getString('name');
                const ticket = await Ticket.findOne({ channelId: interaction.channel.id });

                if (!ticket) {
                    return interaction.reply({ content: 'This command can only be used within a ticket channel.', flags: MessageFlags.Ephemeral });
                }

                const supportRoles = config.TicketTypes[ticket.ticketType].SupportRole;
                const hasSupportRole = interaction.member.roles.cache.some(role => supportRoles.includes(role.id));

                if (!hasSupportRole) {
                    return interaction.reply({ content: 'You do not have permissions to use this command.', flags: MessageFlags.Ephemeral });
                }

                const channel = interaction.channel;

                await queueChannelRename(channel, newName);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription(`Successfully renamed the ticket to ${newName}.`);

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

                const notificationEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription(`The ticket has been renamed to ${newName} by <@${interaction.user.id}>.`);

                await channel.send({ embeds: [notificationEmbed] });
            } catch (error) {
                console.error('Error renaming ticket:', error);
                await interaction.reply({ content: 'An error occurred while renaming the ticket. Please try again later.', flags: MessageFlags.Ephemeral });
            }

        } else if (subcommand === 'stats' && !group) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
                const now = moment();
                const twentyFourHoursAgo = now.clone().subtract(24, 'hours').toDate();
                const sevenDaysAgo = now.clone().subtract(7, 'days').toDate();
                const thirtyDaysAgo = now.clone().subtract(30, 'days').toDate();

                const [statsResult] = await Ticket.aggregate([
                    {
                        $facet: {
                            totalCounts: [
                                {
                                    $group: {
                                        _id: null,
                                        totalTickets: { $sum: 1 },
                                        totalMessages: { $sum: { $ifNull: ["$messageCount", 0] } },
                                        openTickets: {
                                            $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] }
                                        },
                                        closedTickets: {
                                            $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] }
                                        },
                                        deletedTickets: {
                                            $sum: { $cond: [{ $eq: ["$status", "deleted"] }, 1, 0] }
                                        },
                                        claimedTickets: {
                                            $sum: { $cond: [{ $eq: ["$claimed", true] }, 1, 0] }
                                        },
                                        unclaimedTickets: {
                                            $sum: { $cond: [
                                                { $and: [
                                                    { $eq: ["$status", "open"] },
                                                    { $ne: ["$claimed", true] }
                                                ]}, 
                                                1, 0
                                            ]}
                                        }
                                    }
                                }
                            ],
                            recentActivity: [
                                {
                                    $group: {
                                        _id: null,
                                        last24Hours: {
                                            $sum: { $cond: [{ $gte: ["$createdAt", twentyFourHoursAgo] }, 1, 0] }
                                        },
                                        last7Days: {
                                            $sum: { $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, 1, 0] }
                                        },
                                        last30Days: {
                                            $sum: { $cond: [{ $gte: ["$createdAt", thirtyDaysAgo] }, 1, 0] }
                                        },
                                        closedLast24Hours: {
                                            $sum: { $cond: [
                                                { $and: [
                                                    { $gte: ["$closedAt", twentyFourHoursAgo] },
                                                    { $in: ["$status", ["closed", "deleted"]] }
                                                ]},
                                                1, 0
                                            ]}
                                        },
                                        closedLast7Days: {
                                            $sum: { $cond: [
                                                { $and: [
                                                    { $gte: ["$closedAt", sevenDaysAgo] },
                                                    { $in: ["$status", ["closed", "deleted"]] }
                                                ]},
                                                1, 0
                                            ]}
                                        }
                                    }
                                }
                            ],
                            priorityStats: [
                                { $match: { priority: { $exists: true, $ne: null } } },
                                {
                                    $group: {
                                        _id: "$priority",
                                        count: { $sum: 1 },
                                        openCount: { 
                                            $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] }
                                        }
                                    }
                                }
                            ],
                            ticketTypeStats: [
                                { $match: { ticketType: { $exists: true, $ne: null } } },
                                {
                                    $group: {
                                        _id: "$ticketType",
                                        count: { $sum: 1 },
                                        openCount: { 
                                            $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] }
                                        }
                                    }
                                }
                            ],
                            ratingStats: [
                                { $match: { rating: { $regex: /\(\d\/5\)$/ } } },
                                {
                                    $addFields: {
                                        numericRating: {
                                            $toInt: { $arrayElemAt: [{ $split: [{ $arrayElemAt: [{ $split: ["$rating", "("] }, 1] }, "/"] }, 0] }
                                        }
                                    }
                                },
                                {
                                    $group: {
                                        _id: "$numericRating",
                                        count: { $sum: 1 },
                                        sum: { $sum: "$numericRating" }
                                    }
                                }
                            ],
                            responseMetrics: [
                                { 
                                    $match: { 
                                        "messages.1": { $exists: true },
                                        userId: { $exists: true }
                                    }
                                },
                                {
                                    $addFields: {
                                        firstUserMsg: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$messages",
                                                        as: "msg",
                                                        cond: { $eq: ["$$msg.authorId", "$userId"] }
                                                    }
                                                },
                                                0
                                            ]
                                        },
                                        firstStaffMsg: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$messages",
                                                        as: "msg",
                                                        cond: { $ne: ["$$msg.authorId", "$userId"] }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    }
                                },
                                {
                                    $addFields: {
                                        responseTime: {
                                            $cond: [
                                                { 
                                                    $and: [
                                                        { $ne: ["$firstUserMsg", null] },
                                                        { $ne: ["$firstStaffMsg", null] },
                                                        { $gt: ["$firstStaffMsg.timestamp", "$firstUserMsg.timestamp"] }
                                                    ]
                                                },
                                                { $subtract: ["$firstStaffMsg.timestamp", "$firstUserMsg.timestamp"] },
                                                null
                                            ]
                                        }
                                    }
                                },
                                {
                                    $match: {
                                        responseTime: { $ne: null, $gt: 0 }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        avgFirstResponse: {
                                            $avg: "$responseTime"
                                        },
                                        minResponseTime: { $min: "$responseTime" },
                                        maxResponseTime: { $max: "$responseTime" },
                                        count: { $sum: 1 }
                                    }
                                }
                            ],
                            resolutionMetrics: [
                                {
                                    $match: {
                                        status: { $in: ["closed", "deleted"] },
                                        createdAt: { $exists: true },
                                        closedAt: { $exists: true, $ne: null }
                                    }
                                },
                                {
                                    $addFields: {
                                        resolutionTime: { 
                                            $cond: [
                                                { $gt: ["$closedAt", "$createdAt"] },
                                                { $subtract: ["$closedAt", "$createdAt"] },
                                                null
                                            ]
                                        }
                                    }
                                },
                                {
                                    $match: {
                                        resolutionTime: { $ne: null, $gt: 0 }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        avgResolutionTime: { $avg: "$resolutionTime" },
                                        minResolutionTime: { $min: "$resolutionTime" },
                                        maxResolutionTime: { $max: "$resolutionTime" },
                                        count: { $sum: 1 }
                                    }
                                }
                            ],
                            staffPerformance: [
                                {
                                    $match: {
                                        claimed: true,
                                        claimedBy: { $exists: true, $ne: null }
                                    }
                                },
                                {
                                    $group: {
                                        _id: "$claimedBy",
                                        ticketsClaimed: { $sum: 1 },
                                        ticketsClosed: { 
                                            $sum: { $cond: [{ $in: ["$status", ["closed", "deleted"]] }, 1, 0] }
                                        }
                                    }
                                },
                                { $sort: { ticketsClaimed: -1 } },
                                { $limit: 5 }
                            ],
                            timeOfDayAnalysis: [
                                {
                                    $addFields: {
                                        hour: { $hour: "$createdAt" }
                                    }
                                },
                                {
                                    $group: {
                                        _id: "$hour",
                                        count: { $sum: 1 }
                                    }
                                },
                                { $sort: { _id: 1 } }
                            ]
                        }
                    }
                ]);

                const totalCounts = statsResult.totalCounts[0] || {
                    totalTickets: 0,
                    totalMessages: 0,
                    openTickets: 0,
                    closedTickets: 0,
                    deletedTickets: 0,
                    claimedTickets: 0,
                    unclaimedTickets: 0
                };

                const recentActivity = statsResult.recentActivity[0] || {
                    last24Hours: 0,
                    last7Days: 0,
                    last30Days: 0,
                    closedLast24Hours: 0,
                    closedLast7Days: 0
                };

                const priorityStats = statsResult.priorityStats.reduce((acc, item) => {
                    if (item._id && item._id !== "undefined") {
                        acc[item._id] = item.count;
                    }
                    return acc;
                }, {});

                const ticketTypeStats = statsResult.ticketTypeStats.reduce((acc, item) => {
                    if (item._id) {
                        const typeName = config.TicketTypes[item._id]?.Name || item._id;
                        if (!typeName.match(/^TicketType\d+$/)) {
                            acc[typeName] = {
                                total: item.count,
                                open: item.openCount
                            };
                        }
                    }
                    return acc;
                }, {});

                const ratingCounts = statsResult.ratingStats.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {});
                
                const totalRatings = statsResult.ratingStats.reduce((sum, item) => sum + item.count, 0);
                const ratingSum = statsResult.ratingStats.reduce((sum, item) => sum + (item._id * item.count), 0);
                const averageRating = totalRatings > 0 ? (ratingSum / totalRatings).toFixed(1) : 'N/A';

                const responseMetrics = statsResult.responseMetrics[0] || { 
                    avgFirstResponse: 0,
                    minResponseTime: 0,
                    maxResponseTime: 0
                };
                
                const resolutionMetrics = statsResult.resolutionMetrics[0] || { 
                    avgResolutionTime: 0,
                    minResolutionTime: 0,
                    maxResolutionTime: 0
                };

                const staffPerformance = statsResult.staffPerformance || [];

                const timeOfDayData = statsResult.timeOfDayAnalysis || [];
                const peakHours = timeOfDayData.length > 0 
                    ? timeOfDayData.sort((a, b) => b.count - a.count).slice(0, 3)
                    : [];

                const statsEmbed = new EmbedBuilder()
                    .setTitle('📊 Ticket Statistics')
                    .setColor('#2B2D31')
                    .addFields([
                        {
                            name: '📈 Current Status',
                            value: `> 🎫 Total Tickets: \`${totalCounts.totalTickets}\`\n` +
                                   `> 📝 Total Messages: \`${totalCounts.totalMessages}\`\n` +
                                   `> 🟢 Open: \`${totalCounts.openTickets}\`\n` +
                                   `> 🟡 Closed: \`${totalCounts.closedTickets}\`\n` +
                                   `> 🔴 Deleted: \`${totalCounts.deletedTickets}\`\n` +
                                   `> 👤 Claimed: \`${totalCounts.claimedTickets}\`\n` +
                                   `> ⏳ Unclaimed: \`${totalCounts.unclaimedTickets}\``,
                            inline: false
                        },
                        {
                            name: '⏰ Recent Activity',
                            value: `> 📥 Created (24h): \`${recentActivity.last24Hours} tickets\`\n` +
                                   `> 📤 Closed (24h): \`${recentActivity.closedLast24Hours} tickets\`\n` +
                                   `> 📥 Created (7d): \`${recentActivity.last7Days} tickets\`\n` +
                                   `> 📤 Closed (7d): \`${recentActivity.closedLast7Days} tickets\`\n` +
                                   `> 📆 Created (30d): \`${recentActivity.last30Days} tickets\``,
                            inline: true
                        },
                        {
                            name: '🎯 Priority Distribution',
                            value: Object.entries(priorityStats).length > 0
                                ? Object.entries(priorityStats)
                                    .map(([priority, count]) => {
                                        const emoji = priority === 'High' ? '🔴' 
                                            : priority === 'Medium' ? '🟡' 
                                            : priority === 'Low' ? '🟢' 
                                            : '⚪';
                                        return `> ${emoji} ${priority}: \`${count} tickets\``;
                                    })
                                    .join('\n')
                                : '> No priority tickets found',
                            inline: true
                        },
                        {
                            name: '🔖 Ticket Type Distribution',
                            value: Object.entries(ticketTypeStats).length > 0
                                ? Object.entries(ticketTypeStats)
                                    .filter(([type]) => !type.match(/^TicketType\d+$/))
                                    .map(([type, stats]) => 
                                        `> ${type}: \`${stats.total} total\` (\`${stats.open} open\`)`)
                                    .join('\n')
                                : '> No named ticket types found',
                            inline: false
                        },
                        {
                            name: '⭐ Rating Statistics',
                            value: totalRatings > 0 
                                ? `> Average Rating: \`${averageRating}/5\` ${'⭐'.repeat(Math.round(parseFloat(averageRating)))}\n` +
                                  Object.entries(ratingCounts)
                                    .sort((a, b) => b[0] - a[0])
                                    .map(([rating, count]) => `> ${rating}⭐: \`${count} reviews\``)
                                    .join('\n')
                                : '> No ratings yet',
                            inline: false
                        },
                        {
                            name: '⚡ Response Metrics',
                            value: `> Average First Response: \`${formatDuration(responseMetrics.avgFirstResponse > 0 ? responseMetrics.avgFirstResponse : 0)}\`\n` +
                                   `> Fastest Response: \`${formatDuration(responseMetrics.minResponseTime > 0 ? responseMetrics.minResponseTime : 0)}\`\n` +
                                   `> Slowest Response: \`${formatDuration(responseMetrics.maxResponseTime > 0 ? responseMetrics.maxResponseTime : 0)}\`\n` +
                                   `> Average Resolution Time: \`${formatDuration(resolutionMetrics.avgResolutionTime > 0 ? resolutionMetrics.avgResolutionTime : 0)}\`\n` +
                                   `> Fastest Resolution: \`${formatDuration(resolutionMetrics.minResolutionTime > 0 ? resolutionMetrics.minResolutionTime : 0)}\``,
                            inline: false
                        }
                    ])
                    .setFooter({ 
                        text: 'Last Updated', 
                        iconURL: interaction.guild.iconURL() 
                    })
                    .setTimestamp();

                const embeds = [statsEmbed];
                
                if (staffPerformance.length > 0) {
                    const staffEmbed = new EmbedBuilder()
                        .setTitle('👥 Staff Performance')
                        .setColor('#2B2D31')
                        .setDescription(
                            staffPerformance.map(staff => {
                                const closedPercentage = staff.ticketsClaimed > 0 
                                    ? Math.round((staff.ticketsClosed / staff.ticketsClaimed) * 100) 
                                    : 0;
                                return `<@${staff._id}>: \`${staff.ticketsClaimed} claimed\` | \`${staff.ticketsClosed} closed\` | \`${closedPercentage}% resolution rate\``;
                            }).join('\n\n')
                        )
                        .setFooter({ 
                            text: 'Top 5 staff members by tickets claimed', 
                            iconURL: interaction.guild.iconURL() 
                        });
                    
                    embeds.push(staffEmbed);
                }

                if (peakHours.length > 0) {
                    const peakHoursField = {
                        name: '⏱️ Peak Activity Hours',
                        value: peakHours.map(hour => 
                            `> ${hour._id}:00 - ${hour._id}:59: \`${hour.count} tickets\``
                        ).join('\n'),
                        inline: false
                    };
                    
                    if (statsEmbed.data.fields.length < 25) {
                        statsEmbed.addFields(peakHoursField);
                    } else if (embeds.length > 1) {
                        embeds[1].addFields(peakHoursField);
                    }
                }

                await interaction.editReply({ embeds: embeds });
            } catch (error) {
                console.error('Error fetching ticket stats:', error);
                await interaction.editReply({ 
                    content: 'An error occurred while fetching ticket stats. Please try again later.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        } else if (subcommand === 'transfer' && !group) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
                const newType = interaction.options.getString('type');
                const ticket = await Ticket.findOne({ channelId: interaction.channel.id });

                if (!ticket) {
                    return interaction.editReply({ content: 'This command can only be used within a ticket channel.' });
                }

                const oldTicketType = config.TicketTypes[ticket.ticketType];
                const newTicketType = config.TicketTypes[newType];

                if (!newTicketType) {
                    return interaction.editReply({ content: 'New ticket type not found.' });
                }

                if (ticket.ticketType === newType) {
                    return interaction.editReply({ content: 'This ticket is already of the specified type.' });
                }

                const hasSupportRole = interaction.member.roles.cache.some(role => oldTicketType.SupportRole.includes(role.id));

                if (!hasSupportRole) {
                    return interaction.editReply({ content: 'You do not have permission to use this command.' });
                }

                const channel = await interaction.guild.channels.fetch(ticket.channelId);
                if (!channel) {
                    return interaction.editReply({ content: 'Channel not found.' });
                }

                const member = await interaction.guild.members.fetch(ticket.userId);
                const userPriority = await getUserPriority(member);

                const newCategoryId = newTicketType.CategoryID && newTicketType.CategoryID !== "" ? newTicketType.CategoryID : null;

                try {
                    await moveChannel(channel, newCategoryId);
                    await updateChannelPermissions(channel, newTicketType, ticket.userId);
                } catch (error) {
                    console.error('Error during channel operations:', error);
                    return interaction.editReply({ content: 'An error occurred while transferring the ticket. Please try again later.' });
                }

                ticket.questions = ticket.questions.map(q => ({
                    question: q.question || 'No Question Provided',
                    answer: q.answer || 'No Answer Provided'
                }));

                ticket.ticketType = newType;
                await ticket.save();

                const newName = newTicketType.ChannelName
                    .replace('{ticket-id}', ticket.ticketId)
                    .replace('{user}', member.user.username)
                    .replace('{priority}', userPriority);

                await queueChannelRename(channel, newName, ticket, newTicketType);

                const successEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription(`Successfully transferred the ticket to ${newTicketType.Name}.`);
                await interaction.editReply({ embeds: [successEmbed] });

                const notificationEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription(`Ticket has been transferred to ${newTicketType.Name} by <@${interaction.user.id}>.`);
                await channel.send({ embeds: [notificationEmbed] });

            } catch (error) {
                console.error('Error transferring ticket:', error);
                await interaction.editReply({ content: 'An error occurred while transferring the ticket. Please try again later.' });
            }
        } else if (subcommand === 'priority' && !group) {
            try {
                const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
                if (!ticket) {
                    return interaction.reply({ 
                        content: 'This command can only be used within a ticket channel.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                const newPriority = interaction.options.getString('priority');
                await handlePriorityChange(interaction, ticket, newPriority);

            } catch (error) {
                console.error('Error changing ticket priority:', error);
                
                if (error.message.startsWith('COOLDOWN:')) {
                    const remainingTime = error.message.split(':')[1];
                    return interaction.reply({ 
                        content: `Please wait ${remainingTime} seconds before changing priority again.`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }
                
                if (error.message === 'NO_PERMISSION') {
                    return interaction.reply({ 
                        content: 'You do not have permission to change ticket priority.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                await interaction.reply({ 
                    content: 'An error occurred while changing the ticket priority. Please try again later.', 
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};