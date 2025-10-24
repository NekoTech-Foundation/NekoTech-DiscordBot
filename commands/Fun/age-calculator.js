const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configLoader.js');

const config = getConfig();

// Random data arrays
const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const zodiacSigns = [
    'Bạch Dương', 'Kim Ngưu', 'Song Tử', 'Cự Giải', 
    'Sư Tử', 'Xử Nữ', 'Thiên Bình', 'Bọ Cạp', 
    'Nhân Mã', 'Ma Kết', 'Bảo Bình', 'Song Ngư'
];
const superpowers = [
    'Bay', 'Tàng hình', 'Đọc suy nghĩ', 'Dịch chuyển tức thời',
    'Siêu tốc độ', 'Siêu sức mạnh', 'Kiểm soát thời gian', 'Biến hình',
    'Kiểm soát lửa', 'Kiểm soát nước', 'Kiểm soát sấm sét', 'Chữa lành'
];
const foods = [
    'Phở', 'Bánh mì', 'Bún chả', 'Cơm tấm', 'Gỏi cuốn',
    'Bánh xèo', 'Hủ tiếu', 'Cao lầu', 'Mì Quảng', 'Bún bò Huế',
    'Pizza', 'Sushi', 'Hamburger', 'Pasta', 'Ramen'
];
const animals = [
    'Chó', 'Mèo', 'Thỏ', 'Cáo', 'Gấu trúc',
    'Sư tử', 'Hổ', 'Voi', 'Cá heo', 'Chim cánh cụt',
    'Rồng', 'Phượng hoàng', 'Kỳ lân'
];
const hobbies = [
    'Đọc sách', 'Chơi game', 'Nghe nhạc', 'Xem phim', 'Vẽ tranh',
    'Chơi thể thao', 'Nấu ăn', 'Du lịch', 'Nhiếp ảnh', 'Viết lách',
    'Nhảy múa', 'Hát karaoke', 'Chơi nhạc cụ', 'Làm vườn', 'Code'
];

// Helper function to get random item from array
function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Helper function to generate random date
function getRandomDate(year) {
    const month = Math.floor(Math.random() * 12) + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('age-calculator')
        .setDescription('Tạo hồ sơ vui vẻ cho người dùng dựa trên tuổi!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng để tạo hồ sơ')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('age')
                .setDescription('Tuổi của người dùng')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(120)),
    category: 'Fun',
    async execute(interaction, client) {
        const user = interaction.options.getUser('user');
        const age = interaction.options.getInteger('age');
        
        // Calculate birth year
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - age;
        
        // Generate random attributes
        const weight = Math.floor(Math.random() * 60) + 40; // 40-100 kg
        const footSize = Math.floor(Math.random() * 15) + 20; // 20-35 cm
        const bloodType = getRandomItem(bloodTypes);
        const zodiac = getRandomItem(zodiacSigns);
        const superpower = getRandomItem(superpowers);
        const height = Math.floor(Math.random() * 60) + 140; // 140-200 cm
        const food = getRandomItem(foods);
        const birthDate = getRandomDate(birthYear);
        const animal = getRandomItem(animals);
        const hobby = getRandomItem(hobbies);
        
        // Create embed
        const embed = new EmbedBuilder()
            .setTitle(`📊 Hồ sơ của ${user.username}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setDescription([
                `🎂 **Ngày sinh của bạn là:** ${birthDate}`,
                `🎈 **Tuổi của bạn là:** ${age}`,
                `📏 **Chiều cao của bạn là:** ${height} cm`,
                `⚖️ **Cân nặng của bạn là:** ${weight} kg`,
                `👟 **Kích thước chân của bạn là:** ${footSize} cm`,
                `🩸 **Nhóm máu của bạn là:** ${bloodType}`,
                `♈ **Cung hoàng đạo của bạn là:** ${zodiac}`,
                `⚡ **Siêu năng lực ưa thích của bạn là:** ${superpower}`,
                `🍜 **Món ăn yêu thích của bạn là:** ${food}`,
                `🐾 **Động vật yêu thích của bạn là:** ${animal}`,
                `🎨 **Sở thích yêu thích của bạn là:** ${hobby}`
            ].join('\n'))
            .setColor(config.EmbedColors)
            .setFooter({ text: 'Đây là thông tin ngẫu nhiên và chỉ để giải trí!' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};