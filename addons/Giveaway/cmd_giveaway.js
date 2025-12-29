const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ButtonStyle, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const Giveaway = require('../../models/Giveaway');
const GiveawayTemplate = require('../../models/GiveawayTemplate');

function parseDuration(input) {
  if (!input) return 0;
  if (/^\d+$/.test(String(input))) return parseInt(input, 10);
  const regex = /(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i;
  const m = String(input).match(regex);
  if (!m) return 0;
  const [_, d, h, mnt, s] = m;
  return (parseInt(d || 0) * 86400 + parseInt(h || 0) * 3600 + parseInt(mnt || 0) * 60 + parseInt(s || 0));
}

function toMillis(sec) { return sec * 1000; }

function mapButtonStyle(name) {
  const key = String(name || 'Primary').toLowerCase();
  switch (key) {
    case 'primary': return ButtonStyle.Primary;
    case 'secondary': return ButtonStyle.Secondary;
    case 'success': return ButtonStyle.Success;
    case 'danger': return ButtonStyle.Danger;
    default: return ButtonStyle.Primary;
  }
}

function parseRoleList(input) {
  if (!input) return [];
  return input.split('|').map(x => x.trim()).filter(Boolean).map(tok => {
    const m = tok.match(/<@&([0-9]+)>/);
    if (m) return m[1];
    if (/^[0-9]{5,}$/.test(tok)) return tok;
    return tok; // keep as-is; validation later
  }).slice(0, 15);
}

function parseMultipliers(input) {
  if (!input) return [];
  return input.split('|').map(x => x.trim()).filter(Boolean).map(pair => {
    const [role, bonusStr] = pair.split(':');
    const rid = (role.match(/<@&([0-9]+)>/) || [])[1] || (/^[0-9]{5,}$/.test(role) ? role : role);
    const bonus = Math.max(0, parseInt(bonusStr || '0', 10));
    return { roleId: rid, bonus };
  }).slice(0, 10);
}

async function ensureChannel(interaction, channelOpt) {
  const channel = channelOpt || interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error('Channel must be a text channel');
  }
  return channel;
}

async function buildFromTemplate(name) {
  if (!name) return null;
  return await GiveawayTemplate.findOne({ name });
}

