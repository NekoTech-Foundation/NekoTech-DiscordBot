const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('advice')
        .setDescription('💡 Nhận một lời khuyên hữu ích'),
    category: 'Fun',
    async execute(interaction, client) {
        try {
            await interaction.deferReply();
            let response = await fetch('http://api.adviceslip.com/advice');
            let advice = await response.json();
            interaction.editReply({ content: advice.slip.advice });
        } catch (error) {
            console.error("Lỗi khi lấy lời khuyên: ", error);
            interaction.editReply({ content: 'Xin lỗi, tôi không thể lấy lời khuyên vào lúc này.' });
        }
    }
}
