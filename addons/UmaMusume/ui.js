// UI kit for Uma Musume embeds (Discord.js v14)
const { EmbedBuilder } = require('discord.js');

// Emoji IDs used across the addon (preserved from legacy embeds)
const EMOJI = {
  speed: '<:speed:1435601053436612740>',
  stamina: '<:stamina:1435601056573685860>',
  power: '<:power:1435601051561492530>',
  guts: '<:guts:1435601048822747167>',
  wit: '<:wit:1435601060004757555>',
  carrot: '<:carrot:1436533295084208328>'
};

// Map rarity to consistent colors
const RARITY_COLOR = {
  Rainbow: '#FF7B00',
  Gold: '#FFD700',
  Silver: '#C0C0C0',
  Common: '#CD7F32'
};

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// Render a 10-block bar scaled to per-stat cap (default 1200)
function renderBar(value, cap = 1200) {
  const totalBlocks = 10;
  const ratio = clamp(value / cap, 0, 1);
  const filled = Math.round(ratio * totalBlocks);
  const empty = totalBlocks - filled;
  const filledChar = '▰';
  const emptyChar = '▱';
  return `${filledChar.repeat(filled)}${emptyChar.repeat(empty)}`;
}

function formatStatLine(label, emoji, value, cap = 1200) {
  const bar = renderBar(value, cap);
  return `${emoji} ${label}: ${value}  ${bar}`;
}

function formatStats(stats, capPerStat = 1200) {
  return [
    formatStatLine('Tốc độ', EMOJI.speed, stats.speed, capPerStat),
    formatStatLine('Thể lực', EMOJI.stamina, stats.stamina, capPerStat),
    formatStatLine('Sức mạnh', EMOJI.power, stats.power, capPerStat),
    formatStatLine('Tinh thần', EMOJI.guts, stats.guts, capPerStat),
    formatStatLine('Khôn ngoan', EMOJI.wit, stats.wit, capPerStat)
  ].join('\n');
}

function titleForTier(tier) {
  return '⭐'.repeat(clamp(tier, 1, 5));
}

// Build a unified profile/info embed
function profileEmbed({ userUma, rank, ownerTag, bonusesText, prefsText }) {
  const total = userUma.stats.speed + userUma.stats.stamina + userUma.stats.power + userUma.stats.guts + userUma.stats.wit;
  const color = RARITY_COLOR[userUma.rarity] || '#FF69B4';
  const embed = new EmbedBuilder()
    .setTitle(`${userUma.name} • ${titleForTier(userUma.tier)} • Rank ${rank}`)
    .setColor(color)
    .addFields(
      { name: 'Chỉ số', value: formatStats(userUma.stats), inline: false },
      { name: 'Aptitudes', value: prefsText || '-', inline: false },
      { name: 'Bonuses', value: bonusesText || 'Không có', inline: false },
      { name: 'Năng lượng', value: `${userUma.energy}/10`, inline: true },
      { name: 'Skill Points', value: `${userUma.skillPoints || 0}`, inline: true },
      { name: 'Tổng chỉ số', value: `${total}`, inline: true }
    )
    .setFooter({ text: ownerTag ? `Sở hữu bởi ${ownerTag}` : 'Uma Musume' })
    .setTimestamp();
  return embed;
}

// Gacha result embed
function gachaResultEmbed({ userUma, rarity, carrotsLeft, rank, bonusesText, prefsText }) {
  const color = RARITY_COLOR[rarity] || '#FF69B4';
  const embed = new EmbedBuilder()
    .setTitle('🎉 Gacha thành công!')
    .setDescription(`Bạn đã nhận được: **${userUma.name}**`)
    .setColor(color)
    .addFields(
      { name: 'Sao', value: titleForTier(userUma.tier), inline: true },
      { name: 'Độ hiếm', value: rarity, inline: true },
      { name: 'Rank', value: rank || '-', inline: true },
      { name: 'Chỉ số', value: formatStats(userUma.stats), inline: false },
      { name: 'Aptitudes', value: prefsText || '-', inline: false },
      { name: 'Bonuses', value: bonusesText || 'Không có', inline: false },
      { name: 'ID', value: `\`${userUma._id}\``, inline: false },
      { name: 'Carrots còn lại', value: `${carrotsLeft || 0} ${EMOJI.carrot}`, inline: true }
    )
    .setFooter({ text: 'Uma Musume • Gacha' });
  return embed;
}

