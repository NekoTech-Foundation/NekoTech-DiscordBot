/**
 * CardRecharge Addon - Nạp thẻ cào tự động
 * Commands: /cardrecharge topup, checkfee, history, setup
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const Card2kService = require('./services/card2kService');
const { validateTelco, validateAmount, validateCodeSerial, getActiveTelcos, getActiveAmounts } = require('./utils/cardValidation');
const {
    createConfirmEmbed,
    createProcessingEmbed,
    createFeeEmbed,
    createHistoryEmbed
} = require('./utils/cardEmbeds');

// Load config
const configPath = path.join(__dirname, 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cardrecharge')
        .setDescription('💳 Hệ thống nạp thẻ cào tự động')
        .addSubcommand(subcommand =>
            subcommand
                .setName('topup')
                .setDescription(config.commands.topup.description)
                .addStringOption(option => {
                    option
                        .setName('telco')
                        .setDescription('Chọn nhà mạng')
                        .setRequired(true);

                    const activeTelcos = getActiveTelcos();
                    for (const telco of activeTelcos) {
                        option.addChoices({ name: telco.name, value: telco.value });
                    }

                    return option;
                })
                .addIntegerOption(option => {
                    option
                        .setName('amount')
                        .setDescription('Chọn mệnh giá thẻ')
                        .setRequired(true);

                    // Thêm các mệnh giá phổ biến
                    const commonAmounts = [10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000, 1000000];
                    for (const amount of commonAmounts) {
                        option.addChoices({
                            name: `${amount.toLocaleString('vi-VN')} VNĐ`,
                            value: amount
                        });
                    }

                    return option;
                })
                .addStringOption(option =>
                    option
                        .setName('code')
                        .setDescription('Nhập mã thẻ (pin)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('serial')
                        .setDescription('Nhập serial thẻ')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('checkfee')
                .setDescription(config.commands.checkfee.description)
                .addStringOption(option => {
                    option
                        .setName('telco')
                        .setDescription('Chọn nhà mạng (hoặc "all" để xem tất cả)')
                        .setRequired(true)
                        .addChoices({ name: 'Tất cả nhà mạng', value: 'all' });

                    const activeTelcos = getActiveTelcos();
                    for (const telco of activeTelcos) {
                        option.addChoices({ name: telco.name, value: telco.value });
                    }

                    return option;
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription(config.commands.history.description)
                .addIntegerOption(option =>
                    option
                        .setName('page')
                        .setDescription('Trang cần xem (mặc định: 1)')
                        .setRequired(false)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription(config.commands.setup.description)
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Kênh nhận thông báo kết quả nạp thẻ')
                        .setRequired(false)
                )
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Vai trò được ping khi có thông báo')
                        .setRequired(false)
                )
        ),

    category: 'CardRecharge',

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const db = interaction.client.db;

        // Check if commands are enabled
        if (!config.commands[subcommand]?.enabled) {
            return interaction.reply({
                content: '❌ Chức năng này hiện đang bị tắt.',
                ephemeral: true
            });
        }

        // Check admin permission for setup command
        if (subcommand === 'setup' && config.commands.setup.only_admin) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ Bạn không có quyền sử dụng lệnh này.',
                    ephemeral: true
                });
            }
        }

        // Route to appropriate handler
        switch (subcommand) {
            case 'topup':
                await handleTopup(interaction, db);
                break;
            case 'checkfee':
                await handleCheckFee(interaction);
                break;
            case 'history':
                await handleHistory(interaction, db);
                break;
            case 'setup':
                await handleSetup(interaction);
                break;
        }
    }
};

/**
 * Handler cho /cardrecharge topup
 */
