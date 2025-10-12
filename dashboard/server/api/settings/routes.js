const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const requireRoles = require('../../middleware/roles');
const BotActivity = require('../../../../models/BotActivity');
const AutoResponse = require('../../../../models/autoResponse');
const Settings = require('../../../../models/Settings');
const AutoReact = require('../../../../models/autoReact');
const channelStatsRoutes = require('./channel-stats');
const { getDiscordClient } = require('../../bot');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

function getSettingsRoles() {
    if (process.env.DASHBOARD_SETTINGS_ROLES) {
        const roles = process.env.DASHBOARD_SETTINGS_ROLES.split(',').filter(role => role.trim());
        return roles;
    }
    
    try {
        const configPath = require('path').join(__dirname, '../../../dist/config.js');
        const configContent = require('fs').readFileSync(configPath, 'utf8')
            .replace(/\/\/ Generated from config\.yml - DO NOT EDIT DIRECTLY\s*/, '')
            .replace('window.DASHBOARD_CONFIG = ', '')
            .replace(/;$/, '');
        
        const config = JSON.parse(configContent);
        
        if (config?.PERMISSIONS?.Dashboard?.Settings) {
            const roles = config.PERMISSIONS.Dashboard.Settings.filter(role => role && role !== 'ROLE_ID');
            return roles;
        }
    } catch (error) {
        console.error('[SETTINGS] Error loading config:', error);
    }
    
    return [];
}

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 500,
    trustProxy: true,
    keyGenerator: (req) => {
        return (req.headers['x-forwarded-for'] || 
                req.ip || 
                req.connection?.remoteAddress || 
                '127.0.0.1').split(',')[0].trim();
    }
});

router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.discordapp.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'https:', 'data:', 'cdn.discordapp.com'],
      connectSrc: ["'self'", 'discord.com', 'cdn.discordapp.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true
}));

router.use(apiLimiter);

const verifyCsrfToken = (req, res, next) => {
  if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
    return next();
  }
  
  const csrfToken = req.headers['x-xsrf-token'];
  if (!csrfToken || !req.session?.csrfToken || csrfToken !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
};

const validateInput = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const requireSettingsRoles = requireRoles(getSettingsRoles);

router.get('/bot-activity', [auth, requireSettingsRoles], async (req, res) => {
    try {    
        const guildId = req.user.guildId;
        if (!guildId) {
            return res.status(400).json({ error: 'No guild ID available' });
        }

        let botActivityData = await BotActivity.findOne({ guildId });
        if (!botActivityData) {
            botActivityData = { activities: [] };
        }

        res.json(botActivityData);
    } catch (error) {
        console.error('[ERROR] Failed to fetch bot activities:', error);
        res.status(500).json({ error: 'Failed to fetch bot activities' });
    }
});

router.post('/bot-activity', [auth, requireSettingsRoles, verifyCsrfToken], async (req, res) => {
  try {
    const guildId = req.user.guildId;
    const { status, activityType, statusType, streamingURL } = req.body;
    
    if (!status || typeof status !== 'string' || !status.trim()) {
      return res.status(400).json({ error: 'Status is required and must be a non-empty string' });
    }

    if (!activityType || !['PLAYING', 'LISTENING', 'WATCHING', 'STREAMING', 'COMPETING'].includes(activityType)) {
      return res.status(400).json({ error: 'Invalid activity type' });
    }

    if (!statusType || !['online', 'idle', 'dnd'].includes(statusType)) {
      return res.status(400).json({ error: 'Invalid status type' });
    }

    if (activityType === 'STREAMING' && (!streamingURL || typeof streamingURL !== 'string')) {
      return res.status(400).json({ error: 'Streaming URL is required for STREAMING activity type' });
    }

    let botActivityData = await BotActivity.findOne({ guildId });

    if (!botActivityData) {
      botActivityData = new BotActivity({ guildId, activities: [] });
    }

    botActivityData.activities.push({
      status: status.trim(),
      activityType,
      statusType,
      streamingURL: activityType === 'STREAMING' ? streamingURL : null
    });

    await botActivityData.save();

    const client = global.client;
    if (client) {
      client.emit('botActivityUpdated', guildId);
    }

    res.json(botActivityData);
  } catch (error) {
    console.error('[ERROR] Failed to add bot activity:', error);
    res.status(500).json({ error: 'Failed to add bot activity' });
  }
});

