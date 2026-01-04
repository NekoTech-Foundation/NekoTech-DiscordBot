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
                .setDescription('Ping TCP một địa chỉ mạng.')
                .addStringOption(option => option.setName('address').setDescription('Chỉ định tên miền hoặc địa chỉ IPv4.').setRequired(true))
                .addIntegerOption(option => option.setName('port').setDescription('Chỉ định cổng, mặc định là 80.').setMinValue(1).setMaxValue(65535))
                .addIntegerOption(option => option.setName('count').setDescription('Tổng số lần ping, mặc định là 4.').setMinValue(1).setMaxValue(10))
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
                .setDescription('Kiểm tra máy chủ từ nhiều địa điểm (check-host.net).')
                .addStringOption(option => option.setName('address').setDescription('Địa chỉ cần kiểm tra (URL hoặc IP).').setRequired(true))
                .addStringOption(option => 
                    option.setName('type')
                        .setDescription('Loại kiểm tra (mặc định: http).')
                        .addChoices(
                            { name: 'HTTP', value: 'http' },
                            { name: 'Ping', value: 'ping' },
                            { name: 'TCP', value: 'tcp' },
                            { name: 'UDP', value: 'udp' },
                            { name: 'DNS', value: 'dns' }
                        )
                )
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'paping') {
            await handlePaping(interaction);
        } else if (subcommand === 'address') {
            await handleAddress(interaction);
        } else if (subcommand === 'check-host') {
            await handleCheckHost(interaction);
        }
    }
};