async function createGiveawayMessage(channel, data) {
  const embed = new EmbedBuilder()
    .setColor(data.embed?.embedColor || data.embed?.color || '#2ecc71')
    .setTitle(`🎉 Giveaway: ${data.prize}`)
    .setDescription(data.embed?.embedDescription || `• Phần thưởng: ${data.prize}\n• Số người thắng: ${data.winnerCount}\n• Kết thúc: <t:${Math.floor(data.endAt / 1000)}:R>`)
    .setFooter({ text: `ID: ${data.giveawayId || 'pending'}` });
  if (data.embed?.embedImage || data.embed?.image) embed.setImage(data.embed.embedImage || data.embed.image);

  const joinBtn = new ButtonBuilder()
    .setCustomId(`gw-join`)
    .setStyle(mapButtonStyle(data.embed?.buttons?.JoinButtonStyle || data.embed?.button?.style || 'Primary'))
    .setLabel(data.embed?.buttons?.JoinButtonText || data.embed?.button?.label || 'Tham gia');
  const emoji = data.embed?.buttons?.JoinButtonEmoji || data.embed?.button?.emoji || '🎉';
  try { joinBtn.setEmoji(emoji); } catch (_) { }

  const row = new ActionRowBuilder().addComponents(joinBtn);
  const msg = await channel.send({ embeds: [embed], components: [row] });
  return msg;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('🎉 Quản lý hệ thống Giveaway chuyên nghiệp')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sc => sc
      .setName('create')
      .setDescription('✨ Tạo Giveaway mới')
      .addStringOption(o => o.setName('reward').setDescription('🎁 Phần thưởng').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('⏱️ Thời lượng (vd: 10m, 1h)').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('🏆 Số lượng người thắng').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('📢 Kênh tổ chức').addChannelTypes(ChannelType.GuildText))
      .addStringOption(o => o.setName('template').setDescription('📋 Sử dụng mẫu có sẵn'))
      .addStringOption(o => o.setName('requirements').setDescription('role1|role2|... (tối đa 15)'))
      .addStringOption(o => o.setName('blacklists').setDescription('role1|role2|... (tối đa 10)'))
      .addStringOption(o => o.setName('bypasses').setDescription('role1|role2|... (tối đa 15)'))
      .addStringOption(o => o.setName('multipliers').setDescription('role1:bonus|role2:bonus ... (tối đa 10)'))
      .addStringOption(o => o.setName('color').setDescription('#hex hoặc rgb(...)'))
      .addStringOption(o => o.setName('button_color').setDescription('Primary|Secondary|Success|Danger'))
      .addStringOption(o => o.setName('button_emoji').setDescription('Emoji'))
      .addStringOption(o => o.setName('requires_join_before').setDescription('Thời lượng phải tham gia trước (vd 3d, 7d)'))
      .addStringOption(o => o.setName('image').setDescription('URL ảnh'))
    )
    .addSubcommand(sc => sc
      .setName('end')
      .setDescription('🏁 Kết thúc ngay một Giveaway')
      .addStringOption(o => o.setName('giveaway').setDescription('🆔 ID hoặc Message ID của Giveaway').setRequired(true))
    )
    .addSubcommand(sc => sc
      .setName('reroll')
      .setDescription('🎲 Chọn lại người thắng (Reroll)')
      .addStringOption(o => o.setName('giveaway').setDescription('🆔 ID hoặc Message ID của Giveaway').setRequired(true))
    )
    .addSubcommand(sc => sc
      .setName('edit')
      .setDescription('✏️ Chỉnh sửa Giveaway đang chạy')
      .addStringOption(o => o.setName('giveaway').setDescription('ID hoặc messageId').setRequired(true))
      .addStringOption(o => o.setName('reward').setDescription('Phần thưởng mới'))
      .addIntegerOption(o => o.setName('winners').setDescription('Số người thắng'))
      .addStringOption(o => o.setName('extend').setDescription('Tăng thêm thời lượng (vd 10m)'))
      .addStringOption(o => o.setName('color').setDescription('#hex hoặc rgb(...)'))
    )
    .addSubcommandGroup(g => g
      .setName('template')
      .setDescription('📋 Quản lý mẫu Giveaway (Template)')
      .addSubcommand(sc => sc
        .setName('create')
        .setDescription('➕ Tạo mẫu mới')
        .addStringOption(o => o.setName('name').setDescription('Tên template').setRequired(true))
        .addStringOption(o => o.setName('description').setDescription('Mô tả'))
      )
      .addSubcommand(sc => sc
        .setName('edit')
        .setDescription('✏️ Chỉnh sửa mẫu')
        .addStringOption(o => o.setName('template').setDescription('Tên template').setRequired(true))
      )
      .addSubcommand(sc => sc
        .setName('delete')
        .setDescription('🗑️ Xóa mẫu')
        .addStringOption(o => o.setName('template').setDescription('Tên template').setRequired(true))
      )
    )
    .addSubcommand(sc => sc
      .setName('setup')
      .setDescription('⚙️ Cài đặt nâng cao (Menu)')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup(false);

    if (sub === 'create') {
      await interaction.deferReply({ ephemeral: true });
      const prize = interaction.options.getString('reward', true);
      const winners = interaction.options.getInteger('winners', true);
      const durationStr = interaction.options.getString('duration', true);
      const durationSec = parseDuration(durationStr);
      if (!durationSec || durationSec <= 0) return interaction.editReply('Thời lượng không hợp lệ.');
      const endAt = Date.now() + toMillis(durationSec);
      const channel = await ensureChannel(interaction, interaction.options.getChannel('channel'));
      const templateName = interaction.options.getString('template');
      const template = await buildFromTemplate(templateName);

      const reqs = parseRoleList(interaction.options.getString('requirements'));
      const bl = parseRoleList(interaction.options.getString('blacklists')).slice(0, 10);
      const by = parseRoleList(interaction.options.getString('bypasses'));
      const multipliers = parseMultipliers(interaction.options.getString('multipliers'));
      const requiresJoinBeforeSec = parseDuration(interaction.options.getString('requires_join_before')) || 0;
      const color = interaction.options.getString('color') || template?.embed?.color || '#2ecc71';
      const buttonColor = interaction.options.getString('button_color') || template?.embed?.button?.style;
      const buttonEmoji = interaction.options.getString('button_emoji') || template?.embed?.button?.emoji;
      const image = interaction.options.getString('image') || template?.embed?.image;

      const doc = await Giveaway.create({
        messageId: 'pending',
        channelId: channel.id,
        giveawayId: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
        guildId: interaction.guild.id,
        startAt: Date.now(),
        endAt,
        ended: false,
        winnerCount: winners,
        prize,
        entries: 0,
        messageWinner: true,
        notifyEntrantOnEnter: false,
        requirements: {
          whitelistRoles: reqs,
          blacklistRoles: bl,
          minServerJoinDate: requiresJoinBeforeSec ? new Date(Date.now() - toMillis(requiresJoinBeforeSec)) : null,
        },
        embed: {
          embedColor: color,
          embedImage: image,
          buttons: {
            joinButton: {
              JoinButtonStyle: buttonColor || 'Primary',
              JoinButtonEmoji: buttonEmoji || '🎉',
              JoinButtonText: 'Tham gia',
            },
          },
        },
        extraEntries: multipliers.map(m => ({ roleId: m.roleId, entries: m.bonus })),
        hostedBy: interaction.user.id,
      });

      const msg = await createGiveawayMessage(channel, doc);
      doc.messageId = msg.id;
      await doc.save();

      return interaction.editReply(`Đã tạo giveaway tại ${channel} • ID: ${doc.giveawayId}`);
    }

    if (sub === 'end') {
      await interaction.deferReply({ ephemeral: true });
      const id = interaction.options.getString('giveaway', true);
      const gw = await Giveaway.findOne({ $or: [{ giveawayId: id }, { messageId: id }], guildId: interaction.guild.id });
      if (!gw) return interaction.editReply('Không tìm thấy giveaway.');
      if (gw.ended) return interaction.editReply('Giveaway đã kết thúc.');
      gw.endAt = Date.now();
      await gw.save();
      return interaction.editReply('Đã đánh dấu kết thúc. Hệ thống sẽ xử lý và công bố kết quả ngay.');
    }

    if (sub === 'reroll') {
      await interaction.deferReply({ ephemeral: true });
      const id = interaction.options.getString('giveaway', true);
      const gw = await Giveaway.findOne({ $or: [{ giveawayId: id }, { messageId: id }], guildId: interaction.guild.id });
      if (!gw) return interaction.editReply('Không tìm thấy giveaway.');
      if (!gw.ended) return interaction.editReply('Giveaway chưa kết thúc.');
      gw.winners = [];
      await gw.save();
      return interaction.editReply('Đã reset người thắng. Hệ thống sẽ reroll và cập nhật.');
    }

    if (sub === 'edit') {
      await interaction.deferReply({ ephemeral: true });
      const id = interaction.options.getString('giveaway', true);
      const gw = await Giveaway.findOne({ $or: [{ giveawayId: id }, { messageId: id }], guildId: interaction.guild.id });
      if (!gw) return interaction.editReply('Không tìm thấy giveaway.');
      if (gw.ended) return interaction.editReply('Giveaway đã kết thúc.');
      const prize = interaction.options.getString('reward');
      const winners = interaction.options.getInteger('winners');
      const extend = interaction.options.getString('extend');
      const color = interaction.options.getString('color');
      if (prize) gw.prize = prize;
      if (winners) gw.winnerCount = winners;
      if (extend) gw.endAt += toMillis(parseDuration(extend));
      if (color) gw.embed = { ...(gw.embed || {}), embedColor: color };
      await gw.save();
      return interaction.editReply('Đã cập nhật giveaway.');
    }

    if (group === 'template') {
      if (sub === 'create') {
        await interaction.deferReply({ ephemeral: true });
        const name = interaction.options.getString('name', true);
        const description = interaction.options.getString('description') || '';
        const t = await GiveawayTemplate.create({ name, description });
        return interaction.editReply(`Đã tạo template: ${name}`);
      }
      if (sub === 'edit') {
        return interaction.reply({ content: 'Trình chỉnh sửa template nâng cao sẽ được bổ sung.', ephemeral: true });
      }
      if (sub === 'delete') {
        await interaction.deferReply({ ephemeral: true });
        const name = interaction.options.getString('template', true);
        const r = await GiveawayTemplate.deleteOne({ name });
        if (r.deletedCount === 0) return interaction.editReply('Không tìm thấy template.');
        return interaction.editReply(`Đã xoá template: ${name}`);
      }
    }

    if (sub === 'setup') {
      return interaction.reply({ content: 'Menu setup nâng cao sẽ được bổ sung sớm. Tạm thời dùng /giveaway create.', ephemeral: true });
    }
  }
};

