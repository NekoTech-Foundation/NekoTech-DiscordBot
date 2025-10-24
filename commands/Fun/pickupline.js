const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pickupline')
        .setDescription('Nhận một câu thả thính ngẫu nhiên'),
    category: 'Fun',
    async execute(interaction) {
        await interaction.deferReply();


        const getRandomColor = () => {
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        };

        try {
            const response = await fetch('https://api.popcat.xyz/pickuplines');
            if (!response.ok) {
                throw new Error('Không thể lấy câu thả thính, API có thể đang bị lỗi hoặc bận.');
            }
            const json = await response.json();
            const pickupline = json.pickupline;

            const embed = new EmbedBuilder()
                .setTitle(`💘 Câu thả thính`)
                .setDescription(pickupline)
                .setColor(getRandomColor())

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi lấy câu thả thính:', error);
            await interaction.editReply({
                content: 'Xin lỗi, tôi không thể lấy câu thả thính vào lúc này. Vui lòng thử lại sau.',
            });
        }
    },
};