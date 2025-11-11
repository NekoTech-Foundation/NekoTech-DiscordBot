const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const UmaMusume = require('./schemas/UmaMusume');
const UmaCareer = require('./schemas/UmaCareer');
const EconomyUserData = require('../../models/EconomyUserData');
const allSkills = require('./skills.json').skills;
const { formatTrackPreferences } = require('./umaUtilsNew');

const moodEmojis = {
  Worst: '😰',
  Bad: '😟',
  Normal: '😐',
  Good: '😊',
  Great: '🤩'
};

const moodColors = {
  Worst: 0x8B0000,
  Bad: 0xFF6B6B,
  Normal: 0xFFD93D,
  Good: 0x6BCB77,
  Great: 0x4D96FF
};

const racesList = [
  { name: 'Sprinters Stakes', distance: 1200, type: 'Sprint', difficulty: 1, weather: 'Clear' },
  { name: 'Kikka Sho', distance: 3000, type: 'Long', difficulty: 2, weather: 'Clear' },
  { name: 'Tokyo Yushun (Derby Nhật Bản)', distance: 2400, type: 'Medium', difficulty: 3, weather: 'Sunny' },
  { name: 'Satsuki Sho', distance: 2000, type: 'Medium', difficulty: 4, weather: 'Rainy' },
  { name: 'Tenno Sho (Thu)', distance: 2000, type: 'Medium', difficulty: 5, weather: 'Clear' },
  { name: 'Tenno Sho (Xuân)', distance: 3200, type: 'Long', difficulty: 6, weather: 'Rainy' },
  { name: 'Osaka Hai', distance: 2000, type: 'Medium', difficulty: 7, weather: 'Foggy' },
  { name: 'Takamazunomiya Kinen', distance: 1200, type: 'Sprint', difficulty: 8, weather: 'Sunny' },
  { name: 'Arima Kinen', distance: 2500, type: 'Long', difficulty: 9, weather: 'Snowy' },
  { name: 'Japan Cup', distance: 2400, type: 'Medium', difficulty: 10, weather: 'Clear' }
];

const weatherEffects = {
    'Clear': { emoji: '☀️', description: 'Thời tiết đẹp, không ảnh hưởng.' },
    'Sunny': { emoji: '☀️', description: 'Trời nắng đẹp, một chút lợi thế cho Speed.' },
    'Rainy': { emoji: '🌧️', description: 'Trời mưa, đường đua trơn trượt, ảnh hưởng Power.' },
    'Foggy': { emoji: '🌫️', description: 'Sương mù dày đặc, khó đoán định.' },
    'Snowy': { emoji: '❄️', description: 'Tuyết rơi, đường đua cực khó, ảnh hưởng lớn đến Speed.' }
};

function getMoodSuccessRate(mood) {
  switch(mood) {
    case 'Worst': return { min: 60, max: 90 };
    case 'Bad': return { min: 40, max: 70 };
    case 'Normal': return { min: 95, max: 99 };
    case 'Good': return { min: 100, max: 100 };
    case 'Great': return { min: 100, max: 100 };
    default: return { min: 95, max: 99 };
  }
}

function calculateMoodChange(currentMood, action, success = true, weather = 'Clear') {
  const moods = ['Worst', 'Bad', 'Normal', 'Good', 'Great'];
  const currentIndex = moods.indexOf(currentMood);
  
  if (action === 'rest') {
    const chance = Math.random();
    if (chance < 0.4 && currentIndex < moods.length - 1) {
      return moods[currentIndex + 1];
    }
    return currentMood;
  }
  
  if (action === 'training') {
    if (success) {
      const chance = Math.random();
      if (chance < 0.15 && currentIndex < moods.length - 1) {
        return moods[currentIndex + 1];
      }
    } else {
      const chance = Math.random();
      if (chance < 0.25 && currentIndex > 0) {
        return moods[currentIndex - 1];
      }
    }
  }
  
  if (action.startsWith('race')) {
      let moodChangeChance = 0;
      if (action === 'race_win') {
          moodChangeChance = 0.5;
          if (weather === 'Sunny') moodChangeChance += 0.1;
          if (Math.random() < moodChangeChance && currentIndex < moods.length - 1) return moods[currentIndex + 1];
      } else { // race_lose
          moodChangeChance = 0.3;
          if (weather === 'Rainy' || weather === 'Snowy') moodChangeChance += 0.15;
          if (Math.random() < moodChangeChance && currentIndex > 0) return moods[currentIndex - 1];
      }
  }
  
  return currentMood;
}

