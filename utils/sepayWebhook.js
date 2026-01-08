const http = require('http');
const { EmbedBuilder } = require('discord.js');
const SePayConfig = require('../models/SePayConfig');

const startWebhookServer = (client, port = 3000) => {
    const server = http.createServer(async (req, res) => {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    console.log('[SePay Webhook] Received data:', data);

                    // Required fields from SePay
                    // {
                    //   "gateway": "MBBank",
                    //   "transactionDate": "2023-10-25 10:00:00",
                    //   "accountNumber": "0123456789",
                    //   "subAccount": null,
                    //   "code": null,
                    //   "content": "Test CK",
                    //   "transferType": "in",
                    //   "transferAmount": 50000,
                    //   "accumulated": 50000,
                    //   "id": 12345,
                    //   "referenceCode": "FT23298..."
                    // }

                    const accNum = data.accountNumber;
                    if (!accNum) {
                         res.writeHead(400);
                         res.end('Missing accountNumber');
                         return;
                    }

                    // Find Guild Config by Account Number
                    // Since SePayConfig is by guildId (PK), we need to search.
                    // SQLiteModel's find returns an array.
                    const configs = await SePayConfig.find({ accountNumber: accNum });
                    
                    if (configs.length === 0) {
                        console.log(`[SePay Webhook] No guild config found for account: ${accNum}`);
                        res.writeHead(404);
                        res.end('Config not found');
                        return;
                    }

                    // Notify all guilds with this account number (usually just one)
                    for (const config of configs) {
                         if (!config.channelId) continue;

                         const channel = await client.channels.fetch(config.channelId).catch(() => null);
                         if (channel) {
                             const embed = new EmbedBuilder()
                                .setTitle('💸 Donation Received!')
                                .setColor('Green')
                                .addFields(
                                    { name: 'Số tiền', value: `${data.transferAmount.toLocaleString()} VNĐ`, inline: true },
                                    { name: 'Nội dung', value: data.content || 'Không có nội dung', inline: true },
                                    { name: 'Ngân hàng', value: data.gateway || 'Unknown', inline: true },
                                    { name: 'Thời gian', value: data.transactionDate || new Date().toLocaleString(), inline: false }
                                )
                                .setFooter({ text: `Trans ID: ${data.id}` })
                                .setTimestamp();

                             await channel.send({ embeds: [embed] });
                         }
                    }

                    res.writeHead(200);
                    res.end('OK');
                } catch (e) {
                    console.error('[SePay Webhook] Error processing request:', e);
                    res.writeHead(500);
                    res.end('Internal Server Error');
                }
            });
        } else {
            res.writeHead(405);
            res.end('Method Not Allowed');
        }
    });

    server.listen(port, () => {
        console.log(`[SePay Webhook] Server listening on port ${port}`);
    });
};

module.exports = { startWebhookServer };
