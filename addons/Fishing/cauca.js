const {
    SlashCommandBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { loadConfig: loadFishingConfig, getUserFishing } = require('./fishingUtils');
const EconomyUserData = require('../../models/EconomyUserData');
const UserData = require('../../models/UserData');
const { getConfig } = require('../../utils/configLoader');
const { loadLang } = require('../../utils/langLoader');
const { checkActiveBooster } = require('../../commands/Fun/Economy/Utility/helpers');

const HOURLY_FISH_PATH = path.join(__dirname, 'current_hourly.json');
const fishingCooldowns = new Map();
const COOLDOWN_SECONDS = 5;

// ============================================
// UTILITY FUNCTIONS
// ============================================

const RARITY_COLORS = {
    common: '#95A5A6',
    uncommon: '#2ECC71',
    rare: '#3498DB',
    epic: '#9B59B6',
    legendary: '#F1C40F'
};

const RARITY_EMOJIS = {
    common: '⚪',
    uncommon: '🟢',
    rare: '🔵',
    epic: '🟣',
    legendary: '🟡'
};

function getRarityDisplay(rarity) {
    return `${RARITY_EMOJIS[rarity]} **${rarity.toUpperCase()}**`;
}

function formatWeight(weight) {
    return `${weight.toFixed(2)}kg`;
}

function formatCurrency(amount) {
    return `${amount.toLocaleString()} xu`;
}

function createProgressBar(current, max, length = 10) {
    const percentage = Math.min(current / max, 1);
    const filled = Math.floor(percentage * length);
    const empty = length - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percent = Math.floor(percentage * 100);

    return `${bar} ${percent}%`;
}

async function handleLevelUp(interaction, user, xpGained) {
    try {
        const mainConfig = getConfig();
        const mainLang = getLang();

        if (!mainConfig || !mainConfig.LevelingSystem || !mainConfig.LevelingSystem.Enabled) {
            return;
        }

        let userData = await UserData.findOne({ userId: user.id, guildId: interaction.guild.id });
        if (!userData) {
            userData = await UserData.create({ userId: user.id, guildId: interaction.guild.id });
        }

        userData.xp += xpGained;
        const xpNeeded = userData.level === 0 ? 70 : userData.level * mainConfig.LevelingSystem.XPNeeded;

        if (userData.xp >= xpNeeded) {
            userData.xp -= xpNeeded;
            userData.level++;
            const newLevel = userData.level;

            let channel = interaction.channel;
            if (mainConfig.LevelingSystem.ChannelSettings?.LevelUpChannelID &&
                mainConfig.LevelingSystem.ChannelSettings.LevelUpChannelID !== 'CHANNEL_ID') {
                const configuredChannel = interaction.guild.channels.cache.get(
                    mainConfig.LevelingSystem.ChannelSettings.LevelUpChannelID
                );
                if (configuredChannel) channel = configuredChannel;
            }

            // Fallback message if mainLang is not properly configured
            let levelUpMessage = `🎉 Chúc mừng ${user.toString()}! Bạn đã lên cấp **${newLevel}**!`;

            if (mainLang && mainLang.Levels && mainLang.Levels.LevelUpMessage) {
                levelUpMessage = mainLang.Levels.LevelUpMessage
                    .replace(/{user}/g, user.toString())
                    .replace(/{newLevel}/g, newLevel);
            }

            if (channel) {
                await channel.send(levelUpMessage).catch(err => {
                    console.error('[Fishing] Failed to send level up message:', err);
                });
            }
        }

        await userData.save();
    } catch (error) {
        console.error('[Fishing] Error in handleLevelUp:', error);
        // Don't throw error, just log it so fishing can continue
    }
}

function getBaitConfigByName(baitName) {
    const config = loadFishingConfig();
    for (const key in config.baits) {
        if (config.baits[key].name === baitName) {
            return { key, ...config.baits[key] };
        }
    }
    return null;
}

function getCatch(location, config, usedBaitKey, rodLuck = 0, rodEffects = {}) {
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    let chances = { ...config.rarity_chances };

    // Get bait luck
    let baitLuck = 0;
    if (usedBaitKey && config.baits[usedBaitKey]) {
        baitLuck = config.baits[usedBaitKey].luck || 0;
    }

    // Calculate total luck
    const totalLuck = rodLuck + baitLuck;

    // Apply rod effects
    if (rodEffects) {
        for (const rarity in rodEffects) {
            if (chances[rarity]) {
                chances[rarity] *= (1 + rodEffects[rarity]);
            }
        }
    }

    // Apply total luck
    if (totalLuck > 0) {
        chances['uncommon'] *= (1 + totalLuck * 0.5);
        chances['rare'] *= (1 + totalLuck * 1.5);
        chances['epic'] *= (1 + totalLuck * 2);
        chances['legendary'] *= (1 + totalLuck * 3);
    }

    // Normalize chances
    let totalChance = Object.values(chances).reduce((a, b) => a + b, 0);
    for (const rarity in chances) {
        chances[rarity] /= totalChance;
    }

    // Apply bait effects (Attracts)
    if (usedBaitKey && config.baits[usedBaitKey]) {
        const baitInfo = config.baits[usedBaitKey];

        if (baitInfo.attracts) {
            const bonus = Math.random() * (baitInfo.bonus[1] - baitInfo.bonus[0]) + baitInfo.bonus[0];
            let totalAttractedChance = 0;
            baitInfo.attracts.forEach(r => {
                if (chances[r]) totalAttractedChance += chances[r];
            });

            if (totalAttractedChance > 0) {
                baitInfo.attracts.forEach(r => {
                    if (chances[r]) chances[r] += (chances[r] / totalAttractedChance) * bonus;
                });
                const nonAttractedRarities = Object.keys(chances).filter(r => !baitInfo.attracts.includes(r));
                let totalNonAttractedChance = 0;
                nonAttractedRarities.forEach(r => totalNonAttractedChance += chances[r]);
                if (totalNonAttractedChance > 0) {
                    nonAttractedRarities.forEach(r => {
                        const decrease = (chances[r] / totalNonAttractedChance) * bonus;
                        chances[r] = Math.max(0, chances[r] - decrease);
                    });
                }
            }
        }

        // Re-normalize after bait
        totalChance = Object.values(chances).reduce((a, b) => a + b, 0);
        if (totalChance > 0) {
            for (const rarity in chances) {
                chances[rarity] /= totalChance;
            }
        }
    }

    // Determine catch
    const randomNumber = Math.random();
    let cumulativeChance = 0;
    for (const rarity of rarities) {
        cumulativeChance += chances[rarity];
        if (randomNumber < cumulativeChance) {
            let fishPool = [];

            // Check hourly fish for epic/legendary
            if (rarity === 'legendary' || rarity === 'epic') {
                try {
                    const hourlyData = JSON.parse(fs.readFileSync(HOURLY_FISH_PATH, 'utf8'));
                    if (location.fish.includes(hourlyData[rarity].name)) {
                        return { ...hourlyData[rarity], rarity: rarity };
                    }
                } catch (error) { /* Fall through */ }
            }

            fishPool = config.fish_pools[rarity]?.filter(fish =>
                location.fish.includes(fish.name)
            ) || [];

            if (fishPool.length > 0) {
                const foundFish = fishPool[Math.floor(Math.random() * fishPool.length)];
                return { ...foundFish, rarity: rarity };
            }
        }
    }

    // Fallback to common
    const commonFish = config.fish_pools.common.filter(fish =>
        location.fish.includes(fish.name)
    );
    if (commonFish.length > 0) {
        const foundFish = commonFish[Math.floor(Math.random() * commonFish.length)];
        return { ...foundFish, rarity: 'common' };
    }

    return null;
}

// ============================================
// SUBCOMMAND HANDLERS
// ============================================

async function handleFish(interaction, config) {
    const userId = interaction.user.id;

    // Check cooldown
    const cooldownData = fishingCooldowns.get(userId);
    if (cooldownData && Date.now() < cooldownData) {
        const remaining = Math.ceil((cooldownData - Date.now()) / 1000);
        return interaction.reply({
            content: fishingLang.Errors.Cooldown.replace('{time}', remaining.toFixed(1)),
            ephemeral: true
        });
    }

    let locationKey = interaction.options.getString('location');
    if (!locationKey) {
        locationKey = Object.keys(config.locations)[0];
    }
    const location = config.locations[locationKey];

    const equippedRodKey = userFishing.equippedRod;

    // Check rod
    if (!equippedRodKey || !userFishing.rods.some(r => r.key === equippedRodKey)) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#E74C3C')
                .setDescription(fishingLang.Errors.NoRod)
            ],
            ephemeral: true
        });
    }

    const equippedRod = userFishing.rods.find(r => r.key === equippedRodKey);
    if (equippedRod.durability <= 0) {
        const brokenEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle(fishingLang.Errors.RodBrokenTitle)
            .setDescription(fishingLang.Errors.RodBrokenDesc.replace('{rod}', equippedRod.name));

        return interaction.reply({ embeds: [brokenEmbed], ephemeral: true });
    }

    // Set cooldown
    fishingCooldowns.set(userId, Date.now() + (COOLDOWN_SECONDS * 1000));

    await interaction.deferReply();

    // Bait selection
    let usedBaitKey = userFishing.equippedBait;
    const availableBaits = userFishing.baits.filter(b => b.quantity > 0);

    if (availableBaits.length > 0) {
        const baitButtons = availableBaits.slice(0, 4).map(baitInInventory => {
            const baitDetails = getBaitConfigByName(baitInInventory.name);
            if (!baitDetails) return null;
            return new ButtonBuilder()
                .setCustomId(`use_bait_${baitDetails.key}`)
                .setLabel(`${baitInInventory.name} (${baitInInventory.quantity})`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🪱');
        }).filter(b => b);

        const noBaitButton = new ButtonBuilder()
            .setCustomId('no_bait')
            .setLabel(fishingLang.UI.NoBaitButton)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('❌');

        const row = new ActionRowBuilder().addComponents(...baitButtons, noBaitButton);

        const baitEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle(fishingLang.UI.SelectBaitTitle)
            .setDescription(fishingLang.UI.SelectBaitDesc)
            .setFooter({ text: fishingLang.UI.SelectBaitFooter });

        const baitMessage = await interaction.editReply({
            embeds: [baitEmbed],
            components: [row],
            fetchReply: true
        });

        try {
            const buttonInteraction = await baitMessage.awaitMessageComponent({
                filter: i => i.user.id === userId,
                componentType: ComponentType.Button,
                time: 30000
            });

            if (buttonInteraction.customId.startsWith('use_bait_')) {
                usedBaitKey = buttonInteraction.customId.replace('use_bait_', '');
            } else {
                usedBaitKey = null;
            }

            const fishingEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setDescription(fishingLang.UI.CastingLine);

            await buttonInteraction.update({ embeds: [fishingEmbed], components: [] });
        } catch (error) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setDescription(fishingLang.UI.Timeout.replace('{bait}', usedBaitKey ? config.baits[usedBaitKey].name : 'Không có'));

            await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
        }
    }

    // Use bait
    if (usedBaitKey) {
        const baitToUse = userFishing.baits.find(b => b.name === config.baits[usedBaitKey]?.name);
        if (baitToUse && baitToUse.quantity > 0) {
            baitToUse.quantity -= 1;
        } else {
            usedBaitKey = null;
        }
    }

    // Decrease rod durability
    equippedRod.durability -= 1;

    // Get catch
    const rodConfig = config.rods[equippedRodKey];
    const rodLuck = rodConfig ? rodConfig.luck : 0;
    const rodEffects = rodConfig ? rodConfig.effects : {};
    const caughtFishInfo = getCatch(location, config, usedBaitKey, rodLuck, rodEffects);

    if (!caughtFishInfo) {
        await userFishing.save();

        const failEmbed = new EmbedBuilder()
            .setColor('#95A5A6')
            .setTitle(fishingLang.UI.NoCatchTitle)
            .setDescription(fishingLang.UI.NoCatchDesc)
            .setFooter({ text: fishingLang.UI.NoCatchFooter.replace('{rod}', equippedRod.name).replace('{durability}', equippedRod.durability) });

        return interaction.editReply({ embeds: [failEmbed] });
    }

    // Add fish to inventory
    const weight = Math.random() * (caughtFishInfo.max_weight - caughtFishInfo.min_weight) +
        caughtFishInfo.min_weight;

    const existingFish = userFishing.inventory.find(f => f.name === caughtFishInfo.name);
    if (existingFish) {
        existingFish.totalWeight += weight;
        existingFish.quantity += 1;
    } else {
        userFishing.inventory.push({
            name: caughtFishInfo.name,
            rarity: caughtFishInfo.rarity,
            totalWeight: weight,
            quantity: 1
        });
    }

    // Calculate XP
    const xpGained = config.xp_per_rarity[caughtFishInfo.rarity] || 0;
    const userData = await UserData.findOne({
        userId: interaction.user.id,
        guildId: interaction.guild.id
    });
    const xpMultiplier = userData ? checkActiveBooster(userData, 'XPRate') : 1;
    const finalXp = Math.floor(xpGained * xpMultiplier);

    await handleLevelUp(interaction, interaction.user, finalXp);
    await userFishing.save();

    // Create success embed
    const successEmbed = new EmbedBuilder()
        .setColor(RARITY_COLORS[caughtFishInfo.rarity])
        .setTitle(fishingLang.UI.SuccessTitle)
        .setDescription(`${caughtFishInfo.emoji} **${caughtFishInfo.name}**`)
        .addFields(
            { name: fishingLang.UI.Weight, value: formatWeight(weight), inline: true },
            { name: fishingLang.UI.Rarity, value: getRarityDisplay(caughtFishInfo.rarity), inline: true },
            { name: fishingLang.UI.XPGained, value: `+${finalXp} XP`, inline: true }
        )
        .setFooter({
            text: `${equippedRod.name} | ${createProgressBar(equippedRod.durability, rodConfig.durability)} (${equippedRod.durability}/${rodConfig.durability})`
        })
        .setTimestamp();

    if (usedBaitKey) {
        successEmbed.addFields({
            name: fishingLang.UI.BaitUsed,
            value: config.baits[usedBaitKey].name,
            inline: true
        });
    }

    await interaction.editReply({ embeds: [successEmbed] });
}

