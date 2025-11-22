/*
  _____            _           ____        _   
 |  __ \          | |         |  _ \      | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                             
 Cảm ơn bạn đã chọn Drako Bot!

 Nếu bạn gặp bất kỳ vấn đề nào, cần hỗ trợ, hoặc có đề xuất để cải thiện bot,
 chúng tôi mời bạn kết nối với chúng tôi trên máy chủ Discord và tạo một phiếu hỗ trợ: 

http://discord.drakodevelopment.net

*/

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { createCanvas } = require('canvas');
//const fs = require('fs');
//const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

const lang = getLang();
const config = getConfig();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('❌ Trò chơi Cờ Ca-rô')
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
        const gameType = interaction.options.getString('type');
        const opponent = interaction.options.getUser('opponent');
        const difficulty = interaction.options.getString('difficulty') || 'medium';
        const emojis = {
            x: lang.TicTacToe.Board.Emojis.X,
            o: lang.TicTacToe.Board.Emojis.O,
            blank: lang.TicTacToe.Board.Emojis.Blank
        };

        const gameId = `ttt-${Date.now()}-${interaction.user.id}`;

        if (gameType === 'player' && !opponent) {
            return interaction.reply({ content: lang.TicTacToe.Messages.OwnGame, flags: MessageFlags.Ephemeral });
        }

        await startGame(interaction, gameId, emojis, gameType === 'bot', opponent, difficulty);
    },
};

async function startGame(interaction, gameId, emojis, againstBot, opponent, difficulty) {
    const gameBoard = Array(3).fill().map(() => Array(3).fill(emojis.blank));
    const currentPlayer = interaction.user.id;

    const attachment = await createGameBoardCanvas(gameBoard, emojis);
    await interaction.reply({
        content: createGameMessage(interaction.user.username, gameBoard, currentPlayer, interaction.user, opponent),
        files: [attachment],
        components: createBoardComponents(gameBoard, emojis, gameId)
    });

    const message = await interaction.fetchReply();
    const originalMessageId = message.id;

    const collector = interaction.channel.createMessageComponentCollector({
        componentType: 2,
        time: 60000 * 5,
        filter: i => i.customId.startsWith(gameId) && (i.user.id === currentPlayer || (!againstBot && i.user.id === opponent.id))
    });

    let currentPlayerId = currentPlayer;
    let nextPlayerId = againstBot ? null : opponent.id;

    collector.on('collect', async i => {
        if (i.user.id !== currentPlayerId) {
            return i.reply({ content: 'Chưa đến lượt của bạn!', flags: MessageFlags.Ephemeral });
        }

        const parts = i.customId.split('-');
        const rowIndex = parseInt(parts[3], 10);
        const cellIndex = parseInt(parts[4], 10);

        if (typeof gameBoard[rowIndex] === 'undefined' || typeof gameBoard[rowIndex][cellIndex] === 'undefined') {
            return;
        }

        const symbol = currentPlayerId === interaction.user.id ? emojis.x : emojis.o;
        gameBoard[rowIndex][cellIndex] = symbol;

        const winningLine = checkWin(gameBoard, symbol);
        if (winningLine) {
            await endGame(interaction, i.message, `${i.user.username} đã thắng!`, gameBoard, emojis, winningLine);
            collector.stop();
            return;
        } else if (isBoardFull(gameBoard, emojis.blank)) {
            await endGame(interaction, i.message, "Hòa!", gameBoard, emojis);
            collector.stop();
            return;
        }

        if (againstBot) {
            smarterBotMove(gameBoard, emojis, difficulty);
            const botWinningLine = checkWin(gameBoard, emojis.o);
            if (botWinningLine) {
                await endGame(interaction, i.message, "Bot đã thắng!", gameBoard, emojis, botWinningLine);
                collector.stop();
                return;
            } else if (isBoardFull(gameBoard, emojis.blank)) {
                await endGame(interaction, i.message, "Hòa!", gameBoard, emojis);
                collector.stop();
                return;
            }
        } else {
            [currentPlayerId, nextPlayerId] = [nextPlayerId, currentPlayerId];
        }

        const newAttachment = await createGameBoardCanvas(gameBoard, emojis);
        await i.update({
            content: createGameMessage(interaction.user.username, gameBoard, currentPlayerId, interaction.user, opponent),
            files: [newAttachment],
            components: createBoardComponents(gameBoard, emojis, gameId)
        });
    });
}

