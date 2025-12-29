const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const GuildSettings = require('../models/GuildSettings');

const langCache = new Map();

function loadLangFile(langCode) {
    if (langCache.has(langCode)) {
        return langCache.get(langCode);
    }
    try {
        const filePath = path.join(__dirname, '../lang', `${langCode}.yml`);
        if (fs.existsSync(filePath)) {
            const fileContents = fs.readFileSync(filePath, 'utf8');
            const data = yaml.load(fileContents);
            langCache.set(langCode, data);
            return data;
        }
    } catch (error) {
        console.error(`[LangLoader] Failed to load language file for ${langCode}:`, error);
    }
    // Fallback to 'vn' if load fails
    if (langCode !== 'vn') return loadLangFile('vn');
    return {};
}

async function getLang(guildId) {
    if (!guildId) return loadLangFile('vn'); // Default for DM or no guild
    
    // Try to get from GuildSettings
    const settings = await GuildSettings.findOne({ guildId });
    const langCode = settings ? settings.language : 'vn';
    return loadLangFile(langCode);
}

// Sync helper if needed (e.g. for startup)
function getLangSync(langCode) {
    return loadLangFile(langCode || 'vn');
}

module.exports = { getLang, getLangSync };
