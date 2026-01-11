const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Hiển thị danh sách lệnh của bot',
    aliases: ['h', 'commands'],
    execute(client, message, args) {
        const { commands } = client;
        const prefix = global.config.CommandsPrefix || '!';
        const botName = global.config.BotName || client.user.username;

        const embed = new EmbedBuilder()
            .setColor(global.config.EmbedColors.Default)
            .setTitle(`${botName} - Danh sách lệnh`)
            .setDescription(`**Whitelabel từ KentaBuckets**\nDưới đây là các lệnh khả dụng.\nSử dụng \`${prefix}help [tên lệnh]\` để xem chi tiết.`)
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: 'Whitelabel System provided by KentaBuckets', iconURL: client.user.displayAvatarURL() });

        // Group commands by category (folder name)
        // Note: In the main bot, commands are loaded into client.commands map.
        // We need to iterate and group them if the loader structure supports it, 
        // or just list them simply.
        // Assuming standard discord.js handler with 'category' property or derived from folder.

        // Simplified listing for Whitelabel
        const categories = {};

        client.commands.forEach(cmd => {
            if (cmd.category === 'Owner' && message.author.id !== global.config.OwnerIDs[0]) return;

            const cat = cmd.category || 'General';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(`\`${cmd.name}\``);
        });

        for (const [cat, cmds] of Object.entries(categories)) {
            embed.addFields({ name: cat, value: cmds.join(', ') });
        }

        message.reply({ embeds: [embed] });
    }
};
