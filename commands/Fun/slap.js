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

const slapActions = [
    "đã bị tát bằng một chiếc găng tay thực tế ảo. Đau!",
    "đã nhận một cái tát nhanh và gọn từ một bàn tay kỹ thuật số!",
    "bị đét một cách tinh nghịch bằng một chiếc gối emoji nhồi bông mềm mại.",
    "đã bị một chiếc drone lạ mang theo găng tay đấm bốc mềm va phải.",
    "cảm nhận được cú tát đau điếng từ một ngón tay xốp quá khổ.",
    "đã bị một cái tát nhẹ nhưng dứt khoát bằng một tờ báo ảo.",
    "bị một cái tát bất ngờ từ một cái bóng kỹ thuật số lén lút.",
    "đã bị tát một cách chế nhạo bằng một chiếc găng tay nhung tưởng tượng.",
    "đã bị một cái tát ma quái—chuyện đó có thật không vậy?",
    "đã nhận một cái tát được thực hiện với độ chính xác đến từng pixel.",
    "bị bất ngờ bởi một cái tát từ một meme trên mạng.",
    "cảm nhận được cú đét nhanh của một chiếc bánh kếp kỹ thuật số.",
    "đã bị tát bằng một con gà cao su kiểu hoạt hình cổ điển.",
    "nhận một cái tát đúng lúc từ một cú đập tay ảo bị lỗi.",
    "đã bị tát một cách hài hước bởi một bàn tay kỹ thuật số tinh nghịch, vô hình."
];

const slapGifs = [
    "https://media1.tenor.com/m/W2QqtV4k6ykAAAAd/orange-cat-cat-hitting-cat.gif",
    "https://media1.tenor.com/m/vgtGULlqLkcAAAAC/slp-baba.gif",
    "https://media1.tenor.com/m/DFROMUjkKZIAAAAC/smack-whack.gif",
    "https://media1.tenor.com/m/9XdFRVFCdFkAAAAC/bunny-dessert.gif",
    "https://media1.tenor.com/m/bblihRQawfsAAAAC/kitty-slap-kat-slap.gif",
    "https://media1.tenor.com/m/i3cGrnkMWl8AAAAC/slap-slapping.gif",
    "https://media1.tenor.com/m/dkWNqydxCBgAAAAd/pig-slap.gif",
    "https://media1.tenor.com/m/AyGol4CaEDcAAAAd/slapping.gif",
    "https://media1.tenor.com/m/5oguME-x8M0AAAAC/sassy-girl.gif",
    "https://media1.tenor.com/m/ahhvv7XKyVsAAAAd/lilu-cat.gif",
    "https://media1.tenor.com/m/7UwrqI4-r3cAAAAC/smack-hit.gif",
    "https://media1.tenor.com/m/m9PpGqjO3TcAAAAC/slap-slap-through-phone.gif"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slap')
        .setDescription('Tát một người dùng khác cho vui!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng để tát')
                .setRequired(true)),
    category: 'Fun',
    async execute(interaction, client) {
        const user = interaction.options.getUser('user');
        const slapAction = slapActions[Math.floor(Math.random() * slapActions.length)];
        const slapGif = slapGifs[Math.floor(Math.random() * slapGifs.length)];

        const embed = new EmbedBuilder()
            .setTitle(`Bạn đã tát ${user.username}!`)
            .setDescription(`<@${user.id}> ${slapAction}`)
            .setImage(slapGif)
            .setColor(config.EmbedColors);

        await interaction.reply({ embeds: [embed] });
    }
};