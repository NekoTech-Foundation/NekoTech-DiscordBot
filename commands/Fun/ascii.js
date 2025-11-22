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

const { SlashCommandBuilder } = require('discord.js');
const figlet = require('figlet');
const { promisify } = require('util');
const { getConfig, getLang } = require('../../utils/configLoader.js');

const figletAsync = promisify(figlet);
const config = getConfig();
const lang = getLang();

function wordWrap(text, maxLength) {
    let wrapped = '';
    let words = text.split(' ');
    let currentLine = '';

    words.forEach(word => {
        if ((currentLine + word).length < maxLength) {
            currentLine += `${word} `;
        } else {
            wrapped += `${currentLine}\n`;
            currentLine = `${word} `;
        }
    });

    wrapped += currentLine;
    return wrapped.trim();
}

const fontSizeMapping = {
    'small': 'Small',
    'medium': 'Standard',
    'large': 'Big'
};

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
        .setName('ascii')
        .setDescription('🎨 Chuyển đổi văn bản thành dạng ASCII')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Văn bản bạn muốn chuyển đổi')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('size')
                .setDescription('Kích thước phông chữ')
                .setRequired(false)
                .addChoices(
                    { name: 'Nhỏ', value: 'small' },
                    { name: 'Trung bình', value: 'medium' },
                    { name: 'Lớn', value: 'large' }
                )),
    category: 'Fun',
    async execute(interaction) {
        await interaction.deferReply();
        let text = interaction.options.getString('text');
        const sizeChoice = interaction.options.getString('size') || 'medium';

        if (await checkBlacklistWords(text)) {
            const blacklistMessage = lang.BlacklistWords && lang.BlacklistWords.Message
                ? lang.BlacklistWords.Message.replace(/{user}/g, `${interaction.user}`)
                : 'Văn bản của bạn chứa các từ bị cấm.';
            return interaction.editReply({ content: blacklistMessage, ephemeral: true });
        }

        text = wordWrap(text, 25);

        try {
            const data = await figletAsync(text, {
                font: fontSizeMapping[sizeChoice],
                horizontalLayout: 'default',
                verticalLayout: 'default'
            });

            if (data.length > 2000) {
                return interaction.editReply('Nghệ thuật ASCII được tạo ra quá dài đối với Discord!');
            }
            interaction.editReply('```' + data + '```');
        } catch (err) {
            console.error('Đã có lỗi xảy ra với figlet...');
            console.dir(err);
            interaction.editReply('Không thể chuyển đổi văn bản thành nghệ thuật ASCII, vui lòng thử lại.');
        }
    },
};
