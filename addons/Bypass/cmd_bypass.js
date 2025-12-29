const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const { startBypass, getBypassResult } = require('./bypassUtils');
const { loadLang } = require('../../utils/langLoader');

// Function to load config
function loadConfig() {
    try {
        const configPath = path.join(__dirname, 'config.yml');
        const configFile = fs.readFileSync(configPath, 'utf8');
        return yaml.load(configFile);
    } catch (error) {
        console.error('Failed to load Bypass config.yml:', error);
        return null;
    }
}

const config = loadConfig();

// Helper function for delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bypass')
        .setDescription('🚀 Bỏ qua link rút gọn (Bypass)')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('🔗 Link cần bypass')
                .setRequired(true)),
    async execute(interaction) {
        const urlToBypass = interaction.options.getString('url');
        const apiKey = config.api_key;
        const lang = loadLang(interaction.guild.id);
        const bypassLang = lang.Addons.Bypass;

        try {
            // 1. Initial response
            await interaction.reply({ content: bypassLang.UI.Processing, ephemeral: true });

            // 2. Start the bypass process
            const startResponse = await startBypass(urlToBypass, apiKey);

            // Enhanced error handling - Check for error status
            if (startResponse.status === 'error') {
                const errorMsg = startResponse.message || startResponse.msg || bypassLang.Errors.Unknown;
                throw new Error(bypassLang.Errors.Failed.replace('{error}', errorMsg));
            }

            if (startResponse.status !== 'pending') {
                const errorMessage = startResponse.message || startResponse.msg || startResponse.status;
                throw new Error(bypassLang.Errors.UnexpectedStatus.replace('{status}', errorMessage));
            }

            if (!startResponse.task_id) {
                throw new Error(bypassLang.Errors.NoTaskId);
            }

            const taskId = startResponse.task_id;
            const queuePos = startResponse.queue_position || 'N/A';
            await interaction.editReply({
                content: bypassLang.UI.Received.replace('{taskId}', taskId).replace('{queue}', queuePos)
            });

            // 3. Poll for the result
            let resultResponse;
            const maxAttempts = 30; // Poll for 30 * 5 = 150 seconds max
            for (let i = 0; i < maxAttempts; i++) {
                await delay(5000); // Wait 5 seconds between polls

                try {
                    resultResponse = await getBypassResult(taskId);
                } catch (pollError) {
                    console.error(`Poll attempt ${i + 1} failed:`, pollError);
                    // Continue polling even if one request fails
                    continue;
                }

                // Update user every 30 seconds (every 6 attempts)
                if (i > 0 && i % 6 === 0) {
                    await interaction.editReply({
                        content: bypassLang.UI.StillProcessing
                            .replace('{current}', i * 5)
                            .replace('{max}', maxAttempts * 5)
                            .replace('{taskId}', taskId)
                            .replace('{status}', resultResponse?.status || 'pending')
                    });
                }

                if (resultResponse?.status === 'success') {
                    break; // Exit loop if successful
                } else if (resultResponse?.status === 'error' || resultResponse?.status === 'failed') {
                    const errorMsg = resultResponse.message || resultResponse.msg || 'Error';
                    throw new Error(bypassLang.Errors.Failed.replace('{error}', errorMsg));
                } else if (resultResponse?.status && resultResponse.status !== 'pending' && resultResponse.status !== 'processing') {
                    console.warn(`Unexpected status: ${resultResponse.status}`, resultResponse);
                    // Don't throw error immediately, continue polling
                }
                // If still pending or processing, the loop continues
            }

            // 4. Send the final result
            if (resultResponse && resultResponse.status === 'success') {
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle(bypassLang.UI.SuccessTitle)
                    .setDescription(bypassLang.UI.SuccessDesc)
                    .addFields(
                        { name: bypassLang.UI.OriginalLink, value: `\`\`\`${urlToBypass}\`\`\`` },
                        { name: bypassLang.UI.BypassedLink, value: `\`\`\`${resultResponse.result}\`\`\`` },
                        { name: bypassLang.UI.ProcessTime, value: `${resultResponse.time || 'N/A'}s` }
                    )
                    .setTimestamp()
                    .setFooter({ text: bypassLang.UI.Footer });

                await interaction.editReply({ content: '', embeds: [embed] });
            } else {
                // Provide more detailed timeout error
                const statusInfo = resultResponse?.status ? `\nStatus: ${resultResponse.status}` : '';
                throw new Error(bypassLang.Errors.Timeout.replace('{time}', maxAttempts * 5).replace('{status}', statusInfo));
            }

        } catch (error) {
            console.error('Bypass command error:', error);

            // More detailed error message
            let errorDescription = error.message || bypassLang.Errors.Generic;

            // Add helpful suggestions based on error type
            if (errorDescription.includes('API key')) {
                errorDescription += bypassLang.Errors.ApiKeyHint;
            } else if (errorDescription.includes('URL')) {
                errorDescription += bypassLang.Errors.UrlHint;
            }

            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle(bypassLang.UI.FailTitle)
                .setDescription(errorDescription)
                .addFields(
                    { name: bypassLang.UI.TriedUrl, value: `\`${urlToBypass}\`` }
                )
                .setTimestamp();

            // Use editReply if possible, otherwise followUp
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: '', embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};