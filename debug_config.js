try {
    const { Client, GatewayIntentBits } = require('discord.js');
    const { useMainPlayer } = require('discord-player');
    
    console.log('Loading discord-player...');
    const player = useMainPlayer(); // Might fail if no client.
    
    const { Downloader } = require('@tobyg74/tiktok-api-dl');
    console.log('Loading tiktok-api-dl...');
    
    const PixivApi = require('pixiv-api-client');
    console.log('Loading pixiv-api-client...');
    
    console.log('All loaded.');
} catch (e) {
    console.error(e);
}
