const { StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const { seeds, getUserFarm, removeFromFarm } = require('./farmUtils');

module.exports.run = async (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (interaction.isStringSelectMenu() && interaction.customId === 'quick_sell_produce') {
            const produceName = interaction.values[0].replace(/-/g, ' ');
            const userId = interaction.user.id;

            const modal = new ModalBuilder()
                .setCustomId(`quick_sell_modal_${produceName.replace(/ /g, '-')}_${userId}`)
                .setTitle(`Bán Nhanh ${produceName}`);

            const quantityInput = new TextInputBuilder()
                .setCustomId('quantity')
                .setLabel('Nhập số lượng muốn bán (hoặc "all")')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(quantityInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('quick_sell_modal_')) {
            const parts = interaction.customId.split('_');
            const produceName = parts[3].replace(/-/g, ' ');
            const userId = parts[4];

            if (interaction.user.id !== userId) {
                return interaction.reply({ content: 'Bạn không thể dùng modal này.', ephemeral: true });
            }

            const quantityInput = interaction.fields.getTextInputValue('quantity');
            const userFarm = await getUserFarm(userId);
            const item = userFarm.items.find(i => i.name === produceName && i.type === 'produce');

            if (!item) {
                return interaction.reply({ content: `Bạn không có ${produceName} để bán.`, ephemeral: true });
            }

            let quantity;
            if (quantityInput.toLowerCase() === 'all') {
                quantity = item.quantity;
            } else {
                quantity = parseInt(quantityInput);
                if (isNaN(quantity) || quantity <= 0) {
                    return interaction.reply({ content: 'Số lượng không hợp lệ.', ephemeral: true });
                }
                if (quantity > item.quantity) {
                    return interaction.reply({ content: `Bạn chỉ có ${item.quantity} ${produceName}.`, ephemeral: true });
                }
            }

            const seed = Object.values(seeds).find(s => s.name === produceName);
            if (!seed) {
                return interaction.reply({ content: 'Không tìm thấy thông tin nông sản.', ephemeral: true });
            }

            const sellPrice = Math.floor(seed.price * 0.8);
            const totalGain = sellPrice * quantity;

            await removeFromFarm(userId, produceName, quantity, 'produce');

            let economyData = await EconomyUserData.findOne({ userId });
            if (!economyData) {
                economyData = await EconomyUserData.create({ userId });
            }
            economyData.balance += totalGain;
            await economyData.save();

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Bán Nhanh Thành Công')
                .setDescription(`Bạn đã bán thành công ${quantity} ${seed.emoji} ${produceName} với giá ${totalGain.toLocaleString()} 💰.`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }


        if (interaction.isButton() && interaction.customId === 'sell_all_harvested') {
            const userId = interaction.user.id;
            const userFarm = await getUserFarm(userId);
            const produceItems = userFarm.items.filter(item => item.type === 'produce');

            if (produceItems.length === 0) {
                return interaction.reply({ content: 'Bạn không có nông sản nào để bán.', ephemeral: true });
            }

            let totalGain = 0;
            let soldItems = [];

            for (const item of produceItems) {
                const seed = Object.values(seeds).find(s => s.name === item.name);
                if (seed) {
                    const sellPrice = Math.floor(seed.price * 0.8);
                    const gain = sellPrice * item.quantity;
                    totalGain += gain;
                    soldItems.push(`${item.quantity} ${seed.emoji} ${item.name}`);

                    // Remove item directly from array since we are iterating
                    // But better to use removeFromFarm or just clear the array after loop if we sell everything
                }
            }

            // Remove all produce items
            userFarm.items = userFarm.items.filter(item => item.type !== 'produce');
            await userFarm.save();

            let economyData = await EconomyUserData.findOne({ userId });
            if (!economyData) {
                economyData = await EconomyUserData.create({ userId });
            }
            economyData.balance += totalGain;
            await economyData.save();

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Bán Tất Cả Thành Công')
                .setDescription(`Bạn đã bán tất cả nông sản:\n${soldItems.join('\n')}\n\n💰 Tổng thu nhập: **${totalGain.toLocaleString()}** xu`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    });
};
