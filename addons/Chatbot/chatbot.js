const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configLoader');
const { loadLang } = require('../../utils/langLoader');

function getApiKey() {
    const cfg = getConfig() || {};
    // Prefer environment variable
    return process.env.GEMINI_API_KEY
        || cfg?.API_Keys?.Gemini?.ApiKey
        || cfg?.API_Keys?.Google?.GeminiApiKey
        || null;
}

function getModel() {
    const cfg = getConfig() || {};
    return process.env.GEMINI_MODEL
        || cfg?.AI?.Gemini?.Model
        || 'gemini-2.0-flash-exp';
}

function chunkText(text, size = 1900) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + size));
        i += size;
    }
    return chunks;
}

async function callGemini(apiKey, model, prompt) {
    // Gemini Responses API (generateContent)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = {
        contents: [
            {
                role: 'user',
                parts: [{ text: prompt }]
            }
        ]
    };
    const res = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
        validateStatus: s => s >= 200 && s < 300
    });
    const candidates = res.data?.candidates || [];
    const parts = candidates[0]?.content?.parts || [];
    const text = parts.map(p => p.text).filter(Boolean).join('\n');
    return text || '(Không có phản hồi)';
}

function createLoadingEmbed(prompt, chatbotLang) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2') // Discord blurple
        .setTitle(chatbotLang.UI.ThinkingTitle)
        .setDescription(chatbotLang.UI.ThinkingDesc.replace('{prompt}', prompt.length > 200 ? prompt.substring(0, 200) + '...' : prompt))
        .setFooter({ text: chatbotLang.UI.ThinkingFooter })
        .setTimestamp();
    return embed;
}

function createSuccessEmbed(prompt, reply, model, responseTime, chatbotLang) {
    const charCount = reply.length;
    const embed = new EmbedBuilder()
        .setColor('#5865F2') // Discord blurple cho AI
        .setAuthor({
            name: 'Gemini AI Assistant',
            iconURL: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg'
        })
        .setTitle(chatbotLang.UI.ResponseTitle)
        .setDescription(reply.length > 4000 ? reply.substring(0, 4000) + '...' : reply)
        .setFooter({
            text: chatbotLang.UI.ResponseFooter
                .replace('{model}', model)
                .replace('{time}', responseTime)
                .replace('{chars}', charCount)
        })
        .setTimestamp();

    return embed;
}

function createErrorEmbed(errorType, message, chatbotLang) {
    const embed = new EmbedBuilder()
        .setColor('#ED4245') // Discord red
        .setTitle(chatbotLang.Errors.Unknown)
        .setDescription(message)
        .setTimestamp();

    // Add specific emoji based on error type
    if (errorType === 'config') {
        embed.setAuthor({ name: 'Config Error' });
    } else if (errorType === 'api') {
        embed.setAuthor({ name: 'API Error' });
    } else if (errorType === 'auth') {
        embed.setAuthor({ name: 'Auth Error' });
    } else {
        embed.setAuthor({ name: 'Error' });
    }

    return embed;
}

async function handleChatbot(interaction, prompt, options = {}) {
    const ephemeral = !!options.ephemeral;
    const lang = loadLang(interaction.guild.id);
    const chatbotLang = lang.Addons.Chatbot;

    // Show loading embed
    const loadingEmbed = createLoadingEmbed(prompt, chatbotLang);
    await interaction.deferReply({ ephemeral });
    await interaction.editReply({ embeds: [loadingEmbed] });

    const apiKey = getApiKey();
    if (!apiKey) {
        const errorEmbed = createErrorEmbed('config',
            chatbotLang.Errors.Config,
            chatbotLang
        );
        return interaction.editReply({ embeds: [errorEmbed] });
    }
    const model = getModel();

    try {
        const startTime = Date.now();
        const reply = await callGemini(apiKey, model, prompt);
        const endTime = Date.now();
        const responseTime = ((endTime - startTime) / 1000).toFixed(2);

        // If very long, send in chunks
        const chunks = chunkText(reply, 4000); // Use 4000 for embed description limit

        if (chunks.length === 1) {
            // Single response - use beautiful embed
            const successEmbed = createSuccessEmbed(prompt, chunks[0], model, responseTime, chatbotLang);
            await interaction.editReply({ embeds: [successEmbed] });
        } else {
            // Multiple chunks - first one in embed, rest as text
            const successEmbed = createSuccessEmbed(prompt, chunks[0], model, responseTime, chatbotLang);
            await interaction.editReply({ embeds: [successEmbed] });

            for (let i = 1; i < chunks.length; i++) {
                const continueEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setDescription(chunks[i])
                    .setFooter({ text: `Part ${i + 1}/${chunks.length}` });
                await interaction.followUp({ embeds: [continueEmbed], ephemeral });
            }
        }
    } catch (err) {
        console.error('Gemini API error:', err?.response?.data || err.message || err);
        const status = err?.response?.status;
        let errorEmbed;

        if (status === 404 || status === 400) {
            errorEmbed = createErrorEmbed('api',
                chatbotLang.Errors.API,
                chatbotLang
            );
        } else if (status === 401 || status === 403) {
            errorEmbed = createErrorEmbed('auth',
                chatbotLang.Errors.Auth,
                chatbotLang
            );
        } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
            errorEmbed = createErrorEmbed('api',
                chatbotLang.Errors.Timeout,
                chatbotLang
            );
        } else {
            errorEmbed = createErrorEmbed('unknown',
                chatbotLang.Errors.Unknown,
                chatbotLang
            );
        }

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

module.exports = { handleChatbot };
