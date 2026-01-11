const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getConfig } = require('../../utils/configLoader');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Xem thông tin gói Whitelabel và Điều Khoản Dịch Vụ'),

    async execute(interaction) {
        const tosText = `
**1. Phạm Vi Dịch Vụ**
Dịch Vụ Premium cung cấp các tính năng nâng cao không có trong phiên bản miễn phí, bao gồm nhưng không giới hạn ở:
- Quyền truy cập vào các lệnh độc quyền và tính năng tùy chỉnh nâng cao.
- Giới hạn sử dụng (rate limits) được nới lỏng hoặc gỡ bỏ.
- Huy hiệu hồ sơ đặc biệt và quyền ưu tiên hỗ trợ kỹ thuật.
- Các tiện ích mở rộng khác được mô tả tại trang đăng ký dịch vụ.
- **TOÀN BỘ SOURCE CODE ĐƯỢC CẬP NHẬT IRT**, Bao gồm các bản vá lỗi / tính năng mới

**2. Quy Định Về Thanh Toán**
**2.1. Phương Thức Thanh Toán**
Bạn đồng ý thanh toán đầy đủ các khoản phí liên quan đến gói dịch vụ đã chọn. Chúng tôi chấp nhận thanh toán thông qua các cổng thanh toán uy tín được tích hợp (ví dụ: Stripe, PayPal, hoặc các ví điện tử nội địa). Mọi thông tin thanh toán của Bạn được xử lý bảo mật bởi đối tác thanh toán, NekoTech Foundations không lưu trữ thông tin thẻ tín dụng của Bạn.

**2.2. Nghĩa Vụ Thuế**
Các khoản phí được niêm yết có thể chưa bao gồm thuế giá trị gia tăng (VAT) hoặc các loại thuế khác theo quy định pháp luật sở tại, trừ khi có ghi chú khác. Bạn chịu trách nhiệm chi trả các khoản thuế phát sinh (nếu có).

**3. Chính Sách Đăng Ký và Gia Hạn**
**3.1. Chu Kỳ Đăng Ký**
Dịch Vụ Premium được cung cấp dưới dạng gói đăng ký định kỳ (ví dụ: hàng tháng, hàng năm). Chu kỳ thanh toán bắt đầu từ ngày Bạn thực hiện thanh toán thành công.

**3.2. Gia Hạn Tự Động**
Để đảm bảo Dịch Vụ không bị gián đoạn, gói đăng ký của Bạn sẽ được tự động gia hạn vào cuối mỗi chu kỳ với mức giá hiện hành, trừ khi Bạn thực hiện hủy bỏ ít nhất 24 giờ trước thời điểm gia hạn.

**4. Quy Định Đặc Biệt Cho Gói Source Premium**
Đối với gói dịch vụ "Source Premium" (bao gồm việc cung cấp quyền truy cập, tải xuống mã nguồn, hoặc tài nguyên hệ thống độc quyền), các quy định sau được áp dụng nghiêm ngặt do tính chất không thể thu hồi của sản phẩm kỹ thuật số:
- **Không Hoàn Tiền Tuyệt Đối**: Một khi quyền truy cập đã được cấp hoặc liên kết tải xuống mã nguồn đã được gửi đến Bạn, giao dịch được xem là hoàn tất. Chúng tôi từ chối mọi yêu cầu hoàn tiền đối với gói Source Premium dưới bất kỳ hình thức nào, kể cả khi Bạn chưa thực hiện tải xuống.
- **Cam Kết Bảo Mật**: Mã nguồn được cung cấp trong gói này là tài sản trí tuệ của NekoTech Foundations. Bạn không được phép chia sẻ, bán lại, công khai hoặc phân phối lại mã nguồn này cho bất kỳ bên thứ ba nào. Mọi hành vi vi phạm sẽ dẫn đến việc khóa tài khoản vĩnh viễn và xử lý theo pháp luật hiện hành về bản quyền.

**5. Thay Đổi Giá và Dịch Vụ**
**5.1. Điều Chỉnh Giá Cước**
NekoTech Foundations bảo lưu quyền điều chỉnh mức phí của Dịch Vụ Premium. Mọi thay đổi về giá sẽ được thông báo đến Bạn trước ít nhất 30 ngày. Việc Bạn tiếp tục sử dụng Dịch Vụ sau khi mức giá mới có hiệu lực được coi là sự chấp thuận của Bạn đối với mức giá đó.

**5.2. Thay Đổi Tính Năng**
Chúng tôi không ngừng cải tiến sản phẩm. Do đó, các tính năng trong gói Premium có thể được thêm mới, sửa đổi hoặc loại bỏ. Trong trường hợp có sự thay đổi trọng yếu làm giảm quyền lợi của Bạn, Chúng tôi sẽ có thông báo phù hợp.

**6. Chấm Dứt Do Vi Phạm**
Nếu Bạn vi phạm Điều Khoản Dịch Vụ chung hoặc Điều Khoản Premium này (bao gồm việc gian lận thanh toán hoặc lạm dụng tính năng), NekoTech Foundations có quyền đơn phương chấm dứt gói Premium của Bạn ngay lập tức mà không cần hoàn tiền, đồng thời có thể khóa quyền truy cập vĩnh viễn vào Dịch Vụ.
`;

        const embed = new EmbedBuilder()
            .setTitle('📜 Điều Khoản Dịch Vụ Premium (NekoTech Foundations)')
            .setDescription(tosText)
            .setColor('Gold')
            .setFooter({ text: 'Vui lòng đọc kỹ trước khi đăng ký.' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_tos_premium')
                    .setLabel('Tôi Đồng Ý & Yêu Cầu Mua')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

        const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });

        collector.on('collect', async i => {
            if (i.customId === 'accept_tos_premium') {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: '❌ Bạn không phải người thực hiện lệnh này.', ephemeral: true });
                }

                await i.deferUpdate();

                // Notify User
                await i.followUp({ content: '✅ Bạn đã chấp nhận điều khoản! Yêu cầu của bạn đã được gửi đến Admin. Vui lòng kiểm tra DM hoặc chờ Admin liên hệ.', ephemeral: true });

                // Notify Owner
                const config = getConfig();
                const ownerId = config.OwnerIDs[0]; // Notify first owner
                try {
                    const owner = await interaction.client.users.fetch(ownerId);
                    if (owner) {
                        const notifyEmbed = new EmbedBuilder()
                            .setTitle('📩 Yêu Cầu Whitelabel Mới')
                            .setColor('Blue')
                            .addFields(
                                { name: 'User', value: `${i.user.tag} (${i.user.id})` },
                                { name: 'Action', value: 'Đã chấp nhận TOS và yêu cầu mua Whitelabel' },
                                { name: 'Time', value: new Date().toLocaleString() }
                            )
                            .setThumbnail(i.user.displayAvatarURL());

                        await owner.send({ embeds: [notifyEmbed] });
                    }
                } catch (e) {
                    console.error('Failed to notify owner:', e);
                }

                // Disable button
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('accept_tos_premium')
                            .setLabel('Đã Gửi Yêu Cầu')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✅')
                            .setDisabled(true)
                    );

                await interaction.editReply({ components: [disabledRow] });
            }
        });
    }
};
