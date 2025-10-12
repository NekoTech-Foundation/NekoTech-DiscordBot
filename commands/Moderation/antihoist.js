/*
  _____            _           ____        _   
 |  __ \          | |         |  _ \      | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                             
                                        
 Thank you for choosing Drako Bot!

 Should you encounter any issues, require assistance, or have suggestions for improving the bot,
 we invite you to connect with us on our Discord server and create a support ticket: 

 http://discord.drakodevelopment.net
 
*/

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
//const fs = require('fs');
//const yaml = require('js-yaml');
const moment = require('moment-timezone');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antihoist')
        .setDescription('Removes disallowed characters set in config'),
    category: 'Moderation',
    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const allowedRoles = config.AntiHoist.AllowRoles;
            const userRoles = interaction.member.roles.cache.map(role => role.id);
            const hasPermission = userRoles.some(role => allowedRoles.includes(role));

            if (!hasPermission) {
                return interaction.editReply({
                    content: lang.AntiHoist.NoPermission,
                    flags: MessageFlags.Ephemeral,
                });
            }

            const allowedRolesObjects = allowedRoles.map(roleId => interaction.guild.roles.cache.get(roleId));
            const highestAllowedRolePosition = Math.max(...allowedRolesObjects.map(role => role?.position || 0));

            const members = await interaction.guild.members.fetch();
            const disallowedCharacters = new Set(config.AntiHoist.DisallowedCharacters);

            for (const member of members.values()) {
                if (member.user.bot) continue;

                const memberHighestRolePosition = Math.max(...member.roles.cache.map(role => role.position));
                if (memberHighestRolePosition >= highestAllowedRolePosition) continue;

                let displayName = member.displayName;
                const originalDisplayName = displayName;

                while (displayName.length > 0 && (disallowedCharacters.has(displayName.charAt(0)) || displayName.charAt(0) === ' ')) {
                    displayName = displayName.substring(1);
                }

                if (displayName !== originalDisplayName) {
                    try {
                        await member.setNickname(displayName.trim());

                        const logChannel = member.guild.channels.cache.get(config.AntiHoist.LogsChannelID);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setColor(parseInt(config.AntiHoist.LogEmbed.Color.replace("#", ""), 16))
                                .setTitle(replacePlaceholders(config.AntiHoist.LogEmbed.Title, member).replace("{oldDisplayName}", originalDisplayName))
                                .setDescription(replacePlaceholders(config.AntiHoist.LogEmbed.Description.join('\n'), member).replace("{oldDisplayName}", originalDisplayName))
                                .setFooter({ text: replacePlaceholders(config.AntiHoist.LogEmbed.Footer, member).replace("{oldDisplayName}", originalDisplayName) })
                                .setTimestamp();

                            await logChannel.send({ embeds: [logEmbed] });
                        }
                    } catch (error) {
                        console.error(`Failed to set nickname for ${member.user.tag}: ${error.message}`);
                    }
                }
            }

            await interaction.editReply({
                content: lang.AntiHoist.CommandCompleted,
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            console.error(`An error occurred while executing the antihoist command: ${error.message}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: 'There was an error trying to execute that command! Please try again later.', flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: 'There was an error trying to execute that command! Please try again later.', flags: MessageFlags.Ephemeral });
            }
        }
    }
};

function replacePlaceholders(text, member) {
    const currentTime = moment().tz(config.Timezone);

    return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{newDisplayName}/g, member.displayName)
        .replace(/{userName}/g, member.user.username)
        .replace(/{userTag}/g, member.user.tag)
        .replace(/{userId}/g, member.user.id)
        .replace(/{user-createdAt}/g, moment(member.user.createdAt).tz(config.Timezone).format('MM/DD/YYYY'))
        .replace(/{user-joinedAt}/g, moment(member.joinedAt).tz(config.Timezone).format('MM/DD/YYYY'))
        .replace(/{memberCount}/g, member.guild.memberCount)
        .replace(/{guildName}/g, member.guild.name)
        .replace(/{shorttime}/g, currentTime.format('HH:mm'))
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'));
}