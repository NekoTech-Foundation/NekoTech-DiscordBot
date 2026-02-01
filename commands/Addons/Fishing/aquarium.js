const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { getUserFishing } = require('./fishingUtils');

function getFishEmoji(fishName, config) {
    const fish = Object.values(config.fish_pools).flat().find(f => f.name === fishName);
    return fish ? fish.emoji : '🐟';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aquarium')
        .setDescription('Xem bể cá của bạn')
        .addUserOption(option => option.setName('user').setDescription('Người dùng')),
    category: 'Addons',
    async execute(interaction) {
        const { loadConfig } = require('./fishingUtils');
        const config = loadConfig();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userFishing = await getUserFishing(targetUser.id);

        if (!userFishing.inventory || userFishing.inventory.length === 0) {
            return interaction.reply({ content: `${targetUser.username} chưa có con cá nào trong bể!`, ephemeral: true });
        }

        // Sort by Rarity (Legendary -> Common)
        const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
        const sortedFish = [...userFishing.inventory].sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);

        // Select top 9 fish for the 3x3 grid
        const topFish = sortedFish.slice(0, 9);

        // Generate Grid
        let grid = [];
        for (let i = 0; i < 9; i++) {
            if (topFish[i]) {
                grid.push(getFishEmoji(topFish[i].name, config));
            } else {
                grid.push('🟦'); // Water/Empty
            }
        }

        // Format into 3 rows
        const row1 = grid.slice(0, 3).join('   ');
        const row2 = grid.slice(3, 6).join('   ');
        const row3 = grid.slice(6, 9).join('   ');

        // Equipped Fish
        const equippedFishName = userFishing.equippedFish;
        const equippedFishEmoji = equippedFishName ? getFishEmoji(equippedFishName, config) : 'Không có';

        const embed = new EmbedBuilder()
            .setTitle(`🐠 Bể Cá Của ${targetUser.username}`)
            .setDescription(`
            **Cá Đại Diện:** ${equippedFishEmoji} ${equippedFishName || ''}

            🌊🌊🌊🌊🌊🌊🌊
            🌊  ${row1}  🌊
            🌊  ${row2}  🌊
            🌊  ${row3}  🌊
            🌊🌊🌊🌊🌊🌊🌊
            `)
            .setColor('Aqua')
            .addFields(
                { name: 'Cá Hiếm Nhất', value: getFishEmoji(sortedFish[0].name, config) + ' ' + sortedFish[0].name, inline: true },
                { name: 'Tổng Số Cá', value: `${userFishing.inventory.reduce((a, b) => a + b.quantity, 0)}`, inline: true }
            );

        // Only allow owner to equip
        if (targetUser.id === interaction.user.id) {
            const options = sortedFish.slice(0, 25).map(f => ({
                label: f.name,
                description: `Sở hữu: ${f.quantity} | ${f.rarity.toUpperCase()}`,
                value: f.name,
                emoji: getFishEmoji(f.name, config)
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('aquarium_equip')
                .setPlaceholder('Chọn cá đại diện (Equip)')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const response = await interaction.reply({ embeds: [embed], components: [row] });

            const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: 'Bạn không thể chỉnh sửa bể cá của người khác!', ephemeral: true });
                }

                if (i.customId === 'aquarium_equip') {
                    const selectedFishName = i.values[0];
                    userFishing.equippedFish = selectedFishName;
                    await userFishing.save();

                    // Update Embed
                    const newEquippedEmoji = getFishEmoji(selectedFishName, config);
                    embed.setDescription(`
                    **Cá Đại Diện:** ${newEquippedEmoji} ${selectedFishName}

                    🌊🌊🌊🌊🌊🌊🌊
                    🌊  ${row1}  🌊
                    🌊  ${row2}  🌊
                    🌊  ${row3}  🌊
                    🌊🌊🌊🌊🌊🌊🌊
                    `);

                    await i.update({ embeds: [embed], components: [row] });
                }
            });
        } else {
            await interaction.reply({ embeds: [embed] });
        }
    }
};
