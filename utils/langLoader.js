const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const GuildSettings = require('../models/GuildSettings');

const langCache = new Map();
const musicLangCache = new Map();

const util = require('util');

// Music language code mapping (Music uses 'vi' instead of 'vn')
const MUSIC_LANG_MAP = {
    'vn': 'vi',
    'en': 'en',
    'jp': 'ja' // Will be created
};

/**
 * Load Music language JSON file
 * @param {String} musicCode - Music language code (vi, en, ja)
 * @returns {Object|null} - Music language object or null
 */
function loadMusicLangFile(musicCode) {
    if (musicLangCache.has(musicCode)) {
        return musicLangCache.get(musicCode);
    }

    try {
        const musicLangPath = path.join(__dirname, 'Music', 'languages', `${musicCode}.json`);

        if (!fs.existsSync(musicLangPath)) {
            console.warn(`[LangLoader] Music language file not found: ${musicCode}.json`);
            return null;
        }

        const content = fs.readFileSync(musicLangPath, 'utf8');
        const musicLang = JSON.parse(content);

        musicLangCache.set(musicCode, musicLang);
        return musicLang;
    } catch (error) {
        console.error(`[LangLoader] Error loading Music language ${musicCode}:`, error.message);
        return null;
    }
}

function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    Object.assign(target || {}, source);
    return target;
}

function loadLangFile(langCode) {
    if (langCache.has(langCode)) {
        return langCache.get(langCode);
    }
    try {
        const filePath = path.join(__dirname, '../lang', `${langCode}.yml`);
        let data = {};
        if (fs.existsSync(filePath)) {
            const fileContents = fs.readFileSync(filePath, 'utf8');
            data = yaml.load(fileContents) || {};
        }

        // Always load default 'vn' as base and merge
        if (langCode !== 'vn') {
             const baseData = loadLangFile('vn');
             // Deep clone base so we don't mutate cache
             const baseClone = JSON.parse(JSON.stringify(baseData));
             // Basic deep merge (optional, usually specific libraries do better but for simple config this is okay-ish or just simple spread if structure is flat)
             // Using simple spread for now? No, lang files are nested.
             // Let's implement a simple recursive merge or just rely on 'vn' having all keys.
             // Actually, the simplest robustness is: if key missing in data, use baseData. However, JS objects don't work like prototype chains for this easily without Proxy.
             // Safer bet: Merge data ON TOP OF baseClone.

             // Simple recursive merge helper above
             // Actually, lodash.defaultsDeep is best but I can't install new pkgs easily.
             // Let's assume standard structure.

             // Better strategy:
             // 1. Load 'vn' completely.
             // 2. Load 'target'.
             // 3. Merge target into vn (create a new object).

             const merged = { ...baseClone };

             // Helper to merge objects recursively
             const mergeRecursive = (obj1, obj2) => {
                for (var p in obj2) {
                    try {
                    if ( obj2[p].constructor==Object ) {
                        obj1[p] = mergeRecursive(obj1[p], obj2[p]);
                    } else {
                        obj1[p] = obj2[p];
                    }
                    } catch(e) {
                    obj1[p] = obj2[p];
                    }
                }
                return obj1;
             }

             data = mergeRecursive(merged, data);
        }

        // Load and merge Music translations
        const musicCode = MUSIC_LANG_MAP[langCode] || 'vi';
        const musicLang = loadMusicLangFile(musicCode);

        if (musicLang) {
            // Add Music translations under 'MusicSystem' key
            data.MusicSystem = musicLang;
        } else if (langCode !== 'vn') {
            // Fallback to Vietnamese Music translations
            const fallbackMusicLang = loadMusicLangFile('vi');
            if (fallbackMusicLang) {
                data.MusicSystem = fallbackMusicLang;
            }
        }

        // Add metadata
        data.code = langCode;
        data.musicCode = musicCode;

        langCache.set(langCode, data);
        return data;
    } catch (error) {
        console.error(`[LangLoader] Failed to load language file for ${langCode}:`, error);
        // Fallback to 'vn' if absolute failure and not already recursive
        if (langCode !== 'vn') return loadLangFile('vn');
        return {};
    }
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

function reloadLangCache() {
    langCache.clear();
    musicLangCache.clear();
    return true;
}

/**
 * Translates an item name from Vietnamese (DB format) to the target language.
 * @param {String} itemName - The item name to translate
 * @param {Object} langObj - The loaded language object
 * @returns {String} - The translated name, or the original if not found
 */
function translateItem(itemName, langObj) {
    if (!langObj || !itemName) return itemName;

    const normalizedItemName = String(itemName);
    const storeItems = langObj?.Economy?.Other?.Store?.Items;

    if (storeItems?.[normalizedItemName]) {
        return storeItems[normalizedItemName];
    }

    // Some records store lowercase keys (e.g. "tap_su") while others store display names.
    if (storeItems) {
        const lowerName = normalizedItemName.toLowerCase();
        const matchedKey = Object.keys(storeItems).find(k => k.toLowerCase() === lowerName);
        if (matchedKey) {
            return storeItems[matchedKey];
        }
    }

    // Unified dictionary used by fishing/farming/daily rewards.
    if (langObj?.RPGItems?.[normalizedItemName]) {
        return langObj.RPGItems[normalizedItemName];
    }

    if (langObj?.Addons?.Farming?.Items?.[normalizedItemName]) {
        return langObj.Addons.Farming.Items[normalizedItemName];
    }

    if (langObj?.Addons?.Fishing?.Items?.[normalizedItemName]) {
        return langObj.Addons.Fishing.Items[normalizedItemName];
    }

    return normalizedItemName;
}

module.exports = { getLang, getLangSync, translateItem, reloadLangCache };
