const { EmbedBuilder, SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const plantSchema = require('./schemas/plantSchema');
const bankSchema = require('./schemas/bankSchema');
const { seeds, getUserFarm, addToFarm, removeFromFarm } = require('./farmUtils');
const { events, getRandomMutation } = require('./farmEvents');
const { getGlobalWeather } = require('./farmWeather');
const EconomyUserData = require('../../../models/EconomyUserData');
const { getConfig } = require('../../../utils/configLoader');
const { getLang } = require('../../../utils/langLoader');

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
                    const config = getConfig(); // Ensure config is available
                    const choices = Object.keys(config.Store['Phân bón']).map(key => ({ name: config.Store['Phân bón'][key].Name, value: key }));
                    return option.setName('ten_phan_bon').setDescription('🧪 Loại phân bón muốn dùng').setRequired(true).addChoices(...choices);
                })
                .addStringOption(option => {
                    const choices = Object.keys(seeds).map(seed => ({ name: seeds[seed].name, value: seed }));
                    return option.setName('ten_cay').setDescription('🌿 Loại cây muốn bón (để trống để bón tất cả)').setRequired(false).addChoices(...choices);
                }))
        .addSubcommandGroup(group =>
            group.setName('savings')
                .setDescription('💰 Ngân hàng tiết kiệm')
                .addSubcommand(sub =>
                    sub.setName('deposit')
                        .setDescription('📥 Gửi tiền vào tài khoản tiết kiệm')
                        .addIntegerOption(opt => opt.setName('amount').setDescription('💵 Số tiền muốn gửi').setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('balance')
                        .setDescription('💳 Xem số dư tiết kiệm')))
        .addSubcommand(subcommand =>
            subcommand.setName('sell')
                .setDescription('💸 Bán nông sản kiếm lời')
                .addStringOption(option => {
                    const choices = Object.keys(seeds).map(seed => ({ name: seeds[seed].name, value: seed }));
                    return option.setName('produce').setDescription('🍎 Loại nông sản muốn bán').setRequired(true).addChoices(...choices);
                })
                .addStringOption(option =>
                    option.setName('quantity')
                        .setDescription('🔢 Số lượng muốn bán (hoặc "all")')
                        .setRequired(true)
                        .setAutocomplete(true))),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name === 'quantity') {
            const produceName = interaction.options.getString('produce');
            if (!produceName) return;

            const userId = interaction.user.id;
            const seed = seeds[produceName];
            if (!seed) return;
            
            const userFarm = await getUserFarm(userId);
            const item = userFarm.items.find(i => i.name === seed.name && i.type === 'produce');

            const choices = [];
            if (item && item.quantity > 0) {
                choices.push({ name: `Tất cả (${item.quantity})`, value: 'all' });
                choices.push({ name: `${item.quantity}`, value: `${item.quantity}` });
            }
            await interaction.respond(choices);
        }
    },

    async execute(interaction, lang) {
        const client = interaction.client;
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const config = getConfig();
        // const lang = await getLang(interaction.guild.id); // lang passed from handler
        const farmingLang = lang.Addons.Farming;

        if (subcommand === 'plant') {
            const seedName = interaction.options.getString('seed');
            const quantityInput = interaction.options.getString('quantity') || '1';
            const seed = seeds[seedName];

            const userFarm = await getUserFarm(userId);
            const seedItem = userFarm.items.find(i => i.name === seed.name && i.type === 'seed');

            let quantity;
            if (quantityInput.toLowerCase() === 'all') {
                if (!seedItem || seedItem.quantity === 0) {
                    return interaction.editReply({ content: farmingLang.Errors.NoSeed.replace('{seed}', seed.name) });
                }
                quantity = seedItem.quantity;
            } else {
                const quantity = parseInt(quantityInput);
                if (isNaN(quantity) || quantity <= 0) {
                    return interaction.editReply({ content: farmingLang.Errors.InvalidQuantity });
                }
            }

            if (!seedItem || seedItem.quantity < quantity) {
                return interaction.editReply({ content: farmingLang.Errors.NotEnoughSeed.replace('{seed}', seed.name) });
            }

            const hasSeed = await removeFromFarm(userId, seed.name, quantity, 'seed');

            if (!hasSeed) {
                return interaction.editReply({ content: farmingLang.Errors.NotEnoughSeed.replace('{seed}', seed.name) });
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
                const newPlant = await plantSchema.create({
                    userId,
                    plant: seedName,
                    quantity,
                    mutation: mutation
                });
            }

            let reply = farmingLang.UI.PlantSuccess.replace('{quantity}', quantity).replace('{emoji}', seed.emoji).replace('{name}', seed.name);
            if (mutation) {
                reply += farmingLang.UI.PlantMutation
                    .replace('{emoji}', mutation.emoji)
                    .replace('{name}', mutation.name)
                    .replace('{weatherEmoji}', currentWeather.emoji)
                    .replace('{weatherName}', currentWeather.name);
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
                    return interaction.editReply({ content: farmingLang.Errors.NoPlantsReady });
                }
            } else {
                const plant = seeds[plantName];
                const planted = await plantSchema.findOne({ userId, plant: plantName });
                if (!planted) {
                    return interaction.editReply({ content: farmingLang.Errors.NotPlanted.replace('{plant}', plant.name) });
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

            let replyContent = farmingLang.UI.HarvestSuccess;
            for (const [name, data] of Object.entries(totalHarvested)) {
                replyContent += `- ${data.quantity} ${data.emoji} ${name}\n`;
            }

            if (totalBonusMoney > 0) {
                let economyData = await EconomyUserData.findOne({ userId });
                if (!economyData) economyData = await EconomyUserData.create({ userId });
                economyData.balance += totalBonusMoney;
                await economyData.save();
                replyContent += farmingLang.UI.HarvestBonus.replace('{mutations}', mutationDetails.join(', ')).replace('{amount}', totalBonusMoney.toLocaleString());
            } else if (mutationDetails.length > 0) {
                replyContent += farmingLang.UI.HarvestMutationOnly.replace('{mutations}', mutationDetails.join(', '));
            }

            const sellAllButton = new ButtonBuilder()
                .setCustomId('sell_all_harvested')
                .setLabel(farmingLang.UI.SellAllButton)
                .setStyle(ButtonStyle.Success)
                .setEmoji('💰');

            const row = new ActionRowBuilder().addComponents(sellAllButton);

            await interaction.editReply({ content: replyContent, components: [row] });

        } else if (subcommand === 'field') {
            const userPlants = await plantSchema.find({ userId });
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(farmingLang.UI.FieldTitle);

            if (userPlants.length === 0) {
                embed.setDescription(farmingLang.UI.FieldEmpty);
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
                    description = farmingLang.UI.FieldEmpty;
                }

                embed.setDescription(farmingLang.UI.WeatherCurrent
                    .replace('{emoji}', currentWeather.emoji)
                    .replace('{name}', currentWeather.name)
                    .replace('{time}', `<t:${endTime}:R>`)
                    .replace('{desc}', currentWeather.description) + '\n\n' + description);
            }

            await interaction.editReply({ embeds: [embed] });

        } else if (subcommand === 'event') {
            const globalWeather = await getGlobalWeather();
            const currentWeather = globalWeather.currentWeather;
            const endTime = Math.floor(globalWeather.weatherEndTime / 1000);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(farmingLang.UI.WeatherEventTitle)
                .setDescription(farmingLang.UI.WeatherEventCurrent.replace('{emoji}', currentWeather.emoji).replace('{name}', currentWeather.name).replace('{desc}', currentWeather.description))
                .addFields(
                    { name: farmingLang.UI.WeatherEnds, value: `<t:${endTime}:R>`, inline: true },
                    { name: farmingLang.UI.WeatherEffect, value: formatEffect(currentWeather.effect), inline: true }
                )
                .setFooter({ text: farmingLang.UI.WeatherFooter });

            await interaction.editReply({ embeds: [embed] });

        } else if (subcommand === 'seeds') {
            const userFarm = await getUserFarm(userId);
            const seedItems = userFarm.items.filter(item => Object.values(seeds).some(s => s.name === item.name && item.type === 'seed'));

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(farmingLang.UI.SeedInventoryTitle);

            if (seedItems.length === 0) {
                embed.setDescription(farmingLang.Errors.NoSeeds);
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
                .setTitle(farmingLang.UI.InventoryTitle);

            if (produceItems.length === 0 && fertilizerItems.length === 0) {
                embed.setDescription(farmingLang.Errors.NoProduce);
                return interaction.editReply({ embeds: [embed] });
            } else {
                let description = farmingLang.UI.InventoryProduce;
                if (produceItems.length > 0) {
                    for (const item of produceItems) {
                        const seed = Object.values(seeds).find(s => s.name === item.name);
                        if (seed) {
                            description += `${seed.emoji} ${item.name}: ${item.quantity}\n`;
                        }
                    }
                } else {
                    description += `${farmingLang.UI.None}\n`;
                }

                description += farmingLang.UI.InventoryFertilizer;
                if (fertilizerItems.length > 0) {
                    for (const item of fertilizerItems) {
                        description += `🌱 ${item.name}: ${item.quantity}\n`;
                    }
                } else {
                    description += `${farmingLang.UI.None}\n`;
                }

                embed.setDescription(description);
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('quick_sell_produce')
                .setPlaceholder(farmingLang.UI.QuickSellPlaceholder)
                .addOptions(produceItems.length > 0 ? produceItems.map(item => ({
                    label: item.name,
                    value: item.name.replace(/ /g, '-'),
                })) : [{ label: 'Empty', value: 'none' }]);

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
                return interaction.editReply({ content: farmingLang.Errors.NoFertilizer.replace('{fertilizer}', fertilizer.Name) });
            }

            const hasFertilizer = await removeFromFarm(userId, fertilizer.Name, 1, 'Fertilizer');
            if (!hasFertilizer) {
                return interaction.editReply({ content: farmingLang.Errors.NoFertilizer.replace('{fertilizer}', fertilizer.Name) });
            }

            const plantsToFertilize = plantName ? await plantSchema.find({ userId, plant: plantName }) : await plantSchema.find({ userId });

            if (plantsToFertilize.length === 0) {
                return interaction.editReply({ content: farmingLang.Errors.NoPlantsToFertilize });
            }

            for (const plant of plantsToFertilize) {
                let seedData = seeds[plant.plant];
                if (!seedData) {
                    seedData = Object.values(seeds).find(s => s.name === plant.plant);
                }

                if (!seedData) continue; // Skip if seed data not found

                switch (fertilizer.Key) {
                    case 'growth_fertilizer':
                        plant.plantedAt = new Date(plant.plantedAt.getTime() - (seedData.growthTime * 0.25));
                        break;
                    case 'super_speed_fertilizer':
                        plant.plantedAt = new Date(plant.plantedAt.getTime() - seedData.growthTime);
                        plant.fertilizer = { key: fertilizer.Key, effect: 'yield_reduce', qualityReduced: true };
                        break;
                    case 'bumper_harvest_fertilizer':
                        plant.fertilizer = { key: fertilizer.Key, effect: 'yield_increase' };
                        break;
                    case 'all_purpose_fertilizer':
                        plant.plantedAt = new Date(plant.plantedAt.getTime() - (seedData.growthTime * 0.5));
                        plant.fertilizer = { key: fertilizer.Key, effect: 'yield_increase' };
                        break;
                }
                await plant.save();
            }

            await interaction.editReply({ content: farmingLang.UI.FertilizeSuccess.replace('{fertilizer}', fertilizer.Name).replace('{plant}', plantName ? seeds[plantName].name : 'all plants') });
        
        } else if (subcommand === 'deposit' || subcommand === 'balance') { // Handle Savings Group
             const currency = config.Currency || '💰';
             if (subcommand === 'deposit') {
                 const amount = interaction.options.getInteger('amount');
                 if (amount <= 0) return interaction.editReply({ content: 'Số tiền gửi phải là số dương.' });

                 let economyData = await EconomyUserData.findOne({ userId });
                 if (!economyData || economyData.balance < amount) return interaction.editReply({ content: 'Bạn không đủ tiền để gửi.' });

                 economyData.balance -= amount;
                 await economyData.save();

                 let savingsData = await bankSchema.findOne({ userId });
                 if (!savingsData) savingsData = await bankSchema.create({ userId, balance: 0 });
                 savingsData.balance += amount;
                 await savingsData.save();

                 const embed = new EmbedBuilder().setColor('#00ff00').setTitle('Gửi Tiết Kiệm Thành Công')
                    .setDescription(`Bạn đã gửi thành công **${amount.toLocaleString()} ${currency}** vào tài khoản tiết kiệm của mình.`)
                    .addFields({ name: 'Số dư tiết kiệm mới', value: `${savingsData.balance.toLocaleString()} ${currency}` });
                 await interaction.editReply({ embeds: [embed] });

             } else if (subcommand === 'balance') {
                 let savingsData = await bankSchema.findOne({ userId });
                 const balance = savingsData ? savingsData.balance : 0;
                 const embed = new EmbedBuilder().setColor('#00ff00').setTitle('Số Dư Tài Khoản Tiết Kiệm')
                    .setDescription(`Số dư tiết kiệm của bạn là: **${balance.toLocaleString()} ${currency}**`);
                 await interaction.editReply({ embeds: [embed] });
             }

        } else if (subcommand === 'sell') {
            const produceName = interaction.options.getString('produce');
            const quantityInput = interaction.options.getString('quantity');
            const seed = seeds[produceName];
            
            const userFarm = await getUserFarm(userId);
            const item = userFarm.items.find(i => i.name === seed.name && i.type === 'produce');

            if (!item || item.quantity === 0) return interaction.editReply({ content: `Bạn không có ${seed.name} để bán.` });
            
            let quantity;
            if (quantityInput.toLowerCase() === 'all') quantity = item.quantity;
            else {
                quantity = parseInt(quantityInput);
                if (isNaN(quantity) || quantity <= 0) return interaction.editReply({ content: 'Số lượng không hợp lệ.' });
            }

            if (quantity > item.quantity) return interaction.editReply({ content: `Bạn chỉ có ${item.quantity} ${seed.name} để bán.` });

            const hasProduce = await removeFromFarm(userId, seed.name, quantity, 'produce');
            if (!hasProduce) return interaction.editReply({ content: `Bạn không có đủ ${seed.name} để bán.` });

            const sellPrice = Math.floor(seed.price * 0.8);
            const totalGain = sellPrice * quantity;

            let economyData = await EconomyUserData.findOne({ userId });
            if (!economyData) economyData = await EconomyUserData.create({ userId });
            economyData.balance += totalGain;
            await economyData.save();

            const embed = new EmbedBuilder().setColor('#00ff00').setTitle('Bán Nông Sản Thành Công')
                .setDescription(`Bạn đã bán thành công ${quantity} ${seed.emoji} ${seed.name} với giá ${totalGain.toLocaleString()} 💰.`);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
