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

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('image')
        .setDescription('🖼️ Tìm kiếm hình ảnh')
        .addSubcommand(subcommand =>
            subcommand
                .setName('cat')
                .setDescription('Lấy một hình ảnh ngẫu nhiên về mèo'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dog')
                .setDescription('Lấy một hình ảnh ngẫu nhiên về chó'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('coffee')
                .setDescription('Lấy một hình ảnh ngẫu nhiên về cà phê'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('duck')
                .setDescription('Lấy một hình ảnh ngẫu nhiên về vịt')),
    category: 'Giải trí',
    async execute(interaction) {
        try {
            await interaction.deferReply();
            const subcommand = interaction.options.getSubcommand();
            let imageUrl = '';
            let title = '';

            if (subcommand === 'cat') {
                const response = await fetch('http://edgecats.net/random');
                imageUrl = await response.text();
                title = 'Đây là một chú mèo ngẫu nhiên cho bạn!';
            } else if (subcommand === 'dog') {
                const response = await fetch('https://random.dog/woof.json');
                const data = await response.json();
                imageUrl = data.url;
                title = 'Đây là một chú chó ngẫu nhiên cho bạn!';
            } else if (subcommand === 'coffee') {
                const response = await fetch('https://coffee.alexflipnote.dev/random.json');
                const data = await response.json();
                imageUrl = data.file;
                title = 'Đây là một ly cà phê ngẫu nhiên cho bạn!';
            } else if (subcommand === 'duck') {
                const response = await fetch('https://random-d.uk/api/v2/random');
                const data = await response.json();
                imageUrl = data.url;
                title = 'Đây là một chú vịt ngẫu nhiên cho bạn!';
            }

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setImage(imageUrl)
                .setColor(config.EmbedColors);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(`Lỗi khi lấy hình ảnh ${subcommand}: `, error);
            await interaction.editReply({ content: `Hiện tại không thể lấy được hình ảnh ${subcommand}.` });
        }
    }
};