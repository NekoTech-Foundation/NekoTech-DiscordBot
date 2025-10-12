const { EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone');
const { getConfig, getLang } = require('../utils/configLoader.js');
const Invite = require('../models/inviteSchema');

const config = getConfig();
const lang = getLang();

module.exports = async (client, member, usedInvite, inviter, inviterCount) => {
    if (!config.InviteJoinLogs.Enabled) return;
    
    try {
        const currentTime = moment().tz(config.Timezone);
        const logChannel = member.guild.channels.cache.get(config.InviteJoinLogs.LogsChannelID);
        if (!logChannel) return;

        // If no invite data is provided, we can't log details
        if (!usedInvite) return;

        let embedData = lang.InviteJoinLogs.Embed;
        let embed = new EmbedBuilder()
            .setColor(embedData.Color || "#8A2BE2");

        if (embedData.Title) {
            embed.setTitle(embedData.Title);
        }

        if (embedData.Description && embedData.Description.length > 0) {
            embed.setDescription(
                embedData.Description.map(line =>
                    replacePlaceholders(line, member, usedInvite, inviter, inviterCount, currentTime)
                ).join('\n')
            );
        }

        if (embedData.Footer && embedData.Footer.Text) {
            embed.setFooter({ 
                text: replacePlaceholders(embedData.Footer.Text, member, usedInvite, inviter, inviterCount, currentTime), 
                iconURL: embedData.Footer.Icon || undefined 
            });
        }

        if (embedData.Author && embedData.Author.Text) {
            embed.setAuthor({ 
                name: replacePlaceholders(embedData.Author.Text, member, usedInvite, inviter, inviterCount, currentTime), 
                iconURL: embedData.Author.Icon || undefined 
            });
        }

        if (embedData.Thumbnail) {
            embed.setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }));
        }

        if (embedData.Image) {
            embed.setImage(embedData.Image);
        }

        logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error handling invite join log:', error);
    }
};

function replacePlaceholders(text, member, invite, inviter, inviterCount, currentTime) {
    return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{inviter}/g, inviter ? `<@${inviter.id}>` : "Unknown")
        .replace(/{inviterCount}/g, inviterCount || "0")
        .replace(/{inviteCode}/g, invite ? invite.code : "Unknown")
        .replace(/{channel}/g, invite && invite.channel ? `<#${invite.channel.id}>` : "Unknown Channel")
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'))
        .replace(/{shorttime}/g, currentTime.format('HH:mm'));
} 