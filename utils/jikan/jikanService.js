const axios = require('axios');
const NodeCache = require('node-cache');
const Bottleneck = require('bottleneck');

class JikanService {
    constructor() {
        // Cache: default TTL 1 hour (3600s), check every 10 mins
        this.cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

        // Jikan Rate Limit: 3 req/s nominally, but we'll be safe with ~2.5 req/s (minTime 400ms)
        this.limiter = new Bottleneck({
            minTime: 800, // Safe limit: ~1.25 req/s (Jikan is strict)
            maxConcurrent: 1
        });

        this.api = axios.create({
            baseURL: 'https://api.jikan.moe/v4',
            timeout: 10000
        });

        // Wrap the axios get method with the bottleneck limiter
        // This ensures all calls go through the queue
        this.get = this.limiter.wrap(this._get.bind(this));
    }

    // Underlying GET request with retries
    async _get(path, params = {}) {
        try {
            const { data } = await this.api.get(path, { params });
            return data;
        } catch (error) {
            // If 429 (Too Many Requests), Bottleneck usually handles spacing, but if we still hit it:
            if (error.response && error.response.status === 429) {
                console.warn('[JikanService] Hit 429 despite limiter. Retrying after delay...');
                await new Promise(r => setTimeout(r, 4000)); // 4s wait
                // Recursive retry once
                const { data } = await this.api.get(path, { params });
                return data;
            }
            throw error;
        }
    }

    /**
     * Smart Request: Checks cache -> Calls API (Limited) -> Sets Cache
     * @param {string} path API Endpoint
     * @param {object} params Query Params
     * @param {number} ttl Cache Time (seconds). Default 3600.
     */
    async smartGet(path, params = {}, ttl = 3600) {
        // Create a unique cache key based on path and sorted params
        const paramStr = JSON.stringify(params, Object.keys(params).sort());
        const key = `${path}::${paramStr}`;

        const cached = this.cache.get(key);
        if (cached) {
            // console.log(`[JikanService] Cache Hit: ${key}`);
            return cached;
        }

        try {
            const result = await this.get(path, params);
            if (result) {
                this.cache.set(key, result, ttl);
            }
            return result;
        } catch (error) {
            console.error(`[JikanService] Error fetching ${path}:`, error.message);
            // On error, return null so commands can handle it gracefully
            if (error.response && error.response.status === 404) return null; // Not found is clean
            throw error; // Other errors (network, 500) bubble up
        }
    }

    // --- Specific Methods ---

    async searchAnime(query, page = 1) {
        return this.smartGet('/anime', { q: query, page }, 3600); // 1 hour cache
    }

    async getAnimeById(id) {
        return this.smartGet(`/anime/${id}`, {}, 86400); // 24 hours cache (details rarely change)
    }

    async getTopAnime(type = 'all', page = 1) {
        const params = { page };
        if (type !== 'all') params.type = type;
        return this.smartGet('/top/anime', params, 3600);
    }

    async getSeasonNow(page = 1) {
        return this.smartGet('/seasons/now', { page }, 21600); // 6 hours
    }

    async getSeason(year, season, page = 1) {
        return this.smartGet(`/seasons/${year}/${season}`, { page }, 604800); // 1 week (old seasons don't change)
    }

    async getRandomAnime() {
        // Random cannot be cached effectively if we want true random, 
        // BUT we can cache the result for a short time to prevent spam abuse?
        // Actually, no cache for random.
        return this.get('/random/anime');
    }

    async searchManga(query, page = 1) {
        return this.smartGet('/manga', { q: query, page }, 3600);
    }

    async getMangaById(id) {
        return this.smartGet(`/manga/${id}`, {}, 86400);
    }

    async getTopManga(type = 'all', page = 1) {
        const params = { page };
        if (type !== 'all') params.type = type;
        return this.smartGet('/top/manga', params, 3600);
    }

    async getRandomManga() {
        return this.get('/random/manga');
    }

    // Charts logic helper
    async getTopAnimeByMetric(metric, startDate, endDate, page = 1) {
        const params = {
            start_date: startDate,
            end_date: endDate,
            order_by: metric,
            sort: 'desc',
            page
        };
        // Cache charts for 3 hours
        return this.smartGet('/anime', params, 10800);
    }

    async getTopMangaByMetric(metric, startDate, endDate, page = 1) {
        const params = {
            start_date: startDate,
            end_date: endDate,
            order_by: metric,
            sort: 'desc',
            page
        };
        return this.smartGet('/manga', params, 10800);
    }

    async searchCharacter(query, page = 1) {
        return this.smartGet('/characters', { q: query, page }, 3600);
    }

    async getCharacterById(id) {
        return this.smartGet(`/characters/${id}`, {}, 86400);
    }

    async getCharacterFullById(id) {
        return this.smartGet(`/characters/${id}/full`, {}, 86400);
    }

    async getSchedules(day, page = 1) {
        return this.smartGet('/schedules', { filter: day, page }, 10800); // 3 hours
    }

}

// Singleton instance
module.exports = new JikanService();
