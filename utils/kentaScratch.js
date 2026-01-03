const {
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const moment = require('moment-timezone');
const { getLang } = require('./langLoader');
const models = {
    Layout: require('../models/Layout'),
    Button: require('../models/Button'),
    Select: require('../models/Select'),
    Form: require('../models/Form')
};

class KentaScratch {
    constructor() {
        this.functions = new Map();
        this.registerDefaultFunctions();
    }

    registerDefaultFunctions() {
        // Basic Placeholders are handled in parsePlaceholders
        // This registry is for dynamic functions like {random:...} or {button:...}
    }

    /**
     * Parse a string for KentaScratch placeholders and functions
     * @param {string} content The content to parse
     * @param {Object} context The context (user, guild, channel, interaction)
     * @returns {Promise<{content: string, components: Array, embeds: Array, actions: Array}>}
     */
    async parse(content, context = {}) {
        if (!content) return { content: '', components: [], embeds: [], actions: [] };

        let parsedContent = content;
        const components = [];
        const embeds = [];
        const actions = []; // For things like {add_role}, {sleep}

        // Get Language
        let lang = context.lang;
        if (!lang) {
            lang = await getLang(context.guild?.id);
            context.lang = lang; // Store for reused calls or passing down
        }

        // 0. Language Placeholder {lang:Key.SubKey}
        // Must be done early so other placeholders can be used in the lang strings if needed? 
        // Or late? Usually early allows "Welcome {user}" string in lang file to be parsed.
        // But here we are replacing INTO the content.
        parsedContent = parsedContent.replace(/{lang:([^}]+)}/g, (match, keyPath) => {
            const keys = keyPath.split('.');
            let val = lang;
            for (const k of keys) {
                val = val?.[k];
            }
            return (typeof val === 'string') ? val : match;
        });

        // 1. Basic Placeholders
        parsedContent = await this.parsePlaceholders(parsedContent, context);

        // 2. Logic & Control (Requires, Cooldowns - typically these stop execution if failed)
        // For now, we will just parse them out or handle them as "actions"
        
        // 3. Components (Buttons, Selects)
        // Regex for {button:id,id2} and {select:id}
        const buttonRegex = /{button:([^}]+)}/g;
        let buttonMatch;
        while ((buttonMatch = buttonRegex.exec(parsedContent)) !== null) {
            const buttonIds = buttonMatch[1].split(',').map(s => s.trim());
            const row = new ActionRowBuilder();
            for (const btnId of buttonIds) {
                const btnData = await models.Button.findOne({ id: btnId, guildId: context.guild?.id });
                if (btnData) {
                    row.addComponents(await this.buildButton(btnData));
                }
            }
            if (row.components.length > 0) components.push(row);
            parsedContent = parsedContent.replace(buttonMatch[0], ''); // Remove tag
        }

        const selectRegex = /{select:([^}]+)}/g;
        let selectMatch;
        while ((selectMatch = selectRegex.exec(parsedContent)) !== null) {
             const selectIds = selectMatch[1].split(',').map(s => s.trim());
             for (const selId of selectIds) {
                 const selData = await models.Select.findOne({ id: selId, guildId: context.guild?.id });
                 if (selData) {
                    const row = new ActionRowBuilder().addComponents(await this.buildSelect(selData, lang));
                    components.push(row);
                 }
             }
             parsedContent = parsedContent.replace(selectMatch[0], ''); // Remove tag
        }
        
        // 4. Layouts
        const layoutRegex = /{layout:([^}]+)}/g;
        let layoutMatch;
        while ((layoutMatch = layoutRegex.exec(parsedContent)) !== null) {
            const layoutName = layoutMatch[1].trim();
            const layoutData = await models.Layout.findOne({ name: layoutName, guildId: context.guild?.id });
            if (layoutData) {
                // Layouts replace the entire content structure essentially, but if used in a string, they might append?
                // For KentaBuckets, {layout:name} usually completely controls the output.
                // We will parse the layout definition and merge it.
                try {
                    const layoutJson = JSON.parse(layoutData.json_data || '[]');
                    
                    for (const comp of layoutJson) {
                        if (comp.type === 'text') {
                             // Append to content. If parsedContent was just the tag, it replaces it.
                             // But since we are replacing the tag with empty string later, we should append to a 'layoutContent' var or modify parsedContent directly?
                             // Using a separate buffer for layout content is safer.
                             // But here we are processing the string. 
                             // Let's treat layout content as supplementary or Primary if it's the only thing.
                             // For now, let's append to embeds or content. 
                             // If it's pure text, we can't easily "insert" it where the tag was if we have multiple components.
                             // Simplification: Layouts append to the END of the message structure usually.
                             // Or we can add it as a Description in an Embed if it's rich text.
                             
                             // Let's assume 'text' means adding text to the message body.
                             // We'll append it to a temporary string to replace the tag with?
                             parsedContent = parsedContent.replace(layoutMatch[0], comp.content + '\n');
                             // Wait, we are in a regex loop. replacing layoutMatch[0] affects the string we are iterating?
                             // Using replace implies we won't see this tag again.
                             
                             // Actually, simpler approach: Build a "Layout Result" and merge.
                             // But since we need to support mix, let's just push to embeds/components.
                             if (comp.content) {
                                 // Add as simple embed description if possible to separate? Or just raw content.
                                 // Let's append to raw content via a special marker or just concat.
                                 // But wait, the loop at the end removes the tag.
                             }
                        }
                        else if (comp.type === 'button') {
                            const btnIds = comp.content.split(',').map(s => s.trim());
                            const row = new ActionRowBuilder();
                            for (const btnId of btnIds) {
                                const btnData = await models.Button.findOne({ id: btnId, guildId: context.guild?.id });
                                if (btnData) row.addComponents(await this.buildButton(btnData));
                            }
                            if (row.components.length > 0) components.push(row);
                        }
                        else if (comp.type === 'select') {
                            const selId = comp.content.trim();
                            const selData = await models.Select.findOne({ id: selId, guildId: context.guild?.id });
                            if (selData) {
                                const row = new ActionRowBuilder().addComponents(await this.buildSelect(selData, lang));
                                components.push(row);
                            }
                        }
                        else if (comp.type === 'gallery') {
                            // Valid URL in content?
                            if (comp.content && comp.content.startsWith('http')) {
                                embeds.push(new EmbedBuilder().setImage(comp.content));
                            }
                        }
                        else if (comp.type === 'separator') {
                             embeds.push(new EmbedBuilder().setDescription('***')); // Visual separator using embed? or just text
                        }
                        else if (comp.type === 'section') {
                             embeds.push(new EmbedBuilder().setTitle('Section').setDescription(comp.content || ' '));
                        }
                    }
                    
                    // Special case for text: if we found text components, we might want to return them.
                    // But parsedContent is the main string.
                    // Let's assume Layouts are mostly for components/embeds.
                    // Any text in layout is treated as Embed Description for now to ensure visibility?
                    // Or we just let it be.
                    
                } catch (e) {
                    console.error('Failed to parse layout JSON:', e);
                }
            }
            parsedContent = parsedContent.replace(layoutMatch[0], '');
        }

        // 5. Random
        parsedContent = parsedContent.replace(/{random:string:([^}]+)}/g, (match, args) => {
            const options = args.split('|');
            const chosen = options[Math.floor(Math.random() * options.length)];
            context.lastRandomString = chosen; // Store for [random:string]
            return chosen;
        });

         parsedContent = parsedContent.replace(/{random:number:(\d+)-(\d+)}/g, (match, min, max) => {
            const val = Math.floor(Math.random() * (parseInt(max) - parseInt(min) + 1)) + parseInt(min);
            context.lastRandomNumber = val;
            return val;
        });
        
        parsedContent = parsedContent.replace(/\[random:string\]/g, () => context.lastRandomString || '');
        parsedContent = parsedContent.replace(/\[random:number\]/g, () => context.lastRandomNumber || '');


        return { content: parsedContent.trim(), components, embeds, actions };
    }

    async parsePlaceholders(text, context) {
        if (!text) return '';
        const { user, guild, channel, member } = context;
        
        let res = text;
        const now = Date.now();

        // User
        if (user) {
            res = res.replace(/{user}/g, `<@${user.id}>`)
                     .replace(/{user_id}/g, user.id)
                     .replace(/{user_name}/g, user.tag || user.username) // djs v14 tag might be gone
                     .replace(/{user_mention}/g, `<@${user.id}>`)
                     .replace(/{user_displayname}/g, user.globalName || user.username)
                     .replace(/{user_avatar}/g, user.displayAvatarURL({ dynamic: true }))
                     .replace(/{user_createdate}/g, Math.floor(user.createdTimestamp / 1000));
        
            if (member) {
                res = res.replace(/{user_nick}/g, member.nickname || user.username)
                         .replace(/{user_joindate}/g, Math.floor(member.joinedTimestamp / 1000))
                         .replace(/{user_displaycolor}/g, member.displayHexColor);
            }
        }

        // Server
        if (guild) {
             res = res.replace(/{server_id}/g, guild.id)
                      .replace(/{server_name}/g, guild.name)
                      .replace(/{server_membercount}/g, guild.memberCount)
                      .replace(/{server_icon}/g, guild.iconURL({ dynamic: true }) || '')
                      .replace(/{server_owner_id}/g, guild.ownerId);
        }

        // Channel
        if (channel) {
            res = res.replace(/{channel_name}/g, channel.name)
                     .replace(/{channel_id}/g, channel.id)
                     .replace(/{channel_mention}/g, `<#${channel.id}>`);
        }

        // Misc
        res = res.replace(/{newline}/g, '\n');

        return res;
    }

    async buildButton(btnData) {
        const btn = new ButtonBuilder()
            .setCustomId(`kenta_btn_${btnData.id}`)
            .setLabel(btnData.label)
            .setStyle(this.getButtonStyle(btnData.style));

        if (btnData.emoji) btn.setEmoji(btnData.emoji);
        
        if (btnData.type === 'link' && btnData.content) {
            btn.setStyle(ButtonStyle.Link);
            btn.setURL(btnData.content);
            // Link buttons cannot have customId
            btn.setCustomId(null); 
        }

        return btn;
    }

    async buildSelect(selData, lang) {
        const select = new StringSelectMenuBuilder()
            .setCustomId(`kenta_sel_${selData.id}`)
            .setPlaceholder(selData.placeholder)
            .setMinValues(selData.min_values)
            .setMaxValues(selData.max_values);
        
        try {
            const options = JSON.parse(selData.options);
            // Validate options
            if (Array.isArray(options)) {
                select.addOptions(options.map(opt => ({
                    label: opt.label,
                    value: opt.value,
                    description: opt.description,
                    emoji: opt.emoji
                })));
            }
        } catch (e) {
            console.error('Error parsing select options:', e);
            const errorMsg = lang?.KentaScratch?.Errors?.ParsingOptions || 'Error parsing options';
            select.addOptions([{ label: errorMsg, value: 'error' }]);
        }

        return select;
    }

    getButtonStyle(styleName) {
        switch (styleName?.toLowerCase()) {
            case 'primary': return ButtonStyle.Primary;
            case 'secondary': return ButtonStyle.Secondary;
            case 'success': return ButtonStyle.Success;
            case 'danger': return ButtonStyle.Danger;
            case 'link': return ButtonStyle.Link;
            default: return ButtonStyle.Primary;
        }
    }
}

module.exports = new KentaScratch();
