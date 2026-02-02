const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const SePayConfig = require('../../../models/SePayConfig');

// Rate limiting map: guildId -> { count, timestamp }
const rateLimits = new Map();

const RATE_LIMIT_WINDOW = 1000; // 1 second
const RATE_LIMIT_MAX = 2; // 2 requests per second

function checkRateLimit(guildId) {
    const now = Date.now();
    const limit = rateLimits.get(guildId);

    if (!limit) {
        rateLimits.set(guildId, { count: 1, timestamp: now });
        return true;
    }

    if (now - limit.timestamp > RATE_LIMIT_WINDOW) {
        // Reset window
        rateLimits.set(guildId, { count: 1, timestamp: now });
        return true;
    }

    if (limit.count >= RATE_LIMIT_MAX) {
        return false;
    }

    limit.count++;
    return true;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('donate')
        .setDescription('Hệ thống ủng hộ qua SePay')
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('Xem thông tin donate của server')
        )
        .addSubcommand(sub =>
            sub.setName('qr')
                .setDescription('Tạo mã QR donate')
                .addIntegerOption(option => 
                    option.setName('amount')
                        .setDescription('Số tiền donate (VNĐ)')
                        .setRequired(false)
                )
                .addStringOption(option => 
                    option.setName('message')
                        .setDescription('Lời nhắn')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Cấu hình SePay (Admin Only)')
                .addStringOption(option => 
                    option.setName('account_number')
                        .setDescription('Số tài khoản ngân hàng')
                        .setRequired(true)
                )
                .addStringOption(option => 
                    option.setName('bank_code')
                        .setDescription('Mã ngân hàng (ví dụ: MB, VCB)')
                        .setRequired(true)
                )
                .addChannelOption(option => 
                     option.setName('channel')
                        .setDescription('Kênh nhận thông báo donate')
                        .setRequired(true)
                )
                .addStringOption(option => 
                    option.setName('api_key')
                        .setDescription('API Key từ SePay (được mã hóa)')
                        .setRequired(false)
                )
        ),
    category: 'Addons', // Or 'SePay' if checking folder, but category usually matches folder name in some handlers
    
    // Slash Command Execution
    async execute(interaction) {
        const guildId = interaction.guild.id;

        if (!checkRateLimit(guildId)) {
            return interaction.reply({ content: '⚠️ Server đang bị giới hạn tốc độ (2 req/s). Vui lòng thử lại sau giây lát.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

const { ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const { fetchSePayBankAccounts } = require('../../../utils/sepayApi');

// ... inside execute ...
        if (subcommand === 'setup') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Bạn cần quyền Administrator để sử dụng lệnh này.', ephemeral: true });
            }

            const accNum = interaction.options.getString('account_number');
            const bankCode = interaction.options.getString('bank_code');
            const channel = interaction.options.getChannel('channel');
            const apiKey = interaction.options.getString('api_key');

            if (!channel.isTextBased()) {
                 return interaction.reply({ content: '❌ Vui lòng chọn một kênh chat văn bản.', ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });

            let validationData = null;
            let isVerified = false;

            // Perform Validation if API Key is provided
            if (apiKey) {
                try {
                    const accounts = await fetchSePayBankAccounts(apiKey);
                    const matchedAccount = accounts.find(acc => acc.account_number === accNum && acc.bank_code === bankCode);
                    
                    if (matchedAccount) {
                        isVerified = true;
                        validationData = matchedAccount;
                    } else {
                        // Account not found in the list
                        validationData = { error: 'AccountNotFound', accounts: accounts };
                    }
                } catch (error) {
                    console.error('SePay Validation Error:', error);
                    validationData = { error: 'ApiError', message: error.message };
                }
            } else {
                // If checking existing config for API key? No, purely relying on input for setup usually implies resetting or updating.
                // If no API key provided, we can't validate against SePay.
                // We will warn the user that verification skipped.
            }

            const embed = new EmbedBuilder()
                .setTitle('Cấu hình SePay')
                .setColor(isVerified ? 'Green' : (validationData?.error ? 'Red' : 'Yellow'));

            if (isVerified) {
                embed.setDescription(`✅ **Xác thực thành công!**\n\n**Chủ tài khoản:** ${validationData.account_holder_name}\n**Ngân hàng:** ${validationData.bank_short_name} (${validationData.bank_code})\n**Số dư:** ${Number(validationData.accumulated).toLocaleString()} VNĐ\n\nBạn có chắc chắn muốn lưu cấu hình này?`);
            } else if (validationData?.error === 'AccountNotFound') {
                embed.setDescription(`⚠️ **Không tìm thấy tài khoản!**\n\nAPI trả về thành công nhưng không có STK **${accNum}** (${bankCode}) trong danh sách.\n\n*Vui lòng kiểm tra lại STK hoặc "force save" nếu bạn chắc chắn đúng.*`);
            } else if (validationData?.error === 'ApiError') {
                embed.setDescription(`❌ **Lỗi API!**\n\nKhông thể kết nối tới SePay để xác thực.\nLỗi: \`${validationData.message}\`\n\n*Bạn có muốn lưu "mù" không?*`);
            } else if (!apiKey) {
                embed.setDescription(`⚠️ **Thiếu API Key!**\n\nBạn không nhập API Key nên bot không thể xác thực tài khoản.\n\n*Bạn có muốn lưu không?*`);
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_save')
                    .setLabel('Xác nhận Lưu')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('cancel_save')
                    .setLabel('Hủy bỏ')
                    .setStyle(ButtonStyle.Secondary)
            );

            const reply = await interaction.editReply({ embeds: [embed], components: [row] });

            const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'confirm_save') {
                    let config = await SePayConfig.findOne({ guildId });
                    if (!config) {
                        config = await SePayConfig.create({ guildId });
                    }

                    config.accountNumber = accNum;
                    config.bankCode = bankCode;
                    config.channelId = channel.id;
                    
                    if (apiKey) {
                        await SePayConfig.setApiKey(guildId, apiKey);
                    } else {
                        await config.save();
                    }

                    const successEmbed = new EmbedBuilder()
                        .setTitle('✅ Cấu hình thành công')
                        .setColor('Green')
                        .setDescription(`Đã cập nhật thông tin SePay cho server.\n**Ngân hàng:** ${bankCode}\n**STK:** ${accNum}\n**Kênh thông báo:** ${channel}`)
                        .setFooter({ text: 'SePay Integration' });
                    
                    await i.update({ embeds: [successEmbed], components: [] });
                } else {
                    await i.update({ content: 'Đã hủy cấu hình.', embeds: [], components: [] });
                }
            });


        } else if (subcommand === 'qr') {
            const config = await SePayConfig.findOne({ guildId });
            if (!config || !config.accountNumber || !config.bankCode) {
                return interaction.reply({ content: '❌ Server chưa cấu hình thông tin donate. Vui lòng liên hệ Admin dùng `/donate setup`.', ephemeral: true });
            }

            const amount = interaction.options.getInteger('amount') || 0;
            const message = interaction.options.getString('message') || `Donate to ${interaction.guild.name}`;
            
            // Encode message for URL
            const encodedMsg = encodeURIComponent(message);
            // Construct SePay QR URL
            // Format: https://qr.sepay.vn/img?acc=[ACC]&bank=[BANK]&amount=[AMOUNT]&des=[CONTENT]
            let qrUrl = `https://qr.sepay.vn/img?acc=${config.accountNumber}&bank=${config.bankCode}&des=${encodedMsg}`;
            if (amount > 0) {
                qrUrl += `&amount=${amount}`;
            }

            const embed = new EmbedBuilder()
                .setTitle('Mã QR Donate')
                .setColor('Blue')
                .setDescription(`Quét mã bên dưới để ủng hộ server!\n\n**STK:** \`${config.accountNumber}\`\n**Ngân hàng:** \`${config.bankCode}\`\n**Nội dung:** ${message}`)
                .setImage(qrUrl)
                .setFooter({ text: 'Powered by SePay' });

            return interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'info') {
            const config = await SePayConfig.findOne({ guildId });
            if (!config || !config.accountNumber || !config.bankCode) {
                return interaction.reply({ content: '❌ Server chưa cấu hình thông tin donate.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('ℹ️ Thông tin Donate')
                .setColor('Blue')
                .addFields(
                    { name: 'Ngân hàng', value: config.bankCode, inline: true },
                    { name: 'Số tài khoản', value: config.accountNumber, inline: true },
                    { name: 'Kênh thông báo', value: config.channelId ? `<#${config.channelId}>` : 'Chưa thiết lập', inline: true },
                    { name: 'API Key', value: config.encryptedApiKey ? '✅ Đã thiết lập (Mã hóa)' : '❌ Chưa thiết lập', inline: false }
                );

            return interaction.reply({ embeds: [embed] });
        }
    },

    // Text Command Execution (Legacy)
    async run(client, message, args) {
        const guildId = message.guild.id;

        if (!checkRateLimit(guildId)) {
            return message.reply('⚠️ Server đang bị giới hạn tốc độ (2 req/s). Vui lòng thử lại sau giây lát.');
        }

        const subcommand = args[0] ? args[0].toLowerCase() : 'info'; // Default to info if no arg

        if (subcommand === 'setup') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ Bạn cần quyền Administrator để sử dụng lệnh này.');
            }

            // Usage: kdonate setup <bankCode> <accNum> <channelId> [apiKey]
            const bankCode = args[1];
            const accNum = args[2];
            const channelIdArg = args[3];
            const apiKey = args[4];

            if (!bankCode || !accNum || !channelIdArg) {
                return message.reply('⚠️ Cách dùng: `kdonate setup <Mã Ngân Hàng> <Số Tài Khoản> <ChannelID hoặc Mention> [API Key]`');
            }

            let channelId = channelIdArg.replace(/[<#>]/g, '');
            const channel = await message.guild.channels.fetch(channelId).catch(() => null);

             if (!channel || !channel.isTextBased()) {
                 return message.reply('❌ Kênh không hợp lệ. Vui lòng ID hoặc Mention kênh chat văn bản.');
            }

            let config = await SePayConfig.findOne({ guildId });
            if (!config) {
                config = await SePayConfig.create({ guildId });
            }

            config.accountNumber = accNum;
            config.bankCode = bankCode;
            config.channelId = channel.id;

            if (apiKey) {
                await SePayConfig.setApiKey(guildId, apiKey);
            } else {
                await config.save();
            }

            return message.reply(`✅ Đã cập nhật cấu hình: **${bankCode}** - **${accNum}** tại ${channel}`);

        } else if (subcommand === 'qr') {
            // Usage: kdonate qr [amount] [message...]
            const config = await SePayConfig.findOne({ guildId });
            if (!config || !config.accountNumber || !config.bankCode) {
                return message.reply('❌ Server chưa cấu hình thông tin donate.');
            }

            let amount = 0;
            let msgStartIndex = 1;

            // Check if second arg is number
            if (args[1] && !isNaN(args[1])) {
                amount = parseInt(args[1]);
                msgStartIndex = 2;
            }

            const msgContent = args.slice(msgStartIndex).join(' ') || `Donate to ${message.guild.name}`;
            const encodedMsg = encodeURIComponent(msgContent);
            let qrUrl = `https://qr.sepay.vn/img?acc=${config.accountNumber}&bank=${config.bankCode}&des=${encodedMsg}`;
            if (amount > 0) {
                qrUrl += `&amount=${amount}`;
            }

            const embed = new EmbedBuilder()
                .setTitle('Mã QR Donate')
                .setColor('Blue')
                .setDescription(`Quét mã bên dưới để ủng hộ server!\n\n**STK:** \`${config.accountNumber}\`\n**Ngân hàng:** \`${config.bankCode}\`\n**Nội dung:** ${msgContent}`)
                .setImage(qrUrl)
                .setFooter({ text: 'Powered by SePay' });

            return message.channel.send({ embeds: [embed] });

        } else if (subcommand === 'info') {
             const config = await SePayConfig.findOne({ guildId });
            if (!config || !config.accountNumber || !config.bankCode) {
                return message.reply('❌ Server chưa cấu hình thông tin donate.');
            }

            const embed = new EmbedBuilder()
                .setTitle('ℹ️ Thông tin Donate')
                .setColor('Blue')
                .addFields(
                    { name: 'Ngân hàng', value: config.bankCode, inline: true },
                    { name: 'Số tài khoản', value: config.accountNumber, inline: true },
                    { name: 'Kênh thông báo', value: config.channelId ? `<#${config.channelId}>` : 'Chưa thiết lập', inline: true },
                    { name: 'API Key', value: config.encryptedApiKey ? '✅ Đã thiết lập (Mã hóa)' : '❌ Chưa thiết lập', inline: false }
                );

            return message.channel.send({ embeds: [embed] });
        } else {
             return message.reply('⚠️ Lệnh không hợp lệ. Sử dụng: `setup`, `qr`, hoặc `info`.');
        }
    }
};
