global.startTime = Date.now();
const path = require('path');
const { MemoryChecker } = require('./utils/memoryChecker.js');

const { getConfig, getLang, getCommands } = require('./utils/configLoader.js');

if (process.platform !== "win32") require("child_process").exec("npm install");

const colors = require('ansi-colors');
console.log(`${colors.cyan('[STARTUP]')} ${colors.yellow('Initializing system...')}`);

const fs = require('fs');
const packageFile = require('./package.json');

const config = getConfig();
const lang = getLang();

const { startSeedShop } = require('./commands/Addons/Farming/seedShop');
startSeedShop();


global.config = config;
global.lang = lang;

if (packageFile.version !== config.Version) {
    console.log(`${colors.red(`[ERROR] Version mismatch: package.json version (${packageFile.version}) does not match config.yml version (${config.Version}). Please update the bot...`)}`);
    let logMsg = `\n\n[${new Date().toLocaleString()}] [ERROR] Version mismatch detected. Bot stopped.\nPackage version: ${packageFile.version}\nConfig version: ${config.Version}`;
    fs.appendFileSync("./logs.txt", logMsg, (e) => {
        if (e) console.log(e);
    });
    process.exit(1);
}

let logMsg = `\n\n[${new Date().toLocaleString()}] [STARTING] Attempting to start the bot..\nNodeJS Version: ${process.version}\nBot Version: ${packageFile.version}`;
fs.appendFile("./logs.txt", logMsg, (e) => {
    if (e) console.log(e);
});

const version = Number(process.version.split('.')[0].replace('v', ''));
if (version < 18) {
    console.log(`${colors.red(`[ERROR] NekoBuckets Bot requires a NodeJS version of 18 or higher!\nYou can check your NodeJS by running the "node -v" command in your terminal.`)}`);

    let logMsg = `\n\n[${new Date().toLocaleString()}] [ERROR] NekoBuckets Bot requires a NodeJS version of 18 or higher!`;
    fs.appendFile("./logs.txt", logMsg, (e) => {
        if (e) console.log(e);
    });

    process.exit();
}

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const pixivAddon = require('./commands/Addons/Pixiv/pixiv.js');
const musicButtonHandler = require('./utils/Music/buttonHandler.js');

const musicModalHandler = require('./utils/Music/modalHandler.js');




const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent
    ]
});

client.setMaxListeners(20);

global.client = client;



const memoryChecker = new MemoryChecker('NekoBuckets Bot');
const fetch = require('node-fetch');
//const { getConfig, getLang, getCommands } = require('./utils/configLoader.js');

memoryChecker.logMemoryUsage = async function () {
    const memUsage = process.memoryUsage();
    const totalMemory = Math.round(
        (memUsage.heapUsed + memUsage.external + memUsage.arrayBuffers) / 1024 / 1024 * 100
    ) / 100;

    if (global.updateBotMemory) {
        global.updateBotMemory(totalMemory);
        return;
    }


}

memoryChecker.start();

client.invites = new Map();

// --- Music Bot Initialization ---
const { Collection } = require('discord.js');
client.players = new Collection();
const MusicEmbedManager = require('./utils/Music/MusicEmbedManager');
client.musicEmbedManager = new MusicEmbedManager(client);
if (!global.clients) global.clients = {};
global.clients.musicEmbedManager = client.musicEmbedManager;
// --------------------------------






client.on('inviteCreate', async invite => {
    try {
        if (!invite.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageGuild)) return;
        const invites = await invite.guild.invites.fetch();
        const codeUses = new Map(invites.map(invite => [invite.code, invite.uses]));
        client.invites.set(invite.guild.id, codeUses);
    } catch (error) {
        console.error('Error updating invite cache:', error);
    }
});

client.on('inviteDelete', async invite => {
    try {
        const invites = client.invites.get(invite.guild.id);
        if (invites) {
            invites.delete(invite.code);
            client.invites.set(invite.guild.id, invites);
        }
    } catch (error) {
        console.error('Error updating invite cache:', error);
    }
});

// Interaction handler moved to events/interactionCreate.js

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    fs.appendFile('logs.txt', `Uncaught Exception: ${error.stack || error}\n`, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    fs.appendFile('logs.txt', `Unhandled Rejection at: ${promise}, reason: ${reason.stack || reason}\n`, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
});

module.exports = client;

// Initialize message commands collection
client.messageCommands = new Map();

// Initialize slash commands collection
client.commands = new Map();

// Load economy message command
// Economy command removed as part of consolidation

require("./utils.js")(client);
// Start SePay Webhook Server
const { startWebhookServer } = require('./utils/sepayWebhook');
// Use configured port or default to 3000
// Whitelabel instances will have their own port set in config
const webhookPort = global.config.SePay && global.config.SePay.Port ? global.config.SePay.Port : 3000;
startWebhookServer(client, webhookPort);

// Whitelabel Expiry Check (Only Main Bot needs to run this)
if (!global.config.IsWhitelabel) {
    require('./cron/whitelabelExpiry')(client);

    // Auto-start active whitelabel instances
    const WhitelabelManager = require('./utils/whitelabelManager');
    client.once('ready', () => {
        // Wait 5s to ensure DB is fully ready and stable
        setTimeout(() => {
            WhitelabelManager.startAllInstances().catch(err => console.error('[Whitelabel] Auto-start failed:', err));
        }, 5000);
    });
}

const filePath = './logs.txt';
const maxLength = 300;
