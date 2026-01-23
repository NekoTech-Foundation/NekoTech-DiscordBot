const express = require('express');
const router = express.Router();
const WhitelabelModel = require('../models/Whitelabel');
const { getConfig } = require('./configLoader');
const WhitelabelManager = require('./whitelabelManager');
const https = require('https');
const path = require('path');
const fs = require('fs');

// Middleware to check if user is authenticated
// For now, we use a simple in-memory session or just pass userId in header (INSECURE - DEV ONLY) until OAuth is fully set
// In production, use session cookie with signed JWT
const requireAuth = async (req, res, next) => {
    // TODO: Implement Real Session/JWT validation
    // For now, we expect a 'x-user-id' header or query for testing
    // REAL IMPLEMENTATION: req.session.userId
    const userId = req.headers['x-user-id'] || req.query.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has a whitelabel instance
    const subscription = await WhitelabelModel.getSubscription(userId);
    if (!subscription || subscription.status !== 'ACTIVE') {
        return res.status(403).json({ error: 'No active subscription found' });
    }

    req.user = { id: userId, subscription };
    next();
};

// ==========================================
// AUTHENTICATION (Discord OAuth2)
// ==========================================
router.get('/auth/login', (req, res) => {
    const config = getConfig();
    const clientId = config.BotClientId || config.BotID; // Need to ensure this exists
    const baseUrl = config.DashboardUrl || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${baseUrl}/api/dashboard/auth/callback`;

    if (!config.BotClientSecret) {
        return res.status(500).send('BotClientSecret is missing in config.yml');
    }

    const scope = 'identify guilds';
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;
    res.redirect(url);
});

router.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    const config = getConfig();
    if (!code) return res.status(400).send('No code provided');

    try {
        const clientId = config.BotClientId || config.BotID;
        console.log('[Dashboard Auth] Exchanging code for token...');
        console.log(`[Dashboard Auth] Client ID: ${clientId}`);
        console.log(`[Dashboard Auth] Client Secret (First 5 chars): ${config.BotClientSecret ? config.BotClientSecret.substring(0, 5) : 'MISSING'}...`);

        const baseUrl = config.DashboardUrl || `${req.protocol}://${req.get('host')}`;

        const params = new URLSearchParams({
            client_id: clientId, // Ensure we have this
            client_secret: config.BotClientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${baseUrl}/api/dashboard/auth/callback`
        });

        // Exchange code for token
        // We use native https request or fetch if available (Node 18+)
        // Assuming fetch is available in Node 18+
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

        // Get User Data
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const userData = await userResponse.json();

        // Check Subscription
        const sub = await WhitelabelModel.getSubscription(userData.id);
        if (!sub) {
            return res.status(403).send('You do not have a Whitelabel subscription.');
        }

        // Return User Data
        // Redirect to Frontend with trailing slash to satisfy Vite Base URL
        res.redirect(`${baseUrl}/dashboard/?userId=${userData.id}&token=${tokenData.access_token}`);

    } catch (e) {
        console.error('OAuth Error:', e);
        res.status(500).send('Authentication Failed');
    }
});

// ==========================================
// DASHBOARD API
// ==========================================

// Get Instance Status
router.get('/status', requireAuth, async (req, res) => {
    // Check PM2 Status
    // We can use 'pm2 describe'
    const pm2Name = `WL_${req.user.id}`;
    const { exec } = require('child_process');

    // We need to use the same PM2 usage as WhitelabelManager
    // For simplicity, calling WhitelabelManager commands might be easier?
    // But direct check is faster for status.

    exec(`pm2 describe ${pm2Name}`, (err, stdout, stderr) => {
        if (err || stderr.includes('doesn\'t exist')) {
            return res.json({
                status: 'STOPPED',
                subscription: req.user.subscription
            });
        }

        // Parse basic info if needed, or just assume running if no error
        // Real PM2 output is complex json if we use 'pm2 jlist'
        res.json({
            status: 'ONLINE',
            subscription: req.user.subscription
        });
    });
});

// Console Logs
router.get('/console', requireAuth, async (req, res) => {
    const sub = req.user.subscription;
    const logPath = path.join(sub.instancePath, 'logs.txt');

    if (!fs.existsSync(logPath)) {
        return res.json({ logs: 'No logs available yet. Start the instance to generate logs.' });
    }

    try {
        // Read last 2 KB of logs
        const stats = fs.statSync(logPath);
        const fileSize = stats.size;
        const bufferSize = Math.min(2048, fileSize);
        const buffer = Buffer.alloc(bufferSize);

        const fd = fs.openSync(logPath, 'r');
        fs.readSync(fd, buffer, 0, bufferSize, fileSize - bufferSize);
        fs.closeSync(fd);

        const logs = buffer.toString('utf8');
        res.json({ logs });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to read logs' });
    }
});

// Control Actions
router.post('/action', requireAuth, async (req, res) => {
    const { action } = req.body; // start, stop, restart
    const userId = req.user.id;

    try {
        let result = false;
        if (action === 'start') {
            result = await WhitelabelManager.startInstance(userId);
        } else if (action === 'stop') {
            result = await WhitelabelManager.stopInstance(userId);
        } else if (action === 'restart') {
            WhitelabelManager.restartInstance(userId); // void function currently
            result = true;
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        if (result) {
            res.json({ success: true, action });
        } else {
            res.status(500).json({ error: 'Action failed (Check logs)' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update Config
router.get('/config', requireAuth, (req, res) => {
    const sub = req.user.subscription;
    const configPath = path.join(sub.instancePath, 'config.yml');

    if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        res.json({ content });
    } else {
        res.status(404).json({ error: 'Config file not found' });
    }
});

router.post('/config', requireAuth, (req, res) => {
    const { content } = req.body;
    const sub = req.user.subscription;
    const configPath = path.join(sub.instancePath, 'config.yml');

    try {
        // Basic validation: ensure it parses as YAML
        const yaml = require('js-yaml');
        yaml.load(content); // Throws if invalid

        fs.writeFileSync(configPath, content, 'utf8');

        // Optional: Automatic Restart?
        // WhitelabelManager.restartInstance(sub.userId); // Better to let user manually restart to avoid loops

        res.json({ success: true, message: 'Config updated. Restart the instance to apply changes.' });
    } catch (e) {
        res.status(400).json({ error: 'Invalid YAML: ' + e.message });
    }
});

// ==========================================
// UNIVERSAL DASHBOARD API (Guilds)
// ==========================================

const GuildSettings = require('../models/GuildSettings');
const Database = require('better-sqlite3');

/**
 * Get DB Context based on request header 'x-context-user-id'
 * If header is missing or 'main', returns Main Bot DB (null passed to model uses default).
 * If header is a Whitelabel User ID, returns that instance's DB.
 */
const getDbContext = (req) => {
    const contextUserId = req.headers['x-context-user-id'];

    // If no context or 'main', use default (null)
    if (!contextUserId || contextUserId === 'main') return null;

    // Verify user owns this instance (Active Subscription)
    // We trust x-context-user-id only if it matches req.user.id OR if req.user.id is Admin (future)
    if (contextUserId !== req.user.id) {
        throw new Error('Access Denied to this instance');
    }

    const sub = req.user.subscription;
    if (!sub || sub.status !== 'ACTIVE') {
        throw new Error('Instance not active');
    }

    const dbPath = path.join(sub.instancePath, 'database.sqlite');
    if (!fs.existsSync(dbPath)) {
        throw new Error('Instance database not found');
    }

    return new Database(dbPath);
};

// Get User's Guilds (Mutual with Bot)
router.get('/guilds', requireAuth, async (req, res) => {
    try {
        // 1. Fetch User Guilds from Discord
        const userGuildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${req.query.token || req.headers['x-discord-token']}` }
        });
        const userGuilds = await userGuildsRes.json();

        if (userGuilds.message) throw new Error(userGuilds.message); // Rate limit or auth error

        // 2. Identify Context (Main or Whitelabel)
        const db = getDbContext(req);

        // 3. Filter Guilds
        // Logic: We show guilds where User has permissions AND Bot is present.
        // Problem: We don't have easy access to Whitelabel Bot's cache to know where it is.
        // Solution for Whitelabel: We might skip "Bot is present" check or check DB for existing GuildConfig?
        // For Main Bot: We can use 'client.guilds.cache' (Global Main Client).

        // For now, let's just return ALL guilds where user has MANAGE_GUILD (0x20)
        // Frontend handles "Invite Bot" vs "Edit" logic.

        const manageGuilds = userGuilds.filter(g => (BigInt(g.permissions) & 0x20n) === 0x20n);

        res.json(manageGuilds);
    } catch (e) {
        console.error('Guild Fetch Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get Guild Config
router.get('/guilds/:id/config', requireAuth, async (req, res) => {
    try {
        const guildId = req.params.id;
        const db = getDbContext(req);

        // Create Model bound to context
        const model = GuildSettings.createInstance(db);
        const config = await model.findOne({ guildId });

        res.json(config || { guildId, ...model.defaultDataFn({ guildId }) });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Update Guild Config
router.post('/guilds/:id/config', requireAuth, async (req, res) => {
    try {
        const guildId = req.params.id;
        const { config } = req.body;
        const db = getDbContext(req);

        const model = GuildSettings.createInstance(db);

        // Ensure guildId matches
        config.guildId = guildId;

        await model.setSubscription ? model.setSubscription(guildId, config) : model.create(config);
        // Logic needs fix: Model usually has 'create' or 'findOne' + save.

        let doc = await model.findOne({ guildId });
        if (doc) {
            Object.assign(doc, config);
            await doc.save();
        } else {
            await model.create(config);
        }

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
