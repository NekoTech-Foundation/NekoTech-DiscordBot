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
const { getWeather } = require('./WeatherService');
const { checkTournamentCatch } = require('./tournament');
const { loadConfig: loadFishingConfig, getUserFishing } = require('./fishingUtils');


const EconomyUserData = require('../../../models/EconomyUserData');
const UserData = require('../../../models/UserData');
const { getConfig } = require('../../../utils/configLoader');
const { getLang } = require('../../../utils/langLoader');
const { checkActiveBooster } = require('../../../commands/Fun/Economy/Utility/helpers');

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

function safeNum(val, fallback = 0) {
    const n = Number(val);
    return isNaN(n) || !isFinite(n) ? fallback : n;
}

function formatWeight(weight) {
    return `${safeNum(weight).toFixed(2)}kg`;
}

function formatCurrency(amount) {
    return `${safeNum(amount).toLocaleString()} xu`;
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
        const scalingBase = mainConfig.LevelingSystem.XPScaling?.Base || 2500;
        const scalingIncrement = mainConfig.LevelingSystem.XPScaling?.Increment || 2500;
        const prestigeMult = mainConfig.LevelingSystem.XPScaling?.PrestigeMultiplier || 1.5;

        let xpNeeded = scalingBase + (userData.level * scalingIncrement);
        if (userData.prestige && userData.prestige > 0) {
            xpNeeded = Math.floor(xpNeeded * Math.pow(prestigeMult, userData.prestige));
        }

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

    // Get bait config
    let baitLuck = 0;
    let baitInfo = null;
    if (usedBaitKey && config.baits[usedBaitKey]) {
        baitInfo = config.baits[usedBaitKey];
        baitLuck = baitInfo.luck || 0;
    }

    // Total luck (capped at 0.5 for sanity)
    const totalLuck = Math.min(rodLuck + baitLuck, 0.5);

    // === UNIFIED FORMULA ===
    // For each rarity: finalChance = base × (1 + rodEffect) × (1 + locationMod) × (1 + baitBonus) + luckFlat

    // 1. Rod Effects (specific rarity multipliers)
    if (rodEffects) {
        for (const rarity in rodEffects) {
            if (chances[rarity]) {
                chances[rarity] *= (1 + rodEffects[rarity]);
            }
        }
    }

    // 2. Location Modifiers
    const locationMod = location.rarity_modifier || {};
    for (const rarity in locationMod) {
        if (chances[rarity]) {
            chances[rarity] *= (1 + locationMod[rarity]);
            chances[rarity] = Math.max(0, chances[rarity]);
        }
    }

    // 3. Bait Attract Bonus (targeted rarity boost)
    if (baitInfo && baitInfo.attracts) {
        const bonus = Math.random() * (baitInfo.bonus[1] - baitInfo.bonus[0]) + baitInfo.bonus[0];
        baitInfo.attracts.forEach(r => {
            if (chances[r]) chances[r] *= (1 + bonus);
        });
    }

    // 4. Flat Luck Boost for rare+ (capped at 5% total shift)
    if (totalLuck > 0) {
        const boostPerTier = Math.min(totalLuck * 0.03, 0.05);
        chances.legendary += boostPerTier;
        chances.epic += boostPerTier;
        chances.rare += boostPerTier;
    }

    // 5. Single Normalization
    let totalChance = Object.values(chances).reduce((a, b) => a + b, 0);
    if (totalChance > 0) {
        for (const rarity in chances) {
            chances[rarity] /= totalChance;
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

async function handleFish(interaction, config, fishingLang) {
    const userId = interaction.user.id;

    // Check cooldown
    const cooldownData = fishingCooldowns.get(userId);
    if (cooldownData && Date.now() < cooldownData) {
        const remaining = Math.ceil((cooldownData - Date.now()) / 1000);
        await interaction.deferReply({ ephemeral: true });
        return interaction.editReply({
            content: fishingLang.Errors.Cooldown.replace('{time}', remaining.toFixed(1))
        });
    }

    await interaction.deferReply();

    let locationKey = interaction.options.getString('location');
    let location;

    if (!locationKey) {
        locationKey = Object.keys(config.locations)[0];
        location = config.locations[locationKey];
    } else {
        // 1. Try Key
        location = config.locations[locationKey];

        // 2. Try Name (Case insensitive)
        if (!location) {
            const lowerKey = locationKey.toLowerCase();
            location = Object.values(config.locations).find(loc => loc.name.toLowerCase() === lowerKey);
        }

        // 3. Try Partial Name matching (for cases like "Dai Duong" vs "Đại Dương" or just "Dai")
        if (!location) {
            const lowerKey = locationKey.toLowerCase();
            location = Object.values(config.locations).find(loc => loc.name.toLowerCase().includes(lowerKey));
        }
    }

    if (!location) {
        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#E74C3C')
                .setDescription(`❌ Không tìm thấy địa điểm **${locationKey}**. Vui lòng chọn địa điểm hợp lệ.`)
            ]
        });
    }

    const userFishing = await getUserFishing(userId);
    const equippedRodKey = userFishing.equippedRod;

    // Check rod
    if (!equippedRodKey || !userFishing.rods.some(r => r.key === equippedRodKey)) {
        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#E74C3C')
                .setDescription(fishingLang.Errors.NoRod)
            ]
        });
    }

    const equippedRod = userFishing.rods.find(r => r.key === equippedRodKey);

    if (equippedRod.durability <= 0) {
        const brokenEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle(fishingLang.Errors.RodBrokenTitle)
            .setDescription(fishingLang.Errors.RodBrokenDesc.replace('{rod}', equippedRod.name));

        return interaction.editReply({ embeds: [brokenEmbed] });
    }

    // Set cooldown
    fishingCooldowns.set(userId, Date.now() + (COOLDOWN_SECONDS * 1000));

    // Bait selection
    let usedBaitKey = userFishing.equippedBait;
    const availableBaits = userFishing.baits.filter(b => b.quantity > 0);

    // Always use Select Menu if there are baits, for consistency and capacity
    if (availableBaits.length > 0) {
        // Prepare options for Select Menu
        const baitOptions = availableBaits.slice(0, 25).map(baitInInventory => {
            const baitDetails = getBaitConfigByName(baitInInventory.name);
            if (!baitDetails) return null;
            const isEquipped = baitDetails.key === usedBaitKey;
            return {
                label: `${baitInInventory.name} (${baitInInventory.quantity})`,
                description: isEquipped ? 'Đang trang bị' : 'Chọn để sử dụng',
                value: baitDetails.key,
                emoji: '🪱',
                default: isEquipped
            };
        }).filter(b => b);

        if (baitOptions.length > 0) {
            // Add "No Bait" option
            baitOptions.unshift({
                label: fishingLang.UI.NoBaitButton || 'Không dùng mồi',
                description: 'Câu cá không cần mồi',
                value: 'no_bait',
                emoji: '❌'
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_bait_action')
                .setPlaceholder('Chọn mồi câu...')
                .addOptions(baitOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);

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
                const selectionInteraction = await baitMessage.awaitMessageComponent({
                    filter: i => i.user.id === userId,
                    componentType: ComponentType.StringSelect,
                    time: 30000
                });

                const selectedValue = selectionInteraction.values[0];
                if (selectedValue === 'no_bait') {
                    usedBaitKey = null;
                } else {
                    usedBaitKey = selectedValue;
                }

                const fishingEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setDescription(fishingLang.UI.CastingLine);

                await selectionInteraction.update({ embeds: [fishingEmbed], components: [] });
            } catch (error) {
                // Timeout or error
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setDescription(fishingLang.UI.Timeout.replace('{bait}', usedBaitKey ? (config.baits[usedBaitKey]?.name || 'Không có') : 'Không có'));

                // If timed out, proceed with currently equipped/default bait
                await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }
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

    // ROD SNAP MECHANIC
    // 0.5% chance to snap
    const snapChance = 0.005;
    const isSnapped = Math.random() < snapChance;

    const caughtFishInfoRaw = getCatch(location, config, usedBaitKey, rodLuck, rodEffects);

    // === HIDDEN PITY SYSTEM ===
    // Track consecutive casts without hitting guaranteed rarity
    const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
    const pityConfig = rodConfig?.pity;
    let caughtFishInfo = caughtFishInfoRaw;

    if (pityConfig && caughtFishInfo) {
        const minRank = rarityRank[pityConfig.min_rarity] || 0;
        const catchRank = rarityRank[caughtFishInfo.rarity] || 0;

        // Initialize pity counter if not present
        if (typeof equippedRod.pityCounter !== 'number') {
            equippedRod.pityCounter = 0;
        }

        if (catchRank >= minRank) {
            // Got a good catch — reset counter
            equippedRod.pityCounter = 0;
        } else {
            equippedRod.pityCounter += 1;

            // Threshold reached — force guaranteed rarity
            if (equippedRod.pityCounter >= pityConfig.threshold) {
                const forcedRarity = pityConfig.min_rarity;
                const forcedPool = config.fish_pools[forcedRarity]?.filter(fish =>
                    location.fish.includes(fish.name)
                ) || [];

                if (forcedPool.length > 0) {
                    const forcedFish = forcedPool[Math.floor(Math.random() * forcedPool.length)];
                    caughtFishInfo = { ...forcedFish, rarity: forcedRarity };
                }
                equippedRod.pityCounter = 0;
            }
        }
    }

    // Animation frames generator
    const createFishingEmbed = (title, desc, color) => new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setDescription(desc)
        .setFooter({ text: 'Đang câu...' });

    // Handle Rod Snap
    if (isSnapped) {
        // ... (Snap logic remains same, maybe enhance color/title)
        const snapFrames = [
            { title: 'Quăng dây...', color: '#3498DB', desc: "🎣 🌊 🌊 🌊" },
            { title: 'Đang chờ...', color: '#3498DB', desc: "🎣 🌊 🐟 🌊" },
            { title: 'CÓ BIẾN!', color: '#F1C40F', desc: "🎣 🌊 🐟 ❗" },
            { title: 'GÃY CẦN RỒI!', color: '#E74C3C', desc: "🎣 🌊 💥 😱" },
            { title: 'Xong phim...', color: '#2C3E50', desc: "🎣 🧵 🌊" }
        ];

        await interaction.editReply({ content: null, embeds: [createFishingEmbed(snapFrames[0].title, snapFrames[0].desc, snapFrames[0].color)], components: [] });
        for (let i = 1; i < snapFrames.length; i++) {
            await new Promise(r => setTimeout(r, 1500));
            await interaction.editReply({ content: null, embeds: [createFishingEmbed(snapFrames[i].title, snapFrames[i].desc, snapFrames[i].color)] });
        }
        await new Promise(r => setTimeout(r, 1000));

        equippedRod.durability = 1;
        await userFishing.save();

        const snapEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('💥 Cần câu bị gãy!')
            .setDescription(`Ôi không! Con cá quá mạnh đã làm gãy cần câu của bạn!\nĐộ bền cần câu **${equippedRod.name}** đã giảm xuống còn **1**.\nHãy sửa nó trước khi câu tiếp!`)
            .setFooter({ text: 'Thật không may mắn...' })
            .setTimestamp();

        return interaction.editReply({ content: null, embeds: [snapEmbed] });
    }

    if (!caughtFishInfo) {
        // Animation for failure
        const frames = [
            { title: 'Quăng dây...', color: '#3498DB', desc: "🎣 💨 〰️ 🌊" },
            { title: 'Đang chờ...', color: '#3498DB', desc: "🌊 🌊 🏖️ 🌊 🌊" },
            { title: 'Đang chờ...', color: '#3498DB', desc: "🌊 🐟 🦴 🌊 🌊" },
            { title: 'Hụt rồi!', color: '#95A5A6', desc: "🎣 🌊 🐟 💨" }
        ];

        await interaction.editReply({ content: null, embeds: [createFishingEmbed(frames[0].title, frames[0].desc, frames[0].color)], components: [] });
        for (let i = 1; i < frames.length; i++) {
            await new Promise(r => setTimeout(r, 1500));
            await interaction.editReply({ content: null, embeds: [createFishingEmbed(frames[i].title, frames[i].desc, frames[i].color)] });
        }
        await new Promise(r => setTimeout(r, 1000));

        await userFishing.save();
        const failEmbed = new EmbedBuilder()
            .setColor('#95A5A6')
            .setTitle(fishingLang.UI.NoCatchTitle)
            .setDescription(fishingLang.UI.NoCatchDesc)
            .setFooter({ text: fishingLang.UI.NoCatchFooter.replace('{rod}', equippedRod.name).replace('{durability}', equippedRod.durability) });
        return interaction.editReply({ content: null, embeds: [failEmbed] });
    }

    // Determine animation based on rarity
    let frames = [];
    const baseCast = { title: 'Quăng dây...', color: '#3498DB', desc: "🎣 💨 〰️ 🌊" };
    const baseWait = [
        { title: 'Đang chờ...', color: '#3498DB', desc: "🌊 🌊 🏖️ 🌊 🌊" },
        { title: 'Đang chờ...', color: '#3498DB', desc: "🌊 🐟 🦴 🌊 🌊" }
    ];
    const biteFrame = { title: 'CÓ BIẾN!', color: '#F1C40F', desc: "🌊 🐟 👀 🪱 🌊" };

    let hookSequence = [];

    if (caughtFishInfo.rarity === 'common') {
        hookSequence = [
            { title: 'DÍNH CÂU!', color: '#E74C3C', desc: "🎣 💥 🐟 💦" }
        ];
    } else if (caughtFishInfo.rarity === 'uncommon') {
        hookSequence = [
            { title: 'DÍNH CÂU!', color: '#E74C3C', desc: "🎣 💥 🐟 💦" },
            { title: 'KÉO MẠNH!', color: '#C0392B', desc: "🎣 〰️ 🐟 💦 💦" }
        ];
    } else if (caughtFishInfo.rarity === 'rare') {
        hookSequence = [
            { title: 'DÍNH CÂU!', color: '#E74C3C', desc: "🎣 💥 🐟 💦" },
            { title: 'KÉO MẠNH!', color: '#C0392B', desc: "🎣 〰️ 🐟 💦 💦" },
            { title: 'CỐ LÊN!', color: '#E74C3C', desc: "🎣 🎣 🐟 💦 💦" }
        ];
    } else if (caughtFishInfo.rarity === 'epic') {
        hookSequence = [
            { title: 'DÍNH CÂU!', color: '#E74C3C', desc: "🎣 💥 🐟 💦" },
            { title: 'KÉO MẠNH!', color: '#C0392B', desc: "🎣 〰️ 🐟 💦 💦" },
            { title: 'CỐ LÊN!', color: '#E74C3C', desc: "🎣 🎣 🐟 💦 💦" },
            { title: 'SẮP ĐƯỢC RỒI!', color: '#C0392B', desc: "🎣 ✨ 🐟 ✨ 💦" }
        ];
    } else if (caughtFishInfo.rarity === 'legendary') {
        hookSequence = [
            { title: 'DÍNH CÂU!', color: '#E74C3C', desc: "🎣 💥 🐟 💦" },
            { title: 'KÉO MẠNH!', color: '#C0392B', desc: "🎣 〰️ 🐟 💦 💦" },
            { title: 'RẤT MẠNH!', color: '#E74C3C', desc: "🎣 🔥 🐟 🔥 💦" },
            { title: 'KHÔNG ĐƯỢC THOÁT!', color: '#C0392B', desc: "🎣 ⚡ 🐟 ⚡ 💦" },
            { title: 'LÊN NÀO!', color: '#F1C40F', desc: "🎣 🌟 🐟 🌟 💦" }
        ];
    }

    frames = [baseCast, ...baseWait, biteFrame, ...hookSequence];

    // Play animation
    await interaction.editReply({ content: null, embeds: [createFishingEmbed(frames[0].title, frames[0].desc, frames[0].color)], components: [] });

    for (let i = 1; i < frames.length; i++) {
        await new Promise(r => setTimeout(r, 1500));
        await interaction.editReply({ content: null, embeds: [createFishingEmbed(frames[i].title, frames[i].desc, frames[i].color)] });
    }
    await new Promise(r => setTimeout(r, 1000));


    // Add fish to inventory
    // Use actual weight from config (no hardcoded minimum)
    let minWeight = safeNum(caughtFishInfo.min_weight, 0.1);
    let maxWeight = Math.max(minWeight, safeNum(caughtFishInfo.max_weight, minWeight));

    const weight = Math.random() * (maxWeight - minWeight) + minWeight;

    const existingFish = userFishing.inventory.find(f => f.name === caughtFishInfo.name && f.rarity === caughtFishInfo.rarity);
    if (existingFish) {
        existingFish.totalWeight = safeNum(existingFish.totalWeight) + weight;
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
    const userData = interaction.guild ? await UserData.findOne({
        userId: interaction.user.id,
        guildId: interaction.guild.id
    }) : null;
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

    await interaction.editReply({ content: null, embeds: [successEmbed] });
}

// Rename function in exports below to match logic if needed, but the handler logic is inside
// We need to update the export definition to match the new command structure.

async function handleInventory(interaction, config) {
    await interaction.deferReply();
    const userFishing = await getUserFishing(interaction.user.id);
    const { getLang } = require('../../../utils/langLoader');
    const lang = await getLang(interaction.guild.id);
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

    await interaction.editReply({ embeds: [embed] });
}

async function handleSell(interaction, config) {
    const fishName = interaction.options.getString('fish');
    const quantityInput = interaction.options.getString('quantity');
    const userFishing = await getUserFishing(interaction.user.id);
    const { getLang } = require('../../../utils/langLoader');
    const lang = await getLang(interaction.guild.id);
    const fishingLang = lang.Addons.Fishing;

    let economyData = await EconomyUserData.findOne({ userId: interaction.user.id });
    if (!economyData) economyData = await EconomyUserData.create({ userId: interaction.user.id, balance: 0 });
    economyData.balance = safeNum(economyData.balance);

    const RARITY_SORT = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };

    if (fishName.toLowerCase() === 'all') {
        if (!userFishing.inventory || userFishing.inventory.length === 0) {
            return interaction.reply({ content: '❌ Bạn không có cá nào để bán!', ephemeral: true });
        }

        let totalGain = 0;
        let totalFishCount = 0;
        const soldFish = [];

        for (const fish of userFishing.inventory) {
            const pricePerKg = config.rarity_prices_per_kg[fish.rarity];
            if (pricePerKg) {
                const weight = safeNum(fish.totalWeight);
                const gain = Math.max(5 * fish.quantity, Math.floor(safeNum(pricePerKg) * weight));
                totalGain += gain;
                totalFishCount += fish.quantity;
                soldFish.push({ name: fish.name, rarity: fish.rarity, quantity: fish.quantity, weight, gain });
            }
        }

        userFishing.inventory = [];
        economyData.balance += totalGain;

        await userFishing.save();
        await economyData.save();

        // Sort by rarity (legendary first), then by gain
        soldFish.sort((a, b) => (RARITY_SORT[a.rarity] ?? 5) - (RARITY_SORT[b.rarity] ?? 5) || b.gain - a.gain);

        // Build plain text
        let lines = [];
        lines.push('💰 **Bán Cá Thành Công**');
        lines.push(`Đã bán **tất cả ${totalFishCount} con cá** trong kho!\n`);

        for (const f of soldFish) {
            const emoji = RARITY_EMOJIS[f.rarity] || '⬜';
            lines.push(`${emoji} ${f.name} ×**${f.quantity}** — ${formatWeight(f.weight)} — **${f.gain.toLocaleString()} xu**`);
        }

        lines.push('');
        lines.push(`📊 **Tổng thu:** ${totalGain.toLocaleString()} xu | **Số dư:** ${economyData.balance.toLocaleString()} xu`);

        return interaction.reply({ content: lines.join('\n') });
    } else {
        const fishIndex = userFishing.inventory.findIndex(f => f.name === fishName);
        if (fishIndex === -1) {
            return interaction.reply({ content: '❌ Không tìm thấy cá này trong kho!', ephemeral: true });
        }

        const fish = userFishing.inventory[fishIndex];
        let quantity = quantityInput && !isNaN(parseInt(quantityInput))
            ? parseInt(quantityInput)
            : fish.quantity;

        if (quantity <= 0 || quantity > fish.quantity) {
            return interaction.reply({ content: `❌ Số lượng không hợp lệ! Bạn có **${fish.quantity}** con.`, ephemeral: true });
        }

        const pricePerKg = config.rarity_prices_per_kg[fish.rarity];
        const weightPerFish = fish.quantity > 0 ? safeNum(fish.totalWeight) / fish.quantity : 0;
        const weightToSell = weightPerFish * quantity;
        const totalGain = Math.max(5 * quantity, Math.floor(pricePerKg * weightToSell));

        fish.quantity -= quantity;
        fish.totalWeight -= weightToSell;

        if (fish.quantity <= 0) {
            userFishing.inventory.splice(fishIndex, 1);
        }

        economyData.balance += totalGain;

        await userFishing.save();
        await economyData.save();

        const emoji = RARITY_EMOJIS[fish.rarity] || '🐟';
        let lines = [];
        lines.push('💰 **Bán Cá Thành Công**');
        lines.push(`${emoji} **${fishName}** ×${quantity} — ${formatWeight(weightToSell)}`);
        lines.push(`💵 Thu nhập: **${totalGain.toLocaleString()} xu** | Số dư: **${economyData.balance.toLocaleString()} xu**`);

        await interaction.reply({ content: lines.join('\n') });
    }
}

async function handleSelect(interaction, config) {
    const type = interaction.options.getString('type');
    const userFishing = await getUserFishing(interaction.user.id);
    const { getLang } = require('../../../utils/langLoader');
    const lang = await getLang(interaction.guild.id);
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
    const { getLang } = require('../../../utils/langLoader');
    const lang = await getLang(interaction.guild?.id);
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
// NET FISHING (ĐÁNH CHÀI) HANDLER
// ============================================
async function handleChai(interaction, config) {
    const userFishing = await getUserFishing(interaction.user.id);

    if (!userFishing.nets || userFishing.nets.length === 0) {
        return interaction.reply({ content: '❌ Bạn chưa có lưới chài! Hãy mua tại `/store`.', ephemeral: true });
    }

    // Find equipped net
    const equippedNetKey = userFishing.equippedNet || (userFishing.nets[0] && userFishing.nets[0].key);
    const equippedNet = userFishing.nets.find(n => n.key === equippedNetKey);

    if (!equippedNet || equippedNet.durability <= 0) {
        return interaction.reply({ content: '❌ Lưới chài đã hỏng! Hãy mua lưới mới tại `/store`.', ephemeral: true });
    }

    const netConfig = config.nets[equippedNetKey];
    if (!netConfig) {
        return interaction.reply({ content: '❌ Không tìm thấy config lưới chài.', ephemeral: true });
    }

    // === HARVEST MODE: If there's an active session ===
    if (userFishing.netSession) {
        const session = userFishing.netSession;
        const now = Date.now();
        const elapsed = Math.floor((now - session.startTime) / 1000);
        const sessionNetConfig = config.nets[session.netKey];
        const maxDuration = sessionNetConfig ? sessionNetConfig.max_duration : 600;
        const speed = sessionNetConfig ? sessionNetConfig.speed : 30;
        const effectiveElapsed = Math.min(elapsed, maxDuration);
        const fishCount = Math.floor(effectiveElapsed / speed);

        if (fishCount <= 0) {
            const remaining = speed - elapsed;
            return interaction.reply({ content: `⏳ Lưới vừa thả! Chờ thêm **${remaining}s** nữa để có cá đầu tiên.`, ephemeral: true });
        }

        await interaction.deferReply();

        // Determine location
        const location = config.locations[session.location];
        const netRarityBoost = sessionNetConfig?.rarity_boost || {};

        // Calculate average bait luck from baits used
        let avgBaitLuck = 0;
        let avgBaitKey = null;
        if (session.baitsUsed && session.baitsUsed.length > 0) {
            const totalLuck = session.baitsUsed.reduce((sum, b) => {
                const baitConfig = config.baits[b.key];
                return sum + (baitConfig ? baitConfig.luck * b.count : 0);
            }, 0);
            const totalCount = session.baitsUsed.reduce((sum, b) => sum + b.count, 0);
            avgBaitLuck = totalCount > 0 ? totalLuck / totalCount : 0;
            // Use the most-used bait for attract calculation
            const mostUsed = session.baitsUsed.reduce((a, b) => a.count > b.count ? a : b);
            avgBaitKey = mostUsed.key;
        }

        // Generate catches
        const catches = [];
        const catchCounts = {};
        for (let i = 0; i < fishCount; i++) {
            const fish = getCatch(location, config, avgBaitKey, avgBaitLuck, netRarityBoost);
            if (fish) {
                const key = `${fish.name}|${fish.rarity}`;
                if (!catchCounts[key]) catchCounts[key] = { ...fish, count: 0 };
                catchCounts[key].count++;
            }
        }

        // Add to inventory
        for (const key of Object.keys(catchCounts)) {
            const fish = catchCounts[key];
            const minW = safeNum(fish.min_weight, 0.1);
            const maxW = Math.max(minW, safeNum(fish.max_weight, 1));
            const totalWeight = safeNum(Array.from({ length: fish.count }, () =>
                parseFloat((minW + Math.random() * (maxW - minW)).toFixed(2))
            ).reduce((a, b) => a + b, 0));
            const avgWeight = parseFloat((totalWeight / fish.count).toFixed(2));

            const existing = userFishing.inventory.find(f => f.name === fish.name && f.rarity === fish.rarity);
            if (existing) {
                existing.quantity += fish.count;
                existing.totalWeight = safeNum(existing.totalWeight) + totalWeight;
            } else {
                userFishing.inventory.push({
                    name: fish.name,
                    rarity: fish.rarity,
                    totalWeight: totalWeight,
                    quantity: fish.count
                });
            }
        }

        // Decrease net durability
        equippedNet.durability -= 1;

        // Clear session
        userFishing.netSession = null;
        await userFishing.save();

        // Build result embed
        const catchList = Object.values(catchCounts)
            .sort((a, b) => (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0))
            .map(f => `${RARITY_EMOJIS[f.rarity] || '⬜'} **${f.name}** ×${f.count}`)
            .join('\n');

        const durationStr = effectiveElapsed >= 60 ? `${Math.floor(effectiveElapsed / 60)}m ${effectiveElapsed % 60}s` : `${effectiveElapsed}s`;

        let lines = [];
        lines.push('🪤 **Thu Hoạch Lưới Chài!**');
        lines.push(`Sau **${durationStr}**, bạn thu được **${fishCount} con cá**!\n`);
        lines.push(catchList);
        lines.push(`\n🔧 ${equippedNet.name} | Độ bền: **${equippedNet.durability}/${netConfig.durability}**`);

        return interaction.editReply({ content: lines.join('\n') });
    }

    // === DEPLOY MODE: Start new session ===
    const locationKey = interaction.options.getString('location');
    if (!locationKey || !config.locations[locationKey]) {
        return interaction.reply({ content: '❌ Bạn cần chọn địa điểm để thả lưới!\nDùng: `/fish chai <location>`', ephemeral: true });
    }

    // Check bait — need at least 5 total
    if (!userFishing.baits || userFishing.baits.length === 0) {
        return interaction.reply({ content: '❌ Bạn cần ít nhất **5 mồi câu** để đánh chài!', ephemeral: true });
    }

    const totalBaits = userFishing.baits.reduce((sum, b) => sum + (b.quantity || 0), 0);
    if (totalBaits < 5) {
        return interaction.reply({ content: `❌ Bạn cần ít nhất **5 mồi câu** để đánh chài! Hiện có: **${totalBaits}**.`, ephemeral: true });
    }

    // Consume 5 random baits
    let baitsToConsume = 5;
    const baitsUsed = [];
    const shuffledBaits = [...userFishing.baits].sort(() => Math.random() - 0.5);

    for (const bait of shuffledBaits) {
        if (baitsToConsume <= 0) break;
        const baitConfig = Object.entries(config.baits).find(([k, v]) => v.name === bait.name);
        const baitKey = baitConfig ? baitConfig[0] : null;
        const consume = Math.min(bait.quantity, baitsToConsume);
        bait.quantity -= consume;
        baitsToConsume -= consume;
        if (baitKey) baitsUsed.push({ key: baitKey, count: consume });
    }

    // Remove empty baits
    userFishing.baits = userFishing.baits.filter(b => b.quantity > 0);

    // Create session
    userFishing.netSession = {
        location: locationKey,
        startTime: Date.now(),
        baitsUsed: baitsUsed,
        netKey: equippedNetKey
    };

    await userFishing.save();

    const maxMin = Math.floor(netConfig.max_duration / 60);
    const baitsUsedStr = baitsUsed.map(b => {
        const baitConfig = config.baits[b.key];
        return `${baitConfig ? baitConfig.name : b.key} ×${b.count}`;
    }).join(', ');

    let lines = [];
    lines.push('🪤 **Thả Lưới Chài!**');
    lines.push(`Bạn đã thả **${equippedNet.name}** tại **${config.locations[locationKey].name}**!\n`);
    lines.push(`🎣 Mồi đã dùng: ${baitsUsedStr}`);
    lines.push(`⏰ Thời gian chài: Tối đa **${maxMin} phút**`);
    lines.push(`🐟 Tốc độ: 1 cá mỗi **${netConfig.speed}s**`);
    lines.push(`\nQuay lại dùng \`/fish chai\` bất kỳ lúc nào để thu hoạch!`);

    return interaction.reply({ content: lines.join('\n') });
}


// ============================================
// FISH TRAP (BẪY CÁ) HANDLERS
// ============================================
const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

async function handleBay(interaction, config, subAction) {
    switch (subAction) {
        case 'dat': return handleBayDat(interaction, config);
        case 'xem': return handleBayXem(interaction, config);
        case 'thu': return handleBayThu(interaction, config);
        case 'tiepte': return handleBayTiepTe(interaction, config);
        case 'go': return handleBayGo(interaction, config);
        default:
            return interaction.reply({ content: '❌ Hành động không hợp lệ.', ephemeral: true });
    }
}

// --- Place Trap ---
async function handleBayDat(interaction, config) {
    const userFishing = await getUserFishing(interaction.user.id);

    if (!userFishing.traps || userFishing.traps.length === 0) {
        return interaction.reply({ content: '❌ Bạn chưa có bẫy cá! Hãy mua tại `/store`.', ephemeral: true });
    }

    if (!userFishing.activeTraps) userFishing.activeTraps = [];

    if (userFishing.activeTraps.length >= 5) {
        return interaction.reply({ content: '❌ Bạn đã đặt tối đa **5 bẫy**! Gỡ bớt bằng `/fish bay go`.', ephemeral: true });
    }

    const locationKey = interaction.options.getString('location');
    if (!locationKey || !config.locations[locationKey]) {
        return interaction.reply({ content: '❌ Bạn cần chọn địa điểm!\nDùng: `/fish bay dat <location>`', ephemeral: true });
    }

    // Find first available trap
    const trap = userFishing.traps.find(t => t.durability > 0);
    if (!trap) {
        return interaction.reply({ content: '❌ Tất cả bẫy đã hỏng! Hãy mua bẫy mới.', ephemeral: true });
    }

    const trapConfig = config.traps[trap.key];
    if (!trapConfig) {
        return interaction.reply({ content: '❌ Không tìm thấy config bẫy cá.', ephemeral: true });
    }

    // Check bait
    const totalBaits = (userFishing.baits || []).reduce((sum, b) => sum + (b.quantity || 0), 0);
    if (totalBaits < trapConfig.bait_cost) {
        return interaction.reply({ content: `❌ Cần **${trapConfig.bait_cost} mồi** để đặt ${trap.name}! Hiện có: **${totalBaits}**.`, ephemeral: true });
    }

    // Consume baits
    let baitsToConsume = trapConfig.bait_cost;
    const shuffledBaits = [...userFishing.baits].sort(() => Math.random() - 0.5);
    for (const bait of shuffledBaits) {
        if (baitsToConsume <= 0) break;
        const consume = Math.min(bait.quantity, baitsToConsume);
        bait.quantity -= consume;
        baitsToConsume -= consume;
    }
    userFishing.baits = userFishing.baits.filter(b => b.quantity > 0);

    // Decrease trap durability
    trap.durability -= 1;

    // Remove trap from inventory if durability 0
    if (trap.durability <= 0) {
        userFishing.traps = userFishing.traps.filter(t => t !== trap);
    }

    // Create active trap
    const activeTrap = {
        id: Date.now().toString(36),
        trapKey: trap.key,
        trapName: trap.name,
        location: locationKey,
        placedAt: Date.now(),
        baitRemaining: trapConfig.bait_cost,
        fish: [],
        capacity: trapConfig.capacity
    };

    userFishing.activeTraps.push(activeTrap);
    await userFishing.save();

    let lines = [];
    lines.push('🗑️ **Đặt Bẫy Cá Thành Công!**');
    lines.push(`**${trap.name}** đã được đặt tại **${config.locations[locationKey].name}**!\n`);
    lines.push(`🎣 Mồi trong bẫy: **${trapConfig.bait_cost}**`);
    lines.push(`📦 Sức chứa: **${trapConfig.capacity} cá**`);
    lines.push(`⏰ Tốc độ: 1 cá / **${trapConfig.speed}s**`);
    lines.push(`🐟 Cá/mồi: **${trapConfig.fish_per_bait}**`);
    lines.push(`\nDùng \`/fish bay xem\` để kiểm tra, \`/fish bay thu\` để thu hoạch!`);
    lines.push(`📋 ID: \`${activeTrap.id}\` | Bẫy: **${userFishing.activeTraps.length}/5**`);

    return interaction.reply({ content: lines.join('\n') });
}

// --- View Traps ---
async function handleBayXem(interaction, config) {
    const userFishing = await getUserFishing(interaction.user.id);

    if (!userFishing.activeTraps || userFishing.activeTraps.length === 0) {
        return interaction.reply({ content: '📭 Bạn chưa đặt bẫy nào! Dùng `/fish bay dat` để bắt đầu.', ephemeral: true });
    }

    const trapLines = userFishing.activeTraps.map((trap, idx) => {
        const trapConfig = config.traps[trap.trapKey];
        const now = Date.now();
        const elapsed = Math.floor((now - trap.placedAt) / 1000);
        const speed = trapConfig ? trapConfig.speed : 60;
        const fishPerBait = trapConfig ? trapConfig.fish_per_bait : 5;
        const maxFishFromBait = trap.baitRemaining * fishPerBait;
        const maxFish = Math.min(maxFishFromBait, trap.capacity - (trap.fish ? trap.fish.length : 0));
        const newFish = Math.min(Math.floor(elapsed / speed), maxFish);
        const totalFish = (trap.fish ? trap.fish.length : 0) + newFish;
        const baitUsedForFish = Math.ceil(newFish / fishPerBait);
        const baitLeft = Math.max(0, trap.baitRemaining - baitUsedForFish);
        const locationName = config.locations[trap.location] ? config.locations[trap.location].name : trap.location;

        let status = '🟢 Hoạt động';
        if (totalFish >= trap.capacity) status = '📦 Đầy';
        else if (baitLeft <= 0) status = '⚠️ Hết mồi';

        return `**#${idx + 1}** ${trap.trapName} — ${locationName}\n` +
            `   ${status} | 🐟 ${totalFish}/${trap.capacity} | 🎣 Mồi: ${baitLeft} | ID: \`${trap.id}\``;
    });

    let lines = [];
    lines.push('🗑️ **Bẫy Cá Của Bạn**\n');
    lines.push(trapLines.join('\n\n'));
    lines.push(`\n📋 ${userFishing.activeTraps.length}/5 bẫy đang hoạt động`);

    return interaction.reply({ content: lines.join('\n') });
}

// --- Harvest Trap ---
async function handleBayThu(interaction, config) {
    const userFishing = await getUserFishing(interaction.user.id);
    const trapId = interaction.options.getString('trap_id');

    if (!userFishing.activeTraps || userFishing.activeTraps.length === 0) {
        return interaction.reply({ content: '📭 Bạn chưa đặt bẫy nào!', ephemeral: true });
    }

    const trapIndex = userFishing.activeTraps.findIndex(t => t.id === trapId);
    if (trapIndex === -1) {
        return interaction.reply({ content: `❌ Không tìm thấy bẫy với ID \`${trapId}\`! Dùng \`/fish bay xem\` để xem danh sách.`, ephemeral: true });
    }

    await interaction.deferReply();

    const trap = userFishing.activeTraps[trapIndex];
    const trapConfig = config.traps[trap.trapKey];
    const location = config.locations[trap.location];
    const now = Date.now();
    const elapsed = Math.floor((now - trap.placedAt) / 1000);
    const speed = trapConfig ? trapConfig.speed : 60;
    const fishPerBait = trapConfig ? trapConfig.fish_per_bait : 5;
    const maxFishFromBait = trap.baitRemaining * fishPerBait;
    const maxFish = Math.min(maxFishFromBait, trap.capacity - (trap.fish ? trap.fish.length : 0));
    const newFishCount = Math.min(Math.floor(elapsed / speed), maxFish);

    // Generate new fish
    const catchCounts = {};
    for (let i = 0; i < newFishCount; i++) {
        const fish = getCatch(location, config, null, 0, {});
        if (fish) {
            const key = `${fish.name}|${fish.rarity}`;
            if (!catchCounts[key]) catchCounts[key] = { ...fish, count: 0 };
            catchCounts[key].count++;
        }
    }

    // Calculate existing trap fish
    const existingFish = trap.fish || [];

    // Add new fish to inventory
    let totalHarvested = existingFish.length + newFishCount;
    for (const ef of existingFish) {
        const existing = userFishing.inventory.find(f => f.name === ef.name && f.rarity === ef.rarity);
        if (existing) {
            existing.quantity += ef.count;
            existing.totalWeight = safeNum(existing.totalWeight) + safeNum(ef.weight, 0.5) * ef.count;
        } else {
            userFishing.inventory.push({ name: ef.name, rarity: ef.rarity, totalWeight: safeNum(ef.weight, 0.5) * ef.count, quantity: ef.count });
        }
    }

    for (const key of Object.keys(catchCounts)) {
        const fish = catchCounts[key];
        const minW = safeNum(fish.min_weight, 0.1);
        const maxW = Math.max(minW, safeNum(fish.max_weight, 1));
        const avgWeight = parseFloat(((minW + maxW) / 2).toFixed(2));

        const existing = userFishing.inventory.find(f => f.name === fish.name && f.rarity === fish.rarity);
        if (existing) {
            existing.quantity += fish.count;
            existing.totalWeight = safeNum(existing.totalWeight) + avgWeight * fish.count;
        } else {
            userFishing.inventory.push({ name: fish.name, rarity: fish.rarity, totalWeight: avgWeight * fish.count, quantity: fish.count });
        }
    }

    // Remove trap
    userFishing.activeTraps.splice(trapIndex, 1);
    await userFishing.save();

    // Build plain text
    const allCatches = [...existingFish.map(f => `${RARITY_EMOJIS[f.rarity] || '⬜'} ${f.name} ×**${f.count}**`)];
    for (const fish of Object.values(catchCounts)) {
        allCatches.push(`${RARITY_EMOJIS[fish.rarity] || '⬜'} ${fish.name} ×**${fish.count}**`);
    }

    let lines = [];
    lines.push('🗑️ **Thu Hoạch Bẫy Cá!**');
    lines.push(`Thu hoạch từ **${trap.trapName}** tại **${location ? location.name : trap.location}**`);
    lines.push(`Tổng: **${totalHarvested} cá** 🐟\n`);
    lines.push(allCatches.length > 0 ? allCatches.slice(0, 20).join('\n') : 'Không có cá nào!');
    if (allCatches.length > 20) lines.push(`... và ${allCatches.length - 20} loại khác`);
    lines.push(`\n📋 Bẫy còn lại: **${userFishing.activeTraps.length}/5**`);

    return interaction.editReply({ content: lines.join('\n') });
}

// --- Resupply Trap ---
async function handleBayTiepTe(interaction, config) {
    const userFishing = await getUserFishing(interaction.user.id);
    const trapId = interaction.options.getString('trap_id');

    if (!userFishing.activeTraps || userFishing.activeTraps.length === 0) {
        return interaction.reply({ content: '📭 Bạn chưa đặt bẫy nào!', ephemeral: true });
    }

    const trap = userFishing.activeTraps.find(t => t.id === trapId);
    if (!trap) {
        return interaction.reply({ content: `❌ Không tìm thấy bẫy với ID \`${trapId}\`!`, ephemeral: true });
    }

    const trapConfig = config.traps[trap.trapKey];
    const resupplyAmount = trapConfig ? trapConfig.bait_cost : 10;

    // First, calculate and bank any fish caught so far
    const now = Date.now();
    const elapsed = Math.floor((now - trap.placedAt) / 1000);
    const speed = trapConfig ? trapConfig.speed : 60;
    const fishPerBait = trapConfig ? trapConfig.fish_per_bait : 5;
    const maxFishFromBait = trap.baitRemaining * fishPerBait;
    const maxFish = Math.min(maxFishFromBait, trap.capacity - (trap.fish ? trap.fish.length : 0));
    const newFishCount = Math.min(Math.floor(elapsed / speed), maxFish);

    // Generate and bank fish
    const location = config.locations[trap.location];
    if (!trap.fish) trap.fish = [];
    const catchCounts = {};
    for (let i = 0; i < newFishCount; i++) {
        const fish = getCatch(location, config, null, 0, {});
        if (fish) {
            const key = `${fish.name}|${fish.rarity}`;
            if (!catchCounts[key]) catchCounts[key] = { ...fish, count: 0 };
            catchCounts[key].count++;
        }
    }
    for (const fish of Object.values(catchCounts)) {
        const existing = trap.fish.find(f => f.name === fish.name && f.rarity === fish.rarity);
        if (existing) {
            existing.count += fish.count;
        } else {
            trap.fish.push({ name: fish.name, rarity: fish.rarity, count: fish.count, weight: ((fish.min_weight || 0.1) + (fish.max_weight || 1)) / 2 });
        }
    }

    // Deduct bait used
    const baitUsedForFish = Math.ceil(newFishCount / fishPerBait);
    trap.baitRemaining = Math.max(0, trap.baitRemaining - baitUsedForFish);

    // Check user has enough bait to resupply
    const totalBaits = (userFishing.baits || []).reduce((sum, b) => sum + (b.quantity || 0), 0);
    if (totalBaits < resupplyAmount) {
        return interaction.reply({ content: `❌ Cần **${resupplyAmount} mồi** để tiếp tế! Hiện có: **${totalBaits}**.`, ephemeral: true });
    }

    // Consume baits
    let baitsToConsume = resupplyAmount;
    for (const bait of userFishing.baits) {
        if (baitsToConsume <= 0) break;
        const consume = Math.min(bait.quantity, baitsToConsume);
        bait.quantity -= consume;
        baitsToConsume -= consume;
    }
    userFishing.baits = userFishing.baits.filter(b => b.quantity > 0);

    // Add resupply
    trap.baitRemaining += resupplyAmount;
    trap.placedAt = Date.now(); // Reset timer

    await userFishing.save();

    let lines = [];
    lines.push('🔄 **Tiếp Tế Bẫy Thành Công!**');
    lines.push(`**${trap.trapName}** tại **${location ? location.name : trap.location}**\n`);
    lines.push(`🐟 Cá đang chờ: **${trap.fish.reduce((s, f) => s + f.count, 0)}/${trap.capacity}**`);
    lines.push(`🎣 Mồi hiện tại: **${trap.baitRemaining}**`);
    lines.push(`⏰ Timer đã reset!`);

    return interaction.reply({ content: lines.join('\n') });
}

// --- Remove Trap ---
async function handleBayGo(interaction, config) {
    const userFishing = await getUserFishing(interaction.user.id);
    const trapId = interaction.options.getString('trap_id');

    if (!userFishing.activeTraps || userFishing.activeTraps.length === 0) {
        return interaction.reply({ content: '📭 Bạn chưa đặt bẫy nào!', ephemeral: true });
    }

    const trapIndex = userFishing.activeTraps.findIndex(t => t.id === trapId);
    if (trapIndex === -1) {
        return interaction.reply({ content: `❌ Không tìm thấy bẫy với ID \`${trapId}\`!`, ephemeral: true });
    }

    const trap = userFishing.activeTraps[trapIndex];

    // Bank any remaining fish to inventory before removing
    if (trap.fish && trap.fish.length > 0) {
        for (const f of trap.fish) {
            const existing = userFishing.inventory.find(inv => inv.name === f.name && inv.rarity === f.rarity);
            if (existing) {
                existing.quantity += f.count;
                existing.totalWeight = safeNum(existing.totalWeight) + safeNum(f.weight, 0.5) * f.count;
            } else {
                userFishing.inventory.push({ name: f.name, rarity: f.rarity, totalWeight: safeNum(f.weight, 0.5) * f.count, quantity: f.count });
            }
        }
    }

    const bankedCount = trap.fish ? trap.fish.reduce((s, f) => s + f.count, 0) : 0;
    userFishing.activeTraps.splice(trapIndex, 1);
    await userFishing.save();

    let lines = [];
    lines.push('🗑️ **Gỡ Bẫy Cá**');
    lines.push(`Đã gỡ **${trap.trapName}** tại **${config.locations[trap.location] ? config.locations[trap.location].name : trap.location}**.`);
    if (bankedCount > 0) lines.push(`🐟 Đã chuyển **${bankedCount} cá** vào kho.`);
    lines.push(`📋 Bẫy còn lại: **${userFishing.activeTraps.length}/5**`);

    return interaction.reply({ content: lines.join('\n') });
}


// ============================================
// MAIN COMMAND EXPORT
// ============================================

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Các lệnh liên quan đến câu cá.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('cauca')
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
                .setDescription('Hiển thị trợ giúp về câu cá.'))
        .addSubcommand(sub =>
            sub.setName('aquarium')
                .setDescription('Xem bể cá của bạn')
                .addUserOption(o => o.setName('user').setDescription('Người dùng')))
        .addSubcommand(sub =>
            sub.setName('chai')
                .setDescription('Đánh chài (thả lưới / thu hoạch)')
                .addStringOption(option => {
                    const config = loadFishingConfig();
                    const choices = Object.keys(config.locations).map(loc => ({
                        name: config.locations[loc].name,
                        value: loc
                    }));
                    return option
                        .setName('location')
                        .setDescription('Địa điểm thả lưới.')
                        .setRequired(false)
                        .addChoices(...choices);
                }))
        .addSubcommandGroup(group =>
            group.setName('bay')
                .setDescription('Hệ thống bẫy cá')
                .addSubcommand(sub =>
                    sub.setName('dat')
                        .setDescription('Đặt bẫy cá tại địa điểm')
                        .addStringOption(option => {
                            const config = loadFishingConfig();
                            const choices = Object.keys(config.locations).map(loc => ({
                                name: config.locations[loc].name,
                                value: loc
                            }));
                            return option
                                .setName('location')
                                .setDescription('Địa điểm đặt bẫy.')
                                .setRequired(true)
                                .addChoices(...choices);
                        }))
                .addSubcommand(sub =>
                    sub.setName('xem')
                        .setDescription('Xem trạng thái bẫy cá'))
                .addSubcommand(sub =>
                    sub.setName('thu')
                        .setDescription('Thu hoạch cá từ bẫy')
                        .addStringOption(o => o.setName('trap_id').setDescription('ID bẫy cần thu').setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('tiepte')
                        .setDescription('Tiếp tế mồi cho bẫy')
                        .addStringOption(o => o.setName('trap_id').setDescription('ID bẫy cần tiếp tế').setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('go')
                        .setDescription('Gỡ bẫy cá')
                        .addStringOption(o => o.setName('trap_id').setDescription('ID bẫy cần gỡ').setRequired(true)))
        )
        .addSubcommandGroup(group =>
            group.setName('tournament')
                .setDescription('Hệ thống giải đấu')
                .addSubcommand(sub => sub.setName('view').setDescription('Xem giải đấu đang diễn ra'))
                .addSubcommand(sub => sub.setName('leaderboard').setDescription('Xem bảng xếp hạng'))
        ),

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

    async execute(interaction, lang) {
        const client = interaction.client;
        const { getConfig } = require('../../../utils/configLoader');
        const { getLang } = require('../../../utils/langLoader');
        const subcommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup(false);

        if (group === 'tournament') {
            await require('./tournament').execute(interaction);
            return;
        }

        if (group === 'bay') {
            const config = loadFishingConfig();
            await handleBay(interaction, config, subcommand);
            return;
        }

        const config = loadFishingConfig();
        const fishingLang = lang.Addons.Fishing;

        try {
            switch (subcommand) {
                case 'cauca':
                    await handleFish(interaction, config, fishingLang);
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
                case 'aquarium':
                    await require('./aquarium').execute(interaction);
                    break;
                case 'chai':
                    await handleChai(interaction, config);
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
