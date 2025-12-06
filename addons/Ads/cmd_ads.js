const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ads')
        .setDescription('Quảng bá các dự án của NekoTech')
        .addStringOption(option =>
            option.setName('project')
                .setDescription('Chọn dự án muốn quảng bá')
                .setRequired(true)
                .addChoices(
                    { name: 'NekoComics', value: 'nekocomics' },
                    { name: 'NekoAI', value: 'nekoai' },
                    { name: 'NekoTech Foundation', value: 'nekotech' },
                )),
    async execute(interaction) {
        const project = interaction.options.getString('project');
        let embed;

        const githubButton = new ButtonBuilder()
            .setLabel('Github NekoTech Foundation')
            .setURL('https://github.com/NekoTech-Foundation')
            .setStyle(ButtonStyle.Link);

        const row = new ActionRowBuilder().addComponents(githubButton);

        if (project === 'nekocomics') {
            embed = new EmbedBuilder()
                .setTitle('NekoComics - Truyện tranh miễn phí, luôn cập nhật.')
                .setColor('#FF9900')
                .setDescription('Xin chào cộng đồng yêu manga/manhwa! 👋\n\nChúng tôi rất vui mừng giới thiệu NekoComics (nekocomics.xyz) - nền tảng web đọc truyện online hoàn toàn miễn phí, nơi bạn có thể khám phá hàng ngàn bộ truyện hấp dẫn từ các nhóm dịch uy tín.')
                .addFields(
                    { name: 'NekoComics là gì?', value: 'Dựa trên CuuTruyen, NekoComics mang đến trải nghiệm đọc truyện mượt mà, giao diện thân thiện và nhiều tính năng tiện ích giúp bạn tận hưởng thế giới truyện tranh một cách trọn vẹn nhất.' },
                    { name: '🌟 Nekocomics có gì?', value: '**Gồm các Tính Năng Vượt Trội:**\n- **Overall Score:** Bộ đánh giá nhóm dịch dựa trên số sao và lượt đánh giá từ độc giả.\n- **Lưu Truyện & Đọc Offline:** Lỡ đâu web sập? Không thành vấn đề. NekoComics hỗ trợ lưu truyện đọc offline ngay trên trình duyệt.\n- **Hệ Thống Team Dịch:** Các nhóm dịch đều có trang Profile riêng, thống kê lượt xem, Customize dễ dàng, quản lý truyện dễ dàng qua Dashboard chuyên nghiệp.\n- **Theo Dõi & Lịch Sử:** Tự động lưu lịch sử đọc, thông báo chapter mới của truyện đang theo dõi.\n- **Thông báo ngay lập tức:** Không bao giờ bỏ lỡ chap mới của bộ truyện bạn theo dõi.' },
                    { name: 'Cộng Đồng & Tương Tác', value: '- Hệ thống bình luận, đánh giá truyện.\n- Bảng xếp hạng Top Truyện/Top Team theo Tuần/Tháng/Năm.' },
                    { name: 'Trải nghiệm ngay', value: '🔗 Link trải nghiệm: [nekocomics.xyz](https://nekocomics.xyz)\n\nHãy ghé thăm và trải nghiệm thử nhé! Mọi đóng góp của các bạn đều là động lực để NekoComics phát triển hơn nữa.\nCảm ơn các bạn đã ủng hộ và chúc các bạn có những giây phút đọc truyện thật vui vẻ tại NekoComics! 📚❤' }
                )
                .setFooter({ text: 'NekoTech Foundation, Heiznerd️ With ❤️' });
        } else if (project === 'nekoai') {
            embed = new EmbedBuilder()
                .setTitle('NekoAI')
                .setColor('#00FFFF')
                .setDescription('Đã đến lúc tạm biệt những khung chat AI khô khan và giọng nói vô hồn. NekoAI tái định nghĩa tương tác với trí tuệ nhân tạo bằng cách mang đến một trợ lý ảo 2D sinh động, thân thiện và trực quan, hiển thị ngay trên màn hình thiết bị của bạn.\n\nKhông chỉ là một Chatbot thông thường, NekoAI được trang bị công nghệ AI tiên tiến để duy trì ngữ cảnh, học hỏi từ mọi cuộc trò chuyện, và xử lý các tác vụ phức tạp như quản lý lịch trình, sự kiện và giám sát quy trình một cách chuyên nghiệp.\n\nNhờ công nghệ WebGPU/WebGL đột phá, NekoAI vận hành mượt mà ngay trên trình duyệt web mà không cần cài đặt, sẵn sàng tích hợp đa kênh (Facebook, Discord,...) để đảm bảo sự nhất quán.\n\nNekoAI không chỉ là công cụ, mà là đại sứ thương hiệu 2D giúp doanh nghiệp tăng tần suất tương tác, mức độ nhận diện và sự hài lòng của khách hàng, đồng thời là một người bạn đồng hành số hóa lý tưởng cho thế hệ GenZ. Hãy để NekoAI trở thành bước tiến vượt bậc trong lĩnh vực chuyển đổi số của bạn!')
                .setFooter({ text: 'NekoTech Foundation' });
        } else if (project === 'nekotech') {
            embed = new EmbedBuilder()
                .setTitle('NEKOTECH FOUNDATION – Đơn Giản Hóa Công Nghệ, Từ chính bạn')
                .setColor('#2C2F33')
                .setDescription('Chúng tôi là Hệ sinh thái công nghệ NekoTech Foundation – nơi hội tụ của những ý tưởng đột phá và khát vọng kiến tạo tương lai số. NekoTech Foundation đang dấn thân vào lĩnh vực Công nghiệp và Chế tạo sản phẩm, tập trung vào việc áp dụng Trí tuệ Nhân tạo để giải quyết các thách thức trong thời đại chuyển đổi số.\n\nVới mũi nhọn là NekoAI, giải pháp Trợ lý ảo 2D kết hợp AI, chúng tôi không chỉ thay thế Chatbot truyền thống mà còn mang đến một cộng sự số hóa trực quan, thân thiện, có khả năng học hỏi và xử lý các tác vụ phức tạp, từ quản lý lịch trình đến giám sát quy trình. Kết hợp với dự án tiềm năng khác là NekoGarage, NekoTech Foundation đang khẳng định vị thế tiên phong trong hành trình khởi nghiệp, hướng tới mục tiêu tạo ra những sản phẩm công nghệ có ảnh hưởng tích cực đến kinh tế và cộng đồng.\n\n**NekoTech Foundation – Nơi Ý tưởng Khởi nghiệp Bay cao và Công nghệ trở nên Sinh động hơn bao giờ hết.**')
                .setFooter({ text: 'NekoTech Foundation' });
        }

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
