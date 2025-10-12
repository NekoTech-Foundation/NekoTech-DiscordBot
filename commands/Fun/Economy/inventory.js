const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const User = require('../../../models/UserData');
const fs = require('fs');
const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();
const parseDuration = require('./Utility/parseDuration');

const { replacePlaceholders } = require('./Utility/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Xem và quản lí kho đồ của bạn'),
    category: 'Economy',
    async execute(interaction) {
        const user = await User.findOne({ userId: interaction.user.id, guildId: interaction.guild.id }, { inventory: 1, boosters: 1, equipment: 1 });

        if (!user || !user.inventory.length) {
            const embed = new EmbedBuilder()
                .setDescription(lang.Economy.Other.Inventory.empty)
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const categories = lang.Economy.Other.Store.Categories;
        let currentPage = 0;
        let currentCategory = categories[0];
        const itemsPerPage = 5;

        const getCategoryItems = category => {
            if (!config.Store[category]) return [];
            return user.inventory.filter(userItem => {
                return Object.values(config.Store[category]).some(storeItem => storeItem.Name === userItem.itemId);
            });
        };

        const updateInventoryMessage = async () => {
            const categoryItems = getCategoryItems(currentCategory);
            const start = currentPage * itemsPerPage;
            const end = start + itemsPerPage;
            const currentItems = categoryItems.slice(start, end);

            const description = currentItems.length
                ? currentItems.map((item, index) => {
                    return replacePlaceholders(lang.Economy.Other.Inventory.Embed.Description[0], {
                        itemNum: start + index + 1,
                        item: item.itemId,
                        amount: item.quantity
                    });
                }).join('\n')
                : lang.Economy.Other.Inventory.noItems;

            const embed = new EmbedBuilder()
                .setTitle(replacePlaceholders(lang.Economy.Other.Inventory.Embed.Title, { category: currentCategory }))
                .setDescription(description)
                .setFooter({ text: replacePlaceholders(lang.Economy.Other.Inventory.Embed.Footer.Text, { pageCurrent: currentPage + 1, pageMax: Math.ceil(categoryItems.length / itemsPerPage) }) })
                .setColor(lang.Economy.Other.Inventory.Embed.Color);

            const components = [
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('category_select')
                        .setPlaceholder(lang.Economy.Messages.inventoryCategory)
                        .addOptions(categories.map(category => ({ label: category, value: category })))
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('Trang Trước')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 0),
                    ...currentItems.map((item, index) =>
                        new ButtonBuilder()
                            .setCustomId(`redeem_${start + index}`)
                            .setLabel(`${item.itemId} (${item.quantity})`)
                            .setStyle(ButtonStyle.Secondary)
                    ),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('Trang Sau')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(end >= categoryItems.length)
                )
            ];

            try {
                await interaction.editReply({ content: '', embeds: [embed], components });
            } catch (error) {
                console.error('Failed to edit reply:', error);
            }
        };

        await interaction.reply({ content: 'Loading...', flags: MessageFlags.Ephemeral });
        await updateInventoryMessage();

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return;

            if (i.customId === 'category_select') {
                currentCategory = i.values[0];
                currentPage = 0;
                await i.deferUpdate();
                await updateInventoryMessage();
            } else if (i.customId === 'prev_page') {
                currentPage--;
                await i.deferUpdate();
                await updateInventoryMessage();
            } else if (i.customId === 'next_page') {
                currentPage++;
                await i.deferUpdate();
                await updateInventoryMessage();
            } else if (i.customId.startsWith('redeem_')) {
                const index = parseInt(i.customId.split('_')[1]);
                const categoryItems = getCategoryItems(currentCategory);
                const selectedItem = categoryItems[index - currentPage * itemsPerPage];

                if (selectedItem.quantity > 1) {
                    selectedItem.quantity--;
                } else {
                    user.inventory = user.inventory.filter(item => item.itemId !== selectedItem.itemId);
                }

                const storeItem = Object.values(config.Store[currentCategory]).find(item => item.Name === selectedItem.itemId);
                if (storeItem) {
                    if (storeItem.Booster && storeItem.Duration) {
                        const duration = parseDuration(storeItem.Duration);
                        user.boosters.push({
                            type: storeItem.Booster,
                            endTime: Date.now() + duration
                        });
                    }
                    if (storeItem.RoleID) {
                        const member = await interaction.guild.members.fetch(interaction.user.id);
                        storeItem.RoleID.forEach(async roleId => {
                            const role = interaction.guild.roles.cache.get(roleId);
                            if (role) await member.roles.add(role);
                        });
                    }
                    if (currentCategory === 'Equipment') {
                        if (storeItem.Type === 'FishingRod') {
                            user.equipment.FishingRod = selectedItem.itemId;
                        } else if (storeItem.Type === 'HuntingWeapon') {
                            user.equipment.HuntingWeapon = selectedItem.itemId;
                        }
                    }
                }

                await user.save();

                const embed = new EmbedBuilder()
                    .setDescription(replacePlaceholders(lang.Economy.Other.Inventory.redeem, { item: selectedItem.itemId }))
                    .setColor('#00FF00');
                await i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

                if (!user.inventory.length) {
                    collector.stop();
                    const emptyEmbed = new EmbedBuilder()
                        .setDescription(lang.Economy.Other.Inventory.empty)
                        .setColor('#FF0000');
                    try {
                        await interaction.editReply({ embeds: [emptyEmbed], components: [] });
                    } catch (error) {
                        console.error('Failed to edit reply:', error);
                    }
                    return;
                }

                await updateInventoryMessage();
            }
        });

        collector.on('end', async () => {
            const components = message.components.map(row => {
                row.components.forEach(component => {
                    if (typeof component.setDisabled === 'function') {
                        component.setDisabled(true);
                    }
                });
                return row;
            });
            try {
                await interaction.editReply({ components });
            } catch (error) {
                console.error('Failed to edit message:', error);
            }
        });
    },
};