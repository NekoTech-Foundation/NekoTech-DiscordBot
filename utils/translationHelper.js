/**
 * Translation Helper Utilities
 * Provides helper functions for working with the multi-language system
 */

const { getLang } = require('./langLoader');

/**
 * Get nested value from lang object using dot notation
 * @param {Object} lang - Language object
 * @param {String} key - Dot-notation key (e.g., "Economy.Bank.Title")
 * @param {String} [fallback] - Optional fallback text if key not found
 * @returns {*} - The value at the key, or fallback, or the key itself
 */
function t(lang, key, fallback = null) {
    try {
        const keys = key.split('.');
        let value = lang;

        for (const k of keys) {
            if (value === undefined || value === null) {
                if (fallback !== null) return fallback;
                console.warn(`[Translation] Missing key: ${key}`);
                return key; // Return key as fallback
            }
            value = value[k];
        }

        if (value === undefined || value === null) {
            if (fallback !== null) return fallback;
            console.warn(`[Translation] Missing key: ${key}`);
            return key;
        }

        return value;
    } catch (error) {
        console.error(`[Translation] Error accessing key: ${key}`, error);
        return fallback !== null ? fallback : key;
    }
}

/**
 * Get nested value and replace placeholders
 * @param {Object} lang - Language object
 * @param {String} key - Dot-notation key
 * @param {Object} [replacements={}] - Object with placeholder replacements
 * @param {String} [fallback] - Optional fallback text
 * @returns {String} - Translated text with replaced placeholders
 *
 * @example
 * tr(lang, 'Economy.Messages.transfer', { amount: 1000, target: 'User#1234' })
 * // Returns: "You transferred 1000 to User#1234"
 */
function tr(lang, key, replacements = {}, fallback = null) {
    let text = t(lang, key, fallback);

    if (typeof text !== 'string') {
        // If it's an array, join with newlines
        if (Array.isArray(text)) {
            text = text.join('\n');
        } else {
            console.warn(`[Translation] Key "${key}" is not a string or array:`, typeof text);
            return String(text);
        }
    }

    // Replace all placeholders
    for (const [placeholder, value] of Object.entries(replacements)) {
        const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
        text = text.replace(regex, String(value));
    }

    return text;
}

/**
 * Get random item from an array translation key
 * @param {Object} lang - Language object
 * @param {String} key - Dot-notation key pointing to an array
 * @param {Object} [replacements={}] - Placeholder replacements
 * @returns {String} - Random item from array with replacements
 *
 * @example
 * // If lang.Fun.Kill.Scenarios is an array of kill scenarios
 * trandom(lang, 'Fun.Kill.Scenarios', { user: 'Bob', target: 'Alice' })
 */
function trandom(lang, key, replacements = {}) {
    const value = t(lang, key);

    if (!Array.isArray(value)) {
        console.warn(`[Translation] Key "${key}" is not an array`);
        return tr(lang, key, replacements);
    }

    if (value.length === 0) {
        console.warn(`[Translation] Key "${key}" is an empty array`);
        return '';
    }

    const randomItem = value[Math.floor(Math.random() * value.length)];

    // Apply replacements
    let text = String(randomItem);
    for (const [placeholder, val] of Object.entries(replacements)) {
        const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
        text = text.replace(regex, String(val));
    }

    return text;
}

/**
 * Get language object for a guild
 * @param {String} guildId - Guild ID
 * @returns {Promise<Object>} - Language object
 */
async function getLangFor(guildId) {
    return await getLang(guildId);
}

/**
 * Check if a translation key exists
 * @param {Object} lang - Language object
 * @param {String} key - Dot-notation key
 * @returns {Boolean} - True if key exists and has a value
 */
function hasTranslation(lang, key) {
    try {
        const value = t(lang, key, null);
        return value !== null && value !== key;
    } catch {
        return false;
    }
}

/**
 * Get translation with fallback chain
 * Tries multiple keys in order until one is found
 * @param {Object} lang - Language object
 * @param {Array<String>} keys - Array of keys to try in order
 * @param {String} [defaultValue=''] - Default value if none found
 * @returns {*} - First found translation or default
 *
 * @example
 * tFallback(lang, ['VoiceMaster.Errors.NotOwner', 'Common.NoPermission'], '❌ Error')
 */
function tFallback(lang, keys, defaultValue = '') {
    for (const key of keys) {
        if (hasTranslation(lang, key)) {
            return t(lang, key);
        }
    }
    return defaultValue;
}

/**
 * Format a list of items with translations
 * @param {Object} lang - Language object
 * @param {Array} items - Array of items to format
 * @param {String} [separator='\n'] - Separator between items
 * @param {String} [prefix=''] - Prefix for each item
 * @returns {String} - Formatted list
 *
 * @example
 * tList(lang, ['item1', 'item2', 'item3'], '\n', '• ')
 * // Returns: "• item1\n• item2\n• item3"
 */
function tList(items, separator = '\n', prefix = '') {
    return items.map(item => `${prefix}${item}`).join(separator);
}

/**
 * Get translation and format as embed field
 * @param {Object} lang - Language object
 * @param {String} nameKey - Key for field name
 * @param {String} valueKey - Key for field value
 * @param {Object} [replacements={}] - Placeholder replacements
 * @param {Boolean} [inline=false] - Whether field should be inline
 * @returns {Object} - Embed field object
 */
function tField(lang, nameKey, valueKey, replacements = {}, inline = false) {
    return {
        name: tr(lang, nameKey, replacements),
        value: tr(lang, valueKey, replacements),
        inline
    };
}

/**
 * Safely access array element from translation
 * @param {Object} lang - Language object
 * @param {String} key - Dot-notation key to array
 * @param {Number} index - Array index
 * @param {String} [fallback=''] - Fallback if index out of bounds
 * @returns {*} - Array element or fallback
 */
function tArrayAt(lang, key, index, fallback = '') {
    const array = t(lang, key);
    if (!Array.isArray(array)) return fallback;
    if (index < 0 || index >= array.length) return fallback;
    return array[index];
}

/**
 * Get length of translation array
 * @param {Object} lang - Language object
 * @param {String} key - Dot-notation key to array
 * @returns {Number} - Array length or 0 if not an array
 */
function tLength(lang, key) {
    const value = t(lang, key);
    if (!Array.isArray(value)) return 0;
    return value.length;
}

/**
 * Pluralize translation based on count
 * Uses keys with .singular and .plural suffixes
 * @param {Object} lang - Language object
 * @param {String} baseKey - Base key (without .singular or .plural)
 * @param {Number} count - Count to determine singular/plural
 * @param {Object} [replacements={}] - Placeholder replacements (automatically includes {count})
 * @returns {String} - Pluralized translation
 *
 * @example
 * // Assuming lang.Items.apple.singular = "{count} apple" and lang.Items.apple.plural = "{count} apples"
 * tPlural(lang, 'Items.apple', 1) // "1 apple"
 * tPlural(lang, 'Items.apple', 5) // "5 apples"
 */
function tPlural(lang, baseKey, count, replacements = {}) {
    const suffix = count === 1 ? 'singular' : 'plural';
    const key = `${baseKey}.${suffix}`;
    return tr(lang, key, { ...replacements, count }, t(lang, baseKey));
}

module.exports = {
    t,
    tr,
    trandom,
    getLangFor,
    hasTranslation,
    tFallback,
    tList,
    tField,
    tArrayAt,
    tLength,
    tPlural
};
