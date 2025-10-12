/*
  _____            _           ____        _   
 |  __ \          | |         |  _ \      | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                             
                                        
 Thank you for choosing Drako Bot!

 Should you encounter any issues, require assistance, or have suggestions for improving the bot,
 we invite you to connect with us on our Discord server and create a support ticket: 

 http://discord.drakodevelopment.net
 
*/

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { createCanvas } = require('canvas');
//const fs = require('fs');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('connectfour')
        .setDescription('Play Connect Four against a bot or another player!')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Choose game type')
                .setRequired(true)
                .addChoices(
                    { name: 'Bot', value: 'bot' },
                    { name: 'Player', value: 'player' }
                )
        )
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Choose difficulty level (only for bot)')
                .addChoices(
                    { name: 'Easy', value: 'easy' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Hard', value: 'hard' }
                )
        )
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('Choose an opponent (required if playing against another player)')
        )
        .setDMPermission(false),
    category: 'Fun',
    async execute(interaction) {
        try {
            const gameType = interaction.options.getString('type');
            const opponent = interaction.options.getUser('opponent');
            const difficulty = interaction.options.getString('difficulty') || 'medium';

            if (gameType === 'player' && !opponent) {
                return interaction.reply({ content: 'You must specify an opponent when playing against another player.', flags: MessageFlags.Ephemeral });
            }

            if (gameType === 'player') {
                await requestOpponentConfirmation(interaction, opponent, difficulty);
            } else {
                await startGame(interaction, gameType, opponent, difficulty);
            }
        } catch (error) {
            console.error('Error executing command:', error);
            await interaction.reply({ content: 'An error occurred while starting the game. Please try again later.', flags: MessageFlags.Ephemeral });
        }
    },
};

async function requestOpponentConfirmation(interaction, opponent, difficulty) {
    const confirmationEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Connect Four Game Request')
        .setDescription(`<@${interaction.user.id}> has challenged you to a game of Connect Four. Do you accept?`)
        .setFooter({ text: 'This request will expire in 60 seconds.' });

    const confirmButton = new ButtonBuilder()
        .setCustomId('accept_game')
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success);

    const declineButton = new ButtonBuilder()
        .setCustomId('decline_game')
        .setLabel('Decline')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(confirmButton, declineButton);

    const reply = await interaction.reply({
        content: `<@${opponent.id}>, you've been challenged to a game of Connect Four!`,
        embeds: [confirmationEmbed],
        components: [row],
        fetchReply: true
    });

    const collector = reply.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
        if (i.user.id !== opponent.id) {
            await i.reply({ content: 'This confirmation is not for you.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (i.customId === 'accept_game') {
            await i.update({ content: 'Game accepted! Starting now...', components: [] });
            await startGame(interaction, 'player', opponent, difficulty);
        } else if (i.customId === 'decline_game') {
            await i.update({ content: 'Game declined.', components: [] });
            await interaction.followUp({ content: `<@${opponent.id}> has declined the game.` });
        }

        collector.stop();
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            await interaction.editReply({ content: 'The game request has expired.', components: [] });
        }
    });
}