async function handleInventory(interaction, config) {
    const userFishing = await getUserFishing(interaction.user.id);
    const lang = loadLang(interaction.guild.id);
    const fishingLang = lang.Addons.Fishing;

    const embed = new EmbedBuilder()
        .setTitle(fishingLang.UI.InventoryTitle.replace('{user}', interaction.user.username))
        .setColor('#3498DB')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

    // Rods section
    let rodInfo = `\`\`\`\n${fishingLang.UI.NoRodStatus}\n\`\`\``;
    if (userFishing.rods && userFishing.rods.length > 0) {
        rodInfo = userFishing.rods.map(r => {
            const rodConfig = config.rods[r.key];
            const durabilityBar = createProgressBar(r.durability, rodConfig?.durability || 100, 8);
            const equipped = r.key === userFishing.equippedRod ? '✅ ' : '⬜ ';
            return `${equipped}**${r.name}**\n${durabilityBar} (${r.durability})`;
        }).join('\n\n');
    }
    embed.addFields({ name: fishingLang.UI.RodHeader, value: rodInfo });

    // Baits section
    let baitInfo = `\`\`\`\n${fishingLang.UI.NoBaitStatus}\n\`\`\``;
    if (userFishing.baits && userFishing.baits.some(b => b.quantity > 0)) {
        baitInfo = userFishing.baits.filter(b => b.quantity > 0).map(b => {
            const baitDetails = getBaitConfigByName(b.name);
            const equipped = baitDetails?.key === userFishing.equippedBait ? '✅' : '⬜';
            return `${equipped} **${b.name}** × ${b.quantity}`;
        }).join('\n');
    }
    embed.addFields({ name: fishingLang.UI.BaitHeader, value: baitInfo });

    // Fish inventory
    let fishInfo = `\`\`\`\n${fishingLang.UI.EmptyFishInventory}\n\`\`\``;
    if (userFishing.inventory && userFishing.inventory.length > 0) {
        const sortedFish = userFishing.inventory.sort((a, b) => {
            const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
            return rarityOrder[a.rarity] - rarityOrder[b.rarity];
        });

        fishInfo = sortedFish.slice(0, 15).map(fish => {
            const fishDetails = Object.values(config.fish_pools).flat()
                .find(f => f.name === fish.name);
            const avgWeight = fish.totalWeight / fish.quantity;
            return `${fishDetails?.emoji || '🐟'} **${fish.name}** ${RARITY_EMOJIS[fish.rarity]}\n` +
                `└ × ${fish.quantity} | Avg: ${formatWeight(avgWeight)}`;
        }).join('\n');

        if (userFishing.inventory.length > 15) {
            fishInfo += fishingLang.UI.MoreFish.replace('{count}', userFishing.inventory.length - 15);
        }
    }
    embed.addFields({ name: fishingLang.UI.FishHeader, value: fishInfo });

    await interaction.reply({ embeds: [embed] });
}

