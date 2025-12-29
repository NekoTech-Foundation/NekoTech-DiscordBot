const axios = require('axios');

// Cache với TTL
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 giờ

// API Configuration
const DEFAULT_URL = 'https://vi.wiktionary.org/w/api.php';
const TIMEOUT_MS = Number(process.env.NOITU_API_TIMEOUT_MS || 5000);
const MAX_RETRIES = 2;

// Cleanup cache định kỳ
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            cache.delete(key);
        }
    }
}, 1000 * 60 * 60);

function normalizeWord(word) {
    return word
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

async function checkWiktionary(word) {
    try {
        const params = {
            action: 'query',
            titles: word,
            format: 'json',
            redirects: 1,
            formatversion: 2
        };

        const response = await axios.get(DEFAULT_URL, {
            params,
            headers: {
                'User-Agent': 'NekoBuckets-NoiTu/2.0 (Discord Bot)'
            },
            timeout: TIMEOUT_MS,
            validateStatus: () => true
        });

        if (!response.data || !response.data.query) {
            return false;
        }

        const pages = response.data.query.pages;
        if (!pages || pages.length === 0) {
            return false;
        }

        const page = pages[0];
        return !page.hasOwnProperty('missing');

    } catch (error) {
        console.error(`[VocabAPI] Wiktionary error for "${word}":`, error.message);
        return false;
    }
}

// Kiểm tra từ ghép: check cả cụm và từng từ riêng lẻ
async function checkCompoundWord(word) {
    const words = word.trim().split(/\s+/);
    
    // Nếu là từ đơn (1 từ)
    if (words.length === 1) {
        const result = await checkWiktionary(word);
        if (result) return true;
        
        // Thử với chữ đầu viết hoa
        const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
        return await checkWiktionary(capitalized);
    }
    
    // Nếu là từ ghép (2+ từ): "con gà", "bông hoa"
    // Bước 1: Check cả cụm trước
    const wholePhrase = await checkWiktionary(word);
    if (wholePhrase) return true;
    
    // Bước 2: Check từng từ riêng - TẤT CẢ phải hợp lệ
    const validationPromises = words.map(async (w) => {
        if (w.length === 0) return true;
        
        // Check từ thường
        let valid = await checkWiktionary(w);
        if (valid) return true;
        
        // Check với chữ đầu viết hoa
        const capitalized = w.charAt(0).toUpperCase() + w.slice(1);
        valid = await checkWiktionary(capitalized);
        return valid;
    });
    
    const results = await Promise.all(validationPromises);
    
    // Tất cả các từ phải hợp lệ
    return results.every(r => r === true);
}

async function checkWordWithRetry(word, retries = MAX_RETRIES) {
    for (let i = 0; i <= retries; i++) {
        try {
            const result = await checkCompoundWord(word);
            if (result) return true;

            // Nếu fail, thử lại
            if (i < retries) {
                await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
                continue;
            }

            return false;
        } catch (error) {
            console.error(`[VocabAPI] Retry ${i + 1}/${retries + 1} failed:`, error.message);
            if (i === retries) {
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
    }
    return false;
}

async function checkWord(word) {
    const key = normalizeWord(word);
    if (!key) return false;

    // Kiểm tra cache
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`[VocabAPI] Cache hit: "${word}" = ${cached.valid}`);
        return cached.valid;
    }

    console.log(`[VocabAPI] Checking word: "${word}"...`);
    
    // Gọi API với retry
    const valid = await checkWordWithRetry(word);
    
    console.log(`[VocabAPI] Result for "${word}": ${valid ? '✅ Valid' : '❌ Invalid'}`);
    
    // Lưu vào cache
    cache.set(key, {
        valid,
        timestamp: Date.now()
    });

    return valid;
}

// Export stats cho debugging
function getCacheStats() {
    return {
        size: cache.size,
        entries: Array.from(cache.entries()).slice(0, 20).map(([word, data]) => ({
            word,
            valid: data.valid,
            age: Math.floor((Date.now() - data.timestamp) / 1000) + 's'
        }))
    };
}

module.exports = { 
    checkWord,
    getCacheStats,
    normalizeWord
};
