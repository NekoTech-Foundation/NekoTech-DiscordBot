const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const Button = require('../../models/Button');
const Form = require('../../models/Form');
const KentaScratch = require('../../utils/kentaScratch');

module.exports = {
   category: 'KentaBuckets',
    data: new SlashCommandBuilder()
        .setName('buttons')
        .setDescription('Manage custom buttons for KentaBuckets')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction, client) {
        // Initial list view
        await interaction.deferReply({ ephemeral: true });
        await this.showButtonManager(interaction);
    },

    async showButtonManager(interaction, page = 1) {
        const buttons = await Button.find({ guildId: interaction.guild.id });
        const itemsPerPage = 8;
        const totalPages = Math.ceil(buttons.length / itemsPerPage) || 1;
        page = Math.max(1, Math.min(page, totalPages));

        const embed = new EmbedBuilder()
            .setTitle('Button Manager')
            .setDescription(`Manage your custom buttons here.\nTotal Buttons: ${buttons.length}`)
            .setColor('#2b2d31')
            .setFooter({ text: `Page ${page}/${totalPages}` });

        const start = (page - 1) * itemsPerPage;
        const currentButtons = buttons.slice(start, start + itemsPerPage);

        currentButtons.forEach(btn => {
            embed.addFields({
                name: `${btn.label} (ID: ${btn.id})`,
                value: `Type: ${btn.type} | Style: ${btn.style}\nContent: ${btn.content || 'None'}`,
                inline: true
            });
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('kb_btn_create')
                    .setLabel('Add Button')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('kb_btn_delete')
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('➖')
            );
        await interaction.editReply({ embeds: [embed], components: [row] });
    }
};