function simulateRace(umaStats, race) {
  const totalStats = Object.values(umaStats).reduce((a, b) => a + b, 0);
  
  let umaScore = totalStats;
  
  if (race.type === 'Sprint') umaScore += umaStats.speed * 0.3;
  else if (race.type === 'Medium') umaScore += umaStats.stamina * 0.2 + umaStats.speed * 0.1;
  else if (race.type === 'Long') umaScore += umaStats.stamina * 0.3 + umaStats.guts * 0.2;

  // Weather effects
  switch (race.weather) {
      case 'Sunny':
          umaScore *= 1.05; // 5% bonus
          break;
      case 'Rainy':
          umaScore *= 0.95; // 5% penalty
          break;
      case 'Foggy':
          umaScore *= (0.9 + Math.random() * 0.2); // Higher variance
          break;
      case 'Snowy':
          umaScore *= 0.9; // 10% penalty
          umaScore += umaStats.guts * 0.1; // Guts help in harsh conditions
          break;
  }
  
  umaScore = umaScore * (0.9 + Math.random() * 0.2);
  
  const numBots = 5 + Math.floor(Math.random() * 4);
  const botScores = [];
  
  for (let i = 0; i < numBots; i++) {
    const botBase = totalStats * (0.8 + Math.random() * 0.4);
    let botScore = botBase * (0.9 + Math.random() * 0.2) * (1 + race.difficulty * 0.05);
    if (race.weather === 'Foggy') {
        botScore *= (0.8 + Math.random() * 0.4);
    }
    botScores.push(botScore);
  }
  
  botScores.push(umaScore);
  botScores.sort((a, b) => b - a);
  
  const position = botScores.indexOf(umaScore) + 1;
  const totalRacers = botScores.length;
  
  let reward = 0;
  if (position === 1) reward = 500 + race.difficulty * 100;
  else if (position === 2) reward = 300 + race.difficulty * 50;
  else if (position === 3) reward = 150 + race.difficulty * 30;
  
  return {
    position,
    totalRacers,
    reward,
    umaScore: Math.round(umaScore),
    isWin: position === 1
  };
}

// Compute effective SP cost with aptitude synergy: 15% discount if matching strong aptitude (A or better)
function effectiveSkillCost(skill, umaPrefs) {
  try {
    const cond = (skill.effects?.condition || '').toLowerCase();
    let match = false;
    if (cond.includes('sprint')) match = ['A','A+','S'].includes(umaPrefs?.sprint);
    else if (cond.includes('long')) match = ['A','A+','S'].includes(umaPrefs?.long);
    else if (cond.includes('mile')) match = ['A','A+','S'].includes(umaPrefs?.mile);
    else if (cond.includes('medium')) match = ['A','A+','S'].includes(umaPrefs?.medium);
    else if (cond.includes('right_turn') || cond.includes('corner')) match = ['A','A+','S'].includes(umaPrefs?.stalker) || ['A','A+','S'].includes(umaPrefs?.front);
    // Season synergy
    if (!match && skill.effects?.season) match = true; // allow seasonal discount to encourage use
    const base = skill.cost || 0;
    return Math.max(1, Math.floor(base * (match ? 0.85 : 1)));
  } catch { return skill.cost || 0; }
}

async function showMainMenu(interaction, career, uma) {
  const nextRace = racesList[career.currentRace];
  const currentTotalDays = nextRace.difficulty < 5 ? 12 : 7;

  let description = `**${uma.name}** đang trong quá trình huấn luyện!\n\n` +
    `📅 **Ngày training:** ${career.currentDay}/${currentTotalDays}\n` +
    `🎭 **Mood:** ${moodEmojis[career.mood]} ${career.mood}\n` +
    `⚡ **Năng lượng:** ${career.energy}/100\n\n` +
    `🏆 **Cuộc đua tiếp theo:** ${career.currentRace + 1}/${career.totalRaces} - ${nextRace?.name || 'Hoàn thành!'}\n` +
    `✅ **Tổng thắng:** ${career.totalWins}\n\n`;

  const statIcons = { speed: '<:speed:1435601053436612740>', stamina: '<:stamina:1435601056573685860>', power: '<:power:1435601051561492530>', guts: '<:guts:1435601048822747167>', wisdom: '<:wit:1435601060004757555>' };
  description += `**Chỉ số career:**\n` +
    `${statIcons.speed} Speed: ${career.careerStats.speed}\n` +
    `${statIcons.stamina} Stamina: ${career.careerStats.stamina}\n` +
    `${statIcons.power} Power: ${career.careerStats.power}\n` +
    `${statIcons.guts} Guts: ${career.careerStats.guts}\n` +
    `${statIcons.wisdom} Wisdom: ${career.careerStats.wisdom}`;

  if (career.supportCards && career.supportCards.length > 0) {
    const scList = career.supportCards.map(c => `${c.name} (${c.rarity})`).join(' | ');
    const boosts = Object.entries(career.supportSummary || {})
      .filter(([_,v]) => v>0)
      .map(([k,v]) => `${k.toUpperCase()} +${v}%`).join(' ');
    description += `\n\n**Support Cards:** ${scList}\n**Support Boost:** ${boosts || '—'}`;
  }

  const embed = new EmbedBuilder()
    .setColor(moodColors[career.mood])
    .setDescription(description)
    .setFooter({ text: `${interaction.user.username} đã yêu cầu` })
    .setTimestamp();

  const row = new ActionRowBuilder();
  
  if (career.currentDay >= currentTotalDays) {
    embed.setTitle(`🏆 Chế độ Careers - Sẵn sàng đua!`);
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('career_race')
            .setLabel('🏁 Tham gia cuộc đua!')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('career_end')
            .setLabel('🚪 Kết thúc Careers')
            .setStyle(ButtonStyle.Danger)
    );
  } else {
    embed.setTitle(`🏆 Chế độ Careers - Đang huấn luyện`);
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('career_rest')
            .setLabel('💤 Nghỉ ngơi')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('career_training')
            .setLabel('🏋️ Luyện tập')
            .setStyle(ButtonStyle.Success)
            .setDisabled(career.energy < 20),
        new ButtonBuilder()
            .setCustomId('career_skills')
            .setLabel('✨ Skills Hỗ trợ')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('career_end')
            .setLabel('🚪 Kết thúc Careers')
            .setStyle(ButtonStyle.Danger)
    );
  }

  if (career.mood === 'Worst' || career.mood === 'Bad') {
    embed.addFields({
      name: '⚠️ Cảnh báo!',
      value: `Mood của bạn đang ở mức ${career.mood}! Nên nghỉ ngơi để cải thiện Mood.`
    });
  }

  return { embeds: [embed], components: [row] };
}

