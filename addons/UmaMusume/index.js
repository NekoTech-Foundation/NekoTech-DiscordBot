const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const UserUmaModel = require('./schemas/useruma');
const { calculateRank, generateStats, simulateRace, generateTrackPreferences, formatTrackPreferences, generateBonuses, formatBonuses } = require('./umaUtilsNew');
const mongoose = require('mongoose');

module.exports = {
    name: 'UmaMusume',
    description: 'Uma Musume: Pretty Derby - Gacha và huấn luyện mã nương',
    version: '1.0.0',
    
    commands: [
        // Gacha Command
        {
            data: new SlashCommandBuilder()
                .setName('uma')
                .setDescription('Uma Musume: Pretty Derby')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('gacha')
                        .setDescription('Gacha một mã nương (500 carrots)'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('exchange_carrots')
                        .setDescription('Đổi coins sang carrots (10 coins = 1 carrot)')
                        .addIntegerOption(option => 
                            option.setName('amount')
                                .setDescription('Số lượng carrots muốn đổi')
                                .setRequired(true)
                                .setMinValue(1)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('Xem danh sách mã nương của bạn')
                        .addIntegerOption(option =>
                            option.setName('page')
                                .setDescription('Trang số')
                                .setMinValue(1)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('info')
                        .setDescription('Xem thông tin chi tiết mã nương'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('profile')
                        .setDescription('Xem profile người chơi')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('Người dùng cần xem')))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('set_favorite')
                        .setDescription('Đặt mã nương đại diện'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('train')
                        .setDescription('Huấn luyện mã nương')
                        .addStringOption(option =>
                            option.setName('stat')
                                .setDescription('Chỉ số muốn train')
                                .setRequired(true)
                                .addChoices(
                                    { name: '⚡ Tốc độ (Speed)', value: 'speed' },
                                    { name: '💪 Sức bền (Stamina)', value: 'stamina' },
                                    { name: '🔥 Sức mạnh (Power)', value: 'power' },
                                    { name: '❤️ Tinh thần (Guts)', value: 'guts' },
                                    { name: '🧠 Khôn ngoan (Wit)', value: 'wit' }
                                )))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('energy')
                        .setDescription('Nhận năng lượng hàng ngày'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('race')
                        .setDescription('Tham gia đua (PvE)'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('pvp')
                        .setDescription('Thách đấu người chơi khác')
                        .addUserOption(option =>
                            option.setName('opponent')
                                .setDescription('Đối thủ')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('set_defense')
                        .setDescription('Đặt đội phòng thủ (Champions Meeting)'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('challenge')
                        .setDescription('Thách đấu đội phòng thủ')
                        .addUserOption(option =>
                            option.setName('opponent')
                                .setDescription('Đối thủ')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('retire')
                        .setDescription('Cho mã nương nghỉ hưu')),
            
            async execute(interaction) {
                const subcommand = interaction.options.getSubcommand();
                
                switch (subcommand) {
                    case 'gacha':
                        return await this.handleGacha(interaction);
                    case 'exchange_carrots':
                        return await this.handleExchangeCarrots(interaction);
                    case 'list':
                        return await this.handleList(interaction);
                    case 'info':
                        return await this.showUmaSelector(interaction, 'info');
                    case 'profile':
                        return await this.handleProfile(interaction);
                    case 'set_favorite':
                        return await this.showUmaSelector(interaction, 'set_favorite');
                    case 'train':
                        return await this.showUmaSelector(interaction, 'train');
                    case 'energy':
                        return await this.handleEnergy(interaction);
                    case 'race':
                        return await this.showUmaSelector(interaction, 'race');
                    case 'pvp':
                        return await this.showUmaSelector(interaction, 'pvp');
                    case 'set_defense':
                        return await this.handleSetDefense(interaction);
                    case 'challenge':
                        return await this.handleChallenge(interaction);
                    case 'retire':
                        return await this.showUmaSelector(interaction, 'retire');
                }
            },
            
            async showUmaSelector(interaction, action) {
                const userId = interaction.user.id;
                const { StringSelectMenuBuilder } = require('discord.js');
                
                const userUmas = await UserUmaModel.find({ userId, isRetired: false }).limit(25);
                
                if (userUmas.length === 0) {
                    return interaction.reply('❌ Bạn chưa có mã nương nào! Hãy dùng `/uma gacha` để gacha.');
                }
                
                const options = userUmas.map(uma => {
                    const rank = calculateRank(uma.stats);
                    return {
                        label: uma.name,
                        description: `${'★'.repeat(uma.tier)} | ${rank} | ⚡${uma.energy}/10`,
                        value: uma._id.toString()
                    };
                });
                
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`uma_select_${action}_${userId}`)
                    .setPlaceholder('Chọn mã nương')
                    .addOptions(options);
                
                const row = new ActionRowBuilder().addComponents(selectMenu);
                
                let message = 'Chọn mã nương:';
                if (action === 'train') {
                    const stat = interaction.options.getString('stat');
                    interaction.client.umaActionCache = interaction.client.umaActionCache || {};
                    interaction.client.umaActionCache[userId] = { action, stat };
                    message = `Chọn mã nương để train ${stat}:`;
                } else if (action === 'pvp') {
                    const opponent = interaction.options.getUser('opponent');
                    interaction.client.umaActionCache = interaction.client.umaActionCache || {};
                    interaction.client.umaActionCache[userId] = { action, opponentId: opponent.id };
                    message = `Chọn mã nương để thách đấu ${opponent}:`;
                }
                
                return interaction.reply({ content: message, components: [row], ephemeral: true });
            },
            
            async handleGacha(interaction) {
                const Economy = require('../../models/EconomyUserData');
                const userId = interaction.user.id;
                const gachaConfig = require('./gacha.json');
                const gachaCost = 500;
                
                await interaction.deferReply();
                
                const userEconomy = await Economy.findOne({ userId });
                if (!userEconomy || !userEconomy.carrots || userEconomy.carrots < gachaCost) {
                    return interaction.editReply(`❌ Bạn không đủ ${gachaCost} <:carrot:1436533295084208328> carrots để gacha! Dùng \`/daily\` hoặc \`/uma exchange_carrots\` để có thêm.`);
                }
                
                // Deduct carrots
                userEconomy.carrots -= gachaCost;
                await userEconomy.save();
                
                // Roll tier
                const roll = Math.random() * 100;
                let tier = 1;
                let rarity = 'Common';
                
                if (roll < gachaConfig.rates.rainbow) {
                    tier = 3;
                    rarity = 'Rainbow';
                } else if (roll < gachaConfig.rates.rainbow + gachaConfig.rates.gold) {
                    tier = 3;
                    rarity = 'Gold';
                } else if (roll < gachaConfig.rates.rainbow + gachaConfig.rates.gold + gachaConfig.rates.silver) {
                    tier = 2;
                    rarity = 'Silver';
                } else {
                    tier = 1;
                    rarity = 'Common';
                }
                
                // Select random uma from tier
                const umaList = gachaConfig.umamusume.filter(u => u.tier === tier);
                const selectedUma = umaList[Math.floor(Math.random() * umaList.length)];
                
                // Generate stats
                const stats = generateStats(tier, selectedUma);
                
                // Save to database
                const userUma = new UserUmaModel({
                    userId,
                    umaId: selectedUma.id,
                    name: selectedUma.name,
                    tier,
                    rarity,
                    stats,
                    trackPreferences: trackPrefs,
                    bonuses,
                    trainCount: 0,
                    energy: 10,
                    skillPoints: 0,
                    skills: [],
                    factors: [],
                    isRetired: false
                });
                
                await userUma.save();
                
                const rank = calculateRank(stats);
                const trackPrefs = generateTrackPreferences(stats);
                const bonuses = generateBonuses(tier);
                
                const embed = new EmbedBuilder()
                    .setTitle('🎊 GACHA THÀNH CÔNG! 🎊')
                    .setDescription(`Bạn đã nhận được: **${selectedUma.name}**`)
                    .setColor(tier === 3 ? '#FFD700' : tier === 2 ? '#C0C0C0' : '#CD7F32')
                    .addFields(
                        { name: '⭐ Tier', value: `${'★'.repeat(tier)}`, inline: true },
                        { name: '💎 Rarity', value: rarity, inline: true },
                        { name: '🏆 Rank', value: rank, inline: true },
                        { name: '🆔 ID', value: `\`${userUma._id}\``, inline: false },
                        { name: '📊 Chỉ số', value: `⚡ Speed: ${stats.speed}\n💪 Stamina: ${stats.stamina}\n🔥 Power: ${stats.power}\n❤️ Guts: ${stats.guts}\n🧠 Wit: ${stats.wit}\n📈 Tổng: ${stats.speed + stats.stamina + stats.power + stats.guts + stats.wit}`, inline: false }
                    )
                    .setThumbnail(selectedUma.image || 'https://i.imgur.com/placeholder.png')
                    .setFooter({ text: `Carrots còn lại: ${userEconomy.carrots} <:carrot:1436533295084208328>` })
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            },

            async handleExchangeCarrots(interaction) {
                const Economy = require('../../models/EconomyUserData');
                const userId = interaction.user.id;
                const amount = interaction.options.getInteger('amount');
                const cost = amount * 10;

                const userEconomy = await Economy.findOneAndUpdate(
                    { userId },
                    { $setOnInsert: { userId } },
                    { upsert: true, new: true }
                );

                if (userEconomy.balance < cost) {
                    return interaction.reply({ content: `❌ Bạn không đủ ${cost} coins để đổi lấy ${amount} <:carrot:1436533295084208328>!`, ephemeral: true });
                }

                userEconomy.balance -= cost;
                userEconomy.carrots = (userEconomy.carrots || 0) + amount;
                await userEconomy.save();

                const embed = new EmbedBuilder()
                    .setTitle('✅ Giao dịch thành công!')
                    .setDescription(`Bạn đã đổi **${cost}** coins để nhận **${amount}** <:carrot:1436533295084208328>.`)
                    .setColor('#00FF00')
                    .addFields(
                        { name: '💰 Coins còn lại', value: `${userEconomy.balance}`, inline: true },
                        { name: '<:carrot:1436533295084208328> Carrots hiện có', value: `${userEconomy.carrots}`, inline: true }
                    )
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            },
            
            async handleList(interaction) {
                const userId = interaction.user.id;
                const page = interaction.options.getInteger('page') || 1;
                const perPage = 10;
                
                const userUmas = await UserUmaModel.find({ userId, isRetired: false })
                    .skip((page - 1) * perPage)
                    .limit(perPage);
                
                const total = await UserUmaModel.countDocuments({ userId, isRetired: false });
                const totalPages = Math.ceil(total / perPage);
                
                if (userUmas.length === 0) {
                    return interaction.reply('❌ Bạn chưa có mã nương nào! Hãy dùng `/uma gacha` để gacha.');
                }
                
                const embed = new EmbedBuilder()
                    .setTitle(`🐴 Danh sách Mã nương của ${interaction.user.username}`)
                    .setColor('#FF69B4')
                    .setDescription(userUmas.map((uma, idx) => {
                        const rank = calculateRank(uma.stats);
                        return `**${(page - 1) * perPage + idx + 1}.** ${uma.name} ${'★'.repeat(uma.tier)}\n🆔 \`${uma._id}\` | 🏆 ${rank} | ⚡ ${uma.energy}/10`;
                    }).join('\n\n'))
                    .setFooter({ text: `Trang ${page}/${totalPages} | Tổng: ${total} mã nương` })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            },
            
            async handleInfo(interaction, umaId) {
                const userId = interaction.user.id;
                
                try {
                    const uma = await UserUmaModel.findOne({ 
                        _id: mongoose.Types.ObjectId(umaId), 
                        userId 
                    });
                    
                    if (!uma) {
                        return interaction.reply('❌ Không tìm thấy mã nương này!');
                    }
                
                const rank = calculateRank(uma.stats);
                const gachaConfig = require('./gacha.json');
                const umaData = gachaConfig.umamusume.find(u => u.id === uma.umaId);
                
                const embed = new EmbedBuilder()
                    .setTitle(`🐴 ${uma.name} ${'★'.repeat(uma.tier)}`)
                    .setColor(uma.tier === 3 ? '#FFD700' : uma.tier === 2 ? '#C0C0C0' : '#CD7F32')
                    .addFields(
                        { name: '🆔 ID', value: `\`${uma._id}\``, inline: true },
                        { name: '🏆 Rank', value: rank, inline: true },
                        { name: '💎 Rarity', value: uma.rarity, inline: true },
                        { name: '📊 Chỉ số', value: `⚡ Speed: ${uma.stats.speed}\n💪 Stamina: ${uma.stats.stamina}\n🔥 Power: ${uma.stats.power}\n❤️ Guts: ${uma.stats.guts}\n🧠 Wit: ${uma.stats.wit}\n📈 Tổng: ${uma.stats.speed + uma.stats.stamina + uma.stats.power + uma.stats.guts + uma.stats.wit}`, inline: true },
                        { name: '🏇 Độ phù hợp đường đua', value: formatTrackPreferences(uma.trackPreferences), inline: true },
                        { name: '📈 Bonus', value: formatBonuses(uma.bonuses), inline: true },
                        { name: '⚡ Năng lượng', value: `${uma.energy}/10`, inline: true },
                        { name: '🎯 Skill Points', value: `${uma.skillPoints}`, inline: true },
                        { name: '🏋️ Lượt Train', value: `${uma.trainCount}/30`, inline: true }
                    )
                    .setThumbnail(umaData?.image || 'https://i.imgur.com/placeholder.png')
                    .setTimestamp();
                
                if (uma.skills.length > 0) {
                    embed.addFields({ name: '🌟 Kỹ năng', value: uma.skills.map(s => `• ${s.name} (${s.rarity})`).join('\n') });
                }
                
                return interaction.reply({ embeds: [embed] });
                } catch (error) {
                    console.error('Error in handleInfo:', error);
                    return interaction.reply('❌ Có lỗi xảy ra khi lấy thông tin mã nương!');
                }
            },
            
            async handleProfile(interaction) {
                const targetUser = interaction.options.getUser('user') || interaction.user;
                const userId = targetUser.id;
                const Economy = require('../../models/EconomyUserData');
                const gachaConfig = require('./gacha.json');

                await interaction.deferReply();

                const userEconomy = await Economy.findOne({ userId });
                const totalUmas = await UserUmaModel.countDocuments({ userId, isRetired: false });
                const retiredUmas = await UserUmaModel.countDocuments({ userId, isRetired: true });
                const favoriteUma = await UserUmaModel.findOne({ userId, isFavorite: true });

                const embed = new EmbedBuilder()
                    .setTitle(`🐴 Hồ sơ Uma Musume của ${targetUser.username}`)
                    .setColor('#FF69B4')
                    .setTimestamp();

                if (favoriteUma) {
                    const umaData = gachaConfig.umamusume.find(u => u.id === favoriteUma.umaId);
                    if (umaData?.image) {
                        embed.setThumbnail(umaData.image);
                    } else {
                        embed.setThumbnail(targetUser.displayAvatarURL());
                    }
                    
                    const rank = calculateRank(favoriteUma.stats);
                    const statsString = [
                        `⚡️ **Tốc độ:** ${favoriteUma.stats.speed}`,
                        `💪 **Sức bền:** ${favoriteUma.stats.stamina}`,
                        `🔥 **Sức mạnh:** ${favoriteUma.stats.power}`,
                        `❤️ **Tinh thần:** ${favoriteUma.stats.guts}`,
                        `🧠 **Khôn ngoan:** ${favoriteUma.stats.wit}`
                    ].join('\n');

                    embed.addFields(
                        { name: `⭐ Mã Nương Đại Diện: ${favoriteUma.name} ${'★'.repeat(favoriteUma.tier)}`, value: `**Hạng:** ${rank}` },
                        { name: '📊 Chỉ số', value: statsString, inline: true }
                    );
                } else {
                    embed.setThumbnail(targetUser.displayAvatarURL());
                    embed.setDescription('Chưa có mã nương đại diện. Dùng `/uma set_favorite` để chọn một em!');
                }

                embed.addFields(
                    { name: '💰 Kinh tế', value: `**Coins:** ${userEconomy?.balance || 0}\n**Carrots:** ${userEconomy?.carrots || 0} <:carrot:1436533295084208328>`, inline: true },
                    { name: '🐴 Bộ sưu tập', value: `**Tổng số:** ${totalUmas}\n**Đã nghỉ hưu:** ${retiredUmas}`, inline: true }
                );

                return interaction.editReply({ embeds: [embed] });
            },
            
            async handleSetFavorite(interaction, umaId) {
                const userId = interaction.user.id;
                
                try {
                    await UserUmaModel.updateMany({ userId }, { isFavorite: false });
                    
                    const uma = await UserUmaModel.findOneAndUpdate(
                        { _id: mongoose.Types.ObjectId(umaId), userId },
                        { isFavorite: true },
                        { new: true }
                    );
                    
                    if (!uma) {
                        return interaction.reply('❌ Không tìm thấy mã nương này!');
                    }
                    
                    return interaction.reply(`✅ Đã đặt **${uma.name}** làm mã nương đại diện!`);
                } catch (error) {
                    console.error('Error in handleSetFavorite:', error);
                    return interaction.reply('❌ Có lỗi xảy ra!');
                }
            },
            
            async handleTrain(interaction, umaId, stat) {
                const userId = interaction.user.id;
                
                await interaction.deferReply();
                
                try {
                    const uma = await UserUmaModel.findOne({ 
                        _id: mongoose.Types.ObjectId(umaId), 
                        userId 
                    });
                
                if (!uma) {
                    return interaction.editReply('❌ Không tìm thấy mã nương này!');
                }
                
                if (uma.energy < 1) {
                    return interaction.editReply('❌ Mã nương đã hết năng lượng! Dùng `/uma energy` để nhận thêm.');
                }
                
                if (uma.trainCount >= 30) {
                    return interaction.editReply('❌ Mã nương đã đạt giới hạn huấn luyện (30/30)! Hãy cho nghỉ hưu để breed.');
                }
                
                uma.energy -= 1;
                uma.trainCount += 1;
                
                const isGreatSuccess = Math.random() < 0.2;
                const multiplier = isGreatSuccess ? 2 : 1;
                
                const baseGain = 10 + Math.floor(Math.random() * 5);
                const mainGain = baseGain * multiplier;
                const subStat = ['speed', 'stamina', 'power', 'guts', 'wit'].filter(s => s !== stat)[Math.floor(Math.random() * 4)];
                const subGain = Math.floor(mainGain * 0.3);
                
                uma.stats[stat] += mainGain;
                uma.stats[subStat] += subGain;
                uma.skillPoints += isGreatSuccess ? 10 : 5;
                
                await uma.save();
                
                const rank = calculateRank(uma.stats);
                const stageRanges = ((tc) => {
                    if (tc >= 1 && tc <= 3) return { main: '10-25', bonus: '2-5', stage: 'Giai Đoạn 1 (Ngày 1-3)' };
                    if (tc >= 5 && tc <= 8) return { main: '35-50', bonus: '4-7', stage: 'Giai Đoạn 2 (Ngày 5-8)' };
                    if (tc >= 9 && tc <= 12) return { main: '60-75', bonus: '6-10', stage: 'Giai Đoạn 3 (Ngày 9-12)' };
                    return null;
                })(uma.trainCount);
                
                const statIcons = {
                    speed: '<:speed:1435601053436612740>',
                    stamina: '<:stamina:1435601056573685860>',
                    power: '<:power:1435601051561492530>',
                    guts: '<:guts:1435601048822747167>',
                    wit: '<:wit:1435601060004757555>'
                };
                
                const speedIcon = statIcons.speed, staminaIcon = statIcons.stamina, powerIcon = statIcons.power, gutsIcon = statIcons.guts, witIcon = statIcons.wit;
                
                const embed = new EmbedBuilder()
                    .setTitle(isGreatSuccess ? '🎉 GREAT SUCCESS! 🎉' : '✅ Huấn luyện thành công!')
                    .setDescription(`**${uma.name}** đã hoàn thành buổi huấn luyện!`)
                    .setColor(isGreatSuccess ? '#FFD700' : '#00FF00')
                    .addFields(
                        { name: '📈 Tăng chỉ số', value: `⚡ ${stat.toUpperCase()}: +${mainGain}\n🔸 ${subStat.toUpperCase()}: +${subGain}\n🎯 Skill Points: +${isGreatSuccess ? 10 : 5}`, inline: true },
                        { name: '📊 Chỉ số hiện tại', value: `⚡ Speed: ${uma.stats.speed}\n💪 Stamina: ${uma.stats.stamina}\n🔥 Power: ${uma.stats.power}\n❤️ Guts: ${uma.stats.guts}\n🧠 Wit: ${uma.stats.wit}`, inline: true },
                        { name: '🏆 Rank', value: rank, inline: true },
                        { name: '⚡ Năng lượng', value: `${uma.energy}/10`, inline: true },
                        { name: '🏋️ Lượt Train', value: `${uma.trainCount}/30`, inline: true },
                        { name: '🎯 SP', value: `${uma.skillPoints}`, inline: true }
                    )
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.error('Error in handleTrain:', error);
                    return interaction.editReply('❌ Có lỗi xảy ra khi huấn luyện!');
                }
            },
            
            async handleLearnSkill(interaction, umaId) {
                const userId = interaction.user.id;
                
                const uma = await UserUmaModel.findOne({ _id: umaId, userId });
                
                if (!uma) {
                    return interaction.reply('❌ Không tìm thấy mã nương này!');
                }
                
                const skillsConfig = require('./skills.json');
                const availableSkills = [];
                
                for (let i = 0; i < 3; i++) {
                    const rarity = Math.random() < 0.05 ? 'Gold' : Math.random() < 0.25 ? 'Rare' : 'Common';
                    const skillList = skillsConfig.skills.filter(s => s.rarity === rarity);
                    const skill = skillList[Math.floor(Math.random() * skillList.length)];
                    availableSkills.push(skill);
                }
                
                const embed = new EmbedBuilder()
                    .setTitle(`🌟 Kỹ năng có thể học - ${uma.name}`)
                    .setDescription(`Skill Points hiện có: **${uma.skillPoints}**`)
                    .setColor('#9B59B6')
                    .addFields(
                        availableSkills.map((skill, idx) => ({
                            name: `${idx + 1}. ${skill.name} (${skill.rarity})`,
                            value: `${skill.description}\n💰 Chi phí: ${skill.cost} SP`,
                            inline: false
                        }))
                    )
                    .setFooter({ text: 'Chọn số tương ứng để học kỹ năng' })
                    .setTimestamp();
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`learn_skill_${umaId}_0`).setLabel('1').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId(`learn_skill_${umaId}_1`).setLabel('2').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId(`learn_skill_${umaId}_2`).setLabel('3').setStyle(ButtonStyle.Primary)
                    );
                
                interaction.client.umaSkillCache = interaction.client.umaSkillCache || {};
                interaction.client.umaSkillCache[umaId] = availableSkills;
                
                return interaction.reply({ embeds: [embed], components: [row] });
            },
            
            async handleEnergy(interaction) {
                const userId = interaction.user.id;
                const UserCooldown = require('../../models/cooldown');
                
                const cooldown = await UserCooldown.findOne({ userId, type: 'uma_energy' });
                const now = Date.now();
                
                if (cooldown && now < cooldown.endsAt) {
                    const timeLeft = Math.ceil((cooldown.endsAt - now) / 1000 / 60);
                    return interaction.reply(`⏰ Bạn cần chờ thêm **${timeLeft} phút** để nhận năng lượng!`);
                }
                
                const userUmas = await UserUmaModel.find({ userId, isRetired: false });
                
                for (const uma of userUmas) {
                    uma.energy = Math.min(10, uma.energy + 5);
                    await uma.save();
                }
                
                await UserCooldown.findOneAndUpdate(
                    { userId, type: 'uma_energy' },
                    { endsAt: now + 4 * 60 * 60 * 1000 },
                    { upsert: true }
                );
                
                return interaction.reply(`✅ Đã nhận **+5 năng lượng** cho tất cả mã nương! (Cooldown: 4 giờ)`);
            },
            
            async handleRace(interaction, umaId) {
                const userId = interaction.user.id;
                
                await interaction.deferReply();
                
                const uma = await UserUmaModel.findOne({ _id: umaId, userId });
                
                if (!uma) {
                    return interaction.editReply('❌ Không tìm thấy mã nương này!');
                }
                
                const racesConfig = require('./races.json');
                const race = racesConfig.races[Math.floor(Math.random() * racesConfig.races.length)];
                
                const result = simulateRace(uma, race);
                
                const rewards = {
                    1: { coins: 1000, sp: 20 },
                    2: { coins: 600, sp: 12 },
                    3: { coins: 300, sp: 8 }
                };
                
                if (result.position <= 3) {
                    const Economy = require('../../models/EconomyUserData');
                    const userEconomy = await Economy.findOne({ userId });
                    
                    if (userEconomy) {
                        userEconomy.balance += rewards[result.position].coins;
                        await userEconomy.save();
                    }
                    
                    uma.skillPoints += rewards[result.position].sp;
                    await uma.save();
                }
                
                const embed = new EmbedBuilder()
                    .setTitle(`🏁 ${race.name}`)
                    .setDescription(`**${uma.name}** đã tham gia cuộc đua!`)
                    .setColor(result.position === 1 ? '#FFD700' : result.position === 2 ? '#C0C0C0' : result.position === 3 ? '#CD7F32' : '#808080')
                    .addFields(
                        { name: '🏆 Kết quả', value: `Hạng ${result.position}/${result.totalRacers}`, inline: true },
                        { name: '🏇 Đường đua', value: `${race.surface} - ${race.distance}m`, inline: true },
                        { name: '📊 Điểm số', value: `${result.score.toFixed(2)}`, inline: true }
                    )
                    .setTimestamp();
                
                if (result.position <= 3) {
                    embed.addFields({
                        name: '🎁 Phần thưởng',
                        value: `💰 ${rewards[result.position].coins} coins\n🎯 ${rewards[result.position].sp} SP`
                    });
                }
                
                return interaction.editReply({ embeds: [embed] });
            },
            
            async handlePvP(interaction, umaId, opponentId) {
                const userId = interaction.user.id;
                
                const opponent = await interaction.client.users.fetch(opponentId);
                
                if (opponent.id === userId) {
                    return interaction.reply('❌ Bạn không thể thách đấu chính mình!');
                }
                
                const uma = await UserUmaModel.findOne({ _id: umaId, userId });
                
                if (!uma) {
                    return interaction.reply('❌ Không tìm thấy mã nương này!');
                }
                
                const opponentUmas = await UserUmaModel.find({ userId: opponent.id, isRetired: false });
                
                if (opponentUmas.length === 0) {
                    return interaction.reply('❌ Đối thủ chưa có mã nương nào!');
                }
                
                const embed = new EmbedBuilder()
                    .setTitle('⚔️ Thách đấu PvP!')
                    .setDescription(`${interaction.user} thách đấu ${opponent}!\n\n${opponent}, bạn có chấp nhận không?`)
                    .setColor('#FF0000')
                    .addFields({ name: '🐴 Mã nương thách đấu', value: `${uma.name} ${'★'.repeat(uma.tier)}` })
                    .setTimestamp();
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`pvp_accept_${userId}_${umaId}_${opponent.id}`).setLabel('Chấp nhận').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`pvp_decline_${userId}_${opponent.id}`).setLabel('Từ chối').setStyle(ButtonStyle.Danger)
                    );
                
                return interaction.reply({ embeds: [embed], components: [row] });
            },
            
            async handleSetDefense(interaction) {
                const userId = interaction.user.id;
                const { StringSelectMenuBuilder } = require('discord.js');
                
                const userUmas = await UserUmaModel.find({ userId, isRetired: false }).limit(25);
                
                if (userUmas.length < 3) {
                    return interaction.reply('❌ Bạn cần có ít nhất 3 mã nương để đặt đội phòng thủ!');
                }
                
                const options = userUmas.map(uma => {
                    const rank = calculateRank(uma.stats);
                    return {
                        label: uma.name,
                        description: `${'★'.repeat(uma.tier)} | ${rank}`,
                        value: uma._id.toString()
                    };
                });
                
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`uma_defense_select_${userId}`)
                    .setPlaceholder('Chọn 3 mã nương cho đội phòng thủ')
                    .setMinValues(3)
                    .setMaxValues(3)
                    .addOptions(options);
                
                const row = new ActionRowBuilder().addComponents(selectMenu);
                
                return interaction.reply({ 
                    content: '🛡️ Chọn 3 mã nương mạnh nhất cho đội phòng thủ:', 
                    components: [row], 
                    ephemeral: true 
                });
            },
            
            async handleSetDefenseSubmit(interaction, selectedIds) {
                const userId = interaction.user.id;
                
                const uma1 = await UserUmaModel.findOne({ _id: selectedIds[0], userId });
                const uma2 = await UserUmaModel.findOne({ _id: selectedIds[1], userId });
                const uma3 = await UserUmaModel.findOne({ _id: selectedIds[2], userId });
                
                if (!uma1 || !uma2 || !uma3) {
                    return interaction.update({ content: '❌ Một hoặc nhiều mã nương không tồn tại!', components: [] });
                }
                
                await UserUmaModel.updateMany({ userId }, { isDefense: false });
                
                uma1.isDefense = true;
                uma2.isDefense = true;
                uma3.isDefense = true;
                
                await uma1.save();
                await uma2.save();
                await uma3.save();
                
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ Đội phòng thủ đã được đặt!')
                    .setColor('#0099FF')
                    .addFields(
                        { name: '1️⃣', value: `${uma1.name} ${'★'.repeat(uma1.tier)}`, inline: true },
                        { name: '2️⃣', value: `${uma2.name} ${'★'.repeat(uma2.tier)}`, inline: true },
                        { name: '3️⃣', value: `${uma3.name} ${'★'.repeat(uma3.tier)}`, inline: true }
                    )
                    .setTimestamp();
                
                return interaction.update({ content: null, embeds: [embed], components: [] });
            },
            
            async handleChallenge(interaction) {
                const opponent = interaction.options.getUser('opponent');
                const userId = interaction.user.id;
                
                if (opponent.id === userId) {
                    return interaction.reply('❌ Bạn không thể thách đấu chính mình!');
                }
                
                await interaction.deferReply();
                
                const myUmas = await UserUmaModel.find({ userId, isDefense: true }).limit(3);
                const opponentUmas = await UserUmaModel.find({ userId: opponent.id, isDefense: true }).limit(3);
                
                if (myUmas.length < 3) {
                    return interaction.editReply('❌ Bạn cần đặt đội phòng thủ trước! Dùng `/uma set_defense`');
                }
                
                if (opponentUmas.length < 3) {
                    return interaction.editReply('❌ Đối thủ chưa đặt đội phòng thủ!');
                }
                
                const racesConfig = require('./races.json');
                let myWins = 0;
                let oppWins = 0;
                
                const results = [];
                
                for (let i = 0; i < 3; i++) {
                    const race = racesConfig.races[Math.floor(Math.random() * racesConfig.races.length)];
                    const myResult = simulateRace(myUmas[i], race);
                    const oppResult = simulateRace(opponentUmas[i], race);
                    
                    const winner = myResult.score > oppResult.score ? 'my' : 'opp';
                    if (winner === 'my') myWins++;
                    else oppWins++;
                    
                    results.push({
                        race: race.name,
                        myUma: myUmas[i].name,
                        oppUma: opponentUmas[i].name,
                        myScore: myResult.score,
                        oppScore: oppResult.score,
                        winner
                    });
                }
                
                const finalWinner = myWins > oppWins ? interaction.user : opponent;
                
                const embed = new EmbedBuilder()
                    .setTitle('🏆 Champions Meeting - Kết quả')
                    .setDescription(`${interaction.user.username} vs ${opponent.username}`)
                    .setColor(myWins > oppWins ? '#FFD700' : '#C0C0C0')
                    .addFields(
                        results.map((r, idx) => ({
                            name: `Race ${idx + 1}: ${r.race}`,
                            value: `${r.myUma} (${r.myScore.toFixed(2)}) vs ${r.oppUma} (${r.oppScore.toFixed(2)})\n${r.winner === 'my' ? '✅ Thắng' : '❌ Thua'}`,
                            inline: false
                        }))
                    )
                    .addFields(
                        { name: '📊 Tổng kết', value: `${interaction.user.username}: ${myWins} thắng\n${opponent.username}: ${oppWins} thắng`, inline: false },
                        { name: '🏆 Người chiến thắng', value: `${finalWinner}`, inline: false }
                    )
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            },
            
            async handleRetire(interaction, umaId) {
                const userId = interaction.user.id;
                
                const uma = await UserUmaModel.findOne({ _id: umaId, userId });
                
                if (!uma) {
                    return interaction.reply('❌ Không tìm thấy mã nương này!');
                }
                
                if (uma.isRetired) {
                    return interaction.reply('❌ Mã nương này đã nghỉ hưu rồi!');
                }
                
                if (uma.trainCount < 30) {
                    return interaction.reply('❌ Mã nương cần đạt 30/30 lượt train trước khi nghỉ hưu!');
                }
                
                const factors = [];
                const stats = uma.stats;
                
                if (stats.speed >= 800) factors.push({ type: 'Speed', value: Math.floor(stats.speed / 100), stars: Math.min(Math.floor(stats.speed / 400), 3) });
                if (stats.stamina >= 800) factors.push({ type: 'Stamina', value: Math.floor(stats.stamina / 100), stars: Math.min(Math.floor(stats.stamina / 400), 3) });
                if (stats.power >= 800) factors.push({ type: 'Power', value: Math.floor(stats.power / 100), stars: Math.min(Math.floor(stats.power / 400), 3) });
                if (stats.guts >= 600) factors.push({ type: 'Guts', value: Math.floor(stats.guts / 100), stars: Math.min(Math.floor(stats.guts / 400), 3) });
                if (stats.wit >= 600) factors.push({ type: 'Wit', value: Math.floor(stats.wit / 100), stars: Math.min(Math.floor(stats.wit / 400), 3) });
                
                uma.isRetired = true;
                uma.factors = factors;
                await uma.save();
                
                const embed = new EmbedBuilder()
                    .setTitle('👋 Mã nương đã nghỉ hưu!')
                    .setDescription(`**${uma.name}** đã kết thúc sự nghiệp đua của mình với những thành tích rực rỡ!`)
                    .setColor('#808080')
                    .addFields(
                        { name: '📊 Chỉ số cuối cùng', value: `⚡ Speed: ${stats.speed}\n💪 Stamina: ${stats.stamina}\n🔥 Power: ${stats.power}\n❤️ Guts: ${stats.guts}\n🧠 Wit: ${stats.wit}`, inline: true },
                        { name: '🧬 Factors có thể kế thừa', value: factors.length > 0 ? factors.map(f => `${f.type} ${'★'.repeat(f.stars)} (+${f.value})`).join('\n') : 'Không có', inline: true }
                    )
                    .setFooter({ text: 'Mã nương đã nghỉ hưu!' })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            }
        }
    ],
    
    selectMenus: [
        {
            customId: /^uma_select_/,
            async execute(interaction) {
                const [, , action, userId] = interaction.customId.split('_');
                
                if (interaction.user.id !== userId) {
                    return interaction.reply({ content: '❌ Đây không phải select menu của bạn!', ephemeral: true });
                }
                
                const selectedId = interaction.values[0];
                const cache = interaction.client.umaActionCache?.[userId];
                
                await interaction.deferUpdate();
                
                const commands = module.exports.commands[0];
                
                switch (action) {
                    case 'info':
                        return await commands.handleInfo(interaction, selectedId);
                    case 'favorite':
                        return await commands.handleSetFavorite(interaction, selectedId);
                    case 'train':
                        if (cache && cache.stat) {
                            return await commands.handleTrain(interaction, selectedId, cache.stat);
                        }
                        break;
                    case 'race':
                        return await commands.handleRace(interaction, selectedId);
                    case 'pvp':
                        if (cache && cache.opponentId) {
                            return await commands.handlePvP(interaction, selectedId, cache.opponentId);
                        }
                        break;
                    case 'retire':
                        return await commands.handleRetire(interaction, selectedId);
                }
                
                if (interaction.client.umaActionCache?.[userId]) {
                    delete interaction.client.umaActionCache[userId];
                }
            }
        },
        {
            customId: /^uma_defense_select_/,
            async execute(interaction) {
                const userId = interaction.customId.split('_')[3];
                
                if (interaction.user.id !== userId) {
                    return interaction.reply({ content: '❌ Đây không phải select menu của bạn!', ephemeral: true });
                }
                
                const selectedIds = interaction.values;
                const commands = module.exports.commands[0];
                
                return await commands.handleSetDefenseSubmit(interaction, selectedIds);
            }
        },
        {
            customId: /^career_skill_purchase_/,
            async execute(interaction) {
                const careers = require('./cmd_uma_careers.js');
                return await careers.handleCareerSkillPurchase(interaction);
            }
        }
    ],
    
    buttons: [
        {
            customId: /^learn_skill_/,
            async execute(interaction) {
                const [, , umaId, skillIndex] = interaction.customId.split('_');
                const userId = interaction.user.id;
                
                const uma = await UserUmaModel.findOne({ _id: umaId, userId });
                
                if (!uma) {
                    return interaction.reply({ content: '❌ Không tìm thấy mã nương này!', ephemeral: true });
                }
                
                const availableSkills = interaction.client.umaSkillCache?.[umaId];
                
                if (!availableSkills) {
                    return interaction.reply({ content: '❌ Phiên học kỹ năng đã hết hạn!', ephemeral: true });
                }
                
                const skill = availableSkills[parseInt(skillIndex)];
                
                if (uma.skillPoints < skill.cost) {
                    return interaction.reply({ content: `❌ Không đủ Skill Points! Cần: ${skill.cost}, có: ${uma.skillPoints}`, ephemeral: true });
                }
                
                uma.skillPoints -= skill.cost;
                uma.skills.push(skill);
                await uma.save();
                
                delete interaction.client.umaSkillCache[umaId];
                
                return interaction.update({
                    content: `✅ **${uma.name}** đã học kỹ năng **${skill.name}**!\nSkill Points còn lại: ${uma.skillPoints}`,
                    embeds: [],
                    components: []
                });
            }
        },
        {
            customId: /^pvp_accept_/,
            async execute(interaction) {
                const [, , challengerId, challengerUmaId, opponentId] = interaction.customId.split('_');
                
                if (interaction.user.id !== opponentId) {
                    return interaction.reply({ content: '❌ Chỉ người bị thách đấu mới có thể chấp nhận!', ephemeral: true });
                }
                
                await interaction.deferUpdate();
                
                const challengerUma = await UserUmaModel.findOne({ _id: challengerUmaId, userId: challengerId });
                const opponentUmas = await UserUmaModel.find({ userId: opponentId, isRetired: false });
                const opponentUma = opponentUmas[Math.floor(Math.random() * opponentUmas.length)];
                
                const racesConfig = require('./races.json');
                const race = racesConfig.races[Math.floor(Math.random() * racesConfig.races.length)];
                
                const result1 = simulateRace(challengerUma, race);
                const result2 = simulateRace(opponentUma, race);
                
                const winner = result1.score > result2.score ? challengerId : opponentId;
                const winnerName = result1.score > result2.score ? interaction.guild.members.cache.get(challengerId).displayName : interaction.user.username;
                
                const embed = new EmbedBuilder()
                    .setTitle(`🏁 ${race.name} - PvP`)
                    .setDescription(`<@${challengerId}> vs <@${opponentId}>`)
                    .setColor(winner === challengerId ? '#FFD700' : '#C0C0C0')
                    .addFields(
                        { name: `🐴 ${challengerUma.name}`, value: `Điểm: ${result1.score.toFixed(2)}\nHạng: ${result1.position}`, inline: true },
                        { name: 'vs', value: '⚔️', inline: true },
                        { name: `🐴 ${opponentUma.name}`, value: `Điểm: ${result2.score.toFixed(2)}\nHạng: ${result2.position}`, inline: true },
                        { name: '🏆 Người chiến thắng', value: `<@${winner}>`, inline: false }
                    )
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed], components: [] });
            }
        },
        {
            customId: /^pvp_decline_/,
            async execute(interaction) {
                const [, , challengerId, opponentId] = interaction.customId.split('_');
                
                if (interaction.user.id !== opponentId) {
                    return interaction.reply({ content: '❌ Chỉ người bị thách đấu mới có thể từ chối!', ephemeral: true });
                }
                
                return interaction.update({
                    content: `❌ <@${opponentId}> đã từ chối thách đấu!`,
                    embeds: [],
                    components: []
                });
            }
        }
    ],
    
    async onLoad(client) {
        console.log('[UmaMusume Addon] Đang tải Addons...');
        console.log('[UmaMusume Addon] Addons made by Heiznerd and NekoTech Foundations...');
        console.log('[UmaMusume Addon] Performing initial event...');
        console.log('[UmaMusume Addon] Tác vụ nền đã hoạt động, addons sẽ hoạt động.');
    }
};
