const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
                .setDescription('Kiểm tra xem một máy chủ có đang hoạt động không.')
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
                const checkResponse = await axios.get(`https://check-host.net/check-http?host=${address}&max_nodes=5`, {
                    headers: { 'Accept': 'application/json' }
                });
                const checkData = checkResponse.data;

                if (checkData.ok !== 1) {
                    return interaction.editReply({ content: 'Lỗi khi yêu cầu kiểm tra.', ephemeral: true });
                }

                const requestId = checkData.request_id;
                await interaction.editReply({ content: `Đang kiểm tra... Request ID: ${requestId}` });

                setTimeout(async () => {
                    try {
                        const resultResponse = await axios.get(`https://check-host.net/check-result/${requestId}`);
                        const resultData = resultResponse.data;

                        const embed = new EmbedBuilder()
                            .setTitle(`Kết quả kiểm tra cho: ${address}`)
                            .setColor('Blue');

                        for (const node in resultData) {
                            const nodeResult = resultData[node];
                            if (nodeResult) {
                                const status = nodeResult[0][0] === 1 ? 'Thành công' : 'Thất bại';
                                const time = nodeResult[0][1];
                                embed.addFields({ name: node, value: `Trạng thái: ${status}\nThời gian: ${time}s` });
                            }
                        }
                        await interaction.editReply({ embeds: [embed] });
                    } catch (error) {
                        await interaction.editReply({ content: 'Lỗi khi lấy kết quả kiểm tra.', ephemeral: true });
                    }
                }, 5000); // Wait 5 seconds for results

            } catch (error) {
                await interaction.editReply({ content: 'Lỗi khi yêu cầu kiểm tra.', ephemeral: true });
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
