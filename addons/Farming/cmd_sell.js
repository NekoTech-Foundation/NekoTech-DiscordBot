const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomyUserData = require('../../models/EconomyUserData');
const { seeds, getUserFarm, removeFromFarm } = require('./farmUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('💸 Bán nông sản kiếm lời')
        .addStringOption(option => {
            const choices = Object.keys(seeds).map(seed => ({ name: seeds[seed].name, value: seed }));
            return option.setName('produce').setDescription('🍎 Loại nông sản muốn bán').setRequired(true).addChoices(...choices);
        })
        .addStringOption(option =>
            option.setName('quantity')
                .setDescription('🔢 Số lượng muốn bán (hoặc "all")')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name === 'quantity') {
            const produceName = interaction.options.getString('produce');
            if (!produceName) return;

            const userId = interaction.user.id;
            const seed = seeds[produceName];
            const userFarm = await getUserFarm(userId);
            const item = userFarm.items.find(i => i.name === seed.name);

            const choices = [];
            if (item && item.quantity > 0) {
                choices.push({ name: `Tất cả (${item.quantity})`, value: 'all' });
                choices.push({ name: `${item.quantity}`, value: `${item.quantity}` });
            }

            await interaction.respond(choices);
        }
    },

    async execute(interaction, client) {
        const produceName = interaction.options.getString('produce');
        const quantityInput = interaction.options.getString('quantity');
        const userId = interaction.user.id;
        const seed = seeds[produceName];

        const userFarm = await getUserFarm(userId);
        const item = userFarm.items.find(i => i.name === seed.name);

        if (!item || item.quantity === 0) {
            return interaction.reply({ content: `Bạn không có ${seed.name} để bán.`, ephemeral: true });
        }

        let quantity;
        if (quantityInput.toLowerCase() === 'all') {
            quantity = item.quantity;
        } else {
            quantity = parseInt(quantityInput);
            if (isNaN(quantity) || quantity <= 0) {
                return interaction.reply({ content: 'Số lượng không hợp lệ. Vui lòng nhập một số dương hoặc "all".', ephemeral: true });
            }
        }

        if (quantity > item.quantity) {
            return interaction.reply({ content: `Bạn chỉ có ${item.quantity} ${seed.name} để bán.`, ephemeral: true });
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
