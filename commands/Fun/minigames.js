const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');

// --- 2048 Helper Class & Functions ---
class Game2048 {
    constructor() {
        this.board = Array(4).fill(0).map(() => Array(4).fill(0));
        this.score = 0;
        this.highestTile = 0;
        this.addNewTile();
        this.addNewTile();
    }

    addNewTile() {
        const emptyTiles = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] === 0) {
                    emptyTiles.push({ r, c });
                }
            }
        }
        if (emptyTiles.length > 0) {
            const { r, c } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
            this.board[r][c] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    move(direction) {
        let moved = false;
        const size = 4;
        const currentBoard = JSON.stringify(this.board);

        const rotateBoard = (times) => {
            for (let t = 0; t < times; t++) {
                const newBoard = Array(size).fill(0).map(() => Array(size).fill(0));
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        newBoard[c][size - 1 - r] = this.board[r][c];
                    }
                }
                this.board = newBoard;
            }
        };

        let rotations = 0;
        if (direction === 'left') rotations = 0;
        else if (direction === 'down') rotations = 1;
        else if (direction === 'right') rotations = 2;
        else if (direction === 'up') rotations = 3;

        rotateBoard(rotations);

        for (let r = 0; r < size; r++) {
            let row = this.board[r].filter(val => val !== 0);
            for (let c = 0; c < row.length - 1; c++) {
                if (row[c] === row[c + 1]) {
                    row[c] *= 2;
                    this.score += row[c];
                    this.highestTile = Math.max(this.highestTile, row[c]);
                    row.splice(c + 1, 1);
                }
            }
            while (row.length < size) row.push(0);
            this.board[r] = row;
        }

        rotateBoard((4 - rotations) % 4);

        if (JSON.stringify(this.board) !== currentBoard) moved = true;

        return moved;
    }

    isGameOver() {
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] === 0) return false;
                if (c < 3 && this.board[r][c] === this.board[r][c + 1]) return false;
                if (r < 3 && this.board[r][c] === this.board[r + 1][c]) return false;
            }
        }
        return true;
    }
}

async function createGame2048Embed(game) {
    const canvas = createCanvas(400, 450);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#bbada0';
    ctx.fillRect(0, 0, 400, 450);

    // Score display
    ctx.fillStyle = '#8f7a66';
    ctx.fillRect(10, 10, 380, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Điểm: ${game.score}`, 20, 38);
    ctx.textAlign = 'right';
    ctx.fillText(`Cao nhất: ${game.highestTile}`, 380, 38);

    const tileSize = 90;
    const padding = 10;
    const startY = 60;

    const tileColors = {
        0: '#cdc1b4', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179',
        16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72',
        256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e'
    };

    const textColors = {
        2: '#776e65', 4: '#776e65', 8: '#f9f6f2'
    };

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const value = game.board[r][c];
            const x = padding + c * (tileSize + padding);
            const y = startY + padding + r * (tileSize + padding);

            ctx.fillStyle = tileColors[value] || '#3c3a32';
            ctx.fillRect(x, y, tileSize, tileSize);

            if (value !== 0) {
                ctx.fillStyle = textColors[value] || '#f9f6f2';
                ctx.font = `bold ${value < 100 ? 50 : value < 1000 ? 40 : 30}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(value, x + tileSize / 2, y + tileSize / 2);
            }
        }
    }

    return new AttachmentBuilder(canvas.toBuffer(), { name: '2048.png' });
}

function createGame2048Buttons(disabled) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('2048_up').setLabel('⬆️').setStyle(ButtonStyle.Primary).setDisabled(disabled)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('2048_left').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('2048_down').setLabel('⬇️').setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('2048_right').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(disabled)
    );
    return [row1, row2];
}

// --- Connect Four Constants ---
const C4_EMPTY = '⚪';
const C4_P1 = '🔴';
const C4_P2 = '🟡';

// --- TicTacToe Constants ---
const TTT_EMPTY = '⬜';
const TTT_X = '❌';
const TTT_O = '⭕';

// --- Hangman Words ---
const hangmanWords = ['discord', 'javascript', 'coding', 'bot', 'server', 'gaming', 'nekotech', 'developer'];

