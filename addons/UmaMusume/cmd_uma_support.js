const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomyUserData = require('../../models/EconomyUserData');
const UserSupportCard = require('./schemas/SupportCard');

function pickRarity(rates) {
  const r = Math.random() * 100;
  let acc = 0;
  for (const key of ['SSR','SR','R']) {
    acc += rates[key] || 0;
    if (r < acc) return key;
  }
  return 'R';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uma_support')
    .setDescription('Support Cards for Uma Musume')
    .addSubcommand(sub => sub.setName('gacha').setDescription('Gacha 1 Support Card (300 carrots)'))
    .addSubcommand(sub => sub.setName('list').setDescription('Xem danh sách Support Cards của bạn')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'gacha') return this.handleGacha(interaction);
    if (sub === 'list') return this.handleList(interaction);
  },

  async handleGacha(interaction) {
    const cfg = require('./support_cards.json');
    const userId = interaction.user.id;
    await interaction.deferReply({ ephemeral: true });

    const cost = cfg.gacha?.cost_carrots || 300;
    const econ = await EconomyUserData.findOne({ userId });
    if (!econ || (econ.carrots || 0) < cost) {
      return interaction.editReply({ content: `Bạn không đủ ${cost} <:carrot:1436533295084208328> carrots để gacha Support Card!`, ephemeral: true });
    }

    econ.carrots -= cost;
    await econ.save();

    const rarity = pickRarity(cfg.gacha?.rates || { SSR: 3, SR: 17, R: 80 });
    const candidates = (cfg.cards || []).filter(c => c.rarity === rarity);
    const card = candidates[Math.floor(Math.random() * candidates.length)];

    const owned = new UserSupportCard({
      userId,
      cardId: card.id,
      name: card.name,
      character: card.character,
      rarity: card.rarity,
      type: card.type,
      trainingBoost: {
        speed: card.trainingBoost?.speed || 0,
        stamina: card.trainingBoost?.stamina || 0,
        power: card.trainingBoost?.power || 0,
        guts: card.trainingBoost?.guts || 0,
        wisdom: (card.trainingBoost?.wisdom || card.trainingBoost?.wit || 0),
        wit: (card.trainingBoost?.wit || 0),
      }
    });
    await owned.save();

    const embed = new EmbedBuilder()
      .setTitle('🎴 Support Card Gacha')
      .setDescription(`Bạn nhận được: **${card.name}** (${rarity})`)
      .addFields(
        { name: 'Nhân vật', value: card.character, inline: true },
        { name: 'Loại', value: card.type, inline: true },
        { name: 'Boost Train', value: Object.entries(card.trainingBoost||{}).map(([k,v])=>`${k.toUpperCase()} +${v}%`).join(' ') || '-', inline: false },
        { name: 'Carrots còn lại', value: `${econ.carrots} <:carrot:1436533295084208328>`, inline: true }
      )
      .setColor(rarity === 'SSR' ? '#FFD700' : rarity === 'SR' ? '#C0C0C0' : '#CD7F32')
      .setTimestamp();

    return interaction.editReply({ embeds: [embed], ephemeral: true });
  },

  async handleList(interaction) {
    const userId = interaction.user.id;
    const cards = await UserSupportCard.find({ userId }).limit(50);
    if (cards.length === 0) {
      return interaction.reply({ content: 'Bạn chưa có Support Card nào. Dùng `/uma_support gacha` để quay!', ephemeral: true });
    }
    const lines = cards.map((c, i) => `• ${i+1}. ${c.name} (${c.rarity}) — ${c.type} | Boost: ${['speed','stamina','power','guts','wisdom','wit'].filter(k => (c.trainingBoost?.[k]||0)>0).map(k=>`${k.toUpperCase()} +${c.trainingBoost[k]}%`).join(' ')}`);
    const embed = new EmbedBuilder()
      .setTitle('📚 Support Cards của bạn')
      .setDescription(lines.join('\n'))
      .setColor('#4D96FF');
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