async function showTrainingMenu(interaction, career) {
  const successRate = getMoodSuccessRate(career.mood);
  
  const embed = new EmbedBuilder()
    .setColor(moodColors[career.mood])
    .setTitle('🏋️ Chế độ Luyện tập')
    .setDescription(`Chọn loại luyện tập:\n\n` +
      `**Mood hiện tại:** ${moodEmojis[career.mood]} ${career.mood}\n` +
      `**Tỉ lệ thành công:** ${successRate.min}%-${successRate.max}%\n` +
      `**Năng lượng:** ${career.energy}/100 (Mỗi lần luyện tập tốn 20 năng lượng)`)
    .addFields(
      { name: '<:speed:1435601053436612740> 1. Chạy bộ (Running)', value: 'Tăng Speed +10-15, Power +3-5', inline: false },
      { name: '<:stamina:1435601056573685860> 2. Tập sức bền (Endurance)', value: 'Tăng Stamina +10-15, Guts +3-5', inline: false },
      { name: '<:power:1435601051561492530> 3. Tập sức mạnh (Power)', value: 'Tăng Power +10-15, Stamina +3-5', inline: false },
      { name: '<:guts:1435601048822747167> 4. Tập Can đảm (Guts)', value: 'Tăng Guts +10-15, Speed +2-4, Power +2-4', inline: false },
      { name: '<:wit:1435601060004757555> 5. Tập Trí thông minh (Wisdom)', value: 'Tăng Wisdom +10-15, Speed +2-3, Hồi 5 năng lượng', inline: false }
    );

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('train_speed')
        .setLabel('Speed')
        .setEmoji('1435601053436612740')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('train_stamina')
        .setLabel('Stamina')
        .setEmoji('1435601056573685860')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('train_power')
        .setLabel('Power')
        .setEmoji('1435601051561492530')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('train_guts')
        .setLabel('Guts')
        .setEmoji('1435601048822747167')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('train_wisdom')
        .setLabel('Wisdom')
        .setEmoji('1435601060004757555')
        .setStyle(ButtonStyle.Primary)
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('career_back')
        .setLabel('◀️ Quay lại')
        .setStyle(ButtonStyle.Secondary)
    );

  return { embeds: [embed], components: [row, row2] };
}

