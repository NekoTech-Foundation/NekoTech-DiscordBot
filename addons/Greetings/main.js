const { EmbedBuilder } = require('discord.js');
const Greetings = require('../../models/Greetings');
const { buildWelcomeMessage, buildGoodbyeMessage } = require('./greetingsUtils');

module.exports = {
    onLoad: (client) => {
        console.log('Greetings addon loaded.');
        
        client.on('guildMemberAdd', async (member) => {
            const greetings = await Greetings.findOne({ guildId: member.guild.id });
            if (greetings && greetings.welcomeMessage && greetings.welcomeChannel) {
                const channel = member.guild.channels.cache.get(greetings.welcomeChannel);
                if (channel) {
                    try {
                        const messageData = await buildWelcomeMessage(greetings.welcomeMessage, member, member.guild);
                        await channel.send(messageData);
                    } catch (error) {
                        console.error(`Failed to send welcome message for ${member.user.tag}:`, error);
                    }
                }
            }
        });

        client.on('guildMemberRemove', async (member) => {
            if (!member || !member.user) return;
            const greetings = await Greetings.findOne({ guildId: member.guild.id });
            if (greetings && greetings.goodbyeMessage && greetings.goodbyeChannel) {
                const channel = member.guild.channels.cache.get(greetings.goodbyeChannel);
                if (channel) {
                    try {
                        const messageData = await buildGoodbyeMessage(greetings.goodbyeMessage, member, member.guild);
                        await channel.send(messageData);
                    } catch (error) {
                        console.error(`Failed to send goodbye message for ${member.user.tag}:`, error);
                    }
                }
            }
        });

        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isModalSubmit()) return;

            if (interaction.customId.startsWith('welcome-modal-')) {
                const channelId = interaction.customId.split('-')[2];
                let welcomeMessage = interaction.fields.getTextInputValue('welcome-message');
                if (welcomeMessage.trim() === '') {
                    welcomeMessage = '[blank]';
                }
                const guildId = interaction.guild.id;

                await Greetings.findOneAndUpdate(
                    { guildId },
                    { welcomeChannel: channelId, welcomeMessage },
                    { upsert: true, new: true }
                );

                await interaction.reply({ content: 'Đã đặt tin nhắn chào mừng.', ephemeral: true });
            } else if (interaction.customId.startsWith('goodbye-modal-')) {
                const channelId = interaction.customId.split('-')[2];
                let goodbyeMessage = interaction.fields.getTextInputValue('goodbye-message');
                if (goodbyeMessage.trim() === '') {
                    goodbyeMessage = '[blank]';
                }
                const guildId = interaction.guild.id;

                await Greetings.findOneAndUpdate(
                    { guildId },
                    { goodbyeChannel: channelId, goodbyeMessage },
                    { upsert: true, new: true }
                );

                await interaction.reply({ content: 'Đã đặt tin nhắn tạm biệt.', ephemeral: true });
            }
        });
    }
};
