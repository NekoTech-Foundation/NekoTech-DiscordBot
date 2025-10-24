const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags } = require('discord.js');
const { createCanvas } = require('canvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('2048')
        .setDescription('Chơi game "2048"'),
    category: 'Fun',
    async execute(interaction) {
        try {
            const game = new Game2048();
            await interaction.deferReply();
            await updateGame(interaction, game);

            const filter = i => i.user.id === interaction.user.id && i.message.interaction.id === interaction.id;
            
            const message = await interaction.fetchReply();
            
            const collector = message.createMessageComponentCollector({
                filter,
                time: 900000
            });

            collector.on('collect', async i => {
                try {
                    if (i.user.id !== interaction.user.id) {
                        await i.reply({
                            content: `Trò chơi này thuộc về ${interaction.user}. Bắt đầu trò chơi của riêng bạn bằng cách sử dụng 
/2048!`, 
                            ephemeral: true 
                        });
                        return;
                    }

                    const direction = i.customId.replace('2048_', '');
                    const moved = game.move(direction);
                    if (moved) {
                        game.addNewTile();
                    }

                    if (game.isGameOver()) {
                        try {
                            await updateGame(interaction, game, true);
                        } catch (error) {
                            if (error.code === 50027) {
                                await i.followUp({
                                    content: `Trò chơi kết thúc!
Điểm cuối cùng: ${game.score}
Ô cao nhất: ${game.highestTile}`,
                                    ephemeral: true
                                });
                            } else {
                                throw error;
                            }
                        }
                        collector.stop();
                        return;
                    }

                    const { embed, file } = await createGameEmbed(game);
                    try {
                        await i.update({
                            embeds: [embed],
                            files: [file],
                            components: createGameButtons(false)
                        });
                    } catch (error) {
                        if (error.code === 50027) {
                            collector.stop('token_expired');
                            await i.followUp({
                                content: 'Phiên trò chơi đã hết hạn. Bắt đầu một trò chơi mới bằng cách sử dụng /2048!',
                                ephemeral: true
                            });
                        } else {
                            throw error;
                        }
                    }
                } catch (error) {
                    console.error('Lỗi trong tương tác trò chơi 2048:', error);
                    try {
                        await i.followUp({
                            content: 'Đã xảy ra lỗi trong quá trình chơi. Bạn có thể cần phải bắt đầu một trò chơi mới.',
                            ephemeral: true
                        });
                    } catch (e) {
                        console.error('Lỗi khi gửi tin nhắn lỗi:', e);
                    }
                }
            });

            collector.on('end', async (collected, reason) => {
                try {
                    if (reason === 'time') {
                        const { embed, file } = await createGameEmbed(game);
                        embed.setDescription(`Trò chơi kết thúc - Hết giờ!
Điểm cuối cùng: ${game.score}
Ô cao nhất: ${game.highestTile}`);
                        await interaction.editReply({
                            embeds: [embed],
                            files: [file],
                            components: createGameButtons(true)
                        });
                    } else if (reason === 'token_expired') {
                        return;
                    }
                } catch (error) {
                    if (error.code !== 50027) {
                        console.error('Lỗi khi kết thúc trò chơi 2048:', error);
                    }
                }
            });

        } catch (error) {
            console.error('Lỗi trong lệnh 2048:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Đã xảy ra lỗi khi bắt đầu trò chơi!', ephemeral: true });
            } else {
                await interaction.editReply({ content: 'Đã xảy ra lỗi trong quá trình chơi!', components: [] });
            }
        }
    }
};

// ... (Game logic remains the same)
