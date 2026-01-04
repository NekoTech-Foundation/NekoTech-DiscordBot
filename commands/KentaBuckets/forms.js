const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');
const Form = require('../../models/Form');

module.exports = {
   category: 'KentaBuckets',
    data: new SlashCommandBuilder()
        .setName('forms')
        .setDescription('Manage custom forms (modals) for KentaBuckets')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('manage')
                .setDescription('Open the Form Manager UI')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Send a "Open Form" button to a channel')
                .addStringOption(option => 
                    option.setName('form_id')
                        .setDescription('The ID of the form to send')
                        .setAutocomplete(true) // We will need to implement autocomplete if possible, or just text for now
                        .setRequired(true))
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('Channel to send the button to')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('label')
                        .setDescription('Label for the button')
                        .setRequired(false))
                .addStringOption(option => 
                    option.setName('content')
                        .setDescription('Message content above the button')
                        .setRequired(false))
        ),
    
    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        
        // Optimisation: Select only 'id' to reduce payload and speed up query
        const forms = await Form.find({ guildId: interaction.guild.id });
        
        const filtered = forms.filter(form => form.id.startsWith(focusedValue));
        
        // Handle race condition/timeout by catching error if interaction expired
        try {
            await interaction.respond(
                filtered.slice(0, 25).map(form => ({ name: form.id, value: form.id }))
            );
        } catch (e) {
            if (e.code !== 10062) console.error('Autocomplete Error:', e);
        }
    },

    async execute(interaction, client) {
        // Defer reply immediately for all subcommands
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'manage') {
            await this.showFormManager(interaction);
        } else if (subcommand === 'send') {
            await this.sendFormButton(interaction);
        }
    },

    async sendFormButton(interaction) {
        const formId = interaction.options.getString('form_id');
        const channel = interaction.options.getChannel('channel');
        const label = interaction.options.getString('label') || 'Open Form';
        const content = interaction.options.getString('content') || `Click below to open the form: **${formId}**`;

        const form = await Form.findOne({ guildId: interaction.guild.id, id: formId });
        if (!form) {
            return interaction.editReply({ content: `❌ Form \`${formId}\` not found.` });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`kb_open_form_${form.id}`)
                    .setLabel(label)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝')
            );

        try {
            await channel.send({ content: content, components: [row] });
            await interaction.editReply({ content: `✅ Form button sent to ${channel}.` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ Failed to send message to ${channel}. Check permissions.` });
        }
    },

    async showFormManager(interaction, page = 1) {
        const forms = await Form.find({ guildId: interaction.guild.id });
        const itemsPerPage = 8;
        const totalPages = Math.ceil(forms.length / itemsPerPage) || 1;
        page = Math.max(1, Math.min(page, totalPages));

        const embed = new EmbedBuilder()
            .setTitle('Form Manager')
            .setDescription(`Manage your custom forms here.\nTotal Forms: ${forms.length}`)
            .setColor('#2b2d31')
            .setFooter({ text: `Page ${page}/${totalPages}` });

        const start = (page - 1) * itemsPerPage;
        const currentForms = forms.slice(start, start + itemsPerPage);

        currentForms.forEach(form => {
            let questionsCount = 0;
            try {
                questionsCount = JSON.parse(form.questions).length;
            } catch (e) {}

            embed.addFields({
                name: `${form.title} (ID: ${form.id})`,
                value: `Questions: ${questionsCount}\nLog Channel: ${form.log_channel ? `<#${form.log_channel}>` : 'None'}`,
                inline: true
            });
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('kb_form_create')
                    .setLabel('Add Form')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                 new ButtonBuilder()
                    .setCustomId('kb_form_delete')
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('➖'),
                 new ButtonBuilder()
                    .setCustomId('kb_form_edit')
                    .setLabel('Edit Questions')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✏️')
            );
        await interaction.editReply({ embeds: [embed], components: [row] });
    }
};
