const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, WebhookClient } = require('discord.js');
const StickyMessage = require('../../../models/StickyMessage');
const KentaScratch = require('../../../utils/kentaScratch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stick')
        .setDescription('Quản lý Tin nhắn cố định (Sticky Messages)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(sub =>
            sub.setName('configuration')
                .setDescription('Xem cài đặt hiện tại')
                .addChannelOption(opt => opt.setName('channel').setDescription('Chọn kênh').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('message')
                .setDescription('Đặt nội dung tin nhắn cố định (Hỗ trợ KentaScratch)')
                .addChannelOption(opt => opt.setName('channel').setDescription('Chọn kênh').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('mode')
                .setDescription('Chỉnh sửa chế độ hoạt động')
                .addChannelOption(opt => opt.setName('channel').setDescription('Chọn kênh').setRequired(true))
                .addStringOption(opt =>
                    opt.setName('mode')
                        .setDescription('Chọn chế độ')
                        .setRequired(true)
                        .addChoices(
                            { name: 'ChatInactive (Không hoạt động)', value: 'ChatInactive' },
                            { name: 'MessageThreshold (Ngưỡng tin nhắn)', value: 'MessageThreshold' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('webhook')
                .setDescription('Đặt webhook cho tin nhắn cố định')
                .addChannelOption(opt => opt.setName('channel').setDescription('Chọn kênh').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('delay')
                .setDescription('Đặt độ trễ (cho chế độ ChatInactive)')
                .addChannelOption(opt => opt.setName('channel').setDescription('Chọn kênh').setRequired(true))
                .addIntegerOption(opt => opt.setName('delay').setDescription('Giây (1-15)').setMinValue(1).setMaxValue(15).setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('msgthreshold')
                .setDescription('Đặt ngưỡng tin nhắn (cho chế độ MessageThreshold)')
                .addChannelOption(opt => opt.setName('channel').setDescription('Chọn kênh').setRequired(true))
                .addIntegerOption(opt => opt.setName('threshold').setDescription('Số lượng tin nhắn (1-500)').setMinValue(1).setMaxValue(500).setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('allowmentions')
                .setDescription('Cho phép @mention không')
                .addChannelOption(opt => opt.setName('channel').setDescription('Chọn kênh').setRequired(true))
                .addBooleanOption(opt => opt.setName('action').setDescription('Cho phép?').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Xóa tin nhắn cố định')
                .addChannelOption(opt => opt.setName('channel').setDescription('Chọn kênh').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Xem danh sách tất cả tin nhắn cố định')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        if (subcommand === 'list') {
            await handleList(interaction);
            return;
        }

        // For other commands, ensure channel is text-based
        if (!channel.isTextBased()) {
            return interaction.reply({ content: '❌ Kênh không hợp lệ. Vui lòng chọn kênh chat.', ephemeral: true });
        }

        try {
            switch (subcommand) {
                case 'configuration': await handleConfiguration(interaction, channel); break;
                case 'message': await handleMessage(interaction, channel); break;
                case 'mode': await handleMode(interaction, channel); break;
                case 'webhook': await handleWebhook(interaction, channel); break;
                case 'delay': await handleDelay(interaction, channel); break;
                case 'msgthreshold': await handleMsgThreshold(interaction, channel); break;
                case 'allowmentions': await handleAllowMentions(interaction, channel); break;
                case 'remove': await handleRemove(interaction, channel); break;
            }
        } catch (error) {
            console.error('[Stick Command]', error);
            await interaction.reply({ content: '❌ Đã có lỗi xảy ra.', ephemeral: true });
        }
    }
};

async function getStickyConfig(guildId, channelId) {
    let config = await StickyMessage.findOne({ guildId, channelId });
    if (!config) {
        config = await StickyMessage.create({ guildId, channelId, content: '' });
    }
    return config;
}

async function handleConfiguration(interaction, channel) {
    const config = await StickyMessage.findOne({ guildId: interaction.guild.id, channelId: channel.id });
    if (!config) {
        return interaction.reply({ content: `❌ Kênh ${channel} chưa có cấu hình tin nhắn cố định.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`Cấu hình Sticky: ${channel.name}`)
        .addFields(
            { name: 'Mode', value: config.mode, inline: true },
            { name: 'Content', value: config.content.substring(0, 1024) || 'Chưa đặt', inline: false },
            { name: 'Delay (Inactive)', value: `${config.delay}s`, inline: true },
            { name: 'Threshold (Msgs)', value: `${config.threshold}`, inline: true },
            { name: 'Use Webhook', value: config.useWebhook ? 'Yes' : 'No', inline: true },
            { name: 'Allow Mentions', value: config.allowMentions ? 'Yes' : 'No', inline: true }
        );

    await interaction.reply({ embeds: [embed] });
}

async function handleMessage(interaction, channel) {
    const config = await getStickyConfig(interaction.guild.id, channel.id);

    // Using a modal to input content (better for multi-line)
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

    const modal = new ModalBuilder()
        .setCustomId(`sticky_msg_modal_${channel.id}`)
        .setTitle('Nội dung tin nhắn cố định');

    const contentInput = new TextInputBuilder()
        .setCustomId('content')
        .setLabel('Nhập nội dung (KentaScratch)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Nhập text hoặc {layout:...}')
        .setRequired(true)
        .setValue(config.content || '');

    const row = new ActionRowBuilder().addComponents(contentInput);
    modal.addComponents(row);

    await interaction.showModal(modal);

    // We need to handle the modal submission separately in interactionCreate.js
    // OR we can use awaitModalSubmit here if we didn't use showModal inside a command that deferred?
    // Slash commands must show modal immediately. Execute cannot defer if showing modal.
    // Wait, execute is NOT deferred yet. So we can show modal.
    // But we need to catch the submit.

    // Option 1: Handle in global interactionCreate.
    // Option 2: awaitModalSubmit (only works if we keep the interaction open? No, modal is separate).

    const submitted = await interaction.awaitModalSubmit({
        time: 300000,
        filter: i => i.user.id === interaction.user.id && i.customId === `sticky_msg_modal_${channel.id}`,
    }).catch(e => null);

    if (submitted) {
        const content = submitted.fields.getTextInputValue('content');
        config.content = content;
        await config.save();
        await submitted.reply({ content: `✅ Đã cập nhật nội dung cho ${channel}!` });
    }
}

async function handleMode(interaction, channel) {
    const mode = interaction.options.getString('mode');
    const config = await getStickyConfig(interaction.guild.id, channel.id);
    config.mode = mode;
    await config.save();
    await interaction.reply({ content: `✅ Đã chỉnh chế độ kênh ${channel} thành **${mode}**.` });
}

async function handleWebhook(interaction, channel) {
    const config = await getStickyConfig(interaction.guild.id, channel.id);

    if (config.useWebhook) {
        // Toggle off or re-configure? User request implies "Set to Webhook".
        // Let's create one if not exists.
    }

    if (!config.webhookUrl) {
        try {
            const webhook = await channel.createWebhook({
                name: 'Sticky Message',
                avatar: interaction.client.user.displayAvatarURL()
            });
            config.webhookUrl = webhook.url;
            config.useWebhook = true;
            await config.save();
            await interaction.reply({ content: `✅ Đã tạo Webhook cho ${channel}. Bạn có thể chỉnh sửa tên/avatar của webhook trong cài đặt kênh.` });
        } catch (e) {
            await interaction.reply({ content: `❌ Không thể tạo webhook (Lỗi: ${e.message}). Kiểm tra quyền của bot.`, ephemeral: true });
        }
    } else {
        // Toggle if already exists? Or just enable.
        config.useWebhook = true;
        await config.save();
        await interaction.reply({ content: `✅ Đã kích hoạt chế độ Webhook cho ${channel}.` });
    }
}

async function handleDelay(interaction, channel) {
    const delay = interaction.options.getInteger('delay');
    const config = await getStickyConfig(interaction.guild.id, channel.id);
    config.delay = delay;
    await config.save();
    await interaction.reply({ content: `✅ Đã đặt độ trễ cho ${channel} là **${delay} giây**.` });
}

async function handleMsgThreshold(interaction, channel) {
    const threshold = interaction.options.getInteger('threshold');
    const config = await getStickyConfig(interaction.guild.id, channel.id);
    config.threshold = threshold;
    await config.save();
    await interaction.reply({ content: `✅ Đã đặt ngưỡng tin nhắn cho ${channel} là **${threshold} tin**.` });
}

async function handleAllowMentions(interaction, channel) {
    const action = interaction.options.getBoolean('action');
    const config = await getStickyConfig(interaction.guild.id, channel.id);
    config.allowMentions = action;
    await config.save();
    await interaction.reply({ content: `✅ Đã đặt AllowedMentions cho ${channel} thành **${action}**.` });
}

async function handleRemove(interaction, channel) {
    await StickyMessage.deleteOne({ guildId: interaction.guild.id, channelId: channel.id });
    await interaction.reply({ content: `✅ Đã xóa cấu hình Sticky cho ${channel}.` });
}

async function handleList(interaction) {
    const configs = await StickyMessage.find({ guildId: interaction.guild.id });
    if (configs.length === 0) {
        return interaction.reply({ content: 'Không có tin nhắn cố định nào.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle('Danh sách Sticky Messages')
        .setColor('#2b2d31');

    configs.forEach(cfg => {
        embed.addFields({
            name: `<#${cfg.channelId}>`,
            value: `Mode: ${cfg.mode} | Delay: ${cfg.delay}s | Thr: ${cfg.threshold}`,
            inline: true
        });
    });

    await interaction.reply({ embeds: [embed] });
}
