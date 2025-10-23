const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
// XÓA BỎ: không cần js-yaml và fs nữa
const path = require('path');
const vnLocations = require('./vn_locations.js');

const weatherTranslations = {
    'Sunny': 'Nắng đẹp',
    'Clear': 'Trời quang',
    'Partly cloudy': 'Có mây',
    'Cloudy': 'Nhiều mây',
    'Overcast': 'U ám',
    'Mist': 'Sương mù',
    'Patchy rain possible': 'Có thể có mưa vài nơi',
    'Patchy light rain': 'Mưa nhỏ vài nơi',
    'Light rain': 'Mưa nhỏ',
    'Moderate rain at times': 'Đôi lúc có mưa vừa',
    'Moderate rain': 'Mưa vừa',
    'Heavy rain at times': 'Đôi lúc có mưa lớn',
    'Heavy rain': 'Mưa lớn',
    'Light rain shower': 'Mưa rào nhẹ',
    'Moderate or heavy rain shower': 'Mưa rào vừa hoặc nặng',
    'Torrential rain shower': 'Mưa như trút nước',
    'Patchy snow possible': 'Có thể có tuyết vài nơi',
    'Light snow': 'Tuyết nhẹ',
    'Moderate snow': 'Tuyết vừa',
    'Heavy snow': 'Tuyết rơi nhiều',
    'Thundery outbreaks possible': 'Có khả năng có dông',
    'Patchy light rain with thunder': 'Mưa dông vài nơi',
    'Moderate or heavy rain with thunder': 'Mưa dông vừa hoặc lớn',
    'Thunder': 'Dông',
    'Thunderstorm': 'Bão có sấm sét',
};

const weatherEmojis = {
    'Sunny': '☀️', 'Clear': '☀️', 'Partly cloudy': '⛅', 'Cloudy': '☁️',
    'Overcast': '☁️', 'Mist': '🌫️', 'Patchy rain possible': '🌦️', 'Light rain': '🌧️',
    'Moderate rain': '🌧️', 'Heavy rain': '🌧️', 'Thunder': '⛈️', 'Thunderstorm': '⛈️',
    'Light snow': '🌨️', 'Snow': '🌨️',
};

function resolveVietnameseLocation(locationInput) {
    const normalizedInput = locationInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const loc of vnLocations) {
        if (loc.code === locationInput) return loc.query;
        const normalizedName = loc.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normalizedAliases = loc.aliases.map(alias => alias.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        if (normalizedName === normalizedInput || normalizedAliases.includes(normalizedInput)) {
            return loc.query;
        }
    }
    return locationInput;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Kiểm tra thời tiết tại một địa điểm bất kỳ')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Tên thành phố, mã zip (VD: Hà Nội, 70000, London)')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // XÓA BỎ: Toàn bộ khối đọc file config.yml đã được loại bỏ
            const rawLocation = interaction.options.getString('location');
            const location = resolveVietnameseLocation(rawLocation);
            
            const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1&lang=vi`);
            
            if (!response.ok) {
                // SỬA ĐỔI: Sử dụng tin nhắn lỗi mặc định
                return interaction.editReply({ 
                    content: 'Không thể lấy dữ liệu thời tiết. Vui lòng kiểm tra lại địa danh.', 
                    ephemeral: true 
                });
            }

            const data = await response.json();
            const current = data.current_condition[0];
            const astronomy = data.weather[0].astronomy[0];

            const englishDesc = current.weatherDesc[0].value;
            const vietnameseDesc = weatherTranslations[englishDesc] || englishDesc;
            const weatherEmoji = weatherEmojis[englishDesc] || '🌡️';

            // SỬA ĐỔI: Sử dụng các giá trị mặc định thay vì đọc từ config
            const embed = new EmbedBuilder()
                .setColor('#0099ff') // Màu mặc định
                .setTitle(`🌍 Thời tiết tại ${data.nearest_area[0].areaName[0].value}, ${data.nearest_area[0].country[0].value}`);

            const fields = [
                { name: 'Nhiệt độ', value: `${current.temp_C}°C (${current.temp_F}°F)`, inline: true },
                { name: 'Cảm giác như', value: `${current.FeelsLikeC}°C (${current.FeelsLikeF}°F)`, inline: true },
                { name: `Thời tiết ${weatherEmoji}`, value: vietnameseDesc, inline: true },
                { name: 'Độ ẩm', value: `${current.humidity}%`, inline: true },
                { name: 'Gió', value: `${current.windspeedKmph} km/h`, inline: true },
                { name: 'Mặt trời', value: `Mọc: ${astronomy.sunrise}\nLặn: ${astronomy.sunset}`, inline: true }
            ];
            
            embed.addFields(fields);
            embed.setTimestamp();
            embed.setFooter({ text: 'Powered by wttr.in' });
            
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi lệnh thời tiết:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Đã có lỗi xảy ra...', ephemeral: true });
            } else {
                await interaction.editReply({ content: 'Đã có lỗi xảy ra...' });
            }
        }
    },
};