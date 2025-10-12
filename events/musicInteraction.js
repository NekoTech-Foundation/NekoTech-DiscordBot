const { MessageFlags } = require('discord.js');
const { Logger } = require('../utils/logger');
const { getMusicManager } = require('../utils/musicManager');

module.exports = async (client, interaction) => {
    try {
        if ((interaction.isButton() && !interaction.customId.startsWith('music_') && !interaction.customId.startsWith('queue_')) ||
            (interaction.isModalSubmit() && interaction.customId !== 'music_play_search')) {
            return;
        }

        if (interaction.isButton() && interaction.customId !== 'music_play') {
            try {
                await interaction.deferUpdate();
            } catch (err) {
                Logger.error(`Failed to defer music interaction: ${err}`);
            }
        }

        const musicManager = getMusicManager();
        if (!musicManager) {
            Logger.error('Music manager not initialized in musicInteraction event');
            return interaction.followUp({
                content: '❌ Music system is not available.',
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        }
        
        if (interaction.isButton() && !interaction.customId.startsWith('queue_')) {
            if (interaction.customId !== 'music_play') {
                const queue = musicManager.player.nodes.get(interaction.guildId);
                
                if (!interaction.member.voice.channel) {
                    return interaction.followUp({
                        content: '❌ You need to be in a voice channel to use music controls.',
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                }

                if (queue && interaction.guild.members.me.voice.channel && 
                    interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId) {
                    return interaction.followUp({
                        content: '❌ You need to be in the same voice channel as the bot to use music controls.',
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                }
            }
        }

        if (interaction.isButton()) {
            const buttonId = interaction.customId;

            if (buttonId.startsWith('queue_')) {
                const action = buttonId.split('_')[1];
                const queue = musicManager.player.nodes.get(interaction.guildId);
                
                if (!queue || !queue.connection) {
                    return interaction.followUp({
                        content: '❌ There is no active music queue.',
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                }

                let currentPage = 1;
                if (action === 'refresh' && interaction.message.embeds[0]?.footer) {
                    const footerText = interaction.message.embeds[0].footer.text;
                    const pageMatch = footerText.match(/Page (\d+)\/(\d+)/);
                    if (pageMatch) {
                        currentPage = parseInt(pageMatch[1]);
                    }
                }
                
                if (action === 'refresh') {
                    await musicManager.displayQueuePage(interaction, queue, currentPage);
                } else {
                    await musicManager.handleQueueNavigation(interaction, queue, action);
                }
            } else {
                await musicManager.handleButtonInteraction(interaction);
            }
        } else if (interaction.isModalSubmit() && interaction.customId === 'music_play_search') {
            await musicManager.handlePlayModalSubmit(interaction);
        }
    } catch (error) {
        Logger.error(`Error handling music interaction: ${error.stack || error}`);

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: `❌ An error occurred: ${error.message}`,
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: `❌ An error occurred: ${error.message}`,
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        } catch (replyError) {
            Logger.error(`Failed to reply to interaction: ${replyError}`);
        }
    }
}; 