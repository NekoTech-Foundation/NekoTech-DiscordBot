const { ActivityType, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const moment = require('moment-timezone');
const colors = require('ansi-colors');
const packageFile = require('../package.json');
const GuildData = require('../models/guildDataSchema');
const Verification = require('../models/verificationSchema');
const Ticket = require('../models/tickets');
const BotActivity = require('../models/BotActivity');
const { handleVerification, createUnverifiedRoleIfNeeded } = require('../events/Verification/VerificationEvent');
const botStartTime = Date.now();

const { getConfig } = require('../utils/configLoader.js');
const config = getConfig();


module.exports = async client => {
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
    });

    // The rest of the file is either disabled or not guild-specific
};
