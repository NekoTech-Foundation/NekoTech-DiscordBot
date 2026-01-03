const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');
const Layout = require('../../models/Layout');

module.exports = {
    category: 'KentaBuckets',
    data: new SlashCommandBuilder()
        .setName('layout')
        .setDescription('Manage layouts for KentaBuckets')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('create')
               .setDescription('Create a new layout')
               .addStringOption(option => 
                    option.setName('name')
                          .setDescription('The name of the layout')
                          .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('delete')
               .setDescription('Delete a layout')
               .addStringOption(option => 
                    option.setName('name')
                          .setDescription('The name of the layout')
                          .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('edit')
               .setDescription('Edit a layout (Open Editor)')
               .addStringOption(option => 
                    option.setName('name')
                          .setDescription('The name of the layout')
                          .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('list')
               .setDescription('List all layouts')),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const name = interaction.options.getString('name');

        // Defer immediately to prevent timeout
        await interaction.deferReply({ ephemeral: true });

        switch (subcommand) {
            case 'create':
                await this.createLayout(interaction, name);
                break;
            case 'delete':
                await this.deleteLayout(interaction, name);
                break;
            case 'edit':
                await this.editLayout(interaction, name);
                break;
            case 'list':
                await this.listLayouts(interaction);
                break;
        }
    },

    async createLayout(interaction, name) {
        // Validate name (alphanumeric, underscore)
        if (!/^[a-z0-9_]+$/.test(name)) {
            return interaction.editReply({ content: 'Layout name must only contain lowercase letters, numbers, and underscores.' });
        }

        const existing = await Layout.findOne({ guildId: interaction.guild.id, name });
        if (existing) {
             return interaction.editReply({ content: `Layout \`${name}\` already exists.` });
        }

        await Layout.create({
            guildId: interaction.guild.id,
            name: name
        });

        return interaction.editReply({ content: `✅ Layout \`${name}\` created successfully. Use \`/layout edit name:${name}\` to add content.` });
    },

    async deleteLayout(interaction, name) {
        const deleted = await Layout.deleteOne({ guildId: interaction.guild.id, name });
        if (deleted.deletedCount === 0) {
             return interaction.editReply({ content: `Layout \`${name}\` not found.` });
        }
        return interaction.editReply({ content: `✅ Layout \`${name}\` deleted successfully.` });
    },

    async listLayouts(interaction, page = 1) {
        const layouts = await Layout.find({ guildId: interaction.guild.id });
        
        if (layouts.length === 0) {
            return interaction.editReply({ content: 'No layouts found. Create one with `/layout create`.' });
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(layouts.length / itemsPerPage);
        page = Math.max(1, Math.min(page, totalPages));
        
        const embed = new EmbedBuilder()
            .setTitle('Server Layouts')
            .setColor('#2b2d31')
            .setFooter({ text: `Page ${page}/${totalPages}` });
            
        const start = (page - 1) * itemsPerPage;
        const currentLayouts = layouts.slice(start, start + itemsPerPage);
        
        embed.setDescription(currentLayouts.map(l => `• \`${l.name}\``).join('\n'));
        
        return interaction.editReply({ embeds: [embed] });
    },

    async editLayout(interaction, name) {
        const layout = await Layout.findOne({ guildId: interaction.guild.id, name });
        if (!layout) {
             return interaction.editReply({ content: `Layout \`${name}\` not found.` });
        }
        
        const editor = require('../../utils/layoutEditor');
        await editor.startEditor(interaction, name);
    }
};