async function showSkillsMenu(interaction, career) {
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✨ Skills Hỗ trợ')
        .setDescription(`**Kỹ năng của bạn:**\n${career.skills.length > 0 ? career.skills.map((s, i) => `• ${s.name} (${s.rarity})`).join('\n') : 'Chưa có kỹ năng nào.'}\n\n` +
            `**Điểm Kỹ năng (SP):** ${career.skillPoints || 0}\n\n` +
            `Bạn có thể mua kỹ năng mới từ shop!`);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('skill_shop')
                .setLabel('🛒 Mua Skill')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('career_back')
                .setLabel('◀️ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );

    return { embeds: [embed], components: [row] };
}

async function showSkillShopMenu(interaction, career) {
    const ownedSkillNames = new Set(career.skills.map(s => s.name));
    const availableSkills = allSkills.filter(s => !ownedSkillNames.has(s.name));

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🛒 Cửa hàng Kỹ năng')
        .setDescription(`**Điểm Kỹ năng (SP) của bạn:** ${career.skillPoints || 0}\n\nChọn kỹ năng để mua từ danh sách bên dưới.`);

    const components = [];
    const rarities = ['Common', 'Rare', 'Gold'];

    rarities.forEach(rarity => {
        const skillsOfRarity = availableSkills.filter(s => s.rarity === rarity);
        if (skillsOfRarity.length > 0) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`career_skill_purchase_${rarity.toLowerCase()}`)
                .setPlaceholder(`Chọn kỹ năng ${rarity} để mua...`);

            skillsOfRarity.slice(0, 25).forEach(skill => {
                selectMenu.addOptions({
                    label: `${skill.name}`,
                    description: `Giá: ${skill.cost} SP - ${skill.description.substring(0, 50)}...`,
                    value: skill.name,
                });
            });
            components.push(new ActionRowBuilder().addComponents(selectMenu));
        }
    });

    if (components.length === 0) {
        embed.setDescription('Bạn đã học tất cả các kỹ năng có sẵn hoặc không có kỹ năng nào trong cửa hàng!');
    }
    
    components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('career_back')
            .setLabel('◀️ Quay lại')
            .setStyle(ButtonStyle.Secondary)
    ));

    return { embeds: [embed], components: components };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uma_careers')
    .setDescription('Chế độ huấn luyện Careers cho Mã nương của bạn')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Bắt đầu một career mới'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('menu')
        .setDescription('Hiển thị lại menu career hiện tại')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (subcommand === 'start') {
      const { StringSelectMenuBuilder } = require('discord.js');

      // Check if user has any Uma
      const userUmas = await UmaMusume.find({ ownerId: userId, retired: false }).limit(25);
      
      if (userUmas.length === 0) {
        const noUmaEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Không có Mã nương')
          .setDescription('Bạn chưa có mã nương nào! Hãy dùng `/uma gacha` để bắt đầu.')
          .setFooter({ text: 'Uma Musume Careers' })
          .setTimestamp();
        return interaction.reply({ 
          embeds: [noUmaEmbed], 
          ephemeral: true 
        });
      }

      // Check if user already has an active career
      let career = await UmaCareer.findOne({ userId, isActive: true });
      if (career) {
        const activeCareerEmbed = new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle('⚠️ Career đang hoạt động')
          .setDescription('Bạn đã có một Career đang hoạt động! Hãy hoàn thành hoặc kết thúc nó trước khi bắt đầu một career mới.')
          .setFooter({ text: 'Uma Musume Careers' })
          .setTimestamp();
        return interaction.reply({ 
          embeds: [activeCareerEmbed], 
          ephemeral: true 
        });
      }

      // Create select menu with user's Uma
      const options = userUmas.map(uma => {
        const totalStats = uma.stats.speed + uma.stats.stamina + uma.stats.power + uma.stats.guts + uma.stats.wit;
        return {
          label: uma.name,
          description: `⭐${'★'.repeat(uma.tier)} | Total Stats: ${totalStats}`,
          value: uma._id.toString()
        };
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`uma_careers_select_${userId}`)
        .setPlaceholder('🏆 Chọn mã nương để tham gia Careers')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🏆 Uma Musume Careers Mode')
        .setDescription(`Chọn một mã nương để bắt đầu chế độ Careers!\n\n` +
          `**Careers Mode gồm 2 giai đoạn:**\n` +
          `📚 **Phase 1:** 12 ngày huấn luyện\n` +
          `🏁 **Phase 2:** 10 cuộc đua tranh tài\n\n` +
          `✨ Chỉ số tăng sẽ được cộng vào mã nương sau khi hoàn thành!`)
        .addFields(
          { name: '📅 Training Phase', value: 'Luyện tập để tăng stats trong 12 ngày', inline: true },
          { name: '🏁 Racing Phase', value: 'Thi đấu với bots trong 10 cuộc đua', inline: true },
          { name: '💰 Rewards', value: 'Stats + Skill Points + Race Coins', inline: true }
        )
        .setFooter({ text: 'Chọn mã nương từ menu bên dưới' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    } else if (subcommand === 'menu') {
      const career = await UmaCareer.findOne({ userId, isActive: true });

      if (!career) {
        return interaction.reply({
          content: '❌ Bạn không có career nào đang hoạt động. Hãy dùng `/uma_careers start` để bắt đầu.',
          ephemeral: true
        });
      }

      const uma = await UmaMusume.findById(career.umaId);
      if (!uma) {
        return interaction.reply({
          content: '❌ Không tìm thấy mã nương được liên kết với career của bạn.',
          ephemeral: true
        });
      }

      const menuData = await showMainMenu(interaction, career, uma);
      await interaction.reply({ ...menuData, ephemeral: true });
    }
  }
};

// Add handler for select menu at the end of file, before the endCareer function
async function handleUmaSelection(interaction, umaId, userId) {
  const uma = await UmaMusume.findById(umaId);
  if (!uma || uma.ownerId !== userId) {
    return interaction.update({ 
      content: '❌ Không tìm thấy mã nương này hoặc không thuộc sở hữu của bạn.', 
      components: [], 
      embeds: [] 
    });
  }

  // Create new career
  // Aggregate top support boosts automatically (pick up to 2 strongest)
  let supportCards = [];
  try {
    const UserSupportCard = require('./schemas/SupportCard');
    const all = await UserSupportCard.find({ userId }).limit(50);
    const scoreRarity = (r) => r==='SSR'?3 : r==='SR'?2 : 1;
    supportCards = all
      .sort((a,b)=> scoreRarity(b.rarity)-scoreRarity(a.rarity))
      .slice(0,2)
      .map(c => ({
        cardId: c.cardId,
        name: c.name,
        rarity: c.rarity,
        type: c.type,
        trainingBoost: c.trainingBoost || {}
      }));
  } catch {}
  const supportSummary = ['speed','stamina','power','guts','wisdom','wit'].reduce((acc,k)=>{acc[k]=0; return acc;},{});
  supportCards.forEach(c=>{
    for (const [k,v] of Object.entries(c.trainingBoost||{})) {
      supportSummary[k] = Math.min(40, (supportSummary[k]||0) + (v||0));
    }
  });

  let career = new UmaCareer({
    userId,
    umaId: uma._id,
    isActive: true,
    currentDay: 0,
    totalRaces: 10,
    currentRace: 0,
    mood: 'Normal',
    careerStats: {
      speed: 0,
      stamina: 0,
      power: 0,
      guts: 0,
      wisdom: 0
    },
    energy: 100,
    skills: [],
    supportCards,
    supportSummary,
    skillPoints: 50, // Starting SP
    raceResults: [],
    totalWins: 0
  });
  await career.save();

  const menuData = await showMainMenu(interaction, career, uma);
  await interaction.update(menuData);
}

async function endCareer(interaction, career, uma) {
  const totalStats = Object.values(career.careerStats).reduce((a, b) => a + b, 0);
  
  uma.stats.speed += career.careerStats.speed;
  uma.stats.stamina += career.careerStats.stamina;
  uma.stats.power += career.careerStats.power;
  uma.stats.guts += career.careerStats.guts;
  uma.stats.wit += career.careerStats.wisdom;
  
  const bonusSP = Math.floor(totalStats / 5);
  uma.skillPoints += (career.skillPoints + bonusSP);
  
  await uma.save();

  career.isActive = false;
  await career.save();

  const finalEmbed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('🏆 Kết thúc chế độ Careers!')
    .setDescription(`**${uma.name}** đã hoàn thành khóa huấn luyện!\n\n` +
      `**Tổng kết chỉ số tăng:**\n` +
      `🏃 Speed: +${career.careerStats.speed}\n` +
      `💪 Stamina: +${career.careerStats.stamina}\n` +
      `⚡ Power: +${career.careerStats.power}\n` +
      `🔥 Guts: +${career.careerStats.guts}\n` +
      `🧠 Wisdom: +${career.careerStats.wisdom}\n\n` +
      `**Tổng điểm:** ${totalStats}\n` +
      `**Skill Points thưởng:** +${bonusSP}\n\n` +
      `Các chỉ số đã được cộng vào ${uma.name}!`)
    .setTimestamp();

  await interaction.editReply({ embeds: [finalEmbed], components: [] });
}

async function startFinalChallengeRace(interaction, career, uma) {
  const finalRace = racesList.find(r => r.name === 'Arima Kinen');
  // We can create a temporary race object with higher difficulty for the challenge
  const challengeRace = { ...finalRace, difficulty: finalRace.difficulty + 5 };

  const result = simulateRace(career.careerStats, challengeRace);

  const oldMood = career.mood;
  career.mood = calculateMoodChange(career.mood, result.isWin ? 'race_win' : 'race_lose', result.isWin, challengeRace.weather);

  career.raceResults.push({
    raceName: `(Thử thách) ${finalRace.name}`,
    position: result.position,
    totalRacers: result.totalRacers,
    reward: result.reward
  });

  if (result.isWin) career.totalWins++;
  career.currentRace++; // This might not be necessary, but for consistency

  await career.save();

  // Award coins to user
  if (result.reward > 0) {
    const userEconomy = await EconomyUserData.findOne({ userId: career.userId });
    if (userEconomy) {
      userEconomy.balance += result.reward;
      await userEconomy.save();
    }
  }

  const positionEmoji = result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : result.position === 3 ? '🥉' : '📍';
  const raceEmbed = new EmbedBuilder()
    .setColor(result.isWin ? 0xFFD700 : 0x808080)
    .setTitle(`🏁 (Thử thách) ${finalRace.name}`)
    .setDescription(`**${uma.name}** đã chấp nhận thử thách cuối cùng!\n\n` +
      `*Vì kết thúc sớm, bạn phải đối mặt với một cuộc đua cực kỳ khó khăn!*\n\n` +
      `📏 **Cự ly:** ${finalRace.distance}m (${finalRace.type})\n` +
      `${positionEmoji} **Vị trí:** ${result.position}/${result.totalRacers}\n` +
      `📊 **Điểm số:** ${result.umaScore}\n` +
      `💰 **Thưởng:** ${result.reward} coins\n` +
      `🎭 **Mood:** ${moodEmojis[oldMood]} ${oldMood} → ${moodEmojis[career.mood]} ${career.mood}`)
    .setTimestamp();

  await interaction.editReply({ embeds: [raceEmbed], components: [] });

  setTimeout(async () => {
    await endCareer(interaction, career, uma);
  }, 5000);
}

async function runRaceAnimation(interaction, uma, race, result) {
    const trackLength = 30;
    const numFrames = 5;
    const playerIcon = '🏇';
    const botIcon = '🐴';

    const racers = [{ name: uma.name, icon: playerIcon, pos: 0, finalPos: result.position }];
    for (let i = 0; i < result.totalRacers - 1; i++) {
        racers.push({ name: `Bot ${i+1}`, icon: botIcon, pos: 0, finalPos: -1 }); // Final pos -1 for bots for now
    }

    const raceEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`🏁 ${race.name}`)
        .setDescription(`Thời tiết: ${weatherEffects[race.weather].emoji} ${weatherEffects[race.weather].description}\nCuộc đua bắt đầu!`)
        .setTimestamp();

    let raceTrack = racers.map(r => `[${r.icon}]` + '─'.repeat(trackLength)).join('\n');
    raceEmbed.addFields({ name: 'Đường đua', value: raceTrack });
    
    await interaction.editReply({ embeds: [raceEmbed], components: [] });
    await new Promise(resolve => setTimeout(resolve, 2000));

    for (let frame = 1; frame <= numFrames; frame++) {
        let descriptionText = `Cuộc đua đang diễn ra... Vòng ${frame}/${numFrames}`;
        if (frame === numFrames) {
            descriptionText = "Về đích!";
        }

        raceTrack = '';
        racers.forEach(r => {
            // Simple animation logic
            const advance = Math.random() * (trackLength / numFrames);
            r.pos += advance;
            if (r.pos > trackLength) r.pos = trackLength;

            const trackProgress = '─'.repeat(Math.floor(r.pos));
            const remainingTrack = '─'.repeat(trackLength - Math.floor(r.pos));
            raceTrack += `[${r.icon}]${trackProgress}🏁${remainingTrack}\n`;
        });

        const updatedEmbed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(`🏁 ${race.name}`)
            .setDescription(`Thời tiết: ${weatherEffects[race.weather].emoji} ${weatherEffects[race.weather].description}\n${descriptionText}`)
            .addFields({ name: 'Đường đua', value: raceTrack })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [updatedEmbed] });
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
}

