const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minecraft')
        .setDescription('Hiển thị thông tin của server Minecraft.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Hiển thị thông tin của server Minecraft.')
                .addStringOption(option => option.setName('address').setDescription('Địa chỉ server, có thể bao gồm cổng (port).').setRequired(true))
                .addStringOption(option => option.setName('name').setDescription('Tên cho server này.'))
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
                    .setTitle(`Thông tin server: ${name}`)
                    .setColor('Green')
                    .setThumbnail(`https://api.mcsrvstat.us/icon/${address}`)
                    .addFields(
                        { name: 'Trạng thái', value: 'Online', inline: true },
                        { name: 'Nguời chơi', value: `${data.players.online} / ${data.players.max}`, inline: true },
                        { name: 'Phiên bản', value: data.version, inline: true },
                        { name: 'MOTD', value: `\`\`\`${data.motd.clean.join('\n')}\`\`\`` }
                    )
                    .setImage(`https://api.mcsrvstat.us/banner/${address}`);

                await interaction.editReply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle(`Thông tin server: ${name}`)
                    .setColor('Red')
                    .setDescription('Server không hoạt động hoặc không thể kết nối.');

                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(error);

            try {
                const errorPayload = {
                    content: 'Có lỗi xảy ra khi thực hiện lệnh trên.',
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

