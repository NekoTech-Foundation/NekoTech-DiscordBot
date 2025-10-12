const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
//const fs = require('fs');
//const yaml = require('js-yaml');
const moment = require('moment-timezone');
const Verification = require('../models/verificationSchema');
const Invite = require('../models/inviteSchema');
const GuildData = require('../models/guildDataSchema');
const UserData = require('../models/UserData');
const { getConfig, getLang, getCommands } = require('../utils/configLoader.js');

const lang = getLang();
const config = getConfig();

const sentWelcomeEmbeds = new Set();
const WELCOME_EMBED_RESET_INTERVAL = parseTime('5m');

setInterval(() => {
    sentWelcomeEmbeds.clear();
}, WELCOME_EMBED_RESET_INTERVAL);

module.exports = async (client, member) => {
    if (member.id === client.user.id || member.user.bot) {
        return;
    }

    if (config.AltPrevention.Enabled) {
        const accountAge = Date.now() - member.user.createdAt;
        const requiredAge = parseTime(config.AltPrevention.TimeLimit);

        if (accountAge < requiredAge) {
            if (config.AltPrevention.DM.Enabled) {
                await sendAltPreventionDM(member);
            }

            if (config.AltPrevention.KickAlts) {
                try {
                    await member.kick('Alt account detected');
                } catch (error) {
                    console.error(`Failed to kick alt account ${member.user.tag}:`, error);
                }
            }

            await sendAltPreventionLog(client, member, accountAge < requiredAge);
            return;
        }
    }

    if (config.VerificationSettings.Enabled && config.VerificationSettings.EnableUnverifiedRole) {
        try {
            let verificationData = await Verification.findOne({ guildID: member.guild.id });
            if (!verificationData || !verificationData.unverifiedRoleID) {
                await createUnverifiedRoleIfNeeded(member.guild, verificationData);
                verificationData = await Verification.findOne({ guildID: member.guild.id });
            }

            const unverifiedRole = member.guild.roles.cache.get(verificationData.unverifiedRoleID);
            if (unverifiedRole) {
                await member.roles.add(unverifiedRole).catch(console.error);
            } else {
            }
        } catch (error) {
            console.error('Error assigning unverified role to new member:', error);
        }
    }

    let inviterName = "Vanity / Unknown";
    let inviterCount = 0;

    try {
        if (!client.invites.has(member.guild.id)) {
            client.invites.set(member.guild.id, new Map());
        }

        const cachedInvites = client.invites.get(member.guild.id);
        const newInvites = await member.guild.invites.fetch();
        client.invites.set(member.guild.id, new Map(newInvites.map(invite => [invite.code, invite.uses])));

        const usedInvite = newInvites.find(invite => cachedInvites.get(invite.code) < invite.uses);

        if (usedInvite) {
            const inviteData = await Invite.findOneAndUpdate(
                { guildID: member.guild.id, inviteCode: usedInvite.code },
                {
                    $inc: { uses: 1 },
                    $addToSet: { joinedUsers: { userID: member.id, joinedAt: new Date() } }
                },
                { upsert: true, new: true }
            );

            if (!inviteData.inviterID) {
                const inviter = await member.guild.members.fetch(usedInvite.inviter.id);
                inviteData.inviterID = inviter.id;
                await inviteData.save();
            }

            const inviter = await member.guild.members.fetch(inviteData.inviterID);
            inviterName = inviter.user.tag;

            const allInvitesByInviter = await Invite.find({ guildID: member.guild.id, inviterID: inviteData.inviterID });
            inviterCount = allInvitesByInviter.reduce((acc, invite) => acc + invite.joinedUsers.length, 0);
            
            // Log the invite join
            const inviteJoinEvent = require('./inviteJoin.js');
            await inviteJoinEvent(client, member, usedInvite, inviter, inviterCount);
        }
    } catch (error) {
      //  console.error(`[ERROR] Failed to fetch invites: ${error}`);
    }

    if (config.WelcomeMessage.Enabled) {
        sendWelcomeMessage(client, member, inviterName, inviterCount);
    }

    await updateStoredMembers(client, member.guild.id);

    try {
        const userData = await UserData.findOne({ userId: member.id, guildId: member.guild.id });
        if (userData && userData.isMuted) {
            const guildData = await GuildData.findOne({ guildID: member.guild.id });
            const timeoutRole = guildData && guildData.timeoutRoleId ? member.guild.roles.cache.get(guildData.timeoutRoleId) : null;

            if (timeoutRole) {
                await member.roles.add(timeoutRole, 'Reapplying muted role on rejoin');
            } else {
            }
        }
    } catch (error) {
        console.error(`Error checking user data on join: ${error}`);
    }
    
    const { handleJoinRoles } = require('./Verification/VerificationEvent');

    if (!config.VerificationSettings.Enabled && config.JoinRoleSettings.RestoreRoles.Enabled) {
        await handleJoinRoles(member);
    } else {
    }
};