async function startGame(interaction, gameType, opponent, difficulty) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }

        const blankBoardEmoji = lang.Connectfour.Board.Emojis.Blank;
        const playerEmoji = lang.Connectfour.Board.Emojis.Player;
        const botEmoji = lang.Connectfour.Board.Emojis.Bot;
        const gameBoard = Array(6).fill().map(() => Array(7).fill(blankBoardEmoji));
        const gameId = `connectfour-${Date.now()}-${interaction.user.id}`;

        let currentPlayerId = interaction.user.id;
        let lastMove = { row: null, col: null };

        const opponentDisplay = opponent ? `<@${opponent.id}>` : 'Bot';

        const startEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎮 Connect Four Game')
            .setDescription(`Game is starting! ${gameType === 'bot' ? `Difficulty: **${difficulty.toUpperCase()}**` : `<@${interaction.user.id}> vs ${opponentDisplay}`}`)
            .addFields(
                { name: 'How to Play', value: 'Click the numbered buttons to drop your piece in that column. Connect 4 pieces horizontally, vertically, or diagonally to win!', inline: false },
                { name: 'Current Turn', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Game Mode', value: gameType === 'bot' ? `Bot (${difficulty})` : 'Player vs Player', inline: true }
            )
            .setTimestamp()
            .setFooter({ 
                text: 'Game will expire after 10 minutes of inactivity',
                iconURL: interaction.client.user.displayAvatarURL()
            });

        const attachment = await createGameBoardCanvas(gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, null);

        await interaction.editReply({
            content: `${gameType === 'bot' ? '🤖' : '👥'} **CONNECT FOUR** | <@${interaction.user.id}>'s turn`,
            embeds: [startEmbed],
            files: [attachment],
            components: createBoardComponents(gameId, false),
        });

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({
            time: 600000,
            filter: i => i.customId.startsWith(gameId) && (i.user.id === interaction.user.id || (opponent && i.user.id === opponent.id))
        });

        let nextPlayerId = gameType === 'bot' ? 'bot' : opponent.id;

        collector.on('collect', async i => {
            try {
                await i.deferUpdate();

                if (i.user.id !== currentPlayerId) {
                    await i.followUp({ content: 'It is not your turn!', flags: MessageFlags.Ephemeral });
                    return;
                }

                const parts = i.customId.split('_');
                const column = parseInt(parts[2]);

                lastMove = { row: null, col: column };

                if (!makeMove(gameBoard, column, currentPlayerId === interaction.user.id ? playerEmoji : botEmoji, lastMove)) {
                    await i.followUp({ content: 'This column is full!', flags: MessageFlags.Ephemeral });
                    return;
                }

                let winningCoordinates = checkWin(gameBoard, currentPlayerId === interaction.user.id ? playerEmoji : botEmoji);

                if (winningCoordinates) {
                    const winResult = currentPlayerId === interaction.user.id ? 
                        `<@${interaction.user.id}> has won!` : 
                        (currentPlayerId === 'bot' ? 'Bot has won!' : `<@${opponent.id}> has won!`);
                        
                    await endGame(interaction, i.message, winResult, gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, winningCoordinates);
                    collector.stop();
                    return;
                } else if (isBoardFull(gameBoard)) {
                    await endGame(interaction, i.message, "It's a draw!", gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, null);
                    collector.stop();
                    return;
                }

                const nextPlayerDisplay = nextPlayerId === 'bot' ? 
                    'Bot is thinking...' : 
                    (nextPlayerId === interaction.user.id ? `<@${interaction.user.id}>` : `<@${opponent.id}>`);

                const turnEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🎮 Connect Four Game')
                    .setDescription(`Game in progress! ${gameType === 'bot' ? `Difficulty: **${difficulty.toUpperCase()}**` : `<@${interaction.user.id}> vs ${opponentDisplay}`}`)
                    .addFields(
                        { name: 'Last Move', value: `<@${i.user.id}> placed a piece in column ${column + 1}`, inline: false },
                        { name: 'Next Turn', value: nextPlayerDisplay, inline: true },
                        { name: 'Game Mode', value: gameType === 'bot' ? `Bot (${difficulty})` : 'Player vs Player', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Game will expire after 10 minutes of inactivity',
                        iconURL: interaction.client.user.displayAvatarURL()
                    });

                const attachment = await createGameBoardCanvas(gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, null);
                
                const nextUserTurn = nextPlayerId === 'bot' ? 
                    'Bot is thinking...' : 
                    `${nextPlayerDisplay}'s turn`;
                
                await i.editReply({
                    content: `${gameType === 'bot' ? '🤖' : '👥'} **CONNECT FOUR** | ${nextUserTurn}`,
                    embeds: [turnEmbed],
                    files: [attachment],
                    components: createBoardComponents(gameId, gameType === 'bot' && currentPlayerId === interaction.user.id)
                });

                if (gameType === 'bot' && currentPlayerId !== 'bot') {
                    const thinkingTime = difficulty === 'easy' ? 1000 : (difficulty === 'medium' ? 1500 : 2000);
                    await new Promise(resolve => setTimeout(resolve, thinkingTime));
                    
                    await botMove(gameBoard, botEmoji, playerEmoji, difficulty, lastMove);
                    winningCoordinates = checkWin(gameBoard, botEmoji);

                    if (winningCoordinates) {
                        await endGame(interaction, i.message, 'Bot has won!', gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, winningCoordinates);
                        collector.stop();
                        return;
                    } else if (isBoardFull(gameBoard)) {
                        await endGame(interaction, i.message, "It's a draw!", gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, null);
                        collector.stop();
                        return;
                    }
                    
                    const botMoveEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('🎮 Connect Four Game')
                        .setDescription(`Game in progress! Difficulty: **${difficulty.toUpperCase()}**`)
                        .addFields(
                            { name: 'Last Move', value: `Bot placed a piece in column ${lastMove.col + 1}`, inline: false },
                            { name: 'Next Turn', value: `<@${interaction.user.id}>`, inline: true },
                            { name: 'Game Mode', value: `Bot (${difficulty})`, inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ 
                            text: 'Game will expire after 10 minutes of inactivity',
                            iconURL: interaction.client.user.displayAvatarURL()
                        });
                    
                    const botAttachment = await createGameBoardCanvas(gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, null);
                    
                    await i.editReply({
                        content: `🤖 **CONNECT FOUR** | <@${interaction.user.id}>'s turn`,
                        embeds: [botMoveEmbed],
                        files: [botAttachment],
                        components: createBoardComponents(gameId, false)
                    });
                    
                    currentPlayerId = interaction.user.id;
                } else {
                    [currentPlayerId, nextPlayerId] = [nextPlayerId, currentPlayerId];
                }
            } catch (error) {
                console.error('Error handling interaction:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'An error occurred while processing your move. Please try again.', flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.followUp({ content: 'An error occurred while processing your move. Please try again.', flags: MessageFlags.Ephemeral });
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Game Timed Out')
                    .setDescription('This game has expired due to inactivity.')
                    .setTimestamp();
                
                await message.edit({ 
                    content: '⏰ **GAME EXPIRED**', 
                    embeds: [timeoutEmbed], 
                    components: [] 
                });
            }
        });
    } catch (error) {
        console.error('Error starting the game:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'An error occurred while setting up the game. Please try again later.', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.followUp({ content: 'An error occurred while setting up the game. Please try again later.', flags: MessageFlags.Ephemeral });
        }
    }
}

