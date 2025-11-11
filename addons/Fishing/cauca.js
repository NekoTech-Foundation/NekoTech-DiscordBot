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
const { getConfig, getLang } = require('../../utils/configLoader');
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
            userData = new UserData({ userId: user.id, guildId: interaction.guild.id });
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

    // Apply rod effects
    if (rodEffects) {
        for (const rarity in rodEffects) {
            if (chances[rarity]) {
                chances[rarity] *= (1 + rodEffects[rarity]);
            }
        }
    }

    // Apply rod luck
    if (rodLuck > 0) {
        chances['uncommon'] *= (1 + rodLuck * 0.5);
        chances['rare'] *= (1 + rodLuck * 1.5);
        chances['epic'] *= (1 + rodLuck * 2);
        chances['legendary'] *= (1 + rodLuck * 3);
    }

    // Normalize chances
    let totalChance = Object.values(chances).reduce((a, b) => a + b, 0);
    for (const rarity in chances) {
        chances[rarity] /= totalChance;
    }

    // Apply bait effects
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

        if (baitInfo.boosts) {
            let totalBoost = 0;
            for (const rarity in baitInfo.boosts) {
                if (chances[rarity]) {
                    const boostValue = baitInfo.boosts[rarity];
                    chances[rarity] += boostValue;
                    totalBoost += boostValue;
                }
            }

            const nonBoostedRarities = Object.keys(chances).filter(r => !baitInfo.boosts[r]);
            let totalNonBoostedChance = 0;
            nonBoostedRarities.forEach(r => totalNonBoostedChance += chances[r]);

            if (totalNonBoostedChance > 0) {
                nonBoostedRarities.forEach(r => {
                    chances[r] -= (chances[r] / totalNonBoostedChance) * totalBoost;
                });
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
            embeds: [new EmbedBuilder()
                .setColor('#E74C3C')
                .setDescription(`⏰ **Cooldown!** Vui lòng đợi \`${remaining}s\` nữa.`)
            ],
            ephemeral: true 
        });
    }

    const locationKey = interaction.options.getString('location');
    const location = config.locations[locationKey];
    
    const userFishing = await getUserFishing(userId);
    const equippedRodKey = userFishing.equippedRod;

    // Check rod
    if (!equippedRodKey || !userFishing.rods.some(r => r.key === equippedRodKey)) {
        return interaction.reply({ 
            embeds: [new EmbedBuilder()
                .setColor('#E74C3C')
                .setDescription('❌ Bạn chưa có cần câu! Hãy dùng `/store` để mua.')
            ],
            ephemeral: true 
        });
    }

    const equippedRod = userFishing.rods.find(r => r.key === equippedRodKey);
    if (equippedRod.durability <= 0) {
        return interaction.reply({ 
            embeds: [new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('🔧 Cần Câu Đã Hỏng')
                .setDescription(`**${equippedRod.name}** của bạn đã hết độ bền!\n\n` +
                    `Sử dụng \`/fixcancau\` để sửa hoặc mua cần mới tại \`/store\`.`)
            ],
            ephemeral: true 
        });
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
            .setLabel('Không dùng mồi')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('❌');

        const row = new ActionRowBuilder().addComponents(...baitButtons, noBaitButton);
        
        const baitEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🎣 Chọn Mồi Câu')
            .setDescription('Bạn có muốn sử dụng mồi câu không?\n*Mồi câu sẽ tăng cơ hội câu được cá hiếm.*')
            .setFooter({ text: 'Thời gian chọn: 30 giây' });

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
                .setDescription('🎣 Đang quăng câu...');
            
            await buttonInteraction.update({ embeds: [fishingEmbed], components: [] });
        } catch (error) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setDescription(`⏰ Hết thời gian! Sử dụng mồi: ${usedBaitKey ? config.baits[usedBaitKey].name : 'Không có'}`);
            
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
            .setTitle('😞 Không Câu Được Gì')
            .setDescription('Bạn không câu được cá lần này. Chúc may mắn lần sau!')
            .setFooter({ text: `${equippedRod.name} còn ${equippedRod.durability} độ bền` });
        
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
        .setTitle('🎉 Câu Cá Thành Công!')
        .setDescription(`${caughtFishInfo.emoji} **${caughtFishInfo.name}**`)
        .addFields(
            { name: '⚖️ Trọng Lượng', value: formatWeight(weight), inline: true },
            { name: '✨ Độ Hiếm', value: getRarityDisplay(caughtFishInfo.rarity), inline: true },
            { name: '🌟 XP Nhận', value: `+${finalXp} XP`, inline: true }
        )
        .setFooter({ 
            text: `${equippedRod.name} | Độ bền: ${createProgressBar(equippedRod.durability, rodConfig.durability)} (${equippedRod.durability}/${rodConfig.durability})` 
        })
        .setTimestamp();
    
    if (usedBaitKey) {
        successEmbed.addFields({ 
            name: '🪱 Mồi Đã Dùng', 
            value: config.baits[usedBaitKey].name, 
            inline: true 
        });
    }

    await interaction.editReply({ embeds: [successEmbed] });
}

