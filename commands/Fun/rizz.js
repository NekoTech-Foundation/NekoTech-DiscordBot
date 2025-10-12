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
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

const config = getConfig();

// Mảng các câu thả thính đã được Việt hóa
const rizzLines = [
    "Cậu có phải là ảo thuật gia không? Vì mỗi khi nhìn cậu, mọi người xung quanh tớ đều biến mất.",
    "Cậu có bản đồ không? Vì tớ cứ bị lạc trong đôi mắt của cậu.",
    "Cậu có băng cá nhân không? Vì tớ vừa làm xước đầu gối khi ngã vì cậu đó.",
    "Nếu cậu là một loại rau củ, cậu sẽ là một quả dưa leo siêu 'dễ thương'.",
    "Cậu có tên chưa, hay để tớ gọi cậu là 'của tớ'?",
    "Cậu có phải người Pháp không? Vì tớ 'đổ' cậu rồi.",
    "Cậu bị cháy nắng à, hay lúc nào cậu cũng 'nóng bỏng' như vậy?",
    "Tên cậu có phải là Google không? Vì cậu có mọi thứ mà tớ đang tìm kiếm.",
    "Tớ có thể đi theo cậu về nhà không? Vì bố mẹ tớ luôn dặn phải theo đuổi ước mơ của mình.",
    "Cậu có bút chì không? Vì tớ muốn xóa đi quá khứ của cậu và viết nên tương lai của chúng ta.",
    "Nếu cậu là một loại trái cây, cậu sẽ là một quả dứa 'xịn'.",
    "Bố cậu có phải là một nghệ sĩ không? Vì cậu là một kiệt tác.",
    "Cậu có phải là một nhà du hành thời gian không? Vì tớ thấy cậu trong tương lai của tớ.",
    "Cậu có thể cho tớ mượn một nụ hôn không? Tớ hứa sẽ trả lại.",
    "Cậu có đồng xu nào không? Vì tớ muốn gọi cho mẹ và nói rằng tớ đã gặp được 'người ấy'.",
    "Cậu có phải là vé phạt không? Vì trên người cậu ghi toàn chữ 'XINH'.",
    "Nếu cậu là một chiếc bánh burger ở McDonald's, cậu sẽ là McGorgeous (Siêu Lộng Lẫy).",
    "Cậu có phải là một đống lửa trại không? Vì cậu thật nóng bỏng và tớ muốn 'thêm' nữa.",
    "Cậu có phải là Wi-Fi không? Vì tớ đang cảm thấy có sự 'kết nối'.",
    "Bố cậu có phải là một võ sĩ không? Vì cậu đúng là một 'cú knock-out'!",
    "Cậu có phải là một khoản vay ngân hàng không? Vì cậu có được 'sự quan tâm' của tớ.",
    "Cậu có phải là một thiên thần không? Vì thiên đường đang thiếu mất một người.",
    "Tên cậu có phải là Chapstick (son dưỡng môi) không? Vì cậu đúng là 'đỉnh của chóp'.",
    "Cậu có phải là người ngoài hành tinh không? Vì cậu vừa 'bắt cóc' trái tim tớ mất rồi.",
    "Cậu có phải là bóng đèn không? Vì cậu làm bừng sáng một ngày của tớ.",
    "Bố cậu có phải là một tên trộm không? Vì ông ấy đã đánh cắp tất cả các vì sao và đặt chúng vào mắt cậu.",
    "Cậu có phải là một cơn bão tuyết không? Vì cậu đang làm tim tớ đập loạn nhịp.",
    "Trong mắt cậu có gì lấp lánh à, hay chỉ là cậu vui khi thấy tớ?",
    "Cậu có phải là một ngọn núi lửa không? Vì tớ 'dung nham' cậu (lava you - love you).",
    "Cậu có phải là một chú mèo không? Vì cậu 'hoàn hảo' vừa vặn trong trái tim tớ.",
    "Cậu có phải là một ngôi sao không? Vì vẻ đẹp của cậu thắp sáng cả bầu trời đêm.",
    "Tên cậu có phải là Ariel không? Vì chúng ta 'Mermaid' (sinh ra) là để cho nhau.",
    "Cậu có phải là sư tử không? Vì tớ không thể ngừng 'nói dối' (lion - lying) về việc cậu hoàn hảo như thế nào.",
    "Cậu có thích nho khô không? Thế còn một 'cuộc hẹn' thì sao?",
    "Cậu có phải là người làm vườn không? Vì tớ 'đổ' cậu rồi.",
    "Cậu có phải là máy ảnh không? Mỗi lần nhìn cậu, tớ lại mỉm cười.",
    "Cậu có phải là một cuốn sách không? Vì cậu là câu chuyện yêu thích của tớ.",
    "Tên cậu có phải là Waldo không? Vì một người như cậu thật khó tìm.",
    "Cậu có phải là thang máy không? Vì tớ muốn 'lên xuống' cùng cậu."
];

// Mảng GIF không thay đổi
const rizzGifs = [
    "https://c.tenor.com/ryPE1xzKn70AAAAd/tenor.gif",
    "https://c.tenor.com/a4zf3SEgzbIAAAAC/tenor.gif",
    "https://c.tenor.com/6aejTZnDDxQAAAAC/tenor.gif",
    "https://c.tenor.com/yEG23sxXIVQAAAAC/tenor.gif",
    "https://c.tenor.com/rC_mbGxsqu8AAAAd/tenor.gif",
    "https://i.imgur.com/JxQZLHj.gif",
    "https://i.imgur.com/JbBHbdR.gif",
    "https://media1.tenor.com/m/8EBYtwaGjmwAAAAC/rizz-hey-girl.gif",
    "https://media1.tenor.com/m/Kslo79KC8BwAAAAd/silly-cat.gif",
    "https://media1.tenor.com/m/AgZTJ_JqM3QAAAAC/mewing-jawline.gif",
    "https://media1.tenor.com/m/d0dFrbFOlroAAAAC/swag-face.gif",
    "https://media1.tenor.com/m/uuV5rGCztBcAAAAd/bee-rizz-bee-eyebrow.gif",
    "https://media1.tenor.com/m/__PTQj3QDXoAAAAC/rizz-dziadyga.gif",
    "https://media1.tenor.com/m/nfNPRXNtRTMAAAAd/roblox.gif"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rizz')
        .setDescription('Gửi một câu thả thính ngẫu nhiên cho ai đó!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng mà bạn muốn thả thính')
                .setRequired(true)),
    category: 'Fun',
    async execute(interaction, client) {
        const user = interaction.options.getUser('user');
        const rizzLine = rizzLines[Math.floor(Math.random() * rizzLines.length)];
        const rizzGif = rizzGifs[Math.floor(Math.random() * rizzGifs.length)];

        const embed = new EmbedBuilder()
            .setTitle(`${user.username} ơi, tớ muốn thả thính cậu đây...`)
            .setDescription(rizzLine)
            .setImage(rizzGif)
            .setColor(config.EmbedColors)

        await interaction.reply({ embeds: [embed] });
    }
};