async function sendAltPreventionDM(member) {
    const dmEmbed = createEmbed(config.AltPrevention.DM.Embed, member);
    try {
        await member.send({ embeds: [dmEmbed] });
    } catch (error) {
        console.error(`Failed to send alt prevention DM to ${member.user.tag}:`, error);
    }
}

async function sendAltPreventionLog(client, member, wasKicked) {
    const logChannel = member.guild.channels.cache.get(config.AltPrevention.Log.LogsChannelID);
    if (!logChannel) return;

    const logEmbed = createEmbed(config.AltPrevention.Log, member);
    logEmbed.addFields({ name: 'Kicked', value: wasKicked ? 'Yes' : 'No' });

    try {
        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error(`Failed to send alt prevention log for ${member.user.tag}:`, error);
    }
}

function createEmbed(embedConfig, member) {
    const embed = new EmbedBuilder().setColor(embedConfig.Color);
    const userAvatarURL = member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 });
    const guildIconURL = member.guild.iconURL({ format: 'png', dynamic: true, size: 4096 });

    if (embedConfig.Title) embed.setTitle(replacePlaceholders(embedConfig.Title, member, '', 0, userAvatarURL, '', false));
    if (embedConfig.Description) {
        const description = embedConfig.Description.join('\n');
        embed.setDescription(replacePlaceholders(description, member, '', 0, userAvatarURL, '', true));
    }

    if (embedConfig.Author.Text) {
        embed.setAuthor({
            name: replacePlaceholders(embedConfig.Author.Text, member, '', 0, userAvatarURL, '', false),
            iconURL: embedConfig.Author.Icon ? replacePlaceholders(embedConfig.Author.Icon, member, '', 0, userAvatarURL, guildIconURL, false) : undefined,
        });
    }

    if (embedConfig.Footer.Text) {
        embed.setFooter({
            text: replacePlaceholders(embedConfig.Footer.Text, member, '', 0, userAvatarURL, '', false),
            iconURL: embedConfig.Footer.Icon ? replacePlaceholders(embedConfig.Footer.Icon, member, '', 0, userAvatarURL, guildIconURL, false) : undefined,
        });
    }

    if (embedConfig.Thumbnail) {
        const thumbnailURL = replacePlaceholders(embedConfig.Thumbnail, member, '', 0, userAvatarURL, guildIconURL, false);
        if (thumbnailURL) embed.setThumbnail(thumbnailURL);
    }

    if (embedConfig.Image) {
        const imageURL = replacePlaceholders(embedConfig.Image, member, '', 0, userAvatarURL, guildIconURL, false);
        if (imageURL) embed.setImage(imageURL);
    }

    return embed;
}

