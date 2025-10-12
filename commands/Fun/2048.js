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
                            content: `This game belongs to ${interaction.user}. Start your own game using \`/2048\`!`,
                            flags: MessageFlags.Ephemeral 
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
                                    content: `Game Over!\nFinal Score: ${game.score}\nHighest Tile: ${game.highestTile}`,
                                    flags: MessageFlags.Ephemeral
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
                                content: 'The game session has expired. Start a new game using `/2048`!',
                                flags: MessageFlags.Ephemeral
                            });
                        } else {
                            throw error;
                        }
                    }
                } catch (error) {
                    console.error('Error in 2048 game interaction:', error);
                    try {
                        await i.followUp({
                            content: 'An error occurred during the game. You may need to start a new game.',
                            flags: MessageFlags.Ephemeral
                        });
                    } catch (e) {
                        console.error('Error sending error message:', e);
                    }
                }
            });

            collector.on('end', async (collected, reason) => {
                try {
                    if (reason === 'time') {
                        const { embed, file } = await createGameEmbed(game);
                        embed.setDescription(`Game Over - Time's up!\nFinal Score: ${game.score}\nHighest Tile: ${game.highestTile}`);
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
                        console.error('Error ending 2048 game:', error);
                    }
                }
            });

        } catch (error) {
            console.error('Error in 2048 command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'There was an error starting the game!', flags: MessageFlags.Ephemeral });
            } else {
                await interaction.editReply({ content: 'There was an error during the game!', components: [] });
            }
        }
    }
};

class Game2048 {
    constructor() {
        this.grid = Array(4).fill().map(() => Array(4).fill(0));
        this.score = 0;
        this.highestTile = 0;
        this.addNewTile();
        this.addNewTile();
    }

    addNewTile() {
        const emptyCells = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.grid[i][j] === 0) {
                    emptyCells.push({ x: i, y: j });
                }
            }
        }
        if (emptyCells.length > 0) {
            const { x, y } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[x][y] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    move(direction) {
        let moved = false;
        const oldGrid = JSON.stringify(this.grid);

        const mergedCells = Array(4).fill().map(() => Array(4).fill(false));

        switch (direction) {
            case 'up':
                moved = this.moveUp(mergedCells);
                break;
            case 'down':
                moved = this.moveDown(mergedCells);
                break;
            case 'left':
                moved = this.moveLeft(mergedCells);
                break;
            case 'right':
                moved = this.moveRight(mergedCells);
                break;
        }

        this.updateHighestTile();

        return moved && oldGrid !== JSON.stringify(this.grid);
    }

    updateHighestTile() {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.grid[i][j] > this.highestTile) {
                    this.highestTile = this.grid[i][j];
                }
            }
        }
    }

    moveLeft(mergedCells) {
        let moved = false;
        for (let i = 0; i < 4; i++) {
            let pos = 0;
            for (let j = 0; j < 4; j++) {
                if (this.grid[i][j] !== 0) {
                    if (pos !== j) {
                        this.grid[i][pos] = this.grid[i][j];
                        this.grid[i][j] = 0;
                        moved = true;
                    }
                    if (pos > 0 && this.grid[i][pos] === this.grid[i][pos - 1] && !mergedCells[i][pos - 1]) {
                        this.grid[i][pos - 1] *= 2;
                        this.score += this.grid[i][pos - 1];
                        this.grid[i][pos] = 0;
                        mergedCells[i][pos - 1] = true;
                        pos--;
                        moved = true;
                    }
                    pos++;
                }
            }
        }
        return moved;
    }

    moveRight(mergedCells) {
        let moved = false;
        for (let i = 0; i < 4; i++) {
            let pos = 3;
            for (let j = 3; j >= 0; j--) {
                if (this.grid[i][j] !== 0) {
                    if (pos !== j) {
                        this.grid[i][pos] = this.grid[i][j];
                        this.grid[i][j] = 0;
                        moved = true;
                    }
                    if (pos < 3 && this.grid[i][pos] === this.grid[i][pos + 1] && !mergedCells[i][pos + 1]) {
                        this.grid[i][pos + 1] *= 2;
                        this.score += this.grid[i][pos + 1];
                        this.grid[i][pos] = 0;
                        mergedCells[i][pos + 1] = true;
                        pos++;
                        moved = true;
                    }
                    pos--;
                }
            }
        }
        return moved;
    }

    moveUp(mergedCells) {
        let moved = false;
        for (let j = 0; j < 4; j++) {
            let pos = 0;
            for (let i = 0; i < 4; i++) {
                if (this.grid[i][j] !== 0) {
                    if (pos !== i) {
                        this.grid[pos][j] = this.grid[i][j];
                        this.grid[i][j] = 0;
                        moved = true;
                    }
                    if (pos > 0 && this.grid[pos][j] === this.grid[pos - 1][j] && !mergedCells[pos - 1][j]) {
                        this.grid[pos - 1][j] *= 2;
                        this.score += this.grid[pos - 1][j];
                        this.grid[pos][j] = 0;
                        mergedCells[pos - 1][j] = true;
                        pos--;
                        moved = true;
                    }
                    pos++;
                }
            }
        }
        return moved;
    }

    moveDown(mergedCells) {
        let moved = false;
        for (let j = 0; j < 4; j++) {
            let pos = 3;
            for (let i = 3; i >= 0; i--) {
                if (this.grid[i][j] !== 0) {
                    if (pos !== i) {
                        this.grid[pos][j] = this.grid[i][j];
                        this.grid[i][j] = 0;
                        moved = true;
                    }
                    if (pos < 3 && this.grid[pos][j] === this.grid[pos + 1][j] && !mergedCells[pos + 1][j]) {
                        this.grid[pos + 1][j] *= 2;
                        this.score += this.grid[pos + 1][j];
                        this.grid[pos][j] = 0;
                        mergedCells[pos + 1][j] = true;
                        pos++;
                        moved = true;
                    }
                    pos--;
                }
            }
        }
        return moved;
    }

    isGameOver() {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.grid[i][j] === 0) return false;
            }
        }

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.grid[i][j] === this.grid[i][j + 1]) return false;
            }
        }

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.grid[i][j] === this.grid[i + 1][j]) return false;
            }
        }

        return true;
    }
}