router.delete('/bot-activity/:index', [auth, requireSettingsRoles, verifyCsrfToken], async (req, res) => {
  try {
    const guildId = req.user.guildId;

    let botActivityData = await BotActivity.findOne({ guildId });

    if (!botActivityData || !botActivityData.activities[req.params.index]) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    botActivityData.activities.splice(req.params.index, 1);
    await botActivityData.save();

    const client = global.client;
    if (client) {
      client.emit('botActivityUpdated', guildId);
    }

    res.json(botActivityData);
  } catch (error) {
    console.error('[ERROR] Failed to remove bot activity:', error);
    res.status(500).json({ error: 'Failed to remove bot activity' });
  }
});

router.get('/dashboard', auth, async (req, res) => {
  try {
    const settings = await Settings.findOne({ guildId: req.user.guildId });
    
    if (!settings?.dashboardSettings) {
      return res.json({
        navName: 'DrakoBot',
        favicon: 'None',
        tabName: 'DrakoBot Dashboard',
        customNavItems: [],
        categories: {
          navigation: 'Navigation',
          custom: 'Custom Links',
          addons: 'Addons'
        }
      });
    }

    res.json({
      navName: settings.dashboardSettings.navName,
      favicon: settings.dashboardSettings.favicon || 'None',
      tabName: settings.dashboardSettings.tabName,
      customNavItems: settings.dashboardSettings.customNavItems,
      categories: settings.dashboardSettings.navCategories
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch dashboard settings:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard settings' });
  }
});

router.post('/dashboard', [auth, requireSettingsRoles, verifyCsrfToken], async (req, res) => {
  try {
    const { navName, favicon, tabName, customNavItems, categories } = req.body;

    const updateData = {
      dashboardSettings: {
        navName: navName || 'DrakoBot',
        favicon: favicon?.trim() || 'None',
        tabName: tabName || 'DrakoBot Dashboard',
        customNavItems: customNavItems || [],
        navCategories: categories
      }
    };

    const settings = await Settings.findOneAndUpdate(
      { guildId: req.user.guildId },
      updateData,
      { new: true, upsert: true }
    );

    if (global.io) {
      global.io.to(`guild:${req.user.guildId}`).emit('dashboardSettingsUpdated', settings.dashboardSettings);
    }

    res.json({ success: true, settings: settings.dashboardSettings });
  } catch (error) {
    console.error('[ERROR] Failed to save dashboard settings:', error);
    res.status(500).json({ error: 'Failed to save dashboard settings' });
  }
});

router.post('/dashboard/nav-items', [auth, requireSettingsRoles, verifyCsrfToken], async (req, res) => {
  try {
    const { name, href, icon, isExternal } = req.body;

    if (!name || !href) {
      return res.status(400).json({ error: 'Name and href are required' });
    }

    const settings = await Settings.findOne({ guildId: req.user.guildId });
    const customNavItems = settings?.dashboardSettings?.customNavItems || [];

    if (customNavItems.some(item => item.href === href)) {
      return res.status(400).json({ error: 'A navigation item with this href already exists' });
    }

    customNavItems.push({ name, href, icon, isExternal });

    await Settings.findOneAndUpdate(
      { guildId: req.user.guildId },
      { $set: { 'dashboardSettings.customNavItems': customNavItems } },
      { upsert: true }
    );

    res.json({ success: true, navItems: customNavItems });
  } catch (error) {
    console.error('[SETTINGS] Failed to add navigation item:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to add navigation item' });
  }
});

router.delete('/dashboard/nav-items/:href', [auth, requireSettingsRoles, verifyCsrfToken], async (req, res) => {
  try {

    const href = decodeURIComponent(req.params.href);
    const settings = await Settings.findOne({ guildId: req.user.guildId });
    
    if (!settings?.dashboardSettings?.customNavItems) {
      return res.status(404).json({ error: 'No custom navigation items found' });
    }

    const customNavItems = settings.dashboardSettings.customNavItems.filter(
      item => item.href !== href
    );

    await Settings.findOneAndUpdate(
      { guildId: req.user.guildId },
      { $set: { 'dashboardSettings.customNavItems': customNavItems } }
    );


    res.json({ success: true, navItems: customNavItems });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove navigation item' });
  }
});

router.put('/dashboard/categories', [auth, requireSettingsRoles, verifyCsrfToken], async (req, res) => {
  try {
    const { categories } = req.body;

    if (!categories || typeof categories !== 'object') {
      return res.status(400).json({ error: 'Invalid categories format' });
    }

    await Settings.findOneAndUpdate(
      { guildId: req.user.guildId },
      { $set: { 'dashboardSettings.categories': categories } },
      { upsert: true }
    );

    res.json({ success: true, categories });
  } catch (error) {
    console.error('[ERROR] Failed to update categories:', error);
    res.status(500).json({ error: 'Failed to update categories' });
  }
});

router.get('/auto-responses', [auth, requireSettingsRoles], async (req, res) => {
  try {    
    const guildId = req.user.guildId;
    if (!guildId) {
      console.error('[ERROR] No guildId found in user object');
      return res.status(400).json({ error: 'No guild ID available' });
    }

    const responses = await AutoResponse.find({ guildId }).lean();

    const defaultEmbed = {
      title: '',
      description: '',
      color: '#5865F2',
      footer: { text: '', icon_url: '' },
      thumbnail: { url: '' },
      image: { url: '' },
      author: { name: '', icon_url: '' },
      fields: []
    };

    const normalizedResponses = responses.map(response => {
      if (response.type) {
        return {
          _id: response._id,
          guildId: response.guildId,
          trigger: response.trigger,
          type: response.type,
          content: response.content || '',
          embed: { ...defaultEmbed, ...response.embed },
          whitelistRoles: response.whitelistRoles || [],
          blacklistRoles: response.blacklistRoles || [],
          whitelistChannels: response.whitelistChannels || [],
          blacklistChannels: response.blacklistChannels || []
        };
      }
      
      return {
        _id: response._id,
        guildId: response.guildId,
        trigger: response.trigger,
        type: response.responseType.toLowerCase(),
        content: response.responseText || '',
        embed: response.responseType === 'EMBED' ? { ...defaultEmbed, ...response.embedData } : defaultEmbed,
        whitelistRoles: response.whitelistRoles || [],
        blacklistRoles: response.blacklistRoles || [],
        whitelistChannels: response.whitelistChannels || [],
        blacklistChannels: response.blacklistChannels || []
      };
    });

    res.json(normalizedResponses || []);
  } catch (error) {
    console.error('[ERROR] Failed to fetch auto responses:', error);
    res.status(500).json({ error: 'Failed to fetch auto responses', details: error.message });
  }
});

router.post('/auto-responses', [auth, requireSettingsRoles, verifyCsrfToken], async (req, res) => {
  try {    
    const guildId = req.user.guildId;

    const { trigger, type, content, embed } = req.body;

    if (!trigger?.trim()) {
      return res.status(400).json({ error: 'Trigger is required' });
    }
    if (!type || !['text', 'embed'].includes(type)) {
      return res.status(400).json({ error: 'Valid type (text or embed) is required' });
    }
    if (type === 'text' && !content?.trim()) {
      return res.status(400).json({ error: 'Content is required for text responses' });
    }

    if (type === 'embed' && embed) {
      if (embed.title && embed.title.length > 256) {
        return res.status(400).json({ error: 'Embed title cannot exceed 256 characters' });
      }
      if (embed.description && embed.description.length > 4096) {
        return res.status(400).json({ error: 'Embed description cannot exceed 4096 characters' });
      }
    }

    const existing = await AutoResponse.findOne({ guildId, trigger });
    if (existing) {
      return res.status(400).json({ error: 'A response with this trigger already exists' });
    }

    const responseData = {
      guildId,
      trigger: trigger.trim(),
      responseType: type.toUpperCase(),
      whitelistRoles: [],
      blacklistRoles: [],
      whitelistChannels: [],
      blacklistChannels: []
    };

    if (type === 'text') {
      responseData.responseText = content.trim();
    } else {
      responseData.embedData = {
        title: embed?.title?.trim().substring(0, 256) || '',
        description: embed?.description?.trim().substring(0, 4096) || '',
        color: /^#[0-9A-F]{6}$/i.test(embed?.color) ? embed.color : '#000000',
        footer: {
          text: embed?.footer?.text?.trim().substring(0, 2048) || '',
          icon_url: embed?.footer?.icon_url?.trim() || ''
        },
        thumbnail: {
          url: embed?.thumbnail?.url?.trim() || ''
        },
        image: {
          url: embed?.image?.url?.trim() || ''
        },
        author: {
          name: embed?.author?.name?.trim().substring(0, 256) || '',
          icon_url: embed?.author?.icon_url?.trim() || ''
        },
        fields: Array.isArray(embed?.fields) ? embed.fields.slice(0, 25).map(field => ({
          name: field.name?.trim().substring(0, 256) || '',
          value: field.value?.trim().substring(0, 1024) || '',
          inline: !!field.inline
        })) : []
      };
    }

    const response = new AutoResponse(responseData);
    await response.save();

    res.json(response.toObject());
  } catch (error) {
    console.error('[ERROR] Failed to add auto response:', error);
    res.status(500).json({ error: 'Failed to add auto response' });
  }
});

router.delete('/auto-responses/:id', [auth, requireSettingsRoles, verifyCsrfToken], async (req, res) => {
  try {
    const guildId = req.user.guildId;

    const client = getDiscordClient();
    if (!client) {
      return res.status(500).json({ error: 'Discord client not available' });
    }

    const response = await AutoResponse.findOne({
      _id: req.params.id,
      guildId
    });

    if (!response) {
      return res.status(404).json({ error: 'Auto response not found' });
    }

    await AutoResponse.deleteOne({ _id: req.params.id, guildId });

    res.json({ success: true });
  } catch (error) {
    console.error('[ERROR] Failed to remove auto response:', error);
    res.status(500).json({ error: 'Failed to remove auto response' });
  }
});

router.put('/auto-responses/:id', [auth, requireSettingsRoles, verifyCsrfToken], async (req, res) => {
    try {        
        const guildId = req.user.guildId;

        const { trigger, type, content, embed } = req.body;

        if (!trigger) {
            return res.status(400).json({ error: 'Trigger is required' });
        }
        if (!type || !['text', 'embed'].includes(type)) {
            return res.status(400).json({ error: 'Valid type (text or embed) is required' });
        }
        if (type === 'text' && !content) {
            return res.status(400).json({ error: 'Content is required for text responses' });
        }

        const duplicate = await AutoResponse.findOne({
            _id: { $ne: req.params.id },
            guildId,
            trigger
        });
        if (duplicate) {
            return res.status(400).json({ error: 'Another response with this trigger already exists' });
        }

        const responseData = {
            trigger,
            type,
            responseType: type.toUpperCase(),
            content: type === 'text' ? content : undefined,
            embedData: type === 'embed' ? {
                title: embed?.title?.trim() || '',
                description: embed?.description?.trim() || '',
                color: embed?.color || '#000000',
                footer: {
                    text: embed?.footer?.text?.trim() || '',
                    icon_url: embed?.footer?.icon_url?.trim() || ''
                },
                thumbnail: {
                    url: embed?.thumbnail?.url?.trim() || ''
                },
                image: {
                    url: embed?.image?.url?.trim() || ''
                },
                author: {
                    name: embed?.author?.name?.trim() || '',
                    icon_url: embed?.author?.icon_url?.trim() || ''
                },
                fields: Array.isArray(embed?.fields) ? embed.fields.map(field => ({
                    name: field.name?.trim() || '',
                    value: field.value?.trim() || '',
                    inline: !!field.inline
                })) : []
            } : undefined
        };

        const response = await AutoResponse.findOneAndUpdate(
            { _id: req.params.id, guildId },
            responseData,
            { new: true }
        );

        if (!response) {
            return res.status(404).json({ error: 'Auto response not found' });
        }

        res.json(response);
    } catch (error) {
        console.error('[ERROR] Failed to edit auto response:', error);
        res.status(500).json({ error: 'Failed to edit auto response', details: error.message });
    }
});

router.get('/auto-reacts', [auth, requireSettingsRoles], async (req, res) => {
  try {    
    const guildId = req.user.guildId;
    if (!guildId) {
      console.error('[ERROR] No guildId found in user object');
      return res.status(400).json({ error: 'No guild ID available' });
    }

    const autoReact = await AutoReact.findOne({ guildId }).lean();
    
    res.json(autoReact?.reactions || []);
  } catch (error) {
    console.error('[ERROR] Failed to fetch auto reactions:', error);
    res.status(500).json({ error: 'Failed to fetch auto reactions', details: error.message });
  }
});

router.post('/auto-reacts', [auth, requireSettingsRoles, verifyCsrfToken], async (req, res) => {
  try {    
    const guildId = req.user.guildId;

    const { keyword, emoji, whitelistRoles, whitelistChannels } = req.body;

    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }
    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    let autoReact = await AutoReact.findOne({ guildId });
    if (!autoReact) {
      autoReact = new AutoReact({ guildId, reactions: [] });
    }

    const existingReaction = autoReact.reactions.find(r => r.keyword === keyword);
    if (existingReaction) {
      return res.status(400).json({ error: 'A reaction with this keyword already exists' });
    }

    const nextId = autoReact.reactions.length > 0 
      ? Math.max(...autoReact.reactions.map(r => r.id)) + 1 
      : 1;

    const newReaction = {
      id: nextId,
      keyword,
      emoji,
      whitelistRoles: whitelistRoles || [],
      whitelistChannels: whitelistChannels || []
    };

    autoReact.reactions.push(newReaction);
    await autoReact.save();

    res.json(newReaction);
  } catch (error) {
    console.error('[ERROR] Failed to add auto reaction:', error);
    res.status(500).json({ error: 'Failed to add auto reaction' });
  }
});

