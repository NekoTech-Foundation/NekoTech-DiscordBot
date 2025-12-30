const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getConfig, getLang } = require('../../utils/configLoader.js');

const memeTemplates = [
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fun')
        .setDescription('🎉 Các lệnh vui vẻ tổng hợp')
        .addSubcommand(sub => 
            sub.setName('8ball')
                .setDescription('🎱 Hỏi bot một câu hỏi bất kỳ')
                .addStringOption(option => option.setName('question').setDescription('Câu hỏi').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('advice').setDescription('💡 Nhận một lời khuyên hữu ích'))
        .addSubcommand(sub => 
            sub.setName('compliment')
                .setDescription('💖 Gửi lời khen ngợi đến ai đó')
                .addUserOption(option => option.setName('user').setDescription('Người dùng').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('darkjoke').setDescription('🌑 Câu đùa hài hước... chắc vậy'))
        .addSubcommandGroup(group => // FACT Subcommand Group
            group.setName('fact')
                .setDescription('🧠 Xem sự thật thú vị')
                .addSubcommand(sub => sub.setName('cat').setDescription('Sự thật về mèo'))
                .addSubcommand(sub => sub.setName('dog').setDescription('Sự thật về chó'))
                .addSubcommand(sub => sub.setName('general').setDescription('Sự thật chung'))
                .addSubcommand(sub => sub.setName('useless').setDescription('Sự thật vô dụng'))
        )
        .addSubcommand(sub => 
            sub.setName('fliptext')
                .setDescription('🙃 Lật ngược văn bản')
                .addStringOption(option => option.setName('text').setDescription('Văn bản').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('lennyface').setDescription('Lenny Face ( ͡° ͜ʖ ͡°)'))
        .addSubcommandGroup(group => // MEME Subcommand Group
            group.setName('meme')
                .setDescription('🐸 Meme time')
                .addSubcommand(sub => sub.setName('random').setDescription('Meme ngẫu nhiên'))
                .addSubcommand(sub => 
                    sub.setName('text')
                        .setDescription('Tạo meme chữ')
                        .addStringOption(o => o.setName('template').setDescription('Mẫu').setRequired(true).addChoices(...memeTemplates))
                        .addStringOption(o => o.setName('top_text').setDescription('Văn bản trên').setRequired(true))
                        .addStringOption(o => o.setName('bottom_text').setDescription('Văn bản dưới')))
                .addSubcommand(sub => 
                    sub.setName('sadcat')
                        .setDescription('Mèo buồn')
                        .addStringOption(o => o.setName('text').setDescription('Văn bản').setRequired(true))
                )
        )
        .addSubcommand(sub => sub.setName('pickupline').setDescription('💘 Nhận câu thả thính'))
        .addSubcommand(sub => sub.setName('quote').setDescription('📜 Xem danh ngôn'))
        .addSubcommand(sub => 
            sub.setName('rizz')
                .setDescription('😉 Gửi câu thả thính kèm GIF')
                .addUserOption(element => element.setName('user').setDescription('Người nhận').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('roast')
                .setDescription('🔥 Chọc ghẹo ai đó')
                .addUserOption(option => option.setName('target').setDescription('Nạn nhân').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('kill')
                .setDescription('🔪 Giả vờ tiêu diệt ai đó')
                .addUserOption(option => option.setName('target').setDescription('Nạn nhân').setRequired(true))
        ),
    category: 'Fun',
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup(false);

        if (group === 'fact') {
            await this.handleFact(interaction, subcommand);
        } else if (group === 'meme') {
            await this.handleMeme(interaction, subcommand);
        } else {
            // Check individual subcommands
            if (subcommand === '8ball') await this.handle8Ball(interaction);
            else if (subcommand === 'advice') await this.handleAdvice(interaction);
            else if (subcommand === 'compliment') await this.handleCompliment(interaction);
            else if (subcommand === 'darkjoke') await this.handleDarkJoke(interaction);
            else if (subcommand === 'fliptext') await this.handleFlipText(interaction);
            else if (subcommand === 'lennyface') await this.handleLennyFace(interaction);
            else if (subcommand === 'pickupline') await this.handlePickupLine(interaction);
            else if (subcommand === 'quote') await this.handleQuote(interaction);
            else if (subcommand === 'rizz') await this.handleRizz(interaction);
            else if (subcommand === 'roast') await this.handleRoast(interaction);
            else if (subcommand === 'kill') await this.handleKill(interaction);
        }
    },

    // --- Handlers ---

    async handle8Ball(interaction) {
        const config = getConfig();
        const lang = await getLang(interaction.guild?.id);
        const question = interaction.options.getString("question");
        
        if (config.BlacklistWords && config.BlacklistWords.Patterns) {
            const patterns = config.BlacklistWords.Patterns;
            const blacklistRegex = patterns.map(p => new RegExp(`^${p.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`, 'i'));
            if (blacklistRegex.some(regex => regex.test(question))) {
                return interaction.reply({ content: 'Câu hỏi chứa từ cấm.', ephemeral: true });
            }
        }
        
        const replies = lang.EightBallReplies || ["Có", "Không", "Có thể"];
        const result = replies[Math.floor(Math.random() * replies.length)];
        
        const embed = new EmbedBuilder()
            .setColor(config.EmbedColors || '#0099ff')
            .setTitle(lang.EightBallTitle || "8 Ball")
            .addFields({ name: "Câu hỏi", value: question }, { name: "Trả lời", value: result })
            .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
    },

    async handleAdvice(interaction) {
        await interaction.deferReply();
        try {
            const res = await fetch('http://api.adviceslip.com/advice');
            const data = await res.json();
            await interaction.editReply(data.slip.advice);
        } catch (error) {
            console.error(error);
            await interaction.editReply('Không thể lấy lời khuyên lúc này.');
        }
    },

    async handleCompliment(interaction) {
        const lang = await getLang(interaction.guild?.id);
        const user = interaction.options.getUser('user');
        const compliments = lang.compliments?.messages || ["Bạn thật tuyệt vời!"];
        const compliment = compliments[Math.floor(Math.random() * compliments.length)];
        await interaction.reply(`<@${user.id}>, ${compliment}`);
    },

    async handleDarkJoke(interaction) {
        const lang = await getLang(interaction.guild?.id);
        const darkjokes = lang.darkjokes?.messages || ["Why did the chicken cross the road? To get to the other side."];
        const joke = darkjokes[Math.floor(Math.random() * darkjokes.length)];
        await interaction.reply(`**🤣 CÂU ĐÙA HÀI HƯỚC**\n${joke}`);
    },

    async handleFact(interaction, type) {
        await interaction.deferReply();
        let fact;
        try {
            if (type === 'cat') {
                const res = await fetch('https://catfact.ninja/fact?max_length=140');
                const data = await res.json();
                fact = data.fact;
            } else if (type === 'dog') {
                const res = await fetch('https://dog-api.kinduff.com/api/facts?number=1');
                const data = await res.json();
                fact = data.facts[0];
            } else if (type === 'general') {
                const res = await fetch('https://api.popcat.xyz/fact');
                const data = await res.json();
                fact = data.fact;
            } else { // useless
                const res = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random');
                const data = await res.json();
                fact = data.text;
            }
            await interaction.editReply(`**🎲 SỰ THẬT NGẪU NHIÊN**\n${fact}`);
        } catch (error) {
            console.error(error);
            await interaction.editReply('Không thể lấy sự thật lúc này.');
        }
    },

    async handleFlipText(interaction) {
        const config = getConfig();
        const text = interaction.options.getString("text");
        
        if (config.BlacklistWords && config.BlacklistWords.Patterns) {
            const patterns = config.BlacklistWords.Patterns;
            const blacklistRegex = patterns.map(p => new RegExp(`^${p.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`, 'i'));
            if (blacklistRegex.some(regex => regex.test(text))) {
                return interaction.reply({ content: 'Văn bản chứa từ cấm.', ephemeral: true });
            }
        }
        
        const mapping = '¡"#$%⅋,)(*+\' - ˙/0ƖᄅƐㄣϛ9ㄥ86:;<=>?@∀qƆpƎℲפHIſʞ˥WNOԀQɹS┴∩ΛMX⅄Z[/]^_`ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz{|}~';
        const OFFSET = '!'.charCodeAt(0);
        const flipped = text.split('').map(c => c.charCodeAt(0) - OFFSET).map(c => mapping[c] || ' ').reverse().join('');
        await interaction.reply(flipped);
    },

    async handleLennyFace(interaction) {
        const faces = ["( ͡° ͜ʖ ͡°)", "ʘ‿ʘ", "(◑‿◐)", "( ͡~ ͜ʖ ͡°)", "( ° ͜ʖ °)", "( ͠° ͟ʖ ͡°)", "¯\\_(ツ)_/¯"];
        await interaction.reply(faces[Math.floor(Math.random() * faces.length)]);
    },

    async handleMeme(interaction, type) {
        await interaction.deferReply();
        const config = getConfig();

        try {
            if (type === 'random') {
                const res = await fetch('https://meme-api.com/gimme');
                const json = await res.json();
                const embed = new EmbedBuilder()
                    .setTitle(json.title)
                    .setURL(json.postLink)
                    .setImage(json.url)
                    .setColor(config.EmbedColors || '#000000')
                    .setFooter({ text: `👍 ${json.ups} | Author: ${json.author}` });
                await interaction.editReply({ embeds: [embed] });
            } else if (type === 'text') {
                const template = interaction.options.getString('template');
                const top = interaction.options.getString('top_text');
                const bottom = interaction.options.getString('bottom_text') || '';
                
                const url = `https://api.memegen.link/images/${template}/${encodeURIComponent(top)}/${encodeURIComponent(bottom)}.png`;
                const embed = new EmbedBuilder()
                    .setTitle('😂 Meme')
                    .setImage(url)
                    .setColor(config.EmbedColors || '#000000');
                await interaction.editReply({ embeds: [embed] });
            } else if (type === 'sadcat') {
                const text = interaction.options.getString('text');
                const res = await fetch(`https://api.popcat.xyz/sadcat?text=${encodeURIComponent(text)}`);
                const buffer = await res.arrayBuffer();
                const embed = new EmbedBuilder().setTitle('😿 Mèo Buồn').setImage('attachment://sadcat.png').setColor('#000000');
                await interaction.editReply({ embeds: [embed], files: [{ attachment: Buffer.from(buffer), name: 'sadcat.png' }] });
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply('Có lỗi xảy ra khi tạo meme.');
        }
    },

    async handlePickupLine(interaction) {
        await interaction.deferReply();
        try {
            const res = await fetch('https://api.popcat.xyz/pickuplines');
            const json = await res.json();
            const embed = new EmbedBuilder().setTitle('💘 Thả thính').setDescription(json.pickupline).setColor('#ff69b4');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('Không thể lấy câu thả thính.');
        }
    },

    async handleQuote(interaction) {
        const lang = await getLang(interaction.guild?.id);
        const quotes = lang.Fun.Quotes || ["Không có dữ liệu - {Admin}"]; 
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        const parts = quote.split(' - ');
        if (parts.length < 2) return interaction.reply(quote);
        await interaction.reply(`\`\`\`ansi\n"${parts[0]}" - \x1b[2;34m[${parts[1].replace(/[{}]/g, '')}]\x1b[0m\n\`\`\``);
    },

    async handleRizz(interaction) {
        const config = getConfig();
        const lang = await getLang(interaction.guild?.id);
        const user = interaction.options.getUser('user');
        const lines = lang.Fun.Rizz.Lines;
        const gifs = ["https://media1.tenor.com/m/8EBYtwaGjmwAAAAC/rizz-hey-girl.gif", "https://media.tenor.com/Fj7YEYy1c4AAAAAC/rizz.gif"];
        
        const embed = new EmbedBuilder()
            .setTitle(`Gửi tới ${user.username}`)
            .setDescription(lines[Math.floor(Math.random() * lines.length)])
            .setImage(gifs[Math.floor(Math.random() * gifs.length)])
            .setColor(config.EmbedColors || '#000000');
        await interaction.reply({ embeds: [embed] });
    },

    async handleRoast(interaction) {
        const lang = await getLang(interaction.guild?.id);
        const target = interaction.options.getUser('target');
        const roasts = lang.Fun.Roast.Lines;
        const roast = roasts[Math.floor(Math.random() * roasts.length)];
        await interaction.reply(`<@${target.id}>, ${roast}`);
    },

    async handleKill(interaction) {
        const config = getConfig();
        const lang = await getLang(interaction.guild?.id);
        const target = interaction.options.getUser('target');
        const scenarios = lang.Fun.Kill.Scenarios;
        const sc = scenarios[Math.floor(Math.random() * scenarios.length)];
        const embed = new EmbedBuilder()
            .setDescription(`<@${interaction.user.id}> ${sc.text} <@${target.id}>.`)
            .setImage(sc.image)
            .setColor(config.EmbedColors || '#FF0000');
        await interaction.reply({ embeds: [embed] });
    }
};