async function createGameBoardCanvas(board, emojis, winningLine = null) {
    const canvas = createCanvas(500, 500);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    const dotSpacing = 20;
    for (let x = 0; x < canvas.width; x += dotSpacing) {
        for (let y = 0; y < canvas.height; y += dotSpacing) {
            ctx.beginPath();
            ctx.arc(x, y, 0.75, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();

    const borderWidth = 12;
    const gameAreaSize = canvas.width - (borderWidth * 2);
    const cellSize = gameAreaSize / 3;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#2c3e50';
    roundRect(ctx, borderWidth, borderWidth, canvas.width - borderWidth * 2, canvas.height - borderWidth * 2, 16, true);
    ctx.restore();

    const innerGlow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 50,
        canvas.width / 2, canvas.height / 2, canvas.width / 1.5
    );
    innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    innerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = innerGlow;
    roundRect(ctx, borderWidth, borderWidth, canvas.width - borderWidth * 2, canvas.height - borderWidth * 2, 16, true);

    ctx.strokeStyle = '#8195a7';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(148, 163, 184, 0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.beginPath();
    for (let i = 1; i < 3; i++) {
        const pos = borderWidth + i * cellSize;
        ctx.moveTo(pos, borderWidth * 1.5);
        ctx.lineTo(pos, canvas.height - borderWidth * 1.5);
        ctx.moveTo(borderWidth * 1.5, pos);
        ctx.lineTo(canvas.width - borderWidth * 1.5, pos);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const x = borderWidth + c * cellSize;
            const y = borderWidth + r * cellSize;
            if (board[r][c] === emojis.x) {
                drawX(ctx, x, y, cellSize);
            } else if (board[r][c] === emojis.o) {
                drawO(ctx, x, y, cellSize);
            }
        }
    }

    if (winningLine) {
        ctx.save();
        ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';

        const [[startRow, startCol], , [endRow, endCol]] = winningLine;
        const startX = borderWidth + (startCol + 0.5) * cellSize;
        const startY = borderWidth + (startRow + 0.5) * cellSize;
        const endX = borderWidth + (endCol + 0.5) * cellSize;
        const endY = borderWidth + (endRow + 0.5) * cellSize;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        const lineGradient = ctx.createLinearGradient(startX, startY, endX, endY);
        lineGradient.addColorStop(0, '#e2e8f0');
        lineGradient.addColorStop(0.5, '#f8fafc');
        lineGradient.addColorStop(1, '#e2e8f0');

        ctx.strokeStyle = lineGradient;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();

        for (const [row, col] of winningLine) {
            const x = borderWidth + (col + 0.5) * cellSize;
            const y = borderWidth + (row + 0.5) * cellSize;

            ctx.save();
            ctx.globalAlpha = 0.08;
            ctx.beginPath();
            ctx.arc(x, y, cellSize * 0.4, 0, Math.PI * 2);
            const glowGradient = ctx.createRadialGradient(
                x, y, 0,
                x, y, cellSize * 0.4
            );
            glowGradient.addColorStop(0, '#ffffff');
            glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glowGradient;
            ctx.fill();
            ctx.restore();
        }
    }

    const borderGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    borderGradient.addColorStop(0, '#64748b');
    borderGradient.addColorStop(1, '#475569');

    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 3;
    roundRect(ctx, borderWidth, borderWidth, canvas.width - borderWidth * 2, canvas.height - borderWidth * 2, 16, false, true);

    const buffer = canvas.toBuffer();
    return new AttachmentBuilder(buffer, { name: 'tic-tac-toe.png' });
}

function drawX(ctx, x, y, size) {
    const padding = size * 0.22;
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    ctx.save();

    const xGradient = ctx.createLinearGradient(
        x + padding, y + padding,
        x + size - padding, y + size - padding
    );
    xGradient.addColorStop(0, '#ef4444');
    xGradient.addColorStop(1, '#dc2626');

    ctx.strokeStyle = xGradient;
    ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x + padding, y + padding);
    ctx.lineTo(x + size - padding, y + size - padding);
    ctx.moveTo(x + size - padding, y + padding);
    ctx.lineTo(x + padding, y + size - padding);
    ctx.stroke();

    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#fca5a5';
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(x + padding + 4, y + padding + 4);
    ctx.lineTo(x + padding + size / 5, y + padding + size / 5);
    ctx.stroke();
    ctx.restore();
}

function drawO(ctx, x, y, size) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = (size / 2) * 0.65;

    ctx.save();

    const oGradient = ctx.createLinearGradient(
        centerX - radius, centerY - radius,
        centerX + radius, centerY + radius
    );
    oGradient.addColorStop(0, '#3b82f6');
    oGradient.addColorStop(1, '#2563eb');

    ctx.strokeStyle = oGradient;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#93c5fd';
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.8, Math.PI * 0.9, Math.PI * 1.7);
    ctx.stroke();
    ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius, fill = false, stroke = true) {
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

function createBoardComponents(board, emojis, gameId) {
    return board.map((row, rowIndex) =>
        new ActionRowBuilder().addComponents(
            row.map((cell, cellIndex) => new ButtonBuilder()
                .setCustomId(`${gameId}-${rowIndex}-${cellIndex}`)
                .setEmoji(cell === emojis.x ? '❌' : cell === emojis.o ? '⭕' : '⬛')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(cell !== emojis.blank)
            )
        )
    );
}

function checkWin(board, mark) {
    const lines = [
        [[0, 0], [0, 1], [0, 2]], [[1, 0], [1, 1], [1, 2]], [[2, 0], [2, 1], [2, 2]],
        [[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]], [[0, 2], [1, 2], [2, 2]],
        [[0, 0], [1, 1], [2, 2]], [[2, 0], [1, 1], [0, 2]]
    ];
    for (let line of lines) {
        if (line.every(([r, c]) => board[r][c] === mark)) {
            return line;
        }
    }
    return null;
}

function isBoardFull(board, blank) {
    return board.every(row => row.every(cell => cell !== blank));
}

function smarterBotMove(board, emojis, difficulty) {
    const randomness = difficulty === 'hard' ? 0.1 : difficulty === 'medium' ? 0.5 : 0.9;

    const makeRandomMove = () => {
        const emptyCells = [];
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (board[r][c] === emojis.blank) {
                    emptyCells.push([r, c]);
                }
            }
        }
        if (emptyCells.length > 0) {
            const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            board[r][c] = emojis.o;
            return true;
        }
        return false;
    };

    const canWinNext = (mark) => {
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (board[r][c] === emojis.blank) {
                    board[r][c] = mark;
                    const win = checkWin(board, mark);
                    board[r][c] = emojis.blank;
                    if (win) return [r, c];
                }
            }
        }
        return null;
    };

    if (Math.random() < randomness) {
        if (makeRandomMove()) return;
    }

    let move = canWinNext(emojis.o);
    if (move) {
        board[move[0]][move[1]] = emojis.o;
        return;
    }

    move = canWinNext(emojis.x);
    if (move) {
        board[move[0]][move[1]] = emojis.o;
        return;
    }

    if (board[1][1] === emojis.blank) {
        board[1][1] = emojis.o;
        return;
    }

    const corners = [[0, 0], [0, 2], [2, 0], [2, 2]];
    const oppositeCorners = corners.filter(([r, c]) => board[r][c] === emojis.x).map(([r, c]) => [2 - r, 2 - c]);
    for (let [r, c] of oppositeCorners) {
        if (board[r][c] === emojis.blank) {
            board[r][c] = emojis.o;
            return;
        }
    }

    const emptyCorners = corners.filter(([r, c]) => board[r][c] === emojis.blank);
    if (emptyCorners.length > 0) {
        const [r, c] = emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
        board[r][c] = emojis.o;
        return;
    }

    const sides = [[0, 1], [1, 0], [1, 2], [2, 1]];
    const emptySides = sides.filter(([r, c]) => board[r][c] === emojis.blank);
    if (emptySides.length > 0) {
        const [r, c] = emptySides[Math.floor(Math.random() * emptySides.length)];
        board[r][c] = emojis.o;
        return;
    }
}