async function handleTopup(interaction, db) {
    const telco = interaction.options.getString('telco');
    const amount = interaction.options.getInteger('amount');
    const code = interaction.options.getString('code').trim();
    const serial = interaction.options.getString('serial').trim();

    // Validation
    if (!validateTelco(telco)) {
        return interaction.reply({
            content: `❌ Nhà mạng \`${telco}\` hiện không được hỗ trợ!`,
            ephemeral: true
        });
    }

    if (!validateAmount(telco, amount)) {
        return interaction.reply({
            content: `❌ Mệnh giá \`${amount.toLocaleString('vi-VN')} VNĐ\` không được hỗ trợ cho ${telco}!`,
            ephemeral: true
        });
    }

    if (!validateCodeSerial(telco, code, serial)) {
        return interaction.reply({
            content: '❌ Độ dài mã thẻ hoặc serial không hợp lệ!',
            ephemeral: true
        });
    }

    // Tạo embed xác nhận
    const confirmEmbed = createConfirmEmbed(telco, amount, code, serial);

    // Tạo buttons
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_topup')
                .setLabel('✅ Xác nhận')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('cancel_topup')
                .setLabel('❌ Hủy')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.reply({
        embeds: [confirmEmbed],
        components: [row],
        ephemeral: true
    });

    // Collector cho buttons
    const filter = i => {
        return (i.customId === 'confirm_topup' || i.customId === 'cancel_topup') &&
            i.user.id === interaction.user.id;
    };

    const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 300000 // 5 phút
    });

    collector.on('collect', async i => {
        if (i.customId === 'cancel_topup') {
            await i.update({
                content: '✅ Đã hủy yêu cầu nạp thẻ cào.',
                embeds: [],
                components: []
            });
            collector.stop();
            return;
        }

        if (i.customId === 'confirm_topup') {
            // Disable buttons
            row.components.forEach(button => button.setDisabled(true));
            await i.update({ components: [row] });

            // Xử lý nạp thẻ
            await processTopup(i, db, telco, amount, code, serial);
            collector.stop();
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            row.components.forEach(button => button.setDisabled(true));
            interaction.editReply({
                content: '⏱️ Hết thời gian xác nhận.',
                components: [row]
            }).catch(() => { });
        }
    });
}

/**
 * Xử lý nạp thẻ cào
 */
async function processTopup(interaction, db, telco, amount, code, serial) {
    try {
        const CardRechargeHistory = require('../../models/cardRechargeHistorySchema');
        const card2kService = new Card2kService();
        const requestId = uuidv4();

        // Gửi thẻ lên API
        const data = {
            telco: telco,
            code: code,
            serial: serial,
            amount: amount,
            request_id: requestId
        };

        const response = await card2kService.exchangeCard(data);

        if (!response) {
            return interaction.followUp({
                content: '❌ API lỗi, vui lòng liên hệ admin.',
                ephemeral: true
            });
        }

        // Kiểm tra response status
        if (response.status !== 99 && response.status !== 1 && response.status !== 2) {
            return interaction.followUp({
                content: `❌ ${response.message} (mã lỗi: ${response.status})`,
                ephemeral: true
            });
        }

        // Tạo embed đang xử lý
        const processingEmbed = createProcessingEmbed(telco, amount, serial, response.trans_id);
        const followupMessage = await interaction.followUp({
            embeds: [processingEmbed]
        });

        // Lưu vào MongoDB
        const cardHistory = new CardRechargeHistory({
            user_id: interaction.user.id,
            telco: telco,
            amount: amount,
            code: code,
            serial: serial,
            message_id: followupMessage.id,
            channel_id: interaction.channel.id,
            request_id: requestId,
            transaction_id: response.trans_id,
            status: 'pending'
        });

        await cardHistory.save();
        console.log(`[CardRecharge] Đã lưu thẻ #${response.trans_id} vào database`);

    } catch (error) {
        console.error('[CardRecharge] Lỗi khi xử lý topup:', error);
        await interaction.followUp({
            content: '❌ Có lỗi xảy ra khi xử lý thẻ cào. Vui lòng thử lại sau.',
            ephemeral: true
        });
    }
}