async function sendWelcomeMessage(client, member, inviterName, inviterCount) {
    let welcomeChannel = member.guild.channels.cache.get(config.WelcomeMessage.ChannelID);

    if (welcomeChannel && !sentWelcomeEmbeds.has(member.id)) {
        const userAvatarURL = member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 });
        const userBannerURL = await getUserBannerURL(member);

        let welcomeText = "";
        if (config.WelcomeMessage.Type === "MESSAGE" || config.WelcomeMessage.Type === "BOTH") {
            welcomeText = replacePlaceholders(config.WelcomeMessage.Text, member, inviterName, inviterCount, userAvatarURL, userBannerURL, false);
        }

        let welcomeEmbed = null;
        if (config.WelcomeMessage.Type === "EMBED" || config.WelcomeMessage.Type === "BOTH") {
            welcomeEmbed = new EmbedBuilder().setColor(config.WelcomeMessage.Embed.Color);

            let title = replacePlaceholders(config.WelcomeMessage.Embed.Title, member, inviterName, inviterCount, userAvatarURL, userBannerURL, false);
            if (title && title !== "") {
                welcomeEmbed.setTitle(title);
            }

            let description = replacePlaceholders(config.WelcomeMessage.Embed.Description.join('\n'), member, inviterName, inviterCount, userAvatarURL, userBannerURL, true);
            if (description && description !== "") {
                welcomeEmbed.setDescription(description);
            }

            let authorText = replacePlaceholders(config.WelcomeMessage.Embed.Author.Text, member, inviterName, inviterCount, userAvatarURL, userBannerURL, false);
            let authorIcon = replacePlaceholders(config.WelcomeMessage.Embed.Author.Icon, member, inviterName, inviterCount, userAvatarURL, userBannerURL, false);
            if (authorText && authorText !== "") {
                welcomeEmbed.setAuthor({
                    name: authorText,
                    iconURL: authorIcon || undefined,
                });
            }

            let footerText = replacePlaceholders(config.WelcomeMessage.Embed.Footer.Text, member, inviterName, inviterCount, userAvatarURL, userBannerURL, false);
            let footerIcon = replacePlaceholders(config.WelcomeMessage.Embed.Footer.Icon, member, inviterName, inviterCount, userAvatarURL, userBannerURL, false);
            if (footerText && footerText !== "") {
                welcomeEmbed.setFooter({
                    text: footerText,
                    iconURL: footerIcon || undefined,
                });
            }

            if (config.WelcomeMessage.Embed.Thumbnail && config.WelcomeMessage.Embed.Thumbnail !== "") {
                let thumbnailURL = config.WelcomeMessage.Embed.Thumbnail === "{user-avatar}" ? userAvatarURL : config.WelcomeMessage.Embed.Thumbnail;
                if (thumbnailURL) {
                    welcomeEmbed.setThumbnail(thumbnailURL);
                }
            }

            if (config.WelcomeMessage.Embed.Image && config.WelcomeMessage.Embed.Image !== "") {
                let imageURL = config.WelcomeMessage.Embed.Image === "{userBanner}" ? userBannerURL : config.WelcomeMessage.Embed.Image;
                if (imageURL) {
                    welcomeEmbed.setImage(imageURL);
                }
            }
        }

        let components = [];
        if (config.WelcomeMessage.Embed.Buttons && Array.isArray(config.WelcomeMessage.Embed.Buttons) && config.WelcomeMessage.Embed.Buttons.length > 0) {
            const row = new ActionRowBuilder();
            
            for (const buttonConfig of config.WelcomeMessage.Embed.Buttons) {
                if (buttonConfig.Type === "LINK") {
                    const button = new ButtonBuilder()
                        .setLabel(buttonConfig.Name)
                        .setStyle(ButtonStyle.Link)
                        .setURL(replacePlaceholders(buttonConfig.Link, member, inviterName, inviterCount, userAvatarURL, userBannerURL, false));

                    if (buttonConfig.Emoji) {
                        button.setEmoji(buttonConfig.Emoji);
                    }

                    row.addComponents(button);
                }
            }

            if (row.components.length > 0) {
                components.push(row);
            }
        }

        try {
            if (config.WelcomeMessage.Type === "BOTH") {
                await welcomeChannel.send({ 
                    content: welcomeText, 
                    embeds: [welcomeEmbed],
                    components: components.length > 0 ? components : undefined
                });
            } else if (config.WelcomeMessage.Type === "MESSAGE") {
                await welcomeChannel.send({
                    content: welcomeText,
                    components: components.length > 0 ? components : undefined
                });
            } else if (config.WelcomeMessage.Type === "EMBED") {
                await welcomeChannel.send({ 
                    embeds: [welcomeEmbed],
                    components: components.length > 0 ? components : undefined
                });
            }
        } catch (error) {
            console.error(`[ERROR] Failed to send welcome message: ${error}`);
        }

        sentWelcomeEmbeds.add(member.id);

        if (config.WelcomeMessage.DM.Enabled) {
            sendWelcomeDM(member, inviterName, inviterCount, userAvatarURL, userBannerURL);
        }
    }
}

