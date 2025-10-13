const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const languageSamples = [
    {
        language: 'Japanese',
        flag: '🇯🇵',
        patterns: [
            { text: 'おはようございます', meaning: 'Good morning' },
            { text: '今日はとても良い天気ですね', meaning: 'The weather is very nice today' },
            { text: '私の趣味は写真撮影です', meaning: 'My hobby is photography' },
            { text: '美味しい料理を食べましょう', meaning: 'Let\'s eat delicious food' },
            { text: '日本の文化が大好きです', meaning: 'I love Japanese culture' },
            { text: '電車が遅れています', meaning: 'The train is delayed' },
            { text: '週末に映画を見に行きませんか', meaning: 'Would you like to go watch a movie this weekend?' },
            { text: '申し訳ありませんが、分かりません', meaning: 'I\'m sorry, but I don\'t understand' },
            { text: '一緒に買い物に行きましょう', meaning: 'Let\'s go shopping together' },
            { text: 'お誕生日おめでとうございます', meaning: 'Happy birthday' }
        ]
    },
    {
        language: 'Korean',
        flag: '🇰🇷',
        patterns: [
            { text: '안녕하세요', meaning: 'Hello' },
            { text: '오늘 날씨가 좋네요', meaning: 'The weather is nice today' },
            { text: '저는 음악 듣는 것을 좋아해요', meaning: 'I like listening to music' },
            { text: '한국 음식이 정말 맛있어요', meaning: 'Korean food is really delicious' },
            { text: '지금 몇 시예요?', meaning: 'What time is it now?' },
            { text: '주말 잘 보내세요', meaning: 'Have a good weekend' },
            { text: '이것 좀 도와주시겠어요?', meaning: 'Could you help me with this?' },
            { text: '내일 같이 점심 먹을래요?', meaning: 'Would you like to have lunch together tomorrow?' },
            { text: '영화 보러 갈까요?', meaning: 'Shall we go watch a movie?' },
            { text: '생일 축하합니다', meaning: 'Happy birthday' }
        ]
    },
    {
        language: 'Chinese',
        flag: '🇨🇳',
        patterns: [
            { text: '你好，很高兴认识你', meaning: 'Hello, nice to meet you' },
            { text: '我喜欢在公园散步', meaning: 'I like walking in the park' },
            { text: '这个周末你有什么计划？', meaning: 'What are your plans for this weekend?' },
            { text: '中国菜真好吃', meaning: 'Chinese food is really delicious' },
            { text: '我正在学习中文', meaning: 'I am learning Chinese' },
            { text: '请问现在几点了？', meaning: 'What time is it now?' },
            { text: '明天天气怎么样？', meaning: 'How\'s the weather tomorrow?' },
            { text: '我们一起去购物吧', meaning: 'Let\'s go shopping together' },
            { text: '祝你生日快乐', meaning: 'Happy birthday to you' },
            { text: '这部电影很有意思', meaning: 'This movie is very interesting' }
        ]
    },
    {
        language: 'Vietnamese',
        flag: '🇻🇳',
        patterns: [
            { text: 'Chào buổi sáng', meaning: 'Good morning' },
            { text: 'Tôi rất thích ẩm thực Việt Nam', meaning: 'I really like Vietnamese cuisine' },
            { text: 'Bạn đang làm gì vậy?', meaning: 'What are you doing?' },
            { text: 'Hôm nay thời tiết đẹp quá', meaning: 'The weather is very beautiful today' },
            { text: 'Tôi muốn đi du lịch', meaning: 'I want to travel' },
            { text: 'Chúc mừng sinh nhật', meaning: 'Happy birthday' },
            { text: 'Bạn có khỏe không?', meaning: 'How are you?' },
            { text: 'Cảm ơn rất nhiều', meaning: 'Thank you very much' },
            { text: 'Hẹn gặp lại bạn sau', meaning: 'See you later' },
            { text: 'Tôi đang học tiếng Việt', meaning: 'I am learning Vietnamese' }
        ]
    },
    {
        language: 'Thai',
        flag: '🇹🇭',
        patterns: [
            { text: 'สวัสดีครับ/ค่ะ', meaning: 'Hello' },
            { text: 'วันนี้อากาศดีมาก', meaning: 'The weather is very nice today' },
            { text: 'คุณชอบอาหารไทยไหม', meaning: 'Do you like Thai food?' },
            { text: 'ผมกำลังเรียนภาษาไทย', meaning: 'I am learning Thai' },
            { text: 'ขอบคุณครับ/ค่ะ', meaning: 'Thank you' },
            { text: 'สุขสันต์วันเกิด', meaning: 'Happy birthday' },
            { text: 'คุณสบายดีไหม', meaning: 'How are you?' },
            { text: 'ไปกินข้าวกันไหม', meaning: 'Shall we go eat?' },
            { text: 'ยินดีที่ได้รู้จัก', meaning: 'Nice to meet you' },
            { text: 'แล้วเจอกันใหม่', meaning: 'See you again' }
        ]
    },
    {
        language: 'Hindi',
        flag: '🇮🇳',
        patterns: [
            { text: 'नमस्ते, आप कैसे हैं?', meaning: 'Hello, how are you?' },
            { text: 'मुझे भारतीय खाना बहुत पसंद है', meaning: 'I really like Indian food' },
            { text: 'आज मौसम बहुत अच्छा है', meaning: 'The weather is very nice today' },
            { text: 'मैं हिंदी सीख रहा हूं', meaning: 'I am learning Hindi' },
            { text: 'क्या आप मेरी मदद कर सकते हैं?', meaning: 'Can you help me?' },
            { text: 'जन्मदिन की शुभकामनाएं', meaning: 'Happy birthday' },
            { text: 'मुझे यह फिल्म पसंद है', meaning: 'I like this movie' },
            { text: 'आप कहां जा रहे हैं?', meaning: 'Where are you going?' },
            { text: 'मैं थोड़ा थका हुआ हूं', meaning: 'I am a bit tired' },
            { text: 'फिर मिलेंगे', meaning: 'See you again' }
        ]
    },
    {
        language: 'Filipino',
        flag: '🇵🇭',
        patterns: [
            { text: 'Magandang umaga po', meaning: 'Good morning (polite)' },
            { text: 'Kumusta ka na?', meaning: 'How are you?' },
            { text: 'Salamat po sa lahat', meaning: 'Thank you for everything' },
            { text: 'Masarap ang pagkain', meaning: 'The food is delicious' },
            { text: 'Mahal kita', meaning: 'I love you' },
            { text: 'Ingat ka sa pag-uwi', meaning: 'Take care on your way home' },
            { text: 'Nasaan ka na?', meaning: 'Where are you now?' },
            { text: 'Maligayang kaarawan', meaning: 'Happy birthday' },
            { text: 'Ang ganda ng panahon', meaning: 'The weather is beautiful' },
            { text: 'Hanggang sa muli', meaning: 'Until next time' }
        ]
    },
    {
        language: 'Indonesian',
        flag: '🇮🇩',
        patterns: [
            { text: 'Selamat pagi', meaning: 'Good morning' },
            { text: 'Apa kabar?', meaning: 'How are you?' },
            { text: 'Saya suka makanan Indonesia', meaning: 'I like Indonesian food' },
            { text: 'Terima kasih banyak', meaning: 'Thank you very much' },
            { text: 'Cuaca hari ini bagus', meaning: 'The weather is nice today' },
            { text: 'Selamat ulang tahun', meaning: 'Happy birthday' },
            { text: 'Sampai jumpa lagi', meaning: 'See you again' },
            { text: 'Saya sedang belajar bahasa Indonesia', meaning: 'I am learning Indonesian' },
            { text: 'Mau pergi kemana?', meaning: 'Where are you going?' },
            { text: 'Senang bertemu dengan anda', meaning: 'Nice to meet you' }
        ]
    },
    {
        language: 'Malay',
        flag: '🇲🇾',
        patterns: [
            { text: 'Selamat pagi', meaning: 'Good morning' },
            { text: 'Apa khabar?', meaning: 'How are you?' },
            { text: 'Terima kasih', meaning: 'Thank you' },
            { text: 'Saya suka makanan Malaysia', meaning: 'I like Malaysian food' },
            { text: 'Cuaca hari ini sangat baik', meaning: 'The weather today is very good' },
            { text: 'Selamat hari jadi', meaning: 'Happy birthday' },
            { text: 'Jumpa lagi', meaning: 'See you again' },
            { text: 'Saya belajar bahasa Melayu', meaning: 'I am learning Malay' },
            { text: 'Anda hendak pergi ke mana?', meaning: 'Where are you going?' },
            { text: 'Selamat malam', meaning: 'Good night' }
        ]
    },
    {
        language: 'Bengali',
        flag: '🇧🇩',
        patterns: [
            { text: 'নমস্কার, কেমন আছেন?', meaning: 'Hello, how are you?' },
            { text: 'আজ আবহাওয়া খুব ভালো', meaning: 'The weather is very nice today' },
            { text: 'আমি বাংলা শিখছি', meaning: 'I am learning Bengali' },
            { text: 'আপনার সাথে দেখা হয়ে ভালো লাগলো', meaning: 'Nice to meet you' },
            { text: 'শুভ জন্মদিন', meaning: 'Happy birthday' },
            { text: 'ধন্যবাদ', meaning: 'Thank you' },
            { text: 'আবার দেখা হবে', meaning: 'See you again' },
            { text: 'আপনি কোথায় যাচ্ছেন?', meaning: 'Where are you going?' },
            { text: 'খাবারটা খুব সুস্বাদু', meaning: 'The food is very delicious' },
            { text: 'আমি একটু ক্লান্ত', meaning: 'I am a bit tired' }
        ]
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guess')
        .setDescription('Guess the language game'),
        category: 'Fun',
    async execute(interaction) {
        const correctAnswer = languageSamples[Math.floor(Math.random() * languageSamples.length)];
        const selectedPattern = correctAnswer.patterns[Math.floor(Math.random() * correctAnswer.patterns.length)];
        
        let options = [correctAnswer];
        while (options.length < 4) {
            const randomLanguage = languageSamples[Math.floor(Math.random() * languageSamples.length)];
            if (!options.find(opt => opt.language === randomLanguage.language)) {
                options.push(randomLanguage);
            }
        }
        
        options = options.sort(() => Math.random() - 0.5);

        const buttons = options.map(option => {
            return new ButtonBuilder()
                .setCustomId(`guess_${option.language}`)
                .setLabel(option.language)
                .setEmoji(option.flag)
                .setStyle(ButtonStyle.Secondary);
        });

        const row = new ActionRowBuilder().addComponents(buttons);

        const embed = new EmbedBuilder()
            .setTitle('Guess the language')
            .setDescription('Guess the language of the sentence!')
            .addFields(
                { 
                    name: 'Sentence', 
                    value: `\`\`\`${selectedPattern.text}\`\`\``,
                    inline: false 
                },
                {
                    name: '⏱️ Time Remaining',
                    value: '60 seconds',
                    inline: true
                }
            )
            .setColor('#36393f')
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            });

        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            withResponse: true
        });

        const collector = response.createMessageComponentCollector({
            time: 60000
        });

        const startTime = Date.now();

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ 
                    content: '❌ This is not your game!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const selectedLanguage = i.customId.replace('guess_', '');
            const isCorrect = selectedLanguage === correctAnswer.language;
            const timeElapsed = Math.floor((Date.now() - startTime) / 1000);

            buttons.forEach(button => button.setDisabled(true));
            const disabledRow = new ActionRowBuilder().addComponents(buttons);

            const resultEmbed = new EmbedBuilder()
                .setColor(isCorrect ? '#43b581' : '#f04747')
                .setTitle(isCorrect ? '✅ Correct!' : '❌ Incorrect!')
                .addFields(
                    { 
                        name: 'The sentence', 
                        value: `\`\`\`${selectedPattern.text}\`\`\``,
                        inline: false 
                    },
                    {
                        name: 'Meaning',
                        value: `"${selectedPattern.meaning}"`,
                        inline: false
                    },
                    {
                        name: 'Language',
                        value: `${correctAnswer.flag} ${correctAnswer.language}`,
                        inline: true
                    },
                    {
                        name: 'Time taken',
                        value: `${timeElapsed} seconds`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            await i.update({
                embeds: [resultEmbed],
                components: [disabledRow]
            });

            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                buttons.forEach(button => button.setDisabled(true));
                const disabledRow = new ActionRowBuilder().addComponents(buttons);

                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#f04747')
                    .setTitle('⏰ Time\'s Up!')
                    .addFields(
                        { 
                            name: 'The sentence', 
                            value: `\`\`\`${selectedPattern.text}\`\`\``,
                            inline: false 
                        },
                        {
                            name: 'Meaning',
                            value: `"${selectedPattern.meaning}"`,
                            inline: false
                        },
                        {
                            name: 'Correct Answer',
                            value: `${correctAnswer.flag} ${correctAnswer.language}`,
                            inline: true
                        }
                    )
                    .setFooter({ 
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                    });

                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [disabledRow]
                });
            }
        });
    }
};