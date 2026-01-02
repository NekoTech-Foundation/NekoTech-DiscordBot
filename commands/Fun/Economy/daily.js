const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const EconomyUserData = require('../../../models/EconomyUserData');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const { seeds, addToFarm } = require('../../Addons/Farming/farmUtils');
const { getUserFishing, loadConfig: loadFishingConfig } = require('../../Addons/Fishing/fishingUtils');

const config = getConfig();
const { checkActiveBooster, replacePlaceholders } = require('./Utility/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Nhận quà hàng ngày nào!'),
    category: 'Economy',
    async execute(interaction, lang) {
        try {
            let user = await EconomyUserData.findOne(
                { userId: interaction.user.id },
                { balance: 1, 'commandData.lastDaily': 1, 'commandData.dailyStreak': 1, transactionLogs: 1, boosters: 1 }
            );
            const now = new Date();
            let reward = config.Economy.Daily.baseAmount;
            let streak = 1;

            if (user && user.commandData.lastDaily) {
                const lastDaily = new Date(user.commandData.lastDaily);

                const isSameDay = now.getUTCFullYear() === lastDaily.getUTCFullYear() &&
                    now.getUTCMonth() === lastDaily.getUTCMonth() &&
                    now.getUTCDate() === lastDaily.getUTCDate();

                if (isSameDay) {
                    const nextDaily = new Date(lastDaily);
                    nextDaily.setHours(nextDaily.getHours() + 24);

                    if (now < nextDaily) {
                        const embed = new EmbedBuilder()
                            .setDescription(replacePlaceholders(lang.Economy.Messages.cooldown, { nextUse: Math.floor(nextDaily.getTime() / 1000) }))
                            .setColor('#FF0000')
                            .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) });
                        return interaction.reply({ embeds: [embed] });
                    }
                } else {
                    const wasYesterday = now.getUTCFullYear() === lastDaily.getUTCFullYear() &&
                        now.getUTCMonth() === lastDaily.getUTCMonth() &&
                        now.getUTCDate() === lastDaily.getUTCDate() + 1;

                    if (wasYesterday) {
                        streak = (user.commandData.dailyStreak || 1) + 1;
                        reward = Math.min(config.Economy.Daily.baseAmount + streak * config.Economy.Daily.increasePerDay, config.Economy.Daily.maxAmount);
                    } else {
                        streak = 1;
                    }
                }
            }

            const multiplier = checkActiveBooster(user, 'Money');
            reward *= multiplier;

            // --- REWARD GENERATION ---
            // 1. Seed Reward
            const seedKeys = Object.keys(seeds);
            const randomSeedKey = seedKeys[Math.floor(Math.random() * seedKeys.length)];
            const seedReward = seeds[randomSeedKey];
            const seedQuantity = Math.floor(Math.random() * 3) + 1; // 1 to 3 seeds

            // 2. Bait Reward
            const fishingConfig = loadFishingConfig();
            const baitKeys = Object.keys(fishingConfig.baits);
            const randomBaitKey = baitKeys[Math.floor(Math.random() * baitKeys.length)];
            const baitReward = fishingConfig.baits[randomBaitKey];
            const baitQuantity = Math.floor(Math.random() * 3) + 1; // 1 to 3 baits

            if (!user) {
                user = await EconomyUserData.create({
                    userId: interaction.user.id,
                    balance: reward,
                    commandData: { lastDaily: now, dailyStreak: streak },
                    transactionLogs: []
                });
            } else {
                user.balance += reward;
                user.commandData.lastDaily = now;
                user.commandData.dailyStreak = streak;
            }

            // Add Seed
            await addToFarm(interaction.user.id, seedReward.name, seedQuantity, 'seed');

            // Add Bait
            const userFishing = await getUserFishing(interaction.user.id);
            const baitItem = userFishing.baits.find(b => b.name === baitReward.name);
            if (baitItem) {
                baitItem.quantity += baitQuantity;
            } else {
                userFishing.baits.push({ name: baitReward.name, quantity: baitQuantity });
            }
            await userFishing.save();


            const awardedItems = [];
            const dailyItems = config.Economy.Daily.Items;
            if (dailyItems && dailyItems.length > 0) {
                if (!user.inventory) {
                    user.inventory = [];
                }
                for (const item of dailyItems) {
                    if (Math.random() < item.chance) {
                        const userItem = user.inventory.find(i => i.itemId === item.itemId);
                        if (userItem) {
                            userItem.quantity += item.quantity;
                        } else {
                            user.inventory.push({
                                itemId: item.itemId,
                                name: item.name,
                                quantity: item.quantity,
                            });
                        }
                        awardedItems.push({ name: item.name, quantity: item.quantity });
                    }
                }
            }

            user.transactionLogs.push({
                type: 'daily',
                amount: reward,
                timestamp: now
            });

            await user.save();

            const placeholders = {
                user: `<@${interaction.user.id}>`,
                balance: reward,
                streak: streak
            };

            const description = replacePlaceholders(lang.Economy.Actions.Daily.Messages[Math.floor(Math.random() * lang.Economy.Actions.Daily.Messages.length)], placeholders);

            const embed = new EmbedBuilder()
                .setDescription(description)
                .setFooter({ text: replacePlaceholders(lang.Economy.Messages.footer, { balance: user.balance }) })
                .setColor('#00FF00')
                .addFields(
                    { name: '🌱 Hạt Giống', value: `${seedReward.emoji} ${seedReward.name} (x${seedQuantity})`, inline: true },
                    { name: '🪱 Mồi Câu', value: `${baitReward.name} (x${baitQuantity})`, inline: true }
                );

            if (awardedItems.length > 0) {
                const itemsString = awardedItems.map(item => `${item.name} (x${item.quantity})`).join('\n');
                embed.addFields({ name: 'Vật phẩm khác', value: itemsString, inline: false });
            }

            const dailyTitle = lang.Economy.Actions.Daily.Title;
            if (dailyTitle) {
                embed.setTitle(dailyTitle);
            }

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Error in daily command: ", error);
            interaction.reply({ content: lang.Economy.Messages.error, flags: MessageFlags.Ephemeral });
        }
    },
};