async function createGameBoardCanvas(board, playerEmoji, botEmoji, blankEmoji, lastMove, winningCoordinates) {
    const canvas = createCanvas(700, 600);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    for (let i = 0; i < canvas.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }
    ctx.restore();

    const cellSize = 80;
    const boardWidth = 7 * cellSize;
    const boardHeight = 6 * cellSize;
    const boardX = (canvas.width - boardWidth) / 2;
    const boardY = (canvas.height - boardHeight) / 2;

    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 3000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 1.5;
        ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
        ctx.fillRect(x, y, size, size);
    }
    ctx.restore();

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#0f3460';
    roundRect(ctx, boardX - 10, boardY - 10, boardWidth + 20, boardHeight + 20, 15, true);
    ctx.restore();

    const boardGradient = ctx.createLinearGradient(0, boardY, 0, boardY + boardHeight);
    boardGradient.addColorStop(0, '#0f3460');
    boardGradient.addColorStop(1, '#0a2647');
    ctx.fillStyle = boardGradient;
    roundRect(ctx, boardX - 10, boardY - 10, boardWidth + 20, boardHeight + 20, 15, true);

    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
            const x = boardX + col * cellSize + cellSize / 2;
            const y = boardY + row * cellSize + cellSize / 2;

            ctx.save();
            ctx.fillStyle = '#05192d';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.beginPath();
            ctx.arc(x, y, cellSize / 2 - 5, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x - 3, y - 3, cellSize / 2 - 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();

            if (board[row][col] === playerEmoji) {
                drawModernPiece(ctx, x, y, cellSize / 2 - 8, '#e94560');
            } else if (board[row][col] === botEmoji) {
                drawModernPiece(ctx, x, y, cellSize / 2 - 8, '#00bfff');
            }
        }
    }

    if (lastMove && lastMove.row !== null && lastMove.col !== null) {
        const x = boardX + lastMove.col * cellSize + cellSize / 2;
        const y = boardY + lastMove.row * cellSize + cellSize / 2;
        
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        
        for (let i = 0; i < 3; i++) {
            ctx.globalAlpha = 0.6 - (i * 0.2);
            ctx.beginPath();
            ctx.arc(x, y, cellSize / 2 + (i * 3), 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, cellSize / 2 - 10, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.restore();
    }

    if (winningCoordinates) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.setLineDash([]);
        ctx.beginPath();
        
        const startX = boardX + winningCoordinates[0].col * cellSize + cellSize / 2;
        const startY = boardY + winningCoordinates[0].row * cellSize + cellSize / 2;
        ctx.moveTo(startX, startY);
        
        for (const { row, col } of winningCoordinates) {
            const x = boardX + col * cellSize + cellSize / 2;
            const y = boardY + row * cellSize + cellSize / 2;
            ctx.lineTo(x, y);
        }
        
        ctx.stroke();
        
        for (const { row, col } of winningCoordinates) {
            const x = boardX + col * cellSize + cellSize / 2;
            const y = boardY + row * cellSize + cellSize / 2;
            
            ctx.globalAlpha = 0.6;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 20;
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(x, y, cellSize / 2 - 6, 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        ctx.restore();
        
        drawConfetti(ctx, canvas.width, canvas.height);
    }

    const borderGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    borderGradient.addColorStop(0, '#e94560');
    borderGradient.addColorStop(1, '#ff758f');
    
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 4;
    roundRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 20, false, true);

    const buffer = canvas.toBuffer('image/png');
    return new AttachmentBuilder(buffer, { name: 'connect-four.png' });
}

function drawModernPiece(ctx, x, y, radius, color) {
    const gradient = ctx.createRadialGradient(x - radius / 2, y - radius / 2, radius / 10, x, y, radius);
    gradient.addColorStop(0, lightenColor(color, 40));
    gradient.addColorStop(0.6, color);
    gradient.addColorStop(1, shadeColor(color, -40));
    
    ctx.fillStyle = gradient;
    
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
    
    ctx.save();
    ctx.strokeStyle = lightenColor(color, 20);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius - 1, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
    
    ctx.save();
    ctx.globalAlpha = 0.6;
    const highlightGradient = ctx.createRadialGradient(
        x - radius / 3, y - radius / 3, 
        1, 
        x - radius / 3, y - radius / 3, 
        radius / 1.5
    );
    highlightGradient.addColorStop(0, '#ffffff');
    highlightGradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.arc(x - radius / 3, y - radius / 3, radius / 2, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(x + radius / 4, y + radius / 4, radius / 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius, fill = false, stroke = false) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }
}

function shadeColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = (num >> 8 & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function lightenColor(color, percent) {
    return shadeColor(color, percent);
}

function createBoardComponents(gameId, disabled) {
    try {
        const rows = [];

        for (let i = 0; i < 7; i += 5) {
            const actionRow = new ActionRowBuilder();
            for (let j = i; j < i + 5 && j < 7; j++) {
                actionRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${gameId}_column_${j}`)
                        .setStyle(ButtonStyle.Primary)
                        .setLabel((j + 1).toString())
                        .setDisabled(disabled)
                );
            }
            rows.push(actionRow);
        }

        return rows;
    } catch (error) {
        console.error('Error creating board components:', error);
        throw new Error('Could not create board components.');
    }
}

function makeMove(board, column, piece, lastMove) {
    try {
        for (let row = board.length - 1; row >= 0; row--) {
            if (board[row][column] === lang.Connectfour.Board.Emojis.Blank) {
                board[row][column] = piece;
                lastMove.row = row;
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error making move:', error);
        return false;
    }
}

async function botMove(board, botPiece, playerPiece, difficulty) {
    try {
        const move = findBestMove(board, botPiece, playerPiece, difficulty);
        if (move !== null) {
            makeMove(board, move, botPiece, {});
        }
    } catch (error) {
        console.error('Error in bot move:', error);
    }
}

function findBestMove(board, botPiece, playerPiece, difficulty) {
    try {
        const validMoves = [];
        for (let col = 0; col < 7; col++) {
            if (board[0][col] === lang.Connectfour.Board.Emojis.Blank) {
                validMoves.push(col);
            }
        }

        if (validMoves.length === 0) return null;

        if (difficulty === 'easy') {
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }

        if (difficulty === 'medium') {
            for (const col of validMoves) {
                const tempBoard = board.map(row => row.slice());
                makeMove(tempBoard, col, botPiece, {});
                if (checkWin(tempBoard, botPiece)) return col;
            }

            for (const col of validMoves) {
                const tempBoard = board.map(row => row.slice());
                makeMove(tempBoard, col, playerPiece, {});
                if (checkWin(tempBoard, playerPiece)) return col;
            }

            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }

        if (difficulty === 'hard') {
            let bestScore = -Infinity;
            let bestMove = null;

            for (const col of validMoves) {
                const tempBoard = board.map(row => row.slice());
                makeMove(tempBoard, col, botPiece, {});
                const score = minimax(tempBoard, 3, false, botPiece, playerPiece);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = col;
                }
            }

            return bestMove;
        }

        return validMoves[Math.floor(Math.random() * validMoves.length)];
    } catch (error) {
        console.error('Error finding best move:', error);
        return null;
    }
}

function minimax(board, depth, isMaximizing, botPiece, playerPiece) {
    try {
        if (depth === 0 || checkWin(board, botPiece) || checkWin(board, playerPiece)) {
            return scorePosition(board, botPiece);
        }

        const validMoves = [];
        for (let col = 0; col < 7; col++) {
            if (board[0][col] === lang.Connectfour.Board.Emojis.Blank) {
                validMoves.push(col);
            }
        }

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (const col of validMoves) {
                const tempBoard = board.map(row => row.slice());
                makeMove(tempBoard, col, botPiece, {});
                const score = minimax(tempBoard, depth - 1, false, botPiece, playerPiece);
                bestScore = Math.max(score, bestScore);
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (const col of validMoves) {
                const tempBoard = board.map(row => row.slice());
                makeMove(tempBoard, col, playerPiece, {});
                const score = minimax(tempBoard, depth - 1, true, botPiece, playerPiece);
                bestScore = Math.min(score, bestScore);
            }
            return bestScore;
        }
    } catch (error) {
        console.error('Error in minimax function:', error);
        return 0;
    }
}

function scorePosition(board, piece) {
    try {
        let score = 0;
        const opponentPiece = piece === lang.Connectfour.Board.Emojis.Bot ? lang.Connectfour.Board.Emojis.Player : lang.Connectfour.Board.Emojis.Bot;

        const centerColumn = board.map(row => row[3]);
        const centerCount = centerColumn.filter(cell => cell === piece).length;
        score += centerCount * 3;

        score += evaluateLines(board, piece);
        score -= evaluateLines(board, opponentPiece);

        return score;
    } catch (error) {
        console.error('Error scoring position:', error);
        return 0;
    }
}

function evaluateLines(board, piece) {
    try {
        let score = 0;
        const directions = [
            { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: -1 }
        ];

        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[0].length; col++) {
                if (board[row][col] === piece) {
                    for (const { x, y } of directions) {
                        let count = 0;
                        for (let step = 0; step < 4; step++) {
                            const newRow = row + step * x;
                            const newCol = col + step * y;
                            if (board[newRow] && board[newRow][newCol] === piece) {
                                count++;
                            } else {
                                break;
                            }
                        }
                        if (count === 4) score += 100;
                        else if (count === 3) score += 10;
                        else if (count === 2) score += 1;
                    }
                }
            }
        }

        return score;
    } catch (error) {
        console.error('Error evaluating lines:', error);
        return 0;
    }
}

function checkWin(board, piece) {
    try {
        const directions = [
            { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: -1 }
        ];

        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[0].length; col++) {
                if (board[row][col] === piece) {
                    for (const { x, y } of directions) {
                        const winningCoordinates = [];
                        for (let step = 0; step < 4; step++) {
                            const newRow = row + step * x;
                            const newCol = col + step * y;
                            if (board[newRow] && board[newRow][newCol] === piece) {
                                winningCoordinates.push({ row: newRow, col: newCol });
                            } else {
                                break;
                            }
                        }
                        if (winningCoordinates.length === 4) return winningCoordinates;
                    }
                }
            }
        }
        return null;
    } catch (error) {
        console.error('Error checking win:', error);
        return null;
    }
}

function isBoardFull(board) {
    try {
        return board.every(row => row.every(cell => cell !== lang.Connectfour.Board.Emojis.Blank));
    } catch (error) {
        console.error('Error checking if board is full:', error);
        return false;
    }
}

async function endGame(interaction, message, resultMessage, gameBoard, playerEmoji, botEmoji, blankEmoji, lastMove, winningCoordinates) {
    try {
        const attachment = await createGameBoardCanvas(gameBoard, playerEmoji, botEmoji, blankEmoji, lastMove, winningCoordinates);
        
        const isWin = resultMessage.includes('won');
        const color = isWin ? lang.Connectfour.Colors.Win : lang.Connectfour.Colors.Tie;

        let winnerDisplay;
        if (isWin) {
            const winnerName = resultMessage.split(' ')[0];
            if (winnerName === 'Bot') {
                winnerDisplay = 'Bot';
            } else if (winnerName === interaction.user.username) {
                winnerDisplay = `<@${interaction.user.id}>`;
            } else if (interaction.options.getUser('opponent')) {
                const opponent = interaction.options.getUser('opponent');
                winnerDisplay = `<@${opponent.id}>`;
            } else {
                winnerDisplay = winnerName;
            }
        } else {
            winnerDisplay = 'No one';
        }

        const winEmojis = ['🎉', '🎊', '🏆', '✨', '🥳', '👑', '💯', '🔥'];
        const randomWinEmojis = isWin ? 
            Array(4).fill().map(() => winEmojis[Math.floor(Math.random() * winEmojis.length)]).join(' ') : 
            '🤝';

        const formattedResult = isWin ? 
            `${winnerDisplay} has won!` : 
            "It's a draw!";

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(isWin ? `${randomWinEmojis} ${lang.Connectfour.Embed.Title} ${randomWinEmojis}` : lang.Connectfour.Embed.Title)
            .setDescription(lang.Connectfour.Embed.Description.replace("{user}", winnerDisplay))
            .addFields(
                { name: 'Game Stats', value: isWin ? 'Spectacular victory! What a game!' : 'Nice game! Thanks for playing.', inline: false }
            )
            .setTimestamp()
            .setFooter({ 
                text: lang.Connectfour.Embed.Footer, 
                iconURL: interaction.client.user.displayAvatarURL() 
            });

        const playAgainButton = new ButtonBuilder()
            .setCustomId('play_again')
            .setLabel('Play Again')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎮');

        const row = new ActionRowBuilder().addComponents(playAgainButton);

        const gameEndMessage = isWin 
            ? `${randomWinEmojis} Congratulations ${winnerDisplay}! ${randomWinEmojis}` 
            : "It's a draw! Good game! 🤝";

        await message.edit({ 
            content: gameEndMessage,
            files: [attachment], 
            embeds: [embed], 
            components: [row] 
        });
        
        const collector = message.createMessageComponentCollector({ time: 60000 });
        
        collector.on('collect', async i => {
            if (i.customId === 'play_again') {
                const opponent = interaction.options.getUser('opponent');
                
                if (i.user.id !== interaction.user.id && (!opponent || i.user.id !== opponent.id)) {
                    await i.reply({ content: 'Only players from this game can start a new one.', flags: MessageFlags.Ephemeral });
                    return;
                }

                const gameType = opponent ? 'player' : 'bot';
                const difficulty = interaction.options.getString('difficulty') || 'medium';
                
                const blankBoardEmoji = lang.Connectfour.Board.Emojis.Blank;
                const gameBoard = Array(6).fill().map(() => Array(7).fill(blankBoardEmoji));
                const gameId = `connectfour-${Date.now()}-${interaction.user.id}`;
                let currentPlayerId = interaction.user.id;
                let lastMove = { row: null, col: null };
                
                const opponentDisplay = opponent ? `<@${opponent.id}>` : 'Bot';
                
                const startEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🎮 Connect Four Game')
                    .setDescription(`Game is restarting! ${gameType === 'bot' ? `Difficulty: **${difficulty.toUpperCase()}**` : `<@${interaction.user.id}> vs ${opponentDisplay}`}`)
                    .addFields(
                        { name: 'How to Play', value: 'Click the numbered buttons to drop your piece in that column. Connect 4 pieces horizontally, vertically, or diagonally to win!', inline: false },
                        { name: 'Current Turn', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Game Mode', value: gameType === 'bot' ? `Bot (${difficulty})` : 'Player vs Player', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Game will expire after 10 minutes of inactivity',
                        iconURL: interaction.client.user.displayAvatarURL()
                    });
                
                const newAttachment = await createGameBoardCanvas(gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, null);
                
                await i.update({
                    content: `${gameType === 'bot' ? '🤖' : '👥'} **CONNECT FOUR** | <@${interaction.user.id}>'s turn`,
                    embeds: [startEmbed],
                    files: [newAttachment],
                    components: createBoardComponents(gameId, false)
                });
                
                const newCollector = message.createMessageComponentCollector({
                    time: 600000,
                    filter: j => j.customId.startsWith(gameId) && (j.user.id === interaction.user.id || (opponent && j.user.id === opponent.id))
                });
                
                let nextPlayerId = gameType === 'bot' ? 'bot' : opponent.id;
                
                newCollector.on('collect', async j => {
                    try {
                        await j.deferUpdate();
                        
                        if (j.user.id !== currentPlayerId) {
                            await j.followUp({ content: 'It is not your turn!', flags: MessageFlags.Ephemeral });
                            return;
                        }
                        
                        const parts = j.customId.split('_');
                        const column = parseInt(parts[2]);
                        
                        lastMove = { row: null, col: column };
                        
                        if (!makeMove(gameBoard, column, currentPlayerId === interaction.user.id ? playerEmoji : botEmoji, lastMove)) {
                            await j.followUp({ content: 'This column is full!', flags: MessageFlags.Ephemeral });
                            return;
                        }
                        
                        let winningCoordinates = checkWin(gameBoard, currentPlayerId === interaction.user.id ? playerEmoji : botEmoji);
                        
                        if (winningCoordinates) {
                            const winResult = currentPlayerId === interaction.user.id ? 
                                `<@${interaction.user.id}> has won!` : 
                                (currentPlayerId === 'bot' ? 'Bot has won!' : `<@${opponent.id}> has won!`);
                            
                            await endGame(interaction, message, winResult, gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, winningCoordinates);
                            newCollector.stop();
                            return;
                        } else if (isBoardFull(gameBoard)) {
                            await endGame(interaction, message, "It's a draw!", gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, null);
                            newCollector.stop();
                            return;
                        }
                        
                        const nextPlayerDisplay = nextPlayerId === 'bot' ? 
                            'Bot is thinking...' : 
                            (nextPlayerId === interaction.user.id ? `<@${interaction.user.id}>` : `<@${opponent.id}>`);
                        
                        const turnEmbed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle('🎮 Connect Four Game')
                            .setDescription(`Game in progress! ${gameType === 'bot' ? `Difficulty: **${difficulty.toUpperCase()}**` : `<@${interaction.user.id}> vs ${opponentDisplay}`}`)
                            .addFields(
                                { name: 'Last Move', value: `<@${j.user.id}> placed a piece in column ${column + 1}`, inline: false },
                                { name: 'Next Turn', value: nextPlayerDisplay, inline: true },
                                { name: 'Game Mode', value: gameType === 'bot' ? `Bot (${difficulty})` : 'Player vs Player', inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ 
                                text: 'Game will expire after 10 minutes of inactivity',
                                iconURL: interaction.client.user.displayAvatarURL()
                            });
                        
                        const attachment = await createGameBoardCanvas(gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, null);
                        
                        const nextUserTurn = nextPlayerId === 'bot' ? 
                            'Bot is thinking...' : 
                            `${nextPlayerDisplay}'s turn`;
                        
                        await j.editReply({
                            content: `${gameType === 'bot' ? '🤖' : '👥'} **CONNECT FOUR** | ${nextUserTurn}`,
                            embeds: [turnEmbed],
                            files: [attachment],
                            components: createBoardComponents(gameId, gameType === 'bot' && currentPlayerId === interaction.user.id)
                        });
                        
                        if (gameType === 'bot' && currentPlayerId !== 'bot') {
                            const thinkingTime = difficulty === 'easy' ? 1000 : (difficulty === 'medium' ? 1500 : 2000);
                            await new Promise(resolve => setTimeout(resolve, thinkingTime));
                            
                            await botMove(gameBoard, botEmoji, playerEmoji, difficulty, lastMove);
                            winningCoordinates = checkWin(gameBoard, botEmoji);
                            
                            if (winningCoordinates) {
                                await endGame(interaction, message, 'Bot has won!', gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, winningCoordinates);
                                newCollector.stop();
                                return;
                            } else if (isBoardFull(gameBoard)) {
                                await endGame(interaction, message, "It's a draw!", gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, null);
                                newCollector.stop();
                                return;
                            }
                            
                            const botMoveEmbed = new EmbedBuilder()
                                .setColor('#0099ff')
                                .setTitle('🎮 Connect Four Game')
                                .setDescription(`Game in progress! Difficulty: **${difficulty.toUpperCase()}**`)
                                .addFields(
                                    { name: 'Last Move', value: `Bot placed a piece in column ${lastMove.col + 1}`, inline: false },
                                    { name: 'Next Turn', value: `<@${interaction.user.id}>`, inline: true },
                                    { name: 'Game Mode', value: `Bot (${difficulty})`, inline: true }
                                )
                                .setTimestamp()
                                .setFooter({ 
                                    text: 'Game will expire after 10 minutes of inactivity',
                                    iconURL: interaction.client.user.displayAvatarURL()
                                });
                            
                            const botAttachment = await createGameBoardCanvas(gameBoard, playerEmoji, botEmoji, blankBoardEmoji, lastMove, null);
                            
                            await j.editReply({
                                content: `🤖 **CONNECT FOUR** | <@${interaction.user.id}>'s turn`,
                                embeds: [botMoveEmbed],
                                files: [botAttachment],
                                components: createBoardComponents(gameId, false)
                            });
                            
                            currentPlayerId = interaction.user.id;
                        } else {
                            [currentPlayerId, nextPlayerId] = [nextPlayerId, currentPlayerId];
                        }
                    } catch (error) {
                        console.error('Error handling interaction in restarted game:', error);
                        await j.followUp({ content: 'An error occurred while processing your move. Please try again.', flags: MessageFlags.Ephemeral });
                    }
                });
                
                newCollector.on('end', async (collected, reason) => {
                    if (reason === 'time') {
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('Game Timed Out')
                            .setDescription('This game has expired due to inactivity.')
                            .setTimestamp();
                        
                        await message.edit({ 
                            content: '⏰ **GAME EXPIRED**', 
                            embeds: [timeoutEmbed], 
                            components: [] 
                        });
                    }
                });
                
                collector.stop();
            }
        });
    } catch (error) {
        console.error('Error ending game:', error);
        await interaction.followUp({ content: 'An error occurred while ending the game. Please try again.', flags: MessageFlags.Ephemeral });
    }
}

