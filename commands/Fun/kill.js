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

const killScenarios = [
    {
        text: "làm bạn ngạt thở bằng một chiếc gối mềm mại.",
        image: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHlxdDhwYWZxZmdkNWN4dWFxbng5Zm94bHl1M2czOGU0ZndxMmx2OSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xUPGcdlIDdjwxbjrO0/giphy.gif"
    },
    {
        text: "đâm bạn bằng một vật nhọn.",
        image: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExczNxd3A3djViMzJpemJ1OWV5dnhvYmljOHlldnVmaHZrYnhzamJrYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/CiZB6WIjaoXYc/giphy.gif"
    },
    {
        text: "đánh bại bạn trong một cuộc đấu tay đôi thân thiện bằng một vật sắc nhọn.",
        image: "https://media1.tenor.com/m/Fedmj9KCbH8AAAAd/axe-five.gif"
    },
    {
        text: "giết bạn bằng sự tử tế.",
        image: "https://media1.tenor.com/m/UpsNRrB6iKUAAAAd/violent-cat-cat.gif"
    },
    {
        text: "chạy đến đè bạn để cho bạn thấy sự dễ thương.",
        image: "https://media1.tenor.com/m/n51pqoBDBp4AAAAd/kill-you-chuckie.gif"
    },
    { 
        text: "đe dọa sẽ ám sát bạn.",
        image: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnczdGFsemY0MTUxeWpqaHF3ZHlyeHcwZmRienhrNWFya2FqY3hxNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QHYHhShm1sjVS/giphy.gif"
    },
    { 
        text: "ném bạn xuống vách đá.",
        image: "https://media1.tenor.com/m/lzeoLQIX-Q8AAAAd/bette-midler-danny-devito.gif"
    },
    { 
        text: "dùng tia laze để bắn bạn.",
        image: "https://media1.tenor.com/m/z5is3s2v4RcAAAAC/zap-shotgun.gif"
    },
    {
        text: "bắn bạn bằng một khẩu pháo.",
        image: "https://media1.tenor.com/m/w5wm0GtfI9EAAAAd/cannon-fish.gif"
    },
    {
        text: "gửi một đàn ong đến tấn công bạn.",
        image: "https://media1.tenor.com/m/mkdkr8EEyUEAAAAd/bees-bee.gif"
    },
    {
        text: "bẫy bạn trong cát lún.",
        image: "https://media1.tenor.com/m/diq_HcNUsY0AAAAC/trouble-sink.gif"
    },
    {
        text: "phù phép biến bạn thành một con cóc.",
        image: "https://media1.tenor.com/m/u6oVic5CvAUAAAAC/casting-spells-magical.gif"
    },
    {
        text: "thả một cái đe lên người bạn.",
        image: "https://media1.tenor.com/m/ItHSQ8Liaz4AAAAC/fallon-tonightshow.gif"
    },
    {
        text: "thổi bay bạn bằng một cơn gió mạnh.",
        image: "https://media1.tenor.com/m/WIScDzVZVwsAAAAC/blowing-away-ewan-mcgregor.gif"
    },
    {
        text: "lừa bạn rơi xuống một cái hố.",
        image: "https://media1.tenor.com/m/CVFsAmHi1JQAAAAC/jump-cannonball.gif"
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kill')
        .setDescription('Giả vờ "tiêu diệt" một người dùng khác một cách vui vẻ và vô hại!')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Người dùng bạn muốn "tiêu diệt"')
                .setRequired(true)),
    category: 'Giải trí',
    async execute(interaction, client) {
        const target = interaction.options.getUser('target');
        const scenario = killScenarios[Math.floor(Math.random() * killScenarios.length)];

        const embed = new EmbedBuilder()
            .setDescription(`<@${interaction.user.id}> ${scenario.text} <@${target.id}>.`)
            .setImage(scenario.image)
            .setColor(config.EmbedColors)

        await interaction.reply({ embeds: [embed] });
    }
};