const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const { startBypass, getBypassResult } = require('./bypassUtils');

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

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bypass')
        .setDescription('Bypasses a shortlink using the meobypass.click API.')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The shortlink URL to bypass.')
                .setRequired(true)),

    async execute(interaction) {
        if (!config || !config.api_key) {
            return interaction.reply({ content: 'Lỗi: Không thể tải tệp cấu hình `config.yml` của addon Bypass hoặc thiếu API key.', ephemeral: true });
        }

        const urlToBypass = interaction.options.getString('url');
        const apiKey = config.api_key;

        try {
            // 1. Initial response
            await interaction.reply({ content: '⏳ Đang xử lý yêu cầu bypass...', ephemeral: true });

            // 2. Start the bypass process
            const startResponse = await startBypass(urlToBypass, apiKey);

            // Enhanced error handling - Check for error status
            if (startResponse.status === 'error') {
                const errorMsg = startResponse.message || startResponse.msg || 'Lỗi không xác định từ API';
                throw new Error(`API trả về lỗi: ${errorMsg}`);
            }

            if (startResponse.status !== 'pending') {
                const errorMessage = startResponse.message || startResponse.msg || startResponse.status;
                throw new Error(`API trả về trạng thái không mong muốn: ${errorMessage}`);
            }

            if (!startResponse.task_id) {
                throw new Error('API không trả về task_id.');
            }

            const taskId = startResponse.task_id;
            const queuePos = startResponse.queue_position || 'N/A';
            await interaction.editReply({ 
                content: `⏳ Yêu cầu của bạn đã được nhận!\n📋 Task ID: \`${taskId}\`\n📍 Vị trí trong hàng đợi: ${queuePos}\nVui lòng đợi...` 
            });

            // 3. Poll for the result
            let resultResponse;
            const maxAttempts = 20; // Poll for 20 * 5 = 100 seconds max
            for (let i = 0; i < maxAttempts; i++) {
                await delay(5000); // Wait 5 seconds between polls
                resultResponse = await getBypassResult(taskId);

                if (resultResponse.status === 'success') {
                    break; // Exit loop if successful
                } else if (resultResponse.status === 'error' || resultResponse.status === 'failed') {
                    const errorMsg = resultResponse.message || resultResponse.msg || 'Bypass thất bại';
                    throw new Error(`Bypass thất bại: ${errorMsg}`);
                } else if (resultResponse.status !== 'pending' && resultResponse.status !== 'processing') {
                    throw new Error(`API trả về trạng thái lỗi: ${resultResponse.status}`);
                }
                // If still pending or processing, the loop continues
            }

            // 4. Send the final result
            if (resultResponse && resultResponse.status === 'success') {
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Bypass Thành Công!')
                    .setDescription('Link của bạn đã được bypass thành công.')
                    .addFields(
                        { name: 'Link Gốc', value: `\`\`\`${urlToBypass}\`\`\`` },
                        { name: 'Link Đã Bypass', value: `\`\`\`${resultResponse.result}\`\`\`` },
                        { name: 'Thời gian xử lý', value: `${resultResponse.time || 'N/A'} giây` }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Powered by meobypass.click' });

                await interaction.editReply({ content: '', embeds: [embed] });
            } else {
                throw new Error('Không thể lấy kết quả bypass sau một khoảng thời gian. Vui lòng thử lại.');
            }

        } catch (error) {
            console.error('Bypass command error:', error);
            
            // More detailed error message
            let errorDescription = error.message || 'Đã xảy ra lỗi không xác định.';
            
            // Add helpful suggestions based on error type
            if (errorDescription.includes('API key')) {
                errorDescription += '\n\n💡 **Gợi ý:** Kiểm tra lại API key trong file `config.yml`';
            } else if (errorDescription.includes('URL')) {
                errorDescription += '\n\n💡 **Gợi ý:** Đảm bảo URL là shortlink hợp lệ và được hỗ trợ';
            }

            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Bypass Thất Bại')
                .setDescription(errorDescription)
                .addFields(
                    { name: 'URL đã thử', value: `\`${urlToBypass}\`` }
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