async function handleInventory(interaction, config) {
    const userFishing = await getUserFishing(interaction.user.id);
    
    const embed = new EmbedBuilder()
        .setTitle(`🎒 Kho Đồ Câu Cá - ${interaction.user.username}`)
        .setColor('#3498DB')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

    // Rods section
    let rodInfo = '```\n❌ Chưa có cần câu\n```\n*Mua tại `/store`*';
    if (userFishing.rods && userFishing.rods.length > 0) {
        rodInfo = userFishing.rods.map(r => {
            const rodConfig = config.rods[r.key];
            const durabilityBar = createProgressBar(r.durability, rodConfig?.durability || 100, 8);
            const equipped = r.key === userFishing.equippedRod ? '✅ ' : '⬜ ';
            return `${equipped}**${r.name}**\n${durabilityBar} (${r.durability})`;
        }).join('\n\n');
    }
    embed.addFields({ name: '🎣 Cần Câu', value: rodInfo });

    // Baits section
    let baitInfo = '```\n❌ Không có mồi câu\n```';
    if (userFishing.baits && userFishing.baits.some(b => b.quantity > 0)) {
        baitInfo = userFishing.baits.filter(b => b.quantity > 0).map(b => {
            const baitDetails = getBaitConfigByName(b.name);
            const equipped = baitDetails?.key === userFishing.equippedBait ? '✅' : '⬜';
            return `${equipped} **${b.name}** × ${b.quantity}`;
        }).join('\n');
    }
    embed.addFields({ name: '🪱 Mồi Câu', value: baitInfo });

    // Fish inventory
    let fishInfo = '```\n❌ Kho cá trống\n```';
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
            fishInfo += `\n\n*...và ${userFishing.inventory.length - 15} loại khác*`;
        }
    }
    embed.addFields({ name: '🐠 Kho Cá', value: fishInfo });

    await interaction.reply({ embeds: [embed] });
}

async function handleSell(interaction, config) {
    const fishName = interaction.options.getString('fish');
    const quantityInput = interaction.options.getString('quantity');
    const userFishing = await getUserFishing(interaction.user.id);
    
    let economyData = await EconomyUserData.findOne({ userId: interaction.user.id });
    if (!economyData) economyData = new EconomyUserData({ userId: interaction.user.id, balance: 0 });

    if (fishName.toLowerCase() === 'all') {
        if (!userFishing.inventory || userFishing.inventory.length === 0) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setDescription('❌ Bạn không có cá để bán.')
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
            .setTitle('💰 Bán Cá Thành Công')
            .setDescription(`Đã bán **tất cả cá** trong kho!`)
            .addFields(
                { name: '💵 Tổng Thu', value: formatCurrency(totalGain), inline: true },
                { name: '🐟 Số Loài', value: `${soldFish.length} loài`, inline: true },
                { name: '💳 Số Dư Mới', value: formatCurrency(economyData.balance), inline: true }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    } else {
        const fishIndex = userFishing.inventory.findIndex(f => f.name === fishName);
        if (fishIndex === -1) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setDescription('❌ Bạn không có cá này trong kho.')
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
                    .setDescription(`❌ Số lượng không hợp lệ. Bạn có ${fish.quantity} con.`)
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
            .setTitle('💰 Bán Cá Thành Công')
            .setDescription(`${fishDetails?.emoji || '🐟'} **${fishName}** ${RARITY_EMOJIS[fish.rarity]}`)
            .addFields(
                { name: '🐟 Số Lượng', value: `${quantity} con`, inline: true },
                { name: '⚖️ Tổng Cân', value: formatWeight(weightToSell), inline: true },
                { name: '💵 Thu Nhập', value: formatCurrency(totalGain), inline: true },
                { name: '💳 Số Dư Mới', value: formatCurrency(economyData.balance), inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}

async function handleSelect(interaction, config) {
    const type = interaction.options.getString('type');
    const userFishing = await getUserFishing(interaction.user.id);

    if (type === 'rod') {
        if (!userFishing.rods || userFishing.rods.length === 0) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setDescription('❌ Bạn không sở hữu cần câu nào.')
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
            .setPlaceholder('Chọn cần câu để trang bị')
            .addOptions(rodOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🎣 Chọn Cần Câu')
            .setDescription('Hãy chọn cần câu bạn muốn sử dụng:');

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
                return i.reply({ content: '❌ Đây không phải menu của bạn.', ephemeral: true });
            }
            
            const selectedRodKey = i.values[0];
            userFishing.equippedRod = selectedRodKey;
            await userFishing.save();
            
            const selectedRod = userFishing.rods.find(r => r.key === selectedRodKey);
            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setDescription(`✅ Đã trang bị: **${selectedRod.name}**`);
            
            await i.update({ embeds: [successEmbed], components: [] });
        });

    } else if (type === 'bait') {
        const availableBaits = userFishing.baits.filter(b => b.quantity > 0);
        if (availableBaits.length === 0) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setDescription('❌ Bạn không có mồi câu nào.')
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
            .setPlaceholder('Chọn mồi câu mặc định')
            .addOptions(baitOptions);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🪱 Chọn Mồi Câu')
            .setDescription('Hãy chọn loại mồi bạn muốn ưu tiên sử dụng:');

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
                return i.reply({ content: '❌ Đây không phải menu của bạn.', ephemeral: true });
            }
            
            const selectedBaitKey = i.values[0];
            userFishing.equippedBait = selectedBaitKey;
            await userFishing.save();
            
            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setDescription(`✅ Đã chọn: **${config.baits[selectedBaitKey].name}** làm mồi mặc định`);
            
            await i.update({ embeds: [successEmbed], components: [] });
        });
    }
}

