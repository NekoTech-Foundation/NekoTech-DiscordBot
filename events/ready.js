const { ActivityType, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const moment = require('moment-timezone');
const colors = require('ansi-colors');
const packageFile = require('../package.json');
const GuildData = require('../models/guildDataSchema');
const Verification = require('../models/verificationSchema');
const Ticket = require('../models/tickets');
// const { handleVerification } = require('../events/Verification/VerificationEvent');
const { createUnverifiedRoleIfNeeded } = require('../utils/roleUtils');
const botStartTime = Date.now();

const { getConfig } = require('../utils/configLoader.js');

let currentActivityIndex = 0;

const updateActivity = async (client) => {
    const config = getConfig(); // Reload config to get latest updates
    const settings = config.ActivitySettings;

    if (!settings || !settings.Enabled || !settings.Activities || settings.Activities.length === 0) {
        client.user.setPresence({
            activities: [{ name: 'NekoTech', type: ActivityType.Watching }],
            status: 'online',
        });
        return;
    }

    const activity = settings.Activities[currentActivityIndex];
    currentActivityIndex = (currentActivityIndex + 1) % settings.Activities.length;

    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const totalChannels = client.guilds.cache.reduce((acc, guild) => acc + guild.channels.cache.size, 0);
    const onlineMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.members.cache.filter(member => member.presence?.status === 'online').size, 0);
    const totalBoosts = client.guilds.cache.reduce((acc, guild) => acc + guild.premiumSubscriptionCount, 0);

    let statusText = activity.Text;
    statusText = statusText.replace(/{total-users}/g, totalUsers);
    statusText = statusText.replace(/{total-channels}/g, totalChannels);
    statusText = statusText.replace(/{online-members}/g, onlineMembers);
    statusText = statusText.replace(/{uptime}/g, moment.duration(client.uptime).humanize());
    statusText = statusText.replace(/{total-boosts}/g, totalBoosts);

    client.user.setPresence({
        activities: [{
            name: statusText,
            type: ActivityType[activity.Type] || ActivityType.Playing,
            url: activity.URL || null,
        }],
        status: activity.Status || 'online',
    });
};

module.exports = async client => {
    const config = getConfig();
    console.log(colors.green(`[INFO] ${client.user.tag} is online!`));
    console.log(colors.cyan(`[INFO] Bot Version: ${packageFile.version}`));
    console.log(colors.cyan(`[INFO] Node.js Version: ${process.version}`));
    console.log(colors.cyan(`[INFO] Discord.js Version: ${packageFile.dependencies['discord.js']}`));

    client.guilds.cache.forEach(async guild => {
        try {
            if (guild.members.me.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                const invites = await guild.invites.fetch();
                const codeUses = new Map(invites.map(invite => [invite.code, invite.uses]));
                client.invites.set(guild.id, codeUses);
            } else {
                console.log(colors.yellow(`[INFO] Missing MANAGE_GUILD permission in guild: ${guild.name} (${guild.id}). Invite tracking will be disabled for this guild.`));
            }
        } catch (error) {
            if (error.code === 50013) { // Missing Permissions
                console.log(colors.yellow(`[INFO] Missing permissions to fetch invites in guild: ${guild.name} (${guild.id}). Invite tracking will be disabled for this guild.`));
            } else {
                console.error(`Failed to fetch invites for guild ${guild.id}: ${error}`);
            }
        }

        try {
            let verificationData = await Verification.findOne({ guildID: guild.id });
            if (!verificationData) {
                verificationData = await Verification.create({
                    guildID: guild.id,
                    msgID: null,
                    unverifiedRoleID: null
                });
            }

            await createUnverifiedRoleIfNeeded(guild, verificationData);
            // await handleVerification(client, guild);
        } catch (error) {
            console.error(`Failed to initialize verification for guild ${guild.id}: ${error}`);
        }

        let guildData = await GuildData.findOne({ guildID: guild.id });
        if (!guildData) {
            guildData = await GuildData.create({
                guildID: guild.id,
                cases: 0,
                totalMessages: 0,
                stars: {},
                totalSuggestions: 0,
                timesBotStarted: 1
            });
        } else {
            guildData.timesBotStarted++;
            await guildData.save();
        }
    });

    // Initial update
    updateActivity(client);

    // Set interval based on config or default to 60s
    let intervalTime = config.ActivitySettings?.Interval || 60000;
    // ensure minimum 10s to avoid api spam
    if (intervalTime < 10000) intervalTime = 10000;

    setInterval(() => updateActivity(client), intervalTime);
};
