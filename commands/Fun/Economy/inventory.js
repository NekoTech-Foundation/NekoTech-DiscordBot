const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const { getConfig } = require('../../../utils/configLoader');
const config = getConfig();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Xem và quản lý kho đồ của bạn')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Xem kho đồ của bạn')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('use')
                .setDescription('Sử dụng một vật phẩm từ kho đồ của bạn')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Tên vật phẩm để sử dụng')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('equip')
                .setDescription('Trang bị một vật phẩm từ kho đồ của bạn')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Tên vật phẩm để trang bị')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),
    category: 'Economy',
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const user = await EconomyUserData.findOne({ userId: interaction.user.id });
        if (!user || !user.inventory) return;

        const choices = user.inventory.map(item => item.itemId);
        const filtered = choices.filter(choice => choice.toLowerCase().startsWith(focusedValue.toLowerCase()));
        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice })),
        );
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        let user = await EconomyUserData.findOne({ userId: interaction.user.id });

        if (!user) {
            user = await EconomyUserData.create({ userId: interaction.user.id });
        }

        if (subcommand === 'view') {
            if (!user.inventory || user.inventory.length === 0) {
                return interaction.reply({ content: 'Kho đồ của bạn trống.', ephemeral: true });
            }

            const inventoryEmbed = new EmbedBuilder()
                .setTitle('🎒 Kho đồ của bạn')
                .setColor('#0099ff');

            let description = '';
            user.inventory.forEach(item => {
                description += `**${item.itemId}** (x${item.quantity})\n`;
            });
            inventoryEmbed.setDescription(description);

            return interaction.reply({ embeds: [inventoryEmbed], ephemeral: true });
        } else if (subcommand === 'use') {
            const itemName = interaction.options.getString('item');
            const itemInInventory = user.inventory.find(i => i.itemId === itemName);

            if (!itemInInventory) {
                return interaction.reply({ content: 'Bạn không có vật phẩm này trong kho.', ephemeral: true });
            }

            // Find item details from config
            let itemDetails = null;
            for (const category in config.Store) {
                if (Array.isArray(config.Store[category])) {
                    const foundItem = config.Store[category].find(i => i.Name === itemName);
                    if (foundItem) {
                        itemDetails = foundItem;
                        break;
                    }
                }
            }

            if (!itemDetails || itemDetails.Type !== 'Booster') {
                return interaction.reply({ content: 'Vật phẩm này không phải là vật phẩm tăng cường.', ephemeral: true });
            }

            const now = Date.now();
            const duration = parseDuration(itemDetails.Duration || '0');

            user.boosters.push({
                type: itemDetails.Booster,
                endTime: now + duration,
                multiplier: parseFloat(itemDetails.Multiplier || '1')
            });

            itemInInventory.quantity -= 1;
            if (itemInInventory.quantity <= 0) {
                user.inventory = user.inventory.filter(i => i.itemId !== itemName);
            }

            await user.save();
            return interaction.reply({ content: `Bạn đã sử dụng ${itemName}!`, ephemeral: true });

        } else if (subcommand === 'equip') {
            const itemName = interaction.options.getString('item');
            const itemInInventory = user.inventory.find(i => i.itemId === itemName);

            if (!itemInInventory) {
                return interaction.reply({ content: 'Bạn không có vật phẩm này trong kho.', ephemeral: true });
            }

            let itemDetails = null;
            if (config.Store.Equipment) {
                 const foundItem = Object.values(config.Store.Equipment).find(i => i.Name === itemName);
                 if(foundItem) {
                    itemDetails = foundItem;
                 }
            }

            if (!itemDetails || itemDetails.Type !== 'FishingRod') {
                return interaction.reply({ content: 'Vật phẩm này không phải là cần câu.', ephemeral: true });
            }

            user.equipment.FishingRod = itemName;

            itemInInventory.quantity -= 1;
            if (itemInInventory.quantity <= 0) {
                user.inventory = user.inventory.filter(i => i.itemId !== itemName);
            }

            await user.save();
            return interaction.reply({ content: `Bạn đã trang bị ${itemName}!`, ephemeral: true });
        }
    }
};