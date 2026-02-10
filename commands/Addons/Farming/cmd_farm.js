const { EmbedBuilder, SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const plantSchema = require('./schemas/plantSchema');
const bankSchema = require('./schemas/bankSchema');
const { seeds, getUserFarm, addToFarm, removeFromFarm, formatPlantName } = require('./farmUtils');
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

// Helper for random quotes
function getRandomQuote(farmingLang) {
    if (!farmingLang.Quotes || !Array.isArray(farmingLang.Quotes)) return "";
    const quotes = farmingLang.Quotes;
    return quotes[Math.floor(Math.random() * quotes.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('farm')
        .setDescription('🌾 Quản lý nông trại của bạn')
        .addSubcommand(subcommand =>
            subcommand
                .setName('plant')
                .setDescription('🌱 Trồng hạt giống')
                .addStringOption(option =>
                    option.setName('seed')
                        .setDescription('🌰 Loại hạt giống bạn muốn trồng')
                        .setRequired(true)
                        .setAutocomplete(true)) // Enable Autocomplete
                .addStringOption(option =>
                    option.setName('quantity')
                        .setDescription('🔢 Số lượng hạt giống (mặc định: 1)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('harvest')
                .setDescription('🚜 Thu hoạch cây trồng')
                .addStringOption(option =>
                    option.setName('plant')
                        .setDescription('🌿 Loại cây bạn muốn thu hoạch')
                        .setRequired(true)
                        .setAutocomplete(true))) // Enable Autocomplete
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
                .setDescription('🎒 Xem kho hạt giống (Nhanh)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('📦 Xem tất cả kho nông trại (Hạt giống, Nông sản, Phân bón)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('phanbon')
                .setDescription('✨ Sử dụng phân bón cho cây')
                .addStringOption(option => {
                    const config = getConfig();
                    const choices = Object.keys(config.Store['Phân bón'] || {}).map(key => ({ name: config.Store['Phân bón'][key].Name, value: key }));
                    return option.setName('ten_phan_bon').setDescription('🧪 Loại phân bón muốn dùng').setRequired(true).addChoices(...choices);
                })
                .addStringOption(option =>
                    option.setName('ten_cay')
                        .setDescription('🌿 Loại cây muốn bón (để trống để bón tất cả)')
                        .setRequired(false)
                        .setAutocomplete(true)))
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
                .addStringOption(option =>
                    option.setName('produce')
                        .setDescription('🍎 Loại nông sản muốn bán')
                        .setRequired(true)
                        .setAutocomplete(true)) // Enable Autocomplete
                .addStringOption(option =>
                    option.setName('quantity')
                        .setDescription('🔢 Số lượng muốn bán (hoặc "all")')
                        .setRequired(true)
                        .setAutocomplete(true))),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const userId = interaction.user.id;
        const userFarm = await getUserFarm(userId);

        // 1. Plant (Seed Selection)
        if (focusedOption.name === 'seed') {
            const seedItems = userFarm.items.filter(i => i.type === 'seed' && i.quantity > 0);
            let choices = seedItems.map(item => {
                return {
                    name: `${item.name} (Có: ${item.quantity})`,
                    value: Object.keys(seeds).find(k => seeds[k].name === item.name) || item.name
                };
            });
            const filtered = choices.filter(c => c.name.toLowerCase().includes(focusedOption.value.toLowerCase()));
            await interaction.respond(filtered.slice(0, 25));
        }

        // 2. Harvest (Plant Selection) - Unchanged generally, but uses planted schema
        else if (focusedOption.name === 'plant') {
            const planted = await plantSchema.find({ userId });
            const uniquePlants = [...new Set(planted.map(p => p.plant))];

            let choices = uniquePlants.map(plantKey => {
                const seedInfo = seeds[plantKey];
                const count = planted.filter(p => p.plant === plantKey).reduce((a, b) => a + b.quantity, 0);
                const ready = planted.filter(p => {
                    if (p.plant !== plantKey) return false;
                    const timeSincePlanted = Date.now() - new Date(p.plantedAt).getTime();
                    return (seedInfo.growthTime - timeSincePlanted) <= 1000;
                }).reduce((a, b) => a + b.quantity, 0);

                return {
                    name: `${seedInfo.name} (Trồng: ${count} | Sẵn sàng: ${ready})`,
                    value: plantKey
                };
            });

            if (planted.length > 0) {
                choices.unshift({ name: 'Thu hoạch tất cả', value: 'all' });
            } else {
                choices.push({ name: 'Chưa có cây trồng nào', value: 'none' });
            }

            const filtered = choices.filter(c => c.name.toLowerCase().includes(focusedOption.value.toLowerCase()));
            await interaction.respond(filtered.slice(0, 25));
        }

        // 3. Sell (Produce Selection)
        // UPDATE: Handle mutations distinctively
        else if (focusedOption.name === 'produce') {
            const produceItems = userFarm.items.filter(i => i.type === 'produce' && i.quantity > 0);

            let choices = [];
            // Add "Sell All" option at the top
            if (produceItems.length > 0) {
                const totalItems = produceItems.reduce((sum, i) => sum + i.quantity, 0);
                choices.push({ name: `💰 Bán tất cả nông sản (${totalItems} items)`, value: '__ALL__' });
            }

            choices.push(...produceItems.map(item => {
                const seedInfo = Object.values(seeds).find(s => s.name === item.name);
                const mutName = item.mutation ? item.mutation.name : 'null';
                const value = `${item.name}::${mutName}`;
                const displayName = formatPlantName(item.name, item.mutation, item.quantity);
                return { name: displayName, value: value };
            }));

            const filtered = choices.filter(c => c.name.toLowerCase().includes(focusedOption.value.toLowerCase()));
            await interaction.respond(filtered.slice(0, 25));
        }

        // 4. Quantity (Generic)
        else if (focusedOption.name === 'quantity') {
            const produceValue = interaction.options.getString('produce');
            if (produceValue) {
                // Parse Name::Mutation
                const [pName, pMut] = produceValue.split('::');
                // If it's old command style or plant (no ::), handle gracefully

                if (pName) {
                    const item = userFarm.items.find(i =>
                        i.name === pName &&
                        i.type === 'produce' &&
                        ((!i.mutation && pMut === 'null') || (i.mutation && i.mutation.name === pMut))
                    );

                    if (item && item.quantity > 0) {
                        await interaction.respond([
                            { name: `Tất cả (${item.quantity})`, value: 'all' },
                            { name: '1', value: '1' },
                            { name: '5', value: '5' },
                            { name: '10', value: '10' }
                        ]);
                    }
                }
            }
        }

        // 5. Fertilizer (Plant Selection)
        else if (focusedOption.name === 'ten_cay') {
            const planted = await plantSchema.find({ userId });
            const uniquePlants = [...new Set(planted.map(p => p.plant))];

            let choices = uniquePlants.map(plantKey => {
                const seedInfo = seeds[plantKey] || Object.values(seeds).find(s => s.name === plantKey);
                const count = planted.filter(p => p.plant === plantKey).reduce((a, b) => a + b.quantity, 0);

                return {
                    name: `${seedInfo ? seedInfo.name : plantKey} (Đang trồng: ${count})`,
                    value: plantKey
                };
            });

            // Add "All" option (value empty string to trigger 'fetch all' logic)
            if (planted.length > 0) {
                choices.unshift({ name: '🌱 Bón cho tất cả cây trồng', value: '' });
            } else {
                choices.push({ name: 'Chưa có cây trồng nào', value: 'none' });
            }

            const filtered = choices.filter(c => c.name.toLowerCase().includes(focusedOption.value.toLowerCase()));
            await interaction.respond(filtered.slice(0, 25));
        }
    },

    async execute(interaction, lang) {
        if (interaction.isAutocomplete && interaction.isAutocomplete()) return;

        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const config = getConfig();
        const farmingLang = lang.Addons.Farming;

        if (subcommand === 'plant') {
            // ... (Plant Logic largely unchanged, logic resides in command beginning) ...
            // Copying original logic but ensuring we don't break it
            const seedName = interaction.options.getString('seed');
            const quantityInput = interaction.options.getString('quantity') || '1';
            const seed = seeds[seedName];
            if (!seed) return interaction.editReply({ content: '❌ Loại hạt giống không hợp lệ.' });

            const userFarm = await getUserFarm(userId);
            const seedItem = userFarm.items.find(i => i.name === seed.name && i.type === 'seed');

            let quantity;
            if (quantityInput.toLowerCase() === 'all') {
                if (!seedItem || seedItem.quantity === 0) return interaction.editReply({ content: farmingLang.Errors.NoSeed.replace('{seed}', seed.name) });
                quantity = seedItem.quantity;
            } else {
                quantity = parseInt(quantityInput);
                if (isNaN(quantity) || quantity <= 0) return interaction.editReply({ content: farmingLang.Errors.InvalidQuantity });
            }

            if (!seedItem || seedItem.quantity < quantity) return interaction.editReply({ content: farmingLang.Errors.NotEnoughSeed.replace('{seed}', seed.name) });

            const hasSeed = await removeFromFarm(userId, seed.name, quantity, 'seed');
            if (!hasSeed) return interaction.editReply({ content: farmingLang.Errors.NotEnoughSeed.replace('{seed}', seed.name) });

            const existingPlant = await plantSchema.findOne({ userId, plant: seedName });
            const globalWeather = await getGlobalWeather();
            const currentWeather = globalWeather.currentWeather;
            const mutation = getRandomMutation(currentWeather, globalWeather.activeMutationRate);

            // LOGIC SPLIT: If mutation exists, we can't merge with non-mutated plant easily in `plantSchema` if it strictly groups by 'plant'.
            // `plantSchema` key is ['userId', 'plant'].
            // If we want multiple stacks of "Corn" (one mutated, one not), we need `plantSchema` to handle it.
            // OR we store mutation on the plant object and current schema supports one entry per plant type?
            // Schema check: new SQLiteModel('farming_plants', ['userId', 'plant'], defaultData);
            // This composite key means ONE entry per plant type per user.
            // PROBLEM: User plants 5 Corn. Later plants 5 Corn (Gets Mutation).
            // Result: 10 Corn. Do they all get mutation? Or mix?
            // "Grow a Garden" style usually implies individual plots or batches.
            // If we have just one "Field" of Corn, we have to decide.
            // DECISION: New planted crop OVERWRITES/MERGES?
            // If I have 5 Corn, and plant 5 more.
            // If I get mutation on NEW 5, do ALL 10 become mutated? Or average?
            // Simple approach: The field calculates mutation ON HARVEST?
            // Current code: `mutation` is stored on `plantSchema` when planted.
            // `existingPlant.mutation = mutation;` -> This overwrites previous state.
            // This means planting MORE might give you a mutation for the whole batch, OR remove it?
            // This is a known limitation of the current simple schema.
            // We will stick to: Planting new batch rolls for mutation. If success, batch applies.
            // Logic unchanged from original for now, as user didn't ask to rewrite the Field system, just the Harvest/Inventory results.

            if (existingPlant) {
                existingPlant.quantity += quantity;
                existingPlant.plantedAt = Date.now();
                // If new batch has mutation, upgrade the field! (Bonus for player)
                // If old had mutation and new doesn't, keep old?
                // Let's keep existing logic: `if (!existingPlant.mutation && mutation)`. (Upgrade only)
                if (!existingPlant.mutation && mutation) {
                    existingPlant.mutation = mutation;
                }
                await existingPlant.save();
            } else {
                await plantSchema.create({
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
            // Append random quote
            reply += `\n\n> *"${getRandomQuote(farmingLang)}"*`;

            await interaction.editReply({ content: reply });

        } else if (subcommand === 'harvest') {
            const plantName = interaction.options.getString('plant');
            if (plantName === 'none') return interaction.editReply('Bạn chưa có cây trồng nào.');

            let plantsToHarvest = [];
            if (plantName === 'all') {
                const allPlants = await plantSchema.find({ userId });
                for (const planted of allPlants) {
                    const plant = seeds[planted.plant];
                    const timeSincePlanted = Date.now() - new Date(planted.plantedAt).getTime();
                    // Allow 1s buffer
                    if ((plant.growthTime - timeSincePlanted) <= 1000) {
                        plantsToHarvest.push({ planted, plant });
                    }
                }
                if (plantsToHarvest.length === 0) return interaction.editReply({ content: farmingLang.Errors.NoPlantsReady });
            } else {
                const plant = seeds[plantName];
                const planted = await plantSchema.findOne({ userId, plant: plantName });
                if (!planted) return interaction.editReply({ content: farmingLang.Errors.NotPlanted.replace('{plant}', plant.name) });

                const timeSincePlanted = Date.now() - new Date(planted.plantedAt).getTime();
                if ((plant.growthTime - timeSincePlanted) > 1000) {
                    const timeRemaining = plant.growthTime - timeSincePlanted;
                    const hours = Math.floor(timeRemaining / 3600000);
                    const minutes = Math.floor((timeRemaining % 3600000) / 60000);
                    return interaction.editReply({ content: `${plant.name} của bạn chưa sẵn sàng để thu hoạch. Thời gian còn lại: ${hours} giờ ${minutes} phút.` });
                }
                plantsToHarvest.push({ planted, plant });
            }

            let harvestReport = []; // Stores strings for final output
            let totalHarvestedItems = [];
            let totalBonusMoney = 0;
            let mutationDetails = [];

            for (const { planted, plant } of plantsToHarvest) {
                await plantSchema.deleteOne({ _id: planted._id });
                let harvestedQuantity = (Math.floor(Math.random() * 3) + 2) * planted.quantity;

                // Yield Multipliers
                if (planted.fertilizer && planted.fertilizer.effect === 'yield_increase') {
                    if (planted.fertilizer.key === 'bumper_harvest_fertilizer') harvestedQuantity *= 1.5;
                    else if (planted.fertilizer.key === 'all_purpose_fertilizer') harvestedQuantity *= 1.25;
                }
                if (planted.fertilizer && planted.fertilizer.qualityReduced) harvestedQuantity *= 0.5;

                const globalWeather = await getGlobalWeather();
                const currentWeather = globalWeather.currentWeather;
                if (currentWeather && currentWeather.effect && currentWeather.effect.yield) {
                    harvestedQuantity *= currentWeather.effect.yield;
                }

                if (planted.mutation && planted.mutation.effect.yield) {
                    harvestedQuantity *= planted.mutation.effect.yield;
                }

                harvestedQuantity = Math.floor(harvestedQuantity);
                if (harvestedQuantity < 1) harvestedQuantity = 1;

                // Store with mutation
                await addToFarm(userId, plant.name, harvestedQuantity, 'produce', planted.mutation);

                // Add to report
                const fmtName = formatPlantName(plant.name, planted.mutation, harvestedQuantity);
                harvestReport.push(`- ${fmtName}`);

                // Track mutation details for bonus report
                if (planted.mutation) {
                    mutationDetails.push(`${planted.mutation.emoji} ${planted.mutation.name}`);
                    if (planted.mutation.effect && planted.mutation.effect.price) {
                        totalBonusMoney += Math.floor(seeds[planted.plant]?.sellPrice || 0) * harvestedQuantity;
                    }
                }
            }

            let replyContent = farmingLang.UI.HarvestSuccess;
            harvestReport.forEach(line => { replyContent += `${line}\n`; });

            if (totalBonusMoney > 0) {
                replyContent += farmingLang.UI.HarvestBonus.replace('{mutations}', mutationDetails.join(', ')).replace('{amount}', totalBonusMoney.toLocaleString());
            } else if (mutationDetails.length > 0) {
                replyContent += farmingLang.UI.HarvestMutationOnly.replace('{mutations}', mutationDetails.join(', '));
            }

            // Append random quote
            replyContent += `\n\n> *"${getRandomQuote(farmingLang)}"*`;

            const sellAllButton = new ButtonBuilder()
                .setCustomId('sell_all_harvested')
                .setLabel(farmingLang.UI.SellAllButton)
                .setStyle(ButtonStyle.Success)
                .setEmoji('💰');
            const row = new ActionRowBuilder().addComponents(sellAllButton);

            await interaction.editReply({ content: replyContent, components: [row] });

        } else if (subcommand === 'field') {
            const userPlants = await plantSchema.find({ userId });
            const globalWeather = await getGlobalWeather();
            const currentWeather = globalWeather.currentWeather;

            // Apply mutations to existing plants during active mutation events
            let mutationsApplied = [];
            if (globalWeather.activeMutationRate && globalWeather.activeMutationRate > 0) {
                for (const p of userPlants) {
                    // Apply mutation to plants WITHOUT existing mutation (don't overwrite)
                    if (!p.mutation) {
                        const newMutation = getRandomMutation(currentWeather, globalWeather.activeMutationRate);
                        if (newMutation) {
                            p.mutation = newMutation;
                            await p.save();
                            let plant = seeds[p.plant] || Object.values(seeds).find(s => s.name === p.plant);
                            mutationsApplied.push(`${newMutation.emoji} ${plant?.name || p.plant}`);
                        }
                    }
                }
            }

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(farmingLang.UI.FieldTitle.replace('{user}', interaction.user.username));

            if (userPlants.length === 0) {
                embed.setDescription(farmingLang.UI.FieldEmpty);
            } else {
                let description = '';
                for (const p of userPlants) {
                    let plant = seeds[p.plant];
                    if (!plant) plant = Object.values(seeds).find(s => s.name === p.plant);
                    if (plant) {
                        const timeSincePlanted = Date.now() - new Date(p.plantedAt).getTime();
                        const timeRemaining = Math.max(0, plant.growthTime - timeSincePlanted);
                        const hours = Math.floor(timeRemaining / 3600000);
                        const minutes = Math.floor((timeRemaining % 3600000) / 60000);
                        const progress = Math.min(100, (timeSincePlanted / plant.growthTime) * 100);

                        let line = `${plant.emoji} ${plant.name} (x${p.quantity})`;
                        if (p.mutation) {
                            line = `**[${p.mutation.emoji} ${p.mutation.name}]** ${line}`;
                        }

                        description += `${line}: ${progress.toFixed(2)}% - Còn lại: ${hours}h ${minutes}m\n`;
                    }
                }

                // Show new mutations if any were applied this check
                if (mutationsApplied.length > 0) {
                    description = `✨ **ĐỘT BIẾN MỚI!** ${mutationsApplied.join(', ')}\n\n` + description;
                }
                // Weather info (already fetched at top)
                const endTime = Math.floor(globalWeather.weatherEndTime / 1000);
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
                    { name: formatEffect(currentWeather.effect), value: 'Effect', inline: true }
                )
                .setFooter({ text: farmingLang.UI.WeatherFooter });

            if (globalWeather.activeMutationRate && globalWeather.activeMutationRate > 0) {
                embed.addFields({ name: '🧬 Tỉ Lệ Đột Biến Hiện Tại', value: `${(globalWeather.activeMutationRate * 100).toFixed(1)}%`, inline: true });
            }

            // Check for mutated plants (Requested Feature)
            const userPlants = await plantSchema.find({ userId });
            const mutatedPlants = userPlants.filter(p => p.mutation);

            if (mutatedPlants.length > 0) {
                let mutDesc = '';
                for (const p of mutatedPlants) {
                    let plant = seeds[p.plant] || Object.values(seeds).find(s => s.name === p.plant);
                    if (plant) {
                        mutDesc += `**${p.mutation.emoji} ${p.mutation.name}** ${plant.emoji} ${plant.name} (x${p.quantity})\n`;
                    }
                }
                embed.addFields({ name: '🌿 Cây Đột Biến Đang Trồng', value: mutDesc, inline: false });
            }

            await interaction.editReply({ embeds: [embed] });

        } else if (subcommand === 'seeds') {
            // Unchanged
            const userFarm = await getUserFarm(userId);
            const seedItems = userFarm.items.filter(item => item.type === 'seed');
            const embed = new EmbedBuilder().setColor('#00ff00').setTitle(farmingLang.UI.SeedInventoryTitle);
            if (seedItems.length === 0) embed.setDescription(farmingLang.Errors.NoSeeds);
            else {
                let description = '';
                for (const item of seedItems) {
                    const seed = Object.values(seeds).find(s => s.name === item.name);
                    if (seed) description += `${seed.emoji} ${item.name}: ${item.quantity}\n`;
                }
                embed.setDescription(description);
            }
            await interaction.editReply({ embeds: [embed] });

        } else if (subcommand === 'inventory') {
            const userFarm = await getUserFarm(userId);
            const produceItems = userFarm.items.filter(item => item.type === 'produce');
            const fertilizerItems = userFarm.items.filter(item => item.type === 'Fertilizer');
            const seedItems = userFarm.items.filter(item => item.type === 'seed');

            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('📦 Kho Nông Trại')
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            let seedsDesc = seedItems.length > 0 ? seedItems.map(i => {
                const s = Object.values(seeds).find(x => x.name === i.name);
                return `${s?.emoji || '🌰'} **${i.name}**: ${i.quantity}`;
            }).join('\n') : "Không có hạt giống nào.";
            embed.addFields({ name: '🌱 Hạt Giống', value: seedsDesc, inline: true });

            // Produce with Mutation Format
            let produceDesc = "";
            if (produceItems.length > 0) {
                produceDesc = produceItems.map(item => {
                    return `- ${formatPlantName(item.name, item.mutation, item.quantity)}`;
                }).join('\n');
            } else {
                produceDesc = "Không có nông sản.";
            }
            embed.addFields({ name: '🥒 Nông Sản', value: produceDesc, inline: true });

            let fertDesc = fertilizerItems.length > 0 ? fertilizerItems.map(i => `🧪 **${i.name}**: ${i.quantity}`).join('\n') : "Không có phân bón.";
            embed.addFields({ name: '🧪 Phân Bón', value: fertDesc, inline: false });

            // Select Menu for Quick Sell (Updated for composite values)
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('quick_sell_produce')
                .setPlaceholder(farmingLang.UI.QuickSellPlaceholder || 'Chọn nông sản để bán nhanh')
                .addOptions(produceItems.length > 0 ? produceItems.map(item => {
                    const mutName = item.mutation ? item.mutation.name : 'null';
                    // Value: Name::Mutation
                    return {
                        label: formatPlantName(item.name, item.mutation, item.quantity),
                        value: `${item.name}::${mutName}`.replace(/ /g, '_'), // Safety replace spaces for ID?
                        // "Tomato::Neon" -> "Tomato::Neon"
                        // Note: Value max length is 100.
                        description: `Bán tất cả`
                    };
                }).slice(0, 25) : [{ label: 'Trống', value: 'none', description: 'Bạn không có nông sản để bán' }]); // Limit to 25 for select menu

            const row = new ActionRowBuilder().addComponents(selectMenu);
            if (produceItems.length === 0) row.components[0].setDisabled(true);

            await interaction.editReply({ embeds: [embed], components: [row] });

        } else if (subcommand === 'phanbon') {
            // (Unchanged logic for brevity, assuming it works fine)
            const fertilizerKey = interaction.options.getString('ten_phan_bon');
            const plantName = interaction.options.getString('ten_cay');
            const config = getConfig(); // Need to re-get since it was in original scope? Yes.
            const fertilizer = config.Store['Phân bón'][fertilizerKey];
            // ... [Logic identical to original] ...
            const userFarm = await getUserFarm(userId);
            const fertilizerItem = userFarm.items.find(i => i.name === fertilizer.Name && i.type === 'Fertilizer');
            if (!fertilizerItem || fertilizerItem.quantity < 1) return interaction.editReply({ content: farmingLang.Errors.NoFertilizer.replace('{fertilizer}', fertilizer.Name) });

            const hasFertilizer = await removeFromFarm(userId, fertilizer.Name, 1, 'Fertilizer');
            if (!hasFertilizer) return interaction.editReply({ content: farmingLang.Errors.NoFertilizer.replace('{fertilizer}', fertilizer.Name) });

            const plantsToFertilize = plantName ? await plantSchema.find({ userId, plant: plantName }) : await plantSchema.find({ userId });
            if (plantsToFertilize.length === 0) return interaction.editReply({ content: farmingLang.Errors.NoPlantsToFertilize });

            for (const plant of plantsToFertilize) {
                let seedData = seeds[plant.plant];
                if (!seedData) seedData = Object.values(seeds).find(s => s.name === plant.plant);
                if (!seedData) continue;
                switch (fertilizer.Key) {
                    case 'growth_fertilizer': plant.plantedAt = new Date(new Date(plant.plantedAt).getTime() - (seedData.growthTime * 0.25)); break;
                    case 'super_speed_fertilizer': plant.plantedAt = new Date(new Date(plant.plantedAt).getTime() - seedData.growthTime); plant.fertilizer = { key: fertilizer.Key, effect: 'yield_reduce', qualityReduced: true }; break;
                    case 'bumper_harvest_fertilizer': plant.fertilizer = { key: fertilizer.Key, effect: 'yield_increase' }; break;
                    case 'all_purpose_fertilizer': plant.plantedAt = new Date(new Date(plant.plantedAt).getTime() - (seedData.growthTime * 0.5)); plant.fertilizer = { key: fertilizer.Key, effect: 'yield_increase' }; break;
                }
                await plant.save();
            }
            await interaction.editReply({ content: farmingLang.UI.FertilizeSuccess.replace('{fertilizer}', fertilizer.Name).replace('{plant}', plantName ? seeds[plantName].name : 'all plants') });

        } else if (subcommand === 'deposit' || subcommand === 'balance') {
            // ... [Savings Logic Unchanged] ...
            const currency = config.Currency || '💰';
            if (subcommand === 'deposit') {
                const amount = interaction.options.getInteger('amount');
                if (amount <= 0) return interaction.editReply({ content: 'Số tiền phải dương.' });
                let econ = await EconomyUserData.findOne({ userId });
                if (!econ || econ.balance < amount) return interaction.editReply({ content: 'Không đủ tiền.' });
                econ.balance -= amount; await econ.save();
                let bank = await bankSchema.findOne({ userId });
                if (!bank) bank = await bankSchema.create({ userId, balance: 0 });
                bank.balance += amount; await bank.save();
                const embed = new EmbedBuilder().setColor('#00ff00').setTitle('Gửi Tiết Kiệm').setDescription(`Đã gửi **${amount.toLocaleString()} ${currency}**.`);
                await interaction.editReply({ embeds: [embed] });
            } else {
                let bank = await bankSchema.findOne({ userId });
                const embed = new EmbedBuilder().setColor('#00ff00').setTitle('Số Dư').setDescription(`Số dư: **${(bank?.balance || 0).toLocaleString()} ${currency}**`);
                await interaction.editReply({ embeds: [embed] });
            }

        } else if (subcommand === 'sell') {
            const produceValue = interaction.options.getString('produce');
            const quantityInput = interaction.options.getString('quantity');

            // === SELL ALL MODE ===
            if (produceValue === '__ALL__') {
                const userFarm = await getUserFarm(userId);
                const produceItems = userFarm.items.filter(i => i.type === 'produce' && i.quantity > 0);

                if (produceItems.length === 0) return interaction.editReply({ content: '❌ Bạn không có nông sản nào để bán.' });

                let totalGross = 0;
                let totalTax = 0;
                let totalNet = 0;
                let sellReport = [];

                for (const item of produceItems) {
                    const seedData = Object.values(seeds).find(s => s.name === item.name);
                    if (!seedData) continue;

                    let sellPrice = seedData.sellPrice || Math.floor(seedData.price * 0.5);
                    if (item.mutation && item.mutation.effect && item.mutation.effect.price) {
                        sellPrice = Math.floor(sellPrice * item.mutation.effect.price);
                    }

                    const gross = sellPrice * item.quantity;
                    const tax = Math.floor(gross * 0.05);
                    const net = gross - tax;

                    totalGross += gross;
                    totalTax += tax;
                    totalNet += net;

                    const displayName = formatPlantName(item.name, item.mutation, item.quantity);
                    sellReport.push(`- ${displayName}: **${net.toLocaleString()}** xu`);

                    await removeFromFarm(userId, item.name, item.quantity, 'produce', item.mutation);
                }

                let economyData = await EconomyUserData.findOne({ userId });
                if (!economyData) economyData = await EconomyUserData.create({ userId });
                economyData.balance += totalNet;
                await economyData.save();

                const embed = new EmbedBuilder().setColor('#00ff00').setTitle('💰 Bán Tất Cả Nông Sản')
                    .setDescription(sellReport.join('\n') + `\n\n💰 Tổng: **${totalGross.toLocaleString()}** xu\n📊 Thuế (5%): **-${totalTax.toLocaleString()}** xu\n✅ Nhận: **${totalNet.toLocaleString()}** xu`);
                return interaction.editReply({ embeds: [embed] });
            }

            // === SELL SINGLE ITEM ===
            let produceName = produceValue;
            let produceMutation = 'null';
            if (produceValue.includes('::')) {
                [produceName, produceMutation] = produceValue.split('::');
            }

            var seedData = Object.values(seeds).find(s => s.name === produceName);
            if (!seedData) return interaction.editReply({ content: '❌ Loại nông sản không hợp lệ.' });

            const userFarm = await getUserFarm(userId);
            const item = userFarm.items.find(i =>
                i.name === produceName &&
                i.type === 'produce' &&
                ((!i.mutation && produceMutation === 'null') || (i.mutation && i.mutation.name === produceMutation))
            );

            const displayItemName = formatPlantName(produceName, item ? item.mutation : null, 0).replace('[0kg]', '').trim();
            if (!item || item.quantity === 0) return interaction.editReply({ content: `Bạn không có ${displayItemName} để bán.` });

            let quantity;
            if (quantityInput.toLowerCase() === 'all') quantity = item.quantity;
            else {
                quantity = parseInt(quantityInput);
                if (isNaN(quantity) || quantity <= 0) return interaction.editReply({ content: 'Số lượng không hợp lệ.' });
            }

            if (quantity > item.quantity) return interaction.editReply({ content: `Bạn chỉ có ${item.quantity} ${displayItemName} để bán.` });

            const hasProduce = await removeFromFarm(userId, produceName, quantity, 'produce', item.mutation);
            if (!hasProduce) return interaction.editReply({ content: 'Lỗi khi trừ vật phẩm.' });

            let sellPrice = seedData.sellPrice || Math.floor(seedData.price * 0.5);
            if (item.mutation && item.mutation.effect && item.mutation.effect.price) {
                sellPrice = Math.floor(sellPrice * item.mutation.effect.price);
            }

            const grossGain = sellPrice * quantity;
            const taxAmount = Math.floor(grossGain * 0.05);
            const totalGain = grossGain - taxAmount;

            let economyData = await EconomyUserData.findOne({ userId });
            if (!economyData) economyData = await EconomyUserData.create({ userId });
            economyData.balance += totalGain;
            await economyData.save();

            const embed = new EmbedBuilder().setColor('#00ff00').setTitle('Bán Nông Sản Thành Công')
                .setDescription(`Bạn đã bán thành công ${formatPlantName(produceName, item.mutation, quantity)}.\n💰 Tổng: **${grossGain.toLocaleString()}** xu\n📊 Thuế (5%): **-${taxAmount.toLocaleString()}** xu\n✅ Nhận: **${totalGain.toLocaleString()}** xu`);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
