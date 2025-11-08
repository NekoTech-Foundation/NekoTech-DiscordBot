const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const UmaMusume = require('./schemas/UmaMusume');
const allSkills = require('./skills.json').skills;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uma_learn_skill')
    .setDescription('Dạy một kỹ năng mới cho Mã nương.')
    .addStringOption(option =>
      option.setName('uma_id')
        .setDescription('ID của Mã nương (5 ký tự cuối).')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('rarity')
        .setDescription('Độ hiếm của kỹ năng muốn học.')
        .setRequired(true)
        .addChoices(
          { name: 'Common', value: 'Common' },
          { name: 'Rare', value: 'Rare' },
          { name: 'Gold', value: 'Gold' }
        )),
  async execute(interaction) {
    const umaId = interaction.options.getString('uma_id');
    const rarity = interaction.options.getString('rarity');
    const userId = interaction.user.id;

    const targetUma = await UmaMusume.findOne({ _id: { $regex: `${umaId}$` }, ownerId: userId });

    if (!targetUma) {
      return interaction.reply({ content: `Không tìm thấy Mã nương với ID \`#${umaId}\` hoặc bạn không sở hữu nó.`, ephemeral: true });
    }

    const skillsOfRarity = allSkills.filter(skill => skill.rarity === rarity);
    if (skillsOfRarity.length === 0) {
      return interaction.reply({ content: `Không có kỹ năng nào với độ hiếm \`${rarity}\`.`, ephemeral: true });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_skill_to_learn')
      .setPlaceholder('Chọn một kỹ năng để học');

    skillsOfRarity.forEach(skill => {
      selectMenu.addOptions({
        label: skill.name,
        description: `Giá: ${skill.cost} SP - ${skill.description}`,
        value: skill.name,
      });
    });

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const reply = await interaction.reply({
      content: `Chọn một kỹ năng cho **${targetUma.name}**. Bạn có ${targetUma.skillPoints} điểm kỹ năng (SP).`,
      components: [row],
      ephemeral: true
    });

    const filter = i => i.customId === 'select_skill_to_learn' && i.user.id === userId;
    const collector = reply.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      try {
        const selectedSkillName = i.values[0];
        const selectedSkill = allSkills.find(skill => skill.name === selectedSkillName);

        if (!selectedSkill) {
          return i.update({ content: 'Kỹ năng không hợp lệ.', components: [] });
        }

        if (targetUma.skillPoints < selectedSkill.cost) {
          return i.update({ content: `Không đủ điểm kỹ năng. Cần ${selectedSkill.cost} SP, bạn có ${targetUma.skillPoints} SP.`, components: [] });
        }

        if (targetUma.skills.includes(selectedSkill.name)) {
          return i.update({ content: 'Mã nương này đã học kỹ năng này rồi.', components: [] });
        }

        targetUma.skillPoints -= selectedSkill.cost;
        targetUma.skills.push(selectedSkill.name);
        await targetUma.save();

        const successEmbed = new EmbedBuilder()
          .setTitle('✅ Học Kỹ Năng Thành Công!')
          .setDescription(`**${targetUma.name}** đã học được kỹ năng **${selectedSkill.name}**.`)
          .addFields(
            { name: 'Điểm kỹ năng còn lại', value: targetUma.skillPoints.toString() }
          )
          .setColor('Green');

        await i.update({ embeds: [successEmbed], components: [] });
      } catch (error) {
        console.error('Lỗi khi học kỹ năng:', error);
        await i.update({ content: 'Đã có lỗi xảy ra khi đang xử lý. Vui lòng thử lại.', components: [] }).catch(console.error);
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ content: 'Hết thời gian chọn kỹ năng.', components: [] });
      }
    });
  }
};
