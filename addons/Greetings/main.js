const Greetings = require('../../models/Greetings');

module.exports = {
    onLoad: (client) => {
        console.log('Greetings addon loaded.');
        client.on('guildMemberAdd', async (member) => {
            const greetings = await Greetings.findOne({ guildId: member.guild.id });
            if (greetings && greetings.welcomeMessage && greetings.welcomeChannel) {
                const channel = member.guild.channels.cache.get(greetings.welcomeChannel);
                if (channel) {
                    const welcomeMessage = greetings.welcomeMessage
                        .replace('{user_mention}', member.toString())
                        .replace('{user_name}', member.user.username)
                        .replace('{user_tag}', member.user.tag)
                        .replace('{server_name}', member.guild.name)
                        .replace('{server_membercount}', member.guild.memberCount)
                        .replace('{newline}', '\n');

                    try {
                        await channel.send(welcomeMessage);
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
                    const goodbyeMessage = greetings.goodbyeMessage
                        .replace('{user}', member.user.username)
                        .replace('{user_tag}', member.user.tag)
                        .replace('{server_name}', member.guild.name)
                        .replace('{server_membercount_nobots}', member.guild.members.cache.filter(m => !m.user.bot).size)
                        .replace('{newline}', '\n');

                    try {
                        await channel.send(goodbyeMessage);
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
                const welcomeMessage = interaction.fields.getTextInputValue('welcome-message');
                const guildId = interaction.guild.id;

                await Greetings.findOneAndUpdate(
                    { guildId },
                    { welcomeChannel: channelId, welcomeMessage },
                    { upsert: true, new: true }
                );

                await interaction.reply({ content: 'Đã đặt tin nhắn chào mừng.', ephemeral: true });
            } else if (interaction.customId.startsWith('goodbye-modal-')) {
                const channelId = interaction.customId.split('-')[2];
                const goodbyeMessage = interaction.fields.getTextInputValue('goodbye-message');
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