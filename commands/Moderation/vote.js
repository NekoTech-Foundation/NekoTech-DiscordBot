const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags, ChannelType } = require('discord.js');
const VotingSession = require('../../models/VotingSession');
const VotingConfig = require('../../models/VotingConfig');
const Poll = require('../../models/poll'); // Keep for migration or compatibility
const { getConfig } = require('../../utils/configLoader.js');
const config = getConfig();
const { v4: uuidv4 } = require('uuid');

function getNumberEmoji(number) {
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return numberEmojis[number - 1];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('Hệ thống bầu chọn và tạo Poll')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Tạo một cuộc bình chọn (Poll) đơn giản')
                .addStringOption(option => option.setName('question').setDescription('Câu hỏi').setRequired(true))
                .addStringOption(option => option.setName('choices').setDescription('Các lựa chọn (cách nhau bằng dấu phẩy)').setRequired(true))
                .addBooleanOption(option => option.setName('multivote').setDescription('Cho phép chọn nhiều').setRequired(false))
        )
        .addSubcommandGroup(group =>
            group
                .setName('session')
                .setDescription('Quản lý phiên bầu chọn')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('setup')
                        .setDescription('Thiết lập phiên bầu chọn')
                        .addChannelOption(option => option.setName('channel').setDescription('Kênh diễn ra bầu chọn').addChannelTypes(ChannelType.GuildText).setRequired(true))
                        .addStringOption(option => option.setName('from_message').setDescription('ID tin nhắn bắt đầu (đếm các tin nhắn SAU tin nhắn này)').setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('end')
                        .setDescription('Kết thúc phiên bầu chọn hiện tại')
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('configuration')
                .setDescription('Xem và chỉnh sửa cấu hình bầu chọn')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('Xem lịch sử phiên vote')
                .addStringOption(option => option.setName('session').setDescription('ID của phiên (UUID)').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('statistics')
                .setDescription('Xem thống kê hiện tại')
        ),
    category: 'Moderation',
    async execute(interaction, lang) {
        const client = interaction.client;
        const requiredRoles = config.ModerationRoles?.poll || []; // Reuse poll roles
        const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
        const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!hasPermission && !isAdministrator) {
            return interaction.reply({ content: 'Bạn không có quyền sử dụng lệnh này.', flags: MessageFlags.Ephemeral });
        }

        const subcommand = interaction.options.getSubcommand();
        const subcommandGroup = interaction.options.getSubcommandGroup();

        if (subcommand === 'create') {
            await handleCreate(interaction);
        } else if (subcommandGroup === 'session') {
            if (subcommand === 'setup') {
                await handleSessionSetup(interaction);
            } else if (subcommand === 'end') {
                await handleSessionEnd(interaction);
            }
        } else if (subcommand === 'configuration') {
            await handleConfiguration(interaction);
        } else if (subcommand === 'history') {
            await handleHistory(interaction);
        } else if (subcommand === 'statistics') {
            await handleStatistics(interaction);
        }
    }
};

async function handleCreate(interaction) {
    const question = interaction.options.getString('question');
    const choicesString = interaction.options.getString('choices');
    const choices = choicesString.split(',').map(choice => choice.trim());
    const multiVote = interaction.options.getBoolean('multivote') || false;

    if (choices.length < 2 || choices.length > 10) {
        return interaction.reply({ content: 'Bạn phải cung cấp từ 2 đến 10 lựa chọn.', flags: MessageFlags.Ephemeral });
    }

    const userDisplayName = interaction.member.displayName;
    const userIcon = interaction.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });

    const pollEmbed = new EmbedBuilder()
        .setAuthor({ name: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL({ format: 'png', dynamic: true }) })
        .setTitle(question)
        .setColor(config.EmbedColors?.Default || '#0099ff')
        .setFooter({ text: `Cuộc thăm dò được tạo bởi ${userDisplayName}`, iconURL: userIcon });

    let description = '';
    choices.forEach((choice, index) => {
        const emoji = getNumberEmoji(index + 1);
        description += `${emoji} ${choice} (0 phiếu)\n`;
    });
    pollEmbed.setDescription(description);

    try {
        const message = await interaction.reply({ embeds: [pollEmbed], fetchReply: true });

        const pollData = {
            messageId: message.id,
            channelId: message.channel.id,
            question: question,
            authorId: interaction.user.id,
            choices: choices.map((choice, index) => ({
                name: choice,
                votes: 0,
                emoji: getNumberEmoji(index + 1),
            })),
            multiVote: multiVote
        };

        for (let i = 0; i < choices.length; i++) {
            await message.react(pollData.choices[i].emoji);
        }

        await Poll.create(pollData);
        interaction.client.polls.set(message.id, pollData); // Assuming cache exists
    } catch (error) {
        console.error('Error creating poll:', error);
        await interaction.editReply({ content: 'Lỗi khi tạo poll.' });
    }
}

