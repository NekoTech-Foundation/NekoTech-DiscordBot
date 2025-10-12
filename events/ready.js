const { ActivityType, ChannelType } = require('discord.js');
const fs = require('fs');
//const yaml = require("js-yaml");
const moment = require('moment-timezone');
const colors = require('ansi-colors');
const packageFile = require('../package.json');
const GuildData = require('../models/guildDataSchema');
//const UserData = require('../models/UserData');
const Verification = require('../models/verificationSchema');
const Ticket = require('../models/tickets');
const BotActivity = require('../models/BotActivity');
const { handleVerification, createUnverifiedRoleIfNeeded } = require('../events/Verification/VerificationEvent');
const botStartTime = Date.now();

//const ChannelStat = require('../models/channelStatSchema');
const { getConfig } = require('../utils/configLoader.js');
const config = getConfig();


module.exports = async client => {
    client.guilds.cache.forEach(async guild => {
        try {
            let verificationData = await Verification.findOne({ guildID: guild.id });
            if (!verificationData) {
                verificationData = new Verification({
                    guildID: guild.id,
                    msgID: null,
                    unverifiedRoleID: null
                });
                await verificationData.save();
            }

            await createUnverifiedRoleIfNeeded(guild, verificationData);
            await handleVerification(client, guild);
        } catch (error) {
            console.error(`Failed to initialize verification for guild ${guild.id}: ${error}`);
        }
    });

    let guild = client.guilds.cache.get(client.guilds.cache.first().id);
    if (!guild) {
        console.log('\x1b[31m%s\x1b[0m', `[ERROR] The bot is not in the configured server!`);
        process.exit();
    }

    let guildData = await GuildData.findOne({ guildID: guild.id });
    if (!guildData) {
        guildData = new GuildData({
            guildID: guild.id,
            cases: 0,
            totalMessages: 0,
            stars: {},
            totalSuggestions: 0,
            timesBotStarted: 1
        });
        await guildData.save();
    } else {
        guildData.timesBotStarted++;
        await guildData.save();
    }

    let verificationData = await Verification.findOne({ guildID: guild.id });
    if (!verificationData) {
        verificationData = new Verification({
            guildID: guild.id,
            msgID: null,
            unverifiedRoleID: null
        });
        await verificationData.save();
    }

    async function updateBotActivity(client, index) {
        try {
            const guildId = client.guilds.cache.first().id;
            const botActivityData = await BotActivity.findOne({ guildId });

            if (!botActivityData || botActivityData.activities.length === 0) {
                return;
            }

            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                console.log(`Guild not found for ID: ${guildId}`);
                return;
            }

            try {
                await guild.members.fetch();
            } catch (error) {
                if (error.code !== 'GuildMembersTimeout') {
                    console.error('Error fetching members:', error);
                }
            }

            await guild.channels.fetch();

            const totalChannels = guild.channels.cache.filter(channel =>
                channel.type === ChannelType.GuildText ||
                channel.type === ChannelType.GuildVoice ||
                channel.type === ChannelType.GuildCategory ||
                channel.type === ChannelType.GuildForum ||
                channel.type === ChannelType.GuildStageVoice
            ).size;

            const onlineMembers = guild.members.cache.filter(member =>
                ['online', 'idle', 'dnd'].includes(member.presence?.status)
            ).size;

            const uptime = getUptime();
            const { totalTickets, openTickets, closedTickets, deletedTickets } = await getTicketStatistics(guildId);

            const formatter = new Intl.NumberFormat('en-US');

            const currentActivity = botActivityData.activities[index];

            const activityString = currentActivity.status
                .replace(/{total-users}/g, formatter.format(guild.memberCount))
                .replace(/{total-channels}/g, formatter.format(totalChannels))
                .replace(/{total-messages}/g, formatter.format(guildData.totalMessages))
                .replace(/{online-members}/g, formatter.format(onlineMembers))
                .replace(/{uptime}/g, uptime)
                .replace(/{total-boosts}/g, formatter.format(guild.premiumSubscriptionCount))
                .replace(/{total-cases}/g, formatter.format(guildData.cases))
                .replace(/{total-suggestions}/g, formatter.format(guildData.totalSuggestions))
                .replace(/{times-bot-started}/g, formatter.format(guildData.timesBotStarted))
                .replace(/{total-tickets}/g, formatter.format(totalTickets))
                .replace(/{open-tickets}/g, formatter.format(openTickets))
                .replace(/{closed-tickets}/g, formatter.format(closedTickets))
                .replace(/{deleted-tickets}/g, formatter.format(deletedTickets));

            let activityType;
            switch (currentActivity.activityType.toUpperCase()) {
                case "WATCHING":
                    activityType = ActivityType.Watching;
                    break;
                case "PLAYING":
                    activityType = ActivityType.Playing;
                    break;
                case "COMPETING":
                    activityType = ActivityType.Competing;
                    break;
                case "STREAMING":
                    activityType = ActivityType.Streaming;
                    break;
                case "CUSTOM":
                    activityType = ActivityType.Custom;
                    break;
                default:
                    console.log(`Invalid Activity Type: ${currentActivity.activityType}`);
                    activityType = ActivityType.Playing;
            }

            const presenceOptions = {
                activities: [{ name: activityString, type: activityType }],
                status: currentActivity.statusType.toLowerCase(),
            };

            if (activityType === ActivityType.Streaming && currentActivity.streamingURL) {
                presenceOptions.activities[0].url = currentActivity.streamingURL;
            }

            await client.user.setPresence(presenceOptions);

            await client.user.setStatus(currentActivity.statusType.toLowerCase());

        } catch (error) {
            console.error('Error updating bot activity:', error);
        }
    }

    async function startActivityUpdateLoop(client) {
        let index = 0;
        let lastUpdate = Date.now();
        const MIN_UPDATE_INTERVAL = 60000;

        setInterval(async () => {
            try {
                const now = Date.now();
                if (now - lastUpdate < MIN_UPDATE_INTERVAL) {
                    return;
                }

                const guildId = client.guilds.cache.first().id;
                const botActivityData = await BotActivity.findOne({ guildId });

                if (botActivityData && botActivityData.activities.length > 0) {
                    await updateBotActivity(client, index);
                    index = (index + 1) % botActivityData.activities.length;
                    lastUpdate = now;
                }
            } catch (error) {
                console.error('Error in activity update loop:', error);
            }
        }, 30000);
    }

    await startActivityUpdateLoop(client);

    const authorizedGuildId = config.GuildID;
    client.guilds.cache.forEach(guild => {
        if (guild.id !== authorizedGuildId) {
            guild.leave();
            console.log('\x1b[31m%s\x1b[0m', `[INFO] Bot was in an unauthorized server! I automatically left it (${guild.name})`);
        }
    });

    if (guild && !guild.members.me.permissions.has("Administrator")) {
        console.log('\x1b[31m%s\x1b[0m', `[ERROR] The bot doesn't have enough permissions! Please give the bot ADMINISTRATOR permissions in your server or it won't function properly!`);
    }

    try {
        await displayStartupMessage(client);
    } catch (error) {
        console.error('An error occurred:', error);
    }
};

