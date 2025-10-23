const { EmbedBuilder } = require('discord.js');

class StatisticsEmbed {
    constructor(config) {
        this.config = config;
    }

    createSingleEmbed(stats, guild) {
        if (!stats) return new EmbedBuilder().setDescription('Unable to collect statistics');

        const embed = new EmbedBuilder()
            .setColor(this.config.embed.color || '#3498db')
            .setTitle('Thông tin Máy Chủ ( Discord Server )')
            .setTimestamp();

        if (this.config.embed.thumbnail.enabled) {
            embed.setThumbnail(this.config.embed.thumbnail.use_server_icon ? 
                guild.iconURL() : this.config.embed.thumbnail.custom_url);
        }

        const e = this.config.emojis;
        const fields = [
            {
                name: `${e.members} Members`,
                value: `${e.humans} Người dùng: ${stats.members}\n${e.bots} Bots: ${stats.bots}\n${e.total_users} Tổng: ${stats.totalUsers}\n${e.online} Online: ${stats.online}\n${e.offline} Offline: ${stats.offline}`,
                inline: true
            },
            {
                name: `${e.channels} Kênh`,
                value: `${e.text} Text: ${stats.channels?.text}\n${e.voice} Voice: ${stats.channels?.voice}\n${e.categories} Danh Mục: ${stats.channels?.categories}\n${e.forum} Diễn Đàn: ${stats.channels?.forum}`,
                inline: true
            },
            {
                name: `${e.serverinfo} Thông tin`,
                value: `${e.roles} Vai Trò: ${stats.roles || 0}\n${e.boosts} Boosts: ${stats.boosts || 0}`,
                inline: true
            },
            {
                name: `${e.content} Content`,
                value: `${e.messages} Messages: ${stats.messages || 0}\n${e.normal_emojis} Emojis: ${stats.emojis?.normal || 0}\n${e.animated_emojis} Animated: ${stats.emojis?.animated || 0}\n${e.stickers} Stickers: ${stats.stickers?.count || 0}`,
                inline: true
            },
            {
                name: `${e.moderation} Moderation`,
                value: `${e.bans} Bans: ${stats.moderation?.bans || 0}\n${e.kicks} Kicks: ${stats.moderation?.kicks || 0}\n${e.timeouts} Timeouts: ${stats.moderation?.timeouts || 0}\n${e.events} Events: ${stats.moderation?.events || 0}`,
                inline: true
            }
        ];

        embed.addFields(fields);
        return embed;
    }

    createCategoryEmbed(category, stats, guild) {
        if (!stats) return new EmbedBuilder().setDescription('Unable to collect statistics');

        const embed = new EmbedBuilder()
            .setColor(this.config.embed.color || '#3498db')
            .setTimestamp();

        if (this.config.embed.thumbnail.enabled) {
            embed.setThumbnail(this.config.embed.thumbnail.use_server_icon ? 
                guild.iconURL() : this.config.embed.thumbnail.custom_url);
        }

        const e = this.config.emojis;
        
        switch(category) {
            case 'members':
                embed.setTitle(`${e.members} Member Statistics`)
                    .addFields([
                        {
                            name: 'Member Distribution',
                            value: `${e.humans} Humans: ${stats.members}\n${e.bots} Bots: ${stats.bots}\n${e.total_users} Total: ${stats.totalUsers}`,
                            inline: true
                        },
                        {
                            name: 'Status',
                            value: `${e.online} Online: ${stats.online}\n${e.offline} Offline: ${stats.offline}`,
                            inline: true
                        }
                    ]);
                break;

            case 'channels':
                embed.setTitle(`${e.channels} Channel Statistics`)
                    .addFields([{
                        name: 'Channel Types',
                        value: `${e.text} Text: ${stats.channels.text}\n${e.voice} Voice: ${stats.channels.voice}\n${e.categories} Categories: ${stats.channels.categories}\n${e.forum} Forum: ${stats.channels.forum}\nTotal: ${stats.channels.total}`,
                        inline: false
                    }]);
                break;

            case 'server':
                embed.setTitle(`${e.serverinfo} Server Information`)
                    .addFields([{
                        name: 'Server Details',
                        value: `${e.roles} Roles: ${stats.roles || 0}\n${e.boosts} Boosts: ${stats.boosts || 0}`,
                        inline: false
                    }]);
                break;

            case 'content':
                embed.setTitle(`${e.content} Content Statistics`)
                    .addFields([{
                        name: 'Statistics',
                        value: `${e.messages} Messages: ${stats.messages || 0}\n${e.normal_emojis} Regular Emojis: ${stats.emojis.normal}\n${e.animated_emojis} Animated: ${stats.emojis.animated}\n${e.stickers} Stickers: ${stats.stickers.count}`,
                        inline: false
                    }]);
                break;

            case 'moderation':
                embed.setTitle(`${e.moderation} Moderation Statistics`)
                    .addFields([{
                        name: 'Actions',
                        value: `${e.bans} Bans: ${stats.moderation.bans}\n${e.kicks} Kicks: ${stats.moderation.kicks}\n${e.timeouts} Timeouts: ${stats.moderation.timeouts}\n${e.events} Events: ${stats.moderation.events}`,
                        inline: false
                    }]);
                break;

            default:
                embed.setDescription('Invalid category specified');
        }

        if (this.config.embed.footer?.enabled) {
            embed.setFooter({
                text: this.config.embed.footer.text || '',
                iconURL: this.config.embed.footer.icon_url || null
            });
        }

        return embed;
    }
}

module.exports = StatisticsEmbed;