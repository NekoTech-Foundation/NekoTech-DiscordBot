const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const { handleTicketClose, handleDeleteTicket } = require('../../events/interactionCreate.js');
const Ticket = require('../../models/tickets.js');
const Blacklist = require('../../models/blacklist.js');
const { getConfig, getLang } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

module.exports = {
    name: 'tickets',
    description: 'Various ticket commands for managing tickets',
    usage: '!tickets <subcommand> [args]',
    async run(client, message, args) {
        const allowedUsers = ['1316287191634149377', '710025322497572926', '727497287777124414'];
        if (!allowedUsers.includes(message.author.id)) {
            return message.reply('You do not have permission to use this command.');
        }
        const subcommand = args[0]?.toLowerCase();
        const ticket = await Ticket.findOne({ channelId: message.channel.id });

        if (!ticket && !['panel', 'stats', 'blacklist'].includes(subcommand)) {
            return message.reply({ content: 'This command can only be used in a ticket channel.', ephemeral: true });
        }

        if (subcommand === 'add') {
            const user = message.mentions.users.first() || client.users.cache.get(args[1]);
            if (!user) return message.reply('Please provide a user to add.');
            await message.channel.permissionOverwrites.edit(user.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                AttachFiles: true,
                EmbedLinks: true
            });
            await message.reply({ content: `Added ${user} to the ticket.` });
        } else if (subcommand === 'remove') {
            const user = message.mentions.users.first() || client.users.cache.get(args[1]);
            if (!user) return message.reply('Please provide a user to remove.');
            await message.channel.permissionOverwrites.delete(user.id);
            await message.reply({ content: `Removed ${user} from the ticket.` });
        } else if (subcommand === 'rename') {
            const newName = args.slice(1).join('-');
            if (!newName) return message.reply('Please provide a new name for the ticket.');
            await message.channel.setName(newName);
            await message.reply({ content: `Ticket renamed to ${newName}.` });
        } else if (subcommand === 'blacklist') {
            const user = message.mentions.users.first() || client.users.cache.get(args[1]);
            if (!user) return message.reply('Please provide a user to blacklist.');
            const reason = args.slice(2).join(' ') || 'No reason provided';
            const blacklist = await Blacklist.create({
                userId: user.id,
                reason: reason,
                staffId: message.author.id,
            });
            await message.reply({ content: `${user} has been blacklisted from creating tickets.` });
        } else if (subcommand === 'alert') {
            await message.reply({ content: 'This is an alert for the ticket!' });
        } else if (subcommand === 'panel') {
            const panelName = args[1];
            const channel = message.mentions.channels.first() || client.channels.cache.get(args[2]);
            if (!panelName || !channel) return message.reply('Usage: !tickets panel <panel_name> <#channel>');

            const panelConfig = config.TicketPanelSettings[panelName];
            if (!panelConfig) return message.reply(`Panel "${panelName}" not found in config.yml.`);

            const description = panelConfig.Embed.Description.join('\n').replace('{workinghours_start_monday}', config.WorkingHours.Schedule.Monday.split('-')[0]).replace('{workinghours_end_monday}', config.WorkingHours.Schedule.Monday.split('-')[1]);

            const panelEmbed = new EmbedBuilder()
                .setTitle(panelConfig.Embed.Title)
                .setDescription(description)
                .setColor(panelConfig.Embed.Color);

            if (panelConfig.Embed.Footer) {
                panelEmbed.setFooter({ text: panelConfig.Embed.Footer.Text, iconURL: panelConfig.Embed.Footer.Icon });
            }
            if (panelConfig.Embed.Image) {
                panelEmbed.setImage(panelConfig.Embed.Image);
            }


            const row = new ActionRowBuilder();
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticketcreate')
                .setPlaceholder(lang.Tickets.TicketTypePlaceholder)

            const ticketTypes = Object.keys(config.TicketTypes).filter(key => config.TicketTypes[key].Panel === panelName);
            if (ticketTypes.length === 0) return message.reply(`No ticket types found for panel "${panelName}".`);

            ticketTypes.forEach(type => {
                const ticketType = config.TicketTypes[type];
                selectMenu.addOptions({
                    label: ticketType.Name,
                    value: type,
                    emoji: ticketType.Button.Emoji,
                    description: ticketType.Button.Description
                });
            });

            row.addComponents(selectMenu);

            await channel.send({ embeds: [panelEmbed], components: [row] });
            await message.reply({ content: 'Ticket panel sent.', ephemeral: true });

        } else if (subcommand === 'stats') {
            const totalTickets = await Ticket.countDocuments();
            const openTickets = await Ticket.countDocuments({ status: 'open' });
            const closedTickets = await Ticket.countDocuments({ status: 'closed' });
            const statsEmbed = new EmbedBuilder()
                .setTitle('Ticket Stats')
                .addFields(
                    { name: 'Total Tickets', value: totalTickets.toString(), inline: true },
                    { name: 'Open Tickets', value: openTickets.toString(), inline: true },
                    { name: 'Closed Tickets', value: closedTickets.toString(), inline: true }
                );
            await message.reply({ embeds: [statsEmbed] });
        } else if (subcommand === 'transfer') {
            const newType = args[1];
            if (!newType) return message.reply('Please provide a new ticket type.');
            ticket.ticketType = newType;
            await ticket.save();
            await message.channel.setTopic(`Ticket Type: ${newType}`);
            await message.reply({ content: `Ticket type transferred to ${newType}.` });
        } else if (subcommand === 'priority') {
            const newPriority = args[1];
            if (!newPriority) return message.reply('Please provide a new priority level.');
            ticket.priority = newPriority;
            await ticket.save();
            await message.channel.setTopic(`Priority: ${newPriority}`);
            await message.reply({ content: `Ticket priority set to ${newPriority}.` });
        } else if (subcommand === 'close') {
            const reason = args.slice(1).join(' ');
            await handleTicketClose(client, { channel: message.channel, guild: message.guild, user: message.author }, ticket.ticketId, reason, null);
        } else if (subcommand === 'close-silent') {
            if (ticket) {
                await handleDeleteTicket(client, { channel: message.channel, guild: message.guild, user: message.author }, ticket.ticketId, true);
            }
        } else {
            await message.reply({ content: 'Invalid subcommand. Available subcommands: add, remove, rename, blacklist, alert, panel, stats, transfer, priority, close, close-silent', ephemeral: true });
        }
    },
};