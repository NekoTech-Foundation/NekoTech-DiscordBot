const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configLoader');

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
        || 'gemini-2.5-flash';
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
        timeout: 20000,
        validateStatus: s => s >= 200 && s < 300
    });
    const candidates = res.data?.candidates || [];
    const parts = candidates[0]?.content?.parts || [];
    const text = parts.map(p => p.text).filter(Boolean).join('\n');
    return text || '(Không có phản hồi)';
}

async function handleChatbot(interaction, prompt, options = {}) {
    const ephemeral = !!options.ephemeral;
    await interaction.deferReply({ ephemeral });

    const apiKey = getApiKey();
    if (!apiKey) {
        return interaction.editReply('Thiếu GEMINI_API_KEY. Vui lòng cấu hình trong .env hoặc config.yml.');
    }
    const model = getModel();

    try {
        const reply = await callGemini(apiKey, model, prompt);

        // If very long, send in chunks as follow-ups
        const chunks = chunkText(reply);
        if (chunks.length === 1) {
            await interaction.editReply(chunks[0]);
        } else {
            await interaction.editReply(chunks[0]);
            for (let i = 1; i < chunks.length; i++) {
                await interaction.followUp({ content: chunks[i], ephemeral });
            }
        }
    } catch (err) {
        console.error('Gemini API error:', err?.response?.data || err.message || err);
        const status = err?.response?.status;
        if (status === 404 || status === 400) {
            await interaction.editReply('Model không hợp lệ hoặc API thay đổi. Hãy kiểm tra tên model trong cấu hình.');
        } else if (status === 401 || status === 403) {
            await interaction.editReply('API key không hợp lệ hoặc không có quyền.');
        } else {
            await interaction.editReply('Đã xảy ra lỗi khi gọi AI. Vui lòng thử lại sau.');
        }
    }
}

module.exports = { handleChatbot };

