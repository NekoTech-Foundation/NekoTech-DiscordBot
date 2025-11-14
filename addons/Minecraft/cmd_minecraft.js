const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minecraft')
        .setDescription('Hi?n th? th�ng tin c?a m?t server Minecraft.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Hi?n th? th�ng tin c?a m?t server Minecraft.')
                .addStringOption(option => option.setName('address').setDescription('D?a ch? server, c� th? bao g?m c?ng (port).').setRequired(true))
                .addStringOption(option => option.setName('name').setDescription('T�n cho server n�y.'))
        ),
    async execute(interaction) {
        const address = interaction.options.getString('address');
        const name = interaction.options.getString('name') || address;

        try {
            // Acknowledge early to avoid interaction expiry
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply();
            }

            const response = await axios.get(`https://api.mcsrvstat.us/2/${address}`);
            const data = response.data;

            if (data.online) {
                const embed = new EmbedBuilder()
                    .setTitle(`Th�ng tin server: ${name}`)
                    .setColor('Green')
                    .setThumbnail(`https://api.mcsrvstat.us/icon/${address}`)
                    .addFields(
                        { name: 'Tr?ng th�i', value: 'Online', inline: true },
                        { name: 'Ngu?i choi', value: `${data.players.online} / ${data.players.max}`, inline: true },
                        { name: 'Phi�n b?n', value: data.version, inline: true },
                        { name: 'MOTD', value: `\`\`\`${data.motd.clean.join('\n')}\`\`\`` }
                    )
                    .setImage(`https://api.mcsrvstat.us/banner/${address}`);

                await interaction.editReply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle(`Th�ng tin server: ${name}`)
                    .setColor('Red')
                    .setDescription('Server kh�ng ho?t d?ng ho?c kh�ng th? k?t n?i.');

                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(error);

            try {
                const errorPayload = {
                    content: 'Da c� l?i x?y ra khi l?y th�ng tin server.',
                    flags: MessageFlags.Ephemeral
                };

                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply(errorPayload);
                } else {
                    await interaction.followUp(errorPayload);
                }
            } catch (replyError) {
                // Ignore interaction expiry errors to avoid noisy logs
                if (replyError.code !== 10062) {
                    console.error('Failed to send error response for /minecraft:', replyError);
                }
            }
        }
    }
};

