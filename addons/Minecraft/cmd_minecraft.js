const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minecraft')
        .setDescription('Hiển thị thông tin của một server Minecraft.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Hiển thị thông tin của một server Minecraft.')
                .addStringOption(option => option.setName('address').setDescription('Địa chỉ server, có thể bao gồm cổng (port).').setRequired(true))
                .addStringOption(option => option.setName('name').setDescription('Tên cho server này.'))
        ),
    async execute(interaction) {
        const address = interaction.options.getString('address');
        const name = interaction.options.getString('name') || address;

        try {
            const response = await axios.get(`https://api.mcsrvstat.us/2/${address}`);
            const data = response.data;

            if (data.online) {
                const embed = new EmbedBuilder()
                    .setTitle(`Thông tin server: ${name}`)
                    .setColor('Green')
                    .setThumbnail(`https://api.mcsrvstat.us/icon/${address}`)
                    .addFields(
                        { name: 'Trạng thái', value: 'Online', inline: true },
                        { name: 'Người chơi', value: `${data.players.online} / ${data.players.max}`, inline: true },
                        { name: 'Phiên bản', value: data.version, inline: true },
                        { name: 'MOTD', value: `\`\`\`${data.motd.clean.join('\n')}\`\`\`` }
                    )
                    .setImage(`https://api.mcsrvstat.us/banner/${address}`);

                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle(`Thông tin server: ${name}`)
                    .setColor('Red')
                    .setDescription('Server không hoạt động hoặc không thể kết nối.');
                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Đã có lỗi xảy ra khi lấy thông tin server.', ephemeral: true });
        }
    }
};
