const path = require('path');
const Database = require('better-sqlite3');

// Database configuration
const DB_PATH = path.join(__dirname, 'dictionary.db');
let db = null;

// Cache - Use a small cache for frequent words to reduce disk I/O
const apiCache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

let isReady = false;

// Normalize for comparison
function cleanInput(word) {
    if (!word) return '';
    return word.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Normalize for game logic
function normalizeForGame(word) {
    if (!word) return '';
    return word
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');
}

// Initialize Database
async function initDictionary() {
    if (isReady) return;

    console.log('[NoiTu] ⏳ Connecting to local dictionary database...');
    try {
        db = new Database(DB_PATH, { fileMustExist: true }); // Ensure file exists
        db.pragma('journal_mode = WAL');

        // Quick verification
        const count = db.prepare('SELECT COUNT(*) as count FROM words').get().count;

        isReady = true;
        console.log(`[NoiTu] ✅ Local Dictionary loaded: ${count} words available.`);
    } catch (error) {
        console.error('[NoiTu] ❌ Failed to load local database:', error.message);
        console.error('[NoiTu] ⚠️ Please run "migrate_dictionary.js" to setup the database first.');
    }
}

// Cleanup cache periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of apiCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            apiCache.delete(key);
        }
    }
}, 1000 * 60 * 60);

// Check Word (SQLite)
async function checkWord(word) {
    if (!word || !isReady || !db) return false;
    const cleanW = cleanInput(word);

    // 1. Check Cache
    if (apiCache.has(cleanW)) {
        const cached = apiCache.get(cleanW);
        if (Date.now() - cached.timestamp < CACHE_TTL) return cached.valid;
    }

    // 2. Check Database
    try {
        const row = db.prepare('SELECT 1 FROM words WHERE fragment = ?').get(cleanW);
        const isValid = !!row;

        // Update Cache
        apiCache.set(cleanW, { valid: isValid, timestamp: Date.now() });
        return isValid;

    } catch (error) {
        console.error('[NoiTu] Database Query Error:', error);
        return false;
    }
}

function getStats() {
    return {
        cacheSize: apiCache.size,
        isReady,
        dbConnected: !!db
    };
}

module.exports = {
    initDictionary,
    checkWord,
    normalizeForGame,
    getStats
};
