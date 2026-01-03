const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');
const Select = require('../../models/Select');

module.exports = {
    category: 'KentaBuckets',
    data: new SlashCommandBuilder()
        .setName('selects')
        .setDescription('Manage custom select menus for KentaBuckets')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        await this.showSelectManager(interaction);
    },

    async showSelectManager(interaction, page = 1) {
        const selects = await Select.find({ guildId: interaction.guild.id });
        const itemsPerPage = 8;
        const totalPages = Math.ceil(selects.length / itemsPerPage) || 1;
        page = Math.max(1, Math.min(page, totalPages));

        const embed = new EmbedBuilder()
            .setTitle('Select Menu Manager')
            .setDescription(`Manage your custom select menus here.\nTotal Selects: ${selects.length}`)
            .setColor('#2b2d31')
            .setFooter({ text: `Page ${page}/${totalPages}` });

        const start = (page - 1) * itemsPerPage;
        const currentSelects = selects.slice(start, start + itemsPerPage);

        currentSelects.forEach(sel => {
            let optionsCount = 0;
            try {
                optionsCount = JSON.parse(sel.options).length;
            } catch (e) {}

            embed.addFields({
                name: `${sel.id}`,
                value: `Placeholder: ${sel.placeholder}\nOptions: ${optionsCount}`,
                inline: true
            });
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('kb_sel_create')
                    .setLabel('Create Select')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                 new ButtonBuilder()
                    .setCustomId('kb_sel_delete')
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
            );
        await interaction.editReply({ embeds: [embed], components: [row] });
    }
};