// --- Wordle Words ---
const wordleWords = ['apple', 'brave', 'crane', 'drive', 'eagle', 'flame', 'grape', 'house', 'image', 'jolly', 'knife', 'lemon'];


module.exports = {
    data: new SlashCommandBuilder()
        .setName('minigames')
        .setDescription('🎮 Bộ sưu tập các trò chơi mini')
        .addSubcommand(sub => sub.setName('2048').setDescription('Chơi game 2048'))
        .addSubcommand(sub => 
            sub.setName('connectfour')
                .setDescription('Chơi Connect Four')
                .addUserOption(option => option.setName('opponent').setDescription('Người chơi đối thủ').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('guess').setDescription('🔢 Trò chơi đoán số (1-100)'))
        .addSubcommand(sub => sub.setName('hangman').setDescription('😵 Trò chơi Hangman cổ điển'))
        .addSubcommand(sub => sub.setName('rps').setDescription('✌️ Trò chơi Kéo Búa Bao'))
        .addSubcommand(sub => 
            sub.setName('tictactoe')
                .setDescription('❌ Trò chơi Cờ Ca-rô (TicTacToe)')
                .addUserOption(option => option.setName('opponent').setDescription('Đối thủ').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('wordle').setDescription('🔤 Trò chơi đoán từ Wordle (5 chữ cái)')),
    category: 'Fun',
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === '2048') {
            await this.play2048(interaction);
        } else if (subcommand === 'connectfour') {
            await this.playConnectFour(interaction);
        } else if (subcommand === 'guess') {
            await this.playGuess(interaction);
        } else if (subcommand === 'hangman') {
            await this.playHangman(interaction);
        } else if (subcommand === 'rps') {
            await this.playRPS(interaction);
        } else if (subcommand === 'tictactoe') {
            await this.playTicTacToe(interaction);
        } else if (subcommand === 'wordle') {
            await this.playWordle(interaction);
        }
    },

    // --- Game Logic Methods ---

    async play2048(interaction) {
        const game = new Game2048();
        await interaction.deferReply();
        
        const file = await createGame2048Embed(game);
        const embed = new EmbedBuilder()
            .setTitle('2048')
            .setImage('attachment://2048.png')
            .setColor('#edc22e');
            
        const message = await interaction.editReply({ 
            embeds: [embed], 
            files: [file], 
            components: createGame2048Buttons(false) 
        });

        const filter = i => i.user.id === interaction.user.id && i.message.id === message.id;
        const collector = message.createMessageComponentCollector({ filter, time: 900000 });

        collector.on('collect', async i => {
            if (!i.customId.startsWith('2048_')) return;
            await i.deferUpdate();

            const direction = i.customId.replace('2048_', '');
            const moved = game.move(direction);
            if (moved) game.addNewTile();

            const gameOver = game.isGameOver();
            const newFile = await createGame2048Embed(game);
            const newEmbed = new EmbedBuilder()
                .setTitle(gameOver ? '2048 - Trò chơi kết thúc!' : '2048')
                .setImage('attachment://2048.png')
                .setColor('#edc22e');

            await i.editReply({ 
                embeds: [newEmbed], 
                files: [newFile], 
                components: createGame2048Buttons(gameOver) 
            });

            if (gameOver) collector.stop();
        });
    },

    async playConnectFour(interaction) {
        const opponent = interaction.options.getUser('opponent');
        if (opponent.id === interaction.user.id) return interaction.reply({ content: 'Bạn không thể chơi với chính mình!', ephemeral: true });
        if (opponent.bot) return interaction.reply({ content: 'Bạn không thể chơi với bot!', ephemeral: true });

        const board = Array(6).fill(null).map(() => Array(7).fill(C4_EMPTY));
        let turn = interaction.user.id;
        
        const generateBoardString = () => {
            return board.map(row => row.join('')).join('\n') + '\n1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';
        };

        const checkWin = (player) => {
            // Horizontal
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < 4; c++) {
                    if (board[r][c] === player && board[r][c+1] === player && board[r][c+2] === player && board[r][c+3] === player) return true;
                }
            }
            // Vertical
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 7; c++) {
                    if (board[r][c] === player && board[r+1][c] === player && board[r+2][c] === player && board[r+3][c] === player) return true;
                }
            }
            // Diagonal /
            for (let r = 3; r < 6; r++) {
                for (let c = 0; c < 4; c++) {
                    if (board[r][c] === player && board[r-1][c+1] === player && board[r-2][c+2] === player && board[r-3][c+3] === player) return true;
                }
            }
            // Diagonal \
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 4; c++) {
                    if (board[r][c] === player && board[r+1][c+1] === player && board[r+2][c+2] === player && board[r+3][c+3] === player) return true;
                }
            }
            return false;
        };

        const getButtons = (disabled = false) => {
            const row1 = new ActionRowBuilder();
            const row2 = new ActionRowBuilder();
            for (let i = 0; i < 7; i++) {
                const btn = new ButtonBuilder()
                    .setCustomId(`c4_${i}`)
                    .setLabel(`${i+1}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled || board[0][i] !== C4_EMPTY);
                if (i < 4) row1.addComponents(btn);
                else row2.addComponents(btn);
            }
            return [row1, row2];
        };

        const embed = new EmbedBuilder()
            .setTitle('Connect Four')
            .setDescription(`${C4_P1} <@${interaction.user.id}> vs ${C4_P2} <@${opponent.id}>\n\nLượt của: <@${turn}>\n\n${generateBoardString()}`)
            .setColor('#0099ff');

        const message = await interaction.reply({ embeds: [embed], components: getButtons(), fetchReply: true });

        const collector = message.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async i => {
            if (i.user.id !== turn) return i.reply({ content: 'Không phải lượt của bạn!', ephemeral: true });
            
            await i.deferUpdate();
            const col = parseInt(i.customId.split('_')[1]);
            const playerSymbol = turn === interaction.user.id ? C4_P1 : C4_P2;

            // Drop piece
            let placed = false;
            for (let r = 5; r >= 0; r--) {
                if (board[r][col] === C4_EMPTY) {
                    board[r][col] = playerSymbol;
                    placed = true;
                    break;
                }
            }

            if (checkWin(playerSymbol)) {
                embed.setDescription(`${C4_P1} <@${interaction.user.id}> vs ${C4_P2} <@${opponent.id}>\n\n🎉 <@${turn}> CHIẾN THẮNG!\n\n${generateBoardString()}`);
                await i.editReply({ embeds: [embed], components: getButtons(true) });
                collector.stop();
            } else if (board.flat().every(cell => cell !== C4_EMPTY)) {
                embed.setDescription(`${C4_P1} <@${interaction.user.id}> vs ${C4_P2} <@${opponent.id}>\n\n🤝 HÒA!\n\n${generateBoardString()}`);
                await i.editReply({ embeds: [embed], components: getButtons(true) });
                collector.stop();
            } else {
                turn = turn === interaction.user.id ? opponent.id : interaction.user.id;
                embed.setDescription(`${C4_P1} <@${interaction.user.id}> vs ${C4_P2} <@${opponent.id}>\n\nLượt của: <@${turn}>\n\n${generateBoardString()}`);
                await i.editReply({ embeds: [embed], components: getButtons() });
            }
        });
    },

    async playGuess(interaction) {
        const targetNumber = Math.floor(Math.random() * 100) + 1;
        let attempts = 0;
        
        const embed = new EmbedBuilder()
            .setTitle('🔢 Đoán Số')
            .setDescription('Tôi đã nghĩ ra một số từ 1 đến 100. Hãy đoán xem!\n\nGõ số bạn đoán vào kênh chat.')
            .setColor('#0099ff');
            
        await interaction.reply({ embeds: [embed] });
        
        const filter = m => m.author.id === interaction.user.id && !isNaN(parseInt(m.content));
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });
        
        collector.on('collect', async m => {
            const guess = parseInt(m.content);
            attempts++;
            
            if (guess === targetNumber) {
                m.reply(`🎉 Chính xác! Số đó là **${targetNumber}**. Bạn đoán đúng sau ${attempts} lần thử.`);
                collector.stop();
            } else if (guess < targetNumber) {
                m.reply('⬆️ Thấp quá! Thử số lớn hơn.');
            } else {
                m.reply('⬇️ Cao quá! Thử số nhỏ hơn.');
            }
        });
        
        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.followUp(`⏰ Hết giờ! Số đúng là **${targetNumber}**.`);
            }
        });
    },

    async playHangman(interaction) {
        const word = hangmanWords[Math.floor(Math.random() * hangmanWords.length)];
        let guessed = new Set();
        let wrongGuesses = 0;
        const maxWrong = 6;
        
        const getDisplay = () => {
            return word.split('').map(char => guessed.has(char) ? char : '_').join(' ');
        };
        
        const embed = new EmbedBuilder()
            .setTitle('Hangman')
            .setDescription(`Đoán từ: \`${getDisplay()}\`\n\nSai: ${wrongGuesses}/${maxWrong}`)
            .setColor('#2C2F33');
            
        const message = await interaction.reply({ 
            content: 'Gõ một ký tự để đoán!',
            embeds: [embed], 
            fetchReply: true 
        });
        
        const filter = m => m.author.id === interaction.user.id && m.content.length === 1 && /^[a-z]$/i.test(m.content);
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });
        
        collector.on('collect', async m => {
            const char = m.content.toLowerCase();
            m.delete().catch(() => {});
            
            if (guessed.has(char)) return; 
            guessed.add(char);
            
            if (!word.includes(char)) {
                wrongGuesses++;
            }
            
            if (wrongGuesses >= maxWrong) {
                embed.setDescription(`💀 THUA CUỘC! Từ đúng là: **${word}**`).setColor('#FF0000');
                await interaction.editReply({ embeds: [embed] });
                collector.stop();
            } else if (!getDisplay().includes('_')) {
                embed.setDescription(`🎉 CHIẾN THẮNG! Từ đúng là: **${word}**`).setColor('#00FF00');
                await interaction.editReply({ embeds: [embed] });
                collector.stop();
            } else {
                embed.setDescription(`Đoán từ: \`${getDisplay()}\`\n\nSai: ${wrongGuesses}/${maxWrong}`);
                await interaction.editReply({ embeds: [embed] });
            }
        });
    },

    async playRPS(interaction) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('rps_rock').setLabel('Kéo ✊').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('rps_paper').setLabel('Búa ✋').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('rps_scissors').setLabel('Bao ✌️').setStyle(ButtonStyle.Primary)
            );

        const embed = new EmbedBuilder()
            .setTitle('Kéo Búa Bao')
            .setDescription('Hãy chọn nước đi của bạn!')
            .setColor('#f1c40f');

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const collector = message.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: 'Trò chơi này không phải của bạn!', ephemeral: true });

            const choice = i.customId.split('_')[1];
            const choices = ['rock', 'paper', 'scissors'];
            const botChoice = choices[Math.floor(Math.random() * choices.length)];

            const map = { rock: 'Kéo ✊', paper: 'Búa ✋', scissors: 'Bao ✌️' };
            
            let result;
            if (choice === botChoice) result = "Hòa!";
            else if (
                (choice === 'rock' && botChoice === 'scissors') ||
                (choice === 'paper' && botChoice === 'rock') ||
                (choice === 'scissors' && botChoice === 'paper')
            ) result = "Bạn thắng!";
            else result = "Bạn thua!";

            const resultEmbed = new EmbedBuilder()
                .setTitle('Kéo Búa Bao - Kết quả')
                .setDescription(`Bạn chọn: ${map[choice]}\nBot chọn: ${map[botChoice]}\n\n**${result}**`)
                .setColor(result === "Bạn thắng!" ? '#00FF00' : result === "Bạn thua!" ? '#FF0000' : '#FFFF00');

            await i.update({ embeds: [resultEmbed], components: [] });
            collector.stop();
        });
    },

    async playTicTacToe(interaction) {
        const opponent = interaction.options.getUser('opponent');
        if (opponent.id === interaction.user.id) return interaction.reply({ content: 'Không thể chơi một mình!', ephemeral: true });
        if (opponent.bot) return interaction.reply({ content: 'Không thể chơi với bot!', ephemeral: true });

        const board = Array(9).fill(TTT_EMPTY);
        let turn = interaction.user.id; 

        const getButtons = (disabled = false) => {
            const rows = [];
            for (let i = 0; i < 3; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    const idx = i * 3 + j;
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ttt_${idx}`)
                            .setLabel(board[idx] === TTT_EMPTY ? '\u200b' : board[idx] === TTT_X ? 'X' : 'O')
                            .setStyle(board[idx] === TTT_EMPTY ? ButtonStyle.Secondary : (board[idx] === TTT_X ? ButtonStyle.Danger : ButtonStyle.Success))
                            .setDisabled(disabled || board[idx] !== TTT_EMPTY)
                    );
                }
                rows.push(row);
            }
            return rows;
        };

        const checkWin = (player) => {
            const wins = [
                [0,1,2], [3,4,5], [6,7,8], // Rows
                [0,3,6], [1,4,7], [2,5,8], // Cols
                [0,4,8], [2,4,6]           // Diags
            ];
            return wins.some(combo => combo.every(idx => board[idx] === player));
        };

        const embed = new EmbedBuilder()
            .setTitle('Tic Tac Toe')
            .setDescription(`${TTT_X} <@${interaction.user.id}> vs ${TTT_O} <@${opponent.id}>\n\nLượt của: <@${turn}>`)
            .setColor('#99AAB5');

        const message = await interaction.reply({ embeds: [embed], components: getButtons(), fetchReply: true });
        const collector = message.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async i => {
            if (i.user.id !== turn) return i.reply({ content: 'Không phải lượt của bạn!', ephemeral: true });

            await i.deferUpdate();
            const idx = parseInt(i.customId.split('_')[1]);
            const playerSymbol = turn === interaction.user.id ? TTT_X : TTT_O;
            board[idx] = playerSymbol;

            if (checkWin(playerSymbol)) {
                embed.setDescription(`${TTT_X} <@${interaction.user.id}> vs ${TTT_O} <@${opponent.id}>\n\n🎉 <@${turn}> CHIẾN THẮNG!`);
                await i.editReply({ embeds: [embed], components: getButtons(true) });
                collector.stop();
            } else if (board.every(cell => cell !== TTT_EMPTY)) {
                embed.setDescription(`${TTT_X} <@${interaction.user.id}> vs ${TTT_O} <@${opponent.id}>\n\n🤝 HÒA!`);
                await i.editReply({ embeds: [embed], components: getButtons(true) });
                collector.stop();
            } else {
                turn = turn === interaction.user.id ? opponent.id : interaction.user.id;
                embed.setDescription(`${TTT_X} <@${interaction.user.id}> vs ${TTT_O} <@${opponent.id}>\n\nLượt của: <@${turn}>`);
                await i.editReply({ embeds: [embed], components: getButtons() });
            }
        });
    },

    async playWordle(interaction) {
        const solution = wordleWords[Math.floor(Math.random() * wordleWords.length)];
        let guesses = [];
        const maxGuesses = 6;

        const embed = new EmbedBuilder()
            .setTitle('Wordle')
            .setDescription(`Đoán từ gồm 5 chữ cái. Bạn có ${maxGuesses} lượt thử.\nGõ từ vào kênh chat.`)
            .setColor('#538d4e');

        await interaction.reply({ embeds: [embed] });

        const filter = m => m.author.id === interaction.user.id && m.content.length === 5 && /^[a-zA-Z]+$/.test(m.content);
        const collector = interaction.channel.createMessageCollector({ filter, time: 300000 });

        collector.on('collect', async m => {
            const guess = m.content.toLowerCase();
            m.delete().catch(() => {});
            
            guesses.push(guess);
            
            let display = guesses.map(g => {
                return g.split('').map((char, i) => {
                    if (char === solution[i]) return `🟩 ${char.toUpperCase()}`;
                    if (solution.includes(char)) return `🟨 ${char.toUpperCase()}`;
                    return `⬛ ${char.toUpperCase()}`;
                }).join(' ');
            }).join('\n');

            if (guess === solution) {
                embed.setDescription(display + `\n\n🎉 CHÚC MỪNG! Từ đúng là **${solution.toUpperCase()}**`);
                await interaction.editReply({ embeds: [embed] });
                collector.stop();
            } else if (guesses.length >= maxGuesses) {
                embed.setDescription(display + `\n\n😞 THUA RỒI! Từ đúng là **${solution.toUpperCase()}**`);
                await interaction.editReply({ embeds: [embed] });
                collector.stop();
            } else {
                embed.setDescription(display + `\n\nCòn ${maxGuesses - guesses.length} lượt thử.`);
                await interaction.editReply({ embeds: [embed] });
            }
        });
    }
};
