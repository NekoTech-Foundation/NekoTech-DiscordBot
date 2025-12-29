const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const marrySchema = require('../../../models/marrySchema.js');
const BanSchema = require('../../../models/BanSchema');

// Cooldown collection
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('relationship')
    .setDescription('Quản lý mối quan hệ hôn nhân')
    .addSubcommand(sub => 
        sub.setName('marry')
           .setDescription('Cầu hôn người ấy (Bên nhau trọn đời...)')
           .addUserOption(opt => opt.setName('user').setDescription('Người bạn muốn cưới').setRequired(true))
    )
    .addSubcommand(sub => 
        sub.setName('divorce')
           .setDescription('Ly hôn (Đường Ai Nấy Đi...)')
    )
    .addSubcommand(sub => 
        sub.setName('promise')
           .setDescription('Thề non hẹn biển... (Thay đổi lời hứa)')
           .addStringOption(opt => opt.setName('loi_hua').setDescription('Lời hứa của bạn').setRequired(true))
    )
    .addSubcommand(sub => 
        sub.setName('together')
           .setDescription('Tương tác tình cảm (Tình cảm nồng đậm...)')
    ),

  async execute(interaction) {
    const { client } = interaction;
    const subcommand = interaction.options.getSubcommand();
    
    // Check ban
    const ban = await BanSchema.findOne({ memberid: interaction.user.id });
    if (ban) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ Bị Cấm').setDescription('Bạn đã bị cấm sử dụng lệnh này.')], ephemeral: true });
    }

    if (subcommand === 'marry') {
        const cooldownAmount = 60000;
        if (checkCooldown(interaction, cooldownAmount)) return;
        setCooldown(interaction, cooldownAmount);
        await handleMarry(interaction);

    } else if (subcommand === 'divorce') {
        const cooldownAmount = 120000;
        if (checkCooldown(interaction, cooldownAmount)) return;
        setCooldown(interaction, cooldownAmount);
        await handleDivorce(interaction, client);

    } else if (subcommand === 'promise') {
        const cooldownAmount = 3600000;
        if (checkCooldown(interaction, cooldownAmount, true)) return;
        setCooldown(interaction, cooldownAmount);
        await handlePromise(interaction);

    } else if (subcommand === 'together') {
        const cooldownAmount = 30000;
        if (checkCooldown(interaction, cooldownAmount)) return;
        setCooldown(interaction, cooldownAmount);
        await handleTogether(interaction);
    }
  }
};

// --- Helper Functions ---
function checkCooldown(interaction, duration, isMinute = false) {
    if (cooldowns.has(interaction.user.id)) {
        const expirationTime = cooldowns.get(interaction.user.id) + duration;
        if (Date.now() < expirationTime) {
            const timeLeft = Math.round((expirationTime - Date.now()) / (isMinute ? 60000 : 1000));
            const unit = isMinute ? 'phút' : 'giây';
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⏰ Chờ Chút Nhé!')
                .setDescription(`Vui lòng chờ **${timeLeft}** ${unit} nữa.`)
                .setTimestamp();
            interaction.reply({ embeds: [embed], ephemeral: true });
            return true;
        }
    }
    return false;
}

function setCooldown(interaction, duration) {
    cooldowns.set(interaction.user.id, Date.now());
    setTimeout(() => cooldowns.delete(interaction.user.id), duration);
}

// --- Handlers ---
async function handleMarry(interaction) {
    const husband = interaction.user;
    const wife = interaction.options.getUser('user');

    if (wife.id === husband.id) return interaction.reply({ content: 'Không thể tự cưới chính mình!', ephemeral: true });
    if (wife.bot) return interaction.reply({ content: 'Không thể cưới bot!', ephemeral: true });

    const data = await marrySchema.findOne({ authorid: husband.id });
    const lovedata = await marrySchema.findOne({ authorid: wife.id });

    if (data || lovedata) {
        if (data && data.wifeid !== wife.id) return interaction.reply({ content: 'Bạn đã có vợ/chồng rồi!', ephemeral: true });
        if (lovedata && lovedata.wifeid !== husband.id) return interaction.reply({ content: 'Người ấy đã có vợ/chồng rồi!', ephemeral: true });
        if (data && data.wifeid === wife.id) return interaction.reply({ content: 'Hai bạn đã kết hôn rồi!', ephemeral: true });
    }

    const proposalEmbed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('💍 Lời Cầu Hôn')
        .setDescription(`**${husband.username}** đang quỳ gối cầu hôn **${wife.username}**!`)
        .addFields({ name: 'Câu hỏi', value: `${wife.username}, chấp nhận không?` })
        .setFooter({ text: 'Có 30 giây để trả lời...' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('yes').setLabel('Đồng ý').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId('no').setLabel('Từ chối').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );

    const msg = await interaction.reply({ content: `<@${wife.id}>`, embeds: [proposalEmbed], components: [row], fetchReply: true });
    
    const filter = i => ['yes', 'no'].includes(i.customId) && i.user.id === wife.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async i => {
        if (i.customId === 'yes') {
            await marrySchema.create({ authorid: husband.id, wifeid: wife.id, husbandid: wife.id, together: 1, loihua: 'Yêu nhau suốt kiếp' });
            await marrySchema.create({ authorid: wife.id, wifeid: husband.id, husbandid: husband.id, together: 1, loihua: 'Đầu bạc răng long' });
            await i.update({ embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('🎉 Chúc Mừng!').setDescription(`**${husband.username}** ❤️ **${wife.username}**`).addFields({ name: 'Trạng thái', value: 'Đã kết hôn' })], components: [] });
        } else {
            await i.update({ embeds: [new EmbedBuilder().setColor('#808080').setTitle('💔 Bị Từ Chối').setDescription(`${wife.username} đã từ chối.`)], components: [] });
        }
    });
    
    collector.on('end', c => { if (c.size === 0) msg.edit({ components: [] }); });
}