// function createGameMessage(username, board, currentPlayer, user, opponent) {
//     try {
//         const currentTurn = currentPlayer === user.id ? user.username : (opponent ? opponent.username : 'Bot');
//         return lang.Connectfour.Title.replace("{user}", currentTurn);
//     } catch (error) {
//         console.error('Error creating game message:', error);
//         return 'Error creating game message.';
//     }
// }

function drawConfetti(ctx, width, height) {
    const confettiCount = 75;
    const colors = ['#ff2f60', '#ffcc3c', '#74ee15', '#00bfff', '#f700ff', '#00f7ff', '#ffffff'];
    
    ctx.save();
    
    const centerGlow = ctx.createRadialGradient(
        width/2, height/2, 10,
        width/2, height/2, width/2
    );
    centerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    centerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, width, height);
    
    for (let i = 0; i < confettiCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.pow(Math.random(), 0.5) * width/2;
        const x = width/2 + Math.cos(angle) * distance;
        const y = height/2 + Math.sin(angle) * distance;
        
        const size = Math.random() * 8 + 3;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        ctx.globalAlpha = Math.random() * 0.5 + 0.5;
        ctx.fillStyle = color;
        
        const shapeType = Math.floor(Math.random() * 4);
        
        if (shapeType === 0) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.random() * Math.PI * 2);
            ctx.fillRect(-size/2, -size/2, size, size/3);
            ctx.restore();
        } else if (shapeType === 1) {
            ctx.beginPath();
            ctx.arc(x, y, size/2, 0, Math.PI * 2);
            ctx.fill();
        } else if (shapeType === 2) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.random() * Math.PI * 2);
            ctx.beginPath();
            ctx.moveTo(0, -size/2);
            ctx.lineTo(-size/2, size/2);
            ctx.lineTo(size/2, size/2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else {
            drawStar(ctx, x, y, 5, size/2, size/4);
            ctx.fill();
        }
    }
    
    ctx.restore();
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
}