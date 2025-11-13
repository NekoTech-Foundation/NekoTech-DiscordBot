const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { checkWord } = require('./vocabApi');

module.exports.run = async (client) => {
    const configPath = path.join(__dirname, 'config.yml');
    const dictionaryPath = path.join(__dirname, 'dictionary.txt');

    let config;
    let dictionary = new Set(); // optional fallback

    try {
        config = yaml.load(fs.readFileSync(configPath, 'utf8'));

        // Optional: load local dictionary as fallback if file exists
        if (fs.existsSync(dictionaryPath)) {
            try {
                const dictionaryContent = fs.readFileSync(dictionaryPath, 'utf8');
                dictionaryContent.split('\n').forEach(word => {
                    const trimmed = word.trim().toLowerCase();
                    if (trimmed) {
                        dictionary.add(trimmed);
                    }
                });
                console.log(`[NoiTu] Optional fallback dictionary loaded: ${dictionary.size} words`);
            } catch (_) {}
        }
        console.log('[NoiTu] Using external vocabulary API for validation');
    } catch (error) {
        console.error('Failed to load NoiTu config:', error);
        return;
    }

    // Initialize game sessions
    if (!client.noiTuGames) {
        client.noiTuGames = new Map();
    }
    if (!client.noiTuSetups) {
        client.noiTuSetups = new Map();
    }

    // Normalize Vietnamese (remove diacritics)
    function normalizeVietnamese(str) {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/d/g, 'd')
            .trim();
    }

    function getFirstLetter(word) {
        const normalized = normalizeVietnamese(word);
        const words = normalized.split(' ');
        return words[0].charAt(0);
    }

    function getLastLetter(word) {
        const normalized = normalizeVietnamese(word);
        const words = normalized.split(' ');
        const lastWord = words[words.length - 1];
        return lastWord.charAt(lastWord.length - 1);
    }

    // Validate word via external API; fallback to local dictionary if available
    async function isValidWord(word) {
        const ok = await checkWord(word);
        if (ok) return true;
        if (dictionary.size > 0) {
            return dictionary.has(word.toLowerCase().trim());
        }
        return false;
    }

    function createEmbed(template, data) {
        const embed = new EmbedBuilder()
            .setColor(template.color || config.settings.default_color)
            .setTitle(template.title)
            .setDescription(
                template.description
                    .replace('{username}', data.username || '')
                    .replace('{word}', data.word || '')
                    .replace('{next_letter}', data.next_letter || '')
                    .replace('{reason}', data.reason || '')
                    .replace('{timeout}', data.timeout || '')
                    .replace('{letter}', data.letter || '')
            );

        return embed;
    }

    function startTimeout(game, channelId) {
        // Timeout disabled: do not auto end/reset game by inactivity
        if (game.timeoutHandle) {
            try { clearTimeout(game.timeoutHandle); } catch (_) {}
            game.timeoutHandle = null;
        }
        return;
    }

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.guild) return;

        const game = client.noiTuGames.get(message.channel.id);
        if (!game) return;

        const word = message.content.trim();
        if (!word) return;

        // Prevent same user from playing twice in a row
        if (game.lastUserId === message.author.id && game.currentWord) {
            const embed = createEmbed(config.messages.wrong_word, {
                username: message.author.username,
                word: word,
                reason: config.lang.errors.same_user
            });
            await message.reply({ embeds: [embed] });
            await message.react('?');
            return;
        }

        // Validate via API
        if (!(await isValidWord(word))) {
            const embed = createEmbed(config.messages.wrong_word, {
                username: message.author.username,
                word: word,
                reason: config.lang.errors.invalid_word
            });
            await message.reply({ embeds: [embed] });
            await message.react('?');
            return;
        }

        // Check reused word
        if (game.usedWords.has(word.toLowerCase())) {
            const embed = createEmbed(config.messages.wrong_word, {
                username: message.author.username,
                word: word,
                reason: config.lang.errors.used_word
            });
            await message.reply({ embeds: [embed] });
            await message.react('?');
            return;
        }

        // Check starting letter rule
        if (game.lastLetter) {
            const firstLetter = getFirstLetter(word);
            if (firstLetter !== game.lastLetter) {
                const embed = createEmbed(config.messages.wrong_word, {
                    username: message.author.username,
                    word: word,
                    reason: config.lang.errors.wrong_start.replace('{letter}', game.lastLetter.toUpperCase())
                });
                await message.reply({ embeds: [embed] });
                await message.react('?');
                return;
            }
        }

        // Valid word
        const lastLetter = getLastLetter(word);
        game.currentWord = word;
        game.lastLetter = lastLetter;
        game.lastUserId = message.author.id;
        game.lastUsername = message.author.username;
        game.usedWords.add(word.toLowerCase());

        const embed = createEmbed(config.messages.correct_word, {
            username: message.author.username,
            word: word,
            next_letter: lastLetter.toUpperCase()
        });

        await message.reply({ embeds: [embed] });
        await message.react('?');

        // Restart timeout for next turn
        startTimeout(game, message.channel.id);
    });

    console.log('[NoiTu] Loaded successfully');
};
