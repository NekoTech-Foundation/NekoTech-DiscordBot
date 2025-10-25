const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { getConfig, getLang, getCommands } = require('../../../utils/configLoader.js');
const config = getConfig();
const lang = getLang();
const User = require('../../../models/UserData');
const parseDuration = require('./Utility/parseDuration');
const { replacePlaceholders } = require('./Utility/helpers');

// Import vé số addon nếu có
let vesoAddon = null;
let vesoConfig = null;
try {
    vesoAddon = require('../../../addons/VeSo/veso.js');
    vesoConfig = yaml.load(fs.readFileSync(path.join(__dirname, '../../../addons/VeSo/config.yml'), 'utf8'));
} catch (error) {
    // Vé số addon không có hoặc chưa cài
}

module.exports = {
    data: (() => {
        const builder = new SlashCommandBuilder()
            .setName('store')
            .setDescription('Mua hàng từ cửa hàng, uh... chất lắm!')
            .addStringOption(option => {
                option.setName('category')
                    .setDescription('Chọn Danh Mục Muốn Mua')
                    .setRequired(true);

                const categories = Object.keys(config.Store).filter(category => 
                    category !== 'Embed' && category !== 'Categories'
                );
                
                categories.forEach(category => {
                    option.addChoices({ name: category, value: category });
                });

                return option;
            });

        return builder;
    })(),
    category: 'Economy',
    
    async execute(interaction) {
        try {
            const category = interaction.options.getString('category');
            
            // Validate category exists and has items
            if (!config.Store[category]) {
                await interaction.reply({ 
                    content: 'Invalid category selected.', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            const items = Object.values(config.Store[category]);
            
            if (!items || items.length === 0) {
                await interaction.reply({ 
                    content: 'This category has no items available.', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            const itemsPerPage = 5;
            let page = 0;
            const totalPages = Math.ceil(items.length / itemsPerPage);

            const getItemList = (currentPage) => {
                const start = currentPage * itemsPerPage;
                const end = start + itemsPerPage;
                return items.slice(start, end).map((item, index) => {
                    // Safely handle missing description array
                    const descriptionTemplate = lang.Economy?.Other?.Store?.Embed?.Description || [];
                    return descriptionTemplate.map(line => replacePlaceholders(line, {
                        itemCount: `${start + index + 1}`,
                        item: item.Name || 'Unknown Item',
                        description: item.Description || 'No description',
                        price: item.Price || 0
                    })).join('\n');
                }).join('\n\n');
            };

            const createEmbed = (currentPage) => {
                const embedConfig = lang.Economy?.Other?.Store?.Embed || {};
                const embed = new EmbedBuilder().setColor(embedConfig.Color || '#0099ff');

                if (embedConfig.Title) {
                    embed.setTitle(replacePlaceholders(embedConfig.Title, { shopName: category }));
                }

                const itemList = getItemList(currentPage);
                if (itemList) {
                    embed.setDescription(itemList);
                }

                if (embedConfig.Footer?.Text) {
                    embed.setFooter({
                        text: replacePlaceholders(embedConfig.Footer.Text, {
                            pageCurrent: currentPage + 1,
                            pageMax: totalPages
                        }),
                        iconURL: embedConfig.Footer.Icon || undefined
                    });
                }

                if (embedConfig.Author?.Text) {
                    embed.setAuthor({
                        name: embedConfig.Author.Text,
                        iconURL: embedConfig.Author.Icon || undefined
                    });
                }

                if (embedConfig.Image) {
                    embed.setImage(embedConfig.Image);
                }

                if (embedConfig.Thumbnail) {
                    embed.setThumbnail(embedConfig.Thumbnail);
                }

                return embed;
            };

            const createComponents = (currentPage) => {
                const start = currentPage * itemsPerPage;
                const end = Math.min(start + itemsPerPage, items.length);
                const currentItems = items.slice(start, end);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('buy')
                    .setPlaceholder('Chọn vật phẩm để mua.')
                    .addOptions(currentItems.map((item, index) => ({
                        label: item.Name || `Item ${index + 1}`,
                        description: (item.Description || 'No description').substring(0, 100),
                        value: `${start + index}`
                    })));

                const navigationRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back')
                            .setLabel('◀')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setCustomId('forward')
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === totalPages - 1)
                    );

                return [
                    new ActionRowBuilder().addComponents(selectMenu),
                    navigationRow
                ];
            };

            const updateMessage = async (i) => {
                try {
                    await i.update({
                        embeds: [createEmbed(page)],
                        components: createComponents(page)
                    });
                } catch (error) {
                    console.error('Error updating message:', error);
                }
            };

            const handlePurchase = async (i, itemIndex) => {
                try {
                    const item = items[itemIndex];

                    if (!item) {
                        await i.reply({ 
                            content: 'Invalid item selection.', 
                            flags: MessageFlags.Ephemeral 
                        });
                        return;
                    }

                    // Kiểm tra nếu là vé số
                    if (category === 'Vé Số' && vesoAddon && vesoConfig) {
                        const price = item.Price || 0;
                        
                        let user = await User.findOne(
                            { userId: i.user.id, guildId: i.guild.id },
                            { balance: 1, transactionLogs: 1 }
                        );

                        if (!user) {
                            user = new User({ 
                                userId: i.user.id, 
                                guildId: i.guild.id, 
                                balance: 0,
                                transactionLogs: []
                            });
                        }
                        
                        // Đảm bảo transactionLogs tồn tại
                        if (!user.transactionLogs) {
                            user.transactionLogs = [];
                        }

                        if (user.balance < price) {
                            await i.reply({ 
                                content: lang.Economy?.Messages?.noMoney || 'You do not have enough money.', 
                                flags: MessageFlags.Ephemeral 
                            });
                            return;
                        }

                        try {
                            const ticketData = await vesoAddon.buyTicket(i.user.id, i.guild.id, price);
                            
                            // Trừ tiền
                            user.balance -= price;
                            user.transactionLogs.push({
                                type: 'veso_purchase',
                                amount: -price,
                                timestamp: new Date()
                            });
                            await user.save();

                            // Gửi embed thông báo mua vé thành công
                            const currency = config.Currency || '💰';
                            const vesoEmbed = new EmbedBuilder()
                                .setColor(vesoConfig.settings.colors.buy)
                                .setTitle(vesoConfig.messages.buy_success.title)
                                .setDescription(
                                    vesoConfig.messages.buy_success.description
                                        .replace(/{price}/g, price)
                                        .replace(/{currency}/g, currency)
                                        .replace(/{numbers}/g, ticketData.numbers)
                                        .replace(/{prize}/g, ticketData.prize)
                                )
                                .setFooter({ text: vesoConfig.messages.buy_success.footer })
                                .setTimestamp();

                            await i.reply({
                                embeds: [vesoEmbed],
                                flags: MessageFlags.Ephemeral
                            });
                            return;
                        } catch (error) {
                            console.error('[VeSo Store] Error:', error);
                            if (error.message === 'DISABLED') {
                                await i.reply({ 
                                    content: vesoConfig.errors.disabled, 
                                    flags: MessageFlags.Ephemeral 
                                });
                            } else {
                                await i.reply({ 
                                    content: 'Có lỗi xảy ra khi mua vé số: ' + error.message, 
                                    flags: MessageFlags.Ephemeral 
                                });
                            }
                            return;
                        }
                    }

                    let user = await User.findOne(
                        { userId: i.user.id, guildId: i.guild.id },
                        { balance: 1, interestRate: 1, purchasedItems: 1, inventory: 1, transactionLogs: 1 }
                    );

                    if (!user) {
                        user = new User({ 
                            userId: i.user.id, 
                            guildId: i.guild.id, 
                            balance: 0, 
                            boosters: [], 
                            purchasedItems: [], 
                            transactionLogs: [], 
                            inventory: [] 
                        });
                    }

                    const itemPrice = item.Price || 0;

                    if (user.balance < itemPrice) {
                        await i.reply({ 
                            content: lang.Economy?.Messages?.noMoney || 'You do not have enough money.', 
                            flags: MessageFlags.Ephemeral 
                        });
                        return;
                    }

                    // Check purchase limit
                    const purchasedItemIndex = user.purchasedItems.findIndex(p => p.itemId === item.Name);
                    if (item.Limit && purchasedItemIndex >= 0) {
                        const currentQuantity = user.purchasedItems[purchasedItemIndex].quantity || 0;
                        const limit = parseInt(item.Limit, 10);
                        if (currentQuantity >= limit) {
                            await i.reply({ 
                                content: replacePlaceholders(
                                    lang.Economy?.Other?.Store?.purchaseLimit || 'You have reached the purchase limit for {item}.',
                                    { limit: item.Limit, item: item.Name }
                                ), 
                                flags: MessageFlags.Ephemeral 
                            });
                            return;
                        }
                    }

                    const currentInterestRate = user.interestRate ?? config.Economy?.defaultInterestRate ?? 0;

                    // Handle Interest type items
                    if (item.Type === 'Interest') {
                        const itemInterest = item.Interest || 0;
                        if (currentInterestRate >= itemInterest) {
                            await i.reply({ 
                                content: lang.Economy?.Other?.Store?.higherInterestRate || 'You already have a higher or equal interest rate.', 
                                flags: MessageFlags.Ephemeral 
                            });
                            return;
                        }
                        user.interestRate = itemInterest;
                    }

                    // Deduct balance and log transaction
                    user.balance -= itemPrice;
                    user.transactionLogs.push({
                        type: 'purchase',
                        amount: -itemPrice,
                        timestamp: new Date()
                    });

                    // Update purchased items
                    if (purchasedItemIndex >= 0) {
                        user.purchasedItems[purchasedItemIndex].quantity += 1;
                    } else {
                        user.purchasedItems.push({ itemId: item.Name, quantity: 1 });
                    }

                    // Handle Booster items
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
                    } 
                    // Handle Rank items
                    else if (item.Type === 'Rank' || item.RoleID) {
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
                        // Assign the role(s) to the user if RoleID(s) are present
                        if (item.RoleID && interaction.member) {
                            const roleIds = Array.isArray(item.RoleID) ? item.RoleID : [item.RoleID]; // Ensure roleIds is an array
                            for (const roleId of roleIds) {
                                try {
                                    const role = interaction.guild.roles.cache.get(roleId);
                                    if (role) {
                                        await interaction.member.roles.add(role);
                                        console.log(`Assigned role ${role.name} to ${interaction.user.tag}`);
                                    } else {
                                        console.warn(`Role with ID ${roleId} not found in guild ${interaction.guild.name}`);
                                    }
                                } catch (roleError) {
                                    console.error(`Error assigning role ${roleId} to ${interaction.user.tag}:`, roleError);
                                }
                            }
                        }
                    } 
                    // Handle Equipment items
                    else if (category === 'Equipment') {
                        const inventoryItemIndex = user.inventory.findIndex(p => p.itemId === item.Name);
                        if (inventoryItemIndex >= 0) {
                            user.inventory[inventoryItemIndex].quantity += 1;
                        } else {
                            user.inventory.push({
                                itemId: item.Name,
                                quantity: 1,
                                isEquipment: true,
                                type: item.Type,
                                durability: item.Durability || 100,
                                catchBonus: item.CatchBonus || 0
                            });
                        }
                    }

                    await user.save();
                    
                    await i.reply({
                        content: replacePlaceholders(
                            lang.Economy?.Other?.Store?.purchaseSuccess || 'Successfully purchased {item}! Balance: {balance}',
                            {
                                item: item.Name,
                                balance: user.balance
                            }
                        ),
                        flags: MessageFlags.Ephemeral
                    });
                } catch (error) {
                    console.error('Error handling purchase:', error);
                    if (!i.replied && !i.deferred) {
                        await i.reply({ 
                            content: 'There was an error processing your purchase.', 
                            flags: MessageFlags.Ephemeral 
                        });
                    }
                }
            };

            // Send initial message
            await interaction.reply({
                embeds: [createEmbed(page)],
                components: createComponents(page)
            });

            // Fetch the reply message
            const message = await interaction.fetchReply();

            // Create collector
            const filter = i => i.user.id === interaction.user.id;
            const collector = message.createMessageComponentCollector({ 
                filter, 
                time: 60000 
            });

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
                    console.error('Error in collector:', error);
                    if (!i.replied && !i.deferred) {
                        await i.reply({ 
                            content: 'There was an error while executing this action.', 
                            flags: MessageFlags.Ephemeral 
                        });
                    } else {
                        await i.followUp({ 
                            content: 'There was an error while executing this action.', 
                            flags: MessageFlags.Ephemeral 
                        });
                    }
                }
            });

            collector.on('end', async () => {
                try {
                    await interaction.editReply({ components: [] });
                } catch (error) {
                    console.error('Error removing components:', error);
                }
            });

        } catch (error) {
            console.error('Error executing store command:', error);
            const errorMessage = { 
                content: 'There was an error while executing this command.', 
                flags: MessageFlags.Ephemeral 
            };
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(errorMessage);
            } else {
                await interaction.followUp(errorMessage);
            }
        }
    }
};