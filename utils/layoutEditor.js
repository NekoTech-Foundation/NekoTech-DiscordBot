const {
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const Layout = require('../models/Layout');
const Button = require('../models/Button');
const Select = require('../models/Select');

class LayoutEditor {
    async startEditor(interaction, layoutName) {
        const layout = await Layout.findOne({ guildId: interaction.guild.id, name: layoutName });
        if (!layout) {
            return interaction.reply({ content: 'Layout not found.', ephemeral: true });
        }

        const embed = await this.buildEditorEmbed(layout);
        const components = this.buildEditorComponents(layoutName);

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: null, embeds: [embed], components: components });
        } else {
            await interaction.reply({ embeds: [embed], components: components, ephemeral: true });
        }
    }

    async buildEditorEmbed(layout) {
        let components = [];
        try {
            components = JSON.parse(layout.json_data || '[]');
        } catch (e) {
            components = [];
        }

        const embed = new EmbedBuilder()
            .setTitle(`Layout Editor: ${layout.name}`)
            .setDescription(components.length === 0 ? 'No components yet. Click "Add Component" to start.' : 'Current Structure:')
            .setColor('#5865F2');

        components.forEach((comp, index) => {
            let desc = `Type: ${comp.type}`;
            if (comp.content) desc += ` | Content: ${comp.content.substring(0, 30)}...`;
            embed.addFields({ name: `Row ${index + 1}`, value: desc, inline: false });
        });

        return embed;
    }

    buildEditorComponents(layoutName) {
        const row1 = new ActionRowBuilder().addComponents(
             new ButtonBuilder().setCustomId(`kb_le_add_${layoutName}`).setLabel('Add Component').setStyle(ButtonStyle.Success).setEmoji('➕'),
             new ButtonBuilder().setCustomId(`kb_le_edit_${layoutName}`).setLabel('Edit/Remove').setStyle(ButtonStyle.Primary).setEmoji('✏️'),
             new ButtonBuilder().setCustomId(`kb_le_preview_${layoutName}`).setLabel('Preview').setStyle(ButtonStyle.Secondary).setEmoji('👁️')
        );
        return [row1];
    }

    async handleInteraction(interaction) {
        const customId = interaction.customId;
        const parts = customId.split('_');
        const action = parts[2]; // add, edit, preview, type
        const layoutName = parts.slice(3).join('_'); // Rejoin name if it has underscores but wait, name is user input, better be careful.
        // Actually, name is everything after the action. 
        // customId format: kb_le_<action>_<layoutName>
        // But what if layoutName has underscores? 
        // Let's use a simpler strategy or fetch layout name from a database state if we had one.
        // For now, we assume standard parsing works or we fix the splitting.
        
        // Better parsing:
        const prefix = `kb_le_${action}_`;
        const realLayoutName = customId.substring(prefix.length);

        if (action === 'add') {
            // Show component type selection
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`kb_le_selecttype_${realLayoutName}`)
                    .setPlaceholder('Select Component Type')
                    .addOptions([
                        { label: 'Text Display', value: 'text', description: 'Rich text content' },
                        { label: 'Button', value: 'button', description: 'Interactive button' },
                        { label: 'Select Menu', value: 'select', description: 'Dropdown menu' },
                        { label: 'Separator', value: 'separator', description: 'Visual divider' },
                        { label: 'Section', value: 'section', description: 'Content with accessory' },
                        { label: 'Media Gallery', value: 'gallery', description: 'Images/Videos' },
                        { label: 'Container', value: 'container', description: 'Grouped content' }
                    ])
            );
            await interaction.reply({ content: 'Choose component type to add:', components: [row], ephemeral: true });
        }
        else if (action === 'selecttype') {
            const type = interaction.values[0];
            // realLayoutName is actually in the ID `kb_le_selecttype_<name>`
            // Wait, standard handleInteraction might call this with select menu too.
            // Let's implement specific adding logic.
            
            await this.promptAddComponent(interaction, realLayoutName, type);
        }
        // ... more handlers
    }

    async promptAddComponent(interaction, layoutName, type) {
        const modal = new ModalBuilder()
            .setCustomId(`kb_le_savecomp_${type}_${layoutName}`)
            .setTitle(`Add ${type}`);

        if (type === 'text') {
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('content').setLabel('Text Content').setStyle(TextInputStyle.Paragraph).setRequired(true)
            ));
        } else if (type === 'button') {
            modal.addComponents(new ActionRowBuilder().addComponents(
                 new TextInputBuilder().setCustomId('content').setLabel('Button ID(s) (comma separated)').setStyle(TextInputStyle.Short).setRequired(true)
            ));
        }
        // ... Type specific modals
        else {
             modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('content').setLabel('Configuration').setStyle(TextInputStyle.Paragraph).setRequired(true)
            ));
        }

        await interaction.showModal(modal);
    }

    async saveComponent(interaction, layoutName, type, content) {
        const layout = await Layout.findOne({ guildId: interaction.guild.id, name: layoutName });
        if (!layout) return interaction.reply({ content: 'Layout not found.', ephemeral: true });

        let components = JSON.parse(layout.json_data || '[]');
        
        let newComp = { type, content };
        // Validate or process content based on type if needed
        
        components.push(newComp);
        
        layout.json_data = JSON.stringify(components);
        await layout.save();

        await interaction.reply({ content: `Added ${type} to layout.`, ephemeral: true });
        
        // Refresh editor? interaction.message is the "Choose component type" message usually
        // We can't easily refresh the Main Editor message from here without finding it.
        // User has to click buttons on the main editor again or we send a new one.
        // For better UX, we might chain `this.startEditor` again locally?
    }
}

module.exports = new LayoutEditor();