router.delete('/auto-reacts/:id', [auth, requireSettingsRoles, verifyCsrfToken], async (req, res) => {
  try {
    const guildId = req.user.guildId;
    const reactionId = parseInt(req.params.id);
    const result = await AutoReact.updateOne(
      { guildId },
      { $pull: { reactions: { id: reactionId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Reaction not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[ERROR] Failed to delete auto reaction:', error);
    res.status(500).json({ error: 'Failed to delete auto reaction' });
  }
});

router.put('/auto-reacts/:id', [auth, requireSettingsRoles, verifyCsrfToken], async (req, res) => {
    try {        
        const guildId = req.user.guildId;

        const { keyword, emoji, whitelistRoles, whitelistChannels } = req.body;

        if (!keyword) {
            return res.status(400).json({ error: 'Keyword is required' });
        }
        if (!emoji) {
            return res.status(400).json({ error: 'Emoji is required' });
        }

        let autoReact = await AutoReact.findOne({ guildId });
        if (!autoReact) {
            return res.status(404).json({ error: 'Auto react configuration not found' });
        }

        const reactionIndex = autoReact.reactions.findIndex(r => r.id === parseInt(req.params.id));
        if (reactionIndex === -1) {
            return res.status(404).json({ error: 'Reaction not found' });
        }

        const duplicateKeyword = autoReact.reactions.some((r, index) => 
            index !== reactionIndex && r.keyword === keyword
        );
        if (duplicateKeyword) {
            return res.status(400).json({ error: 'A reaction with this keyword already exists' });
        }

        autoReact.reactions[reactionIndex] = {
            id: parseInt(req.params.id),
            keyword,
            emoji,
            whitelistRoles: whitelistRoles || [],
            whitelistChannels: whitelistChannels || []
        };

        await autoReact.save();
        res.json(autoReact.reactions[reactionIndex]);
    } catch (error) {
        console.error('[ERROR] Failed to edit auto reaction:', error);
        res.status(500).json({ error: 'Failed to edit auto reaction' });
    }
});

router.get('/server-data', auth, async (req, res) => {
  try {
    const client = getDiscordClient();
    if (!client) {
      throw new Error('Discord client not available');
    }

    const guild = await client.guilds.fetch(req.user.guildId);

    const emojis = Array.from(guild.emojis.cache.values()).map(emoji => ({
      id: emoji.id,
      name: emoji.name,
      animated: emoji.animated,
      url: typeof emoji.imageURL === 'function' ? emoji.imageURL() : emoji.url || `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`
    }));

    const standardEmojis = ['👍', '👎', '❤️', '🔥', '😂', '😊', '🎉', '🤔', '👀', '🙌'];
    const allEmojis = [
      ...standardEmojis.map(emoji => ({ 
        id: emoji, 
        name: emoji, 
        isStandard: true 
      })),
      ...emojis
    ];

    const roles = Array.from(guild.roles.cache.values())
      .filter(role => role.id !== guild.id)
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position
      }))
      .sort((a, b) => b.position - a.position);

    const channels = Array.from(guild.channels.cache.values())
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type === 2 ? 'GUILD_VOICE' : 'GUILD_TEXT',
        parent: channel.parent?.name || 'No Category'
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ emojis: allEmojis, roles, channels });
  } catch (error) {
    console.error('[ERROR] Failed to fetch server data:', error);
    res.status(500).json({ error: 'Failed to fetch server data', details: error.message });
  }
});

