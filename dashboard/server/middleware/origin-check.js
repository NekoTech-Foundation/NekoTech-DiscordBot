const path = require('path');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');

let config;
try {
    config = getConfig();
} catch (e) {
    console.error('[ERROR] Error loading config:', e);
    process.exit(1);
}

const dashboardUrl = config.Dashboard?.Url || 'http://localhost:3000';
const vitePort = process.env.VITE_PORT || config.Dashboard?.VitePort || 3001;
const allowedOrigins = [`http://localhost:${vitePort}`, dashboardUrl];
const isDevelopment = process.env.NODE_ENV !== 'production';
const isDevMode = config.Dashboard?.Development === true;

function originCheck(req, res, next) {
    if (isDevelopment && isDevMode) {
        return next();
    }

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    if (origin && allowedOrigins.includes(origin)) {
        next();
    } else if (referer && allowedOrigins.some(allowed => referer.startsWith(allowed))) {
        next();
    } else {
        console.warn('[SECURITY] Blocked request from unauthorized source:', { origin, referer });
        res.status(403).json({ error: 'Access denied' });
    }
}

module.exports = originCheck;