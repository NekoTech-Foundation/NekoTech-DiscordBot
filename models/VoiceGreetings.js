const SQLiteModel = require('../utils/sqliteModel');

const defaultData = (query) => ({
    guildId: query.guildId,
    enabled: true,
    pingUser: true,
    welcomeMessages: JSON.stringify([
        "Chào mừng {user} đã tham gia voice chat!",
        "Hé lô {user}, quẩy lên nào!",
        "Á đù, {user} đã xuất hiện tại {channel}!",
        "Chào mừng {user} quay vào ô mất lượt... à nhầm, ô voice chat!",
        "{user} đã xuất hiện, mọi người trật tự!",
        "Helu {user}, hôm nay bạn thế nào?",
        "Ui là trời, {user} tới rồi kìa!",
        "Rồng bay phượng múa, {user} đã hiện hình!"
    ]),
    goodbyeMessages: JSON.stringify([
        "Tạm biệt {user}, hẹn gặp lại!",
        "{user} đã rời khỏi cuộc chơi.",
        "Bye bye {user}!",
        "{user} đã cao chạy xa bay.",
        "Tạm biệt {user}, nhớ mang quà về nhé.",
        "{user} đã bị bắt cóc khỏi server.",
        "Không tiễn {user} nhé!",
        "{user} đã đi tìm đường cứu nước."
    ])
});

module.exports = new SQLiteModel('voice_greetings', 'guildId', defaultData);
