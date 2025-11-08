const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const EconomyUserData = require('../../models/EconomyUserData');
const { convertCoinsToCarrots } = require('./umaUtils');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

let config = {};
try {
  const configPath = path.join(__dirname, 'config.yml');
  config = yaml.load(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error(`Error loading Uma Musume cmd_uma_exchange config.yml: ${e}`);
}

const conversionRate = config.coin_to_carrot_rate || 10; // Default to 10 coins for 1 carrot

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uma_exchange')
    .setDescription('Đổi coin sang cà rốt.')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Số lượng coin muốn đổi (10 coins = 1 carrots).')
        .setRequired(true)
    ),
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const userId = interaction.user.id;

    if (amount <= 0) {
      return interaction.reply({ content: 'Số lượng coins phải là một số dương.', ephemeral: true });
    }

    const result = await convertCoinsToCarrots(userId, amount);

    if (result.success) {
      const embed = new EmbedBuilder()
        .setTitle('✅ Giao dịch thành công!')
        .setDescription(`Bạn đã đổi thành công ${amount} coins để nhận ${result.carrots} <:carrots:1436533295084208328>.`)
        .addFields(
          { name: 'Số coin còn lại', value: result.newBalance.toString(), inline: true },
          { name: '<:carrots:1436533295084208328> Số cà rốt hiện có', value: result.newCarrots.toString(), inline: true }
        )
        .setColor('Green');
      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply({ content: result.error, ephemeral: true });
    }
  }
};
