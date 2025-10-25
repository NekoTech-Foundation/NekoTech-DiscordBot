const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

module.exports.run = async (client) => {
    const configPath = path.join(__dirname, 'config.yml');
    const dictionaryPath = path.join(__dirname, 'dictionary.txt');
    
    let config;
    let dictionary = new Set();
    
    try {
        config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        
        // Load dictionary
        const dictionaryContent = fs.readFileSync(dictionaryPath, 'utf8');
        dictionaryContent.split('\n').forEach(word => {
            const trimmed = word.trim().toLowerCase();
            if (trimmed) {
                dictionary.add(trimmed);
            }
        });
        
        console.log(`[NoiTu] Loaded ${dictionary.size} words from dictionary`);
    } catch (error) {
        console.error('Failed to load NoiTu config or dictionary:', error);
        return;
    }

    // Khởi tạo game sessions
    if (!client.noiTuGames) {
        client.noiTuGames = new Map();
    }
    if (!client.noiTuSetups) {
        client.noiTuSetups = new Map();
    }

    // Helper function: Chuẩn hóa chữ cái (loại bỏ dấu)
    function normalizeVietnamese(str) {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .trim();
    }

    // Helper function: Lấy chữ cái đầu và cuối (không dấu)
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

    // Helper function: Kiểm tra từ có trong dictionary
    function isValidWord(word) {
        return dictionary.has(word.toLowerCase().trim());
    }

    // Helper function: Tạo embed
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

    // Xử lý timeout
    function startTimeout(game, channelId) {
        if (game.timeoutHandle) {
            clearTimeout(game.timeoutHandle);
        }

        game.timeoutHandle = setTimeout(async () => {
            // Reset game state nhưng KHÔNG xóa game và KHÔNG gửi thông báo
            game.currentWord = null;
            game.lastLetter = null;
            game.lastUserId = null;
            game.lastUsername = null;
            game.timeoutHandle = null;
            // GIỮ game.usedWords để tránh lặp lại từ đã dùng
        }, game.timeout * 1000);
    }

    // Lắng nghe tin nhắn
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.guild) return;

        const game = client.noiTuGames.get(message.channel.id);
        if (!game) return;

        const word = message.content.trim();
        if (!word) return;

        // Kiểm tra người chơi không được chơi liên tiếp
        if (game.lastUserId === message.author.id && game.currentWord) {
            const embed = createEmbed(config.messages.wrong_word, {
                username: message.author.username,
                word: word,
                reason: config.lang.errors.same_user
            });
            await message.reply({ embeds: [embed] });
            await message.react('❌');
            return;
        }

        // Kiểm tra từ có trong dictionary
        if (!isValidWord(word)) {
            const embed = createEmbed(config.messages.wrong_word, {
                username: message.author.username,
                word: word,
                reason: config.lang.errors.invalid_word
            });
            await message.reply({ embeds: [embed] });
            await message.react('❌');
            return;
        }

        // Kiểm tra từ đã được sử dụng chưa
        if (game.usedWords.has(word.toLowerCase())) {
            const embed = createEmbed(config.messages.wrong_word, {
                username: message.author.username,
                word: word,
                reason: config.lang.errors.used_word
            });
            await message.reply({ embeds: [embed] });
            await message.react('❌');
            return;
        }

        // Nếu không phải từ đầu tiên, kiểm tra chữ cái đầu
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
                return;
            }
        }

        // Từ hợp lệ!
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
        await message.react('✅');

        // Bắt đầu đếm ngược timeout
        startTimeout(game, message.channel.id);
    });

    console.log('[NoiTu] Loaded successfully');
};
