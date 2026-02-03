const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { checkWord, initDictionary, normalizeForGame, getStats } = require('./vocabApi');
const WordChainSession = require('../../../models/WordChainSession');
const WordChainStats = require('../../../models/WordChainStats');

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
    initDictionary().catch(err => console.error('[NoiTu] Init dictionary failed:', err));

    // Initialize game maps
    if (!client.noiTuGames) client.noiTuGames = new Map();
    if (!client.noiTuSetups) client.noiTuSetups = new Map();
    if (!client.noiTuStats) client.noiTuStats = new Map(); // Cache for stats

    // --- Persistence: Load Active Sessions ---
    try {
        const sessions = await WordChainSession.find({}); // Load all
        for (const session of sessions) {
            // Restore Set from Array
            const usedWordsSet = new Set(session.usedWords || []);
            client.noiTuGames.set(session.channelId, {
                ...session,
                usedWords: usedWordsSet,
                save: session.save
                // Note: The object returned by find() is wrapped with .save(), but we're destructing it?
                // SQLiteModel returns wrapped objects. If we spread, we lose the .save method if it's on the prototype or non-enumerable?
                // SQLiteModel _wrap defines .save on the object instance.
                // We should keep the session object itself as the game state if possible, or link them.
                // Let's store the raw object in Map, but we need to handle the .save() call manualy or keep the wrapped object.
                // Best approach: Use the session object directly in the Map.
            });
            // Fix: The session object from SQLiteModel has usedWords as array. We need Set for game logic.
            // We can add a property .usedWordsSet to the session object and use that for logic, syncing back to .usedWords array before save.
            const sessionObj = session;
            sessionObj.usedWordsSet = usedWordsSet;
            client.noiTuGames.set(session.channelId, sessionObj);
        }
        console.log(`[NoiTu] Loaded ${sessions.length} active game sessions.`);
    } catch (err) {
        console.error('[NoiTu] Error loading sessions:', err);
    }

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

        return embed;
    }

    // Stats Utils with Persistence
    async function updateStats(channelId, userId, username, word) {
        try {
            // Find or Create
            let stats = await WordChainStats.findOne({ guildId: client.channels.cache.get(channelId)?.guild.id, channelId, userId });
            if (!stats) {
                stats = await WordChainStats.create({
                    guildId: client.channels.cache.get(channelId)?.guild.id,
                    channelId,
                    userId,
                    username
                });
            }

            stats.username = username;
            stats.correctWords = (stats.correctWords || 0) + 1;
            stats.lastWord = word;
            await stats.save();

            // Update Cache (for leaderboard/stats commands if they use cache)
            // Ideally commands should fetch from DB now. But let's maintain cache if needed or deprecate it.
            // cmd_noitu.js uses client.noiTuStats. We should support that or change cmd_noitu.js.
            // Let's update cache to keep compatibility for now, but DB is source of truth.
            if (!client.noiTuStats.has(channelId)) client.noiTuStats.set(channelId, new Map());
            client.noiTuStats.get(channelId).set(userId, stats);

        } catch (e) {
            console.error('[NoiTu] Stats Save Error:', e);
        }
    }

    async function incrementWrongStats(channelId, userId, username) {
        try {
            let stats = await WordChainStats.findOne({ guildId: client.channels.cache.get(channelId)?.guild.id, channelId, userId });
            if (!stats) {
                stats = await WordChainStats.create({
                    guildId: client.channels.cache.get(channelId)?.guild.id,
                    channelId,
                    userId,
                    username
                });
            }

            stats.username = username;
            stats.wrongWords = (stats.wrongWords || 0) + 1;
            await stats.save();

            if (!client.noiTuStats.has(channelId)) client.noiTuStats.set(channelId, new Map());
            client.noiTuStats.get(channelId).set(userId, stats);
        } catch (e) {
            console.error('[NoiTu] Stats wrong increment Error:', e);
        }
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
            // Use local Set for check
            const usedWordsSet = game.usedWordsSet || new Set(game.usedWords || []);

            // 1. Check Previous User
            if (game.lastUserId === message.author.id && game.currentWord) {
                const embed = createEmbed(config.messages.wrong_word, {
                    username: message.author.username,
                    word: word,
                    reason: config.lang.errors.same_user
                });
                await message.reply({ embeds: [embed] });
                await message.react('❌');
                await incrementWrongStats(message.channel.id, message.author.id, message.author.username);
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
                    await incrementWrongStats(message.channel.id, message.author.id, message.author.username);
                    return;
                }
            }

            // 3. Check Used Words
            if (usedWordsSet.has(word.toLowerCase())) {
                const embed = createEmbed(config.messages.wrong_word, {
                    username: message.author.username,
                    word: word,
                    reason: config.lang.errors.used_word
                });
                await message.reply({ embeds: [embed] });
                await message.react('❌');
                await incrementWrongStats(message.channel.id, message.author.id, message.author.username);
                return;
            }

            // 4. Validate Vocabulary (Smart Check)
            await message.react('⏳');
            const isValid = await checkWord(word);
            await message.reactions.removeAll().catch(() => { });

            if (!isValid) {
                const embed = createEmbed(config.messages.wrong_word, {
                    username: message.author.username,
                    word: word,
                    reason: config.lang.errors.invalid_word
                });
                await message.reply({ embeds: [embed] });
                await message.react('❌');
                await incrementWrongStats(message.channel.id, message.author.id, message.author.username);
                return;
            }

            // 5. Valid Word -> Process Success
            const lastLetter = getLastLetter(word);
            game.currentWord = word;
            game.lastLetter = lastLetter;
            game.lastUserId = message.author.id;
            game.lastUsername = message.author.username;

            usedWordsSet.add(word.toLowerCase());
            game.usedWordsSet = usedWordsSet;

            // Sync to DB property
            game.usedWords = Array.from(usedWordsSet);
            game.totalWords = (game.totalWords || 0) + 1;

            // Save Game State
            if (game.save) {
                await game.save();
            } else {
                // If for some reason save is missing (shouldn't happen with loaded models)
                // Try finding and updating manually?
                // Should be fine if we loaded correctly.
                // If it's a new game created via setup, we need to ensure it's a model instance.
                // We'll handle that in cmd_noitu.js 'setup' command.
            }

            await updateStats(message.channel.id, message.author.id, message.author.username, word);

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

    console.log('[NoiTu] ✅ Helper loaded (Smart Dictionary Integrations + Persistence)');
};