async function handleSessionSetup(interaction) {
    const channel = interaction.options.getChannel('channel');
    const startMessageId = interaction.options.getString('from_message');
    const guildId = interaction.guild.id;

    // Check if session already exists
    const existingSession = await VotingSession.findOne({ guildId, channelId: channel.id, status: 'ACTIVE' });
    if (existingSession) {
        return interaction.reply({ content: `Đang có một phiên bầu chọn hoạt động tại <#${channel.id}>. Vui lòng kết thúc nó trước.`, flags: MessageFlags.Ephemeral });
    }

    // Get Defaults or use hardcoded basics for now (can expand to fetch VotingConfig)
    const defaultConfig = {
        countingMethod: 'REACTION_COUNT',
        allowSelfVote: true,
        allowBotVote: false
    };

    const newSession = {
        sessionId: uuidv4(),
        guildId,
        channelId: channel.id,
        startMessageId,
        startTime: Date.now(),
        status: 'ACTIVE',
        config: defaultConfig,
        votes: {}
    };

    await VotingSession.create(newSession);
    await interaction.reply({
        content: `✅ Đã thiết lập phiên bầu chọn tại ${channel}.\nTính phiếu từ sau tin nhắn ID: \`${startMessageId}\`.\nSử dụng \`/vote session end\` để kết thúc và xem kết quả.`
    });
}

