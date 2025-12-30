
const { PermissionFlagsBits } = require('discord.js');
const config = require('./config');
const { getLang } = require('../../utils/configLoader');

class PermissionManager {
    /**
     * Checks if a user is authorized to perform a music control action.
     * @param {import('discord.js').Interaction} interaction - The interaction object.
     * @param {import('./MusicPlayer')} player - The music player instance for the guild.
     * @returns {Promise<boolean>} - True if authorized, false otherwise.
     */
    static async check(interaction, player) {
        const member = interaction.member;
        const guild = interaction.guild;

        // 1. User has "Manage Server" permission
        if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return true;
        }

        // 2. User has the "DJ" role
        const djRoleName = config.bot.djRoleName || 'DJ';
        const djRole = guild.roles.cache.find(role => role.name.toLowerCase() === djRoleName.toLowerCase());
        if (djRole && member.roles.cache.has(djRole.id)) {
            return true;
        }

        // 3. User is the one who requested the current track
        if (player && player.currentTrack && player.currentTrack.requestedBy && player.currentTrack.requestedBy.id === member.id) {
            return true;
        }
        
        // 4. If there's no track, but the user started the player session
        if (player && !player.currentTrack && player.requesterId && player.requesterId === member.id) {
            return true;
        }

        // If none of the above, deny permission
        const lang = await getLang(guild.id);
        const notAuthorizedMsg = lang.Music.Fields.PermissionInfo || "❌ Not authorized";
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: notAuthorizedMsg, ephemeral: true });
        } else {
            await interaction.followUp({ content: notAuthorizedMsg, ephemeral: true });
        }
        
        return false;
    }
}

module.exports = PermissionManager;
