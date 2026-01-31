const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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

        const embed = new EmbedBuilder()
            .setTitle(`🐠 Bể Cá Của ${targetUser.username}`)
            .setDescription(`
            🌊🌊🌊🌊🌊🌊🌊
            🌊  ${row1}  🌊
            🌊  ${row2}  🌊
            🌊  ${row3}  🌊
            🌊🌊🌊🌊🌊🌊🌊
            `)
            .setColor('Aqua')
            .addFields(
                { name: 'Cá Hiếm Nhất', value: getFishEmoji(sortedFish[0].name, config) + ' ' + sortedFish[0].name, inline: true },
                { name: 'Tổng Số Cá', value: `${userFishing.inventory.length}`, inline: true }
            );

        interaction.reply({ embeds: [embed] });
    }
};
