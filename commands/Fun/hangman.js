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

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
//const fs = require('fs');
//const yaml = require('js-yaml');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader.js');

const lang = getLang();

global.hangmanMessageIDs = global.hangmanMessageIDs || new Set();
const activeGames = new Set();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('😵 Trò chơi Hangman cổ điển')
        .setDMPermission(false),
    category: 'Fun',
    async execute(interaction) {
        if (activeGames.has(interaction.user.id)) {
            await interaction.reply({ content: lang.Hangman.activeGameWarning, flags: MessageFlags.Ephemeral });
            return;
        }

        activeGames.add(interaction.user.id);

        const words = lang.Hangman.words;
        const selectedWord = words[Math.floor(Math.random() * words.length)].toUpperCase();
        let displayedWord = Array(selectedWord.length).fill('⬛');
        let incorrectGuesses = 0;
        const maxIncorrectGuesses = 6; // Changed from 12 to 6
        const guessedLetters = new Set();

        await interaction.reply({
            content: lang.Hangman.gameStartMessage,
            embeds: [createGameEmbed(interaction.user.username, displayedWord, incorrectGuesses, maxIncorrectGuesses)],
        });

        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000 * 5 });

        collector.on('collect', async m => {
            if (m.content.length === 1 && /^[A-ZěščřžýáíéúůĚŠČŘŽÝÁÍÉÚŮ]$/i.test(m.content)) {
                const guess = m.content.toUpperCase();
                if (!guessedLetters.has(guess)) {
                    guessedLetters.add(guess);
                    let correctGuess = false;

                    for (let i = 0; i < selectedWord.length; i++) {
                        if (selectedWord[i] === guess) {
                            displayedWord[i] = guess;
                            correctGuess = true;
                        }
                    }

                    if (!correctGuess) {
                        incorrectGuesses++;
                    }

                    if (!displayedWord.includes('⬛')) {
                        await endGame(interaction, lang.Hangman.winMessage.replace('{username}', interaction.user.username), displayedWord);
                        collector.stop();
                    } else if (incorrectGuesses >= maxIncorrectGuesses) {
                        await endGame(interaction, lang.Hangman.gameOverMessage.replace('{word}', selectedWord), displayedWord, true);
                        collector.stop();
                    } else {
                        await interaction.editReply({
                            content: lang.Hangman.continueMessage,
                            embeds: [createGameEmbed(interaction.user.username, displayedWord, incorrectGuesses, maxIncorrectGuesses)],
                        });
                    }
                }
                global.hangmanMessageIDs.add(m.id);
                try {
                    await m.delete();
                } catch { }
            }
        });

        collector.on('end', collected => {
            activeGames.delete(interaction.user.id);
        });
    },
};

function createGameEmbed(username, displayedWord, incorrectGuesses, maxIncorrectGuesses) {
    const hangmanStages = [
        "```\n     ╔═══╗\n     ║   ║\n         ║\n         ║\n         ║\n         ║\n    ═════╩═════```",
        "```\n     ╔═══╗\n     ║   ║\n     O   ║\n         ║\n         ║\n         ║\n    ═════╩═════```",
        "```\n     ╔═══╗\n     ║   ║\n     O   ║\n     │   ║\n         ║\n         ║\n    ═════╩═════```",
        "```\n     ╔═══╗\n     ║   ║\n     O   ║\n    /│   ║\n         ║\n         ║\n    ═════╩═════```",
        "```\n     ╔═══╗\n     ║   ║\n     O   ║\n    /│\\  ║\n         ║\n         ║\n    ═════╩═════```",
        "```\n     ╔═══╗\n     ║   ║\n     O   ║\n    /│\\  ║\n    /    ║\n         ║\n    ═════╩═════```",
        "```\n     ╔═══╗\n     ║   ║\n     O   ║\n    /│\\  ║\n    / \\  ║\n         ║\n    ═════╩═════```"
    ];

    let color;
    let remainingGuesses = maxIncorrectGuesses - incorrectGuesses;

    if (incorrectGuesses / maxIncorrectGuesses < 0.5) {
        color = '#00ff00';
    } else if (incorrectGuesses / maxIncorrectGuesses < 0.75) {
        color = '#ffff00';
    } else {
        color = '#ff0000';
    }

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(lang.Hangman.embeds.gameTitle.replace("{username}", username))
        .addFields(
            { name: lang.Hangman.embeds.wordToGuess, value: `\`${displayedWord.join(' ')}\``, inline: false },
            { name: lang.Hangman.embeds.guessesLeft, value: `\`${remainingGuesses}/${maxIncorrectGuesses}\``, inline: true },
            { name: lang.Hangman.embeds.hangman, value: hangmanStages[incorrectGuesses], inline: false }
        )
        .setDescription(lang.Hangman.embeds.useChatToGuess)
        .setFooter({ text: lang.Hangman.embeds.guessFooter });
}

async function endGame(interaction, resultMessage, displayedWord, isGameOver = false) {
    const embed = new EmbedBuilder()
        .setColor(isGameOver ? '#ff0000' : '#00ff00')
        .setTitle(lang.Hangman.embeds.gameOverTitle)
        .setDescription(resultMessage)
        .addFields({ name: lang.Hangman.embeds.finalWord, value: `\`${displayedWord.join(' ')}\`` })
        .setFooter({ text: lang.Hangman.embeds.thanksForPlaying });

    await interaction.editReply({
        content: lang.Hangman.embeds.gameEndMessage,
        embeds: [embed],
        components: [],
    }).catch(console.error);

    activeGames.delete(interaction.user.id);
}