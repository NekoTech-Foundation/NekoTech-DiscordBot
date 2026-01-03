const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const Button = require('../models/Button');
const Select = require('../models/Select');
const Form = require('../models/Form');
const Layout = require('../models/Layout');

const buttonsCommand = require('../commands/KentaBuckets/buttons');
const selectsCommand = require('../commands/KentaBuckets/selects');
const formsCommand = require('../commands/KentaBuckets/forms');
// const layoutCommand = require('../commands/KentaBuckets/layout'); 

class KentaInteractionManager {
    async handleInteraction(interaction, client) {
        if (interaction.customId.startsWith('kb_le_')) {
            const editor = require('./layoutEditor');
            if (interaction.isStringSelectMenu() && interaction.customId.includes('_selecttype_')) {
                    const name = interaction.customId.replace('kb_le_selecttype_', '');
                    await editor.promptAddComponent(interaction, name, interaction.values[0]);
                    return;
            }
            if (interaction.isModalSubmit() && interaction.customId.includes('_savecomp_')) {
                    const parts = interaction.customId.split('_');
                    const type = parts[3];
                    const name = parts.slice(4).join('_');
                    const content = interaction.fields.getTextInputValue('content');
                    await editor.saveComponent(interaction, name, type, content);
                    return;
            }
            
            await editor.handleInteraction(interaction);
            return;
        }

        if (interaction.isButton()) {
            await this.handleButton(interaction, client);
        } else if (interaction.isModalSubmit()) {
            await this.handleModal(interaction, client);
        } else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'kb_sel_select_to_edit') {
                 // Handle selection of "Which select to edit"
                 // Shows the Detail Manager View
                 await interaction.deferReply({ ephemeral: true });
                 const selId = interaction.values[0];
                 const sel = await Select.findOne({ guildId: interaction.guild.id, id: selId });
                 if (!sel) return interaction.editReply('Select not found.');
    
                 let opts = [];
                 try { opts = JSON.parse(sel.options); } catch(e) {}
    
                 const embed = new EmbedBuilder()
                    .setTitle(`Managing: ${sel.id}`)
                    .setDescription(`Placeholder: \`${sel.placeholder}\`\nOptions: ${opts.length}/25`)
                    .setColor('#0099ff');
                 
                 if (opts.length > 0) {
                     const optsList = opts.map((o, i) => `${i+1}. **${o.label}** (${o.value}) ${o.emoji ? o.emoji : ''}`).join('\n');
                     embed.addFields({ name: 'Current Options', value: optsList.substring(0, 1024) });
                 } else {
                     embed.addFields({ name: 'Current Options', value: '(None)' });
                 }
    
                 const row1 = new ActionRowBuilder().addComponents(
                     new ButtonBuilder().setCustomId(`kb_sel_add_opt_${sel.id}`).setLabel('Add Option').setStyle(ButtonStyle.Success).setEmoji('➕'),
                     new ButtonBuilder().setCustomId(`kb_sel_edit_ph_${sel.id}`).setLabel('Edit Placeholder').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
                     new ButtonBuilder().setCustomId(`kb_sel_del_opt_menu_${sel.id}`).setLabel('Delete Option').setStyle(ButtonStyle.Primary).setEmoji('🗑️'), // Opens menu to delete
                     new ButtonBuilder().setCustomId(`kb_sel_delete_direct_${sel.id}`).setLabel('Delete Menu').setStyle(ButtonStyle.Danger).setEmoji('❌')
                 );
    
                 await interaction.editReply({ embeds: [embed], components: [row1] });
                 return;
            }
            await this.handleSelect(interaction, client);
        }
    }

    async handleButton(interaction, client) {
        const customId = interaction.customId;

        // --- User Component: kenta_btn_ ---
        if (customId.startsWith('kenta_btn_')) {
             const btnId = customId.replace('kenta_btn_', '');
             const btn = await Button.findOne({ guildId: interaction.guild.id, id: btnId });
             if (!btn) {
                 return interaction.reply({ content: 'Button configuration not found.', ephemeral: true });
             }

             if (btn.type === 'response') {
                 // Reply with content
                 const KentaScratch = require('./kentaScratch');
                 try {
                     const parsed = await KentaScratch.parse(btn.content, { user: interaction.user, guild: interaction.guild, channel: interaction.channel, member: interaction.member });
                     if (interaction.deferred || interaction.replied) {
                        await interaction.followUp({ content: parsed.content || null, components: parsed.components, embeds: parsed.embeds, ephemeral: false });
                     } else {
                        await interaction.reply({ content: parsed.content || null, components: parsed.components, embeds: parsed.embeds, ephemeral: false });
                     }
                 } catch (e) {
                     console.error(e);
                     await interaction.reply({ content: 'Error executing button action.', ephemeral: true });
                 }
             }
             return;
        }

        // --- Manager: Buttons ---
        if (customId === 'kb_btn_create') {
            const modal = new ModalBuilder()
                .setCustomId('kb_modal_btn_create')
                .setTitle('Create New Button');

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id').setLabel('Button ID (unique)').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('label').setLabel('Label').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('emoji').setLabel('Emoji (Optional)').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('style').setLabel('Style (Primary/Success/Danger) / Type').setStyle(TextInputStyle.Short).setPlaceholder('Primary').setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('content').setLabel('Response / Form ID / URL').setStyle(TextInputStyle.Paragraph).setRequired(false))
            );
            await interaction.showModal(modal);
        } 
        else if (customId === 'kb_btn_delete') {
            await interaction.deferReply({ ephemeral: true });
            // Show a select menu to pick button to delete
            const buttons = await Button.find({ guildId: interaction.guild.id });
            if (buttons.length === 0) return interaction.editReply({ content: 'No buttons to delete.' });

            const options = buttons.slice(0, 25).map(b => ({ label: b.label, value: b.id, description: `ID: ${b.id}` }));
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('kb_sel_btn_delete').setPlaceholder('Select button to delete').addOptions(options)
            );
            await interaction.editReply({ content: 'Select a button to delete:', components: [row] });
        }
        
        // --- Manager: Form Editing Buttons ---
        else if (customId.startsWith('kb_form_addq_')) {
             const formId = customId.replace('kb_form_addq_', '');
             const modal = new ModalBuilder().setCustomId(`kb_modal_form_addq_${formId}`).setTitle('Add Question to Form');
             modal.addComponents(
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('label').setLabel('Question Label').setStyle(TextInputStyle.Short).setRequired(true)),
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('style').setLabel('Style (Short/Paragraph)').setStyle(TextInputStyle.Short).setPlaceholder('Short').setRequired(false)),
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('required').setLabel('Required? (true/false)').setStyle(TextInputStyle.Short).setPlaceholder('true').setRequired(false))
             );
             await interaction.showModal(modal);
        }
        else if (customId.startsWith('kb_form_import_')) {
             const formId = customId.replace('kb_form_import_', '');
             const modal = new ModalBuilder().setCustomId(`kb_modal_form_import_${formId}`).setTitle('Import Questions JSON');
              modal.addComponents(
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('json').setLabel('Paste JSON here').setStyle(TextInputStyle.Paragraph).setRequired(true))
             );
             await interaction.showModal(modal);
        }
        else if (customId.startsWith('kb_form_clear_')) {
             await interaction.deferReply({ ephemeral: true });
             const formId = customId.replace('kb_form_clear_', '');
             const form = await Form.findOne({ guildId: interaction.guild.id, id: formId });
             if (form) {
                 form.questions = '[]';
                 await form.save();
                 await interaction.editReply({ content: `✅ Cleared all questions for form \`${form.title}\`.` });
             } else {
                 await interaction.editReply({ content: 'Form not found.' });
             }
        }

        // --- Manager: Selects ---
        else if (customId === 'kb_sel_create') {
             const modal = new ModalBuilder()
                .setCustomId('kb_modal_sel_create')
                .setTitle('Create New Select Menu');

            modal.addComponents(
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id').setLabel('Select ID (unique)').setStyle(TextInputStyle.Short).setRequired(true)),
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('placeholder').setLabel('Placeholder Text').setStyle(TextInputStyle.Short).setPlaceholder('Select an option...').setRequired(false))
            );
            await interaction.showModal(modal);
        }
        else if (customId === 'kb_sel_delete') {
            await interaction.deferReply({ ephemeral: true });
            const selects = await Select.find({ guildId: interaction.guild.id });
            if (selects.length === 0) return interaction.editReply({ content: 'No selects to delete.' });

            const options = selects.slice(0, 25).map(b => ({ label: b.id, value: b.id }));
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('kb_sel_sel_delete').setPlaceholder('Select menu to delete').addOptions(options)
            );
            await interaction.editReply({ content: 'Select a menu to delete:', components: [row] });
        }
        else if (customId === 'kb_sel_edit') {
             // Manager: List selects to edit
             await interaction.deferReply({ ephemeral: true });
             const selects = await Select.find({ guildId: interaction.guild.id });
             if (selects.length === 0) return interaction.editReply({ content: 'No selects to edit.' });

             const options = selects.slice(0, 25).map(b => ({ label: b.id, value: b.id }));
             const row = new ActionRowBuilder().addComponents(
                 new StringSelectMenuBuilder().setCustomId('kb_sel_sel_edit').setPlaceholder('Select menu to manage').addOptions(options)
             );
             await interaction.editReply({ content: 'Select a menu to manage:', components: [row] });
        }

        // --- Manager: Forms ---
        else if (customId === 'kb_form_create') {
             const modal = new ModalBuilder()
                .setCustomId('kb_modal_form_create')
                .setTitle('Create New Form');

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id').setLabel('Form ID (unique)').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Form Title').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('log_channel').setLabel('Log Channel ID').setStyle(TextInputStyle.Short).setRequired(false))
            );
            await interaction.showModal(modal);
        }
        else if (customId === 'kb_form_delete') {
             await interaction.deferReply({ ephemeral: true });
             const forms = await Form.find({ guildId: interaction.guild.id });
            if (forms.length === 0) return interaction.editReply({ content: 'No forms to delete.' });

            const options = forms.slice(0, 25).map(b => ({ label: b.title, value: b.id }));
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('kb_sel_form_delete').setPlaceholder('Select form to delete').addOptions(options)
            );
            await interaction.editReply({ content: 'Select a form to delete:', components: [row] });
        }
        else if (customId === 'kb_form_edit') {
             await interaction.deferReply({ ephemeral: true });
             const forms = await Form.find({ guildId: interaction.guild.id });
             if (forms.length === 0) return interaction.editReply({ content: 'No forms to edit.' });

             const options = forms.slice(0, 25).map(b => ({ label: b.title, value: b.id }));
             const row = new ActionRowBuilder().addComponents(
                 new StringSelectMenuBuilder().setCustomId('kb_sel_form_edit').setPlaceholder('Select form to edit').addOptions(options)
             );
             await interaction.editReply({ content: 'Select a form to edit:', components: [row] });
        }
        else if (customId.startsWith('kb_sel_add_opt_')) {
             const selId = customId.replace('kb_sel_add_opt_', '');
             const modal = new ModalBuilder().setCustomId(`kb_modal_sel_add_opt_${selId}`).setTitle('Add Option');
             modal.addComponents(
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('label').setLabel('Label').setStyle(TextInputStyle.Short).setRequired(true)),
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('value').setLabel('Value (Keep internal/unique)').setStyle(TextInputStyle.Short).setRequired(false)),
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Description').setStyle(TextInputStyle.Short).setRequired(false)),
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('emoji').setLabel('Emoji').setStyle(TextInputStyle.Short).setRequired(false)),
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('content').setLabel('Response/Form ID (Config)').setStyle(TextInputStyle.Paragraph).setRequired(false))
             );
             await interaction.showModal(modal);
        }
        else if (customId.startsWith('kb_sel_edit_ph_')) {
             const selId = customId.replace('kb_sel_edit_ph_', '');
             const modal = new ModalBuilder().setCustomId(`kb_modal_sel_edit_ph_${selId}`).setTitle('Edit Placeholder');
             modal.addComponents(
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('placeholder').setLabel('New Placeholder').setStyle(TextInputStyle.Short).setRequired(true))
             );
             await interaction.showModal(modal);
        }
        else if (customId.startsWith('kb_sel_del_opt_menu_')) {
             await interaction.deferReply({ ephemeral: true });
             const selId = customId.replace('kb_sel_del_opt_menu_', '');
             const sel = await Select.findOne({ guildId: interaction.guild.id, id: selId });
             if (!sel) return interaction.editReply('Select not found.');
             
             let opts = [];
             try { opts = JSON.parse(sel.options); } catch(e) {}
             if (opts.length === 0) return interaction.editReply('No options to delete.');
             
             const options = opts.map(o => ({ label: o.label.substring(0,25), value: o.value, description: (o.description || '').substring(0,50) }));
             const row = new ActionRowBuilder().addComponents(
                 new StringSelectMenuBuilder().setCustomId(`kb_sel_del_opt_menu_select_${selId}`).setPlaceholder('Select option to delete').addOptions(options)
             );
             await interaction.editReply({ content: 'Choose option to delete:', components: [row] });
        }
        else if (customId.startsWith('kb_sel_delete_direct_')) {
             await interaction.deferReply({ ephemeral: true });
             const selId = customId.replace('kb_sel_delete_direct_', '');
             await Select.deleteOne({ guildId: interaction.guild.id, id: selId });
             await interaction.editReply(`✅ Select \`${selId}\` deleted.`);
        }
        else if (customId === 'kb_sel_edit_menu') {
             await interaction.deferReply({ ephemeral: true });
             const selects = await Select.find({ guildId: interaction.guild.id });
             if (selects.length === 0) return interaction.editReply({ content: 'No select menus to edit.' });

             const options = selects.slice(0, 25).map(s => ({ label: s.id, value: s.id, description: s.placeholder.substring(0, 50) }));
             const row = new ActionRowBuilder().addComponents(
                 new StringSelectMenuBuilder().setCustomId('kb_sel_select_to_edit').setPlaceholder('Select a menu to manage').addOptions(options)
             );
             await interaction.editReply({ content: 'Choose a Select Menu to manage:', components: [row] });
        }
        else if (customId.startsWith('kb_open_form_')) {
             const formId = customId.replace('kb_open_form_', '');
             const form = await Form.findOne({ guildId: interaction.guild.id, id: formId });
             
             if (!form) return interaction.reply({ content: 'Form not found.', ephemeral: true });
             
             try {
                 const questions = JSON.parse(form.questions);
                 if (!questions || questions.length === 0) return interaction.reply({ content: 'This form has no questions configured.', ephemeral: true });
                 
                 const modal = new ModalBuilder()
                    .setCustomId(`kb_modal_submit_${form.id}`)
                    .setTitle(form.title || 'Form');
                 
                 questions.forEach(q => {
                     const style = q.style && q.style === 'Paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short;
                     const input = new TextInputBuilder()
                        .setCustomId(q.id || `q_${Math.random()}`)
                        .setLabel(q.label)
                        .setStyle(style)
                        .setRequired(q.required !== false);
                     
                     modal.addComponents(new ActionRowBuilder().addComponents(input));
                 });

                 await interaction.showModal(modal);
             } catch (e) {
                 console.error('Error parsing form questions:', e);
                 return interaction.reply({ content: 'Error loading form configuration.', ephemeral: true });
             }
        }
    }

    async handleModal(interaction, client) {
        const customId = interaction.customId;

        // Defer immediately to avoid timeout (10062)
        await interaction.deferReply({ ephemeral: true });

        if (customId === 'kb_modal_btn_create') {
            const id = interaction.fields.getTextInputValue('id');
            const label = interaction.fields.getTextInputValue('label');
            const emoji = interaction.fields.getTextInputValue('emoji') || null;
            const styleInput = interaction.fields.getTextInputValue('style') || 'Primary';
            const content = interaction.fields.getTextInputValue('content') || 'No content';

            // Determine type and style
            let type = 'response';
            let style = styleInput;
            
            // Heuristic to detect Form or Link
            if (content.startsWith('http')) {
                type = 'link';
                style = 'Link';
            } else if (content.startsWith('form:') || styleInput.toLowerCase() === 'form') {
                 // Or if user typed "Form" in style
                 type = 'form';
                 if (styleInput.toLowerCase() === 'form') style = 'Primary'; // Default style for form button
            }

            // Check if ID exists
            const existing = await Button.findOne({ guildId: interaction.guild.id, id });
            if (existing) return interaction.editReply({ content: 'Button ID already exists!' });

            await Button.create({
                guildId: interaction.guild.id,
                id,
                label,
                emoji,
                style,
                type,
                content
            });

            await interaction.editReply({ content: `✅ Button \`${label}\` created!` });
            // Refresh logic could go here via updating the original message if possible
        }
        else if (customId === 'kb_modal_sel_create') {
            const id = interaction.fields.getTextInputValue('id');
            const placeholder = interaction.fields.getTextInputValue('placeholder') || 'Select an option...';
            
            const existing = await Select.findOne({ guildId: interaction.guild.id, id });
            if (existing) return interaction.editReply({ content: 'Select ID already exists!' });

            await Select.create({
                guildId: interaction.guild.id,
                id,
                placeholder,
                options: '[]' // Start empty
            });

            await interaction.editReply({ content: `✅ Select menu \`${id}\` created! Use edit to add options.` });

            await interaction.editReply({ content: `✅ Select menu \`${id}\` created!` });
        }
        else if (customId === 'kb_modal_form_create') {
             const id = interaction.fields.getTextInputValue('id');
             const title = interaction.fields.getTextInputValue('title');
             const logChannel = interaction.fields.getTextInputValue('log_channel');

             const existing = await Form.findOne({ guildId: interaction.guild.id, id });
             if (existing) return interaction.editReply({ content: 'Form ID already exists!' });

             await Form.create({
                 guildId: interaction.guild.id,
                 id,
                 title,
                 log_channel: logChannel,
                 questions: '[]' // Start with empty questions, add edit logic later or expand modal
             });

             await interaction.editReply({ content: `✅ Form \`${title}\` created! Use edit command to add questions (Pending).` });
        }
        else if (customId.startsWith('kb_modal_form_addq_')) {
             const formId = customId.replace('kb_modal_form_addq_', '');
             const label = interaction.fields.getTextInputValue('label');
             const styleStr = interaction.fields.getTextInputValue('style') || 'Short';
             const reqStr = interaction.fields.getTextInputValue('required') || 'true';
             
             const style = styleStr.toLowerCase().startsWith('p') ? TextInputStyle.Paragraph : TextInputStyle.Short;
             const required = reqStr.toLowerCase() === 'true';

             const form = await Form.findOne({ guildId: interaction.guild.id, id: formId });
             if (!form) return interaction.editReply({ content: 'Form not found!' });
             
             let questions = [];
             try { questions = JSON.parse(form.questions); } catch(e) {}
             if (questions.length >= 5) return interaction.editReply({ content: 'Cannot add more than 5 questions to a Discord Modal.' });

             questions.push({
                 id: `q_${questions.length + 1}`,
                 label,
                 style,
                 required
             });
             
             form.questions = JSON.stringify(questions);
             await form.save();
             await interaction.editReply({ content: `✅ Added question "${label}" to form.` });
        }
        else if (customId.startsWith('kb_modal_form_import_')) {
             const formId = customId.replace('kb_modal_form_import_', '');
             const jsonStr = interaction.fields.getTextInputValue('json');
             
             try {
                 const parsed = JSON.parse(jsonStr);
                 if (!Array.isArray(parsed)) throw new Error('Not an array');
                 if (parsed.length > 5) return interaction.editReply({ content: 'Max 5 questions allow.' });
                 
                 const form = await Form.findOne({ guildId: interaction.guild.id, id: formId });
                 if (!form) return interaction.editReply({ content: 'Form not found.' });
                 
                 form.questions = jsonStr; // Trusting user input valid structure, should validate map in real prod
                 await form.save();
             await interaction.editReply({ content: `✅ Imported ${parsed.length} questions.` });
             } catch (e) {
                 return interaction.editReply({ content: 'Invalid JSON. Must be an array of question objects.' });
             }
        }
        else if (customId.startsWith('kb_modal_sel_add_opt_')) {
             const selId = customId.replace('kb_modal_sel_add_opt_', '');
             const label = interaction.fields.getTextInputValue('label');
             const value = interaction.fields.getTextInputValue('value') || label.toLowerCase().replace(/\s+/g, '_');
             const desc = interaction.fields.getTextInputValue('desc');
             const emoji = interaction.fields.getTextInputValue('emoji');
             const content = interaction.fields.getTextInputValue('content');

             const sel = await Select.findOne({ guildId: interaction.guild.id, id: selId });
             if (!sel) return interaction.editReply({ content: 'Select not found.' });

             let opts = [];
             try { opts = JSON.parse(sel.options); } catch(e) {}
             
             if (opts.length >= 25) return interaction.editReply({ content: 'Max 25 options allowed.' });

             // Check if value exists
             if (opts.find(o => o.value === value)) return interaction.editReply({ content: 'Option Value already exists.' });

             opts.push({
                 label,
                 value,
                 description: desc || undefined,
                 emoji: emoji || undefined,
                 content: content || undefined // Custom logic payload if needed
             });

             sel.options = JSON.stringify(opts);
             await sel.save();
             await interaction.editReply({ content: `✅ Added option: ${label}` });
        }
        else if (customId.startsWith('kb_modal_sel_edit_ph_')) {
             const selId = customId.replace('kb_modal_sel_edit_ph_', '');
             const ph = interaction.fields.getTextInputValue('placeholder');
             
             const sel = await Select.findOne({ guildId: interaction.guild.id, id: selId });
             if (sel) {
                 sel.placeholder = ph;
                 await sel.save();
                 await interaction.editReply({ content: `✅ Updated placeholder to: ${ph}` });
             }
        }
        else if (customId.startsWith('kb_modal_submit_')) {
             // Handle Form Submission
             // Handle Form Submission
             // await interaction.deferReply({ ephemeral: true }); // ALREADY DEFERRED AT START OF handleModal
             const formId = customId.replace('kb_modal_submit_', '');
             const form = await Form.findOne({ guildId: interaction.guild.id, id: formId });
             
             if (!form) return interaction.editReply({ content: 'Form configuration not found.' });

             // Collect answers
             const answers = [];
             interaction.fields.fields.forEach(field => {
                 answers.push({
                     q_id: field.customId,
                     value: field.value
                 });
             });

             // Log to channel if configured
             if (form.log_channel) {
                 try {
                     const channel = await interaction.guild.channels.fetch(form.log_channel);
                     if (channel) {
                         const embed = new EmbedBuilder()
                            .setTitle(`Form Submission: ${form.title}`)
                            .setDescription(`Submitted by <@${interaction.user.id}>`)
                            .setColor('Green')
                            .setTimestamp();
                         
                         answers.forEach(a => {
                             // Find label if possible, or just show Q ID
                             // We don't have the label easily unless we parse questions again.
                             // For now, let's just dump values. 
                             // Ideally we should match Q-ID to Label.
                             let label = a.q_id;
                             try {
                                 const parsedQ = JSON.parse(form.questions);
                                 const qObj = parsedQ.find(q => q.id === a.q_id);
                                 if (qObj) label = qObj.label;
                             } catch(e) {}
                             
                             embed.addFields({ name: label, value: a.value || 'Empty', inline: false });
                         });

                         await channel.send({ embeds: [embed] });
                         await interaction.editReply({ content: '✅ Form submitted successfully!' });
                         return;
                     }
                 } catch (e) {
                     console.error('Error logging form submission:', e);
                 }
                 await interaction.editReply({ content: '✅ Form submitted, but failed to log to channel.' });
             } else {
                 await interaction.editReply({ content: '✅ Form submitted! (No log channel configured)' });
             }
        }
    }

    async handleSelect(interaction, client) {
        const customId = interaction.customId;
        const value = interaction.values[0];

        // --- User Component: kenta_sel_ ---
         if (customId.startsWith('kenta_sel_')) {
             const selId = customId.replace('kenta_sel_', '');
             // Logic for Select menu handling (similar to Button but handling values)
             // ...
             // For now just reply with selection
             await interaction.reply({ content: `You selected: ${interaction.values.join(', ')} (Logic pending)`, ephemeral: true });
             return;
        }


        if (customId === 'kb_sel_btn_delete') {
            await interaction.deferUpdate(); // Acknowledge selection
            await Button.deleteOne({ guildId: interaction.guild.id, id: value });
            await interaction.editReply({ content: `✅ Button \`${value}\` deleted.`, components: [] });
        }
        else if (customId === 'kb_sel_sel_delete') {
             await interaction.deferUpdate();
             await Select.deleteOne({ guildId: interaction.guild.id, id: value });
             await interaction.editReply({ content: `✅ Select \`${value}\` deleted.`, components: [] });
        }
        else if (customId === 'kb_sel_sel_edit') {
             // Show Select Manager Actions
             await interaction.deferUpdate();
             const sel = await Select.findOne({ guildId: interaction.guild.id, id: value });
             if (!sel) return interaction.editReply({ content: 'Select not found.', components: [] });

             let optionsArr = [];
             try { optionsArr = JSON.parse(sel.options); } catch(e) {}

             const embed = new EmbedBuilder()
                .setTitle(`Managing Select: ${sel.id}`)
                .setDescription(`Placeholder: ${sel.placeholder}\nOptions: ${optionsArr.length}`)
                .setColor('#5865F2');
             
             optionsArr.forEach((opt, idx) => {
                 embed.addFields({ name: `Option ${idx+1}: ${opt.label}`, value: `Val: ${opt.value} | ${opt.emoji || ''}\n${opt.description || ''}`, inline: true });
             });

             const row = new ActionRowBuilder().addComponents(
                 new ButtonBuilder().setCustomId(`kb_sel_add_opt_${sel.id}`).setLabel('➕ Add Option').setStyle(ButtonStyle.Success),
                 new ButtonBuilder().setCustomId(`kb_sel_edit_ph_${sel.id}`).setLabel('📝 Edit Placeholder').setStyle(ButtonStyle.Primary),
                 new ButtonBuilder().setCustomId(`kb_sel_del_opt_menu_${sel.id}`).setLabel('🗑️ Delete Option').setStyle(ButtonStyle.Secondary),
                 new ButtonBuilder().setCustomId(`kb_sel_delete_direct_${sel.id}`).setLabel('🗑️ Delete Select').setStyle(ButtonStyle.Danger)
             );
             
             await interaction.editReply({ embeds: [embed], components: [row] });
        }
        else if (customId.startsWith('kb_sel_del_opt_confirm_')) {
             await interaction.deferUpdate();
             const parts = customId.split('_'); // kb_sel_del_opt_confirm_SELID
             // Value is index usually? Or value?
             // Since select menu returns value, we assume value is passed. 
             // Wait, handleSelect handles SELECT INTERACTIONS.
             // If we use a select menu to delete options, the customId is what we are checking here.
             
             // NOT IMPLEMENTED IN BUTTON HANDLER, THIS IS SELECT HANDLER
        }
        else if (customId.startsWith('kb_sel_del_opt_menu_select_')) {
             await interaction.deferUpdate();
             const selId = customId.replace('kb_sel_del_opt_menu_select_', '');
             const valToDelete = value;
             
             const sel = await Select.findOne({ guildId: interaction.guild.id, id: selId });
             if (sel) {
                 let opts = JSON.parse(sel.options);
                 opts = opts.filter(o => o.value !== valToDelete);
                 sel.options = JSON.stringify(opts);
                 await sel.save();
                 await interaction.editReply({ content: `✅ Deleted option value \`${valToDelete}\`.` });
             }
        }
        else if (customId === 'kb_sel_form_delete') {
             await interaction.deferUpdate();
             await Form.deleteOne({ guildId: interaction.guild.id, id: value });
             await interaction.editReply({ content: `✅ Form \`${value}\` deleted.`, components: [] });
        }
        else if (customId === 'kb_sel_form_edit') {
             // Show Form Editor Actions
             await interaction.deferUpdate();
             const form = await Form.findOne({ guildId: interaction.guild.id, id: value });
             if (!form) return interaction.editReply({ content: 'Form not found.', components: [] });

             const embed = new EmbedBuilder()
                .setTitle(`Editing Form: ${form.title}`)
                .setDescription(`Current Questions:\n\`\`\`json\n${form.questions}\n\`\`\``)
                .setColor('#5865F2');

             const row = new ActionRowBuilder().addComponents(
                 new ButtonBuilder().setCustomId(`kb_form_addq_${form.id}`).setLabel('Add Question').setStyle(ButtonStyle.Success),
                 new ButtonBuilder().setCustomId(`kb_form_import_${form.id}`).setLabel('Import JSON').setStyle(ButtonStyle.Secondary),
                 new ButtonBuilder().setCustomId(`kb_form_clear_${form.id}`).setLabel('Clear All').setStyle(ButtonStyle.Danger)
             );
             
             await interaction.editReply({ embeds: [embed], components: [row] });
        }
    }
}

module.exports = new KentaInteractionManager();
