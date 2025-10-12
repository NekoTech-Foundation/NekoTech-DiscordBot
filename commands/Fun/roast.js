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

const { SlashCommandBuilder } = require('discord.js');
   
const roasts = [
    "Tôi sẽ đồng ý với bạn nhưng khi đó cả hai chúng ta đều sai.",
    "Bạn không ngốc; bạn chỉ không may mắn khi suy nghĩ thôi.",
    "Nếu tiếng cười là liều thuốc tốt nhất, thì khuôn mặt của bạn chắc đang chữa lành cho cả thế giới.",
    "Bạn giống như một đám mây. Khi bạn biến mất, đó là một ngày đẹp trời.",
    "Tôi sẽ giải thích cho bạn nhưng tôi để quên Từ điển Anh-Việt cho người thiểu năng ở nhà rồi.",
    "Bạn là lý do mà kho gen cần có nhân viên cứu hộ.",
    "Bạn mang lại cho mọi người rất nhiều niềm vui... khi bạn rời khỏi phòng.",
    "Một số người mang lại hạnh phúc bất cứ nơi nào họ đến; còn bạn thì mang lại hạnh phúc mỗi khi bạn đi.",
    "Bạn giống như một bản cập nhật phần mềm. Khi tôi thấy bạn, tôi nghĩ, 'Không phải bây giờ.'",
    "Nếu tôi có một đô la cho mỗi điều thông minh bạn nói, tôi sẽ mắc nợ.",
    "Bạn giống như một cái lò xo, không thực sự tốt cho nhiều thứ nhưng lại khiến tôi mỉm cười khi bị đẩy xuống cầu thang.",
    "Tôi sẽ cho bạn một cái nhìn khó chịu nhưng bạn đã có sẵn một cái rồi.",
    "Bạn là bằng chứng cho thấy quá trình tiến hóa CÓ THỂ đi ngược lại.",
    "Não không phải là tất cả. Thực tế, trong trường hợp của bạn, chúng chẳng là gì cả.",
    "Tôi thích những gì bạn đã làm với mái tóc của mình. Làm thế nào bạn có thể để nó mọc ra từ lỗ mũi như vậy?",
    "Bạn không phải là người ngu ngốc nhất hành tinh, nhưng bạn tốt hơn hết là hy vọng anh ta không chết.",
    "Cứ đảo mắt đi, có thể bạn sẽ tìm thấy một bộ não.",
    "Giấy khai sinh của bạn là một lá thư xin lỗi từ nhà máy bao cao su.",
    "Bạn vô dụng như chữ 'ueue' trong từ 'queue'.",
    "Gương không thể nói. May mắn cho bạn, chúng cũng không thể cười.",
    "Tôi sẽ nói bạn hài hước, nhưng ngoại hình không phải là tất cả.",
    "Bạn là lý do tôi thích động vật hơn con người.",
    "Nếu ngu dốt là hạnh phúc, bạn hẳn là người hạnh phúc nhất trên trái đất.",
    "Bạn giống như những buổi sáng thứ Hai, không ai thích bạn.",
    "Bạn có một khuôn mặt hoàn hảo cho đài phát thanh.",
    "Đó là khuôn mặt của bạn à? Hay cổ của bạn đang thổi bong bóng?",
    "Bạn phiền đến nỗi, ngay cả tính năng tự động sửa lỗi cũng lờ bạn đi.",
    "Tôi muốn nhìn mọi thứ từ quan điểm của bạn, nhưng dường như tôi không thể nhét đầu mình sâu vào mông đến thế.",
    "Bạn là phiên bản con người của một giải thưởng khuyến khích.",
    "Nếu bạn là một vật vô tri, bạn sẽ là một chiếc cúp khuyến khích.",
    "Bạn giống như một cây gậy phát sáng. Đôi khi tôi chỉ muốn bẻ gãy bạn cho đến khi ánh sáng bật lên.",
    "Nếu bạn ngớ ngẩn hơn nữa, bạn sẽ là một hướng dẫn về cách thở.",
    "Bạn giống như một bản cập nhật phần mềm giữa một công việc quan trọng: không cần thiết và không đúng lúc.",
    "Bạn là phiên bản người của một lỗi chính tả.",
    "Nếu có giải thưởng cho sự lười biếng, có lẽ tôi sẽ cử ai đó đến nhận thay bạn.",
    "Tài nấu ăn của bạn tệ đến nỗi, người vô gia cư cũng trả lại.",
    "Nếu bạn là một loại rau, bạn sẽ là một 'cải chửi'.",
    "Bạn giống như những miếng cuối cùng của một ổ bánh mì. Ai cũng chạm vào bạn, nhưng không ai muốn bạn."
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roast')
        .setDescription('Chọc ghẹo một người dùng bằng một câu đùa ngẫu nhiên')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Người dùng để chọc ghẹo')
                .setRequired(true)),
    category: 'Fun',
    async execute(interaction, client) {
        const target = interaction.options.getUser('target');

        const roast = roasts[Math.floor(Math.random() * roasts.length)];

        await interaction.reply(`<@${target.id}>, ${roast}`);
    }
};