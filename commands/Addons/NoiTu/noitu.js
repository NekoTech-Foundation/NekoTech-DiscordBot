const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { checkWord } = require('./vocabApi');

module.exports.run = async (client) => {
    const configPath = path.join(__dirname, 'config.yml');
    const dictionaryPath = path.join(__dirname, 'dictionary.txt');

    let config;
    let localDictionary = new Set();

    try {
        config = yaml.load(fs.readFileSync(configPath, 'utf8'));

        // Load local dictionary as fallback
        if (fs.existsSync(dictionaryPath)) {
            const content = fs.readFileSync(dictionaryPath, 'utf8');
            content.split('\n').forEach(word => {
                const trimmed = word.trim().toLowerCase();
                if (trimmed && trimmed.length > 0) {
                    localDictionary.add(trimmed);
                }
            });
            console.log(`[NoiTu] Local dictionary loaded: ${localDictionary.size} words`);
        }
    } catch (error) {
        console.error('[NoiTu] Failed to load config:', error);
        return;
    }

    // Initialize game sessions
    if (!client.noiTuGames) client.noiTuGames = new Map();
    if (!client.noiTuSetups) client.noiTuSetups = new Map();
    if (!client.noiTuStats) client.noiTuStats = new Map();

    // Normalize Vietnamese text
    function normalizeVietnamese(str) {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .trim();
    }

    function getFirstLetter(word) {
        const normalized = normalizeVietnamese(word);
        const words = normalized.split(/\s+/);
        return words[0].charAt(0);
    }

    function getLastLetter(word) {
        const normalized = normalizeVietnamese(word);
        const words = normalized.split(/\s+/).filter(w => w.length > 0);
        const lastWord = words[words.length - 1];
        return lastWord.charAt(lastWord.length - 1);
    }

    // Validate word với cả API và local dictionary
    async function isValidWord(word) {
        // Kiểm tra local dictionary trước (nhanh hơn)
        if (localDictionary.size > 0) {
            const normalized = word.toLowerCase().trim();
            if (localDictionary.has(normalized)) return true;
        }

        // Gọi API
        try {
            const valid = await checkWord(word);
            return valid;
        } catch (error) {
            console.error('[NoiTu] API check error:', error.message);
            // Fallback về local dictionary
            return localDictionary.has(word.toLowerCase().trim());
        }
    }

    function createEmbed(template, data) {
        const embed = new EmbedBuilder()
            .setColor(template.color || config.settings.default_color)
            .setTitle(template.title);

        let description = template.description;
        for (const [key, value] of Object.entries(data)) {
            description = description.replace(`{${key}}`, value || '');
        }

        embed.setDescription(description);

        if (template.footer) {
            embed.setFooter({ text: template.footer.text });
        }

        return embed;
    }

    // Update player stats
    function updateStats(channelId, userId, username, word) {
        if (!client.noiTuStats.has(channelId)) {
            client.noiTuStats.set(channelId, new Map());
        }

        const channelStats = client.noiTuStats.get(channelId);
        if (!channelStats.has(userId)) {
            channelStats.set(userId, {
                username: username,
                correctWords: 0,
                wrongWords: 0,
                lastWord: null
            });
        }

        const userStats = channelStats.get(userId);
        userStats.correctWords++;
        userStats.lastWord = word;
        userStats.username = username; // Update username
    }

    function incrementWrongStats(channelId, userId, username) {
        if (!client.noiTuStats.has(channelId)) {
            client.noiTuStats.set(channelId, new Map());
        }

        const channelStats = client.noiTuStats.get(channelId);
        if (!channelStats.has(userId)) {
            channelStats.set(userId, {
                username: username,
                correctWords: 0,
                wrongWords: 0,
                lastWord: null
            });
        }

        channelStats.get(userId).wrongWords++;
    }

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.guild) return;

        const game = client.noiTuGames.get(message.channel.id);
        if (!game) return;

        const word = message.content.trim();
        
        // Ignore empty messages
        if (!word || word.length === 0) return;

        // Ignore commands
        if (word.startsWith('/') || word.startsWith('!')) return;

        try {
            // Check same user
            if (game.lastUserId === message.author.id && game.currentWord) {
                const embed = createEmbed(config.messages.wrong_word, {
                    username: message.author.username,
                    word: word,
                    reason: config.lang.errors.same_user
                });
                await message.reply({ embeds: [embed] });
                await message.react('❌');
                incrementWrongStats(message.channel.id, message.author.id, message.author.username);
                return;
            }

            // Check starting letter
            if (game.lastLetter) {
                const firstLetter = getFirstLetter(word);
                if (firstLetter !== game.lastLetter) {
                    const embed = createEmbed(config.messages.wrong_word, {
                        username: message.author.username,
                        word: word,
                        reason: config.lang.errors.wrong_start.replace('{letter}', game.lastLetter.toUpperCase())
                    });
                    await message.reply({ embeds: [embed] });
                    await message.react('❌');
                    incrementWrongStats(message.channel.id, message.author.id, message.author.username);
                    return;
                }
            }

            // Check reused word
            if (game.usedWords.has(word.toLowerCase())) {
                const embed = createEmbed(config.messages.wrong_word, {
                    username: message.author.username,
                    word: word,
                    reason: config.lang.errors.used_word
                });
                await message.reply({ embeds: [embed] });
                await message.react('❌');
                incrementWrongStats(message.channel.id, message.author.id, message.author.username);
                return;
            }

            // Validate word (with loading reaction)
            await message.react('⏳');
            const isValid = await isValidWord(word);
            await message.reactions.removeAll().catch(() => {});

            if (!isValid) {
                const embed = createEmbed(config.messages.wrong_word, {
                    username: message.author.username,
                    word: word,
                    reason: config.lang.errors.invalid_word
                });
                await message.reply({ embeds: [embed] });
                await message.react('❌');
                incrementWrongStats(message.channel.id, message.author.id, message.author.username);
                return;
            }

            // Valid word - update game state
            const lastLetter = getLastLetter(word);
            game.currentWord = word;
            game.lastLetter = lastLetter;
            game.lastUserId = message.author.id;
            game.lastUsername = message.author.username;
            game.usedWords.add(word.toLowerCase());
            game.totalWords = (game.totalWords || 0) + 1;

            // Update stats
            updateStats(message.channel.id, message.author.id, message.author.username, word);

            const embed = createEmbed(config.messages.correct_word, {
                username: message.author.username,
                word: word,
                next_letter: lastLetter.toUpperCase()
            });

            await message.reply({ embeds: [embed] });
            await message.react('✅');

        } catch (error) {
            console.error('[NoiTu] Error processing message:', error);
            await message.react('⚠️');
        }
    });

    console.log('[NoiTu] ✅ Core game system loaded');
};
