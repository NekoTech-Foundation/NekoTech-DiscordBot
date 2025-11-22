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

const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();

const templates = [
    { name: 'Anh chàng Người Ngoài Hành Tinh Cổ Đại', value: 'aag' },
    { name: 'Là một cái bẫy!', value: 'ackbar' },
    { name: 'Andy Ngại Hỏi', value: 'afraid' },
    { name: 'Agnes Harkness Nháy Mắt', value: 'agnes' },
    { name: 'Sweet Brown', value: 'aint-got-time' },
    { name: 'Hải Cẩu Khoảnh Khắc Khó Xử', value: 'ams' },
    { name: 'Bạn muốn có kiến à?', value: 'ants' },
    { name: 'Anh Chàng Cổ Đỏ Gần Như Đúng Chuẩn Chính Trị', value: 'apcr' },
    { name: 'Vẫn Luôn Là Vậy', value: 'astronaut' },
    { name: 'Và Rồi Tôi Nói', value: 'atis' },
    { name: 'Sự sống... sẽ tìm ra lối', value: 'away' },
    { name: 'Chim Cánh Cụt Tuyệt Vời Về Mặt Xã Hội', value: 'awesome' },
    { name: 'Chim Cánh Cụt Tuyệt Vời Và Khó Xử', value: 'awesome-awkward' },
    { name: 'Chim Cánh Cụt Khó Xử Về Mặt Xã Hội', value: 'awkward' },
    { name: 'Chim Cánh Cụt Khó Xử Nhưng Tuyệt Vời', value: 'awkward-awesome' },
    { name: 'Bạn Nên Cảm Thấy Tệ', value: 'bad' },
    { name: 'Uống Sữa Là Một Lựa Chọn Tồi', value: 'badchoice' },
    { name: 'Kẻ Bực Bội', value: 'bd' },
    { name: 'Đàn Ông Mặc Đồ Đen', value: 'because' },
    { name: 'Tôi Sẽ Xây Công Viên Chủ Đề Của Riêng Mình', value: 'bender' },
    { name: 'Nhưng đó là công việc lương thiện', value: 'bihw' },
    { name: 'Tại sao tôi không nên giữ nó', value: 'bilbo' },
    { name: 'Sói Điên Con', value: 'biw' },
    { name: 'Brian Gặp Xui', value: 'blb' },
    { name: 'Mèo Tôi Nên Mua Một Chiếc Thuyền', value: 'boat' },
];

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
        .setName('meme')
        .setDescription('🐸 Xem meme ngẫu nhiên')
        .addSubcommand(subcommand =>
            subcommand
                .setName('random')
                .setDescription('Lấy một meme ngẫu nhiên từ meme-api.com'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('text')
                .setDescription('Tạo một meme với văn bản')
                .addStringOption(option =>
                    option.setName('template')
                        .setDescription('Chọn một mẫu meme')
                        .setRequired(true)
                        .addChoices(...templates))
                .addStringOption(option =>
                    option.setName('top_text')
                        .setDescription('Văn bản phía trên cho meme')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('bottom_text')
                        .setDescription('Văn bản phía dưới cho meme')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sadcat')
                .setDescription('Tạo ảnh mèo buồn với văn bản của bạn')
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('Văn bản để hiển thị trên ảnh mèo buồn')
                        .setRequired(true))),
    category: 'Giải trí',
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'random') {
            await interaction.deferReply();

            try {
                const res = await fetch('https://meme-api.com/gimme');
                if (!res.ok) {
                    throw new Error('Không thể lấy meme, meme-api có thể đang bị lỗi hoặc bận.');
                }
                const json = await res.json();

                const memeUrl = json.postLink;
                const memeImage = json.url;
                const memeTitle = json.title;
                const memeUpvotes = json.ups;
                const memeAuthor = json.author;
                const memeSubreddit = json.subreddit;

                const embed = new EmbedBuilder()
                    .setTitle(`🤣 ${memeTitle}`)
                    .setURL(memeUrl)
                    .setImage(memeImage)
                    .setColor(config.EmbedColors)
                    .addFields(
                        { name: '👍 Lượt ủng hộ', value: `${memeUpvotes}`, inline: true },
                        { name: '👤 Tác giả', value: `${memeAuthor}`, inline: true },
                        { name: '📂 Subreddit', value: `${memeSubreddit}`, inline: true }
                    )
                    .setFooter({ text: 'Chúc bạn vui vẻ!' });

                interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error('Lỗi khi lấy meme:', error);
                interaction.editReply({
                    content: 'Xin lỗi, tôi không thể lấy meme vào lúc này. Vui lòng thử lại sau.',
                });
            }
        } else if (subcommand === 'text') {
            await interaction.deferReply();

            const template = interaction.options.getString('template');
            const topText = interaction.options.getString('top_text');
            const bottomText = interaction.options.getString('bottom_text') || '';

            if (await checkBlacklistWords(topText) || await checkBlacklistWords(bottomText)) {
                const blacklistMessage = lang.BlacklistWords && lang.BlacklistWords.Message
                    ? lang.BlacklistWords.Message.replace(/{user}/g, `${interaction.user}`)
                    : 'Văn bản của bạn chứa các từ bị cấm.';
                return interaction.editReply({ content: blacklistMessage, flags: MessageFlags.Ephemeral });
            }

            const memeApiUrl = `https://api.memegen.link/images/${template}/${encodeURIComponent(topText)}/${encodeURIComponent(bottomText)}.png`;

            try {
                const res = await fetch(memeApiUrl);
                if (!res.ok) {
                    throw new Error('Không thể tạo meme, API memegen có thể đang bị lỗi hoặc bận.');
                }
                const memeUrl = res.url;

                const embed = new EmbedBuilder()
                    .setTitle('😂 Meme')
                    .setImage(memeUrl)
                    .setColor(config.EmbedColors)
                    .setFooter({ text: 'Chúc bạn vui vẻ!' });

                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error('Lỗi khi tạo meme:', error);
                await interaction.editReply({
                    content: 'Xin lỗi, tôi không thể tạo meme vào lúc này. Vui lòng thử lại sau.',
                    flags: MessageFlags.Ephemeral
                });
            }
        } else if (subcommand === 'sadcat') {
            await interaction.deferReply();

            const text = interaction.options.getString('text');

            const getRandomColor = () => {
                const letters = '0123456789ABCDEF';
                let color = '#';
                for (let i = 0; i < 6; i++) {
                    color += letters[Math.floor(Math.random() * 16)];
                }
                return color;
            };

            try {
                const res = await fetch(`https://api.popcat.xyz/sadcat?text=${encodeURIComponent(text)}`);
                if (!res.ok) {
                    throw new Error('Không thể tạo ảnh mèo buồn, API có thể đang bị lỗi hoặc bận.');
                }
                const buffer = await res.arrayBuffer();

                const embed = new EmbedBuilder()
                    .setTitle(`😿 Mèo Buồn`)
                    .setImage('attachment://sadcat.png')
                    .setColor(getRandomColor())
                    .setFooter({ text: 'Vui lên nào!' });

                await interaction.editReply({
                    embeds: [embed],
                    files: [{ attachment: Buffer.from(buffer), name: 'sadcat.png' }]
                });
            } catch (error) {
                console.error('Lỗi khi tạo ảnh mèo buồn:', error);
                await interaction.editReply({
                    content: 'Xin lỗi, tôi không thể tạo ảnh mèo buồn vào lúc này. Vui lòng thử lại sau.',
                });
            }
        }
    },
};