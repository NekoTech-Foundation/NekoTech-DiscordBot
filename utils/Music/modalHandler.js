const { Events, EmbedBuilder } = require('discord.js');
const config = require('./config');
const { getLang } = require('../../utils/configLoader');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isModalSubmit() && !interaction.isStringSelectMenu()) return;

        const client = interaction.client;
        const guild = interaction.guild;
        const member = interaction.member;

        try {
            // Handle select menus
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('autoplay_genre:')) {
                    await this.handleAutoplayGenre(interaction, client);
                    return;
                }
            }

            // Handle modals
            switch (interaction.customId) {
                case 'volume_modal':
                    await this.handleVolumeModal(interaction, client);
                    break;

                default:
                    await interaction.reply({
                        content: "Unknown modal interaction.",
                        ephemeral: true
                    });
            }
        } catch (error) {
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: "An error occurred while processing the modal.",
                        ephemeral: true
                    });
                } catch (replyError) {
                }
            }
        }
    },

    async handleAutoplayGenre(interaction, client) {
        const guild = interaction.guild;
        const member = interaction.member;
        const lang = await getLang(guild?.id);

        // Check if user is in a voice channel
        if (!member.voice.channel) {
            return await interaction.reply({
                content: lang.Music.Errors.JoinError || "❌ Join a voice channel first!",
                flags: [1 << 6]
            });
        }

        // Get music player
        const player = client.players.get(guild.id);
        if (!player) {
            return await interaction.reply({
                content: lang.Music.Errors.NoMusic || "❌ No music playing!",
                flags: [1 << 6]
            });
        }

        // Check if user is in the same voice channel as bot
        if (player.voiceChannel.id !== member.voice.channel.id) {
            return await interaction.reply({
                content: lang.Music.Errors.JoinError || "❌ You must be in the same voice channel!",
                flags: [1 << 6]
            });
        }

        const selectedGenre = interaction.values[0];
        
        // Enable autoplay with selected genre
        player.autoplay = selectedGenre;

        const genreName = selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1);
        const embed = new EmbedBuilder()
            .setTitle('🎲 Autoplay Enabled')
            .setDescription(`Autoplay enabled for genre: **${genreName}**`)
            .setColor(config.bot.embedColor)
            .setTimestamp()
            .addFields({
                name: 'Changed By',
                value: `${member}`,
                inline: true
            });

        await interaction.reply({ embeds: [embed], flags: [1 << 6] });

        // Update the main embed to show autoplay is enabled
        if (client.musicEmbedManager) {
            await client.musicEmbedManager.updateNowPlayingEmbed(player);
        }
    },

    async handleVolumeModal(interaction, client) {

        const guild = interaction.guild;
        const member = interaction.member;
        const lang = await getLang(guild?.id);

        // Check if user is in a voice channel
        if (!member.voice.channel) {
            return await interaction.reply({
                content: lang.Music.Errors.JoinError || "❌ Join a voice channel first!",
                ephemeral: true
            });
        }

        // Get music player
        const player = client.players.get(guild.id);
        if (!player) {
            return await interaction.reply({
                content: lang.Music.Errors.NoMusic || "❌ No music playing!",
                ephemeral: true
            });
        }

        // Check if user is in the same voice channel as bot
        if (player.voiceChannel.id !== member.voice.channel.id) {
            return await interaction.reply({
                content: lang.Music.Errors.JoinError || "❌ You must be in the same voice channel!",
                ephemeral: true
            });
        }

        const volumeInput = interaction.fields.getTextInputValue('volume_input');
        const volume = parseInt(volumeInput);

        // Validate volume
        if (isNaN(volume) || volume < 0 || volume > 100) {
            return await interaction.reply({
                content: "❌ Invalid volume! Please enter a number between 0 and 100.",
                ephemeral: true
            });
        }

        // Set volume
        const success = player.setVolume(volume);

        if (success) {
            const embed = new EmbedBuilder()
                .setTitle("Volume Changed")
                .setDescription(`Volume set to **${volume}%**`)
                .setColor(config.bot.embedColor)
                .setTimestamp()
                .addFields({
                    name: 'Set By',
                    value: `${member}`,
                    inline: true
                });

            // Visual volume bar
            const volumeBar = this.createVolumeBar(volume);
            embed.addFields({
                name: 'Level',
                value: volumeBar,
                inline: false
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            await interaction.reply({
                content: "❌ Failed to set volume.",
                ephemeral: true
            });
        }
    },

    createVolumeBar(volume) {
        const barLength = 20;
        const filledBars = Math.floor((volume / 100) * barLength);
        const emptyBars = barLength - filledBars;

        const bar = '▓'.repeat(filledBars) + '░'.repeat(emptyBars);
        return `\`${bar}\` ${volume}%`;
    }
};
