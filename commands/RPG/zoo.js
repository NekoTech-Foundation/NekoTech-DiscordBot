const { EmbedBuilder } = require('discord.js');
const RPGPlayer = require('../../models/RPGPlayer');

module.exports = {
    name: 'zoo',
    description: 'View your animal collection',

    async execute(message, args) {
        const userId = message.author.id;

        const player = await RPGPlayer.findOne({ userId });
        if (!player || player.zoo.length === 0) {
            return message.reply('你的动物园是空的！试着使用 `!hunt` 来抓一些动物吧。');
        }

        // Pagination logic could go here, for now just show top 10
        const animals = player.zoo.slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}'s Zoo 🦁`)
            .setColor('#00AAFF')
            .setFooter({ text: `Total Animals: ${player.zoo.length}` });

        const description = animals.map((a, index) => {
            return `\`${index + 1}.\` **${a.name}** [${a.rarity}] - Lvl ${a.level}`;
        }).join('\n');

        embed.setDescription(description || 'No animals found.');

        message.channel.send({ embeds: [embed] });
    }
};