async function handleSessionEnd(interaction) {
    const guildId = interaction.guild.id;
    // Find active session in CURRENT channel or ask appropriately? 
    // Usually commands are run in the context of the event.
    // Let's assume current channel or search for ANY active in guild?
    // User request: "/voting session end - Kết thúc phiên bầu chọn của máy chủ". Implies global or context sensitive.
    // Let's try current channel first.

    let session = await VotingSession.findOne({ guildId, channelId: interaction.channelId, status: 'ACTIVE' });
    if (!session) {
        // Fallback: Check if there's only ONE active session for the guild
        const allSessions = await VotingSession.find({ guildId, status: 'ACTIVE' });
        if (allSessions.length === 1) {
            session = allSessions[0];
        } else if (allSessions.length > 1) {
            return interaction.reply({ content: 'Có nhiều phiên đang chạy. Vui lòng dùng lệnh này trong kênh diễn ra bầu chọn.', flags: MessageFlags.Ephemeral });
        } else {
            return interaction.reply({ content: 'Không có phiên bầu chọn nào đang diễn ra.', flags: MessageFlags.Ephemeral });
        }
    }

    await interaction.deferReply();

    // Calculate Results
    const channel = await interaction.guild.channels.fetch(session.channelId);
    if (!channel) {
        await VotingSession.findOneAndUpdate({ sessionId: session.sessionId }, { status: 'ENDED', endTime: Date.now() });
        return interaction.editReply('Không tìm thấy kênh bầu chọn. Đã buộc kết thúc phiên.');
    }

    // Fetch messages after startMessageId
    let messages = [];
    let lastId = session.startMessageId;
    let keepFetching = true;

    // Discord API limits fetch to 100. Need loop.
    // CAUTION: Large loop risks timeout.
    // For now, fetch up to 500? Or just loop until end. 
    // Implementing a safe limit of 500 messages to prevent bot hanging.
    let count = 0;
    while (keepFetching && count < 5) { // 5 batches of 100 = 500 msgs
        const fetched = await channel.messages.fetch({ limit: 100, after: lastId });
        if (fetched.size === 0) {
            keepFetching = false;
        } else {
            fetched.forEach(msg => messages.push(msg));
            lastId = fetched.first().id; // 'after' fetches newer, so first() is newest? No, collection is Map.
            // When using 'after', messages are returned. map key is ID.
            // We need the largest ID for the next 'after'.
            // Discord JS collection order... defaults to sorted by key usually?
            // Actually, verify sort.
            // Just use the last one in the collection (which should be the newest if default sort, but 'after' returns oldest to newest? No, 'after' X returns X+1, X+2...)
            // Let's simply sort them to be sure.
            const sorted = fetched.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
            lastId = sorted.last().id;
            count++;
        }
    }

    // Tally votes
    const results = [];
    for (const msg of messages) {
        // Filter out bot messages if configured
        if (!session.config.allowBotVote && msg.author.bot) continue;

        let score = 0;
        // Basic Counting: Reaction Count
        // Check reactions
        const reactionCount = msg.reactions.cache.reduce((acc, r) => acc + r.count, 0);
        // Correct for bot's reaction? self reaction? 
        // We already enforced cleaner reactions via event handler, so count should be relatively accurate.
        // Minus 1 for each reaction if self-vote is off but user reacted? Handler removes it.
        // But count includes the reactor.
        score = reactionCount;

        if (score > 0 || !session.config.ignoreZeroVote) {
            results.push({
                messageId: msg.id,
                authorId: msg.author.id,
                content: msg.content,
                score: score,
                link: msg.url
            });
        }
    }

    // Sort results
    results.sort((a, b) => b.score - a.score);

    // Save stats
    await VotingSession.findOneAndUpdate(
        { sessionId: session.sessionId },
        {
            status: 'ENDED',
            endTime: Date.now(),
            stats: { totalCandidates: results.length, topWinner: results[0] || null }
        }
    );

    // Display Top 10
    const top10 = results.slice(0, 10);
    const resultEmbed = new EmbedBuilder()
        .setTitle('🏆 Kết Quả Bầu Chọn')
        .setColor('Gold')
        .setDescription(`Phiên bầu chọn tại ${channel} đã kết thúc.\nDưới đây là Top 10:`);

    top10.forEach((r, i) => {
        resultEmbed.addFields({
            name: `#${i + 1} - <@${r.authorId}> (${r.score} phiếu)`,
            value: `[Xem tin nhắn](${r.link}) | ID: ${r.messageId}`
        });
    });

    await interaction.editReply({ embeds: [resultEmbed] });
}

async function handleConfiguration(interaction) {
    const handler = require('../../utils/Vote/configHandler');
    await handler.handleInteraction(interaction, interaction.client);
}

async function handleHistory(interaction) {
    const sessionId = interaction.options.getString('session');
    const session = await VotingSession.findOne({ sessionId });

    if (!session) return interaction.reply({ content: 'Không tìm thấy phiên bầu chọn.', flags: MessageFlags.Ephemeral });

    const stats = session.stats || {};
    const embed = new EmbedBuilder()
        .setTitle('Lịch Sử Bầu Chọn')
        .addFields(
            { name: 'Session ID', value: session.sessionId },
            { name: 'Trạng thái', value: session.status },
            { name: 'Bắt đầu', value: `<t:${Math.floor(session.startTime / 1000)}:F>` },
            { name: 'Kết thúc', value: session.endTime ? `<t:${Math.floor(session.endTime / 1000)}:F>` : 'Chưa kết thúc' },
            { name: 'Winner', value: stats.topWinner ? `<@${stats.topWinner.authorId}> (${stats.topWinner.score} phiếu)` : 'N/A' }
        );

    await interaction.reply({ embeds: [embed] });
}

async function handleStatistics(interaction) {
    // Current active session stats
    const guildId = interaction.guild.id;
    const session = await VotingSession.findOne({ guildId, status: 'ACTIVE' }); // Simplification

    if (!session) return interaction.reply({ content: 'Không có phiên bầu chọn nào đang diễn ra.', flags: MessageFlags.Ephemeral });

    await interaction.reply({ content: `Thống kê phiên hiện tại:\nBắt đầu: <t:${Math.floor(session.startTime / 1000)}:R>\nSố người tham gia: ${Object.keys(session.votes).length} (ước tính)`, flags: MessageFlags.Ephemeral });
}
