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

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
//const fs = require('fs');
//const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');
const { createCanvas, loadImage } = require('canvas');

const lang = getLang();
const config = getConfig();

const activeGames = new Set();

function convertSimplePatternToRegex(simplePattern) {
    let regexPattern = simplePattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`, 'i');
}

async function checkBlacklistWords(content) {
    const blacklistRegex = config.BlacklistWords.Patterns.map(pattern => convertSimplePatternToRegex(pattern));
    return blacklistRegex.some(regex => regex.test(content));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wordle')
        .setDescription('🔤 Trò chơi đoán từ Wordle')
        .setDMPermission(false),
    category: 'Fun',
    async execute(interaction) {
        if (activeGames.has(interaction.user.id)) {
            await interaction.reply({ content: lang.Wordle.Messages.GameActive, flags: MessageFlags.Ephemeral });
            return;
        }

        activeGames.add(interaction.user.id);

        const words = lang.Wordle.words;
        const selectedWord = words[Math.floor(Math.random() * words.length)].toUpperCase();
        const maxAttempts = 6;
        let attempts = 0;
        const guessedWords = [];

        const gameCanvas = createGameCanvas(guessedWords);

        await interaction.reply({
            content: lang.Wordle.Messages.LetsPlay,
            files: [new AttachmentBuilder(gameCanvas.toBuffer(), { name: 'wordle.png' })],
        });

        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000 * 5 });

        collector.on('collect', async m => {
            const guess = m.content.toUpperCase();
            if (guess.length === 5 && /^[A-Z]{5}$/.test(guess)) {
                try {
                    await m.delete();
                } catch { }

                if (await checkBlacklistWords(guess)) {
                    const blacklistMessage = lang.BlacklistWords && lang.BlacklistWords.Message
                        ? lang.BlacklistWords.Message.replace(/{user}/g, `${interaction.user}`)
                        : 'Lượt đoán của bạn chứa từ bị cấm.';
                    await interaction.followUp({ content: blacklistMessage, flags: MessageFlags.Ephemeral });
                    return;
                }

                attempts++;
                guessedWords.push(evaluateGuess(guess, selectedWord));

                const gameCanvas = createGameCanvas(guessedWords);

                if (guess === selectedWord) {
                    await endGame(interaction, selectedWord, guessedWords, gameCanvas);
                    collector.stop();
                } else if (attempts >= maxAttempts) {
                    await endGame(interaction, selectedWord, guessedWords, gameCanvas, true);
                    collector.stop();
                } else {
                    await interaction.editReply({
                        content: lang.Wordle.Messages.KeepGuess,
                        files: [new AttachmentBuilder(gameCanvas.toBuffer(), { name: 'wordle.png' })],
                    });
                }
            }
        });

        collector.on('end', collected => {
            activeGames.delete(interaction.user.id);
        });
    },
};

function createGameCanvas(guessedWords) {
    const canvas = createCanvas(500, 700);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#121213';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a1a1b');
    gradient.addColorStop(1, '#121213');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(lang.Wordle.Messages.Title, canvas.width / 2, 50);

    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 5;
    ctx.fillText(lang.Wordle.Messages.Title, canvas.width / 2, 50);
    ctx.shadowBlur = 0;

    const cellSize = 70;
    const offset = 8;
    const startX = (canvas.width - (cellSize + offset) * 5) / 2;
    const startY = 90;

    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 5; j++) {
            ctx.fillStyle = '#3a3a3c';
            roundRect(ctx, startX + j * (cellSize + offset), startY + i * (cellSize + offset), cellSize, cellSize, 10);
        }
    }

    for (let i = 0; i < guessedWords.length; i++) {
        for (let j = 0; j < guessedWords[i].length; j++) {
            ctx.fillStyle = guessedWords[i][j].color;
            roundRect(ctx, startX + j * (cellSize + offset), startY + i * (cellSize + offset), cellSize, cellSize, 10);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(guessedWords[i][j].letter, startX + j * (cellSize + offset) + cellSize / 2, startY + i * (cellSize + offset) + cellSize / 2);
        }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    const footerY = startY + 6 * (cellSize + offset) + 30;
    ctx.fillText(lang.Wordle.Messages.BottomFirst, canvas.width / 2, footerY);
    ctx.fillText(lang.Wordle.Messages.BottomLast, canvas.width / 2, footerY + 30);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    roundRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 20, false, true);

    return canvas;
}

function roundRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
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

function evaluateGuess(guess, word) {
    const result = Array(5).fill({ letter: '⬛', color: '#3a3a3c' });
    const wordLetters = word.split('');

    for (let i = 0; i < 5; i++) {
        if (guess[i] === word[i]) {
            result[i] = { letter: guess[i], color: '#538d4e' };
            wordLetters[i] = null;
        }
    }

    for (let i = 0; i < 5; i++) {
        if (result[i].color === '#538d4e') continue;
        if (wordLetters.includes(guess[i])) {
            result[i] = { letter: guess[i], color: '#b59f3b' };
            wordLetters[wordLetters.indexOf(guess[i])] = null;
        } else {
            result[i] = { letter: guess[i], color: '#3a3a3c' };
        }
    }

    return result;
}

async function endGame(interaction, word, guessedWords, gameCanvas, isGameOver = false) {
    const color = isGameOver ? '#ff0000' : '#00ff00';

    const resultMessage = lang.Wordle.Embed.Description.replace('{word}', word);

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(lang.Wordle.Embed.Title)
        .setDescription(resultMessage)
        .setFooter({ text: lang.Wordle.Embed.Footer });

    await interaction.editReply({
        content: lang.Wordle.Embed.Title,
        embeds: [embed],
        files: [new AttachmentBuilder(gameCanvas.toBuffer(), { name: 'wordle.png' })],
        components: [],
    }).catch(console.error);

    activeGames.delete(interaction.user.id);
}