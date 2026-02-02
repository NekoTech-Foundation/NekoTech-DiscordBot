const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { EmbedBuilder } = require('discord.js');
const SePayConfig = require('../models/SePayConfig');
const WhitelabelModel = require('../models/Whitelabel');
const packageFile = require('../package.json');
const dashboardApi = require('./dashboardApi');
const path = require('path');

const startWebhookServer = (client, port = 3000) => {
    const app = express();

    // Middleware
    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Mount Dashboard API
    app.use('/api/dashboard', dashboardApi);

    // Serve Dashboard Frontend (DISABLED: User running dev server)
    // app.use('/dashboard', express.static(path.join(__dirname, '../dashboard/dist')));

    // Explicitly handle root dashboard route to serve index.html
    // const dashboardIndex = path.join(__dirname, '../dashboard/dist/index.html');
    // app.get(['/dashboard', '/dashboard/'], (req, res) => {
    //     res.sendFile(dashboardIndex);
    // });

    // SPA Fallback for Dashboard paths
    // app.get(/^\/dashboard\/.*$/, (req, res) => {
    //     res.sendFile(dashboardIndex);
    // });

    // Public Status API
    app.get('/api/public/status', (req, res) => {
        res.json({
            online: true,
            latency: client.ws.ping,
            uptime: client.uptime,
            version: packageFile.version
        });
    });

    // Whitelabel Count API
    app.get('/api/public/whitelabel-count', async (req, res) => {
        try {
            const all = await WhitelabelModel.getAllInstances();
            const activeCount = all.filter(i => i.status === 'ACTIVE').length;
            res.json({ count: activeCount });
        } catch (err) {
            console.error('Error fetching whitelabel count:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // SePay Webhook Handling
    app.post('/', async (req, res) => {
        const data = req.body;
        console.log('[SePay Webhook] Received data:', data);

        if (!data || typeof data !== 'object') {
            return res.status(400).send('Invalid Body');
        }

        const accNum = data.accountNumber;
        if (!accNum) {
            return res.status(400).send('Missing accountNumber');
        }

        try {
            const configs = await SePayConfig.find({ accountNumber: accNum });

            if (configs.length === 0) {
                console.log(`[SePay Webhook] No guild config found for account: ${accNum}`);
                return res.status(404).send('Config not found');
            }

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

            res.send('OK');
        } catch (e) {
            console.error('[SePay Webhook] Error processing request:', e);
            res.status(500).send('Internal Server Error');
        }
    });

    // Start Server
    const server = app.listen(port, () => {
        console.log(`[Express API] Server listening on port ${port}`);
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.error(`[Express API] Port ${port} is already in use!`);
        } else {
            console.error('[Express API] Server error:', e);
        }
    });
};

module.exports = { startWebhookServer };
