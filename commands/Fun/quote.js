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

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription(`Lấy một câu trích dẫn nổi tiếng ngẫu nhiên`),
    category: 'Fun',
    async execute(interaction) {
        const quotes = [
            "Vinh quang lớn nhất trong cuộc sống không nằm ở việc không bao giờ gục ngã, mà ở việc đứng dậy mỗi khi chúng ta vấp ngã. - {Nelson Mandela}",
            "Cách để bắt đầu là ngừng nói và bắt tay vào làm. - {Walt Disney}",
            "Cuộc sống là những gì xảy ra khi bạn đang bận rộn với những kế hoạch khác. - {John Lennon}",
            "Tương lai thuộc về những ai tin vào vẻ đẹp của ước mơ của mình. - {Eleanor Roosevelt}",
            "Chính trong những khoảnh khắc đen tối nhất, chúng ta phải tập trung để nhìn thấy ánh sáng. - {Aristotle}",
            "Ai hạnh phúc cũng sẽ làm người khác hạnh phúc. - {Anne Frank}",
            "Đừng đi theo lối mòn, hãy đi vào nơi không có lối và để lại dấu chân. - {Ralph Waldo Emerson}",
            "Hãy lan tỏa tình yêu thương đến mọi nơi bạn đi. Đừng để ai đến với bạn mà không ra đi hạnh phúc hơn. - {Mẹ Teresa}",
            "Nói cho tôi, tôi sẽ quên. Dạy tôi, tôi sẽ nhớ. Cho tôi tham gia, tôi sẽ học. - {Benjamin Franklin}",
            "Những điều tốt đẹp và đẹp đẽ nhất trên thế giới không thể nhìn thấy hay chạm vào được — chúng phải được cảm nhận bằng trái tim. - {Helen Keller}",
            "Thà bị ghét vì con người thật của bạn còn hơn được yêu vì những gì bạn không phải. - {André Gide}",
            "Tôi đã học được rằng mọi người sẽ quên những gì bạn nói, quên những gì bạn làm, nhưng họ sẽ không bao giờ quên cách bạn khiến họ cảm thấy. - {Maya Angelou}",
            "Dù bạn nghĩ bạn có thể hay không thể, bạn đều đúng. - {Henry Ford}",
            "Sự hoàn hảo là không thể đạt được, nhưng nếu chúng ta theo đuổi sự hoàn hảo, chúng ta có thể đạt được sự xuất sắc. - {Vince Lombardi}",
            "Cuộc sống là 10% những gì xảy ra với chúng ta và 90% cách chúng ta phản ứng với nó. - {Charles R. Swindoll}",
            "Để xử lý bản thân, hãy dùng cái đầu; để xử lý người khác, hãy dùng trái tim. - {Eleanor Roosevelt}",
            "Quá nhiều người trong chúng ta không sống với ước mơ của mình vì chúng ta đang sống trong nỗi sợ hãi. - {Les Brown}",
            "Hãy làm những gì bạn có thể, với những gì bạn có, ở nơi bạn đang ở. - {Theodore Roosevelt}",
            "Nếu bạn nhìn vào những gì bạn có trong đời, bạn sẽ luôn có nhiều hơn. Nếu bạn nhìn vào những gì bạn không có, bạn sẽ không bao giờ có đủ. - {Oprah Winfrey}",
            "Không ai ngoài chúng ta có thể giải phóng tâm trí của chính mình. - {Bob Marley}",
            "Một mình tôi không thể thay đổi thế giới, nhưng tôi có thể ném một viên sỏi xuống nước để tạo ra nhiều gợn sóng. - {Mẹ Teresa}",
            "Ta nghĩ gì, ta thành nấy. - {Đức Phật}",
            "Điều khó khăn nhất là quyết định hành động, phần còn lại chỉ đơn thuần là sự kiên trì. - {Amelia Earhart}",
            "Mọi thứ bạn từng mong muốn đều nằm ở phía bên kia của nỗi sợ hãi. - {George Addair}",
            "Những gì bạn nhận được khi đạt được mục tiêu không quan trọng bằng con người bạn trở thành khi đạt được chúng. - {Zig Ziglar}",
            "Hãy tin rằng bạn có thể và bạn đã đi được nửa chặng đường. - {Theodore Roosevelt}",
            "Khi bạn đi đến cuối sợi dây, hãy thắt một nút và bám lấy nó. - {Franklin D. Roosevelt}",
            "Không có gì là vĩnh cửu ngoại trừ sự thay đổi. - {Heraclitus}",
            "Bạn không thể bắt tay với một nắm đấm siết chặt. - {Indira Gandhi}",
            "Hãy hy sinh ngày hôm nay của chúng ta để con cái chúng ta có một ngày mai tốt đẹp hơn. - {A. P. J. Abdul Kalam}",
            "Chính sự đơn giản luôn tạo ra điều kỳ diệu. - {Amelia Barr}",
            "Hành trình duy nhất là hành trình bên trong. - {Rainer Maria Rilke}",
            "Sự phán đoán tốt đến từ kinh nghiệm, và phần lớn kinh nghiệm đó đến từ sự phán đoán tồi. - {Will Rogers}",
            "Cuộc sống hoặc là một cuộc phiêu lưu táo bạo, hoặc không là gì cả. - {Helen Keller}",
            "Giới hạn duy nhất cho việc hiện thực hóa ngày mai của chúng ta chính là những nghi ngờ của ngày hôm nay. - {Franklin D. Roosevelt}",
            "Hạnh phúc không phải là thứ có sẵn. Nó đến từ chính hành động của bạn. - {Đạt Lai Lạt Ma}",
            "Nếu bạn muốn sống một cuộc đời hạnh phúc, hãy gắn nó với một mục tiêu, chứ không phải với con người hay sự vật. - {Albert Einstein}",
            "Đừng bao giờ để nỗi sợ bị loại khiến bạn không dám chơi cuộc chơi. - {Babe Ruth}",
            "Tiền bạc và thành công không làm thay đổi con người; chúng chỉ khuếch đại những gì đã có sẵn. - {Will Smith}",
            "Thời gian của bạn có hạn, đừng lãng phí nó để sống cuộc đời của người khác. - {Steve Jobs}",
            "Không phải bạn sống bao lâu, mà là bạn sống tốt như thế nào mới là điều quan trọng. - {Seneca}",
            "Nếu cuộc sống có thể đoán trước được, nó sẽ không còn là cuộc sống, và sẽ không có hương vị. - {Eleanor Roosevelt}",
            "Toàn bộ bí quyết của một cuộc sống thành công là tìm ra định mệnh của mình là gì, và sau đó thực hiện nó. - {Henry Ford}",
            "Để viết về cuộc sống, trước tiên bạn phải sống nó. - {Ernest Hemingway}",
            "Bài học lớn trong đời, cưng à, là đừng bao giờ sợ hãi bất cứ ai hay bất cứ điều gì. - {Frank Sinatra}",
            "Hãy hát như không có ai nghe, yêu như chưa từng bị tổn thương, nhảy múa như không có ai nhìn, và sống như thể đó là thiên đường trên Trái Đất. - {Mark Twain}",
            "Tôi nghĩ sự tò mò về cuộc sống ở mọi khía cạnh của nó vẫn là bí quyết của những người sáng tạo vĩ đại. - {Leo Burnett}",
            "Cuộc sống không phải là một vấn đề cần giải quyết, mà là một thực tế cần được trải nghiệm. - {Søren Kierkegaard}",
            "Một cuộc đời không được xem xét thì không đáng sống. - {Socrates}",
            "Hãy biến vết thương của bạn thành sự khôn ngoan. - {Oprah Winfrey}",
            "Theo tôi thấy, nếu bạn muốn có cầu vồng, bạn phải chịu đựng những cơn mưa. - {Dolly Parton}",
            "Hãy làm tất cả những điều tốt đẹp bạn có thể, cho tất cả mọi người bạn có thể, bằng mọi cách bạn có thể, miễn là bạn có thể. - {Hillary Clinton}",
            "Đừng chấp nhận những gì cuộc sống mang lại cho bạn; hãy làm cho cuộc sống tốt hơn và xây dựng một cái gì đó. - {Ashton Kutcher}",
            "Mọi thứ tiêu cực – áp lực, thử thách – đều là cơ hội để tôi vươn lên. - {Kobe Bryant}",
            "Tôi thích sự chỉ trích. Nó làm bạn mạnh mẽ hơn. - {LeBron James}",
            "Bạn sẽ không bao giờ thực sự học được nhiều điều từ việc nghe chính mình nói. - {George Clooney}",
            "Cuộc sống áp đặt lên bạn những điều bạn không thể kiểm soát, nhưng bạn vẫn có lựa chọn về cách bạn sẽ sống qua nó. - {Celine Dion}",
            "Cuộc sống thực sự đơn giản, nhưng con người lại cứ khăng khăng làm cho nó phức tạp. - {Khổng Tử}",
            "Cuộc sống là một chuỗi các bài học phải được sống để được hiểu. - {Ralph Waldo Emerson}",
            "Mẹ tôi luôn nói, cuộc sống giống như một hộp sôcôla. Bạn không bao giờ biết mình sẽ nhận được gì. - {Forrest Gump}",
            "Hãy để ý suy nghĩ của bạn, chúng sẽ trở thành lời nói. Hãy để ý lời nói của bạn, chúng sẽ trở thành hành động. Hãy để ý hành động của bạn, chúng sẽ trở thành thói quen. Hãy để ý thói quen của bạn, chúng sẽ trở thành tính cách. Hãy để ý tính cách của bạn, nó sẽ trở thành số phận của bạn. - {Lão Tử}",
            "Niềm vui lớn nhất của cuộc đời là tình yêu. - {Euripides}",
            "Cuộc sống là do chúng ta tạo ra, đã luôn như vậy và sẽ luôn như vậy. - {Grandma Moses}",
            "Bi kịch của cuộc đời là chúng ta già đi quá sớm và khôn ngoan quá muộn. - {Benjamin Franklin}",
            "Cuộc sống là tạo ra ảnh hưởng, không phải tạo ra thu nhập. - {Kevin Kruse}",
            "Tôi đã thất bại hết lần này đến lần khác trong đời và đó là lý do tại sao tôi thành công. - {Michael Jordan}",
            "Mỗi lần đánh hụt đều đưa tôi đến gần hơn với cú home run tiếp theo. - {Babe Ruth}",
            "Cuộc sống là một giấc mơ đối với người khôn ngoan, một trò chơi đối với kẻ ngốc, một vở hài kịch đối với người giàu, một bi kịch đối với người nghèo. - {Sholom Aleichem}",
            "Khi chúng ta làm hết sức mình, chúng ta không bao giờ biết phép màu nào được tạo ra trong cuộc đời mình hay cuộc đời người khác. - {Helen Keller}",
            "Phản ứng lành mạnh nhất với cuộc sống là niềm vui. - {Deepak Chopra}",
            "Cuộc sống giống như đi xe đạp. Để giữ thăng bằng, bạn phải tiếp tục di chuyển. - {Albert Einstein}",
            "Cuộc sống là một đóa hoa mà tình yêu là mật ngọt. - {Victor Hugo}",
            "Hãy luôn mỉm cười, vì cuộc sống là một điều tuyệt đẹp và có rất nhiều điều để mỉm cười. - {Marilyn Monroe}",
            "Sức khỏe là món quà lớn nhất, sự hài lòng là của cải lớn nhất, lòng trung thành là mối quan hệ tốt nhất. - {Đức Phật}"
        ]

        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        // Dấu phân cách trong các câu trích dẫn tiếng Việt là " - ", giống như bản gốc.
        const parts = randomQuote.split(' - ');

        const quoteText = parts[0];
        const author = parts[1].replace('{', '').replace('}', '');

        await interaction.reply(`\`\`\`ansi\n"${quoteText}" - \x1b[2;34m[${author}]\x1b[0m\n\`\`\``);
    }
}