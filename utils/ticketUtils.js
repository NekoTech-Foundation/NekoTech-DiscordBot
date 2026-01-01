const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    MessageFlags, 
    AttachmentBuilder 
} = require("discord.js");
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const Ticket = require('../models/tickets');

// Helper to get panel config from guildData
function getPanel(guildData, panelId) {
    if (!guildData || !guildData.ticketSystem || !guildData.ticketSystem.panels) return null;
    return guildData.ticketSystem.panels.find(p => p.id === panelId);
}

function parseDuration(duration) {
    const timeRegex = /([0-9]+)([dhms])/;
    const match = duration.match(timeRegex);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'm': return value * 60 * 1000;
        case 's': return value * 1000;
        default: return 0;
    }
}

async function generateUniqueTicketId() {
    // Logic adapted for SQLiteModel which might return array for find()
    // But findOne with sort might not be supported by my simple SQLiteModel wrapper
    // We will use countDocuments + 1 or a timestamp based ID if possible, but user wants ID.
    // My SQLiteModel doesn't support .sort(). 
    // Fallback: Use timestamp or random ID, OR load all and find max (expensive).
    // For now, let's try to use a random 6 digit ID to avoid collision
    return Math.floor(100000 + Math.random() * 900000);
}

function replacePlaceholders(text, replacements) {
    if (!text) return text;
    let result = text;
    for (const key in replacements) {
        result = result.replace(new RegExp(`{${key}}`, 'g'), replacements[key]);
    }
    return result;
}

// Helper to safely reply
async function reply(interaction, content) {
    if (interaction.deferred || interaction.replied) {
        return interaction.editReply(content);
    } else {
        return interaction.reply(content);
    }
}

// Ported & Adapted from FullDrakoBot
async function createTicket(client, interaction, panelId, guildData) {
    // Note: panelId is equivalent to ticketTypeKey
    const panel = getPanel(guildData, panelId);
    if (!panel) return reply(interaction, { content: '❌ Panel not found.', flags: MessageFlags.Ephemeral });

    const ticketSystem = guildData.ticketSystem;
    
    // Check Max Tickets
    const existingTickets = await Ticket.find({ userId: interaction.user.id, guildId: interaction.guild.id });
    const openTickets = existingTickets.filter(t => t.status === 'open' || t.status === 'claimed');
    
    const limit = ticketSystem.configuration.limitPerUser || 1;
    if (openTickets.length >= limit) {
        return reply(interaction, { content: `❌ You have reached the ticket limit (${limit}).`, flags: MessageFlags.Ephemeral });
    }

    // Role Checks (if configured in panel)
    // ...

    const newTicketId = await generateUniqueTicketId();
    const namingFormat = ticketSystem.configuration.namingFormat || 'ticket-{id}';
    const channelName = namingFormat.replace('{id}', newTicketId).replace('{username}', interaction.user.username);

    // Permissions
    const permissionOverwrites = [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
    ];

    if (panel.settings.staffRoles) {
        panel.settings.staffRoles.forEach(rId => {
            const role = interaction.guild.roles.cache.get(rId);
            if (role) permissionOverwrites.push({ id: rId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
        });
    }

    try {
        const categoryId = panel.settings.categoryId;
        const channel = await interaction.guild.channels.create({
            name: channelName,
             type: 0, // GuildText
            parent: categoryId,
            permissionOverwrites
        });

        // Save to DB
        const ticket = await Ticket.create({
            ticketId: newTicketId,
            userId: interaction.user.id,
            channelId: channel.id,
            guildId: interaction.guild.id,
            ticketType: panelId,
            status: 'open',
            createdAt: Date.now(),
            messages: [],
            attachments: []
        });

        // Send Embed
        const embed = new EmbedBuilder()
            .setTitle(panel.embed.title || 'Support Ticket')
            .setDescription(replacePlaceholders(panel.embed.description || 'Welcome {user}', { user: `<@${interaction.user.id}>` }))
            .setColor(panel.embed.color || 'Green');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket_close_${newTicketId}`)
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        const msg = await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
        ticket.firstMessageId = msg.id;
        await ticket.save();

        return reply(interaction, { content: `✅ Ticket created: ${channel}`, flags: MessageFlags.Ephemeral });

    } catch (err) {
        console.error(err);
        return reply(interaction, { content: '❌ Failed to create ticket channel.', flags: MessageFlags.Ephemeral });
    }
}

async function handleTicketClose(client, interaction, ticketId, guildData) {
    const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
    if (!ticket) return reply(interaction, { content: '❌ Ticket not found in DB.', flags: MessageFlags.Ephemeral });

    // Close logic
    ticket.status = 'closed';
    ticket.closedAt = Date.now();
    ticket.closeReason = 'User Request'; // Simplified
    await ticket.save();

    await reply(interaction, { content: '🔒 Ticket Closed. Deleting in 5 seconds...' });
    
    // Transcript generation could go here
    
    setTimeout(async () => {
        const channel = interaction.channel;
        if (channel) {
             // Generate Transcript
             await sendTranscript(client, interaction, ticket, guildData);
             await channel.delete().catch(() => {});
        }
    }, 5000);
}

async function sendTranscript(client, interaction, ticket, guildData) {
     const channel = interaction.channel;
     if (!channel) return;

     const messages = await channel.messages.fetch({ limit: 100 });
     const transcriptContent = messages
        .filter(m => !m.author.bot)
        .map(m => `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content}`)
        .reverse()
        .join('\n');

     if (!transcriptContent) return;

     const attachment = new AttachmentBuilder(Buffer.from(transcriptContent), { name: `transcript-${ticket.ticketId}.txt` });
     
     const logChannelId = guildData.ticketSystem.configuration.transcriptChannelId;
     if (logChannelId) {
         const logChannel = interaction.guild.channels.cache.get(logChannelId);
         if (logChannel) {
             await logChannel.send({ 
                 content: `Transcript for Ticket #${ticket.ticketId} (User: <@${ticket.userId}>)`, 
                 files: [attachment] 
            });
         }
     }
}

module.exports = {
    createTicket,
    handleTicketClose,
    generateUniqueTicketId,
    parseDuration
};