async function handleSell(interaction, config) {
    const fishName = interaction.options.getString('fish');
    const quantityInput = interaction.options.getString('quantity');
    const userFishing = await getUserFishing(interaction.user.id);
    const lang = loadLang(interaction.guild.id);
    const fishingLang = lang.Addons.Fishing;

    let economyData = await EconomyUserData.findOne({ userId: interaction.user.id });
    if (!economyData) economyData = await EconomyUserData.create({ userId: interaction.user.id, balance: 0 });

    if (fishName.toLowerCase() === 'all') {
        if (!userFishing.inventory || userFishing.inventory.length === 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setDescription(fishingLang.Errors.NoFishToSell)
                ],
                ephemeral: true
            });
        }

        let totalGain = 0;
        const soldFish = [];

        for (const fish of userFishing.inventory) {
            const pricePerKg = config.rarity_prices_per_kg[fish.rarity];
            if (pricePerKg) {
                const gain = Math.floor(pricePerKg * fish.totalWeight);
                totalGain += gain;
                soldFish.push({ ...fish, gain });
            }
        }

        userFishing.inventory = [];
        economyData.balance += totalGain;

        await userFishing.save();
        await economyData.save();

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle(fishingLang.UI.SellSuccessTitle)
            .setDescription(fishingLang.UI.SellAllDesc)
            .addFields(
                { name: fishingLang.UI.TotalIncome, value: formatCurrency(totalGain), inline: true },
                { name: fishingLang.UI.SpeciesCount, value: `${soldFish.length}`, inline: true },
                { name: fishingLang.UI.NewBalance, value: formatCurrency(economyData.balance), inline: true }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    } else {
        const fishIndex = userFishing.inventory.findIndex(f => f.name === fishName);
        if (fishIndex === -1) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setDescription(fishingLang.Errors.NoFishInInventory)
                ],
                ephemeral: true
            });
        }

        const fish = userFishing.inventory[fishIndex];
        let quantity = quantityInput && !isNaN(parseInt(quantityInput))
            ? parseInt(quantityInput)
            : fish.quantity;

        if (quantity <= 0 || quantity > fish.quantity) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setDescription(fishingLang.Errors.InvalidQuantity.replace('{quantity}', fish.quantity))
                ],
                ephemeral: true
            });
        }

        const pricePerKg = config.rarity_prices_per_kg[fish.rarity];
        const weightPerFish = fish.totalWeight / fish.quantity;
        const weightToSell = weightPerFish * quantity;
        const totalGain = Math.floor(pricePerKg * weightToSell);

        fish.quantity -= quantity;
        fish.totalWeight -= weightToSell;

        if (fish.quantity <= 0) {
            userFishing.inventory.splice(fishIndex, 1);
        }

        economyData.balance += totalGain;

        await userFishing.save();
        await economyData.save();

        const fishDetails = Object.values(config.fish_pools).flat()
            .find(f => f.name === fishName);

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle(fishingLang.UI.SellSuccessTitle)
            .setDescription(`${fishDetails?.emoji || '🐟'} **${fishName}** ${RARITY_EMOJIS[fish.rarity]}`)
            .addFields(
                { name: fishingLang.UI.Quantity, value: `${quantity}`, inline: true },
                { name: fishingLang.UI.TotalWeight, value: formatWeight(weightToSell), inline: true },
                { name: fishingLang.UI.TotalIncome, value: formatCurrency(totalGain), inline: true },
                { name: fishingLang.UI.NewBalance, value: formatCurrency(economyData.balance), inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}

async function handleSelect(interaction, config) {
    const type = interaction.options.getString('type');
    const userFishing = await getUserFishing(interaction.user.id);
    const lang = loadLang(interaction.guild.id);
    const fishingLang = lang.Addons.Fishing;

    if (type === 'rod') {
        if (!userFishing.rods || userFishing.rods.length === 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setDescription(fishingLang.Errors.NoRodsOwned)
                ],
                ephemeral: true
            });
        }

        const rodOptions = userFishing.rods.map(rod => {
            const rodConfig = config.rods[rod.key];
            const isEquipped = rod.key === userFishing.equippedRod;
            return {
                label: rod.name,
                description: `Độ bền: ${rod.durability}/${rodConfig?.durability || 100}${isEquipped ? ' ✅' : ''}`,
                value: rod.key,
                emoji: '🎣'
            };
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_rod')
            .setPlaceholder(fishingLang.UI.SelectRodPlaceholder)
            .addOptions(rodOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle(fishingLang.UI.SelectRodTitle)
            .setDescription(fishingLang.UI.SelectRodDesc);

        const selectMessage = await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true,
            fetchReply: true
        });

        const collector = selectMessage.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: fishingLang.Errors.NotYourMenu, ephemeral: true });
            }

            const selectedRodKey = i.values[0];
            userFishing.equippedRod = selectedRodKey;
            await userFishing.save();

            const selectedRod = userFishing.rods.find(r => r.key === selectedRodKey);
            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setDescription(fishingLang.UI.EquippedRodConfig.replace('{rod}', selectedRod.name));

            await i.update({ embeds: [successEmbed], components: [] });
        });

    } else if (type === 'bait') {
        const availableBaits = userFishing.baits.filter(b => b.quantity > 0);
        if (availableBaits.length === 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setDescription(fishingLang.Errors.NoBait)
                ],
                ephemeral: true
            });
        }

        const baitOptions = availableBaits.map(bait => {
            const baitDetails = getBaitConfigByName(bait.name);
            const isEquipped = baitDetails?.key === userFishing.equippedBait;
            return {
                label: bait.name,
                description: `Số lượng: ${bait.quantity}${isEquipped ? ' ✅' : ''}`,
                value: baitDetails?.key || 'none',
                emoji: '🪱'
            }
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_bait')
            .setPlaceholder(fishingLang.UI.SelectBaitPlaceholder)
            .addOptions(baitOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle(fishingLang.UI.SelectBaitConfigTitle)
            .setDescription(fishingLang.UI.SelectBaitConfigDesc);

        const selectMessage = await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true,
            fetchReply: true
        });

        const collector = selectMessage.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: fishingLang.Errors.NotYourMenu, ephemeral: true });
            }

            const selectedBaitKey = i.values[0];
            userFishing.equippedBait = selectedBaitKey;
            await userFishing.save();

            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setDescription(fishingLang.UI.EquippedBaitConfig.replace('{bait}', config.baits[selectedBaitKey].name));

            await i.update({ embeds: [successEmbed], components: [] });
        });
    }
}