/**
 * Handler cho /cardrecharge checkfee
 */
async function handleCheckFee(interaction) {
    await interaction.deferReply();

    try {
        const telco = interaction.options.getString('telco');
        const card2kService = new Card2kService();

        const rawFeeData = await card2kService.getFees();

        if (!rawFeeData) {
            return interaction.editReply({
                content: '❌ Không thể lấy thông tin phí. Vui lòng thử lại sau.'
            });
        }

        if (telco === 'all') {
            // Hiển thị tất cả nhà mạng
            const feeData = card2kService.parseFeeData(rawFeeData);
            const embed = createFeeEmbed(feeData);
            await interaction.editReply({ embeds: [embed] });
        } else {
            // Hiển thị theo nhà mạng
            const telcoFeeData = card2kService.parseTelcoFeeData(rawFeeData, telco);

            if (!telcoFeeData) {
                return interaction.editReply({
                    content: `❌ Không tìm thấy thông tin phí cho nhà mạng ${telco}.`
                });
            }

            const embed = createFeeEmbed(telcoFeeData, telco);
            await interaction.editReply({ embeds: [embed] });
        }

    } catch (error) {
        console.error('[CardRecharge] Lỗi khi lấy phí:', error);
        await interaction.editReply({
            content: '❌ Có lỗi xảy ra khi lấy thông tin phí.'
        });
    }
}

/**
 * Handler cho /cardrecharge history
 */
async function handleHistory(interaction, db) {
    const CardRechargeHistory = require('../../models/cardRechargeHistorySchema');
    const page = interaction.options.getInteger('page') || 1;
    const itemsPerPage = 10;
    const skip = (page - 1) * itemsPerPage;

    try {
        // Lấy tổng số records
        const count = await CardRechargeHistory.countDocuments({ user_id: interaction.user.id });
        const totalPages = Math.ceil(count / itemsPerPage);

        if (count === 0) {
            return interaction.reply({
                content: '📜 Bạn chưa có giao dịch nạp thẻ nào.',
                ephemeral: true
            });
        }

        if (page > totalPages) {
            return interaction.reply({
                content: `❌ Trang ${page} không tồn tại. Tổng số trang: ${totalPages}`,
                ephemeral: true
            });
        }

        // Lấy records từ MongoDB
        const records = await CardRechargeHistory
            .find({ user_id: interaction.user.id })
            .sort({ created_at: -1 })
            .limit(itemsPerPage)
            .skip(skip)
            .lean();

        const embed = createHistoryEmbed(records, page, totalPages, interaction.user.id);

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    } catch (error) {
        console.error('[CardRecharge] Lỗi khi lấy lịch sử:', error);
        await interaction.reply({
            content: '❌ Có lỗi xảy ra khi lấy lịch sử.',
            ephemeral: true
        });
    }
}

/**
 * Handler cho /cardrecharge setup
 */
async function handleSetup(interaction) {
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');

    if (!channel && !role) {
        return interaction.reply({
            content: '❌ Vui lòng chọn ít nhất một trong hai: kênh thông báo hoặc vai trò.',
            ephemeral: true
        });
    }

    try {
        // Cập nhật config file
        if (channel) {
            config.notifications.topup.channel_id = channel.id;
        }

        if (role) {
            config.notifications.topup.role_id = role.id;
        }

        // Lưu vào file
        fs.writeFileSync(configPath, yaml.dump(config), 'utf8');

        let message = '✅ Đã cập nhật cấu hình thông báo:\n';
        if (channel) message += `• Kênh thông báo: ${channel}\n`;
        if (role) message += `• Vai trò được ping: ${role}\n`;

        await interaction.reply({
            content: message,
            ephemeral: true
        });

    } catch (error) {
        console.error('[CardRecharge] Lỗi khi setup:', error);
        await interaction.reply({
            content: '❌ Có lỗi xảy ra khi cấu hình.',
            ephemeral: true
        });
    }
}
