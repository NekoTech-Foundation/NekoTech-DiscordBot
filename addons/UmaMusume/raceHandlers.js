/**
 * All race-related command handlers for Uma Musume
 */

const raceEngine = require('./raceEngine');
const { allSkills } = require('./skillsEngine');
const tracksData = require('./tracksAndRaces.json');
const EmbedBuilder = require('discord.js').EmbedBuilder;
const EconomyUserData = require('../../models/EconomyUserData');

/**
 * Handle /uma race command
 * PvE race with random track selection and new racing engine
 */
async function handleRace(interaction, uma, userId) {
    await interaction.deferReply();

    // Select random race from available races
    const availableRaces = tracksData.races;
    const selectedRace = availableRaces[Math.floor(Math.random() * availableRaces.length)];

    // Get track info
    const track = tracksData.tracks.find(t => t.id === selectedRace.trackId);

    // Random weather from race's possible weather
    const weather = selectedRace.weather[Math.floor(Math.random() * selectedRace.weather.length)];

    // Create race configuration
    const raceConfig = {
        distance: selectedRace.distance,
        surface: selectedRace.surface,
        turnDirection: track?.turnDirection || 'right',
        trackCondition: track?.trackCondition || 'firm',
        weather: weather,
        season: selectedRace.season || 'spring',
        difficulty: selectedRace.difficulty || 5
    };

    // Generate bots
    const bots = raceEngine.generateBots(raceConfig.difficulty, 11, raceConfig.distance);

    // Run race simulation
    const result = await raceEngine.simulateRace(uma, bots, raceConfig);

    // Update stats and give rewards
    if (result.position <= 3) {
        uma.raceStats = uma.raceStats || { totalRaces: 0, wins: 0, places: 0, shows: 0 };

        if (result.position === 1) uma.raceStats.wins++;
        else if (result.position === 2) uma.raceStats.places++;
        else if (result.position === 3) uma.raceStats.shows++;

        uma.raceStats.totalRaces++;
        uma.skillPoints = (uma.skillPoints || 0) + result.skillPoints;
        await uma.save();

        // Give coins
        const userEconomy = await EconomyUserData.findOne({ userId });
        if (userEconomy) {
            userEconomy.balance += result.reward;
            await userEconomy.save();
        }
    }

    // Create result embed
    const positionEmoji = result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : result.position === 3 ? '🥉' : '📍';

    const embed = new EmbedBuilder()
        .setTitle(`🏁 ${selectedRace.name}`)
        .setDescription(`**${uma.name}** tham gia cuộc đua!\\n\\n**Trường đua:** ${track?.emoji || '🏇'} ${track?.name || selectedRace.trackId}\\n**Thời tiết:** ${getWeatherEmoji(weather)} ${weather}`)
        .setColor(result.position === 1 ? '#FFD700' : result.position === 2 ? '#C0C0C0' : result.position === 3 ? '#CD7F32' : '#808080')
        .addFields(
            { name: '🏆 Kết quả', value: `${positionEmoji} Hạng **${result.position}**/${result.totalRacers}`, inline: true },
            { name: '🏇 Cự ly', value: `${selectedRace.distance}m (${raceConfig.surface})`, inline: true },
            { name: '💨 Stamina cuối', value: `${Math.round(result.finalStamina)}%`, inline: true }
        );

    // Show activated skills
    if (result.skillActivations && result.skillActivations.length > 0) {
        const skillsText = result.skillActivations
            .map(sa => `✨ ${sa.skillName}`)
            .slice(0, 5) // Show max 5
            .join('\\n');
        embed.addFields({ name: '⚡ Skills Activated', value: skillsText || 'Không có', inline: false });
    }

    // Rewards
    if (result.position <= 3) {
        embed.addFields({
            name: '🎁 Phần thưởng',
            value: `💰 **${result.reward}** coins\\n🎯 **${result.skillPoints}** Skill Points`,
            inline: false
        });
    }

    // Top 5 finishers
    const top5Text = result.positions
        .slice(0, 5)
        .map((p, i) => `${i + 1}. ${p.isPlayer ? '**' + p.name + '**' : p.name}`)
        .join('\\n');
    embed.addFields({ name: '📊 Top 5', value: top5Text, inline: false });

    embed.setTimestamp();

    return interaction.editReply({ embeds: [embed] });
}

