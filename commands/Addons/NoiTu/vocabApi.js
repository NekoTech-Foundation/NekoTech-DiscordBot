const axios = require('axios');

// URL chứa danh sách từ tiếng Việt (khoảng 74k từ)
const DICTIONARY_URL = 'https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet74K.txt';

// Cache - Sử dụng Set để tra cứu O(1)
const memoryDictionary = new Set();
const apiCache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 giờ

// API Configuration
const WIKI_API_URL = 'https://vi.wiktionary.org/w/api.php';
const TIMEOUT_MS = Number(process.env.NOITU_API_TIMEOUT_MS || 5000);

let isReady = false;

// Hàm normalize cơ bản cho việc lưu trữ và so sánh từ
function cleanInput(word) {
    if (!word) return '';
    return word.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Hàm normalize cho logic game (lấy chữ cái đầu/cuối, bỏ dấu)
function normalizeForGame(word) {
    if (!word) return '';
    return word
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');
}

// Hàm khởi tạo: tải từ điển về RAM
async function initDictionary() {
    if (isReady) return;
    
    console.log('[NoiTu] ⏳ Downloading dictionary data...');
    try {
        const response = await axios.get(DICTIONARY_URL, { timeout: 15000 });
        const words = response.data.split(/\r?\n/);
        
        let count = 0;
        words.forEach(word => {
            const w = cleanInput(word);
            if (w) {
                memoryDictionary.add(w);
                count++;
            }
        });
        
        isReady = true;
        console.log(`[NoiTu] ✅ Smart Dictionary loaded: ${count} words.`);
    } catch (error) {
        console.error('[NoiTu] ❌ Failed to download dictionary:', error.message);
        console.log('[NoiTu] ⚠️ Switched to Hybrid/Online mode.');
    }
}

// Cleanup cache định kỳ
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of apiCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            apiCache.delete(key);
        }
    }
}, 1000 * 60 * 60);

// Check Wiki API
async function checkWiktionary(word) {
    try {
        const params = {
            action: 'query',
            titles: word,
            format: 'json',
            redirects: 1,
            formatversion: 2
        };

        const response = await axios.get(WIKI_API_URL, {
            params,
            headers: { 'User-Agent': 'NekoBot/NoiTuAddress (Discord)' },
            timeout: TIMEOUT_MS
        });

        if (!response.data?.query?.pages?.length) return false;
        return !response.data.query.pages[0].missing;
    } catch {
        return false;
    }
}

// Kiểm tra thông minh
async function checkWord(word) {
    if (!word) return false;
    const cleanW = cleanInput(word);

    // 1. Check Memory Dictionary (Ưu tiên số 1 - Tốc độ cao)
    if (memoryDictionary.has(cleanW)) {
        return true;
    }

    // 2. Check Cache
    if (apiCache.has(cleanW)) {
        const cached = apiCache.get(cleanW);
        if (Date.now() - cached.timestamp < CACHE_TTL) return cached.valid;
    }

    // 3. Fallback: Wiktionary API
    console.log(`[NoiTu] 🔎 Converting/Checking online: "${cleanW}"`);
    const valid = await checkWiktionary(cleanW);

    // Lưu cache
    apiCache.set(cleanW, { valid, timestamp: Date.now() });
    
    return valid;
}

function getStats() {
    return {
        dictionarySize: memoryDictionary.size,
        cacheSize: apiCache.size,
        isReady
    };
}

module.exports = { 
    initDictionary,
    checkWord,
    normalizeForGame,
    getStats
};
