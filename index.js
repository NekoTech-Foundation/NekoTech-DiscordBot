const { MemoryChecker } = require('./utils/memoryChecker.js');
const { updateDashboardEnv } = require('./utils/dashboardEnv');
const startDashboardServer = require('./dashboard/server/index.js');
const { getConfig, getLang, getCommands } = require('./utils/configLoader.js');

if (process.platform !== "win32") require("child_process").exec("npm install");

const colors = require('ansi-colors');
console.log(`${colors.yellow(`[Initializing...]`)}`);

const fs = require('fs');
const packageFile = require('./package.json');

const config = getConfig();
const lang = getLang();

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
    console.log(`${colors.red(`[ERROR] Drako Bot requires a NodeJS version of 18 or higher!\nYou can check your NodeJS by running the "node -v" command in your terminal.`)}`);
    console.log(`${colors.blue(`\n[INFO] To update Node.js, follow the instructions below for your operating system:`)}`);
    console.log(`${colors.green(`- Windows:`)} Download and run the installer from ${colors.cyan(`https://nodejs.org/`)}`);
    console.log(`${colors.green(`- Ubuntu/Debian:`)} Run the following commands in the Terminal:`);
    console.log(`${colors.cyan(`  - sudo apt update`)}`);
    console.log(`${colors.cyan(`  - sudo apt upgrade nodejs`)}`);
    console.log(`${colors.green(`- CentOS:`)} Run the following commands in the Terminal:`);
    console.log(`${colors.cyan(`  - sudo yum update`)}`);
    console.log(`${colors.cyan(`  - sudo yum install -y nodejs`)}`);

    let logMsg = `\n\n[${new Date().toLocaleString()}] [ERROR] Drako Bot requires a NodeJS version of 18 or higher!`;
    fs.appendFile("./logs.txt", logMsg, (e) => {
        if (e) console.log(e);
    });

    process.exit();
}

const { Client, GatewayIntentBits } = require('discord.js');

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

(async () => {
    try {
         if (config.Dashboard.Enabled) {
             if (updateDashboardEnv()) {
                 client.once('ready', () => {
                     console.log(`${colors.green(`[SUCCESS] Bot is ready. Starting dashboard server...`)}`);
                     startDashboardServer();
                 });
             } else {
                 console.error(`${colors.red(`[ERROR] Failed to update dashboard environment. Dashboard will not start.`)}`);
                 process.exit(1);
             }
         }
         
     } catch (error) {
         console.error('Error during initialization:', error);
         process.exit(1);
     }
 })();
 
 const memoryChecker = new MemoryChecker('Drako Bot');
 const fetch = require('node-fetch');
//const { getConfig, getLang, getCommands } = require('./utils/configLoader.js');
 
 memoryChecker.logMemoryUsage = async function() {
     const memUsage = process.memoryUsage();
     const totalMemory = Math.round(
         (memUsage.heapUsed + memUsage.external + memUsage.arrayBuffers) / 1024 / 1024 * 100
     ) / 100;
     
     if (global.updateBotMemory) {
         global.updateBotMemory(totalMemory);
         return;
     }
 
     try {
         const dashboardUrl = `http://${config.Dashboard.URL}:${config.Dashboard.Port}/api/memory/bot`;
         
         const response = await fetch(dashboardUrl, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ memory: totalMemory }),
             timeout: 2000
         });
 
         if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
         }
     } catch (error) {
         if (!error.type === 'request-timeout') {
             console.error("[BOT] Memory update error:", error.message);
         }
     }
 }
 
 memoryChecker.start();

client.invites = new Map();

const { Player } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const { Logger } = require('./utils/logger');
const { disableYoutubeiLogs, disableYouTubeDebugLogs } = require('./utils/disableDebugLogs');

let player = null;

process.env.DISCORD_PLAYER_SILENCE_WARNINGS = 'true';
disableYoutubeiLogs();
disableYouTubeDebugLogs();

player = new Player(client, {
    skipFFmpeg: false, 
    lagMonitor: 1000,
    connectionTimeout: 45 * 1000, // 45 seconds
    leaveOnEnd: config.Music?.LeaveOnEnd === true,
    leaveOnStop: config.Music?.LeaveOnEnd === true,
    leaveOnEmpty: config.Music?.LeaveOnEmpty === true,
    leaveOnEmptyCooldown: config.Music?.LeaveEmptyDelay || 60000,
});

global.player = player;

async function registerExtractors() {
    const extractorOptions = {
      streamOptions: {
        useClient: "WEB_EMBEDDED",
      },
      generateWithPoToken: true,
      cookie: config.Cookie
    };

    await player.extractors.register(YoutubeiExtractor, extractorOptions);

    await player.extractors.loadDefault((ext) => !['YouTubeExtractor'].includes(ext));
}

registerExtractors();

client.once('ready', async () => {
    try {
        client.guilds.cache.forEach(async guild => {
            try {
                const invites = await guild.invites.fetch();
                const codeUses = new Map(invites.map(invite => [invite.code, invite.uses]));
                client.invites.set(guild.id, codeUses);

            } catch (error) {
                console.error(`Failed to fetch invites or determine existing members for guild ${guild.id}: ${error}`);
            }
        });

        if (global.MusicManager) {
            Logger.log('Music system already initialized, skipping duplicate initialization');
        } else {
            const { getMusicManager } = require('./utils/musicManager');
            global.MusicManager = getMusicManager(client);
            
            if (global.MusicManager) {
              //  Logger.log('✓ Music system initialized successfully.');
            } else {
                Logger.error('Failed to initialize music system - manager creation failed');
            }
        }
    } catch (error) {
        Logger.error(`Error in client ready event: ${error}`);
    }
});

client.on('inviteCreate', async invite => {
    try {
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

require("./utils.js");
require('./events/antiNuke')(client);

const filePath = './logs.txt';
const maxLength = 300;

require('@discordjs/voice');