const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Đặt trạng thái của bạn (AFK)')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Lí do')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Thời gian AFK (e.g., 1h 30m)')
                .setRequired(false)),

    async execute(interaction, client) {
        const configPath = path.join(__dirname, 'config.yml');
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        
        if (config.settings.allowed_roles.length > 0) {
            const hasRole = interaction.member.roles.cache.some(role => 
                config.settings.allowed_roles.includes(role.id));
            if (!hasRole) {
                return interaction.reply({ 
                    content: config.lang.errors.no_permission, 
                    ephemeral: true 
                });
            }
        }

        if (client.afkUsers.has(interaction.user.id)) {
            return interaction.reply({
                content: config.lang.errors.already_afk,
                ephemeral: true
            });
        }

        const reason = interaction.options.getString('reason') || 'Không có lí do';
        const duration = interaction.options.getString('duration');
        
        let returnTime = null;
        if (duration) {
            const time = parseDuration(duration);
            if (!time) {
                return interaction.reply({ 
                    content: config.lang.errors.invalid_duration, 
                    ephemeral: true 
                });
            }
            returnTime = Date.now() + time;
        }

        const timestamp = Date.now();
        client.afkUsers.set(interaction.user.id, {
            reason,
            timestamp,
            returnTime
        });

        if (config.messages.afk_enabled.type === 'embed') {
            const embedConfig = config.messages.afk_enabled.embed;
            const embed = new EmbedBuilder()
                .setColor(embedConfig.color || config.settings.default_color)
                .setTitle(embedConfig.title.replace('{username}', interaction.user.username))
                .setDescription(embedConfig.description
                    .replace('{username}', interaction.user.username)
                    .replace('{reason}', reason)
                    .replace('{return_time}', returnTime ? `<t:${Math.floor(returnTime/1000)}:R>` : 'Indefinite')
                    .replace('{timestamp}', `<t:${Math.floor(timestamp/1000)}:R>`));

            if (embedConfig.thumbnail) {
                embed.setThumbnail(
                    embedConfig.thumbnail === '{user_avatar}' 
                        ? interaction.user.displayAvatarURL()
                        : config.settings.default_thumbnail || interaction.user.displayAvatarURL()
                );
            }

            if (embedConfig.footer) {
                embed.setFooter({
                    text: embedConfig.footer.text,
                    iconURL: embedConfig.footer.icon.replace('{user_avatar}', interaction.user.displayAvatarURL())
                });
            }

            await interaction.reply({ embeds: [embed] });
        } else {
            const text = config.messages.afk_enabled.text
                .replace('{username}', interaction.user.username)
                .replace('{reason}', reason)
                .replace('{return_time}', returnTime ? `<t:${Math.floor(returnTime/1000)}:R>` : 'Indefinite')
                .replace('{timestamp}', `<t:${Math.floor(timestamp/1000)}:R>`);
            
            await interaction.reply({ content: text });
        }
    }
};

function parseDuration(duration) {
    const regex = /(\d+)([hm])/g;
    let total = 0;
    let match;

    while ((match = regex.exec(duration)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2];
        
        if (unit === 'h') total += value * 3600000;
        if (unit === 'm') total += value * 60000;
    }

    return total || null;
} 