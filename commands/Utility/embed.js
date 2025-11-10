const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    PermissionsBitField, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    MessageFlags 
} = require('discord.js');
const mongoose = require('mongoose');
const { getConfig, getLang } = require('../../utils/configLoader.js');

// ===== CONFIG & CONSTANTS =====
const config = getConfig();
const lang = getLang();
const MAX_LINK_BUTTONS = 5; // 1 row cho link buttons (5 buttons max)
const MODAL_TIMEOUT = 60000;
const COLLECTOR_TIMEOUT = 900000;

// ===== MONGOOSE SCHEMA =====
const embedSchema = new mongoose.Schema({
    name: String,
    embedData: Object,
    linkButtons: Array,
});
const EmbedTemplate = mongoose.model('EmbedTemplate', embedSchema);

// ===== GLOBAL STATE =====
const activeInteractions = new Map();

// ===== UTILITY FUNCTIONS =====
const Utils = {
    isValidUrl(str) {
        try {
            const url = new URL(str);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch { return false; }
    },

    isImageUrl(url) {
        return /\.(jpeg|jpg|gif|png|svg)$/i.test(url);
    },

    splitIntoRows(buttons, perRow = 5) {
        const rows = [];
        for (let i = 0; i < buttons.length; i += perRow) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + perRow)));
        }
        return rows;
    },

    combineComponents(baseRows, linkButtons) {
        const combined = [...baseRows];
        const linkRows = Utils.splitIntoRows(linkButtons);
        const space = 5 - combined.length;
        combined.push(...linkRows.slice(0, space));
        return combined;
    },

    getUserData(client, userId) {
        if (!client.embedData) client.embedData = {};
        if (!client.embedData[userId]) client.embedData[userId] = {};
        return client.embedData[userId];
    },

    clearUserData(client, userId) {
        if (client.embedData?.[userId]) delete client.embedData[userId];
    }
};

