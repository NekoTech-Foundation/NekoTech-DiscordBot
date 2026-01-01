/*
  _____                     _         ____          _   
 |  __ \                   | |       |  _ \        | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                              
                                              
  Cảm ơn bạn đã chọn Drako Bot!

  Nếu bạn gặp bất kỳ vấn đề nào, cần hỗ trợ, hoặc có đề xuất để cải thiện bot,
  chúng tôi mời bạn kết nối với chúng tôi trên máy chủ Discord và tạo một phiếu hỗ trợ: 

  http://discord.drakodevelopment.net
 
*/

const { PermissionsBitField, MessageFlags, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');
const { getConfig, getLang } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steal')
        .setDescription('🦜 Đánh cắp emoji từ server khác')
        .addSubcommand(subcommand =>
            subcommand
                .setName('emoji')
                .setDescription('Lấy một hoặc nhiều emoji')
                .addStringOption(option =>
                    option.setName('emojis')
                        .setDescription('Emoji bạn muốn mượn (phân tách nhiều emoji bằng dấu cách)')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('addtoserver')
                        .setDescription('Tùy chọn thêm emoji vào máy chủ của bạn')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sticker')
                .setDescription('Lấy sticker từ một tin nhắn cụ thể')
                .addStringOption(option =>
                    option.setName('messageid')
                        .setDescription('ID của tin nhắn chứa sticker')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('addtoserver')
                        .setDescription('Tùy chọn thêm sticker vào máy chủ của bạn'))),
    category: 'Tiện ích',
    async execute(interaction, lang) {
        const client = interaction.client;
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "Bạn không có quyền sử dụng lệnh này.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'emoji') {
            await handleEmojiSteal(interaction);
        } else if (subcommand === 'sticker') {
            await handleStickerSteal(interaction);
        }
    }
};

async function handleEmojiSteal(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const input = interaction.options.getString('emojis');
    const addToServer = interaction.options.getBoolean('addtoserver');

    const emojiRegex = /<(a?):(\w+):(\d+)>/g;
    const emojis = [...input.matchAll(emojiRegex)];

    if (emojis.length === 0) {
        return interaction.editReply({ content: 'Vui lòng cung cấp các emoji tùy chỉnh hợp lệ.' });
    }

    const addedEmojis = [];
    const failedEmojis = [];

    for (const [fullEmoji, animated, name, id] of emojis) {
        const isAnimated = animated === 'a';
        const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}`;

        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            let buffer = Buffer.from(response.data, 'binary');

            if (addToServer) {
                const originalSize = buffer.length;
                if (originalSize > 256 * 1024) {
                    buffer = await resizeImage(buffer, isAnimated);
                }

                const addedEmoji = await interaction.guild.emojis.create({
                    attachment: buffer,
                    name: name
                });
                addedEmojis.push(`${addedEmoji.toString()} (${name}) - Gốc: ${(originalSize / 1024).toFixed(2)}KB, Đã đổi kích thước: ${(buffer.length / 1024).toFixed(2)}KB`);
            } else {
                addedEmojis.push(`${fullEmoji} - [${url}] (${(buffer.length / 1024).toFixed(2)}KB)`);
            }
        } catch (error) {
            console.error(`Lỗi xử lý emoji:`, error.message);
            failedEmojis.push(`${fullEmoji} (${error.message})`);
        }
    }

    let replyContent = '';
    if (addedEmojis.length > 0) {
        replyContent += `${addToServer ? 'Đã thêm thành công' : 'Đã lấy thành công'}:\n${addedEmojis.join('\n')}\n\n`;
    }
    if (failedEmojis.length > 0) {
        replyContent += `Xử lý thất bại:\n${failedEmojis.join('\n')}`;
    }

    await interaction.editReply({ content: replyContent || 'Không có emoji nào được xử lý thành công.' });
}

async function handleStickerSteal(interaction) {
    const messageId = interaction.options.getString('messageid');
    const addToServer = interaction.options.getBoolean('addtoserver');

    try {
        const message = await interaction.channel.messages.fetch(messageId);

        if (!message) {
            return interaction.reply({
                content: "Không tìm thấy tin nhắn có ID đó trong kênh này.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const sticker = message.stickers.first();

        if (!sticker) {
            return interaction.reply({
                content: "Tin nhắn được chỉ định không chứa sticker.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const stickerUrl = sticker.url;
        const response = await axios.get(stickerUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');

        if (addToServer) {
            const addedSticker = await interaction.guild.stickers.create({
                file: buffer,
                name: sticker.name,
                tags: sticker.tags && sticker.tags.length > 0 ? sticker.tags.join(',') : 'stolen_sticker'
            });
            await interaction.reply({
                content: `Sticker "${sticker.name}" đã được thêm vào máy chủ!`,
                flags: MessageFlags.Ephemeral,
            });
        } else {
            await interaction.reply({
                content: `Đây là sticker "${sticker.name}":`,
                files: [{ attachment: buffer, name: `${sticker.name}.png` }],
                flags: MessageFlags.Ephemeral,
            });
        }
    } catch (error) {
        console.error('Lỗi xử lý sticker:', error);
        await interaction.reply({
            content: `Xử lý sticker thất bại: ${error.message}`,
            flags: MessageFlags.Ephemeral,
        });
    }
}

async function resizeImage(buffer, isAnimated) {
    const maxSize = 256 * 1024;
    let quality = 100;
    let width = 128;
    let height = 128;
    let resizedBuffer;

    while (true) {
        try {
            if (isAnimated) {
                resizedBuffer = await sharp(buffer, { animated: true })
                    .resize(width, height, { fit: 'inside' })
                    .gif({ quality })
                    .toBuffer();
            } else {
                resizedBuffer = await sharp(buffer)
                    .resize(width, height, { fit: 'inside' })
                    .png({ quality })
                    .toBuffer();
            }

            if (resizedBuffer.length <= maxSize) {
                return resizedBuffer;
            }

            if (width > 32 || height > 32) {
                width = Math.max(32, Math.floor(width * 0.9));
                height = Math.max(32, Math.floor(height * 0.9));
            } else if (quality > 10) {
                quality = Math.max(10, quality - 5);
            } else {
                quality = Math.max(1, quality - 1);
            }

            if (width === 32 && height === 32 && quality === 1) {
                throw new Error(`Không thể đổi kích thước xuống dưới ${maxSize / 1024}KB`);
            }
        } catch (error) {
            console.error('Lỗi trong resizeImage:', error);
            throw new Error(`Đổi kích thước thất bại: ${error.message}`);
        }
    }
}