const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomyUserData = require('../../models/EconomyUserData');
const { seeds, getUserFarm, removeFromFarm } = require('./farmUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Bán nông sản của bạn.')
        .addStringOption(option => {
            const choices = Object.keys(seeds).map(seed => ({ name: seeds[seed].name, value: seed }));
            return option.setName('produce').setDescription('Loại nông sản bạn muốn bán.').setRequired(true).addChoices(...choices);
        })
        .addIntegerOption(option => 
            option.setName('quantity')
                .setDescription('Số lượng bạn muốn bán.')
                .setRequired(true)),

    async execute(interaction, client) {
        const produceName = interaction.options.getString('produce');
        const quantity = interaction.options.getInteger('quantity');
        const userId = interaction.user.id;
        const seed = seeds[produceName];

        if (quantity <= 0) {
            return interaction.reply({ content: 'Số lượng bán phải là số dương.', ephemeral: true });
        }

        const hasProduce = await removeFromFarm(userId, seed.name, quantity);
        if (!hasProduce) {
            return interaction.reply({ content: `Bạn không có đủ ${seed.name} để bán.`, ephemeral: true });
        }

        const sellPrice = Math.floor(seed.price * 0.8);
        const totalGain = sellPrice * quantity;

        let economyData = await EconomyUserData.findOne({ userId });
        if (!economyData) {
            economyData = new EconomyUserData({ userId });
        }
        economyData.balance += totalGain;
        await economyData.save();

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Bán Nông Sản Thành Công')
            .setDescription(`Bạn đã bán thành công ${quantity} ${seed.emoji} ${seed.name} với giá ${totalGain.toLocaleString()} 💰.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
