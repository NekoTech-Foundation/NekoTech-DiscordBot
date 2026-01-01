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

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');
const yaml = require("js-yaml");
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Lấy tin nhắn đã xóa hoặc đã chỉnh sửa gần nhất')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('message')
                .setDescription('Lấy tin nhắn đã xóa gần nhất'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edited')
                .setDescription('Lấy tin nhắn đã chỉnh sửa gần nhất'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Xóa tin nhắn đã snipe gần nhất')),
    category: 'Chung',
    async execute(interaction, lang) {
        const client = interaction.client;
        const subCommand = interaction.options.getSubcommand();

        if (subCommand === 'clear') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: lang.NoPermsMessage || "Bạn không có quyền sử dụng lệnh này.", flags: MessageFlags.Ephemeral });
            }

            if (!client.snipes.has(interaction.guildId) || !client.snipes.get(interaction.guildId).has(interaction.channelId)) {
                return interaction.reply({ content: "Không có tin nhắn nào đã snipe để xóa.", flags: MessageFlags.Ephemeral });
            }

            client.snipes.get(interaction.guildId).delete(interaction.channelId);
            return interaction.reply({ content: "Đã xóa thành công tin nhắn đã snipe cho kênh này.", flags: MessageFlags.Ephemeral });
        }

        const snipeMsg = client.snipes.get(interaction.guildId)?.get(interaction.channelId);

        if (!snipeMsg) {
            return interaction.reply({ content: lang.SnipeNoMsg || "Không có tin nhắn nào để snipe!", flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: `${snipeMsg.author}`, iconURL: `${snipeMsg.member.user.displayAvatarURL()}` })
            .setColor(config.EmbedColors?.Default || '#0099ff')
            .setTimestamp(snipeMsg.timestamp);

        if (subCommand === 'edited' && snipeMsg.edited) {
            embed.addFields([
                { name: "Tin nhắn gốc", value: snipeMsg.oldContent || "Không có nội dung" },
                { name: "Tin nhắn đã chỉnh sửa", value: snipeMsg.newContent || "Không có nội dung" }
            ]);
        } else if (subCommand === 'message' && !snipeMsg.edited) {
            embed.setDescription(snipeMsg.content);
        } else {
            return interaction.reply({ content: 'Không tìm thấy tin nhắn đã snipe nào liên quan.', flags: MessageFlags.Ephemeral });
        }

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};