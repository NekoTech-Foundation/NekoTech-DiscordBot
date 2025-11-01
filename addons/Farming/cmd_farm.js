const { EmbedBuilder, SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const plantSchema = require('./schemas/plantSchema');
const { seeds, getUserFarm, addToFarm, removeFromFarm } = require('./farmUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('farm')
        .setDescription('Các lệnh liên quan đến nông trại.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('plant')
                .setDescription('Trồng một hạt giống.')
                .addStringOption(option => {
                    const choices = Object.keys(seeds).map(seed => ({ name: seeds[seed].name, value: seed }));
                    return option.setName('seed').setDescription('Loại hạt giống bạn muốn trồng.').setRequired(true).addChoices(...choices);
                })
                .addStringOption(option =>
                    option.setName('quantity')
                        .setDescription('Số lượng hạt giống bạn muốn trồng (mặc định là 1).')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('harvest')
                .setDescription('Thu hoạch một cây trồng.')
                .addStringOption(option => {
                    const choices = Object.keys(seeds).map(seed => ({ name: seeds[seed].name, value: seed }));
                    return option.setName('plant').setDescription('Loại cây bạn muốn thu hoạch.').setRequired(true).addChoices(...choices);
                }))
        .addSubcommand(subcommand =>
            subcommand
                .setName('field')
                .setDescription('Xem các cây trồng đã trồng của bạn.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('seeds')
                .setDescription('Xem kho hạt giống của bạn.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('Xem kho nông sản của bạn.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('fertilizers')
                .setDescription('Xem kho phân bón của bạn.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('phanbon')
                .setDescription('Sử dụng phân bón cho cây trồng.')
                .addStringOption(option => {
                    const choices = Object.keys(config.Store['Phân bón']).map(key => ({ name: config.Store['Phân bón'][key].Name, value: key }));
                    return option.setName('ten_phan_bon').setDescription('Loại phân bón bạn muốn sử dụng.').setRequired(true).addChoices(...choices);
                })
                .addStringOption(option => {
                    const choices = Object.keys(seeds).map(seed => ({ name: seeds[seed].name, value: seed }));
                    return option.setName('ten_cay').setDescription('Loại cây bạn muốn bón phân.').setRequired(false).addChoices(...choices);
                })),

    async execute(interaction, client) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (subcommand === 'plant') {
            const seedName = interaction.options.getString('seed');
            const quantityInput = interaction.options.getString('quantity') || '1';
            const seed = seeds[seedName];

            const userFarm = await getUserFarm(userId);
            const seedItem = userFarm.items.find(i => i.name === seed.name && i.type === 'seed');

            let quantity;
            if (quantityInput.toLowerCase() === 'all') {
                if (!seedItem || seedItem.quantity === 0) {
                    return interaction.editReply({ content: `Bạn không có hạt giống ${seed.name} để trồng.` });
                }
                quantity = seedItem.quantity;
            } else {
                quantity = parseInt(quantityInput);
                if (isNaN(quantity) || quantity <= 0) {
                    return interaction.editReply({ content: 'Số lượng không hợp lệ.' });
                }
            }

            if (!seedItem || seedItem.quantity < quantity) {
                return interaction.editReply({ content: `Bạn không có đủ hạt giống ${seed.name} để trồng.` });
            }

            const hasSeed = await removeFromFarm(userId, seed.name, quantity);
            if (!hasSeed) {
                return interaction.editReply({ content: `Bạn không có đủ hạt giống ${seed.name} để trồng.` });
            }

            const existingPlant = await plantSchema.findOne({ userId, plant: seedName });
            if (existingPlant) {
                existingPlant.quantity += quantity;
                existingPlant.plantedAt = Date.now();
                await existingPlant.save();
            } else {
                const newPlant = new plantSchema({ userId, plant: seedName, quantity });
                await newPlant.save();
            }

            await interaction.editReply({ content: `Bạn đã trồng thành công ${quantity} ${seed.emoji} ${seed.name}.` });
        } else if (subcommand === 'harvest') {
            const plantName = interaction.options.getString('plant');
            const plant = seeds[plantName];

            const planted = await plantSchema.findOne({ userId, plant: plantName });
            if (!planted) {
                return interaction.editReply({ content: `Bạn chưa trồng ${plant.name}.` });
            }

            const timeSincePlanted = Date.now() - planted.plantedAt.getTime();
            const timeRemaining = plant.growthTime - timeSincePlanted;
            if (timeRemaining > 1000) { // Check if more than 1 second remaining
                const hours = Math.floor(timeRemaining / 3600000);
                const minutes = Math.floor((timeRemaining % 3600000) / 60000);
                return interaction.editReply({ content: `${plant.name} của bạn chưa sẵn sàng để thu hoạch. Thời gian còn lại: ${hours} giờ ${minutes} phút.` });
            }

            await plantSchema.deleteOne({ userId, plant: plantName });
            let harvestedQuantity = (Math.floor(Math.random() * 3) + 2) * planted.quantity;
            if (planted.fertilizer && planted.fertilizer.effect === 'yield_increase') {
                if (planted.fertilizer.key === 'bumper_harvest_fertilizer') {
                    harvestedQuantity *= 1.5; // 50% increase
                } else if (planted.fertilizer.key === 'all_purpose_fertilizer') {
                    harvestedQuantity *= 1.25; // 25% increase
                }
            }
            if (planted.fertilizer && planted.fertilizer.qualityReduced) {
                harvestedQuantity *= 0.5; // 50% reduction for quality reduced
            }
            harvestedQuantity = Math.floor(harvestedQuantity);
            await addToFarm(userId, plant.name, harvestedQuantity, 'produce');

            await interaction.editReply({ content: `Bạn đã thu hoạch được ${harvestedQuantity} ${plant.emoji} ${plant.name}.` });
        } else if (subcommand === 'field') {
            const userPlants = await plantSchema.find({ userId });
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Nông Trại Của Bạn');

            if (userPlants.length === 0) {
                embed.setDescription('Bạn chưa trồng cây nào.');
            } else {
                let description = '';
                for (const p of userPlants) {
                    let plant = seeds[p.plant];
                    if (!plant) {
                        plant = Object.values(seeds).find(s => s.name === p.plant);
                    }
                    if (plant) {
                        const timeSincePlanted = Date.now() - p.plantedAt.getTime();
                        const timeRemaining = Math.max(0, plant.growthTime - timeSincePlanted);
                        const hours = Math.floor(timeRemaining / 3600000);
                        const minutes = Math.floor((timeRemaining % 3600000) / 60000);
                        const progress = Math.min(100, (timeSincePlanted / plant.growthTime) * 100);
                        description += `${plant.emoji} ${plant.name} (x${p.quantity}): ${progress.toFixed(2)}% - Còn lại: ${hours}h ${minutes}m\n`;
                    }
                }
                if (description === '') {
                    embed.setDescription('Bạn không có cây trồng nào.');
                } else {
                    embed.setDescription(description);
                }
            }

            await interaction.editReply({ embeds: [embed] });
        } else if (subcommand === 'seeds') {
            const userFarm = await getUserFarm(userId);
            const seedItems = userFarm.items.filter(item => Object.values(seeds).some(s => s.name === item.name && item.type === 'seed'));

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Kho Hạt Giống Của Bạn');

            if (seedItems.length === 0) {
                embed.setDescription('Bạn không có hạt giống nào.');
            } else {
                let description = '';
                for (const item of seedItems) {
                    const seed = Object.values(seeds).find(s => s.name === item.name);
                    if (seed) {
                        description += `${seed.emoji} ${item.name}: ${item.quantity}\n`;
                    }
                }
                embed.setDescription(description);
            }

            await interaction.editReply({ embeds: [embed] });
        } else if (subcommand === 'inventory') {
            const userFarm = await getUserFarm(userId);
            const produceItems = userFarm.items.filter(item => item.type === 'produce');

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Kho Nông Sản Của Bạn');

            if (produceItems.length === 0) {
                embed.setDescription('Bạn không có nông sản nào.');
                return interaction.editReply({ embeds: [embed] });
            } else {
                let description = '';
                for (const item of produceItems) {
                    const seed = Object.values(seeds).find(s => s.name === item.name);
                    if (seed) {
                        description += `${seed.emoji} ${item.name}: ${item.quantity}\n`;
                    }
                }
                embed.setDescription(description);
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('quick_sell_produce')
                .setPlaceholder('Chọn nông sản để bán nhanh')
                .addOptions(produceItems.map(item => ({
                    label: item.name,
                    value: item.name.replace(/ /g, '-'),
                })));

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({ embeds: [embed], components: [row] });
        } else if (subcommand === 'fertilizers') {
            const userFarm = await getUserFarm(userId);
            const fertilizerItems = userFarm.items.filter(item => item.type === 'Fertilizer');

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Kho Phân Bón Của Bạn');

            if (fertilizerItems.length === 0) {
                embed.setDescription('Bạn không có phân bón nào.');
            } else {
                let description = '';
                for (const item of fertilizerItems) {
                    description += `🌱 ${item.name}: ${item.quantity}\n`;
                }
                embed.setDescription(description);
            }

            await interaction.editReply({ embeds: [embed] });
        } else if (subcommand === 'phanbon') {
            const fertilizerKey = interaction.options.getString('ten_phan_bon');
            const plantName = interaction.options.getString('ten_cay');
            const fertilizer = config.Store['Phân bón'][fertilizerKey];

            const userFarm = await getUserFarm(userId);
            const fertilizerItem = userFarm.items.find(i => i.name === fertilizer.Name && i.type === 'Fertilizer');

            if (!fertilizerItem || fertilizerItem.quantity < 1) {
                return interaction.editReply({ content: `Bạn không có ${fertilizer.Name}.` });
            }

            const hasFertilizer = await removeFromFarm(userId, fertilizer.Name, 1);
            if (!hasFertilizer) {
                return interaction.editReply({ content: `Bạn không có ${fertilizer.Name}.` });
            }

            const plantsToFertilize = plantName ? await plantSchema.find({ userId, plant: plantName }) : await plantSchema.find({ userId });

            if (plantsToFertilize.length === 0) {
                return interaction.editReply({ content: 'Bạn không có cây trồng nào để bón phân.' });
            }

            for (const plant of plantsToFertilize) {
                switch (fertilizer.Key) {
                    case 'growth_fertilizer':
                        plant.plantedAt = new Date(plant.plantedAt.getTime() - (seeds[plant.plant].growthTime * 0.25));
                        break;
                    case 'super_speed_fertilizer':
                        plant.plantedAt = new Date(plant.plantedAt.getTime() - seeds[plant.plant].growthTime);
                        plant.fertilizer = { key: fertilizer.Key, effect: 'yield_reduce', qualityReduced: true };
                        break;
                    case 'bumper_harvest_fertilizer':
                        plant.fertilizer = { key: fertilizer.Key, effect: 'yield_increase' };
                        break;
                    case 'all_purpose_fertilizer':
                        plant.plantedAt = new Date(plant.plantedAt.getTime() - (seeds[plant.plant].growthTime * 0.5));
                        plant.fertilizer = { key: fertilizer.Key, effect: 'yield_increase' };
                        break;
                }
                await plant.save();
            }

            await interaction.editReply({ content: `Bạn đã sử dụng thành công ${fertilizer.Name} cho ${plantName ? seeds[plantName].name : 'tất cả các cây trồng'}.` });
        }
    }
};