// Command file for /uma
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const umaData = require('./umaData');
const UmaPlayer = require('./schemas/UmaPlayer');
const UmaMusume = require('./schemas/UmaMusume');
const EconomyUserData = require('../../models/EconomyUserData'); // Adjust path as needed
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

let config = {};
try {
  const configPath = path.join(__dirname, 'config.yml');
  config = yaml.load(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error(`Error loading Uma Musume cmd_uma config.yml: ${e}`);
}


module.exports = {
  data: new SlashCommandBuilder()
    .setName('uma')
    .setDescription('Các lệnh cho addon Uma Musume')
    .addSubcommand(subcommand =>
      subcommand
        .setName('gacha')
        .setDescription('Quay gacha để nhận một Mã nương mới.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Liệt kê các Mã nương bạn sở hữu.')
        .addIntegerOption(option => option.setName('page').setDescription('Số trang để hiển thị.').setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Xem thông tin chi tiết về một Mã nương cụ thể.')
        .addStringOption(option => option.setName('name').setDescription('Tên của Mã nương').setRequired(true))
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (subcommand === 'gacha') {
      const gachaCost = config.gacha_cost_carrots || 500;

      let playerEconomy = await EconomyUserData.findOne({ userId: userId });
      if (!playerEconomy) {
        playerEconomy = new EconomyUserData({ userId: userId });
        await playerEconomy.save();
      }

      if (playerEconomy.carrots < gachaCost) {
        return interaction.reply({ content: `Bạn cần ${gachaCost} <:carrots:1436533295084208328> để quay gacha, nhưng bạn chỉ có ${playerEconomy.carrots} <:carrots:1436533295084208328>.`, ephemeral: true });
      }

      playerEconomy.carrots -= gachaCost;
      await playerEconomy.save();

      let umaPlayer = await UmaPlayer.findOne({ userId: userId });
      if (!umaPlayer) {
        umaPlayer = new UmaPlayer({ userId: userId });
        await umaPlayer.save();
      }

      const rand = Math.random();
      let selectedTier;
      if (rand < 0.05) {
        selectedTier = 4;
      } else if (rand < 0.20) {
        selectedTier = 3;
      } else if (rand < 0.50) {
        selectedTier = 2;
      } else {
        selectedTier = 1;
      }

      const availableUmas = umaData.filter(uma => uma.tier === selectedTier);
      if (availableUmas.length === 0) {
        return interaction.reply({ content: 'Đã xảy ra lỗi: Không có Mã nương nào ở bậc này.', ephemeral: true });
      }
      const pulledUmaData = availableUmas[Math.floor(Math.random() * availableUmas.length)];

      let totalStats;
      switch (selectedTier) {
        case 1: totalStats = 100; break;
        case 2: totalStats = 150; break;
        case 3: totalStats = 210; break;
        case 4: totalStats = 220; break;
        default: totalStats = 100;
      }

      const stats = { speed: 0, stamina: 0, power: 0, guts: 0, wit: 0 };
      let remainingStats = totalStats;
      const statNames = ['speed', 'stamina', 'power', 'guts', 'wit'];

      while (remainingStats > 0) {
        const randomStatIndex = Math.floor(Math.random() * statNames.length);
        stats[statNames[randomStatIndex]]++;
        remainingStats--;
      }

      const newUma = new UmaMusume({
        ownerId: userId,
        name: pulledUmaData.name,
        tier: pulledUmaData.tier,
        stats: stats,
        trackAptitude: { turf: 'G', dirt: 'G' },
        distanceAptitude: { sprint: 'G', mile: 'G', medium: 'G', long: 'G' },
        strategyAptitude: { runner: 'G', leader: 'G', betweener: 'G', chaser: 'G' },
        growthRate: { speed: 0, stamina: 0, power: 0, guts: 0, wit: 0 },
        skillPoints: 0,
        skills: [],
      });
      await newUma.save();

      umaPlayer.umas.push(newUma._id);
      await umaPlayer.save();

      const embed = new EmbedBuilder()
        .setTitle(`🎉 Bạn đã quay ra ${newUma.name}! 🎉`)
        .setDescription(`Bậc: ${newUma.tier}⭐`)
        .addFields(
          { name: '<:speed:1435601053436612740> Tốc độ', value: newUma.stats.speed.toString(), inline: true },
          { name: '<:stamina:1435601056573685860> Sức bền', value: newUma.stats.stamina.toString(), inline: true },
          { name: '<:power:1435601051561492530> Sức mạnh', value: newUma.stats.power.toString(), inline: true },
          { name: '<:guts:1435601048822747167> Tinh thần', value: newUma.stats.guts.toString(), inline: true },
          { name: '<:wit:1435601060004757555> Khôn ngoan', value: newUma.stats.wit.toString(), inline: true },
          { name: '<:carrots:1436533295084208328> Số cà rốt còn lại', value: playerEconomy.carrots.toString(), inline: false }
        )
        .setColor('Random');

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'list') {
      const page = interaction.options.getInteger('page') || 1;
      const itemsPerPage = 10;

      const umaPlayer = await UmaPlayer.findOne({ userId: userId }).populate('umas');

      if (!umaPlayer || umaPlayer.umas.length === 0) {
        return interaction.reply({ content: 'Bạn chưa có Mã nương nào! Dùng `/uma gacha` để nhận Mã nương đầu tiên.', ephemeral: true });
      }

      const totalUmas = umaPlayer.umas.length;
      const totalPages = Math.ceil(totalUmas / itemsPerPage);

      if (page < 1 || page > totalPages) {
        return interaction.reply({ content: `Số trang không hợp lệ. Bạn có ${totalUmas} Mã nương, trên ${totalPages} trang.`, ephemeral: true });
      }

      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = page * itemsPerPage;
      const umasToDisplay = umaPlayer.umas.slice(startIndex, endIndex);

      const listEmbed = new EmbedBuilder()
        .setTitle(`Các Mã nương của ${interaction.user.username}`)
        .setDescription(`Trang ${page}/${totalPages}`)
        .setColor('Blurple');
      
      umasToDisplay.forEach(uma => {
        listEmbed.addFields({ name: `${uma.name} (${uma.tier}⭐)`, value: `ID: ​#${uma._id.toString().slice(-5)}`, inline: false });
      });

      await interaction.reply({ embeds: [listEmbed] });

    } else if (subcommand === 'info') {
      const umaName = interaction.options.getString('name');

      const targetUma = await UmaMusume.findOne({ ownerId: userId, name: umaName });

      if (!targetUma) {
        return interaction.reply({ content: `Không tìm thấy Mã nương có tên \"${umaName}\" hoặc không thuộc sở hữu của bạn.`, ephemeral: true });
      }

      const infoEmbed = new EmbedBuilder()
        .setTitle(`${targetUma.name} (${targetUma.tier}⭐)`)
        .setDescription(`ID: ​#${targetUma._id.toString().slice(-5)}`)
        .addFields(
          { name: 'Chỉ số', value: '<:speed:1435601053436612740> Tốc độ: ${targetUma.stats.speed}\n<:stamina:1435601056573685860> Sức bền: ${targetUma.stats.stamina}\n<:power:1435601051561492530> Sức mạnh: ${targetUma.stats.power}\n<:guts:1435601048822747167> Tinh thần: ${targetUma.stats.guts}\n<:wit:1435601060004757555> Khôn ngoan: ${targetUma.stats.wit}', inline: true },
          { name: 'Tỷ lệ tăng trưởng', value: '<:speed:1435601053436612740> Tốc độ: ${targetUma.growthRate.speed}%\n<:stamina:1435601056573685860> Sức bền: ${targetUma.growthRate.stamina}%\n<:power:1435601051561492530> Sức mạnh: ${targetUma.growthRate.power}%\n<:guts:1435601048822747167> Tinh thần: ${targetUma.growthRate.guts}%\n<:wit:1435601060004757555> Khôn ngoan: ${targetUma.growthRate.wit}%', inline: true },
          { name: '\u200b', value: '\u200b', inline: false },
          { name: 'Sở trường đường đua', value: `Cỏ: ${targetUma.trackAptitude.turf}\nĐất: ${targetUma.trackAptitude.dirt}`, inline: true },
          { name: 'Sở trường cự ly', value: `Nước rút: ${targetUma.distanceAptitude.sprint}\nDặm: ${targetUma.distanceAptitude.mile}\nTrung bình: ${targetUma.distanceAptitude.medium}\nDài: ${targetUma.distanceAptitude.long}`, inline: true },
          { name: 'Sở trường chiến thuật', value: `Chạy đầu: ${targetUma.strategyAptitude.runner}\nDẫn đầu: ${targetUma.strategyAptitude.leader}\nGiữa: ${targetUma.strategyAptitude.betweener}\nCuối: ${targetUma.strategyAptitude.chaser}`, inline: true }
        )
        .setColor('Random');

        await interaction.reply({ embeds: [infoEmbed] });

    }
  }
};