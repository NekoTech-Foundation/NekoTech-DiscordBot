const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

/**
 * Standardized Error Handler
 * @param {Error} error The error object
 * @param {Object} context The interaction or message object
 */
async function handleError(error, context) {
    console.error(error);

    const errorStack = error.stack || error.message || String(error);
    const cleanError = errorStack.length > 1900 ? errorStack.substring(0, 1900) + '...' : errorStack;

    const content = `❌ **${global.lang.Errors.Generic}**\n\n\`\`\`js\n${cleanError}\n\`\`\``;

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel(global.lang.Errors.ReportButton)
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/96hgDj4b4j'),
            new ButtonBuilder()
                .setLabel(global.lang.Errors.SupportServerButton)
                .setStyle(ButtonStyle.Link)
                .setURL('https://dsc.gg/nekocomics')
        );

    try {
        // Check if context is an Interaction (Slash Command) or Message (Text Command)
        const isInteraction = context.isRepliable ? context.isRepliable() : false; // context.isRepliable valid check for interaction? No, check property
        // Better check:
        const isSlash = !!context.commandName && !!context.options; 

        if (isSlash) {
            if (context.replied || context.deferred) {
                await context.followUp({ content, components: [row], ephemeral: true });
            } else {
                await context.reply({ content, components: [row], ephemeral: true });
            }
        } else {
            // Text Command (Message)
            // context is message object
             await context.reply({ content, components: [row] });
        }
    } catch (err) {
        console.error('Failed to send error message:', err);
    }
}

module.exports = { handleError };
