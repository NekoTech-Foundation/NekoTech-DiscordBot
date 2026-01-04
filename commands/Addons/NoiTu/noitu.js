const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { checkWord, initDictionary, normalizeForGame, getStats } = require('./vocabApi');

module.exports.run = async (client) => {
    const configPath = path.join(__dirname, 'config.yml');
    
    let config;
    try {
        config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.error('[NoiTu] Failed to load config:', error);
        return;
    }

    // Khởi tạo Smart Dictionary
    // Promise này chạy background, không block boot của bot
    initDictionary().catch(err => console.error('[NoiTu] Init dictionary failed:', err));

    // Initialize game sessions
    if (!client.noiTuGames) client.noiTuGames = new Map();
    if (!client.noiTuSetups) client.noiTuSetups = new Map();
    if (!client.noiTuStats) client.noiTuStats = new Map();

    function getFirstLetter(word) {
        const normalized = normalizeForGame(word);
        const words = normalized.split(/\s+/);
        return words[0].charAt(0);
    }

    function getLastLetter(word) {
        const normalized = normalizeForGame(word);
        const words = normalized.split(/\s+/).filter(w => w.length > 0);
        const lastWord = words[words.length - 1];
        return lastWord.charAt(lastWord.length - 1);
    }

    function createEmbed(template, data) {
        const embed = new EmbedBuilder()
            .setColor(template.color || config?.settings?.default_color || '#0099ff')
            .setTitle(template.title);

        let description = template.description;
        for (const [key, value] of Object.entries(data)) {
            description = description.replace(`{${key}}`, value || '');
        }

        embed.setDescription(description);

        if (template.footer) {
            embed.setFooter({ text: template.footer.text });
        }
        
        // Debug info (optional)
        // const stats = getStats();
        // embed.setFooter({ text: `${template.footer?.text || ''} | Dict: ${stats.dictionarySize} words` });

        return embed;
    }

    // Stats Utils
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
        userStats.username = username;
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
        
        // Ignore empty or commands
        if (!word || word.length === 0) return;
        if (word.startsWith('/') || word.startsWith('!')) return;

        try {
            // 1. Check Previous User
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

            // 2. Check Starting Letter
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
                    
                    // Reset game if enabled strictly? No, just warn.
                    incrementWrongStats(message.channel.id, message.author.id, message.author.username);
                    return;
                }
            }

            // 3. Check Used Words
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

            // 4. Validate Vocabulary (Smart Check)
            await message.react('⏳');
            const isValid = await checkWord(word);
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

            // 5. Valid Word -> Process Success
            const lastLetter = getLastLetter(word);
            game.currentWord = word;
            game.lastLetter = lastLetter;
            game.lastUserId = message.author.id;
            game.lastUsername = message.author.username;
            game.usedWords.add(word.toLowerCase());
            game.totalWords = (game.totalWords || 0) + 1;

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

    console.log('[NoiTu] ✅ Helper loaded (Smart Dictionary Integrations)');
};
