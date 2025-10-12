/*
  _____            _           ____        _   
 |  __ \          | |         |  _ \      | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                             
                                        
 Thank you for choosing Drako Bot!

 Should you encounter any issues, require assistance, or have suggestions for improving the bot,
 we invite you to connect with us on our Discord server and create a support ticket: 

 http://discord.drakodevelopment.net
 
*/

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

const config = getConfig();

const kissGifs = [
    "https://media1.tenor.com/m/_8oadF3hZwIAAAAC/kiss.gif",
    "https://media1.tenor.com/m/kmxEaVuW8AoAAAAd/kiss-gentle-kiss.gif",
    "https://media1.tenor.com/m/sbMBW4a-VN4AAAAC/anime-kiss.gif",
    "https://media1.tenor.com/m/cQzRWAWrN6kAAAAC/ichigo-hiro.gif",
    "https://media1.tenor.com/m/b7DWF8ecBkIAAAAC/kiss-anime-anime.gif",
    "https://media1.tenor.com/m/9u2vmryDP-cAAAAC/horimiya-animes.gif",
    "https://media1.tenor.com/m/QQTLF-JE2VcAAAAC/kiss.gif",
    "https://media1.tenor.com/m/YhGc7aQAI4oAAAAC/megumi-kato-kiss.gif",
    "https://media1.tenor.com/m/1SBrq4NinsEAAAAC/yoshikazu-kisses-kiyone-on-her-cheeks.gif",
    "https://media1.tenor.com/m/-tGrNiv2e_AAAAAC/ali-ecrin.gif",
    "https://media1.tenor.com/m/sWw7sHKDWHMAAAAC/anime-wholesome-wholesome.gif",
    "https://media1.tenor.com/m/FwbvGXvGE5oAAAAC/goth-girl-goth-kiss.gif"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription('Gửi một nụ hôn nồng thắm cho ngày mới!')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Chọn người để hôn')
                .setRequired(true)),
    category: 'Fun',
    async execute(interaction, client) {
        const target = interaction.options.getUser('target');
        const selectedGif = kissGifs[Math.floor(Math.random() * kissGifs.length)];

        const embed = new EmbedBuilder()
            .setDescription(`<@${interaction.user.id}> Hun bạn nè <@${target.id}>.`)
            .setImage(selectedGif)
            .setColor(config.EmbedColors)

        await interaction.reply({ embeds: [embed] });
    }
};