// ===== MODAL HANDLERS =====
const ModalHandlers = {
    async showModal(interaction, modalConfig, onSubmit) {
        const modal = new ModalBuilder()
            .setCustomId(modalConfig.id)
            .setTitle(modalConfig.title);

        modalConfig.inputs.forEach(input => {
            modal.addComponents(new ActionRowBuilder().addComponents(input));
        });

        await interaction.showModal(modal);

        try {
            const submit = await interaction.awaitModalSubmit({
                filter: i => i.customId === modalConfig.id,
                time: MODAL_TIMEOUT
            });
            await onSubmit(submit);
        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                await interaction.followUp({ 
                    content: 'Modal đã hết thời gian. Vui lòng thử lại.', 
                    flags: MessageFlags.Ephemeral 
                });
            } else {
                console.error('Modal error:', error);
                await interaction.followUp({ 
                    content: 'Có lỗi xảy ra. Vui lòng thử lại.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
    },

    async title(interaction, embed, components, linkButtons) {
        await this.showModal(interaction, {
            id: 'title_modal',
            title: 'Đặt tiêu đề Embed',
            inputs: [
                new TextInputBuilder()
                    .setCustomId('titleText')
                    .setLabel('Tiêu đề')
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data.title || '')
                    .setRequired(false)
            ]
        }, async (submit) => {
            const title = submit.fields.getTextInputValue('titleText');
            embed.setTitle(title || null);
            await submit.update({ 
                embeds: [embed], 
                components: Utils.combineComponents(components, linkButtons), 
                flags: MessageFlags.Ephemeral 
            });
        });
    },

    async description(interaction, embed, components, linkButtons) {
        await this.showModal(interaction, {
            id: 'description_modal',
            title: 'Đặt mô tả Embed',
            inputs: [
                new TextInputBuilder()
                    .setCustomId('descriptionText')
                    .setLabel('Mô tả')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(embed.data.description || '')
                    .setRequired(false)
            ]
        }, async (submit) => {
            const description = submit.fields.getTextInputValue('descriptionText');
            embed.setDescription(description || null);
            await submit.update({ 
                embeds: [embed], 
                components: Utils.combineComponents(components, linkButtons), 
                flags: MessageFlags.Ephemeral 
            });
        });
    },

    async author(interaction, embed, components, linkButtons) {
        await this.showModal(interaction, {
            id: 'author_modal',
            title: 'Cài đặt tác giả',
            inputs: [
                new TextInputBuilder()
                    .setCustomId('authorName')
                    .setLabel('Tên tác giả')
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data.author?.name || '')
                    .setRequired(false),
                new TextInputBuilder()
                    .setCustomId('authorIcon')
                    .setLabel('URL icon tác giả')
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data.author?.iconURL || '')
                    .setRequired(false),
                new TextInputBuilder()
                    .setCustomId('authorUrl')
                    .setLabel('URL tác giả')
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data.author?.url || '')
                    .setRequired(false)
            ]
        }, async (submit) => {
            const name = submit.fields.getTextInputValue('authorName');
            const icon = submit.fields.getTextInputValue('authorIcon');
            const url = submit.fields.getTextInputValue('authorUrl');

            if ((icon && !Utils.isValidUrl(icon)) || (url && !Utils.isValidUrl(url))) {
                await submit.reply({ 
                    content: 'URL không hợp lệ!', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            embed.setAuthor(name || icon || url ? { 
                name: name || null, 
                iconURL: icon || null, 
                url: url || null 
            } : null);

            await submit.update({ 
                embeds: [embed], 
                components: Utils.combineComponents(components, linkButtons), 
                flags: MessageFlags.Ephemeral 
            });
        });
    },

    async footer(interaction, embed, components, linkButtons) {
        await this.showModal(interaction, {
            id: 'footer_modal',
            title: 'Cài đặt footer',
            inputs: [
                new TextInputBuilder()
                    .setCustomId('footerText')
                    .setLabel('Text footer')
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data.footer?.text || '')
                    .setRequired(false),
                new TextInputBuilder()
                    .setCustomId('footerIcon')
                    .setLabel('URL icon footer')
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data.footer?.iconURL || '')
                    .setRequired(false)
            ]
        }, async (submit) => {
            const text = submit.fields.getTextInputValue('footerText');
            const icon = submit.fields.getTextInputValue('footerIcon');

            if (icon && !Utils.isValidUrl(icon)) {
                await submit.reply({ 
                    content: 'URL icon không hợp lệ!', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            embed.setFooter(text || icon ? { 
                text: text || null, 
                iconURL: icon || null 
            } : null);

            await submit.update({ 
                embeds: [embed], 
                components: Utils.combineComponents(components, linkButtons), 
                flags: MessageFlags.Ephemeral 
            });
        });
    },

    async color(interaction, embed, components, linkButtons) {
        await this.showModal(interaction, {
            id: 'color_modal',
            title: 'Đặt màu Embed',
            inputs: [
                new TextInputBuilder()
                    .setCustomId('colorValue')
                    .setLabel('Màu (Hex code)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data.color ? `#${embed.data.color.toString(16)}` : '')
                    .setRequired(false)
            ]
        }, async (submit) => {
            const color = submit.fields.getTextInputValue('colorValue');
            try {
                embed.setColor(color || null);
                await submit.update({ 
                    embeds: [embed], 
                    components: Utils.combineComponents(components, linkButtons), 
                    flags: MessageFlags.Ephemeral 
                });
            } catch {
                await submit.reply({ 
                    content: 'Màu không hợp lệ! Sử dụng hex code (vd: #FF0000)', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        });
    },

    async thumbnail(interaction, embed, components, linkButtons) {
        await this.showModal(interaction, {
            id: 'thumbnail_modal',
            title: 'Đặt thumbnail',
            inputs: [
                new TextInputBuilder()
                    .setCustomId('thumbnailUrl')
                    .setLabel('URL thumbnail')
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data.thumbnail?.url || '')
                    .setRequired(false)
            ]
        }, async (submit) => {
            const url = submit.fields.getTextInputValue('thumbnailUrl');
            
            if (url && (!Utils.isValidUrl(url) || !Utils.isImageUrl(url))) {
                await submit.reply({ 
                    content: 'URL hình ảnh không hợp lệ!', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            embed.setThumbnail(url || null);
            await submit.update({ 
                embeds: [embed], 
                components: Utils.combineComponents(components, linkButtons), 
                flags: MessageFlags.Ephemeral 
            });
        });
    },

    async image(interaction, embed, components, linkButtons) {
        await this.showModal(interaction, {
            id: 'image_modal',
            title: 'Đặt hình ảnh lớn',
            inputs: [
                new TextInputBuilder()
                    .setCustomId('imageUrl')
                    .setLabel('URL hình ảnh')
                    .setStyle(TextInputStyle.Short)
                    .setValue(embed.data.image?.url || '')
                    .setRequired(false)
            ]
        }, async (submit) => {
            const url = submit.fields.getTextInputValue('imageUrl');
            
            if (url && (!Utils.isValidUrl(url) || !Utils.isImageUrl(url))) {
                await submit.reply({ 
                    content: 'URL hình ảnh không hợp lệ!', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            embed.setImage(url || null);
            await submit.update({ 
                embeds: [embed], 
                components: Utils.combineComponents(components, linkButtons), 
                flags: MessageFlags.Ephemeral 
            });
        });
    },

    async addField(interaction, embed, components, linkButtons) {
        await this.showModal(interaction, {
            id: 'addfield_modal',
            title: 'Thêm field',
            inputs: [
                new TextInputBuilder()
                    .setCustomId('fieldName')
                    .setLabel('Tên field')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true),
                new TextInputBuilder()
                    .setCustomId('fieldValue')
                    .setLabel('Giá trị field')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true),
                new TextInputBuilder()
                    .setCustomId('fieldInline')
                    .setLabel('Inline? (true/false)')
                    .setStyle(TextInputStyle.Short)
                    .setValue('false')
                    .setRequired(true)
            ]
        }, async (submit) => {
            const name = submit.fields.getTextInputValue('fieldName');
            const value = submit.fields.getTextInputValue('fieldValue');
            const inline = submit.fields.getTextInputValue('fieldInline').toLowerCase() === 'true';

            embed.addFields({ name, value, inline });
            await submit.update({ 
                embeds: [embed], 
                components: Utils.combineComponents(components, linkButtons), 
                flags: MessageFlags.Ephemeral 
            });
        });
    },

    async aboveText(interaction, embed, components, linkButtons) {
        await this.showModal(interaction, {
            id: 'abovetext_modal',
            title: 'Text phía trên Embed',
            inputs: [
                new TextInputBuilder()
                    .setCustomId('aboveText')
                    .setLabel('Text')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Nhập text (có thể mention role)')
                    .setRequired(false)
            ]
        }, async (submit) => {
            const text = submit.fields.getTextInputValue('aboveText');
            const userData = Utils.getUserData(interaction.client, interaction.user.id);
            userData.aboveText = text;

            await submit.update({
                content: text ? `Text đã được đặt: "${text}"` : 'Text đã được xóa.',
                embeds: [embed],
                components: Utils.combineComponents(components, linkButtons),
                flags: MessageFlags.Ephemeral
            });
        });
    },

    async aboveImage(interaction, embed, components, linkButtons) {
        await this.showModal(interaction, {
            id: 'aboveimage_modal',
            title: 'Hình ảnh phía trên Embed',
            inputs: [
                new TextInputBuilder()
                    .setCustomId('aboveImageUrl')
                    .setLabel('URL hình ảnh')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
            ]
        }, async (submit) => {
            const url = submit.fields.getTextInputValue('aboveImageUrl');
            const userData = Utils.getUserData(interaction.client, interaction.user.id);
            userData.aboveImageUrl = url;

            await submit.update({
                content: url ? `URL hình ảnh đã được đặt: "${url}"` : 'Hình ảnh đã được xóa.',
                embeds: [embed],
                components: Utils.combineComponents(components, linkButtons),
                flags: MessageFlags.Ephemeral
            });
        });
    },

    async addLink(interaction, embed, linkButtons, components) {
        if (linkButtons.length >= MAX_LINK_BUTTONS) {
            await interaction.reply({ 
                content: `Tối đa ${MAX_LINK_BUTTONS} link buttons!`, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        await this.showModal(interaction, {
            id: 'addlink_modal',
            title: 'Thêm link button',
            inputs: [
                new TextInputBuilder()
                    .setCustomId('buttonUrl')
                    .setLabel('URL')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true),
                new TextInputBuilder()
                    .setCustomId('buttonLabel')
                    .setLabel('Label')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true),
                new TextInputBuilder()
                    .setCustomId('buttonEmoji')
                    .setLabel('Emoji (tùy chọn)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
            ]
        }, async (submit) => {
            const url = submit.fields.getTextInputValue('buttonUrl');
            const label = submit.fields.getTextInputValue('buttonLabel');
            const emoji = submit.fields.getTextInputValue('buttonEmoji');

            if (!Utils.isValidUrl(url)) {
                await submit.reply({ 
                    content: 'URL không hợp lệ!', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            const button = new ButtonBuilder()
                .setURL(url)
                .setLabel(label)
                .setStyle(ButtonStyle.Link);

            if (emoji) button.setEmoji(emoji);
            linkButtons.push(button);

            await submit.update({ 
                embeds: [embed], 
                components: Utils.combineComponents(components, linkButtons), 
                flags: MessageFlags.Ephemeral 
            });
        });
    }
};

// ===== ACTION HANDLERS =====
const Actions = {
    async timestamp(interaction, embed, components, linkButtons) {
        embed.setTimestamp(embed.data.timestamp ? null : new Date());
        await interaction.update({ 
            embeds: [embed], 
            components: Utils.combineComponents(components, linkButtons), 
            flags: MessageFlags.Ephemeral 
        });
    },

    async togglePings(interaction, embed, components, linkButtons) {
        const userData = Utils.getUserData(interaction.client, interaction.user.id);
        userData.suppressPings = !userData.suppressPings;

        await interaction.update({ 
            embeds: [embed], 
            components: Utils.combineComponents(components, linkButtons), 
            flags: MessageFlags.Ephemeral 
        });

        await interaction.followUp({
            content: `🔔 Pings đã ${userData.suppressPings ? 'tắt' : 'bật'}`,
            flags: MessageFlags.Ephemeral
        });
    },

    async removeField(interaction, embed, components, linkButtons) {
        if (!embed.data.fields?.length) {
            await interaction.reply({ 
                content: 'Không có field nào để xóa!', 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        const options = embed.data.fields.map((field, index) => ({
            label: field.name.substring(0, 100),
            description: field.value.substring(0, 100),
            value: index.toString()
        }));

        const menu = new StringSelectMenuBuilder()
            .setCustomId('removefield_select')
            .setPlaceholder('Chọn field để xóa')
            .addOptions(options);

        const response = await interaction.reply({ 
            content: 'Chọn field để xóa:', 
            components: [new ActionRowBuilder().addComponents(menu)], 
            flags: MessageFlags.Ephemeral,
            fetchReply: true
        });

        try {
            const selected = await response.awaitMessageComponent({ 
                filter: i => i.user.id === interaction.user.id,
                time: MODAL_TIMEOUT 
            });

            const index = parseInt(selected.values[0]);
            const fields = [...embed.data.fields];
            fields.splice(index, 1);
            embed.setFields(fields);

            await interaction.editReply({ 
                content: 'Đã xóa field!',
                embeds: [embed], 
                components: Utils.combineComponents(components, linkButtons), 
                flags: MessageFlags.Ephemeral 
            });
        } catch {
            await interaction.editReply({ 
                content: 'Đã hủy thao tác.', 
                components: [], 
                flags: MessageFlags.Ephemeral 
            });
        }
    },

    async removeLink(interaction, embed, linkButtons, components) {
        if (!linkButtons.length) {
            await interaction.reply({ 
                content: 'Không có link button nào để xóa!', 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        const options = linkButtons.map((btn, index) => ({
            label: btn.data.label,
            value: index.toString()
        }));

        const menu = new StringSelectMenuBuilder()
            .setCustomId('removelink_select')
            .setPlaceholder('Chọn link button để xóa')
            .addOptions(options);

        await interaction.reply({ 
            content: 'Chọn link button để xóa:', 
            components: [new ActionRowBuilder().addComponents(menu)], 
            flags: MessageFlags.Ephemeral 
        });

        const filter = i => i.user.id === interaction.user.id && i.customId === 'removelink_select';
        const collector = interaction.channel.createMessageComponentCollector({ 
            filter, 
            max: 1, 
            time: MODAL_TIMEOUT 
        });

        collector.on('collect', async i => {
            linkButtons.splice(parseInt(i.values[0]), 1);
            await i.update({ 
                embeds: [embed], 
                components: Utils.combineComponents(components, linkButtons), 
                flags: MessageFlags.Ephemeral 
            });
        });
    },

    async saveTemplate(interaction, embed, linkButtons) {
        await ModalHandlers.showModal(interaction, {
            id: 'save_template_modal',
            title: 'Lưu template',
            inputs: [
                new TextInputBuilder()
                    .setCustomId('templateName')
                    .setLabel('Tên template')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ]
        }, async (submit) => {
            const name = submit.fields.getTextInputValue('templateName');

            const exists = await EmbedTemplate.findOne({ name });
            if (exists) {
                await submit.reply({ 
                    content: 'Template đã tồn tại!', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            await new EmbedTemplate({
                name,
                embedData: embed.toJSON(),
                linkButtons: linkButtons.map(btn => btn.toJSON())
            }).save();

            await submit.reply({ 
                content: 'Đã lưu template!', 
                flags: MessageFlags.Ephemeral 
            });
        });
    },

    async loadTemplate(interaction, embed, components, linkButtons) {
        const index = parseInt(interaction.values[0].split('_')[1]);
        const templates = await EmbedTemplate.find().select('name');
        const template = await EmbedTemplate.findOne({ name: templates[index].name });

        if (template) {
            Object.assign(embed, new EmbedBuilder(template.embedData));
            linkButtons.splice(0, linkButtons.length, ...template.linkButtons.map(btn => ButtonBuilder.from(btn)));
            await interaction.update({ 
                embeds: [embed], 
                components: Utils.combineComponents(components, linkButtons), 
                flags: MessageFlags.Ephemeral 
            });
        }
    },

    async deleteTemplate(interaction) {
        const templates = await EmbedTemplate.find().select('name');
        if (!templates.length) {
            await interaction.reply({ 
                content: 'Không có template nào!', 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId('delete_template_select')
            .setPlaceholder('Chọn template để xóa')
            .addOptions(templates.map(t => ({ label: t.name, value: t.name })));

        await interaction.reply({ 
            content: 'Chọn template để xóa:', 
            components: [new ActionRowBuilder().addComponents(menu)], 
            flags: MessageFlags.Ephemeral 
        });

        const filter = i => i.user.id === interaction.user.id && i.customId === 'delete_template_select';
        const collector = interaction.channel.createMessageComponentCollector({ 
            filter, 
            time: 30000, 
            max: 1 
        });

        collector.on('collect', async i => {
            const result = await EmbedTemplate.deleteOne({ name: i.values[0] });
            await i.update({ 
                content: result.deletedCount > 0 ? 'Đã xóa template!' : 'Không tìm thấy template!', 
                components: [], 
                flags: MessageFlags.Ephemeral 
            });
        });
    },

    async post(interaction, embed, linkButtons, messageId) {
        const userData = Utils.getUserData(interaction.client, interaction.user.id);
        const { aboveText = '', aboveImageUrl = '', suppressPings = false } = userData;

        try {
            if (aboveImageUrl) {
                await interaction.channel.send({ content: aboveImageUrl });
            }

            const messageOptions = {
                content: aboveText,
                embeds: [embed],
                components: Utils.splitIntoRows(linkButtons),
                allowedMentions: suppressPings ? { parse: [] } : undefined
            };

            if (messageId) {
                const message = await interaction.channel.messages.fetch(messageId);
                await message.edit(messageOptions);
                await interaction.reply({ 
                    content: 'Đã chỉnh sửa embed!', 
                    flags: MessageFlags.Ephemeral 
                });
            } else {
                await interaction.channel.send(messageOptions);
                await interaction.reply({ 
                    content: 'Đã đăng embed!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            Utils.clearUserData(interaction.client, interaction.user.id);
        } catch (error) {
            console.error('Post embed error:', error);
            await interaction.reply({ 
                content: 'Có lỗi xảy ra khi đăng embed!', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
};

// ===== BUTTON ROUTER =====
async function handleButton(i, embed, components, linkButtons, messageId) {
    const [action] = i.customId.split('_');
    
    const handlers = {
        title: () => ModalHandlers.title(i, embed, components, linkButtons),
        description: () => ModalHandlers.description(i, embed, components, linkButtons),
        author: () => ModalHandlers.author(i, embed, components, linkButtons),
        footer: () => ModalHandlers.footer(i, embed, components, linkButtons),
        color: () => ModalHandlers.color(i, embed, components, linkButtons),
        thumbnail: () => ModalHandlers.thumbnail(i, embed, components, linkButtons),
        image: () => ModalHandlers.image(i, embed, components, linkButtons),
        timestamp: () => Actions.timestamp(i, embed, components, linkButtons),
        addfield: () => ModalHandlers.addField(i, embed, components, linkButtons),
        removefield: () => Actions.removeField(i, embed, components, linkButtons),
        addlink: () => ModalHandlers.addLink(i, embed, linkButtons, components),
        removelink: () => Actions.removeLink(i, embed, linkButtons, components),
        abovetext: () => ModalHandlers.aboveText(i, embed, components, linkButtons),
        aboveimage: () => ModalHandlers.aboveImage(i, embed, components, linkButtons),
        toggleping: () => Actions.togglePings(i, embed, components, linkButtons),
        save: () => Actions.saveTemplate(i, embed, linkButtons),
        loadtemplate: () => Actions.loadTemplate(i, embed, components, linkButtons),
        deletetemplate: () => Actions.deleteTemplate(i),
        post: () => Actions.post(i, embed, linkButtons, messageId)
    };

    const handler = handlers[action];
    if (handler) await handler();
}

// ===== MAIN COMMAND =====
module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Quản lý embeds')
        .addSubcommand(sub => sub
            .setName('create')
            .setDescription('Tạo embed mới'))
        .addSubcommand(sub => sub
            .setName('edit')
            .setDescription('Chỉnh sửa embed')
            .addStringOption(opt => opt
                .setName('messageid')
                .setDescription('ID của message cần chỉnh sửa')
                .setRequired(true))),
    
    category: 'Utility',
    
    async execute(interaction) {
        // Kiểm tra quyền
        const hasRole = interaction.member.roles.cache.some(r => 
            config.ModerationRoles.embed.includes(r.id)
        );
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!hasRole && !isAdmin) {
            return interaction.reply({ 
                content: lang.NoPermsMessage, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // Dừng interaction cũ nếu có
        const userId = interaction.user.id;
        if (activeInteractions.has(userId)) {
            activeInteractions.get(userId).stop();
        }

        // Khởi tạo embed
        let embed = new EmbedBuilder()
            .setAuthor({ name: 'Embed Builder' })
            .setColor(config.EmbedColors)
            .setDescription('Chào mừng đến với **Embed Builder**! Sử dụng các nút bên dưới để xây dựng embed.');

        let messageId = null;
        let linkButtons = [];

        // Load embed hiện tại nếu đang edit
        if (interaction.options.getSubcommand() === 'edit') {
            messageId = interaction.options.getString('messageid');
            try {
                const message = await interaction.channel.messages.fetch(messageId);
                if (message?.embeds[0]) {
                    embed = EmbedBuilder.from(message.embeds[0]);
                    linkButtons = message.components
                        .flatMap(row => row.components)
                        .filter(c => c.style === ButtonStyle.Link)
                        .map(c => ButtonBuilder.from(c));
                } else {
                    return interaction.reply({ 
                        content: 'Không tìm thấy message hoặc embed!', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } catch {
                return interaction.reply({ 
                    content: 'Không thể fetch message. Kiểm tra lại ID!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }

        // Tạo ID unique cho session
        const id = Date.now().toString();

        // Tạo các buttons chính
        const mainButtons = [
            new ButtonBuilder().setCustomId(`title_${id}`).setLabel('Tiêu đề').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`description_${id}`).setLabel('Mô Tả').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`author_${id}`).setLabel('Tác giả').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`footer_${id}`).setLabel('Chân Trang').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`timestamp_${id}`).setLabel('Dấu thời gian').setStyle(ButtonStyle.Secondary),

            new ButtonBuilder().setCustomId(`addfield_${id}`).setLabel('Thêm Trường').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`removefield_${id}`).setLabel('Xóa Trường').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`thumbnail_${id}`).setLabel('Hình thu nhỏ').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`image_${id}`).setLabel('Hình ảnh').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`color_${id}`).setLabel('Màu').setStyle(ButtonStyle.Secondary),

            new ButtonBuilder().setCustomId(`addlink_${id}`).setLabel('Thêm Liên kết').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`removelink_${id}`).setLabel('Xóa Liên kết').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`toggleping_${id}`).setLabel('Bật/Tắt Pings').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`abovetext_${id}`).setLabel('Văn bản Phía trên').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`aboveimage_${id}`).setLabel('Hình ảnh Phía trên').setStyle(ButtonStyle.Secondary),

            new ButtonBuilder().setCustomId(`save_${id}`).setLabel('Lưu Mẫu').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`deletetemplate_${id}`).setLabel('Xóa Mẫu').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`post_${id}`).setLabel('Đăng Embed').setStyle(ButtonStyle.Success)
        ];

        const components = Utils.splitIntoRows(mainButtons);

        // Thêm template selector nếu có templates
        const templates = await EmbedTemplate.find().select('name');
        if (templates.length > 0) {
            const menu = new StringSelectMenuBuilder()
                .setCustomId(`loadtemplate_${id}`)
                .setPlaceholder('Load template')
                .addOptions(templates.map((t, i) => ({ 
                    label: t.name, 
                    value: `template_${i}` 
                })));
            components.unshift(new ActionRowBuilder().addComponents(menu));
        }

        // Reply với embed builder
        await interaction.reply({ 
            embeds: [embed], 
            components: Utils.combineComponents(components, linkButtons), 
            flags: MessageFlags.Ephemeral 
        });

        // Tạo collector
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ 
            filter, 
            time: COLLECTOR_TIMEOUT 
        });

        activeInteractions.set(userId, collector);

        collector.on('collect', async i => {
            try {
                await handleButton(i, embed, components, linkButtons, messageId);
            } catch (error) {
                console.error('Button handler error:', error);
                if (!i.deferred && !i.replied) {
                    await i.reply({ 
                        content: 'Có lỗi xảy ra! Vui lòng thử lại.', 
                        flags: MessageFlags.Ephemeral 
                    }).catch(console.error);
                }
            }
        });

        collector.on('end', () => {
            activeInteractions.delete(userId);
        });
    },

    EmbedTemplate
};