// Create a new career with a chosen support card (or none)
// Create a new career with chosen support cards (array) or none
async function createCareerWithSupport(interaction, userId, umaIdOrDoc, supportDocs) {
  const uma = typeof umaIdOrDoc === 'object' ? umaIdOrDoc : await UmaMusume.findById(umaIdOrDoc);
  if (!uma || uma.ownerId !== userId) {
    return interaction.update({ content: 'Không tìm thấy Uma hợp lệ.', components: [], embeds: [] });
  }
  const supportSummary = { speed:0, stamina:0, power:0, guts:0, wisdom:0, wit:0 };
  const supportCards = [];
  if (Array.isArray(supportDocs) && supportDocs.length) {
    const max = Math.min(6, supportDocs.length);
    for (let i = 0; i < max; i++) {
      const sd = supportDocs[i];
      supportCards.push({
        cardId: sd.cardId,
        name: sd.name,
        rarity: sd.rarity,
        type: sd.type,
        trainingBoost: sd.trainingBoost || {}
      });
      for (const [k,v] of Object.entries(sd.trainingBoost || {})) {
        supportSummary[k] = Math.min(40, (supportSummary[k]||0) + (v||0));
      }
    }
  }
  const career = new UmaCareer({
    userId,
    umaId: uma._id,
    isActive: true,
    currentDay: 0,
    totalRaces: 10,
    currentRace: 0,
    mood: 'Normal',
    careerStats: { speed: 0, stamina: 0, power: 0, guts: 0, wisdom: 0 },
    energy: 100,
    skills: [],
    supportCards,
    supportSummary,
    skillPoints: 50,
    raceResults: [],
    totalWins: 0
  });
  await career.save();
  const menuData = await showMainMenu(interaction, career, uma);
  return interaction.update(menuData);
}

