const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Cấu hình cài đặt của bot cho máy chủ này.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommandGroup(group =>
            group
                .setName('log')
                .setDescription('Cấu hình kênh log.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('set')
                        .setDescription('Đặt một kênh log cho một loại log cụ thể.')
                        .addStringOption(option =>
                            option.setName('log-type')
                                .setDescription('Loại log để đặt kênh.')
                                .setRequired(true)
                                .addChoices({ name: 'Ban', value: 'ban' }, { name: 'Unban', value: 'unban' }))
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('Kênh để gửi log.')
                                .setRequired(true))
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('welcome')
                .setDescription('Cấu hình tin nhắn chào mừng.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('set-channel')
                        .setDescription('Đặt kênh cho tin nhắn chào mừng.')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('Kênh để gửi tin nhắn chào mừng.')
                                .setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('set-message')
                        .setDescription('Đặt tin nhắn chào mừng. Dùng {user} và {guildName}.')
                        .addStringOption(option =>
                            option.setName('message')
                                .setDescription('Nội dung tin nhắn chào mừng.')
                                .setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('enable')
                        .setDescription('Bật tin nhắn chào mừng.')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('disable')
                        .setDescription('Tắt tin nhắn chào mừng.')
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('leave')
                .setDescription('Cấu hình tin nhắn tạm biệt.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('set-channel')
                        .setDescription('Đặt kênh cho tin nhắn tạm biệt.')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('Kênh để gửi tin nhắn tạm biệt.')
                                .setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('set-message')
                        .setDescription('Đặt tin nhắn tạm biệt. Dùng {user} và {guildName}.')
                        .addStringOption(option =>
                            option.setName('message')
                                .setDescription('Nội dung tin nhắn tạm biệt.')
                                .setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('enable')
                        .setDescription('Bật tin nhắn tạm biệt.')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('disable')
                        .setDescription('Tắt tin nhắn tạm biệt.')
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('ticket')
                .setDescription('Cấu hình hệ thống ticket.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('create-panel')
                        .setDescription('Tạo một bảng điều khiển ticket mới.')
                        .addStringOption(option => option.setName('name').setDescription('Tên của bảng điều khiển').setRequired(true))
                        .addChannelOption(option => option.setName('channel').setDescription('Kênh để gửi bảng điều khiển').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('create-category')
                        .setDescription('Tạo một danh mục ticket mới.')
                        .addStringOption(option => option.setName('name').setDescription('Tên của danh mục').setRequired(true))
                        .addChannelOption(option => option.setName('category').setDescription('Kênh danh mục để tạo ticket').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add-category-to-panel')
                        .setDescription('Thêm một danh mục vào bảng điều khiển ticket.')
                        .addStringOption(option => option.setName('panel-name').setDescription('Tên của bảng điều khiển').setRequired(true).setAutocomplete(true))
                        .addStringOption(option => option.setName('category-name').setDescription('Tên của danh mục').setRequired(true).setAutocomplete(true))
                )
        ),
    category: 'Utility',
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const guildSettings = await GuildSettings.findOne({ guildId: interaction.guild.id });
        if (!guildSettings || !guildSettings.tickets) return;

        if (focusedOption.name === 'panel-name') {
            const choices = guildSettings.tickets.panels.map(panel => panel.name);
            const filtered = choices.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice })),
            );
        } else if (focusedOption.name === 'category-name') {
            const choices = guildSettings.tickets.categories.map(cat => cat.name);
            const filtered = choices.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice })),
            );
        }
    },
    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        const allowedGuildId = "1388889326309605488";
        if (group === 'ticket' && interaction.guild.id !== allowedGuildId) {
            return interaction.reply({ content: 'Tính năng ticket chỉ có sẵn trên một máy chủ cụ thể.', ephemeral: true });
        }

        if (group === 'ticket') {
            if (subcommand === 'create-panel') {
                const name = interaction.options.getString('name');
                const channel = interaction.options.getChannel('channel');

                const guildSettings = await GuildSettings.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { $push: { 'tickets.panels': { name: name, channelId: channel.id } } },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                await interaction.reply({ content: `Đã tạo bảng điều khiển ticket \`${name}\` trong ${channel}.`, ephemeral: true });
            } else if (subcommand === 'create-category') {
                const name = interaction.options.getString('name');
                const categoryChannel = interaction.options.getChannel('category');

                await GuildSettings.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { $push: { 'tickets.categories': { name: name, categoryId: categoryChannel.id } } },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                await interaction.reply({ content: `Đã tạo danh mục ticket \`${name}\`.`, ephemeral: true });
            } else if (subcommand === 'add-category-to-panel') {
                const panelName = interaction.options.getString('panel-name');
                const categoryName = interaction.options.getString('category-name');

                const guildSettings = await GuildSettings.findOne({ guildId: interaction.guild.id });
                const panel = guildSettings.tickets.panels.find(p => p.name === panelName);
                const category = guildSettings.tickets.categories.find(c => c.name === categoryName);

                if (!panel || !category) {
                    return interaction.reply({ content: 'Không tìm thấy bảng điều khiển hoặc danh mục.', ephemeral: true });
                }

                await GuildSettings.updateOne(
                    { guildId: interaction.guild.id, 'tickets.panels.name': panelName },
                    { $addToSet: { 'tickets.panels.$.categories': category._id } }
                );

                // Now, send/update the panel message
                const panelChannel = await interaction.guild.channels.fetch(panel.channelId);
                if (panelChannel) {
                    const panelData = guildSettings.tickets.panels.find(p => p.name === panelName);
                    const categories = guildSettings.tickets.categories.filter(c => panelData.categories.includes(c._id));

                    const embed = new EmbedBuilder()
                        .setTitle(panel.embed.title)
                        .setDescription(panel.embed.description)
                        .setColor(panel.embed.color);

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId(`ticket-panel-${panel._id}`)
                        .setPlaceholder('Chọn một danh mục để mở ticket')
                        .addOptions(categories.map(c => ({
                            label: c.name,
                            value: c.name,
                        })));

                    const row = new ActionRowBuilder().addComponents(selectMenu);

                    if (panel.messageId) {
                        const oldMessage = await panelChannel.messages.fetch(panel.messageId).catch(() => null);
                        if (oldMessage) {
                            await oldMessage.edit({ embeds: [embed], components: [row] });
                        } else {
                            const message = await panelChannel.send({ embeds: [embed], components: [row] });
                            await GuildSettings.updateOne({ guildId: interaction.guild.id, 'tickets.panels.name': panelName }, { 'tickets.panels.$.messageId': message.id });
                        }
                    } else {
                        const message = await panelChannel.send({ embeds: [embed], components: [row] });
                        await GuildSettings.updateOne({ guildId: interaction.guild.id, 'tickets.panels.name': panelName }, { 'tickets.panels.$.messageId': message.id });
                    }
                }

                await interaction.reply({ content: `Đã thêm danh mục \`${categoryName}\` vào bảng điều khiển \`${panelName}\`.`, ephemeral: true });
            }
        }
        // ... (other command groups)
    }
};