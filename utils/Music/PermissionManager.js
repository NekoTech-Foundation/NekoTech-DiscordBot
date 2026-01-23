
const { PermissionFlagsBits } = require('discord.js');
const config = require('./config');
const { getLang } = require('../../utils/configLoader');

class PermissionManager {
    /**
     * Checks if a user is authorized to perform a music control action.
     * @param {import('discord.js').Interaction} interaction - The interaction object.
     * @param {import('./MusicPlayer')} player - The music player instance for the guild.
     * @param {string} [requesterId] - The ID of the user who initiated the session (from button).
     * @returns {Promise<boolean>} - True if authorized, false otherwise.
     */
    static async check(interaction, player, requesterId = null) {
        const member = interaction.member;
        const guild = interaction.guild;

        // 0. User has "Administrator" permission (Owner/Admin)
        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            return true;
        }

        // 1. User has "Manage Server" permission
        if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return true;
        }

        // 2. User has the "DJ" role
        const djRoleName = config.bot.djRoleName || 'DJ';
        // Case-insensitive check and partial match support
        if (member.roles.cache.some(role => role.name.toLowerCase() === djRoleName.toLowerCase() || role.name.toLowerCase().includes('dj'))) {
            return true;
        }

        // 2.5 User has "Moderator" role
        const modRoleName = config.bot.modRoleName || 'Moderator';
        if (member.roles.cache.some(role => role.name.toLowerCase() === modRoleName.toLowerCase())) {
            return true;
        }

        // 3. User is the one encoded in the button (Button Owner/Session Starter)
        if (requesterId && member.id === requesterId) {
            return true;
        }

        // 4. User is the one who requested the current track
        if (player && player.currentTrack && player.currentTrack.requestedBy && player.currentTrack.requestedBy.id === member.id) {
            return true;
        }

        // 5. If there's no track, but the user started the player session (fallback)
        if (player && !player.currentTrack && player.requesterId && player.requesterId === member.id) {
            return true;
        }

        // If none of the above, deny permission
        const lang = await getLang(guild.id);
        const notAuthorizedMsg = lang.Music.Errors.PermissionDenied || "❌ Not authorized";

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: notAuthorizedMsg, ephemeral: true });
        } else {
            await interaction.followUp({ content: notAuthorizedMsg, ephemeral: true });
        }

        return false;
    }
}

module.exports = PermissionManager;