/**
 * Handle /uma pvp command
 * PvP race against another player's Uma
 */
async function handlePvP(interaction, uma, userId, opponentId) {
    const opponent = await interaction.client.users.fetch(opponentId);

    if (opponent.id === userId) {
        return interaction.reply({ content: '❌ Bạn không thể thách đấu chính mình!', ephemeral: true });
    }

    const UserUmaModel = require('./schemas/useruma');
    const opponentUma = await UserUmaModel.findOne({ userId: opponent.id, isFavorite: true });

    if (!opponentUma) {
        const firstUma = await UserUmaModel.findOne({ userId: opponent.id, isRetired: false });
        if (!firstUma) {
            return interaction.reply({ content: '❌ Đối thủ chưa có mã nương nào!', ephemeral: true });
        }
        opponentUma = firstUma;
    }

    await interaction.deferReply();

    // Select a balanced race
    const neutralRaces = tracksData.races.filter(r => r.difficulty >= 5 && r.difficulty <= 7);
    const selectedRace = neutralRaces[Math.floor(Math.random() * neutralRaces.length)];
    const track = tracksData.tracks.find(t => t.id === selectedRace.trackId);

    const raceConfig = {
        distance: selectedRace.distance,
        surface: selectedRace.surface,
        turnDirection: track?.turnDirection || 'right',
        trackCondition: track?.trackCondition || 'firm',
        weather: 'Clear',
        season: selectedRace.season || 'spring',
        difficulty: selectedRace.difficulty
    };

    // Generate bots (fewer for PvP)
    const bots = raceEngine.generateBots(raceConfig.difficulty - 1, 10, raceConfig.distance);

    // Add opponent uma as a bot
    bots.push({
        name: opponentUma.name + ' (Opponent)',
        stats: opponentUma.stats,
        trackPreferences: opponentUma.trackPreferences || {},
        skills: opponentUma.skills || [],
        strategy: 'chaser' // Could determine from preferences
    });

    const result = await raceEngine.simulateRace(uma, bots, raceConfig);

    // Determine results
    const playerWon = result.position === 1;
    const opponentPosition = result.positions.find(p => p.name.includes('(Opponent)'))?.position || 99;

    // Rewards for winner
    const betAmount = 200;
    if (playerWon) {
        const userEconomy = await EconomyUserData.findOne({ userId });
        if (userEconomy) {
            userEconomy.balance += betAmount * 2;
            await userEconomy.save();
        }
        uma.skillPoints = (uma.skillPoints || 0) + 15;
        await uma.save();
    }

    const positionEmoji = result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : result.position === 3 ? '🥉' : '📍';

    const embed = new EmbedBuilder()
        .setTitle(`⚔️ PvP Race: ${selectedRace.name}`)
        .setDescription(`**${interaction.user.username}** vs **${opponent.username}**\\n\\n${track?.emoji || '🏇'} ${track?.name}\\n🏁 ${selectedRace.distance}m`)
        .setColor(playerWon ? '#FFD700' : '#C0C0C0')
        .addFields(
            { name: `${interaction.user.username} (${uma.name})`, value: `${positionEmoji} Hạng **${result.position}**`, inline: true },
            { name: `${opponent.username} (${opponentUma.name})`, value: `${opponentPosition === 1 ? '🥇' : opponentPosition === 2 ? '🥈' : opponentPosition === 3 ? '🥉' : '📍'} Hạng **${opponentPosition}**`, inline: true }
        );

    if (playerWon) {
        embed.addFields({
            name: '🎊 Chiến thắng!',
            value: `Bạn nhận được:\\n💰 **${betAmount * 2}** coins\\n🎯 **15** Skill Points`
        });
    } else {
        embed.addFields({
            name: '😔 Thua cuộc',
            value: 'Cố gắng hơn lần sau!'
        });
    }

    embed.setTimestamp();

    return interaction.editReply({ embeds: [embed] });
}

/**
 * Get weather emoji
 */
function getWeatherEmoji(weather) {
    const emojis = {
        'Clear': '☀️',
        'Sunny': '🌤️',
        'Cloudy': '☁️',
        'Rainy': '🌧️',
        'Foggy': '🌫️',
        'Snowy': '❄️'
    };
    return emojis[weather] || '🌈';
}

module.exports = {
    handleRace,
    handlePvP
};
