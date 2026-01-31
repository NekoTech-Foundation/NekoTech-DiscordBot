const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const FishingTournament = require('./schemas/FishingTournament');
const { getLang } = require('../../../utils/langLoader');

// Helper to check/update tournament on catch (Called from fish.js)
async function checkTournamentCatch(guildId, userId, fish) {
    const tournament = await FishingTournament.findOne({ guildId });
    if (!tournament || !tournament.active) return;

    if (tournament.targetFish && tournament.targetFish !== fish.name) return;

    const participantIndex = tournament.participants.findIndex(p => p.userId === userId);
    let participant = participantIndex > -1 ? tournament.participants[participantIndex] : { userId, score: 0, bestFish: '', bestFishWeight: 0 };

    let scoreChanged = false;

    if (tournament.type === 'heaviest') {
        if (fish.totalWeight > participant.score) {
            participant.score = fish.totalWeight;
            participant.bestFish = fish.name;
            participant.bestFishWeight = fish.totalWeight;
            scoreChanged = true;
        }
    } else if (tournament.type === 'most_caught') {
        participant.score += 1;
        scoreChanged = true;
    } else if (tournament.type === 'rarest') {
        const rarityScore = { common: 1, uncommon: 5, rare: 20, epic: 100, legendary: 500 };
        const score = rarityScore[fish.rarity] || 0;
        if (score > participant.score) {
            participant.score = score;
            participant.bestFish = fish.name;
            scoreChanged = true;
        }
    }

    if (scoreChanged) {
        if (participantIndex > -1) {
            tournament.participants[participantIndex] = participant;
        } else {
            tournament.participants.push(participant);
        }
        await tournament.save();
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fishing_tournament')
        .setDescription('Hệ thống giải đấu câu cá')
        .addSubcommand(sub =>
            sub.setName('view').setDescription('Xem giải đấu đang diễn ra')
        )
        .addSubcommand(sub =>
            sub.setName('leaderboard').setDescription('Xem bảng xếp hạng giải đấu')
        ),
    category: 'Addons',

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const tournament = await FishingTournament.findOne({ guildId: interaction.guild.id });

        if (!tournament || !tournament.active) {
            return interaction.reply({ content: 'Hiện không có giải đấu nào đang diễn ra! Hãy quay lại sau.', ephemeral: true });
        }

        if (sub === 'view') {
            const timeLeft = Math.max(0, tournament.endTime - Date.now());
            const hours = Math.floor(timeLeft / 3600000);
            const minutes = Math.floor((timeLeft % 3600000) / 60000);

            const embed = new EmbedBuilder()
                .setTitle('🏆 Giải Đấu Câu Cá Đang Diễn Ra!')
                .setDescription(`**Chủ đề:** ${getTournamentTitle(tournament.type)}\n**Kết thúc trong:** ${hours}h ${minutes}m`)
                .addFields(
                    { name: 'Mục tiêu', value: tournament.targetFish || 'Tất cả các loại cá' },
                    { name: 'Người dẫn đầu', value: getLeaderText(tournament.participants) }
                )
                .setColor('Gold');

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'leaderboard') {
            const sorted = tournament.participants.sort((a, b) => b.score - a.score).slice(0, 10);
            const list = sorted.map((p, i) => {
                return `${i + 1}. <@${p.userId}> - **${p.score.toFixed(2)}** ${tournament.type === 'heaviest' ? 'kg' : 'điểm'}`;
            }).join('\n') || 'Chưa có ai tham gia!';

            const embed = new EmbedBuilder()
                .setTitle('📊 Bảng Xếp Hạng Giải Đấu')
                .setDescription(list)
                .setColor('Blue');
            return interaction.reply({ embeds: [embed] });
        }
    },
    checkTournamentCatch
};

function getTournamentTitle(type) {
    if (type === 'heaviest') return 'Cá Nặng Nhất';
    if (type === 'most_caught') return 'Cần Thủ Chăm Chỉ (Bắt nhiều nhất)';
    return 'Thợ Săn Hàng Hiếm';
}

function getLeaderText(participants) {
    if (!participants.length) return 'Chưa có';
    const leader = participants.sort((a, b) => b.score - a.score)[0];
    return `<@${leader.userId}> (${leader.score.toFixed(2)})`;
}
