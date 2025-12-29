const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const { seeds, addToFarm } = require('./farmUtils');
const { getConfig, getLang } = require('../../../utils/configLoader');

module.exports.run = async (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isModalSubmit()) return;
        if (!interaction.customId.startsWith('seed_buy_')) return;

        const parts = interaction.customId.split('_');
        const itemName = parts[2].replace(/-/g, ' ');
        const expectedUserId = parts[3];

        if (interaction.user.id !== expectedUserId) {
            return interaction.reply({
                content: '❌ Bạn không thể sử dụng modal này!',
                ephemeral: true
            });
        }

        const quantity = parseInt(interaction.fields.getTextInputValue('seed_quantity'));

        if (isNaN(quantity) || quantity <= 0) {
            return interaction.reply({
                content: '❌ Số lượng phải là một số dương.',
                ephemeral: true
            });
        }

        const config = getConfig();
        const lang = getLang();
        const items = Object.values(config.Store['Hạt Giống']);
        const item = items.find(i => i.Name === itemName);

        if (!item) {
            return interaction.reply({
                content: 'Vật phẩm không hợp lệ.',
                ephemeral: true
            });
        }

        let user = await EconomyUserData.findOne({ userId: interaction.user.id });
        if (!user) {
            user = await EconomyUserData.create({ userId: interaction.user.id, balance: 0 });
        }

        const totalCost = item.Price * quantity;

        if (user.balance < totalCost) {
            return interaction.reply({
                content: lang.Economy?.Messages?.noMoney || 'Bạn không có đủ tiền.',
                ephemeral: true
            });
        }

        user.balance -= totalCost;
        await user.save();

        await addToFarm(interaction.user.id, item.Name, quantity, 'seed');

        await interaction.reply({
            content: `Bạn đã mua thành công ${quantity} ${item.Name}.`,
            ephemeral: true
        });
    });
};
