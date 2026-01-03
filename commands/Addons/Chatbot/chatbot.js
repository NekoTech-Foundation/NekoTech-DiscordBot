const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../../../utils/configLoader');
const { getLang } = require('../../../utils/langLoader');

function getApiKey() {
    const cfg = getConfig() || {};
    // Priority: Env Var -> API_Keys.Gemini.ApiKey -> AI.Gemini.ApiKey (Old fallback)
    return process.env.GEMINI_API_KEY
        || cfg?.API_Keys?.Gemini?.ApiKey
        || cfg?.AI?.Gemini?.ApiKey
        || null;
}

function getModel() {
    const cfg = getConfig() || {};
    return process.env.GEMINI_MODEL
        || cfg?.AI?.Gemini?.Model
        || 'gemini-2.0-flash-exp';
}

/**
 * Smartly splits text into chunks, respecting code blocks and paragraphs.
 * Prevents splitting inside a code block (```...```).
 */
function smartChunk(text, limit = 4000) {
    if (text.length <= limit) return [text];

    const chunks = [];
    let currentChunk = '';
    let inCodeBlock = false;

    // Split by newlines to preserve structure
    const lines = text.split('\n');

    for (const line of lines) {
        // Toggle code block state
        if (line.trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
        }

        // Potential length if we add this line
        // +1 for newline character
        const potentialLength = currentChunk.length + line.length + 1;

        if (potentialLength <= limit) {
            currentChunk += (currentChunk ? '\n' : '') + line;
        } else {
            // Needed to split
            
            // If we are inside a code block, we must close it in current chunk 
            // and reopen it in next chunk to prevent broken formatting
            if (inCodeBlock) {
                // Find language of code block if possible (naive check for now)
                // For valid markdown, the first line of code block usually has lang
                // But tracking that is complex.
                // Simple fix: Close with ``` and start next with ```
                currentChunk += '\n```';
                chunks.push(currentChunk);
                currentChunk = '```\n' + line;
            } else {
                chunks.push(currentChunk);
                currentChunk = line;
            }
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

async function callGemini(apiKey, model, prompt) {
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
        timeout: 60000, // 60s timeout
        validateStatus: s => s >= 200 && s < 300
    });
    const candidates = res.data?.candidates || [];
    const parts = candidates[0]?.content?.parts || [];
    const text = parts.map(p => p.text).filter(Boolean).join('\n');
    return text || '(Không có phản hồi)';
}

function createLoadingEmbed(prompt, chatbotLang) {
    return new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(chatbotLang.UI.ThinkingTitle)
        .setDescription(chatbotLang.UI.ThinkingDesc.replace('{prompt}', prompt.length > 200 ? prompt.substring(0, 200) + '...' : prompt))
        .setFooter({ text: chatbotLang.UI.ThinkingFooter })
        .setTimestamp();
}

function createSuccessEmbed(prompt, reply, model, responseTime, chatbotLang) {
    const charCount = reply.length;
    return new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({
            name: 'Gemini AI Assistant',
            iconURL: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg'
        })
        .setTitle(chatbotLang.UI.ResponseTitle)
        .setDescription(reply) // Reply is already chunked
        .setFooter({
            text: chatbotLang.UI.ResponseFooter
                .replace('{model}', model)
                .replace('{time}', responseTime)
                .replace('{chars}', charCount)
        })
        .setTimestamp();
}

function createErrorEmbed(errorType, message, chatbotLang) {
    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle(chatbotLang.Errors.Unknown || 'Error')
        .setDescription(message)
        .setTimestamp();

    if (errorType === 'config') embed.setAuthor({ name: 'Configuration Error' });
    else if (errorType === 'api') embed.setAuthor({ name: 'API Error' });
    else if (errorType === 'auth') embed.setAuthor({ name: 'Authentication Error' });
    else embed.setAuthor({ name: 'System Error' });

    return embed;
}

async function handleChatbot(interaction, prompt, options = {}) {
    const ephemeral = !!options.ephemeral;
    const lang = await getLang(interaction.guild.id);
    const chatbotLang = lang.Addons.Chatbot;

    // Initial Loading
    await interaction.deferReply({ ephemeral });
    await interaction.editReply({ embeds: [createLoadingEmbed(prompt, chatbotLang)] });

    // Config Check
    const apiKey = getApiKey();
    if (!apiKey) {
        return interaction.editReply({ 
            embeds: [createErrorEmbed('config', chatbotLang.Errors.Config || 'API Key not configured in config.yml (API_Keys.Gemini.ApiKey)', chatbotLang)] 
        });
    }

    const model = getModel();

    try {
        const startTime = Date.now();
        const fullReply = await callGemini(apiKey, model, prompt);
        const endTime = Date.now();
        const responseTime = ((endTime - startTime) / 1000).toFixed(2);

        // Smart Chunking
        const chunks = smartChunk(fullReply, 4000);

        // Send first chunk (Editing the loading message)
        const firstEmbed = createSuccessEmbed(prompt, chunks[0], model, responseTime, chatbotLang);
        await interaction.editReply({ embeds: [firstEmbed] });

        // Send remaining chunks as follow-ups
        for (let i = 1; i < chunks.length; i++) {
            const followUpEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setDescription(chunks[i])
                .setFooter({ text: `Part ${i + 1}/${chunks.length}` });
            await interaction.followUp({ embeds: [followUpEmbed], ephemeral });
        }

    } catch (err) {
        console.error('Gemini API Error:', err.response?.data || err.message);
        
        const status = err.response?.status;
        let errorMsg = chatbotLang.Errors.Unknown;
        let type = 'unknown';

        if (status === 400) { errorMsg = 'Bad Request (Check your prompt)'; type = 'api'; }
        else if (status === 401) { errorMsg = 'Invalid API Key'; type = 'auth'; }
        else if (status === 429) { errorMsg = 'Rate Limit Exceeded'; type = 'api'; }
        else if (status === 503) { errorMsg = 'Service Unavailable'; type = 'api'; }
        
        await interaction.editReply({ embeds: [createErrorEmbed(type, errorMsg, chatbotLang)] });
    }
}

module.exports = { handleChatbot };