async function handleHelp(interaction) {
    const lang = loadLang(interaction.guild.id);
    const fishingLang = lang.Addons.Fishing;

    const embed = new EmbedBuilder()
        .setTitle(fishingLang.Help.Title)
        .setColor('#0099ff')
        .setDescription(fishingLang.Help.Desc)
        .addFields(
            {
                name: fishingLang.Help.Fields.Fish.Name,
                value: fishingLang.Help.Fields.Fish.Value,
                inline: false
            },
            {
                name: fishingLang.Help.Fields.Inventory.Name,
                value: fishingLang.Help.Fields.Inventory.Value,
                inline: false
            },
            {
                name: fishingLang.Help.Fields.Economy.Name,
                value: fishingLang.Help.Fields.Economy.Value,
                inline: false
            },
            {
                name: fishingLang.Help.Fields.Stats.Name,
                value: fishingLang.Help.Fields.Stats.Value,
                inline: false
            },
            {
                name: fishingLang.Help.Fields.Rarity.Name,
                value: fishingLang.Help.Fields.Rarity.Value
                    .replace('{common}', RARITY_EMOJIS.common)
                    .replace('{uncommon}', RARITY_EMOJIS.uncommon)
                    .replace('{rare}', RARITY_EMOJIS.rare)
                    .replace('{epic}', RARITY_EMOJIS.epic)
                    .replace('{legendary}', RARITY_EMOJIS.legendary),
                inline: false
            },
            {
                name: fishingLang.Help.Fields.Tips.Name,
                value: fishingLang.Help.Fields.Tips.Value,
                inline: false
            }
        )
        .setFooter({ text: fishingLang.Help.Footer })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}


