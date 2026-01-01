const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadConfig, getUserFishing } = require('./fishingUtils');
const EconomyUserData = require('../../../models/EconomyUserData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fixcancau')
        .setDescription('Sửa cần câu đã trang bị của bạn.'),

    async execute(interaction, lang) {
        const client = interaction.client;
        const userId = interaction.user.id;
        const config = loadConfig();
        const userFishing = await getUserFishing(userId);

        const equippedRodKey = userFishing.equippedRod;
        if (!equippedRodKey) {
            return interaction.reply({ content: 'Bạn chưa trang bị cần câu nào để sửa.', ephemeral: true });
        }

        const rodInInventory = userFishing.rods.find(r => r.key === equippedRodKey);
        const rodInConfig = config.rods[equippedRodKey];

        if (!rodInInventory || !rodInConfig) {
            return interaction.reply({ content: 'Không tìm thấy cần câu đã trang bị của bạn trong dữ liệu.', ephemeral: true });
        }

        const maxDurability = rodInConfig.durability;
        const durabilityPercentage = (rodInInventory.durability / maxDurability);

        if (durabilityPercentage > config.repair_durability_threshold) {
            const thresholdPercent = config.repair_durability_threshold * 100;
            return interaction.reply({ content: `Cần câu của bạn vẫn còn tốt (độ bền ${Math.round(durabilityPercentage * 100)}%). Bạn chỉ có thể sửa khi độ bền dưới ${thresholdPercent}%.`, ephemeral: true });
        }

        const cost = Math.floor(rodInConfig.price * config.repair_cost_multiplier);
        let economyData = await EconomyUserData.findOne({ userId });

        if (!economyData || economyData.balance < cost) {
            return interaction.reply({ content: `Bạn không đủ tiền để sửa cần câu. Chi phí là ${cost} xu.`, ephemeral: true });
        }

        economyData.balance -= cost;
        rodInInventory.durability = maxDurability;

        await economyData.save();
        await userFishing.save();

        const embed = new EmbedBuilder()
            .setTitle('Sửa Cần Câu Thành Công')
            .setDescription(`Đã sửa thành công **${rodInInventory.name}**!`)
            .addFields(
                { name: 'Chi phí', value: `${cost} xu` },
                { name: 'Độ bền mới', value: `${maxDurability}/${maxDurability}` }
            )
            .setColor('#2ECC71')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
