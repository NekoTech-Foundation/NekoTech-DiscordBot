const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const languageSamples = [
    {
        language: 'Japanese',
        flag: '🇯🇵',
        patterns: [
            { text: 'おはようございます', meaning: 'Good morning' },
            { text: '今日はとても良い天気ですね', meaning: 'The weather is very nice today' },
            { text: '私の趣味は写真撮影です', meaning: 'My hobby is photography' },
        ]
    },
    {
        language: 'Korean',
        flag: '🇰🇷',
        patterns: [
            { text: '안녕하세요', meaning: 'Hello' },
            { text: '오늘 날씨가 좋네요', meaning: 'The weather is nice today' },
            { text: '저는 음악 듣는 것을 좋아해요', meaning: 'I like listening to music' },
        ]
    },
    {
        language: 'Chinese',
        flag: '🇨🇳',
        patterns: [
            { text: '你好，很高兴认识你', meaning: 'Hello, nice to meet you' },
            { text: '我喜欢在公园散步', meaning: 'I like walking in the park' },
            { text: '这个周末你有什么计划？', meaning: 'What are your plans for this weekend?' },
        ]
    },
    {
        language: 'Vietnamese',
        flag: '🇻🇳',
        patterns: [
            { text: 'Chào buổi sáng', meaning: 'Good morning' },
            { text: 'Tôi rất thích ẩm thực Việt Nam', meaning: 'I really like Vietnamese cuisine' },
            { text: 'Bạn đang làm gì vậy?', meaning: 'What are you doing?' },
        ]
    },
    {
        language: 'Thai',
        flag: '🇹🇭',
        patterns: [
            { text: 'สวัสดีครับ/ค่ะ', meaning: 'Hello' },
            { text: 'วันนี้อากาศดีมาก', meaning: 'The weather is very nice today' },
            { text: 'คุณชอบอาหารไทยไหม', meaning: 'Do you like Thai food?' },
        ]
    },
    {
        language: 'Hindi',
        flag: '🇮🇳',
        patterns: [
            { text: 'नमस्ते, आप कैसे हैं?', meaning: 'Hello, how are you?' },
            { text: 'मुझे भारतीय खाना बहुत पसंद है', meaning: 'I really like Indian food' },
            { text: 'आज मौसम बहुत अच्छा है', meaning: 'The weather is very nice today' },
        ]
    },
    {
        language: 'Filipino',
        flag: '🇵🇭',
        patterns: [
            { text: 'Magandang umaga po', meaning: 'Good morning (polite)' },
            { text: 'Kumusta ka na?', meaning: 'How are you?' },
            { text: 'Salamat po sa lahat', meaning: 'Thank you for everything' },
        ]
    },
    {
        language: 'Indonesian',
        flag: '🇮🇩',
        patterns: [
            { text: 'Selamat pagi', meaning: 'Good morning' },
            { text: 'Apa kabar?', meaning: 'How are you?' },
            { text: 'Saya suka makanan Indonesia', meaning: 'I like Indonesian food' },
        ]
    },
    {
        language: 'Malay',
        flag: '🇲🇾',
        patterns: [
            { text: 'Selamat pagi', meaning: 'Good morning' },
            { text: 'Apa khabar?', meaning: 'How are you?' },
            { text: 'Terima kasih', meaning: 'Thank you' },
        ]
    },
    {
        language: 'Bengali',
        flag: '🇧🇩',
        patterns: [
            { text: 'নমস্কার, কেমন আছেন?', meaning: 'Hello, how are you?' },
            { text: 'আজ আবহাওয়া খুব ভালো', meaning: 'The weather is very nice today' },
            { text: 'আমি বাংলা শিখছি', meaning: 'I am learning Bengali' },
        ]
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guess')
        .setDescription('Trò chơi đoán ngôn ngữ'),
    category: 'Fun',
    async execute(interaction) {
        const correctAnswer = languageSamples[Math.floor(Math.random() * languageSamples.length)];
        const selectedPattern = correctAnswer.patterns[Math.floor(Math.random() * correctAnswer.patterns.length)];

        let options = [correctAnswer];
        while (options.length < 4) {
            const randomLanguage = languageSamples[Math.floor(Math.random() * languageSamples.length)];
            if (!options.some(opt => opt.language === randomLanguage.language)) {
                options.push(randomLanguage);
            }
        }

        options = options.sort(() => Math.random() - 0.5);

        const buttons = options.map(option =>
            new ButtonBuilder()
                .setCustomId(`guess_${option.language}`)
                .setLabel(option.language)
                .setEmoji(option.flag)
                .setStyle(ButtonStyle.Secondary)
        );

        const row = new ActionRowBuilder().addComponents(buttons);

        const embed = new EmbedBuilder()
            .setTitle('Đoán ngôn ngữ')
            .setDescription('Hãy đoán ngôn ngữ của câu sau!')
            .addFields(
                { name: 'Câu', value: '```' + selectedPattern.text + '```', inline: false },
                { name: '⏱️ Thời gian còn lại', value: '60 giây', inline: true }
            )
            .setColor('#36393f')
            .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true,
        });

        const collector = response.createMessageComponentCollector({
            time: 60000,
        });

        const startTime = Date.now();
        const interval = setInterval(() => {
            const timeRemaining = Math.floor((60000 - (Date.now() - startTime)) / 1000);
            if (timeRemaining > 0) {
                const updatedEmbed = new EmbedBuilder(embed.toJSON())
                    .spliceFields(1, 1, { name: '⏱️ Thời gian còn lại', value: `${timeRemaining} giây`, inline: true });
                interaction.editReply({ embeds: [updatedEmbed] });
            }
        }, 5000);

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: '❌ Đây không phải là trò chơi của bạn!',
                    ephemeral: true,
                });
            }
            clearInterval(interval);

            const selectedLanguage = i.customId.replace('guess_', '');
            const isCorrect = selectedLanguage === correctAnswer.language;
            const timeElapsed = Math.floor((Date.now() - startTime) / 1000);

            buttons.forEach(button => button.setDisabled(true));
            const disabledRow = new ActionRowBuilder().addComponents(buttons);

            const resultEmbed = new EmbedBuilder()
                .setColor(isCorrect ? '#43b581' : '#f04747')
                .setTitle(isCorrect ? '✅ Chính xác!' : '❌ Không chính xác!')
                .addFields(
                    { name: 'Câu', value: '```' + selectedPattern.text + '```', inline: false },
                    { name: 'Ý nghĩa', value: `"${selectedPattern.meaning}"`, inline: false },
                    { name: 'Ngôn ngữ', value: `${correctAnswer.flag} ${correctAnswer.language}`, inline: true },
                    { name: 'Thời gian thực hiện', value: `${timeElapsed} giây`, inline: true }
                )
                .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

            await i.update({
                embeds: [resultEmbed],
                components: [disabledRow],
            });
            collector.stop();
        });

        collector.on('end', (collected, reason) => {
            clearInterval(interval);
            if (reason === 'time') {
                buttons.forEach(button => button.setDisabled(true));
                const disabledRow = new ActionRowBuilder().addComponents(buttons);

                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#f04747')
                    .setTitle('⏰ Hết giờ!')
                    .addFields(
                        { name: 'Câu', value: '```' + selectedPattern.text + '```', inline: false },
                        { name: 'Ý nghĩa', value: `"${selectedPattern.meaning}"`, inline: false },
                        { name: 'Đáp án đúng', value: `${correctAnswer.flag} ${correctAnswer.language}`, inline: true }
                    )
                    .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

                interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [disabledRow],
                });
            }
        });
    },
};