// List embed
function listEmbed({ username, umas, page, totalPages, rankFn }) {
  const lines = umas.map((uma, idx) => {
    const rank = rankFn ? rankFn(uma.stats) : '-';
    return `• ${((page - 1) * 10) + idx + 1}. ${uma.name} ${titleForTier(uma.tier)} | Rank ${rank} | 🔋 ${uma.energy}/10 | \`${uma._id}\``;
  });
  return new EmbedBuilder()
    .setTitle(`📜 Danh sách Uma của ${username}`)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Trang ${page}/${totalPages}` })
    .setColor('#FF69B4');
}

// Training result embed
function trainResultEmbed({ uma, mainStat, mainGain, subStat, subGain, greatSuccess, rank }) {
  const color = greatSuccess ? '#FFD700' : '#00CC88';
  const title = greatSuccess ? '🌟 Đại thành công!' : '🏋️ Huấn luyện thành công';
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(`**${uma.name}** đã hoàn thành buổi huấn luyện.`)
    .setColor(color)
    .addFields(
      { name: 'Tăng chỉ số', value: `${mainStat.toUpperCase()}: +${mainGain}\n${subStat.toUpperCase()}: +${subGain}`, inline: true },
      { name: 'Hiện tại', value: formatStats(uma.stats), inline: false },
      { name: 'Rank', value: rank, inline: true },
      { name: 'Năng lượng', value: `${uma.energy}/10`, inline: true },
      { name: 'Lượt train', value: `${uma.trainCount}/30`, inline: true },
    )
    .setTimestamp();
}

module.exports = {
  EMOJI,
  RARITY_COLOR,
  renderBar,
  formatStats,
  profileEmbed,
  gachaResultEmbed,
  listEmbed,
  trainResultEmbed,
};

// Extra builders added below to keep exports stable above

function raceResultEmbed({ umaName, race, result, rewards }) {
  const placeColors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
  const color = placeColors[result.position] || '#808080';
  const title = `${race.name} • ${race.surface} • ${race.distance}m`;
  const embed = new EmbedBuilder()
    .setTitle(`🏁 ${title}`)
    .setDescription(`${umaName} đã hoàn thành cuộc đua.`)
    .setColor(color)
    .addFields(
      { name: 'Xếp hạng', value: `Hạng ${result.position}/${result.totalRacers}`, inline: true },
      { name: 'Điểm', value: result.score?.toFixed ? `${result.score.toFixed(2)}` : `${result.score}`, inline: true }
    )
    .setTimestamp();
  if (rewards) {
    embed.addFields({ name: 'Phần thưởng', value: rewards, inline: false });
  }
  return embed;
}

function careerProgressEmbed({ umaName, day, totalDays, energy, gains }) {
  const embed = new EmbedBuilder()
    .setTitle('📆 Chế độ sự nghiệp')
    .setDescription(`${umaName} • Ngày ${day}/${totalDays}`)
    .setColor('#00AAFF')
    .addFields(
      { name: 'Tích lũy', value: `SPD +${gains.speed}\nSTA +${gains.stamina}\nPOW +${gains.power}\nGUT +${gains.guts}\nWIS +${gains.wisdom}`, inline: true },
      { name: 'Năng lượng', value: `${energy}/100`, inline: true }
    )
    .setFooter({ text: 'Gọi lại /uma careers để sang ngày tiếp theo.' })
    .setTimestamp();
  return embed;
}

function careerFinalEmbed({ umaName, gains, rank }) {
  return new EmbedBuilder()
    .setTitle('🏅 Hoàn tất sự nghiệp')
    .setDescription(`${umaName} đã kết thúc huấn luyện.`)
    .setColor('#FFD700')
    .addFields(
      { name: 'Tăng chỉ số', value: `SPD +${gains.speed}\nSTA +${gains.stamina}\nPOW +${gains.power}\nGUT +${gains.guts}\nWIS +${gains.wisdom}`, inline: true },
      { name: 'Rank hiện tại', value: rank, inline: true }
    )
    .setFooter({ text: 'Bạn nhận thêm Skill Points và giữ lại chỉ số.' })
    .setTimestamp();
}

module.exports.raceResultEmbed = raceResultEmbed;
module.exports.careerProgressEmbed = careerProgressEmbed;
module.exports.careerFinalEmbed = careerFinalEmbed;

