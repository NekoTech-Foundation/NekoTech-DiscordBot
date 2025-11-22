const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fact')
        .setDescription('🧠 Xem một sự thật thú vị')
        .addSubcommand(subcommand =>
            subcommand
                .setName('cat')
                .setDescription('Nhận một sự thật ngẫu nhiên về mèo'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dog')
                .setDescription('Nhận một sự thật ngẫu nhiên về chó'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('general')
                .setDescription('Nhận một sự thật ngẫu nhiên chung'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('useless')
                .setDescription('Nhận một sự thật ngẫu nhiên vô dụng')),
    category: 'Fun',
    async execute(interaction, client) {
        try {
            await interaction.deferReply();

            let fact;
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'cat') {
                const response = await fetch('https://catfact.ninja/fact?max_length=140');
                const data = await response.json();
                fact = data.fact;
            } else if (subcommand === 'dog') {
                const response = await fetch('https://dog-api.kinduff.com/api/facts?number=1');
                const data = await response.json();
                fact = data.facts[0];
            } else if (subcommand === 'general') {
                const response = await fetch('https://api.popcat.xyz/fact');
                const data = await response.json();
                fact = data.fact;
            } else if (subcommand === 'useless') {
                const response = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random');
                const data = await response.json();
                fact = data.text;
            }

            interaction.editReply({ content: `**🎲 SỰ THẬT NGẪU NHIÊN**\n${fact}` });
        } catch (error) {
            console.error("Lỗi khi lấy sự thật: ", error);
            interaction.editReply({ content: 'Xin lỗi, tôi không thể lấy sự thật vào lúc này.' });
        }
    }
};
