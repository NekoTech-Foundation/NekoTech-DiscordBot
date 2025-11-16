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
                .addStringOption(option => 
                    option
                        .setName('address')
                        .setDescription('Địa chỉ server, có thể bao gồm cổng (port).')
                        .setRequired(true)
                )
                .addStringOption(option => 
                    option
                        .setName('name')
                        .setDescription('Tên cho server này.')
                )
        ),
    async execute(interaction) {
        const address = interaction.options.getString('address');
        const name = interaction.options.getString('name') || address;

        try {
            // Acknowledge early to avoid interaction expiry
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply();
            }

            // Gọi mcstatus.io API (v2) - có widget đẹp hơn
            const response = await axios.get(`https://api.mcstatus.io/v2/status/java/${address}`, {
                headers: {
                    'User-Agent': 'Discord Bot - Minecraft Server Status'
                }
            });
            const data = response.data;

            if (data.online) {
                // Format player list nếu có
                let playerList = '';
                if (data.players.list && data.players.list.length > 0) {
                    const displayPlayers = data.players.list.slice(0, 10);
                    playerList = displayPlayers.map(p => p.name_clean).join(', ');
                    if (data.players.list.length > 10) {
                        playerList += ` và ${data.players.list.length - 10} người khác`;
                    }
                }

                // Tạo embed với widget banner từ mcstatus.io
                const embed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setAuthor({ 
                        name: name,
                        iconURL: data.icon || `https://api.mcstatus.io/v2/icon/${address}`
                    })
                    .addFields(
                        { 
                            name: '📊 Trạng thái', 
                            value: '```css\n🟢 Online\n```', 
                            inline: true 
                        },
                        { 
                            name: '👥 Người chơi', 
                            value: `\`\`\`yml\n${data.players.online} / ${data.players.max}\n\`\`\``, 
                            inline: true 
                        },
                        { 
                            name: '🎮 Phiên bản', 
                            value: `\`\`\`${data.version.name_clean}\`\`\``, 
                            inline: true 
                        }
                    );

                // Thêm MOTD
                if (data.motd && data.motd.clean) {
                    embed.addFields({
                        name: '📝 MOTD',
                        value: `\`\`\`${data.motd.clean}\`\`\``,
                        inline: false
                    });
                }

                // Thêm software nếu có
                if (data.software) {
                    embed.addFields({
                        name: '⚙️ Software',
                        value: `\`${data.software}\``,
                        inline: true
                    });
                }

                // Thêm player list nếu có
                if (playerList) {
                    embed.addFields({
                        name: '🎯 Người chơi đang online',
                        value: `\`${playerList}\``,
                        inline: false
                    });
                }

                // Thêm plugins nếu có
                if (data.plugins && data.plugins.length > 0) {
                    const pluginList = data.plugins
                        .slice(0, 5)
                        .map(p => `${p.name}${p.version ? ` (${p.version})` : ''}`)
                        .join(', ');
                    embed.addFields({
                        name: '🔌 Plugins',
                        value: `\`${pluginList}\`${data.plugins.length > 5 ? ` và ${data.plugins.length - 5} plugins khác` : ''}`,
                        inline: false
                    });
                }

                // Thêm mods nếu có
                if (data.mods && data.mods.length > 0) {
                    const modList = data.mods
                        .slice(0, 5)
                        .map(m => `${m.name} (${m.version})`)
                        .join(', ');
                    embed.addFields({
                        name: '🎨 Mods',
                        value: `\`${modList}\`${data.mods.length > 5 ? ` và ${data.mods.length - 5} mods khác` : ''}`,
                        inline: false
                    });
                }

                // QUAN TRỌNG: Sử dụng widget endpoint từ mcstatus.io để có banner đẹp
                // Widget này sẽ hiển thị MOTD với đầy đủ format và màu sắc Minecraft
                const widgetUrl = `https://api.mcstatus.io/v2/widget/java/${address}?dark=true&rounded=true`;
                
                embed.setImage(widgetUrl)
                    .setFooter({ 
                        text: `IP: ${data.host}:${data.port}`,
                        iconURL: 'https://i.imgur.com/9bxjMo5.png'
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setAuthor({ 
                        name: name,
                        iconURL: 'https://i.imgur.com/bCXJoIs.png'
                    })
                    .setDescription('```diff\n- Server không hoạt động hoặc không thể kết nối\n```')
                    .addFields({
                        name: '📊 Trạng thái',
                        value: '```css\n🔴 Offline\n```',
                        inline: true
                    });

                if (data.host) {
                    embed.addFields({
                        name: '🌐 IP',
                        value: `\`${data.host}${data.port ? ':' + data.port : ''}\``,
                        inline: true
                    });
                }

                embed.setFooter({ 
                    text: `IP: ${address}`,
                    iconURL: 'https://i.imgur.com/9bxjMo5.png'
                })
                .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(error);

            try {
                const errorPayload = {
                    content: '❌ Có lỗi xảy ra khi thực hiện lệnh. Vui lòng kiểm tra lại địa chỉ server.',
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