//const path = require('path');
const Ticket = require('../../models/tickets');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const { handleTicketClose } = require('../interactionCreate');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ApplicationCommandType, InteractionType } = require('discord.js');

const config = getConfig();

const client = require("../../index");

async function triggerAlertCommand(client, channel, ticket) {
    try {
        const mockInteraction = {
            client,
            guild: channel.guild,
            channel,
            user: {
                id: client.user.id,
                tag: client.user.tag,
                username: client.user.username
            },
            member: {
                ...await channel.guild.members.fetch(client.user.id),
                roles: {
                    cache: {
                        some: (predicate) => config.TicketTypes[ticket.ticketType].SupportRole.some(roleId => predicate({ id: roleId })),
                        map: (fn) => config.TicketTypes[ticket.ticketType].SupportRole.map(roleId => fn({ id: roleId }))
                    }
                }
            },
            commandId: 'tickets',
            commandName: 'tickets',
            type: InteractionType.ApplicationCommand,
            commandType: ApplicationCommandType.ChatInput,
            options: {
                getSubcommand: () => 'alert',
                getSubcommandGroup: () => null,
                getString: () => 'Auto alert: No response',
                getUser: () => null
            },
            reply: async (options) => {
                return await channel.send(options);
            },
            deferReply: async () => { },
            editReply: async (options) => {
                return await channel.send(options);
            },
            followUp: async (options) => {
                return await channel.send(options);
            }
        };

        const ticketsCommand = client.slashCommands.get('tickets');
        if (ticketsCommand) {
            await ticketsCommand.execute(mockInteraction);

            const ticketType = config.TicketTypes[ticket.ticketType];
            if (!ticketType || !ticketType.AutoAlert) {
                console.error('No AutoAlert configuration found for ticket type:', ticket.ticketType);
                return;
            }

            const autoAlertDuration = parseDuration(ticketType.AutoAlert);
            console.log(`[AutoAlert Debug] Setting alert time for ticket ${ticket.ticketId} using duration ${ticketType.AutoAlert} (${autoAlertDuration}ms)`);

            const closeTime = new Date(Date.now() + autoAlertDuration);
            await Ticket.findOneAndUpdate(
                { ticketId: ticket.ticketId },
                {
                    alertTime: closeTime
                }
            );
        } else {
            console.error('Tickets command not found');
        }
    } catch (error) {
        console.error('Error triggering alert command:', error);
    }
}

function parseDuration(duration) {
    if (!duration) return 0;

    duration = duration.toString().trim();
    const match = duration.match(/^(\d+)\s*([smhd])$/i);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit];
}

async function checkAlerts(client) {
    try {
        const config = getConfig();
        const now = new Date();
        const mongoose = require('mongoose');
        console.log(`[checkAlerts] Mongoose readyState: ${mongoose.connection.readyState}`);

        if (mongoose.connection.readyState !== 1) {
            console.warn('[checkAlerts] MongoDB not connected. Skipping check.');
            return;
        }

        const tickets = await Ticket.find({ status: 'open' });

        for (const ticket of tickets) {
            try {
                const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
                if (!channel) continue;

                const channelTopic = channel.topic;
                const ticketTypeMatch = channelTopic?.match(/Category:\s*([^|]+)/);
                const ticketTypeName = ticketTypeMatch ? ticketTypeMatch[1].trim() : null;

                let ticketTypeConfig = null;
                for (const [key, type] of Object.entries(config.TicketTypes)) {
                    if (type.Name === ticketTypeName) {
                        ticketTypeConfig = type;
                        ticket.ticketType = key;
                        await ticket.save();
                        break;
                    }
                }

                if (!ticketTypeConfig || !ticketTypeConfig.AutoAlert) continue;

                const autoAlertDuration = parseDuration(ticketTypeConfig.AutoAlert);
                if (!autoAlertDuration) continue;

                const fetchedMessages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
                if (!fetchedMessages || fetchedMessages.size === 0) continue;

                const sortedMessages = Array.from(fetchedMessages.values())
                    .sort((a, b) => b.createdTimestamp - a.createdTimestamp);

                const supportRoleIds = ticketTypeConfig.SupportRole || [];

                let lastUserMessage = null;
                let lastStaffMessage = null;

                for (const msg of sortedMessages) {
                    try {
                        const member = await msg.guild.members.fetch(msg.author.id);
                        const isStaff = member.roles.cache.some(role => supportRoleIds.includes(role.id)) || msg.author.id === client.user.id;

                        if (!isStaff && !lastUserMessage) {
                            lastUserMessage = msg;
                        } else if (isStaff && !lastStaffMessage) {
                            lastStaffMessage = msg;
                        }

                        if (lastUserMessage && lastStaffMessage) break;
                    } catch (error) {
                        continue;
                    }
                }

                if (!lastUserMessage) continue;

                const timeSinceLastStaffMessage = lastStaffMessage ? now - lastStaffMessage.createdTimestamp : 0;
                const hasUserRespondedAfter = lastUserMessage && lastUserMessage.createdTimestamp > lastStaffMessage?.createdTimestamp;

                if (lastStaffMessage && !hasUserRespondedAfter && timeSinceLastStaffMessage >= autoAlertDuration) {
                    if (!ticket.alertMessageId) {
                        await triggerAlertCommand(client, channel, ticket);
                    }
                }
            } catch (error) {
                console.error(`Error processing ticket ${ticket._id}:`, error);
            }
        }
    } catch (error) {
        console.error('Error in checkAlerts:', error);
    }
}

function startAlertScheduler(client) {
    if (config.Alert && config.Alert.Enabled) {
        setInterval(() => checkAlerts(client), 10000);
    }
}

module.exports = { startAlertScheduler };