// Handle career button interactions
async function handleCareerInteraction(interaction) {
  const userId = interaction.user.id;
  
  try {
    await interaction.deferUpdate();

    let career = await UmaCareer.findOne({ userId, isActive: true });
    if (!career) {
      return interaction.editReply({ 
        content: '❌ Bạn không có career nào đang hoạt động!', 
        embeds: [], components: []
      });
    }

    const uma = await UmaMusume.findById(career.umaId);
    if (!uma) {
      return interaction.editReply({ 
        content: '❌ Không tìm thấy mã nương!', 
        embeds: [], components: []
      });
    }
    
    if (interaction.customId === 'career_rest') {
      career.energy = Math.min(100, career.energy + 20);
      career.currentDay += 1;
      
      const oldMood = career.mood;
      career.mood = calculateMoodChange(career.mood, 'rest');
      
      await career.save();

      const nextRace = racesList[career.currentRace];
      const currentTotalDays = nextRace.difficulty < 5 ? 12 : 7;
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('💤 Nghỉ ngơi')
        .setDescription(`${uma.name} đã nghỉ ngơi và hồi phục!\n\n` +
          `⚡ Năng lượng: +20 (${career.energy}/100)\n` +
          `🎭 Mood: ${moodEmojis[oldMood]} ${oldMood} → ${moodEmojis[career.mood]} ${career.mood}\n` +
          `📅 Ngày: ${career.currentDay}/${currentTotalDays}`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], components: [] });
      
      setTimeout(async () => {
        try {
            const latestCareer = await UmaCareer.findOne({ userId, isActive: true });
            if (!latestCareer) return;
            const menuData = await showMainMenu(interaction, latestCareer, uma);
            await interaction.editReply(menuData);
        } catch(e) {
            if (e.code !== 10008) console.error("Error in career_rest timeout:", e);
        }
      }, 2000);

    } else if (interaction.customId === 'career_training') {
      if (career.energy < 20) {
        return interaction.followUp({ content: '❌ Không đủ năng lượng để luyện tập!', ephemeral: true });
      }
      const menuData = await showTrainingMenu(interaction, career);
      await interaction.editReply(menuData);

    } else if (interaction.customId === 'career_skills') {
        const menuData = await showSkillsMenu(interaction, career);
        await interaction.editReply(menuData);

    } else if (interaction.customId === 'skill_shop') {
        const menuData = await showSkillShopMenu(interaction, career);
        await interaction.editReply(menuData);

    } else if (interaction.customId.startsWith('train_')) {
      const stat = interaction.customId.replace('train_', '');
      
      career.energy -= 20;
      career.currentDay += 1;

      const successRate = getMoodSuccessRate(career.mood);
      const roll = Math.random() * 100;
      const success = roll <= (successRate.min + Math.random() * (successRate.max - successRate.min));

      let resultEmbed = new EmbedBuilder().setTimestamp();
      const nextRace = racesList[career.currentRace];
      const currentTotalDays = nextRace.difficulty < 5 ? 12 : 7;
      const oldMood = career.mood;
      const moods = ['Worst', 'Bad', 'Normal', 'Good', 'Great'];

      if (success) {
        const progressionBonus = Math.floor(career.currentRace * 1.5); // +1.5 stats per race completed
        const mainIncrease = (Math.floor(Math.random() * 6) + 10) + progressionBonus;
        const bonusIncrease = (Math.floor(Math.random() * 3) + 3) + Math.floor(progressionBonus / 2);

        const statMapping = {
          speed: { main: 'speed', bonus: 'power', mainStat: 'Speed', bonusStat: 'Power' },
          stamina: { main: 'stamina', bonus: 'guts', mainStat: 'Stamina', bonusStat: 'Guts' },
          power: { main: 'power', bonus: 'stamina', mainStat: 'Power', bonusStat: 'Stamina' },
          guts: { main: 'guts', bonus: 'speed', mainStat: 'Guts', bonusStat: 'Speed' },
          wisdom: { main: 'wisdom', bonus: 'speed', mainStat: 'Wisdom', bonusStat: 'Speed' }
        };

        const mapping = statMapping[stat];
        // Apply support card boosts
        const sum = career.supportSummary || {};
        const boostMain = 1 + ((sum[mapping.main] || 0) / 100);
        const boostBonus = 1 + ((sum[mapping.bonus] || 0) / 100);
        const incMain = Math.floor(mainIncrease * boostMain);
        const incBonus = Math.floor(bonusIncrease * boostBonus);

        career.careerStats[mapping.main] += incMain;
        career.careerStats[mapping.bonus] += incBonus;

        if (stat === 'wisdom') {
          career.energy = Math.min(100, career.energy + 5);
          // Wisdom training has a chance to increase mood
          career.mood = calculateMoodChange(oldMood, 'training', true);
        } else {
          // Physical training has a chance to decrease mood, especially with low energy
          let moodDropChance = 0.05; // 5% base chance
          if (career.energy < 40) {
              moodDropChance += 0.03 + Math.random() * 0.04; // Add 3-7%
          }
          if (Math.random() < moodDropChance) {
              const currentIndex = moods.indexOf(career.mood);
              if (currentIndex > 0) {
                  career.mood = moods[currentIndex - 1];
              }
          }
        }

        resultEmbed
          .setColor(0x00FF00)
          .setTitle('✅ Luyện tập thành công!')
          .setDescription(`${uma.name} đã luyện tập xuất sắc!\n\n` +
            `📈 **${mapping.mainStat}:** +${mainIncrease} (+${progressionBonus} bonus)\n` +
            `📈 **${mapping.bonusStat}:** +${bonusIncrease} (+${Math.floor(progressionBonus/2)} bonus)\n` +
            (stat === 'wisdom' ? `⚡ **Năng lượng:** +5\n` : '') +
            `🎭 **Mood:** ${moodEmojis[oldMood]} ${oldMood} → ${moodEmojis[career.mood]} ${career.mood}\n` +
            `⚡ **Năng lượng còn lại:** ${career.energy}/100\n` +
            `📅 **Ngày:** ${career.currentDay}/${currentTotalDays}`);

      } else {
        career.mood = calculateMoodChange(oldMood, 'training', false);

        resultEmbed
          .setColor(0xFF0000)
          .setTitle('❌ Luyện tập thất bại!')
          .setDescription(`${uma.name} đã thất bại trong buổi luyện tập...\n\n` +
            `📉 Không có chỉ số nào tăng\n` +
            `🎭 **Mood:** ${moodEmojis[oldMood]} ${oldMood} → ${moodEmojis[career.mood]} ${career.mood}\n` +
            `⚡ **Năng lượng còn lại:** ${career.energy}/100\n` +
            `📅 **Ngày:** ${career.currentDay}/${currentTotalDays}`);
      }

      await career.save();
      await interaction.editReply({ embeds: [resultEmbed], components: [] });

      setTimeout(async () => {
        try {
            const latestCareer = await UmaCareer.findOne({ userId, isActive: true });
            if (!latestCareer) return;
            const menuData = await showMainMenu(interaction, latestCareer, uma);
            await interaction.editReply(menuData);
        } catch(e) {
            if (e.code !== 10008) console.error("Error in train_ timeout:", e);
        }
      }, 3000);

    } else if (interaction.customId === 'career_race') {
        const nextRace = racesList[career.currentRace];
        const currentTotalDays = nextRace.difficulty < 5 ? 12 : 7;
        if (career.currentDay < currentTotalDays) {
            return interaction.followUp({ content: `❌ Bạn cần hoàn thành ${currentTotalDays} ngày huấn luyện trước khi đua!`, ephemeral: true });
        }
        if (career.currentRace >= career.totalRaces) {
            return interaction.followUp({ content: '❌ Đã hoàn thành tất cả các cuộc đua!', ephemeral: true });
        }

      const race = racesList[career.currentRace];
      const result = simulateRace(career.careerStats, race);
      
      await runRaceAnimation(interaction, uma, race, result);
      
      const oldMood = career.mood;
      career.mood = calculateMoodChange(career.mood, result.isWin ? 'race_win' : 'race_lose', result.isWin, race.weather);
      
      career.raceResults.push({
        raceName: race.name,
        position: result.position,
        totalRacers: result.totalRacers,
        reward: result.reward
      });
      
      if (result.isWin) career.totalWins++;
      if (result.reward > 0) {
          career.skillPoints += Math.floor(result.reward / 10);
      }
      
      career.currentRace++;
      career.currentDay = 0; // Reset for next training cycle
      
      await career.save();
      
      if (result.reward > 0) {
        await EconomyUserData.findOneAndUpdate({ userId }, { $inc: { balance: result.reward } });
      }
      
      const positionEmoji = result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : result.position === 3 ? '🥉' : '📍';
      const raceEmbed = new EmbedBuilder()
        .setColor(result.isWin ? 0xFFD700 : result.position <= 3 ? 0xC0C0C0 : 0x808080)
        .setTitle(`🏁 Kết quả ${race.name}`)
        .setDescription(`**${uma.name}** đã kết thúc cuộc đua!\n\n` +
          `Thời tiết: ${weatherEffects[race.weather].emoji} ${weatherEffects[race.weather].description}\n` +
          `📏 **Cự ly:** ${race.distance}m (${race.type})\n` +
          `${positionEmoji} **Vị trí:** ${result.position}/${result.totalRacers}\n` +
          `💰 **Thưởng:** ${result.reward} coins\n` +
          `🎯 **SP kiếm được:** ${Math.floor(result.reward / 10)}\n` +
          `🎭 **Mood:** ${moodEmojis[oldMood]} ${oldMood} → ${moodEmojis[career.mood]} ${career.mood}`)
        .setTimestamp();

      // We already deferred the update, so we just edit the reply
      await interaction.editReply({ embeds: [raceEmbed], components: [] });
      
      setTimeout(async () => {
        try {
            const latestCareer = await UmaCareer.findOne({ userId, isActive: true });
            if (!latestCareer) return;

            if (latestCareer.currentRace >= latestCareer.totalRaces) {
              await endCareer(interaction, latestCareer, uma);
            } else {
              const menuData = await showMainMenu(interaction, latestCareer, uma);
              await interaction.editReply(menuData);
            }
        } catch(e) {
            if (e.code !== 10008) console.error("Error in career_race timeout:", e);
        }
      }, 5000); // Increased timeout to allow for reading the result

    } else if (interaction.customId === 'career_back') {
      const menuData = await showMainMenu(interaction, career, uma);
      await interaction.editReply(menuData);

    } else if (interaction.customId === 'career_end') {
      // Simplified end logic, no more phase checking
      if (career.currentDay < career.totalTrainingDays && career.currentRace < career.totalRaces) {
        await startFinalChallengeRace(interaction, career, uma);
      } else {
        await endCareer(interaction, career, uma);
      }
    }

  } catch (error) {
    console.error('Error in handleCareerInteraction:', error);
    try {
        await interaction.followUp({ content: '❌ Đã xảy ra lỗi!', ephemeral: true });
    } catch(e) {
        if (e.code !== 10008) console.error("Error sending followup after main error:", e);
    }
  }
}

