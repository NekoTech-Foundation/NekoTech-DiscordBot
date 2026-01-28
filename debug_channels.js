const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

// Load Config
const configPath = path.join(__dirname, 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

// Load Lang
const langPath = path.join(__dirname, 'lang', 'vn.yml');
const lang = yaml.load(fs.readFileSync(langPath, 'utf8'));

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const TARGET_CHANNELS = ['1405266473894805619', '1464775149596180563'];

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    console.log('--- Config Validation ---');
    console.log('VoiceLogs:', config.VoiceLogs ? 'Present' : 'Missing');
    console.log('VoiceChannelJoin:', config.VoiceChannelJoin ? 'Present' : 'Missing (Expected if nested in VoiceLogs)');
    console.log('AutoKick:', config.AutoKick ? 'Present' : 'Missing');
    if (config.AutoKick) {
        console.log('AutoKick.Description Type:', Array.isArray(config.AutoKick.DM.Embed.Description) ? 'Array' : typeof config.AutoKick.DM.Embed.Description);
    }
    console.log('Lang.VoiceChannelStreamStart:', lang.VoiceChannelStreamStart ? 'Present' : 'Missing');
    if (lang.VoiceChannelStreamStart) {
        console.log('Lang.VoiceChannelStreamStart.Embed.Description:', lang.VoiceChannelStreamStart.Embed.Description);
    }

    console.log('--- Channel Lookup ---');
    for (const channelId of TARGET_CHANNELS) {
        try {
            const channel = await client.channels.fetch(channelId);
            console.log(`Channel ${channelId}: Name="${channel.name}", Type=${channel.type}`);
        } catch (error) {
            console.error(`Channel ${channelId}: Not Found or Error (${error.message})`);
        }
    }

    client.destroy();
    process.exit(0);
});

client.login(config.BotToken);
