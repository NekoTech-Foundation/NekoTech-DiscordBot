const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const languageSamples = [
    {
        language: 'Tiếng Nhật',
        flag: '🇯🇵',
        patterns: [
            { text: 'おはようございます', meaning: 'Chào buổi sáng' },
            { text: '今日はとても良い天気ですね', meaning: 'Hôm nay thời tiết rất đẹp' },
            { text: '私の趣味は写真撮影です', meaning: 'Sở thích của tôi là nhiếp ảnh' },
            { text: '美味しい料理を食べましょう', meaning: 'Hãy cùng ăn món ngon nào' },
            { text: '日本の文化が大好きです', meaning: 'Tôi yêu văn hóa Nhật Bản' },
            { text: '電車が遅れています', meaning: 'Tàu bị trễ' },
            { text: '週末に映画を見に行きませんか', meaning: 'Cuối tuần này bạn có muốn đi xem phim không?' },
            { text: '申し訳ありませんが、分かりません', meaning: 'Xin lỗi, tôi không hiểu' },
            { text: '一緒に買い物に行きましょう', meaning: 'Hãy cùng đi mua sắm nào' },
            { text: 'お誕生日おめでとうございます', meaning: 'Chúc mừng sinh nhật' }
        ]
    },
    {
        language: 'Tiếng Hàn',
        flag: '🇰🇷',
        patterns: [
            { text: '안녕하세요', meaning: 'Xin chào' },
            { text: '오늘 날씨가 좋네요', meaning: 'Hôm nay thời tiết đẹp' },
            { text: '저는 음악 듣는 것을 좋아해요', meaning: 'Tôi thích nghe nhạc' },
            { text: '한국 음식이 정말 맛있어요', meaning: 'Đồ ăn Hàn Quốc rất ngon' },
            { text: '지금 몇 시예요?', meaning: 'Bây giờ là mấy giờ?' },
            { text: '주말 잘 보내세요', meaning: 'Cuối tuần vui vẻ' },
            { text: '이것 좀 도와주시겠어요?', meaning: 'Bạn có thể giúp tôi việc này được không?' },
            { text: '내일 같이 점심 먹을래요?', meaning: 'Ngày mai bạn có muốn ăn trưa cùng nhau không?' },
            { text: '영화 보러 갈까요?', meaning: 'Chúng ta đi xem phim nhé?' },
            { text: '생일 축하합니다', meaning: 'Chúc mừng sinh nhật' }
        ]
    },
    {
        language: 'Tiếng Trung',
        flag: '🇨🇳',
        patterns: [
            { text: '你好，很高兴认识你', meaning: 'Xin chào, rất vui được gặp bạn' },
            { text: '我喜欢在公园散步', meaning: 'Tôi thích đi dạo trong công viên' },
            { text: '这个周末你有什么计划？', meaning: 'Cuối tuần này bạn có kế hoạch gì không?' },
            { text: '中国菜真好吃', meaning: 'Đồ ăn Trung Quốc rất ngon' },
            { text: '我正在学习中文', meaning: 'Tôi đang học tiếng Trung' },
            { text: '请问现在几点了？', meaning: 'Bây giờ là mấy giờ?' },
            { text: '明天天气怎么样？', meaning: 'Thời tiết ngày mai thế nào?' },
            { text: '我们一起去购物吧', meaning: 'Chúng ta cùng đi mua sắm nhé' },
            { text: '祝你生日快乐', meaning: 'Chúc bạn sinh nhật vui vẻ' },
            { text: '这部电影很有意思', meaning: 'Bộ phim này rất thú vị' }
        ]
    },
    {
        language: 'Tiếng Việt',
        flag: '🇻🇳',
        patterns: [
            { text: 'Chào buổi sáng', meaning: 'Chào buổi sáng' },
            { text: 'Tôi rất thích ẩm thực Việt Nam', meaning: 'Tôi rất thích ẩm thực Việt Nam' },
            { text: 'Bạn đang làm gì vậy?', meaning: 'Bạn đang làm gì vậy?' },
            { text: 'Hôm nay thời tiết đẹp quá', meaning: 'Hôm nay thời tiết đẹp quá' },
            { text: 'Tôi muốn đi du lịch', meaning: 'Tôi muốn đi du lịch' },
            { text: 'Chúc mừng sinh nhật', meaning: 'Chúc mừng sinh nhật' },
            { text: 'Bạn có khỏe không?', meaning: 'Bạn có khỏe không?' },
            { text: 'Cảm ơn rất nhiều', meaning: 'Cảm ơn rất nhiều' },
            { text: 'Hẹn gặp lại bạn sau', meaning: 'Hẹn gặp lại bạn sau' },
            { text: 'Tôi đang học tiếng Việt', meaning: 'Tôi đang học tiếng Việt' }
        ]
    },
    {
        language: 'Tiếng Thái',
        flag: '🇹🇭',
        patterns: [
            { text: 'สวัสดีครับ/ค่ะ', meaning: 'Xin chào' },
            { text: 'วันนี้อากาศดีมาก', meaning: 'Hôm nay thời tiết rất đẹp' },
            { text: 'คุณชอบอาหารไทยไหม', meaning: 'Bạn có thích đồ ăn Thái không?' },
            { text: 'ผมกำลังเรียนภาษาไทย', meaning: 'Tôi đang học tiếng Thái' },
            { text: 'ขอบคุณครับ/ค่ะ', meaning: 'Cảm ơn' },
            { text: 'สุขสันต์วันเกิด', meaning: 'Chúc mừng sinh nhật' },
            { text: 'คุณสบายดีไหม', meaning: 'Bạn có khỏe không?' },
            { text: 'ไปกินข้าวกันไหม', meaning: 'Chúng ta đi ăn nhé?' },
            { text: 'ยินดีที่ได้รู้จัก', meaning: 'Rất vui được gặp bạn' },
            { text: 'แล้วเจอกันใหม่', meaning: 'Hẹn gặp lại' }
        ]
    },
    {
        language: 'Tiếng Hindi',
        flag: '🇮🇳',
        patterns: [
            { text: 'नमस्ते, आप कैसे हैं?', meaning: 'Xin chào, bạn có khỏe không?' },
            { text: 'मुझे भारतीय खाना बहुत पसंद है', meaning: 'Tôi rất thích đồ ăn Ấn Độ' },
            { text: 'आज मौसम बहुत अच्छा है', meaning: 'Hôm nay thời tiết rất đẹp' },
            { text: 'मैं हिंदी सीख रहा हूं', meaning: 'Tôi đang học tiếng Hindi' },
            { text: 'क्या आप मेरी मदद कर सकते हैं?', meaning: 'Bạn có thể giúp tôi được không?' },
            { text: 'जन्मदिन की शुभकामनाएं', meaning: 'Chúc mừng sinh nhật' },
            { text: 'मुझे यह फिल्म पसंद है', meaning: 'Tôi thích bộ phim này' },
            { text: 'आप कहां जा रहे हैं?', meaning: 'Bạn đang đi đâu vậy?' },
            { text: 'मैं थोड़ा थका हुआ हूं', meaning: 'Tôi hơi mệt' },
            { text: 'फिर मिलेंगे', meaning: 'Hẹn gặp lại' }
        ]
    },
    {
        language: 'Tiếng Filipino',
        flag: '🇵🇭',
        patterns: [
            { text: 'Magandang umaga po', meaning: 'Chào buổi sáng (lịch sự)' },
            { text: 'Kumusta ka na?', meaning: 'Bạn có khỏe không?' },
            { text: 'Salamat po sa lahat', meaning: 'Cảm ơn vì tất cả' },
            { text: 'Masarap ang pagkain', meaning: 'Đồ ăn ngon quá' },
            { text: 'Mahal kita', meaning: 'Tôi yêu bạn' },
            { text: 'Ingat ka sa pag-uwi', meaning: 'Về nhà cẩn thận nhé' },
            { text: 'Nasaan ka na?', meaning: 'Bây giờ bạn đang ở đâu?' },
            { text: 'Maligayang kaarawan', meaning: 'Chúc mừng sinh nhật' },
            { text: 'Ang ganda ng panahon', meaning: 'Thời tiết đẹp quá' },
            { text: 'Hanggang sa muli', meaning: 'Hẹn lần sau' }
        ]
    },
    {
        language: 'Tiếng Indonesia',
        flag: '🇮🇩',
        patterns: [
            { text: 'Selamat pagi', meaning: 'Chào buổi sáng' },
            { text: 'Apa kabar?', meaning: 'Bạn có khỏe không?' },
            { text: 'Saya suka makanan Indonesia', meaning: 'Tôi thích đồ ăn Indonesia' },
            { text: 'Terima kasih banyak', meaning: 'Cảm ơn rất nhiều' },
            { text: 'Cuaca hari ini bagus', meaning: 'Hôm nay thời tiết đẹp' },
            { text: 'Selamat ulang tahun', meaning: 'Chúc mừng sinh nhật' },
            { text: 'Sampai jumpa lagi', meaning: 'Hẹn gặp lại' },
            { text: 'Saya sedang belajar bahasa Indonesia', meaning: 'Tôi đang học tiếng Indonesia' },
            { text: 'Mau pergi kemana?', meaning: 'Bạn đang đi đâu vậy?' },
            { text: 'Senang bertemu dengan anda', meaning: 'Rất vui được gặp bạn' }
        ]
    },
    {
        language: 'Tiếng Mã Lai',
        flag: '🇲🇾',
        patterns: [
            { text: 'Selamat pagi', meaning: 'Chào buổi sáng' },
            { text: 'Apa khabar?', meaning: 'Bạn có khỏe không?' },
            { text: 'Terima kasih', meaning: 'Cảm ơn' },
            { text: 'Saya suka makanan Malaysia', meaning: 'Tôi thích đồ ăn Malaysia' },
            { text: 'Cuaca hari ini sangat baik', meaning: 'Thời tiết hôm nay rất tốt' },
            { text: 'Selamat hari jadi', meaning: 'Chúc mừng sinh nhật' },
            { text: 'Jumpa lagi', meaning: 'Hẹn gặp lại' },
            { text: 'Saya belajar bahasa Melayu', meaning: 'Tôi đang học tiếng Mã Lai' },
            { text: 'Anda hendak pergi ke mana?', meaning: 'Bạn đang đi đâu vậy?' },
            { text: 'Selamat malam', meaning: 'Chúc ngủ ngon' }
        ]
    },
    {
        language: 'Tiếng Bengali',
        flag: '🇧🇩',
        patterns: [
            { text: 'নমস্কার, কেমন আছেন?', meaning: 'Xin chào, bạn có khỏe không?' },
            { text: 'আজ আবহাওয়া খুব ভালো', meaning: 'Hôm nay thời tiết rất đẹp' },
            { text: 'আমি বাংলা শিখছি', meaning: 'Tôi đang học tiếng Bengali' },
            { text: 'আপনার সাথে দেখা হয়ে ভালো লাগলো', meaning: 'Rất vui được gặp bạn' },
            { text: 'শুভ জন্মদিন', meaning: 'Chúc mừng sinh nhật' },
            { text: 'ধন্যবাদ', meaning: 'Cảm ơn' },
            { text: 'আবার দেখা হবে', meaning: 'Hẹn gặp lại' },
            { text: 'আপনি কোথায় যাচ্ছেন?', meaning: 'Bạn đang đi đâu vậy?' },
            { text: 'খাবারটা খুব সুস্বাদু', meaning: 'Đồ ăn rất ngon' },
            { text: 'আমি একটু ক্লান্ত', meaning: 'Tôi hơi mệt' }
        ]
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guess')
        .setDescription('Trò chơi đoán ngôn ngữ'),
    category: 'Giải trí',
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
            .setTitle('Đoán ngôn ngữ')
            .setDescription('Đoán ngôn ngữ của câu sau!')
            .addFields(
                { 
                    name: 'Câu', 
                    value: `\`\`\`${selectedPattern.text}\`\`\``,
                    inline: false 
                },
                {
                    name: '⏱️ Thời gian còn lại',
                    value: '60 giây',
                    inline: true
                }
            )
            .setColor('#36393f')
            .setFooter({ 
                text: `Yêu cầu bởi ${interaction.user.tag}`,
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
                    content: '❌ Đây không phải trò chơi của bạn!', 
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
                .setTitle(isCorrect ? '✅ Chính xác!' : '❌ Sai rồi!')
                .addFields(
                    { 
                        name: 'Câu', 
                        value: `\`\`\`${selectedPattern.text}\`\`\``,
                        inline: false 
                    },
                    {
                        name: 'Ý nghĩa',
                        value: `"${selectedPattern.meaning}"`,
                        inline: false
                    },
                    {
                        name: 'Ngôn ngữ',
                        value: `${correctAnswer.flag} ${correctAnswer.language}`,
                        inline: true
                    },
                    {
                        name: 'Thời gian trả lời',
                        value: `${timeElapsed} giây`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Yêu cầu bởi ${interaction.user.tag}`,
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
                    .setTitle('⏰ Hết giờ!')
                    .addFields(
                        { 
                            name: 'Câu', 
                            value: `\`\`\`${selectedPattern.text}\`\`\``,
                            inline: false 
                        },
                        {
                            name: 'Ý nghĩa',
                            value: `"${selectedPattern.meaning}"`,
                            inline: false
                        },
                        {
                            name: 'Đáp án đúng',
                            value: `${correctAnswer.flag} ${correctAnswer.language}`,
                            inline: true
                        }
                    )
                    .setFooter({ 
                        text: `Yêu cầu bởi ${interaction.user.tag}`,
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