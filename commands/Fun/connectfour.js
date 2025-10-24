const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { createCanvas } = require('canvas');
const { getConfig, getLang } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('connectfour')
        .setDescription('Chơi Connect Four với bot hoặc người chơi khác!')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Chọn loại trò chơi')
                .setRequired(true)
                .addChoices(
                    { name: 'Bot', value: 'bot' },
                    { name: 'Người chơi', value: 'player' }
                )
        )
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Chọn độ khó (chỉ dành cho bot)')
                .addChoices(
                    { name: 'Dễ', value: 'easy' },
                    { name: 'Trung bình', value: 'medium' },
                    { name: 'Khó', value: 'hard' }
                )
        )
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('Chọn một đối thủ (bắt buộc nếu chơi với người khác)')
        )
        .setDMPermission(false),
    category: 'Fun',
    async execute(interaction) {
        try {
            const gameType = interaction.options.getString('type');
            const opponent = interaction.options.getUser('opponent');
            const difficulty = interaction.options.getString('difficulty') || 'medium';

            if (gameType === 'player' && !opponent) {
                return interaction.reply({ content: 'Bạn phải chỉ định một đối thủ khi chơi với người chơi khác.', ephemeral: true });
            }

            if (gameType === 'player') {
                await requestOpponentConfirmation(interaction, opponent, difficulty);
            } else {
                await startGame(interaction, gameType, opponent, difficulty);
            }
        } catch (error) {
            console.error('Lỗi khi thực hiện lệnh:', error);
            await interaction.reply({ content: 'Đã xảy ra lỗi khi bắt đầu trò chơi. Vui lòng thử lại sau.', ephemeral: true });
        }
    },
};

async function requestOpponentConfirmation(interaction, opponent, difficulty) {
    const confirmationEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Yêu cầu chơi Connect Four')
        .setDescription(`<@${interaction.user.id}> đã thách đấu bạn một ván Connect Four. Bạn có chấp nhận không?`)
        .setFooter({ text: 'Yêu cầu này sẽ hết hạn sau 60 giây.' });

    const confirmButton = new ButtonBuilder()
        .setCustomId('accept_game')
        .setLabel('Chấp nhận')
        .setStyle(ButtonStyle.Success);

    const declineButton = new ButtonBuilder()
        .setCustomId('decline_game')
        .setLabel('Từ chối')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(confirmButton, declineButton);

    const reply = await interaction.reply({
        content: `<@${opponent.id}>, bạn đã được thách đấu một ván Connect Four!`,
        embeds: [confirmationEmbed],
        components: [row],
        fetchReply: true
    });

    const collector = reply.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
        if (i.user.id !== opponent.id) {
            await i.reply({ content: 'Xác nhận này không dành cho bạn.', ephemeral: true });
            return;
        }

        if (i.customId === 'accept_game') {
            await i.update({ content: 'Trò chơi được chấp nhận! Bắt đầu ngay...', components: [] });
            await startGame(interaction, 'player', opponent, difficulty);
        } else if (i.customId === 'decline_game') {
            await i.update({ content: 'Trò chơi bị từ chối.', components: [] });
            await interaction.followUp({ content: `<@${opponent.id}> đã từ chối trò chơi.` });
        }

        collector.stop();
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            await interaction.editReply({ content: 'Yêu cầu chơi đã hết hạn.', components: [] });
        }
    });
}

// ... (The rest of the file remains the same as it is game logic)