async function handlePaping(interaction) {
    const address = interaction.options.getString('address');
    const port = interaction.options.getInteger('port') || 80;
    const count = interaction.options.getInteger('count') || 4;

    await interaction.reply({ content: `Starting paping to **${address}:${port}**...`, fetchReply: true });

    const results = [];
    for (let i = 0; i < count; i++) {
        const result = await tcpPing(address, port);
        results.push(result);
        // Live update logic could go here, but for 4 pings it's fast enough to wait.
        // Or we can edit the message on each ping if count is high.
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const total = results.length;
    const successes = results.filter(r => r.success).length;
    const failed = total - successes;
    const times = results.filter(r => r.success).map(r => r.time);
    const min = times.length ? Math.min(...times).toFixed(2) : 0;
    const max = times.length ? Math.max(...times).toFixed(2) : 0;
    const avg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2) : 0;

    let historyText = results.map((r, index) => {
        const icon = r.success ? '🟢' : '🔴';
        const msg = r.success ? `time=${r.time.toFixed(2)}ms` : `error=${r.error}`;
        return `Seq=${index + 1} | ${icon} | ${msg}`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setTitle(`TCP Ping: ${address}:${port}`)
        .setColor(successes === total ? 'Green' : (successes > 0 ? 'Yellow' : 'Red'))
        .setDescription(`\`\`\`prolog\n${historyText}\n\`\`\``)
        .addFields(
            { name: 'Statistics', value: `\`Packet Loss\`: ${((failed/total)*100).toFixed(0)}%\n\`Min/Max/Avg\`: ${min}/${max}/${avg} ms`, inline: false }
        )
        .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
}

async function handleAddress(interaction) {
    const address = interaction.options.getString('address');
    await interaction.deferReply();

    try {
        const resolved = net.isIP(address) ? address : (await dns.resolve(address).catch(() => []))[0];
        if (!resolved) throw new Error('Could not resolve hostname');

        const { data } = await axios.get(`http://ip-api.com/json/${resolved}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);

        if (data.status !== 'success') {
            return interaction.editReply({ content: `Không tìm thấy thông tin cho địa chỉ này: ${data.message}`, ephemeral: true });
        }

        const flag = getFlagEmoji(data.countryCode);
        const mapLink = `https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lon}`;

        const embed = new EmbedBuilder()
            .setTitle(`${flag} Thông tin IP: ${data.query}`)
            .setColor('#2b2d31')
            .setThumbnail(`https://flagsapi.com/${data.countryCode}/flat/64.png`)
            .addFields(
                { name: '📍 Vị trí', value: `\`${data.city}, ${data.regionName}, ${data.country}\``, inline: false },
                { name: '🏢 ISP/Org', value: `\`${data.isp}\`\n\`${data.org}\``, inline: true },
                { name: '🌐 AS', value: `\`${data.as}\``, inline: true },
                { name: '🗺️ Tọa độ', value: `[${data.lat}, ${data.lon}](${mapLink})`, inline: true },
                { name: '🕒 Múi giờ', value: `\`${data.timezone}\``, inline: true }
            )
            .setFooter({ text: 'Powered by ip-api.com' });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({ content: 'Lỗi khi lấy thông tin địa chỉ.', ephemeral: true });
    }
}

async function handleCheckHost(interaction) {
    const address = interaction.options.getString('address');
    const type = interaction.options.getString('type') || 'http';
    
    await interaction.deferReply();

    try {
        // Request check
        const checkUrl = `https://check-host.net/check-${type}?host=${encodeURIComponent(address)}&max_nodes=15`;
        const { data: initData } = await axios.get(checkUrl, { headers: { 'Accept': 'application/json' } });

        if (initData.ok !== 1) {
            return interaction.editReply({ content: `Lỗi API Check-Host: ${initData.error}`, ephemeral: true });
        }

        const requestId = initData.request_id;
        const reportUrl = `https://check-host.net/check-report/${requestId}`;
        
        const loadingEmbed = new EmbedBuilder()
            .setTitle(`Wait... Checking ${type.toUpperCase()}: ${address}`)
            .setDescription(`Đang gửi yêu cầu đến các node...\nID: \`${requestId}\``)
            .setColor('Blue');

        await interaction.editReply({ embeds: [loadingEmbed] });

        // Polling loop
        const maxRetries = 20; // 20 * 2s = 40s max
        let nodesData = {};
        
        for (let i = 0; i < maxRetries; i++) {
            await new Promise(r => setTimeout(r, 2000));
            
            const { data: resultData } = await axios.get(`https://check-host.net/check-result/${requestId}`);
            
            // Check if we have results
            // check-host returns an object where keys are node codes (e.g., us1, vn1)
            // Values are array of results. If result is null, it's pending.
            
            let completed = 0;
            let total = Object.keys(resultData).length;

            if (total === 0 && i < 5) continue; // Wait a bit for nodes to register
            
            let allDone = true;
            for (const node in resultData) {
                if (!resultData[node]) {
                     allDone = false;
                     break;
                }
            }
            
            nodesData = resultData;
            if (allDone && total > 0) break;
        }

        // Format results
        // results is map: { "us1": [[status, time, message]], "vn1": ... }
        // For ping: [[ "OK", 0.045, "OK" ], ... ] (sometimes structure varies by type)
        // For http: [[ 1, 0.4, "OK", 200, "70ms" ]] ? Need to handle different formats safely.

        let lines = [];
        let successCount = 0;
        let failCount = 0;

        for (const [nodeCode, result] of Object.entries(nodesData)) {
            if (!result) continue; // Skip pending/null
            
            const countryCode = nodeCode.replace(/[0-9]/g, '');
            const flag = getFlagEmoji(countryCode);
            
            // Result format depends on type
            // HTTP: [success (0/1), time (seconds), status text, code, ip] ?? Actually it varies.
            // Let's look at typical Check-Host response
            // HTTP: result[0] = [ 1 (ok), 0.123 (time), "OK", "200", "1.1.1.1" ]
            // Ping: result[0] = [ "OK", 0.02, "OK" ] or something.
            // We need to be robust.

            const payload = result[0]; // Usually array of 1 result or multiple for ping.
            
            // Simple generic formatter
            let statusIcon = '🔴';
            let statusText = 'Err';
            let timeText = '---';

            if (payload) {
                // Heuristic for success
                // HTTP: payload[0] === 1
                // Ping: payload[0] === "OK"
                // TCP: payload[0] === 1 or "Connected"
                
                let isOk = false;
                let time = 0;

                if (type === 'http') {
                    isOk = payload[0] === 1;
                    time = payload[1];
                    statusText = payload[3] || payload[2] || 'OK';
                } else if (type === 'ping') {
                    isOk = payload[0] === 'OK';
                    time = payload[1];
                    statusText = isOk ? 'OK' : 'Timeout';
                } else if (type === 'tcp' || type === 'udp') {
                     // TCP result often: {"error": "...", "time": ...} or object?
                     // Actually TCP usually returns {time: 0.1} object or error
                     // Check-host API is a bit messy. 
                     // Let's assume if it is an array and has time, it's good.
                     if (Array.isArray(payload)) {
                         isOk = payload[0] === 1 || payload[0] === 'OK';
                         time = payload[1];
                         statusText = isOk ? 'Open' : 'Closed';
                     } else {
                         isOk = !payload.error;
                         time = payload.time;
                         statusText = isOk ? 'Open' : (payload.error || 'Err');
                     }
                } else if (type === 'dns') {
                    // DNS result
                    isOk = !!payload.A || !!payload.AAAA; // Simplified
                    statusText = isOk ? 'Resolved' : 'Failed';
                }

                if (isOk) {
                    statusIcon = '🟢';
                    successCount++;
                    if (time) timeText = (time * 1000).toFixed(0) + 'ms';
                } else {
                    failCount++;
                    statusText = 'Fail'; // Or code
                }
            } else {
                failCount++;
            }

            // nodeCode usually "us1", "fr2".
            const nodeName = nodeCode.toUpperCase();
            
            // Store as an object to format later
            lines.push({ flag, nodeName, statusIcon, timeText, statusText });
        }

        // Sort nice? Maybe by latency?
        lines.sort((a, b) => {
            if (a.statusIcon === '🟢' && b.statusIcon !== '🟢') return -1;
            if (a.statusIcon !== '🟢' && b.statusIcon === '🟢') return 1;
            return parseFloat(a.timeText) - parseFloat(b.timeText);
        });

        // Build Markdown Table-ish
        // We can't really align perfectly in Discord mobile, but use code block.
        // Or just lines.
        // User requested "markdown style".
        
        /*
        🇺🇸 US1  | 🟢 200 OK  | 45ms
        🇻🇳 VN1  | 🔴 Timeout | ---
        */
       
        let description = '';
        /*
        description += `**Tiến trình**: ${successCount + failCount}/${Object.keys(nodesData).length}\n`;
        description += `**Thành công**: ${successCount} 🟢 | **Thất bại**: ${failCount} 🔴\n\n`;
        */
       
        // Using a compact list
        const maxLines = 15;
        const displayLines = lines.slice(0, maxLines).map(l => {
            return `${l.flag} \`${l.nodeName.padEnd(4)}\` ${l.statusIcon} \`${l.timeText.padEnd(6)}\` ${l.statusText}`;
        });
        
        if (lines.length > maxLines) displayLines.push(`...và ${lines.length - maxLines} node khác.`);

        const resultEmbed = new EmbedBuilder()
            .setTitle(`Check-Host: ${address} (${type.toUpperCase()})`)
            .setColor(successCount > 0 ? '#2b2d31' : 'Red')
            .setDescription(displayLines.join('\n') || 'Không có dữ liệu.')
            .addFields({
                name: 'Tổng quan',
                value: `✅ **${successCount}**   ❌ **${failCount}**   🔗 [Chi tiết đầy đủ](${reportUrl})`
            })
            .setFooter({ text: 'Powered by check-host.net' })
            .setTimestamp();
            
        const row = new ActionRowBuilder().addComponents(
             new ButtonBuilder().setLabel('Xem chi tiết').setStyle(ButtonStyle.Link).setURL(reportUrl)
        );

        await interaction.editReply({ embeds: [resultEmbed], components: [row] });

    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: 'Có lỗi xảy ra khi kiểm tra host.', ephemeral: true });
    }
}

// Utils
function tcpPing(address, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const start = process.hrtime();
        
        const cleanup = () => {
            socket.destroy();
        };

        socket.setTimeout(2000);

        socket.on('connect', () => {
            const [seconds, nanoseconds] = process.hrtime(start);
            const time = seconds * 1000 + nanoseconds / 1e6;
            cleanup();
            resolve({ success: true, time });
        });

        socket.on('error', (err) => {
            cleanup();
            resolve({ success: false, error: err.message });
        });

        socket.on('timeout', () => {
            cleanup();
            resolve({ success: false, error: 'Timeout' });
        });

        socket.connect(port, address);
    });
}

function getFlagEmoji(countryCode) {
    if (!countryCode) return '🏳️'; // Default flag
    const code = countryCode.toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) return '🏳️';
    
    // Regional Indicator Symbols
    const offset = 127397;
    const char0 = code.charCodeAt(0) + offset;
    const char1 = code.charCodeAt(1) + offset;
    return String.fromCodePoint(char0, char1);
}
