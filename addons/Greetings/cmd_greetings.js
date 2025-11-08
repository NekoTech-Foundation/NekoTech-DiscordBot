const { SlashCommandBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const Greetings = require('../../models/Greetings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('greetings')
        .setDescription('Cấu hình tin nhắn chào mừng và tạm biệt.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome')
                .setDescription('Cấu hình tin nhắn chào mừng.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Kênh để gửi tin nhắn chào mừng.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('goodbye')
                .setDescription('Cấu hình tin nhắn tạm biệt.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Kênh để gửi tin nhắn tạm biệt.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome-clear')
                .setDescription('Xóa tin nhắn chào mừng.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('goodbye-clear')
                .setDescription('Xóa tin nhắn tạm biệt.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome-test')
                .setDescription('Kiểm tra tin nhắn chào mừng.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('goodbye-test')
                .setDescription('Kiểm tra tin nhắn tạm biệt.')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'welcome') {
            const channel = interaction.options.getChannel('channel');

            const modal = new ModalBuilder()
                .setCustomId(`welcome-modal-${channel.id}`)
                .setTitle('Đặt tin nhắn chào mừng');

            const messageInput = new TextInputBuilder()
                .setCustomId('welcome-message')
                .setLabel('Tin nhắn chào mừng')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Xin chào {user_mention}, chào mừng đến với {server_name}!')
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(messageInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        } else if (subcommand === 'goodbye') {
            const channel = interaction.options.getChannel('channel');

            const modal = new ModalBuilder()
                .setCustomId(`goodbye-modal-${channel.id}`)
                .setTitle('Đặt tin nhắn tạm biệt');

            const messageInput = new TextInputBuilder()
                .setCustomId('goodbye-message')
                .setLabel('Tin nhắn tạm biệt')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Tạm biệt {user}, chúng tôi hy vọng bạn sẽ sớm quay lại!')
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(messageInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        } else if (subcommand === 'welcome-clear') {
            await Greetings.findOneAndUpdate({ guildId }, { welcomeMessage: null, welcomeChannel: null });
            await interaction.reply({ content: 'Đã xóa tin nhắn chào mừng.', ephemeral: true });
        } else if (subcommand === 'goodbye-clear') {
            await Greetings.findOneAndUpdate({ guildId }, { goodbyeMessage: null, goodbyeChannel: null });
            await interaction.reply({ content: 'Đã xóa tin nhắn tạm biệt.', ephemeral: true });
        } else if (subcommand === 'welcome-test') {
            const settings = await Greetings.findOne({ guildId });
            if (!settings || !settings.welcomeMessage || !settings.welcomeChannel) {
                return interaction.reply({ content: 'Tin nhắn chào mừng chưa được cấu hình.', ephemeral: true });
            }

            const channel = interaction.guild.channels.cache.get(settings.welcomeChannel);
            if (!channel) {
                return interaction.reply({ content: 'Không tìm thấy kênh chào mừng.', ephemeral: true });
            }

            const member = interaction.member;
            const welcomeMessage = settings.welcomeMessage
                .replace('{user_mention}', member.toString())
                .replace('{user_name}', member.user.username)
                .replace('{user_tag}', member.user.tag)
                .replace('{server_name}', interaction.guild.name)
                .replace('{server_membercount}', interaction.guild.memberCount);

            try {
                await channel.send(welcomeMessage);
                await interaction.reply({ content: 'Đã gửi tin nhắn chào mừng thử.', ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Không thể gửi tin nhắn thử. Vui lòng kiểm tra quyền của tôi trong kênh chào mừng.', ephemeral: true });
            }
        } else if (subcommand === 'goodbye-test') {
            const settings = await Greetings.findOne({ guildId });
            if (!settings || !settings.goodbyeMessage || !settings.goodbyeChannel) {
                return interaction.reply({ content: 'Tin nhắn tạm biệt chưa được cấu hình.', ephemeral: true });
            }

            const channel = interaction.guild.channels.cache.get(settings.goodbyeChannel);
            if (!channel) {
                return interaction.reply({ content: 'Không tìm thấy kênh tạm biệt.', ephemeral: true });
            }

            const member = interaction.member;
            const goodbyeMessage = settings.goodbyeMessage
                .replace('{user_mention}', member.toString())
                .replace('{user_name}', member.user.username)
                .replace('{user_tag}', member.user.tag)
                .replace('{server_name}', interaction.guild.name)
                .replace('{server_membercount}', interaction.guild.memberCount);

            try {
                await channel.send(goodbyeMessage);
                await interaction.reply({ content: 'Đã gửi tin nhắn tạm biệt thử.', ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Không thể gửi tin nhắn thử. Vui lòng kiểm tra quyền của tôi trong kênh tạm biệt.', ephemeral: true });
            }
        }
    },
};
