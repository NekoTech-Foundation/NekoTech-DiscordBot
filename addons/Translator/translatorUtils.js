const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const config = yaml.load(fs.readFileSync(path.join(__dirname, 'config.yml'), 'utf8'));

function validateLanguage(lang) {
    lang = lang.toLowerCase();
    if (config.languages[lang]) return lang;
    const code = Object.entries(config.languages)
        .find(([_, name]) => name.toLowerCase() === lang)?.[0];
    return code || null;
}

async function translateText(text, targetLang, sourceLang = 'auto') {
    const validTarget = validateLanguage(targetLang);
    if (!validTarget) return null;

    const validSource = sourceLang === 'auto' ? 'auto' : validateLanguage(sourceLang);
    if (!validSource) return null;

    try {
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${validSource}&tl=${validTarget}&dt=t&q=${encodeURIComponent(text)}`);
        const data = await response.json();
        return data[0][0][0];
    } catch {
        return null;
    }
}

function createTranslationEmbed(original, translated, fromLang, toLang) {
    const embed = new EmbedBuilder()
        .addFields(
            { name: `Ngôn ngữ nguyên bản (${fromLang})`, value: original },
            { name: `Ngôn ngữ đích (${toLang})`, value: translated }
        );

    if (config.embed?.color) embed.setColor(config.embed.color);

    if (config.embed?.footer?.enabled) {
        const footer = {};
        if (config.embed.footer.text) footer.text = config.embed.footer.text;
        if (config.embed.footer.icon) footer.iconURL = config.embed.footer.icon;
        if (Object.keys(footer).length) embed.setFooter(footer);
    }

    if (config.embed?.timestamp) embed.setTimestamp();

    return embed;
}

module.exports = {
    validateLanguage,
    translateText,
    createTranslationEmbed
};