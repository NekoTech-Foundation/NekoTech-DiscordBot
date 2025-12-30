const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

/**
 * Standardized Error Handler
 * @param {Error} error The error object
 * @param {Object} context The interaction or message object
 * @param {Object} [lang] The language object (optional)
 */
async function handleError(error, context, lang = global.lang) {
    try {
        console.error(error);

        const errorStack = error.stack || error.message || String(error);
        const cleanError = errorStack.length > 1900 ? errorStack.substring(0, 1900) + '...' : errorStack;

        // Safety check for lang
        const errorTitle = lang?.Errors?.Generic || "An error occurred while executing the command.";
        const reportLabel = lang?.Errors?.ReportButton || "Report Error";
        const supportLabel = lang?.Errors?.SupportServerButton || "Support Server";

        // Simplified Text Error (User Request)
        const content = `❌ **${errorTitle}**\n\`\`\`diff\n- ${cleanError}\n\`\`\``;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel(reportLabel)
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/96hgDj4b4j'),
                new ButtonBuilder()
                    .setLabel(supportLabel)
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://dsc.gg/nekocomics')
            );

        const isSlash = !!context.commandName && !!context.options; 

        if (isSlash) {
            if (context.replied || context.deferred) {
                await context.followUp({ content, components: [row], ephemeral: true }).catch(() => {});
            } else {
                await context.reply({ content, components: [row], ephemeral: true }).catch(() => {});
            }
        } else {
            // Text Command
            await context.reply({ content, components: [row] }).catch((err) => {
                console.error('Failed to reply with error:', err);
                context.channel.send({ content, components: [row] }).catch(() => {});
            });
        }
    } catch (err) {
        console.error('CRITICAL: Failed to handle error:', err);
    }
}

module.exports = { handleError };
