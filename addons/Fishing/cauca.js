const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { loadConfig, getUserFishing } = require('./fishingUtils');
const EconomyUserData = require('../../models/EconomyUserData');

const HOURLY_FISH_PATH = path.join(__dirname, 'current_hourly.json');
const fishingCooldowns = new Set();
const COOLDOWN_SECONDS = 30;

function getBaitConfigByName(baitName) {
    const config = loadConfig();
    for (const key in config.baits) {
        if (config.baits[key].name === baitName) {
            return { key, ...config.baits[key] };
        }
    }
    return null;
}

function getCatch(location, config, usedBaitKey) {
    let chances = { ...config.rarity_chances };

    if (usedBaitKey && config.baits[usedBaitKey]) {
        const baitInfo = config.baits[usedBaitKey];
        const bonus = Math.random() * (baitInfo.bonus[1] - baitInfo.bonus[0]) + baitInfo.bonus[0];
        let totalAttractedChance = 0;
        baitInfo.attracts.forEach(r => { if (chances[r]) totalAttractedChance += chances[r]; });

        if (totalAttractedChance > 0) {
            baitInfo.attracts.forEach(r => { if (chances[r]) chances[r] += (chances[r] / totalAttractedChance) * bonus; });
            const nonAttractedRarities = Object.keys(chances).filter(r => !baitInfo.attracts.includes(r));
            let totalNonAttractedChance = 0;
            nonAttractedRarities.forEach(r => totalNonAttractedChance += chances[r]);
            if (totalNonAttractedChance > 0) {
                 nonAttractedRarities.forEach(r => { chances[r] -= (chances[r] / totalNonAttractedChance) * bonus; });
            }
        }
    }

    const randomNumber = Math.random();
    let cumulativeChance = 0;
    for (const rarity in chances) {
        cumulativeChance += chances[rarity];
        if (randomNumber < cumulativeChance) {
            let fishPool = [];

            if (rarity === 'legendary' || rarity === 'epic') {
                try {
                    const hourlyData = JSON.parse(fs.readFileSync(HOURLY_FISH_PATH, 'utf8'));
                    if (location.fish.includes(hourlyData[rarity].name)) {
                        const foundFish = hourlyData[rarity];
                        return { ...foundFish, rarity: rarity };
                    }
                } catch (error) { /* Fall through to general pool */ }n            }

            fishPool = config.fish_pools[rarity]?.filter(fish => location.fish.includes(fish.name)) || [];
            
            if (fishPool.length > 0) {
                const foundFish = fishPool[Math.floor(Math.random() * fishPool.length)];
                return { ...foundFish, rarity: rarity };
            }
        }
    }
    
    const commonFishFromLocation = config.fish_pools.common.filter(fish => location.fish.includes(fish.name));
    if (commonFishFromLocation.length > 0) {
        const foundFish = commonFishFromLocation[Math.floor(Math.random() * commonFishFromLocation.length)];
        return { ...foundFish, rarity: 'common' };
    }

    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cauca')
        .setDescription('Các lệnh liên quan đến câu cá.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('fish')
                .setDescription('Câu cá tại một địa điểm.')
                .addStringOption(option => {
                    const config = loadConfig();
                    const choices = Object.keys(config.locations).map(loc => ({ name: config.locations[loc].name, value: loc }));
                    return option.setName('location').setDescription('Địa điểm câu cá.').setRequired(true).addChoices(...choices);
                }))
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('Hiển thị kho đồ câu cá của bạn.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                .setDescription('Bán cá trong kho.')
                .addStringOption(option => option.setName('fish').setDescription('Loại cá muốn bán (hoặc gõ "all").').setRequired(true).setAutocomplete(true))
                .addStringOption(option => option.setName('quantity').setDescription('Số lượng (để trống nếu bán tất cả cá)').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('select')
                .setDescription('Chọn cần câu hoặc mồi câu để sử dụng.')
                .addStringOption(option => 
                    option.setName('type')
                        .setDescription('Loại vật phẩm muốn chọn.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Cần câu', value: 'rod' },
                            { name: 'Mồi câu', value: 'bait' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('Hiển thị trợ giúp về câu cá.')),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name === 'fish') {
            const userFishing = await getUserFishing(interaction.user.id);
            if (!userFishing || !userFishing.inventory) return interaction.respond([]);
            
            let choices = userFishing.inventory
                .filter(fish => fish.quantity > 0 && fish.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
                .map(fish => ({ name: `${fish.name} (x${fish.quantity})`, value: fish.name }));

            if ('all'.includes(focusedOption.value.toLowerCase())) {
                choices.unshift({ name: 'Bán tất cả cá trong kho', value: 'all' });
            }

            await interaction.respond(choices.slice(0, 25));
        }
    },

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const config = loadConfig();

        if (subcommand === 'fish') {
            if (fishingCooldowns.has(userId)) {
                return interaction.reply({
                    content: `Bạn đang trong thời gian chờ! Vui lòng đợi ${COOLDOWN_SECONDS} giây giữa mỗi lần câu.`,
                    ephemeral: true 
                });
            }

            const locationKey = interaction.options.getString('location');
            const location = config.locations[locationKey];
            if (!location) {
                return interaction.reply({ content: 'Địa điểm không hợp lệ.', ephemeral: true });
            }

            const userFishing = await getUserFishing(userId);
            const equippedRodKey = userFishing.equippedRod;

            if (!equippedRodKey || !userFishing.rods.some(r => r.key === equippedRodKey)) {
                 return interaction.reply({ content: 'Bạn chưa có cần câu. Hãy dùng `/store` để mua một cái.', ephemeral: true });
            }

            const equippedRod = userFishing.rods.find(r => r.key === equippedRodKey);
            if (equippedRod.durability <= 0) {
                return interaction.reply({ content: `Cần câu **${equippedRod.name}** của bạn đã hỏng. Hãy dùng /fixcancau để sửa hoặc mua một cây mới tại /store.`, ephemeral: true });
            }

            fishingCooldowns.add(userId);
            setTimeout(() => {
                fishingCooldowns.delete(userId);
            }, COOLDOWN_SECONDS * 1000);

            await interaction.deferReply();

            let usedBaitKey = userFishing.equippedBait; // Use the equipped bait by default
            const availableBaits = userFishing.baits.filter(b => b.quantity > 0);

            if (availableBaits.length > 0) {
                const baitButtons = availableBaits.map(baitInInventory => {
                    const baitDetails = getBaitConfigByName(baitInInventory.name);
                    if (!baitDetails) return null;
                    return new ButtonBuilder()
                        .setCustomId(`use_bait_${baitDetails.key}`)
                        .setLabel(`Dùng ${baitInInventory.name} (còn ${baitInInventory.quantity})`)
                        .setStyle(ButtonStyle.Secondary);
                }).filter(b => b);

                const noBaitButton = new ButtonBuilder().setCustomId('no_bait').setLabel('Không dùng mồi').setStyle(ButtonStyle.Primary);
                const row = new ActionRowBuilder().addComponents(...baitButtons.slice(0, 4), noBaitButton);
                const baitMessage = await interaction.editReply({ content: 'Bạn có muốn dùng mồi câu không?', components: [row], fetchReply: true });

                try {
                    const buttonInteraction = await baitMessage.awaitMessageComponent({ filter: i => i.user.id === userId, componentType: ComponentType.Button, time: 30000 });
                    if (buttonInteraction.customId.startsWith('use_bait_')) {
                        usedBaitKey = buttonInteraction.customId.replace('use_bait_', '');
                    } else {
                        usedBaitKey = null; // Explicitly no bait
                    }
                    await buttonInteraction.update({ content: 'Đang quăng câu...', components: [] });
                } catch (error) {
                    await interaction.editReply({ content: `Hết thời gian, sử dụng mồi đã trang bị: ${usedBaitKey ? config.baits[usedBaitKey].name : 'Không có'}.`, components: [] });
                }
            }
            
            if (usedBaitKey) {
                const baitToUse = userFishing.baits.find(b => b.name === config.baits[usedBaitKey]?.name);
                if (baitToUse && baitToUse.quantity > 0) {
                    baitToUse.quantity -= 1;
                } else {
                    usedBaitKey = null;
                }
            }

            equippedRod.durability -= 1;
            const caughtFishInfo = getCatch(location, config, usedBaitKey);

            if (!caughtFishInfo) {
                await userFishing.save();
                return interaction.editReply({ content: 'Bạn không câu được gì cả. Chúc may mắn lần sau!'});
            }

            const weight = Math.random() * (caughtFishInfo.max_weight - caughtFishInfo.min_weight) + caughtFishInfo.min_weight;
            const existingFish = userFishing.inventory.find(f => f.name === caughtFishInfo.name);
            if (existingFish) {
                existingFish.totalWeight += weight;
                existingFish.quantity += 1;
            } else {
                userFishing.inventory.push({ name: caughtFishInfo.name, rarity: caughtFishInfo.rarity, totalWeight: weight, quantity: 1 });
            }

            await userFishing.save();

            const embed = new EmbedBuilder()
                .setTitle('Bạn đã câu được một con cá!')
                .setDescription(`${caughtFishInfo.emoji} **${caughtFishInfo.name}**\nNặng: ${weight.toFixed(2)}kg\nĐộ hiếm: ${caughtFishInfo.rarity}`)
                .setColor('#2ECC71')
                .setFooter({ text: `${equippedRod.name} còn ${equippedRod.durability} độ bền.` });
            
            if (usedBaitKey) {
                embed.addFields({ name: 'Mồi đã dùng', value: config.baits[usedBaitKey].name });
            }

            await interaction.editReply({ embeds: [embed] });

        } else if (subcommand === 'inventory') {
            const userFishing = await getUserFishing(userId);
            const embed = new EmbedBuilder().setTitle(`Kho đồ của ${interaction.user.username}`).setColor('#3498DB');

            let rodInfo = 'Bạn chưa có cần câu. Hãy mua tại `/store`.';
            if (userFishing.rods && userFishing.rods.length > 0) {
                rodInfo = userFishing.rods.map(r => 
                    `${r.key === userFishing.equippedRod ? '✅ ' : ''}${r.name} | Độ bền: ${r.durability}`
                ).join('\n');
            }
            embed.addFields({ name: '🎣 Cần câu', value: rodInfo });

            let baitInfo = 'Không có mồi câu.';
            if (userFishing.baits && userFishing.baits.some(b => b.quantity > 0)) {
                baitInfo = userFishing.baits.filter(b => b.quantity > 0).map(b => {
                    const baitDetails = getBaitConfigByName(b.name);
                    return `${baitDetails?.key === userFishing.equippedBait ? '✅ ' : ''}${b.name} (x${b.quantity})`;
                }).join('\n');
            }
            embed.addFields({ name: '🪱 Mồi câu', value: baitInfo });

            let fishInfo = 'Không có cá trong kho.';
            if (userFishing.inventory && userFishing.inventory.length > 0) {
                fishInfo = userFishing.inventory.map(fishInInventory => {
                    const fishDetails = Object.values(config.fish_pools).flat().find(f => f.name === fishInInventory.name);
                    const emoji = fishDetails ? fishDetails.emoji : '🐠';
                    return `${emoji} **${fishInInventory.name}** (x${fishInInventory.quantity}) - *${fishInInventory.rarity}* | TB: ${(fishInVENTORY.totalWeight / fishInVENTORY.quantity).toFixed(2)}kg`;
                }).join('\n');
            }
            embed.addFields({ name: '🐠 Kho cá', value: fishInfo });

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'sell') {
            const fishName = interaction.options.getString('fish');
            const quantityInput = interaction.options.getString('quantity');
            const userFishing = await getUserFishing(userId);
            let economyData = await EconomyUserData.findOne({ userId });
            if (!economyData) economyData = new EconomyUserData({ userId, balance: 0 });

            if (fishName.toLowerCase() === 'all') {
                if (!userFishing.inventory || userFishing.inventory.length === 0) {
                    return interaction.reply({ content: 'Bạn không có cá để bán.', ephemeral: true });
                }

                let totalGain = 0;
                for (const fishToSell of userFishing.inventory) {
                    const pricePerKg = config.rarity_prices_per_kg[fishToSell.rarity];
                    if (pricePerKg) {
                        totalGain += Math.floor(pricePerKg * fishToSell.totalWeight);
                    }
                }

                userFishing.inventory = [];
                economyData.balance += totalGain;

                await userFishing.save();
                await economyData.save();

                return interaction.reply({ content: `Bạn đã bán tất cả cá trong kho và nhận được ${totalGain} xu.` });
            } else {
                const fishToSellIndex = userFishing.inventory.findIndex(f => f.name === fishName);
                if (fishToSellIndex === -1) {
                    return interaction.reply({ content: 'Bạn không có cá này trong kho.', ephemeral: true });
                }
                
                const fishToSell = userFishing.inventory[fishToSellIndex];
                let quantity;
                if (!quantityInput || quantityInput.toLowerCase() === 'all') {
                    quantity = fishToSell.quantity;
                } else {
                    quantity = parseInt(quantityInput);
                    if (isNaN(quantity) || quantity <= 0) return interaction.reply({ content: 'Số lượng không hợp lệ.', ephemeral: true });
                    if (quantity > fishToSell.quantity) return interaction.reply({ content: `Bạn chỉ có ${fishToSell.quantity} ${fishName}.`, ephemeral: true });
                }

                const pricePerKg = config.rarity_prices_per_kg[fishToSell.rarity];
                const weightPerFish = fishToSell.totalWeight / fishToSell.quantity;
                const weightToSell = weightPerFish * quantity;
                const totalGain = Math.floor(pricePerKg * weightToSell);

                fishToSell.quantity -= quantity;
                fishToSell.totalWeight -= weightToSell;

                if (fishToSell.quantity <= 0) {
                    userFishing.inventory.splice(fishToSellIndex, 1);
                }

                economyData.balance += totalGain;

                await userFishing.save();
                await economyData.save();

                await interaction.reply({ content: `Bạn đã bán thành công ${quantity} con ${fishName} và nhận được ${totalGain} xu.` });
            }

        } else if (subcommand === 'select') {
            const type = interaction.options.getString('type');
            const userFishing = await getUserFishing(userId);

            if (type === 'rod') {
                if (!userFishing.rods || userFishing.rods.length === 0) {
                    return interaction.reply({ content: 'Bạn không sở hữu cần câu nào.', ephemeral: true });
                }

                const rodOptions = userFishing.rods.map(rod => ({
                    label: rod.name,
                    description: `Độ bền: ${rod.durability}${rod.key === userFishing.equippedRod ? ' (Đang trang bị)' : ''}`,
                    value: rod.key,
                }));

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_rod')
                    .setPlaceholder('Chọn một cần câu để trang bị')
                    .addOptions(rodOptions);

                const row = new ActionRowBuilder().addComponents(selectMenu);
                const selectMessage = await interaction.reply({ content: 'Hãy chọn cần câu bạn muốn sử dụng:', components: [row], ephemeral: true, fetchReply: true });

                const collector = selectMessage.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });
                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) return i.reply({ content: 'Đây không phải menu của bạn.', ephemeral: true });
                    const selectedRodKey = i.values[0];
                    userFishing.equippedRod = selectedRodKey;
                    await userFishing.save();
                    await i.update({ content: `Bạn đã trang bị: **${userFishing.rods.find(r => r.key === selectedRodKey).name}**.`, components: [] });
                });

            } else if (type === 'bait') {
                const availableBaits = userFishing.baits.filter(b => b.quantity > 0);
                if (availableBaits.length === 0) {
                    return interaction.reply({ content: 'Bạn không có mồi câu nào.', ephemeral: true });
                }

                const baitOptions = availableBaits.map(bait => {
                    const baitDetails = getBaitConfigByName(bait.name);
                    return {
                        label: bait.name,
                        description: `Số lượng: ${bait.quantity}`,
                        value: baitDetails?.key || 'none',
                    }
                });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_bait')
                    .setPlaceholder('Chọn mồi câu mặc định')
                    .addOptions(baitOptions);
                
                const row = new ActionRowBuilder().addComponents(selectMenu);
                const selectMessage = await interaction.reply({ content: 'Hãy chọn loại mồi bạn muốn ưu tiên sử dụng:', components: [row], ephemeral: true, fetchReply: true });

                const collector = selectMessage.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });
                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) return i.reply({ content: 'Đây không phải menu của bạn.', ephemeral: true });
                    const selectedBaitKey = i.values[0];
                    userFishing.equippedBait = selectedBaitKey;
                    await userFishing.save();
                    await i.update({ content: `Bạn đã chọn **${config.baits[selectedBaitKey].name}** làm mồi câu mặc định.`, components: [] });
                });
            }

        } else if (subcommand === 'help') {
            const embed = new EmbedBuilder()
                .setTitle('🎣 Trợ giúp câu cá')
                .setColor('#0099ff')
                .setDescription(
                    '**`/store`**: Mở cửa hàng chung để mua cần câu và mồi câu.\n' +
                    '**`/cauca fish <địa điểm>`**: Bắt đầu câu cá tại một địa điểm.\n' +
                    '**`/cauca inventory`**: Xem các vật phẩm, mồi và cá bạn đang có.\n' +
                    '**`/cauca select <loại>`**: Chọn cần câu hoặc mồi câu để trang bị.\n' +
                    '**`/cauca sell <tên cá|all> [số lượng]`**: Bán cá để kiếm xu.\n' +
                    '**`/fixcancau`**: Sửa cần câu của bạn (chỉ khi độ bền dưới 30%).\n' +
                    '**`/leaderboard cauca`**: Xem bảng xếp hạng những người câu cá hàng đầu.\n' +
                    '**`/cauca help`**: Hiển thị tin nhắn này.'
                )
                .setFooter({text: 'Chúc bạn câu được nhiều cá hiếm!'});

            await interaction.reply({ embeds: [embed] });
        }
    },
};