async function displayStartupMessage(client) {
    try {
        const guild = client.guilds.cache.first();
        const updatedGuildData = await GuildData.findOne({ guildID: guild.id });
        const totalTickets = await Ticket.countDocuments({});
        const used = process.memoryUsage();
        const startTime = new Date();
        const serverCount = client.guilds.cache.size;
        const channelCount = client.channels.cache.size;

        let uptimeInfo = '';
        if (updatedGuildData.timesBotStarted > 1) {
            uptimeInfo = ` | ${colors.green('●')} Uptime tracking active`;
        }

        const headerText = 'DRAKO BOT ● POWERED BY DRAKO DEVELOPMENT';
        const boxWidth = 70;
        const contentWidth = boxWidth - 2;
        const leftPadding = Math.floor((contentWidth - headerText.length) / 2);
        const rightPadding = contentWidth - headerText.length - leftPadding;
        
        console.log('\n' + colors.bold.cyan('╔══════════════════════════════════════════════════════════════════════╗'));
        console.log(colors.bold.cyan('║') + colors.bold.white(' '.repeat(leftPadding) + headerText + ' '.repeat(rightPadding)) + colors.bold.cyan('  ║'));
        console.log(colors.bold.cyan('╚══════════════════════════════════════════════════════════════════════╝\n'));

        console.log(colors.bold.blue('┌─ ') + colors.bold.white('SYSTEM INFORMATION ') + colors.bold.blue('──────────────────────────────────────────┐'));
        console.log(colors.blue('│'));
        console.log(colors.blue('│  ') + colors.blue('●') + colors.white(' Version    : ') + colors.bold.white(`v${packageFile.version}`));
        console.log(colors.blue('│  ') + colors.blue('●') + colors.white(' Node       : ') + colors.bold.white(process.version));
        console.log(colors.blue('│  ') + colors.blue('●') + colors.white(' Start Time : ') + colors.bold.white(startTime.toLocaleString()));
        console.log(colors.blue('│  ') + colors.blue('●') + colors.white(' Memory     : ') + colors.bold.white(`${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`));
        console.log(colors.blue('│'));

        console.log(colors.bold.magenta('├─ ') + colors.bold.white('RESOURCES ') + colors.bold.magenta('───────────────────────────────────────────────────┤'));
        console.log(colors.magenta('│'));
        console.log(colors.magenta('│  ') + colors.magenta('●') + colors.white(' Support    : ') + colors.bold.white('discord.drakodevelopment.net'));
        console.log(colors.magenta('│  ') + colors.magenta('●') + colors.white(' Docs       : ') + colors.bold.white('docs.drakodevelopment.net'));
        console.log(colors.magenta('│'));

        if (config.Statistics !== false) {
            console.log(colors.bold.yellow('├─ ') + colors.bold.white('BOT STATISTICS ') + colors.bold.yellow('──────────────────────────────────────────────┤'));
            console.log(colors.yellow('│'));
            console.log(colors.yellow('│  ') + colors.yellow('●') + colors.white(' Users      : ') + colors.bold.white(client.users.cache.size));
            console.log(colors.yellow('│  ') + colors.yellow('●') + colors.white(' Channels   : ') + colors.bold.white(channelCount));
            console.log(colors.yellow('│  ') + colors.yellow('●') + colors.white(' Commands   : ') + colors.bold.white(client.slashCommands.size));
            console.log(colors.yellow('│  ') + colors.yellow('●') + colors.white(' Messages   : ') + colors.bold.white(updatedGuildData.totalMessages));
            console.log(colors.yellow('│  ') + colors.yellow('●') + colors.white(' Tickets    : ') + colors.bold.white(totalTickets));
            console.log(colors.yellow('│  ') + colors.yellow('●') + colors.white(' Suggestions: ') + colors.bold.white(updatedGuildData.totalSuggestions));
            console.log(colors.yellow('│  ') + colors.yellow('●') + colors.white(' Bot Starts : ') + colors.bold.white(updatedGuildData.timesBotStarted));
            console.log(colors.yellow('│'));
        }

        if (updatedGuildData.timesBotStarted === 1) {
            console.log(colors.bold.yellow('├─ ') + colors.bold.yellow('FIRST-TIME SETUP ') + colors.bold.yellow('─────────────────────────────────────────────┤'));
            console.log(colors.yellow('│'));
            console.log(colors.yellow('│  ') + colors.yellow('Need help? Visit our Discord support server for assistance.'));
            console.log(colors.yellow('│  ') + colors.red('Important: Leaking or redistributing our products is prohibited.'));
            console.log(colors.yellow('│'));
        }

        console.log(colors.bold.green('└─ ') + colors.bold.green('STATUS: BOT IS NOW ONLINE AND READY! ') + colors.bold.green('────────────────────────┘'));
        console.log('');

        fs.appendFile("./logs.txt", `\n[${new Date().toLocaleString()}] [READY] Bot is now online and ready!`, 
            (e) => e && console.error('Error writing to log file:', e));

    } catch (error) {
        console.error('Error in startup logging:', error);
    }
}

function getUptime() {
    const duration = moment.duration(Date.now() - botStartTime);
    let uptimeString = '';

    const years = duration.years();
    const months = duration.months();
    const weeks = duration.weeks();
    const days = duration.days();
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    if (years > 0) {
        uptimeString += `${years}y `;
    }

    if (years > 0 || months > 0) {
        uptimeString += `${months}mo `;
    }

    if ((years > 0 || months > 0 || weeks > 0) && !days) {
        uptimeString += `${weeks}w `;
    }

    if (years > 0 || months > 0 || weeks > 0 || days > 0) {
        uptimeString += `${days}d `;
    }
    uptimeString += `${hours}h ${minutes}m ${seconds}s`;

    return uptimeString.trim();
}

async function getTicketStatistics(guildId) {
    const totalTickets = await Ticket.countDocuments({ guildId });
    const openTickets = await Ticket.countDocuments({ guildId, status: 'open' });
    const closedTickets = await Ticket.countDocuments({ guildId, status: 'closed' });
    const deletedTickets = await Ticket.countDocuments({ guildId, status: 'deleted' });
    return { totalTickets, openTickets, closedTickets, deletedTickets };
}