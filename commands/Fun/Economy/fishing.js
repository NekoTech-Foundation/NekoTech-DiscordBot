const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../../models/UserData');
const { getConfig, getLang } = require('../../../utils/configLoader');
const parseDuration = require('./Utility/parseDuration');
const { checkActiveBooster, replacePlaceholders } = require('./Utility/helpers');

const config = getConfig();
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fishing')
        .setDescription('Đi câu cá và kiếm phần thưởng!')
        .addSubcommand(subcommand => {
            subcommand
                .setName('locations')
                .setDescription('Xem các địa điểm câu cá có sẵn');
            return subcommand;
        })
        .addSubcommand(subcommand => {
            subcommand
                .setName('fish')
                .setDescription('Bắt đầu câu cá tại một địa điểm')
                .addStringOption(option => {
                    option.setName('location')
                        .setDescription('Chọn một địa điểm để câu cá')
                        .setRequired(true);
                    const locations = Object.keys(config.Economy.Fishing.locations);
                    locations.forEach(location => {
                        option.addChoices({ name: location, value: location });
                    });
                    return option;
                });
            return subcommand;
        }),
    category: 'Economy',
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'locations') {
            const locationsEmbed = new EmbedBuilder()
                .setTitle('🎣 Địa điểm câu cá')
                .setColor('#0099ff');

            let description = '';
            for (const location in config.Economy.Fishing.locations) {
                const loc = config.Economy.Fishing.locations[location];
                description += `**${location.charAt(0).toUpperCase() + location.slice(1)}**\n`;
                description += `Chi phí: ${loc.cost} xu\n`;
                description += `Cá có sẵn: ${loc.fish.map(f => f.name).join(', ')}\n\n`;
            }
            locationsEmbed.setDescription(description);

            return interaction.reply({ embeds: [locationsEmbed] });
        }

        if (subcommand === 'fish') {
            const locationName = interaction.options.getString('location');
            const locationData = config.Economy.Fishing.locations[locationName];

            if (!locationData) {
                return interaction.reply({ content: 'Địa điểm không hợp lệ.', ephemeral: true });
            }

            let user = await User.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });

            if (!user) {
                user = new User({ userId: interaction.user.id, guildId: interaction.guild.id });
            }

            // --- Equipment and Boosters ---
            let luckMultiplier = 1.0;
            let catchMultiplier = 1.0;
            let cooldownReduction = 0;

            const luckBooster = checkActiveBooster(user, 'FishingLuck');
            luckMultiplier *= luckBooster;

            const equippedRodName = user.equipment.FishingRod;
            let equippedRod = null;
            if (equippedRodName) {
                equippedRod = Object.values(config.Store.Equipment).find(i => i.Name === equippedRodName);
                if (equippedRod) {
                    luckMultiplier *= (equippedRod.LuckBonus || 1.0);
                    catchMultiplier *= (equippedRod.CatchBonus || 1.0);
                    cooldownReduction = equippedRod.CooldownReduction || 0;
                }
            }
            // --- End Equipment and Boosters ---

            if (user.balance < locationData.cost) {
                return interaction.reply({ content: 'Bạn không có đủ tiền để câu cá ở đây.', ephemeral: true });
            }

            const now = new Date();
            const baseCooldown = parseDuration(config.Economy.Fishing.cooldown);
            const finalCooldown = Math.max(0, baseCooldown - cooldownReduction);

            if (user.commandData.lastFishing && finalCooldown > 0) {
                const nextFish = new Date(user.commandData.lastFishing.getTime() + finalCooldown);
                if (now < nextFish) {
                    return interaction.reply({ content: `Bạn đang trong thời gian hồi. Vui lòng thử lại sau <t:${Math.floor(nextFish.getTime() / 1000)}:R>.`, ephemeral: true });
                }
            }

            user.balance -= locationData.cost;

            // Fishing logic
            const random = Math.random();
            let caughtFish = null;
            let cumulativeChance = 0;

            for (const fish of locationData.fish) {
                cumulativeChance += fish.chance * luckMultiplier;
                if (random < cumulativeChance) {
                    caughtFish = fish;
                    break;
                }
            }

            if (caughtFish) {
                const baseReward = Math.floor(Math.random() * (caughtFish.maxReward - caughtFish.minReward + 1)) + caughtFish.minReward;
                const finalReward = Math.floor(baseReward * catchMultiplier);
                user.balance += finalReward;

                const successEmbed = new EmbedBuilder()
                    .setTitle('🎣Câu cá thành công!')
                    .setDescription(`Bạn đã câu được một con **${caughtFish.name}** và nhận được ${finalReward} xu!`)
                    .setColor('#00ff00')
                    .setFooter({ text: `Số dư mới: ${user.balance} xu` });

                interaction.reply({ embeds: [successEmbed] });
            } else {
                const failureEmbed = new EmbedBuilder()
                    .setTitle('🎣 Không may mắn lần sau!')
                    .setDescription('Bạn không câu được con cá nào cả.')
                    .setColor('#ff0000')
                    .setFooter({ text: `Số dư mới: ${user.balance} xu` });

                interaction.reply({ embeds: [failureEmbed] });
            }

            user.commandData.lastFishing = now;
            await user.save();
        }
    }
};