async function sendWelcomeDM(member, inviterName, inviterCount, userAvatarURL, userBannerURL) {
    let dmEmbed = new EmbedBuilder().setColor(config.WelcomeMessage.DM.Embed.Color);

    let dmTitle = replacePlaceholders(config.WelcomeMessage.DM.Embed.Title, member, inviterName, inviterCount, userAvatarURL, userBannerURL, false);
    if (dmTitle && dmTitle !== "") dmEmbed.setTitle(dmTitle);

    let dmDescription = replacePlaceholders(config.WelcomeMessage.DM.Embed.Description.join('\n'), member, inviterName, inviterCount, userAvatarURL, userBannerURL, true);
    if (dmDescription && dmDescription !== "") dmEmbed.setDescription(dmDescription);

    let dmAuthorText = replacePlaceholders(config.WelcomeMessage.DM.Embed.Author.Text, member, inviterName, inviterCount, userAvatarURL, userBannerURL, false);
    let dmAuthorIcon = replacePlaceholders(config.WelcomeMessage.DM.Embed.Author.Icon, member, inviterName, inviterCount, userAvatarURL, userBannerURL, false);
    if (dmAuthorText && dmAuthorText !== "") {
        dmEmbed.setAuthor({
            name: dmAuthorText,
            iconURL: dmAuthorIcon || undefined,
        });
    }

    let dmFooterText = replacePlaceholders(config.WelcomeMessage.DM.Embed.Footer.Text, member, inviterName, inviterCount, userAvatarURL, userBannerURL, false);
    let dmFooterIcon = replacePlaceholders(config.WelcomeMessage.DM.Embed.Footer.Icon, member, inviterName, inviterCount, userAvatarURL, userBannerURL, false);
    if (dmFooterText && dmFooterText !== "") {
        dmEmbed.setFooter({
            text: dmFooterText,
            iconURL: dmFooterIcon || undefined,
        });
    }

    if (config.WelcomeMessage.DM.Embed.Thumbnail && config.WelcomeMessage.DM.Embed.Thumbnail !== "") {
        let dmThumbnailURL = config.WelcomeMessage.DM.Embed.Thumbnail === "{user-avatar}" ? userAvatarURL : config.WelcomeMessage.DM.Embed.Thumbnail;
        if (dmThumbnailURL) {
            dmEmbed.setThumbnail(dmThumbnailURL);
        }
    }

    if (config.WelcomeMessage.DM.Embed.Image && config.WelcomeMessage.DM.Embed.Image !== "") {
        let dmImageURL = config.WelcomeMessage.DM.Embed.Image === "{userBanner}" ? userBannerURL : config.WelcomeMessage.DM.Embed.Image;
        if (dmImageURL) {
            dmEmbed.setImage(dmImageURL);
        }
    }

    let dmComponents = [];
    if (config.WelcomeMessage.DM.Embed.Buttons && Array.isArray(config.WelcomeMessage.DM.Embed.Buttons) && config.WelcomeMessage.DM.Embed.Buttons.length > 0) {
        const row = new ActionRowBuilder();
        
        for (const buttonConfig of config.WelcomeMessage.DM.Embed.Buttons) {
            if (buttonConfig.Type === "LINK") {
                const button = new ButtonBuilder()
                    .setLabel(buttonConfig.Name)
                    .setStyle(ButtonStyle.Link)
                    .setURL(replacePlaceholders(buttonConfig.Link, member, inviterName, inviterCount, userAvatarURL, userBannerURL, false));

                if (buttonConfig.Emoji) {
                    button.setEmoji(buttonConfig.Emoji);
                }

                row.addComponents(button);
            }
        }

        if (row.components.length > 0) {
            dmComponents.push(row);
        }
    }

    try {
        await member.send({ 
            embeds: [dmEmbed],
            components: dmComponents
        });
    } catch (error) {
        console.error(`[ERROR] Failed to send welcome DM: ${error}`);
    }
}

async function getUserBannerURL(member) {
    try {
        const user = await member.user.fetch();
        return user.bannerURL({ format: 'png', dynamic: true, size: 4096 }) || '';
    } catch (error) {
        return '';
    }
}