async function handleCareerSkillPurchase(interaction) {
    const userId = interaction.user.id;
    const skillName = interaction.values[0];

    try {
        await interaction.deferUpdate();

        const career = await UmaCareer.findOne({ userId, isActive: true });
        if (!career) {
            return interaction.followUp({ content: '❌ Career không hoạt động.', ephemeral: true });
        }

        const skill = allSkills.find(s => s.name === skillName);
        if (!skill) {
            return interaction.followUp({ content: '❌ Không tìm thấy skill này.', ephemeral: true });
        }

        if ((career.skillPoints || 0) < skill.cost) {
            return interaction.followUp({ content: `❌ Không đủ SP! Cần ${skill.cost}, bạn có ${career.skillPoints || 0}.`, ephemeral: true });
        }

        career.skillPoints -= skill.cost;
        career.skills.push({ name: skill.name, rarity: skill.rarity, cost: skill.cost });
        await career.save();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Mua thành công!')
            .setDescription(`Bạn đã học được kỹ năng: **${skill.name}**\n\nSP còn lại: ${career.skillPoints}`)
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed], components: [] });

        setTimeout(async () => {
            try {
                const menuData = await showSkillsMenu(interaction, career);
                await interaction.editReply(menuData);
            } catch(e) {
                if (e.code !== 10008) console.error("Error in handleCareerSkillPurchase timeout:", e);
            }
        }, 2000);

    } catch (error) {
        console.error('Error purchasing skill:', error);
        await interaction.followUp({ content: '❌ Lỗi khi mua skill.', ephemeral: true });
    }
}

// Export handler functions for interaction handler
module.exports.handleUmaSelection = handleUmaSelection;
module.exports.handleCareerInteraction = handleCareerInteraction;
module.exports.handleCareerSkillPurchase = handleCareerSkillPurchase;
module.exports.createCareerWithSupport = createCareerWithSupport;
