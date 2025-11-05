const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const UmaPlayer = require('./schemas/UmaPlayer');
const UmaMusume = require('./schemas/UmaMusume');
const umaSkills = require('./umaSkills');

function getRandomSkills() {
  const skills = [];
  const allSkills = [...umaSkills.common, ...umaSkills.rare, ...umaSkills.gold];
  for (let i = 0; i < 3; i++) {
    skills.push(allSkills[Math.floor(Math.random() * allSkills.length)]);
  }
  return skills;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uma_learn_skill')
    .setDescription('Learn a new skill for your Uma Musume.')
    .addStringOption(option => option.setName('id').setDescription('The ID of the Uma Musume.').setRequired(true)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const umaId = interaction.options.getString('id');

    const targetUma = await UmaMusume.findOne({ ownerId: userId, _id: { $regex: new RegExp(umaId + '$', 'i') } });

    if (!targetUma) {
      return interaction.reply({ content: 'Uma Musume not found or does not belong to you. Please use the last 5 characters of the ID.', ephemeral: true });
    }

    const randomSkills = getRandomSkills();

    const row = new ActionRowBuilder();
    const skillEmbed = new EmbedBuilder()
      .setTitle(`Learn a skill for ${targetUma.name}`)
      .setDescription(`You have ${targetUma.skillPoints} SP.`)
      .setColor('Blue');

    randomSkills.forEach((skill, index) => {
      skillEmbed.addFields({ name: `${skill.name} (${skill.cost} SP)`, value: skill.description });
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`learn_skill_${index}`)
          .setLabel(skill.name)
          .setStyle(ButtonStyle.Primary)
      );
    });

    const message = await interaction.reply({ embeds: [skillEmbed], components: [row], ephemeral: true });

    const filter = i => i.user.id === userId && i.customId.startsWith('learn_skill_');
    const collector = message.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      const skillIndex = parseInt(i.customId.split('_')[2]);
      const selectedSkill = randomSkills[skillIndex];

      if (targetUma.skillPoints < selectedSkill.cost) {
        return i.update({ content: `You don't have enough SP to learn ${selectedSkill.name}.`, embeds: [], components: [] });
      }

      targetUma.skillPoints -= selectedSkill.cost;
      targetUma.skills.push(selectedSkill.name);
      await targetUma.save();

      await i.update({ content: `You have learned ${selectedSkill.name}!`, embeds: [], components: [] });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ content: 'You did not select a skill in time.', embeds: [], components: [] });
      }
    });
  }
};