// ============================================
// MAIN COMMAND EXPORT
// ============================================

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cauca')
        .setDescription('Các lệnh liên quan đến câu cá.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('fish')
                .setDescription('Câu cá tại một địa điểm.')
                .addStringOption(option => {
                    const config = loadFishingConfig();
                    const choices = Object.keys(config.locations).map(loc => ({
                        name: config.locations[loc].name,
                        value: loc
                    }));
                    return option
                        .setName('location')
                        .setDescription('Địa điểm câu cá.')
                        .setRequired(false)
                        .addChoices(...choices);
                }))
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('Hiển thị kho đồ câu cá của bạn.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                .setDescription('Bán cá trong kho.')
                .addStringOption(option =>
                    option
                        .setName('fish')
                        .setDescription('Loại cá muốn bán (hoặc gõ "all").')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option
                        .setName('quantity')
                        .setDescription('Số lượng (để trống nếu bán tất cả cá đó)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('select')
                .setDescription('Chọn cần câu hoặc mồi câu để sử dụng.')
                .addStringOption(option =>
                    option
                        .setName('type')
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
            if (!userFishing || !userFishing.inventory) {
                return interaction.respond([]);
            }

            let choices = userFishing.inventory
                .filter(fish =>
                    fish.quantity > 0 &&
                    fish.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                )
                .map(fish => ({
                    name: `${fish.name} (x${fish.quantity}) ${RARITY_EMOJIS[fish.rarity]}`,
                    value: fish.name
                }));

            if ('all'.includes(focusedOption.value.toLowerCase())) {
                choices.unshift({
                    name: '💰 Bán tất cả cá trong kho',
                    value: 'all'
                });
            }

            await interaction.respond(choices.slice(0, 25));
        }
    },

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const config = loadFishingConfig();
        const lang = loadLang(interaction.guild.id);
        const fishingLang = lang.Addons.Fishing;

        try {
            switch (subcommand) {
                case 'fish':
                    await handleFish(interaction, config);
                    break;
                case 'inventory':
                    await handleInventory(interaction, config);
                    break;
                case 'sell':
                    await handleSell(interaction, config);
                    break;
                case 'select':
                    await handleSelect(interaction, config);
                    break;
                case 'help':
                    await handleHelp(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: fishingLang.Errors.InvalidCommand,
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('[Fishing Command Error]:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('❌ Error')
                .setDescription(fishingLang.Errors.GenericError);

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errorEmbed], components: [] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};