async function handleHelp(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🎣 Hướng Dẫn Câu Cá')
        .setColor('#0099ff')
        .setDescription('Chào mừng đến với hệ thống câu cá! Dưới đây là các lệnh bạn có thể sử dụng:')
        .addFields(
            {
                name: '🎣 Câu Cá',
                value: '`/cauca fish <địa điểm>` - Bắt đầu câu cá tại địa điểm đã chọn\n' +
                       '*Mỗi lần câu sẽ tiêu tốn 1 độ bền cần câu*',
                inline: false
            },
            {
                name: '🎒 Quản Lý Đồ',
                value: '`/cauca inventory` - Xem kho đồ câu cá của bạn\n' +
                       '`/cauca select <rod/bait>` - Chọn cần câu hoặc mồi để trang bị\n' +
                       '`/fixcancau` - Sửa cần câu (chỉ khi độ bền < 30%)',
                inline: false
            },
            {
                name: '💰 Kinh Tế',
                value: '`/cauca sell <tên cá|all> [số lượng]` - Bán cá để kiếm xu\n' +
                       '`/store` - Mở cửa hàng mua cần câu và mồi',
                inline: false
            },
            {
                name: '📊 Thống Kê',
                value: '`/leaderboard cauca` - Xem bảng xếp hạng câu cá\n' +
                       '`/cauca help` - Hiển thị tin nhắn này',
                inline: false
            },
            {
                name: '✨ Độ Hiếm Cá',
                value: `${RARITY_EMOJIS.common} Common • ${RARITY_EMOJIS.uncommon} Uncommon • ${RARITY_EMOJIS.rare} Rare\n` +
                       `${RARITY_EMOJIS.epic} Epic • ${RARITY_EMOJIS.legendary} Legendary`,
                inline: false
            },
            {
                name: '💡 Mẹo',
                value: '• Sử dụng mồi câu để tăng cơ hội câu được cá hiếm\n' +
                       '• Cần câu tốt hơn = độ bền cao hơn + hiệu ứng đặc biệt\n' +
                       '• Cá Epic và Legendary thay đổi mỗi giờ!',
                inline: false
            }
        )
        .setFooter({ text: 'Chúc bạn câu được nhiều cá hiếm! 🐟' })
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
                        .setRequired(true)
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
                        content: '❌ Lệnh không hợp lệ.', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error('[Fishing Command Error]:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('❌ Đã Xảy Ra Lỗi')
                .setDescription('Đã có lỗi xảy ra khi thực hiện lệnh. Vui lòng thử lại sau.');
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errorEmbed], components: [] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
}