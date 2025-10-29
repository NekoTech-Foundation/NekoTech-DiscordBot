const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
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
                }))
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
                .setDescription('Xem kho hạt giống của bạn.')),

    async execute(interaction, client) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (subcommand === 'plant') {
            const seedName = interaction.options.getString('seed');
            const seed = seeds[seedName];

            const hasSeed = await removeFromFarm(userId, seed.name, 1);
            if (!hasSeed) {
                return interaction.editReply({ content: `Bạn không có hạt giống ${seed.name} để trồng.` });
            }

            const existingPlant = await plantSchema.findOne({ userId, plant: seedName });
            if (existingPlant) {
                await addToFarm(userId, seed.name, 1, 'seed'); // Add the seed back
                return interaction.editReply({ content: `Bạn đã trồng ${seed.name} rồi.` });
            }

            const newPlant = new plantSchema({ userId, plant: seedName });
            await newPlant.save();

            await interaction.editReply({ content: `Bạn đã trồng thành công một ${seed.emoji} ${seed.name}.` });
        } else if (subcommand === 'harvest') {
            const plantName = interaction.options.getString('plant');
            const plant = seeds[plantName];

            const planted = await plantSchema.findOne({ userId, plant: plantName });
            if (!planted) {
                return interaction.editReply({ content: `Bạn chưa trồng ${plant.name}.` });
            }

            const timeSincePlanted = Date.now() - planted.plantedAt.getTime();
            if (timeSincePlanted < plant.growthTime) {
                const timeRemaining = plant.growthTime - timeSincePlanted;
                const hours = Math.floor(timeRemaining / 3600000);
                const minutes = Math.floor((timeRemaining % 3600000) / 60000);
                return interaction.editReply({ content: `${plant.name} của bạn chưa sẵn sàng để thu hoạch. Thời gian còn lại: ${hours} giờ ${minutes} phút.` });
            }

            await plantSchema.deleteOne({ userId, plant: plantName });
            const quantity = Math.floor(Math.random() * 3) + 2; // Harvest 2-4 produce
            await addToFarm(userId, plant.name, quantity, 'produce');

            await interaction.editReply({ content: `Bạn đã thu hoạch được ${quantity} ${plant.emoji} ${plant.name}.` });
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
                        description += `${plant.emoji} ${plant.name}: ${progress.toFixed(2)}% - Còn lại: ${hours}h ${minutes}m\n`;
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
        }
    }
};