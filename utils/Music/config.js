// Load environment variables
require('dotenv').config();
const { getConfig } = require('../configLoader');
const mainConfig = getConfig();
const musicConfig = mainConfig.MusicBot || {};

module.exports = {
    // Discord Bot Settings 
    discord: {
        token: mainConfig.BotToken || process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID || '#PUT_YOUR_CLIENTID_HERE', // Client ID usually in env
        guildId: mainConfig.GuildID || process.env.GUILD_ID || null,
    },

    // Spotify API Settings
    spotify: {
        clientId: musicConfig.Spotify?.ClientID || process.env.SPOTIFY_CLIENT_ID || 'd1f2359406bb44efa9a7e8556f1d67d5',
        clientSecret: musicConfig.Spotify?.ClientSecret || process.env.SPOTIFY_CLIENT_SECRET || '0e9f0bb1ce5548d4834f4fc468c86f89',
    },

    // Genius API Settings
    genius: {
        clientId: musicConfig.Genius?.ClientID || process.env.GENIUS_CLIENT_ID || '',
        clientSecret: musicConfig.Genius?.ClientSecret || process.env.GENIUS_CLIENT_SECRET || '',
    },

    // Bot Settings
    bot: {
        defaultVolume: musicConfig.Settings?.DefaultVolume || 100,
        maxQueueSize: musicConfig.Settings?.MaxQueueSize || 100,
        maxPlaylistSize: musicConfig.Settings?.MaxPlaylistSize || 50,
        status: musicConfig.Settings?.Status || process.env.STATUS || '🎵 NekoMusic | /play',
        embedColor: mainConfig.EmbedColors?.Default || process.env.EMBED_COLOR || '#FF6B6B',
        supportServer: musicConfig.Settings?.SupportServer || process.env.SUPPORT_SERVER || 'https://discord.gg/96hgDj4b4j',
        website: musicConfig.Settings?.Website || process.env.WEBSITE || 'https://nekocomics.xyz',
        invite: 'https://discord.com/oauth2/authorize?client_id=' + (process.env.CLIENT_ID || '') + '&permissions=8&scope=bot%20applications.commands',
    },

    // Audio Settings
    audio: {
        quality: musicConfig.Audio?.Quality || 'highestaudio',
        format: musicConfig.Audio?.Format || 'mp3',
        bitrate: musicConfig.Audio?.Bitrate || 320,
        filters: {
            bassboost: 'bass=g=20',
            nightcore: 'aresample=48000,asetrate=48000*1.25',
            vaporwave: 'aresample=48000,asetrate=48000*0.8',
            _8d: 'apulsator=hz=0.09',
        }
    },

    ytdl: {
        requestOptions: {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        },
        format: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
        filter: 'audioonly',
        quality: musicConfig.Audio?.Quality || 'highestaudio',
        highWaterMark: 1 << 25,
        cookiesFromBrowser: musicConfig.YTDL?.CookiesFromBrowser || process.env.COOKIES_FROM_BROWSER || null, // 'chrome', 'firefox', 'edge', 'safari'
        cookiesFile: musicConfig.YTDL?.CookiesFile || process.env.COOKIES_FILE || null, // './cookies.txt'
    },

    // Sharding Settings (for bots in 1000+ servers)
    sharding: {
        // Set to 'auto' to let Discord.js calculate optimal shard count
        // Or set a specific number (e.g., 2, 4, 8, etc.)
        // Formula: Math.ceil(total_guilds / 1000) = recommended shards
        totalShards: musicConfig.Sharding?.TotalShards || process.env.TOTAL_SHARDS || 'auto',
        
        // Shard list to spawn (default: 'auto' spawns all)
        // Example: [0, 1, 2] to spawn specific shards
        shardList: process.env.SHARD_LIST || 'auto',
        
        // Sharding mode: 'process' (recommended) or 'worker'
        // 'process' = each shard runs in separate Node.js process (more stable)
        // 'worker' = each shard runs in worker thread (less memory, experimental)
        mode: musicConfig.Sharding?.Mode || process.env.SHARD_MODE || 'process',
        
        // Auto-respawn crashed shards (recommended: true)
        respawn: process.env.SHARD_RESPAWN !== 'false',
        
        // Delay between spawning each shard (milliseconds)
        // Discord recommends 5000-5500ms to avoid rate limits
        spawnDelay: parseInt(process.env.SHARD_SPAWN_DELAY) || 5500,
        
        // Timeout for shard ready event (milliseconds)
        spawnTimeout: parseInt(process.env.SHARD_SPAWN_TIMEOUT) || 30000,
    }

};
