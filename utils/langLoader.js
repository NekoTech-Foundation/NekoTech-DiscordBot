const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const GuildSettings = require('../models/GuildSettings');

const langCache = new Map();

const util = require('util');

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

module.exports = { getLang, getLangSync };
