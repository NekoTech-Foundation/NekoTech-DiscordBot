const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Giveaway = require('../../models/Giveaway');

function pickWinners(entrants, count) {
  const pool = [];
  entrants.forEach(e => {
    const tickets = 1 + (e.extraEntries || 0);
    for (let i=0;i<tickets;i++) pool.push(e.entrantId);
  });
  const winners = new Set();
  while (winners.size < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.add(pool.splice(idx,1)[0]);
  }
  return [...winners];
}

async function endGiveaway(client, gw) {
  try {
    const channel = await client.channels.fetch(gw.channelId).catch(()=>null);
    if (!channel) { gw.ended = true; await gw.save(); return; }
    const winners = pickWinners(gw.entrants || [], gw.winnerCount || 1);
    gw.ended = true;
    gw.winners = winners.map(id => ({ winnerId: id }));
    await gw.save();

    const msg = await channel.messages.fetch(gw.messageId).catch(()=>null);
    if (msg) {
      const embed = EmbedBuilder.from(msg.embeds[0] || {})
        .setDescription(`• Phần thưởng: ${gw.prize}\n• Người thắng: ${winners.length>0?winners.map(id=>`<@${id}>`).join(', '):'Không có'}\n• Kết thúc: <t:${Math.floor(gw.endAt/1000)}:R>`);
      await msg.edit({ embeds: [embed], components: [] }).catch(()=>{});
    }

    if (winners.length>0) {
      await channel.send({ content: `🎉 Chúc mừng ${winners.map(id=>`<@${id}>`).join(', ')} đã thắng giveaway: ${gw.prize}!` }).catch(()=>{});
    } else {
      await channel.send({ content: `😔 Không có người thắng cho giveaway: ${gw.prize}.` }).catch(()=>{});
    }
  } catch (e) { console.error('endGiveaway error:', e); }
}

function hasAnyRole(member, roleIds) {
  return roleIds.some(r => member.roles.cache.has(r));
}

module.exports.run = (client) => {
  // Button interactions
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isButton()) return;
      if (interaction.customId !== 'gw-join') return;
      const message = interaction.message;
      const gw = await Giveaway.findOne({ messageId: message.id });
      if (!gw || gw.ended) return interaction.reply({ content: 'Giveaway không khả dụng.', ephemeral: true });

      const member = await interaction.guild.members.fetch(interaction.user.id);
      // bypass
      const bypassRoles = []; // future: add to schema if needed
      if (hasAnyRole(member, bypassRoles)) {
        // allow
      } else {
        if ((gw.requirements?.blacklistRoles||[]).length>0 && hasAnyRole(member, gw.requirements.blacklistRoles)) {
          return interaction.reply({ content: 'Bạn thuộc blacklist của giveaway.', ephemeral: true });
        }
        if ((gw.requirements?.whitelistRoles||[]).length>0 && !hasAnyRole(member, gw.requirements.whitelistRoles)) {
          return interaction.reply({ content: 'Bạn không thoả yêu cầu vai trò để tham gia.', ephemeral: true });
        }
        if (gw.requirements?.minServerJoinDate) {
          const joined = member.joinedAt?.getTime() || 0;
          const min = new Date(gw.requirements.minServerJoinDate).getTime();
          if (joined === 0 || joined > min) {
            return interaction.reply({ content: 'Bạn chưa tham gia server đủ lâu để tham gia giveaway.', ephemeral: true });
          }
        }
      }

      const already = (gw.entrants || []).find(e => e.entrantId === member.id);
      if (already) return interaction.reply({ content: 'Bạn đã tham gia giveaway này.', ephemeral: true });

      // compute multipliers
      let extra = 0;
      (gw.extraEntries||[]).forEach(m => { if (member.roles.cache.has(m.roleId)) extra += (m.entries||0); });
      gw.entrants = gw.entrants || [];
      gw.entrants.push({ entrantId: member.id, entrantUsername: member.user.username, extraEntries: extra });
      gw.entries = (gw.entries||0) + 1 + extra;
      await gw.save();

      return interaction.reply({ content: 'Bạn đã tham gia giveaway!', ephemeral: true });
    } catch (e) {
      console.error('gw-join error:', e);
    }
  });

  // Simple scheduler
  setInterval(async () => {
    try {
      const now = Date.now();
      const list = await Giveaway.find({ ended: false, endAt: { $lte: now } }).limit(20);
      for (const gw of list) {
        await endGiveaway(client, gw);
      }
    } catch (e) { console.error('giveaway scheduler error:', e); }
  }, 10000);
};