router.get('/dashboard/navigation', auth, async (req, res) => {
    try {
        const settings = await Settings.findOne({ guildId: req.user.guildId });
        res.json({
            customNavItems: settings?.dashboardSettings?.customNavItems || [],
            navCategories: settings?.dashboardSettings?.navCategories || {
                navigation: 'Navigation',
                custom: 'Custom Links',
                addons: 'Addons'
            }
        });
    } catch (error) {
        console.error('[Settings] Failed to get navigation settings:', error);
        res.status(500).json({ error: 'Failed to get navigation settings' });
    }
});

router.post('/dashboard/navigation/items', auth, async (req, res) => {
    try {
        const { items } = req.body;
        await Settings.findOneAndUpdate(
            { guildId: req.user.guildId },
            { 
                $set: { 
                    'dashboardSettings.customNavItems': items 
                }
            },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (error) {
        console.error('[Settings] Failed to update navigation items:', error);
        res.status(500).json({ error: 'Failed to update navigation items' });
    }
});

router.post('/dashboard/navigation/categories', auth, async (req, res) => {
    try {
        const { categories } = req.body;
        await Settings.findOneAndUpdate(
            { guildId: req.user.guildId },
            { 
                $set: { 
                    'dashboardSettings.navCategories': categories 
                }
            },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (error) {
        console.error('[Settings] Failed to update navigation categories:', error);
        res.status(500).json({ error: 'Failed to update navigation categories' });
    }
});

router.delete('/dashboard/navigation/items', auth, async (req, res) => {
    try {
        await Settings.findOneAndUpdate(
            { guildId: req.user.guildId },
            { 
                $set: { 
                    'dashboardSettings.customNavItems': [] 
                }
            }
        );
        res.json({ success: true });
    } catch (error) {
        console.error('[Settings] Failed to clear navigation items:', error);
        res.status(500).json({ error: 'Failed to clear navigation items' });
    }
});

// Theme settings endpoints
router.get('/theme', auth, async (req, res) => {
    try {
        const settings = await Settings.findOne({ guildId: req.user.guildId });
        const defaultTheme = settings?.dashboardSettings?.defaultTheme || 'dark';

        res.json({ defaultTheme });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get default theme' });
    }
});

router.put('/theme', [auth, requireSettingsRoles, verifyCsrfToken], async (req, res) => {
    try {
        const { defaultTheme } = req.body;
        
        const validThemes = ['dark', 'blue', 'purple', 'green', 'orange', 'teal', 'cyberpunk', 'slate-professional', 'emerald-pro'];
        if (!defaultTheme || !validThemes.includes(defaultTheme)) {
            return res.status(400).json({ error: 'Invalid theme value' });
        }
        
        const settings = await Settings.findOneAndUpdate(
            { guildId: req.user.guildId },
            { 
                $set: { 
                    'dashboardSettings.defaultTheme': defaultTheme 
                }
            },
            { upsert: true, new: true }
        );

        res.json({ defaultTheme: settings.dashboardSettings.defaultTheme });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update default theme' });
    }
});

router.use('/channel-stats', channelStatsRoutes);

module.exports = router; 