const { EmbedBuilder, SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const plantSchema = require('./schemas/plantSchema');
const { seeds, getUserFarm, addToFarm, removeFromFarm } = require('./farmUtils');
const { events, getRandomMutation } = require('./farmEvents');
const { getGlobalWeather } = require('./farmWeather');
const EconomyUserData = require('../../models/EconomyUserData');

// Helper function to format effects
function formatEffect(effect) {
    if (!effect) return 'Không có';
    let parts = [];
    if (effect.growthSpeed) parts.push(`Tốc độ lớn: x${effect.growthSpeed}`);
    if (effect.yield) parts.push(`Sản lượng: x${effect.yield}`);
    if (effect.mutationChance) parts.push(`Tỉ lệ đột biến: x${effect.mutationChance}`);
    if (effect.price) parts.push(`Giá bán: x${effect.price}`);
    return parts.join(', ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('farm')
        .setDescription('🌾 Quản lý nông trại của bạn')
        .addSubcommand(subcommand =>
            subcommand
                .setName('plant')
                .setDescription('🌱 Trồng hạt giống')
                .addStringOption(option => {
                    const choices = Object.keys(seeds).map(seed => ({ name: seeds[seed].name, value: seed }));
                    return option.setName('seed').setDescription('🌰 Loại hạt giống bạn muốn trồng').setRequired(true).addChoices(...choices);
                })
                .addStringOption(option =>
                    option.setName('quantity')
                        .setDescription('🔢 Số lượng hạt giống (mặc định: 1)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('harvest')
                .setDescription('🚜 Thu hoạch cây trồng')
                .addStringOption(option => {
                    const choices = Object.keys(seeds).map(seed => ({ name: seeds[seed].name, value: seed }));
                    choices.push({ name: 'Tất cả', value: 'all' });
                    return option.setName('plant').setDescription('🌿 Loại cây bạn muốn thu hoạch').setRequired(true).addChoices(...choices);
                }))
        .addSubcommand(subcommand =>
            subcommand
                .setName('field')
                .setDescription('👀 Xem cánh đồng của bạn'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('event')
                .setDescription('🌤️ Xem sự kiện thời tiết hiện tại'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('seeds')
                .setDescription('🎒 Xem kho hạt giống'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('📦 Xem kho nông sản & phân bón'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('phanbon')
                .setDescription('✨ Sử dụng phân bón cho cây')
                .addStringOption(option => {
                    const choices = Object.keys(config.Store['Phân bón']).map(key => ({ name: config.Store['Phân bón'][key].Name, value: key }));
                    return option.setName('ten_phan_bon').setDescription('🧪 Loại phân bón muốn dùng').setRequired(true).addChoices(...choices);
                })
                .addStringOption(option => {
                    const choices = Object.keys(seeds).map(seed => ({ name: seeds[seed].name, value: seed }));
                    return option.setName('ten_cay').setDescription('🌿 Loại cây muốn bón (để trống để bón tất cả)').setRequired(false).addChoices(...choices);
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

            // Get Global Weather
            const globalWeather = await getGlobalWeather();
            const currentWeather = globalWeather.currentWeather;

            // Chance to inherit mutation from weather
            const mutation = getRandomMutation(currentWeather);

            if (existingPlant) {
                existingPlant.quantity += quantity;
                existingPlant.plantedAt = Date.now();
                if (!existingPlant.mutation && mutation) {
                    existingPlant.mutation = mutation;
                }
                await existingPlant.save();
            } else {
                const newPlant = new plantSchema({
                    userId,
                    plant: seedName,
                    quantity,
                    mutation: mutation
                });
                await newPlant.save();
            }

            let reply = `Bạn đã trồng thành công ${quantity} ${seed.emoji} ${seed.name}.`;
            if (mutation) {
                reply += `\n✨ **May mắn!** Cây của bạn đã bị đột biến: ${mutation.emoji} **${mutation.name}** do ảnh hưởng của thời tiết ${currentWeather.emoji} ${currentWeather.name}!`;
            }
            await interaction.editReply({ content: reply });

        } else if (subcommand === 'harvest') {
            const plantName = interaction.options.getString('plant');

            let plantsToHarvest = [];
            if (plantName === 'all') {
                const allPlants = await plantSchema.find({ userId });
                for (const planted of allPlants) {
                    const plant = seeds[planted.plant];
                    const timeSincePlanted = Date.now() - planted.plantedAt.getTime();
                    const timeRemaining = plant.growthTime - timeSincePlanted;
                    if (timeRemaining <= 1000) {
                        plantsToHarvest.push({ planted, plant });
                    }
                }
                if (plantsToHarvest.length === 0) {
                    return interaction.editReply({ content: 'Bạn không có cây trồng nào sẵn sàng để thu hoạch.' });
                }
            } else {
                const plant = seeds[plantName];
                const planted = await plantSchema.findOne({ userId, plant: plantName });
                if (!planted) {
                    return interaction.editReply({ content: `Bạn chưa trồng ${plant.name}.` });
                }
                const timeSincePlanted = Date.now() - planted.plantedAt.getTime();
                const timeRemaining = plant.growthTime - timeSincePlanted;
                if (timeRemaining > 1000) {
                    const hours = Math.floor(timeRemaining / 3600000);
                    const minutes = Math.floor((timeRemaining % 3600000) / 60000);
                    return interaction.editReply({ content: `${plant.name} của bạn chưa sẵn sàng để thu hoạch. Thời gian còn lại: ${hours} giờ ${minutes} phút.` });
                }
                plantsToHarvest.push({ planted, plant });
            }

            let totalHarvested = {};
            let totalBonusMoney = 0;
            let mutationDetails = [];
            let harvestedItemsForSale = [];

            for (const { planted, plant } of plantsToHarvest) {
                await plantSchema.deleteOne({ _id: planted._id });
                let harvestedQuantity = (Math.floor(Math.random() * 3) + 2) * planted.quantity;

                // Apply Fertilizer Effects
                if (planted.fertilizer && planted.fertilizer.effect === 'yield_increase') {
                    if (planted.fertilizer.key === 'bumper_harvest_fertilizer') {
                        harvestedQuantity *= 1.5;
                    } else if (planted.fertilizer.key === 'all_purpose_fertilizer') {
                        harvestedQuantity *= 1.25;
                    }
                }
                if (planted.fertilizer && planted.fertilizer.qualityReduced) {
                    harvestedQuantity *= 0.5;
                }

                // Apply Global Weather Yield Effects
                const globalWeather = await getGlobalWeather();
                const currentWeather = globalWeather.currentWeather;
                if (currentWeather && currentWeather.effect && currentWeather.effect.yield) {
                    harvestedQuantity *= currentWeather.effect.yield;
                }

                // Apply Mutation Effects
                if (planted.mutation) {
                    if (planted.mutation.effect.yield) {
                        harvestedQuantity *= planted.mutation.effect.yield;
                    }
                    if (planted.mutation.effect.price) {
                        const basePrice = plant.price || 100;
                        const bonus = Math.floor(basePrice * planted.quantity * (planted.mutation.effect.price - 1));
                        totalBonusMoney += bonus;
                    }
                    mutationDetails.push(`${planted.mutation.emoji} ${planted.mutation.name} (${plant.name})`);
                }

                harvestedQuantity = Math.floor(harvestedQuantity);
                if (harvestedQuantity < 1) harvestedQuantity = 1;

                await addToFarm(userId, plant.name, harvestedQuantity, 'produce');

                if (!totalHarvested[plant.name]) {
                    totalHarvested[plant.name] = { quantity: 0, emoji: plant.emoji };
                }
                totalHarvested[plant.name].quantity += harvestedQuantity;

                // Track for selling
                harvestedItemsForSale.push({ name: plant.name, quantity: harvestedQuantity });
            }

            let replyContent = 'Bạn đã thu hoạch được:\n';
            for (const [name, data] of Object.entries(totalHarvested)) {
                replyContent += `- ${data.quantity} ${data.emoji} ${name}\n`;
            }

            if (totalBonusMoney > 0) {
                let economyData = await EconomyUserData.findOne({ userId });
                if (!economyData) economyData = new EconomyUserData({ userId });
                economyData.balance += totalBonusMoney;
                await economyData.save();
                replyContent += `\n✨ Cây đột biến: **${mutationDetails.join(', ')}** đã mang lại cho bạn thêm **${totalBonusMoney.toLocaleString()}** xu!`;
            } else if (mutationDetails.length > 0) {
                replyContent += `\n✨ Cây đột biến: **${mutationDetails.join(', ')}**`;
            }

            const sellAllButton = new ButtonBuilder()
                .setCustomId('sell_all_harvested')
                .setLabel('Bán Tất Cả')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💰');

            const row = new ActionRowBuilder().addComponents(sellAllButton);

            await interaction.editReply({ content: replyContent, components: [row] });

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

                        description += `${plant.emoji} ${plant.name} (x${p.quantity}): ${progress.toFixed(2)}% - Còn lại: ${hours}h ${minutes}m`;

                        if (p.mutation) {
                            description += ` | ${p.mutation.emoji} ${p.mutation.name}`;
                        }
                        description += '\n';
                    }
                }

                const globalWeather = await getGlobalWeather();
                const currentWeather = globalWeather.currentWeather;
                const endTime = Math.floor(globalWeather.weatherEndTime / 1000);

                if (description === '') {
                    description = 'Bạn không có cây trồng nào.';
                }

                embed.setDescription(`🌤️ **Thời tiết hiện tại**: ${currentWeather.emoji} **${currentWeather.name}** (Kết thúc: <t:${endTime}:R>)\n${currentWeather.description}\n\n` + description);
            }

            await interaction.editReply({ embeds: [embed] });

        } else if (subcommand === 'event') {
            const globalWeather = await getGlobalWeather();
            const currentWeather = globalWeather.currentWeather;
            const endTime = Math.floor(globalWeather.weatherEndTime / 1000);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🌤️ Sự Kiện Thời Tiết Nông Trại')
                .setDescription(`**Hiện tại:** ${currentWeather.emoji} **${currentWeather.name}**\n\n${currentWeather.description}`)
                .addFields(
                    { name: '⏳ Kết thúc', value: `<t:${endTime}:R>`, inline: true },
                    { name: '✨ Hiệu ứng', value: formatEffect(currentWeather.effect), inline: true }
                )
                .setFooter({ text: 'Thời tiết ảnh hưởng đến tốc độ lớn và tỉ lệ đột biến khi trồng cây.' });

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
            const fertilizerItems = userFarm.items.filter(item => item.type === 'Fertilizer');

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Kho Nông Sản & Phân Bón');

            if (produceItems.length === 0 && fertilizerItems.length === 0) {
                embed.setDescription('Bạn không có nông sản hay phân bón nào.');
                return interaction.editReply({ embeds: [embed] });
            } else {
                let description = '**Nông Sản:**\n';
                if (produceItems.length > 0) {
                    for (const item of produceItems) {
                        const seed = Object.values(seeds).find(s => s.name === item.name);
                        if (seed) {
                            description += `${seed.emoji} ${item.name}: ${item.quantity}\n`;
                        }
                    }
                } else {
                    description += 'Không có.\n';
                }

                description += '\n**Phân Bón:**\n';
                if (fertilizerItems.length > 0) {
                    for (const item of fertilizerItems) {
                        description += `🌱 ${item.name}: ${item.quantity}\n`;
                    }
                } else {
                    description += 'Không có.\n';
                }

                embed.setDescription(description);
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('quick_sell_produce')
                .setPlaceholder('Chọn nông sản để bán nhanh')
                .addOptions(produceItems.length > 0 ? produceItems.map(item => ({
                    label: item.name,
                    value: item.name.replace(/ /g, '-'),
                })) : [{ label: 'Không có nông sản', value: 'none' }]);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            if (produceItems.length === 0) row.components[0].setDisabled(true);

            await interaction.editReply({ embeds: [embed], components: [row] });

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