function createGameMessage(username, board, currentPlayer, user, opponent) {
    const currentTurn = currentPlayer === user.id ? user.username : opponent.username;
    return `Đến lượt của ${currentTurn}!`;
}

async function endGame(interaction, message, resultMessage, gameBoard, emojis, winningLine = null) {
    const attachment = await createGameBoardCanvas(gameBoard, emojis, winningLine);
    let color, description;

    if (resultMessage.includes("đã thắng!")) {
        if (resultMessage.includes(interaction.user.username)) {
            color = lang.TicTacToe.Colors.Win;
            description = (lang.TicTacToe.Messages.Win || '## **Làm tốt lắm {user}! Bạn đã thắng!**').replace(`{user}`, `<@${interaction.user.id}>`);
        } else {
            color = lang.TicTacToe.Colors.Lose;
            description = (lang.TicTacToe.Messages.Lost || '## **Xin lỗi {user}, bạn đã thua!**').replace(`{user}`, `<@${interaction.user.id}>`);
        }
    } else {
        color = lang.TicTacToe.Colors.Tie;
        description = (lang.TicTacToe.Messages.Tie || "## **Hòa rồi {user}!**").replace(`{user}`, `<@${interaction.user.id}>`);
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(lang.TicTacToe.Messages.GameOver)
        .setDescription(description)
        .setImage('attachment://tic-tac-toe.png')
        .setFooter({ text: lang.TicTacToe.Messages.ThanksForPlaying, iconURL: interaction.user.displayAvatarURL() });

    await message.edit({ embeds: [embed], files: [attachment], components: [] }).catch(console.error);
}