const { SlashCommandBuilder, EmbedBuilder, MessageFlags, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const { parseMotdToAnsi, createBanner } = require('./mcUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minecraft')
        .setDescription('Hiển thị thông tin của server Minecraft.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Hiển thị thông tin của server Minecraft.')
                .addStringOption(option =>
                    option
                        .setName('address')
                        .setDescription('Địa chỉ server, có thể bao gồm cổng (port).')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Tên cho server này (tùy chọn).')
                )
        ),
    async execute(interaction) {
        const address = interaction.options.getString('address');
        const nameOption = interaction.options.getString('name');

        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply();
            }

            // 1. Get Minecraft Server Status
            const statusResponse = await axios.get(`https://api.mcstatus.io/v2/status/java/${address}`, {
                headers: { 'User-Agent': 'Discord Bot - Minecraft Server Status' }
            });
            const data = statusResponse.data;

            if (!data.online) {
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setAuthor({ name: 'Minecraft Server Status', iconURL: 'https://i.imgur.com/bCXJoIs.png' })
                    .setDescription(`\`\`\`diff\n- Server ${nameOption || address} hiện đang ngoại tuyến hoặc không thể kết nối.\n\`\`\``)
                    .setFooter({
                        text: `${interaction.user.username} • ${address}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // 2. Get IP/ISP Information
            const ipToQuery = data.ip_address || address;
            let ispString = 'N/A';

            try {
                const ipResponse = await axios.get(`http://ip-api.com/json/${ipToQuery}`);
                if (ipResponse.data && ipResponse.data.status === 'success') {
                    const { as, org, isp } = ipResponse.data;
                    // Format: AS135918 VIET DIGITAL... -> [AS-135918] VIET DIGITAL...
                    // ip-api returns "AS12345 Name" in the 'as' field usually.
                    const asMatch = (as || '').match(/^AS(\d+)\s+(.*)$/);
                    if (asMatch) {
                        ispString = `[AS-${asMatch[1]}] ${asMatch[2]}`;
                    } else {
                        ispString = `[${as || 'Unknown'}] ${org || isp || 'Unknown'}`;
                    }
                }
            } catch (err) {
                console.error('Failed to fetch IP info:', err.message);
            }

            // 3. Generate Banner & Parse MOTD
            const serverName = nameOption || address;
            const bannerBuffer = await createBanner(data, address, serverName);
            const attachment = new AttachmentBuilder(bannerBuffer, { name: 'banner.png' });

            const motdAnsi = parseMotdToAnsi(data.motd.raw);
            const software = data.software || 'Unknown';
            const version = data.version.name_clean || 'Unknown';
            const iconURL = `https://api.mcstatus.io/v2/icon/${address}`;

            const embed = new EmbedBuilder()
                .setColor('#151b2e')
                .setAuthor({
                    name: 'A Minecraft Server',
                    iconURL: iconURL
                })
                .setTitle(serverName)
                .setDescription(`\`\`\`ansi\n${motdAnsi}\n\`\`\``)
                .addFields(
                    {
                        name: 'Địa chỉ IP',
                        value: `${data.ip_address}:${data.port}\n\`${ispString}\``,
                        inline: true
                    },
                    {
                        name: 'Số lượng người chơi',
                        value: `**${data.players.online}/${data.players.max}**`,
                        inline: true
                    },
                    {
                        name: 'Phiên bản',
                        value: `Phần mềm: **${software}**\nPhiên bản: **${version}**`,
                        inline: false
                    }
                )
                .setImage('attachment://banner.png')
                .setFooter({
                    text: `${interaction.user.username} • ${address} • Hôm nay lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error(error);
            const errorPayload = {
                content: '❌ Có lỗi xảy ra khi lấy thông tin server.',
                flags: MessageFlags.Ephemeral
            };

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(errorPayload);
            } else {
                await interaction.editReply(errorPayload);
            }
        }
    }
};