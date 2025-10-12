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

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

function convertSimplePatternToRegex(simplePattern) {
    let regexPattern = simplePattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`, 'i');
}

async function checkBlacklistWords(content) {
    const blacklistRegex = config.BlacklistWords.Patterns.map(pattern => convertSimplePatternToRegex(pattern));
    return blacklistRegex.some(regex => regex.test(content));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Hỏi bot một câu hỏi')
        .addStringOption(option => option.setName('question').setDescription('Câu hỏi để hỏi bot').setRequired(true)),
    category: 'Fun',
    async execute(interaction, client) {
        try {
            let question = interaction.options.getString("question");

            if (await checkBlacklistWords(question)) {
                const blacklistMessage = lang.BlacklistWords && lang.BlacklistWords.Message
                    ? lang.BlacklistWords.Message.replace(/{user}/g, `${interaction.user}`)
                    : 'Câu hỏi của bạn chứa từ bị cấm.';
                return interaction.reply({ content: blacklistMessage, flags: MessageFlags.Ephemeral });
            }

            let replies = lang.EightBallReplies;
            let result = Math.floor((Math.random() * replies.length));

            let ballembed = new EmbedBuilder()
                .setColor(config.EmbedColors)
                .setTitle(lang.EightBallTitle)
                .addFields([
                    { name: lang.EightBallQuestion, value: question },
                    { name: lang.EightBallAnswer, value: replies[result] },
                ])
                .setFooter({ text: lang.EightBallFooter, iconURL: interaction.user.avatarURL() })
                .setTimestamp();

            interaction.reply({ embeds: [ballembed] });

        } catch (error) {
            console.error("Lỗi trong lệnh 8ball: ", error);
            interaction.reply({ content: 'Xin lỗi, đã có lỗi khi xử lý câu hỏi của bạn.', flags: MessageFlags.Ephemeral });
        }
    }
};