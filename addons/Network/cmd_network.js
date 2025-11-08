const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dns = require('dns').promises;
const axios = require('axios');
const net = require('net');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('network')
        .setDescription('Các lệnh liên quan đến mạng.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('paping')
                .setDescription('Pap một địa chỉ mạng.')
                .addStringOption(option => option.setName('address').setDescription('Chỉ định tên miền hoặc địa chỉ IPv4.').setRequired(true))
                .addIntegerOption(option => option.setName('port').setDescription('Chỉ định cổng, mặc định là 80.'))
                .addIntegerOption(option => option.setName('count').setDescription('Tổng số lần pap, mặc định là 4.'))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('address')
                .setDescription('Xem thông tin của một địa chỉ mạng.')
                .addStringOption(option => option.setName('address').setDescription('Chỉ định tên miền hoặc địa chỉ IPv4.').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('check-host')
                .setDescription('Kiểm tra xem một máy chủ có đang hoạt động không. (ex: https://music.youtube.com).')
                .addStringOption(option => option.setName('address').setDescription('Chỉ định một địa chỉ IPv4 hoặc tên miền với giao thức.').setRequired(true))
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'paping') {
            const address = interaction.options.getString('address');
            const port = interaction.options.getInteger('port') || 80;
            const count = interaction.options.getInteger('count') || 4;

            await interaction.deferReply();

            let results = '';
            for (let i = 0; i < count; i++) {
                const result = await paping(address, port);
                results += result + '\n';
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between pings
            }

            const embed = new EmbedBuilder()
                .setTitle(`Paping ${address}:${port}`)
                .setDescription(`\`\`\`\n${results}\`\`\``)
                .setColor('Blue');

            await interaction.editReply({ embeds: [embed] });

        } else if (subcommand === 'address') {
            const address = interaction.options.getString('address');
            await interaction.deferReply();

            try {
                const ip = net.isIP(address) ? address : (await dns.resolve(address))[0];
                const response = await axios.get(`http://ip-api.com/json/${ip}`);
                const data = response.data;

                const embed = new EmbedBuilder()
                    .setTitle(`Thông tin địa chỉ: ${address}`)
                    .setColor('Blue')
                    .addFields(
                        { name: 'IP', value: ip, inline: true },
                        { name: 'Quốc gia', value: data.country, inline: true },
                        { name: 'Thành phố', value: data.city, inline: true },
                        { name: 'ISP', value: data.isp, inline: true },
                        { name: 'Tổ chức', value: data.org, inline: true },
                        { name: 'AS', value: data.as, inline: true }
                    );
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                await interaction.editReply({ content: 'Không thể lấy thông tin cho địa chỉ này.', ephemeral: true });
            }

        } else if (subcommand === 'check-host') {
            const address = interaction.options.getString('address');
            await interaction.deferReply();

            try {
                const checkResponse = await axios.get(`https://check-host.net/check-http?host=${address}`, {
                    headers: { 'Accept': 'application/json' }
                });
                const checkData = checkResponse.data;

                if (checkData.ok !== 1) {
                    return interaction.editReply({ content: `Lỗi khi yêu cầu kiểm tra: ${checkData.error}`, ephemeral: true });
                }

                const requestId = checkData.request_id;
                await interaction.editReply({ content: `Đang kiểm tra... Request ID: ${requestId}` });

                const pollResults = async (retries) => {
                    if (retries === 0) {
                        return interaction.editReply({ content: `Không thể lấy kết quả sau nhiều lần thử. Vui lòng kiểm tra thủ công: https://check-host.net/check-report/${requestId}`, ephemeral: true });
                    }

                    try {
                        const resultResponse = await axios.get(`https://check-host.net/check-result/${requestId}`);
                        const resultData = resultResponse.data;

                        if (!resultData) {
                            setTimeout(() => pollResults(retries - 1), 2000);
                            return;
                        }

                        const date = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC+0';
                        const reportUrl = `https://check-host.net/check-report/${requestId}`;

                        let stats = '';
                        const nodes = Object.keys(resultData).slice(0, 20);
                        const mid = Math.ceil(nodes.length / 2);
                        const firstHalf = nodes.slice(0, mid);
                        const secondHalf = nodes.slice(mid);

                        for (let i = 0; i < mid; i++) {
                            const node1 = firstHalf[i];
                            const node2 = secondHalf[i];

                            let line = '';
                            if (node1) {
                                const res1 = resultData[node1][0];
                                const time1 = res1[1];
                                let color1 = '\u001b[0;32m'; // Green
                                if (time1 === null) color1 = '\u001b[0;31m'; // Red
                                else if (time1 >= 0.5) color1 = '\u001b[0;33m'; // Yellow

                                const status1 = res1[0] === null ? '---' : res1[0];
                                const timeStr1 = time1 === null ? 'TIMEOUT' : `${(time1 * 1000).toFixed(3)}ms`;
                                line += `${color1}[${status1}] [${timeStr1}] ${node1.padEnd(25, ' ')}\u001b[0m`;
                            }
                            if (node2) {
                                const res2 = resultData[node2][0];
                                const time2 = res2[1];
                                let color2 = '\u001b[0;32m'; // Green
                                if (time2 === null) color2 = '\u001b[0;31m'; // Red
                                else if (time2 >= 0.5) color2 = '\u001b[0;33m'; // Yellow

                                const status2 = res2[0] === null ? '---' : res2[0];
                                const timeStr2 = time2 === null ? 'TIMEOUT' : `${(time2 * 1000).toFixed(3)}ms`;
                                line += `${color2}[${status2}] [${timeStr2}] ${node2}\u001b[0m`;
                            }
                            stats += line + '\n';
                        }

                        const embed = new EmbedBuilder()
                            .setTitle(`Kết quả kiểm tra cho: ${address}`)
                            .setColor('Blue')
                            .setDescription(
`**Information:**
- Date       ${date}
- Address    ${address}
- Report URL ${reportUrl}

**Statistics:**
\`\`\`ansi
${stats}
\`\`\``
                            );

                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setLabel('Trang kết quả')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL(reportUrl),
                                new ButtonBuilder()
                                    .setLabel('Trang đã kiểm tra')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL(address)
                            );

                        await interaction.editReply({ embeds: [embed], components: [row] });

                    } catch (error) {
                        setTimeout(() => pollResults(retries - 1), 2000);
                    }
                };

                setTimeout(() => pollResults(5), 2000);

            } catch (error) {
                await interaction.editReply({ content: 'Lỗi khi yêu cầu kiểm tra. Địa chỉ không hợp lệ hoặc không thể truy cập.', ephemeral: true });
            }
        }
    }
};

function paping(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const startTime = process.hrtime();

        socket.setTimeout(2000); // 2 seconds timeout

        socket.on('connect', () => {
            const endTime = process.hrtime(startTime);
            const timeInMs = (endTime[0] * 1000 + endTime[1] / 1e6).toFixed(2);
            resolve(`Connected to ${host}:${port} - Time: ${timeInMs}ms`);
            socket.destroy();
        });

        socket.on('error', (err) => {
            resolve(`Connection to ${host}:${port} failed: ${err.message}`);
            socket.destroy();
        });

        socket.on('timeout', () => {
            resolve(`Connection to ${host}:${port} timed out.`);
            socket.destroy();
        });

        socket.connect(port, host);
    });
}
