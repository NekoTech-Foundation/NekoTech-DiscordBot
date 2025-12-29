
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getConfig } = require('../../../utils/configLoader.js');

const config = getConfig();

// Action configurations
const actions = {
    kiss: {
        emoji: '💋',
        message: 'Hun bạn nè',
        description: 'Gửi một nụ hôn nồng thắm cho ngày mới!',
        useApi: true
    },
    hug: {
        emoji: '🤗',
        message: 'gửi những cái ôm đến bạn',
        description: 'Gửi một cái ôm cho ai đó để làm ngày của họ tươi sáng hơn!',
        useApi: true
    },
    punch: {
        emoji: '👊',
        message: 'đấm',
        description: 'Đấm ai đó (chỉ để vui thôi!)',
        useApi: true
    },
    handhold: {
        emoji: '🤝',
        message: 'nắm tay',
        description: 'Nắm tay ai đó một cách dịu dàng',
        useApi: true
    },
    bite: {
        emoji: '😬',
        message: 'cắn',
        description: 'Cắn ai đó một cách vui vẻ',
        useApi: true
    },
    pat: {
        emoji: '👋',
        message: 'vỗ đầu',
        description: 'Vỗ đầu ai đó một cách trìu mến',
        useApi: true
    },
    slap: {
        emoji: '👋',
        message: 'tát',
        description: 'Tát ai đó (đùa thôi!)',
        useApi: true
    },
    fack: {
        emoji: '🖕',
        message: 'fack',
        description: 'Gửi Fack tới "đối thủ" của bạn',
        useApi: false
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('letme')
        .setDescription('🎭 Thực hiện hành động tương tác')
        .addSubcommand(subcommand =>
            subcommand
                .setName('kiss')
                .setDescription('💋 Gửi nụ hôn nồng thắm')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('👤 Người bạn muốn hôn')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hug')
                .setDescription('🤗 Gửi cái ôm ấm áp')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('👤 Người bạn muốn ôm')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('punch')
                .setDescription('👊 Đấm yêu (hoặc không yêu lắm)')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('👤 Người bạn muốn đấm')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('handhold')
                .setDescription('🤝 Nắm tay thân thiết')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('👤 Người bạn muốn nắm tay')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bite')
                .setDescription('😬 Cắn yêu một cái')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('👤 Người bạn muốn cắn')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pat')
                .setDescription('👋 Vỗ đầu cưng nựng')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('👤 Người bạn muốn vỗ đầu')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slap')
                .setDescription('👋 Tát một cái thật kêu')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('👤 Người bạn muốn tát')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('fack')
                .setDescription('🖕 Gửi lời chào thân ái (Fack)')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('👤 Người bạn muốn gửi lời chào')
                        .setRequired(true))),
    category: 'Fun',
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const target = interaction.options.getUser('target');
        const action = actions[subcommand];

        if (!action) {
            return await interaction.reply({
                content: '❌ Hành động không hợp lệ!',
                ephemeral: true
            });
        }

        // Special handling for fack command
        if (subcommand === 'fack') {
            // Check if the target is the bot
            if (target.id === client.user.id) {
                const embed = new EmbedBuilder()
                    .setDescription(`<@${interaction.user.id}> bro trying to fuck me? uno reverse and take a L bitch ez`)
                    .setColor(config.EmbedColors);

                return await interaction.reply({ embeds: [embed] });
            }

            // Normal case - target is another user
            const embed = new EmbedBuilder()
                .setDescription(`yo <@${target.id}> get a fuck from <@${interaction.user.id}>`)
                .setColor(config.EmbedColors);

            return await interaction.reply({ embeds: [embed] });
        }

        // Reply immediately with a loading message for API-based actions
        await interaction.reply({
            content: `${action.emoji} Đang chuẩn bị...`,
            fetchReply: true
        });

        try {
            // Fetch a random GIF from nekos.best API
            const response = await fetch(`https://nekos.best/api/v2/${subcommand}`);

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            const data = await response.json();

            // Extract the GIF URL from the API response
            const gifUrl = data.results[0].url;

            const embed = new EmbedBuilder()
                .setDescription(`<@${interaction.user.id}> ${action.message} <@${target.id}>.`)
                .setImage(gifUrl)
                .setColor(config.EmbedColors);

            await interaction.editReply({ content: null, embeds: [embed] });
        } catch (error) {
            console.error(`Error fetching ${subcommand} GIF:`, error);

            const errorEmbed = new EmbedBuilder()
                .setDescription('❌ Không thể tải GIF. Vui lòng thử lại!')
                .setColor('#FF0000');

            try {
                await interaction.editReply({ content: null, embeds: [errorEmbed] });
            } catch (editError) {
                console.error('Failed to edit reply:', editError);
            }
        }
    }
};