async function createGameEmbed(game) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#bbada0';
    ctx.fillRect(0, 0, 400, 400);

    const tileColors = {
        0: '#cdc1b4',
        2: '#eee4da',
        4: '#ede0c8',
        8: '#f2b179',
        16: '#f59563',
        32: '#f67c5f',
        64: '#f65e3b',
        128: '#edcf72',
        256: '#edcc61',
        512: '#edc850',
        1024: '#edc53f',
        2048: '#edc22e'
    };

    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const value = game.grid[i][j];
            const x = j * 100;
            const y = i * 100;

            ctx.fillStyle = tileColors[value] || '#cdc1b4';
            ctx.fillRect(x + 5, y + 5, 90, 90);

            if (value !== 0) {
                ctx.fillStyle = value <= 4 ? '#776e65' : '#f9f6f2';
                ctx.font = value >= 1000 ? 'bold 32px Arial' : 'bold 36px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(value.toString(), x + 50, y + 50);
            }
        }
    }

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { 
        name: '2048.png'
    });

    return {
        embed: new EmbedBuilder()
            .setTitle('2048 Game')
            .setDescription(`Score: ${game.score}\nHighest Tile: ${game.highestTile}`)
            .setImage('attachment://2048.png')
            .setColor('#bbada0'),
        file: attachment
    };
}

function createGameButtons(disabled = false) {
    const createBlankButton = (id) => new ButtonBuilder()
        .setCustomId(`blank_${id}`)
        .setLabel('\u200b')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    const row1 = new ActionRowBuilder().addComponents(
        createBlankButton('1'),
        new ButtonBuilder()
            .setCustomId('2048_up')
            .setEmoji('⬆️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        createBlankButton('2')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('2048_left')
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        createBlankButton('3'),
        new ButtonBuilder()
            .setCustomId('2048_right')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    );

    const row3 = new ActionRowBuilder().addComponents(
        createBlankButton('4'),
        new ButtonBuilder()
            .setCustomId('2048_down')
            .setEmoji('⬇️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        createBlankButton('5')
    );

    return [row1, row2, row3];
}

async function updateGame(interaction, game, gameOver = false) {
    const { embed, file } = await createGameEmbed(game);
    if (gameOver) {
        embed.setDescription(`Game Over!\nFinal Score: ${game.score}\nHighest Tile: ${game.highestTile}`);
    }

    await interaction.editReply({
        embeds: [embed],
        files: [file],
        components: createGameButtons(gameOver)
    }).catch(console.error);
} 