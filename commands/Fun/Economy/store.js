const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();
const User = require('../../../models/UserData');
const parseDuration = require('./Utility/parseDuration');

const { replacePlaceholders } = require('./Utility/helpers');

module.exports = {
    data: (() => {
        const builder = new SlashCommandBuilder()
            .setName('store')
            .setDescription('Mua hàng từ cửa hàng,uh... chất lắm!')
            .addStringOption(option => {
                option.setName('category')
                    .setDescription('Chọn Danh Mục Muốn Mua')
                    .setRequired(true);

                const categories = Object.keys(config.Store).filter(category => category !== 'Embed' && category !== 'Categories');
                categories.forEach(category => {
                    option.addChoices({ name: category, value: category });
                });

                return option;
            });

        return builder;
    })(),
    category: 'Economy',
    async execute(interaction) {
        const category = interaction.options.getString('category');
        const items = Object.values(config.Store[category]);
        const itemsPerPage = 5;
        let page = 0;
        const totalPages = Math.ceil(items.length / itemsPerPage);

        const getItemList = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            return items.slice(start, end).map((item, index) => {
                return lang.Economy.Other.Store.Embed.Description.map(line => replacePlaceholders(line, {
                    itemCount: `${start + index + 1}`,
                    item: item.Name,
                    description: item.Description,
                    price: item.Price
                })).join('\n');
            }).join('\n\n');
        };

        const createEmbed = (page) => {
            const embed = new EmbedBuilder().setColor(lang.Economy.Other.Store.Embed.Color);

            if (lang.Economy.Other.Store.Embed.Title) {
                embed.setTitle(replacePlaceholders(lang.Economy.Other.Store.Embed.Title, { shopName: category }));
            }

            if (lang.Economy.Other.Store.Embed.Description.length) {
                embed.setDescription(getItemList(page));
            }

            if (lang.Economy.Other.Store.Embed.Footer.Text) {
                embed.setFooter({
                    text: replacePlaceholders(lang.Economy.Other.Store.Embed.Footer.Text, {
                        pageCurrent: (page + 1),
                        pageMax: totalPages
                    }),
                    iconURL: lang.Economy.Other.Store.Embed.Footer.Icon || null
                });
            }

            if (lang.Economy.Other.Store.Embed.Author.Text) {
                embed.setAuthor({
                    name: lang.Economy.Other.Store.Embed.Author.Text,
                    iconURL: lang.Economy.Other.Store.Embed.Author.Icon || null
                });
            }

            if (lang.Economy.Other.Store.Embed.Image) {
                embed.setImage(lang.Economy.Other.Store.Embed.Image);
            }

            if (lang.Economy.Other.Store.Embed.Thumbnail) {
                embed.setThumbnail(lang.Economy.Other.Store.Embed.Thumbnail);
            }

            return embed;
        };

        const createComponents = (page) => {
            const start = page * itemsPerPage;
            const end = Math.min(start + itemsPerPage, items.length);
            const currentItems = items.slice(start, end);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('buy')
                .setPlaceholder('Chọn vật phẩm để mua.')
                .addOptions(currentItems.map((item, index) => ({
                    label: item.Name,
                    description: item.Description.substring(0, 100),
                    value: `${start + index}`
                })));

            const navigationRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back')
                        .setLabel('◀')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('forward')
                        .setLabel('▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages - 1)
                );

            return [
                new ActionRowBuilder().addComponents(selectMenu),
                navigationRow
            ];
        };

        const updateMessage = async (i) => {
            await i.update({
                embeds: [createEmbed(page)],
                components: createComponents(page)
            }).catch(console.error);
        };

        const handlePurchase = async (i, itemIndex) => {
            const item = items[itemIndex];

            let user = await User.findOne(
                { userId: i.user.id, guildId: i.guild.id },
                { balance: 1, interestRate: 1, purchasedItems: 1, inventory: 1, transactionLogs: 1 }
            );

            if (!user) {
                user = new User({ userId: i.user.id, guildId: i.guild.id, balance: 0, boosters: [], purchasedItems: [], transactionLogs: [], inventory: [] });
            }

            if (user.balance < item.Price) {
                await i.reply({ content: lang.Economy.Messages.noMoney, flags: MessageFlags.Ephemeral });
                return;
            }

            const purchasedItemIndex = user.purchasedItems.findIndex(p => p.itemId === item.Name);
            if (item.Limit && purchasedItemIndex >= 0 && user.purchasedItems[purchasedItemIndex].quantity >= parseInt(item.Limit, 10)) {
                await i.reply({ content: replacePlaceholders(lang.Economy.Other.Store.purchaseLimit, { limit: item.Limit, item: item.Name }), flags: MessageFlags.Ephemeral });
                return;
            }

            const currentInterestRate = user.interestRate !== null ? user.interestRate : config.Economy.defaultInterestRate;

            if (item.Type === 'Interest') {
                if (currentInterestRate >= item.Interest) {
                    await i.reply({ content: lang.Economy.Other.Store.higherInterestRate, flags: MessageFlags.Ephemeral });
                    return;
                }
                user.interestRate = item.Interest;
            }

            user.balance -= item.Price;
            user.transactionLogs.push({
                type: 'purchase',
                amount: -item.Price,
                timestamp: new Date()
            });

            if (purchasedItemIndex >= 0) {
                user.purchasedItems[purchasedItemIndex].quantity += 1;
            } else {
                user.purchasedItems.push({ itemId: item.Name, quantity: 1 });
            }

            if (item.Type === 'Booster' || item.Booster) {
                const inventoryItemIndex = user.inventory.findIndex(p => p.itemId === item.Name);
                if (inventoryItemIndex >= 0) {
                    user.inventory[inventoryItemIndex].quantity += 1;
                } else {
                    user.inventory.push({
                        itemId: item.Name,
                        quantity: 1,
                        isBooster: true,
                        isRank: false,
                        duration: parseDuration(item.Duration || '0'),
                        multiplier: parseFloat(item.Multiplier || '1'),
                        roleIds: item.RoleID || []
                    });
                }
            } else if (item.Type === 'Rank' || item.RoleID) {
                const inventoryItemIndex = user.inventory.findIndex(p => p.itemId === item.Name);
                if (inventoryItemIndex >= 0) {
                    user.inventory[inventoryItemIndex].quantity += 1;
                } else {
                    user.inventory.push({
                        itemId: item.Name,
                        quantity: 1,
                        isBooster: false,
                        isRank: true,
                        duration: parseDuration(item.Duration || '0'),
                        multiplier: 1,
                        roleIds: item.RoleID || []
                    });
                }
            } else if (category === 'Equipment') {
                const inventoryItemIndex = user.inventory.findIndex(p => p.itemId === item.Name);
                if (inventoryItemIndex >= 0) {
                    user.inventory[inventoryItemIndex].quantity += 1;
                } else {
                    user.inventory.push({
                        itemId: item.Name,
                        quantity: 1,
                        isEquipment: true,
                        type: item.Type,
                        durability: item.Durability,
                        catchBonus: item.CatchBonus
                    });
                }
            }

            await user.save();
            await i.reply({
                content: replacePlaceholders(lang.Economy.Other.Store.purchaseSuccess, {
                    item: item.Name,
                    balance: user.balance
                }),
                flags: MessageFlags.Ephemeral
            });
        };

        const message = await interaction.reply({
            embeds: [createEmbed(page)],
            components: createComponents(page),
            withResponse: true
        });

        const filter = i => i.user.id === interaction.user.id;
        const collector = message.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            try {
                if (i.customId === 'back') {
                    page--;
                    await updateMessage(i);
                } else if (i.customId === 'forward') {
                    page++;
                    await updateMessage(i);
                } else if (i.customId === 'buy') {
                    const itemIndex = parseInt(i.values[0]);
                    await handlePurchase(i, itemIndex);
                }
            } catch (error) {
                console.error(error);
                if (!i.replied && !i.deferred) {
                    await i.reply({ content: 'There was an error while executing this action.', flags: MessageFlags.Ephemeral });
                } else {
                    await i.followUp({ content: 'There was an error while executing this action.', flags: MessageFlags.Ephemeral });
                }
            }
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] }).catch(console.error);
        });
    }
};