function replacePlaceholders(text, member, inviterName = '', inviterCount = 0, userAvatarURL, userBannerURL, isEmbed) {
    const currentTime = moment().tz(config.Timezone);
    const guildIconURL = member.guild.iconURL({ format: 'png', dynamic: true, size: 4096 }) || '';

    const joinDate = moment(member.joinedAt).tz(config.Timezone).format('MMMM Do YYYY');
    const joinTime = moment(member.joinedAt).tz(config.Timezone).format('HH:mm');
    const userCreationDate = moment(member.user.createdAt).tz(config.Timezone).format('MMMM Do YYYY');

    let formattedShortTime = isEmbed ? `<t:${Math.floor(currentTime.unix())}:t>` : currentTime.format("HH:mm");
    let formattedLongTime = isEmbed ? `<t:${Math.floor(currentTime.unix())}:F>` : currentTime.format('MMMM Do YYYY');
    let formattedJoinDate = isEmbed ? `<t:${Math.floor(moment(member.joinedAt).unix())}:d>` : joinDate;
    let formattedJoinTime = isEmbed ? `<t:${Math.floor(moment(member.joinedAt).unix())}:t>` : joinTime;


    let autoKickTime = getAutoKickTimestamp(config.AutoKick.Time);

    return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{newDisplayName}/g, member.displayName)
        .replace(/{userName}/g, member.user.username)
        .replace(/{userTag}/g, member.user.tag)
        .replace(/{userId}/g, member.user.id)
        .replace(/{user-createdAt}/g, moment(member.user.createdAt).tz(config.Timezone).format('MM/DD/YYYY'))
        .replace(/{user-joinedAt}/g, moment(member.joinedAt).tz(config.Timezone).format('MM/DD/YYYY'))
        .replace(/{memberCount}/g, getOrdinalSuffix(member.guild.memberCount))
        .replace(/{memberCountNumeric}/g, member.guild.memberCount)
        .replace(/{guildName}/g, member.guild.name)
        .replace(/{shortTime}/g, formattedShortTime)
        .replace(/{longTime}/g, formattedLongTime)
        .replace(/{joinDate}/g, formattedJoinDate)
        .replace(/{joinTime}/g, formattedJoinTime)
        .replace(/{user-avatar}/g, userAvatarURL || null)
        .replace(/{userBanner}/g, userBannerURL || null)
        .replace(/{guildIcon}/g, guildIconURL)
        .replace(/{invitedBy}/g, inviterName)
        .replace(/{invitedByCount}/g, inviterCount)
        .replace(/{joinDate}/g, formattedJoinDate)
        .replace(/{joinTime}/g, formattedJoinTime)
        .replace(/{UserCreation}/g, userCreationDate)
        .replace(/{autoKickTime}/g, isEmbed ? `<t:${autoKickTime}:R>` : moment.unix(autoKickTime).tz(config.Timezone).format('MMMM Do YYYY HH:mm:ss'))
        .replace(/{guildId}/g, member.guild.id);
}


function getAutoKickTimestamp(timeString) {
    const milliseconds = parseTime(timeString);
    return Math.floor((Date.now() + milliseconds) / 1000);
}

function getOrdinalSuffix(number) {
    let j = number % 10,
        k = number % 100;
    if (j == 1 && k != 11) {
        return number + "st";
    }
    if (j == 2 && k != 12) {
        return number + "nd";
    }
    if (j == 3 && k != 13) {
        return number + "rd";
    }
    return number + "th";
}

async function updateStoredMembers(client, guildId) {
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const guildData = await GuildData.findOne({ guildID: guildId });
            if (!guildData) {
                const newGuildData = new GuildData({ guildID: guildId });
                const members = await client.guilds.cache.get(guildId).members.fetch();
                newGuildData.members = members.map(member => member.id);
                await newGuildData.save();
                return;
            }

            const members = await client.guilds.cache.get(guildId).members.fetch();
            guildData.members = members.map(member => member.id);
            await guildData.save();
            return;
        } catch (error) {
            if (error.name === 'VersionError' && retries < maxRetries - 1) {
                retries++;
           //     console.log(`Retrying update for guild ${guildId} (Attempt ${retries})`);
            } else {
           //     console.error(`Failed to update stored members for guild ${guildId}:`, error);
                return;
            }
        }
    }
}

function parseTime(timeString) {
    const regex = /^(\d+)([smhd])$/;
    const match = timeString.match(regex);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 0;
    }
}