const { EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone');
const { getConfig, getLang } = require('../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

module.exports = async (client, invite) => {
    if (!config.InviteCreateLogs.Enabled) return;

    try {
        const creator = invite.inviter;
        if (creator.bot) return;

        const currentTime = moment().tz(config.Timezone);
        const logChannel = invite.guild.channels.cache.get(config.InviteCreateLogs.LogsChannelID);
        if (!logChannel) return;

        const expiresAt = invite.expiresAt 
            ? moment(invite.expiresAt).tz(config.Timezone).format('MMMM Do YYYY, HH:mm') 
            : 'Never';
        
        const maxUses = invite.maxUses ? invite.maxUses : 'Unlimited';

        let embedData = lang.InviteCreateLogs.Embed;
        let embed = new EmbedBuilder()
            .setColor(embedData.Color || "#4CAF50");

        if (embedData.Title) {
            embed.setTitle(embedData.Title);
        }

        if (embedData.Description.length > 0) {
            embed.setDescription(
                embedData.Description.map(line =>
                    replacePlaceholders(line, creator, invite, expiresAt, maxUses, currentTime)
                ).join('\n')
            );
        }

        if (embedData.Footer && embedData.Footer.Text) {
            embed.setFooter({ 
                text: replacePlaceholders(embedData.Footer.Text, creator, invite, expiresAt, maxUses, currentTime), 
                iconURL: embedData.Footer.Icon || undefined 
            });
        }

        if (embedData.Author && embedData.Author.Text) {
            embed.setAuthor({ 
                name: replacePlaceholders(embedData.Author.Text, creator, invite, expiresAt, maxUses, currentTime), 
                iconURL: embedData.Author.Icon || undefined 
            });
        }

        if (embedData.Thumbnail) {
            embed.setThumbnail(creator.displayAvatarURL({ format: 'png', dynamic: true }));
        }

        if (embedData.Image) {
            embed.setImage(embedData.Image);
        }

        logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error handling invite create:', error);
    }
};

function replacePlaceholders(text, creator, invite, expiresAt, maxUses, currentTime) {
    return text
        .replace(/{creator}/g, `<@${creator.id}>`)
        .replace(/{inviteCode}/g, invite.code)
        .replace(/{expiresAt}/g, expiresAt)
        .replace(/{maxUses}/g, maxUses)
        .replace(/{channel}/g, `<#${invite.channel.id}>`)
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'))
        .replace(/{shorttime}/g, currentTime.format('HH:mm'));
} 