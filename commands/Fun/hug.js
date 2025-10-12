/*
  _____            _           ____        _   
 |  __ \          | |         |  _ \      | |  
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
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

const config = getConfig();

const hugGifs = [
    "https://media.tenor.com/oRk6wv13vTAAAAAi/hug.gif",
    "https://media1.tenor.com/m/BvoOcnjAz1AAAAAC/boo-hug.gif",
    "https://media1.tenor.com/m/r8J976-gzRYAAAAd/iluvcashew.gif",
    "https://media1.tenor.com/m/DRgXad_JuuQAAAAC/bobitos-mimis.gif",
    "https://media1.tenor.com/m/AKcvM9yQRrQAAAAC/hug.gif",
    "https://media1.tenor.com/m/3OMzo-QSVqEAAAAd/baby-hug.gif",
    "https://media1.tenor.com/m/9RnLYWZRyDwAAAAd/snuggles-hugs.gif",
    "https://media1.tenor.com/m/yMjbC5MEv5UAAAAC/hug-squeeze.gif",
    "https://media1.tenor.com/m/m0DnmklkzAEAAAAd/allex-ano.gif",
    "https://media1.tenor.com/m/EqG5FatLJpUAAAAC/hug-dogs.gif",
    "https://media1.tenor.com/m/wlkjEsa1X_wAAAAC/monkeys-monkey.gif"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('Gửi một cái ôm cho ai đó để làm ngày của họ tươi sáng hơn!')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Người dùng để ôm')
                .setRequired(true)),
    category: 'Fun',
    async execute(interaction, client) {
        const target = interaction.options.getUser('target');
        const selectedGif = hugGifs[Math.floor(Math.random() * hugGifs.length)];

        const embed = new EmbedBuilder()
            .setDescription(`<@${interaction.user.id}> gửi những cái ôm đến bạn <@${target.id}>.`)
            .setImage(selectedGif)
            .setColor(config.EmbedColors)

        await interaction.reply({ embeds: [embed] });
    }
};