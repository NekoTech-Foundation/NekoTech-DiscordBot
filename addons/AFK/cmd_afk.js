const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Load config
const configPath = path.join(__dirname, 'config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('💤 Đặt trạng thái AFK (Away From Keyboard)')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('📝 Lý do rời máy')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('⏱️ Thời gian dự kiến trở lại (vd: 1h, 30m)')
                .setRequired(false)),

    async execute(interaction, client) {
        // Check permissions
        if (config.settings.allowed_roles.length > 0) {
            const hasRole = interaction.member.roles.cache.some(role =>
                config.settings.allowed_roles.includes(role.id));
            if (!hasRole) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF4444')
                    .setDescription(`❌ ${config.lang.errors.no_permission}`)
                    .setTimestamp();

                return interaction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true
                });
            }
        }

        // Check if already AFK
        if (client.afkUsers.has(interaction.user.id)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription(`⚠️ ${config.lang.errors.already_afk}`)
                .setTimestamp();

            return interaction.reply({
                embeds: [errorEmbed],
                ephemeral: true
            });
        }

        const reason = interaction.options.getString('reason') || 'Không có lí do';
        const duration = interaction.options.getString('duration');

        let returnTime = null;
        if (duration) {
            const time = parseDuration(duration);
            if (!time) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF4444')
                    .setDescription(`❌ ${config.lang.errors.invalid_duration}`)
                    .addFields({
                        name: '📝 Ví dụ hợp lệ',
                        value: '`1h`, `30m`, `1h 30m`, `2h 15m`'
                    })
                    .setTimestamp();

                return interaction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true
                });
            }
            returnTime = Date.now() + time;
        }

        const timestamp = Date.now();
        client.afkUsers.set(interaction.user.id, {
            reason,
            timestamp,
            returnTime,
            channelId: interaction.channelId,
            guildId: interaction.guildId
        });

        // Create beautiful embed response
        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setAuthor({
                name: `${interaction.user.username} đang rời máy`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setDescription(`**💤 Trạng thái AFK đã được kích hoạt**`)
            .addFields(
                {
                    name: '📝 Lí do',
                    value: `\`\`\`${reason}\`\`\``,
                    inline: false
                },
                {
                    name: '⏰ Thời gian bắt đầu',
                    value: `<t:${Math.floor(timestamp / 1000)}:F>`,
                    inline: true
                },
                {
                    name: '🔙 Quay lại sau',
                    value: returnTime ? `<t:${Math.floor(returnTime / 1000)}:R>` : '`Không xác định`',
                    inline: true
                }
            )
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({
                text: 'Bot sẽ thông báo khi bạn trở lại',
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

function parseDuration(duration) {
    const regex = /(\d+)\s*([hm])/gi;
    let total = 0;
    let match;

    while ((match = regex.exec(duration)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();

        if (unit === 'h') total += value * 3600000;
        if (unit === 'm') total += value * 60000;
    }

    return total || null;
}