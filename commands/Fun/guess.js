const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const languageSamples = [
    {
        language: 'Japanese',
        flag: '🇯🇵',
        patterns: [
            { text: 'おはようございます', meaning: 'Chào buổi sáng' },
            { text: '今日はとても良い天気ですね', meaning: 'Thời tiết hôm nay đẹp quá' },
            { text: '私の趣味は写真撮影です', meaning: 'Sở thích của tôi là chụp ảnh' },
            { text: 'この映画はとても面白いです', meaning: 'Bộ phim này rất thú vị' },
            { text: '日本語を勉強しています', meaning: 'Tôi đang học tiếng Nhật' },
        ]
    },
    {
        language: 'Korean',
        flag: '🇰🇷',
        patterns: [
            { text: '안녕하세요', meaning: 'Xin chào' },
            { text: '오늘 날씨가 좋네요', meaning: 'Thời tiết hôm nay đẹp' },
            { text: '저는 음악 듣는 것을 좋아해요', meaning: 'Tôi thích nghe nhạc' },
            { text: '이 음식은 맛있어요', meaning: 'Món ăn này ngon' },
            { text: '한국 드라마를 자주 봐요', meaning: 'Tôi thường xem phim truyền hình Hàn Quốc' },
        ]
    },
    {
        language: 'Chinese',
        flag: '🇨🇳',
        patterns: [
            { text: '你好，很高兴认识你', meaning: 'Xin chào, rất vui được gặp bạn' },
            { text: '我喜欢在公园散步', meaning: 'Tôi thích đi dạo trong công viên' },
            { text: '这个周末你有什么计划？', meaning: 'Bạn có kế hoạch gì cho cuối tuần này không?' },
            { text: '我想喝杯茶', meaning: 'Tôi muốn uống một tách trà' },
            { text: '中国文化很有意思', meaning: 'Văn hóa Trung Quốc rất thú vị' },
        ]
    },
    {
        language: 'Vietnamese',
        flag: '🇻🇳',
        patterns: [
            { text: 'Chào buổi sáng', meaning: 'Chào buổi sáng' },
            { text: 'Tôi rất thích ẩm thực Việt Nam', meaning: 'Tôi rất thích ẩm thực Việt Nam' },
            { text: 'Bạn đang làm gì vậy?', meaning: 'Bạn đang làm gì vậy?' },
            { text: 'Phở là một món ăn ngon của Việt Nam', meaning: 'Phở là một món ăn ngon của Việt Nam' },
            { text: 'Tôi yêu Việt Nam', meaning: 'Tôi yêu Việt Nam' },
        ]
    },
    {
        language: 'Thai',
        flag: '🇹🇭',
        patterns: [
            { text: 'สวัสดีครับ/ค่ะ', meaning: 'Xin chào' },
            { text: 'วันนี้อากาศดีมาก', meaning: 'Thời tiết hôm nay rất đẹp' },
            { text: 'คุณชอบอาหารไทยไหม', meaning: 'Bạn có thích đồ ăn Thái không?' },
            { text: 'ไปเที่ยวกันไหม', meaning: 'Đi chơi không?' },
            { text: 'ขอบคุณครับ/ค่ะ', meaning: 'Cảm ơn' },
        ]
    },
    {
        language: 'Hindi',
        flag: '🇮🇳',
        patterns: [
            { text: 'नमस्ते, आप कैसे हैं?', meaning: 'Xin chào, bạn khỏe không?' },
            { text: 'मुझे भारतीय खाना बहुत पसंद है', meaning: 'Tôi rất thích đồ ăn Ấn Độ' },
            { text: 'आज मौसम बहुत अच्छा है', meaning: 'Thời tiết hôm nay rất đẹp' },
            { text: 'आपका नाम क्या है?', meaning: 'Tên bạn là gì?' },
            { text: 'फिर मिलेंगे', meaning: 'Hẹn gặp lại' },
        ]
    },
    {
        language: 'Filipino',
        flag: '🇵🇭',
        patterns: [
            { text: 'Magandang umaga po', meaning: 'Chào buổi sáng (lịch sự)' },
            { text: 'Kumusta ka na?', meaning: 'Bạn khỏe không?' },
            { text: 'Salamat po sa lahat', meaning: 'Cảm ơn vì tất cả' },
            { text: 'Mahal kita', meaning: 'Tôi yêu bạn' },
            { text: 'Ingat ka', meaning: 'Bảo trọng nhé' },
        ]
    },
    {
        language: 'Indonesian',
        flag: '🇮🇩',
        patterns: [
            { text: 'Selamat pagi', meaning: 'Chào buổi sáng' },
            { text: 'Apa kabar?', meaning: 'Bạn khỏe không?' },
            { text: 'Saya suka makanan Indonesia', meaning: 'Tôi thích đồ ăn Indonesia' },
            { text: 'Terima kasih banyak', meaning: 'Cảm ơn rất nhiều' },
            { text: 'Sampai jumpa lagi', meaning: 'Hẹn gặp lại' },
        ]
    },
    {
        language: 'Malay',
        flag: '🇲🇾',
        patterns: [
            { text: 'Selamat pagi', meaning: 'Chào buổi sáng' },
            { text: 'Apa khabar?', meaning: 'Bạn khỏe không?' },
            { text: 'Terima kasih', meaning: 'Cảm ơn' },
            { text: 'Selamat tinggal', meaning: 'Tạm biệt' },
            { text: 'Saya cinta awak', meaning: 'Tôi yêu bạn' },
        ]
    },
    {
        language: 'Bengali',
        flag: '🇧🇩',
        patterns: [
            { text: 'নমস্কার, কেমন আছেন?', meaning: 'Xin chào, bạn khỏe không?' },
            { text: 'আজ আবহাওয়া খুব ভালো', meaning: 'Thời tiết hôm nay rất đẹp' },
            { text: 'আমি বাংলা শিখছি', meaning: 'Tôi đang học tiếng Bengal' },
            { text: 'আপনার সাথে দেখা করে ভালো লাগলো', meaning: 'Rất vui được gặp bạn' },
            { text: 'আবার দেখা হবে', meaning: 'Hẹn gặp lại' },
        ]
    },
    {
        language: 'Spanish',
        flag: '🇪🇸',
        patterns: [
            { text: 'Hola, ¿cómo estás?', meaning: 'Xin chào, bạn khỏe không?' },
            { text: 'Me gusta mucho la comida española', meaning: 'Tôi rất thích đồ ăn Tây Ban Nha' },
            { text: '¿Qué planes tienes para este fin de semana?', meaning: 'Bạn có kế hoạch gì cho cuối tuần này không?' },
            { text: '¿Donde esta el baño?', meaning: 'Nhà vệ sinh ở đâu?' },
            { text: 'Te quiero', meaning: 'Tôi yêu bạn' },
        ]
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guess')
        .setDescription('🔢 Trò chơi đoán số'),
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
