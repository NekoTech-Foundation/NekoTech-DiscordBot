const axios = require('axios');

// Simple in-memory cache to reduce API calls
const cache = new Map();

// Default to Wiktionary MediaWiki API if not configured
const DEFAULT_URL = 'https://vi.wiktionary.org/w/api.php?action=query&titles={word}&format=json&redirects=1';

// Resolve API config from environment variables
// Expected: NOITU_API_URL can be a template like "https://api.example.com/validate?word={word}"
// Optional: NOITU_API_KEY for header auth
const BASE_URL = process.env.NOITU_API_URL || DEFAULT_URL;
const API_KEY = process.env.NOITU_API_KEY || '';
const TIMEOUT_MS = Number(process.env.NOITU_API_TIMEOUT_MS || 4000);

function buildUrl(word) {
  if (BASE_URL.includes('{word}')) return BASE_URL.replace('{word}', encodeURIComponent(word));
  const joiner = BASE_URL.includes('?') ? '&' : '?';
  return `${BASE_URL}${joiner}q=${encodeURIComponent(word)}`;
}

function getDefaultHeaders() {
  const headers = {
    'User-Agent': 'NekoBuckets-NoiTu/1.0 (word validator)'
  };
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
  return headers;
}

function parseMediaWikiQuery(data) {
  // MediaWiki query response shape: { query: { pages: { [id]: { title, missing? } } } }
  const pages = data?.query?.pages;
  if (!pages || typeof pages !== 'object') return false;
  const first = Object.values(pages)[0];
  if (!first) return false;
  if (first.missing) return false;
  return true;
}

async function requestValidity(word) {
  const url = buildUrl(word);

  const res = await axios.get(url, { headers: getDefaultHeaders(), timeout: TIMEOUT_MS, validateStatus: () => true });
  if (res.status === 204 || res.status === 404) return false;
  if (res.status !== 200) return false;

  const data = res.data;

  // If using MediaWiki API (default), parse presence via pages
  if (url.includes('/w/api.php')) {
    return parseMediaWikiQuery(data);
  }

  // Interpret a variety of common response shapes
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.valid === true) return true;
    if (data.exists === true) return true;
  }
  if (Array.isArray(data)) {
    return data.length > 0;
  }
  // For REST summary endpoints, any 200 with body is considered valid
  return !!data;
}

async function checkWord(word) {
  const key = word.toLowerCase().trim();
  if (!key) return false;
  if (cache.has(key)) return cache.get(key);

  try {
    let valid = await requestValidity(key);
    if (!valid) {
      // Fallback: try capitalizing first letter (MediaWiki title normalization)
      const alt = key.charAt(0).toUpperCase() + key.slice(1);
      if (alt !== key) {
        valid = await requestValidity(alt);
      }
    }
    cache.set(key, valid);
    return valid;
  } catch (_) {
    // Do not throw to game loop; treat as invalid and let caller decide any fallback
    return false;
  }
}

module.exports = { checkWord };
