const { ActivityType, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const moment = require('moment-timezone');
const colors = require('ansi-colors');
const packageFile = require('../package.json');
const GuildData = require('../models/guildDataSchema');
const Verification = require('../models/verificationSchema');
const Ticket = require('../models/tickets');
const BotActivity = require('../models/BotActivity');
// const { handleVerification } = require('../events/Verification/VerificationEvent');
const { createUnverifiedRoleIfNeeded } = require('../utils/roleUtils');
const botStartTime = Date.now();

const { getConfig } = require('../utils/configLoader.js');
const config = getConfig();

const updateActivity = async (client) => {
    const botActivityData = await BotActivity.findOne({ botId: 'global_settings' });
    if (!botActivityData || botActivityData.activities.length === 0) {
        client.user.setPresence({
            activities: [{ name: 'NekoTech', type: ActivityType.Watching }],
            status: 'online',
        });
        return;
    }

    const activity = botActivityData.activities[botActivityData.lastActivityIndex || 0];
    botActivityData.lastActivityIndex = (botActivityData.lastActivityIndex + 1) % botActivityData.activities.length;
    await botActivityData.save();

    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const totalChannels = client.guilds.cache.reduce((acc, guild) => acc + guild.channels.cache.size, 0);
    const onlineMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.members.cache.filter(member => member.presence?.status === 'online').size, 0);
    const totalBoosts = client.guilds.cache.reduce((acc, guild) => acc + guild.premiumSubscriptionCount, 0);

    let status = activity.status;
    status = status.replace(/{total-users}/g, totalUsers);
    status = status.replace(/{total-channels}/g, totalChannels);
    status = status.replace(/{online-members}/g, onlineMembers);
    status = status.replace(/{uptime}/g, moment.duration(client.uptime).humanize());
    status = status.replace(/{total-boosts}/g, totalBoosts);

    client.user.setPresence({
        activities: [{
            name: status,
            type: ActivityType[activity.activityType],
            url: activity.streamingURL,
        }],
        status: activity.statusType,
    });
};

module.exports = async client => {
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

    setInterval(() => updateActivity(client), 60000);
    updateActivity(client);
};