async function handleDivorce(interaction, client) {
    const authorId = interaction.user.id;
    const data = await marrySchema.findOne({ authorid: authorId });

    if (!data) return interaction.reply({ content: 'Bạn chưa kết hôn!', ephemeral: true });

    const wifeId = data.wifeid;
    const together = data.together || 0;

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('💔 Quyết Định Ly Hôn')
        .setDescription('Bạn có chắc chắn muốn ly hôn? Mọi dữ liệu sẽ bị xóa.')
        .addFields({ name: 'Điểm thân mật', value: `${together}`});
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('divorce_yes').setLabel('Ly Hôn').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('divorce_no').setLabel('Suy Nghĩ Lại').setStyle(ButtonStyle.Success)
    );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    
    const filter = i => ['divorce_yes', 'divorce_no'].includes(i.customId) && i.user.id === authorId;
    const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async i => {
        if (i.customId === 'divorce_yes') {
             try {
                const anhcuoi = require('../../../models/anhcuoi');
                await anhcuoi.deleteMany({ $or: [{ authorid: authorId }, { authorid: wifeId }] });
              } catch (e) {}
              await marrySchema.deleteMany({ $or: [{ authorid: authorId }, { authorid: wifeId }] });
              await i.update({ embeds: [new EmbedBuilder().setColor('#000000').setTitle('💔 Đã Ly Hôn').setDescription('Đường ai nấy đi...')], components: [] });
        } else {
            await i.update({ embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('💚 Vẫn Còn Yêu').setDescription('Quyết định đúng đắn!')], components: [] });
        }
    });

    collector.on('end', c => { if (c.size === 0) msg.edit({ components: [] }); });
}

async function handlePromise(interaction) {
    const husband = interaction.user;
    const data = await marrySchema.findOne({ authorid: husband.id });
    if (!data) return interaction.reply({ content: 'Cưới đi rồi hứa!', ephemeral: true });

    const newPromise = interaction.options.getString('loi_hua');
    if (newPromise.length > 100) return interaction.reply({ content: 'Lời hứa quá dài (>100 ký tự)!', ephemeral: true });

    data.loihua = newPromise;
    await data.save();

    const wife = await interaction.client.users.fetch(data.wifeid);
    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('💍 Lời Hứa Mới')
        .setDescription(`**${husband.username}** gửi tới **${wife.username}**: "${newPromise}"`);
    interaction.reply({ embeds: [embed] });
}

async function handleTogether(interaction) {
    const husband = interaction.user;
    const data = await marrySchema.findOne({ authorid: husband.id });
    if (!data) return interaction.reply({ content: 'Chưa có người yêu thì tương tác với ai?', ephemeral: true });

    const wifeId = data.wifeid;
    const lovedata = await marrySchema.findOne({ authorid: wifeId });
    if (!lovedata) return interaction.reply({ content: 'Lỗi dữ liệu đối phương.', ephemeral: true });

    data.together = (data.together || 0) + 1;
    lovedata.together = (lovedata.together || 0) + 1;
    await data.save();
    await lovedata.save();

    const newAffection = data.together;
    let level = '🤍 Mới Quen';
    if (newAffection >= 500) level = '💖 Linh Hồn Song Sinh';
    else if (newAffection >= 300) level = '💗 Yêu Đắm Say';
    else if (newAffection >= 150) level = '💕 Tình Cảm Sâu Đậm';
    else if (newAffection >= 50) level = '💓 Đang Yêu';
    else if (newAffection >= 10) level = '💗 Thích Nhau';

    const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('💝 Tình Cảm Thăng Hoa!')
        .setDescription(`**${husband.username}** đã thể hiện tình cảm với **<@${wifeId}>**!`)
        .addFields({ name: 'Điểm Thân Mật', value: `${newAffection}`, inline: true }, { name: 'Cấp Độ', value: level, inline: true });
    interaction.reply({ embeds: [embed] });
}
