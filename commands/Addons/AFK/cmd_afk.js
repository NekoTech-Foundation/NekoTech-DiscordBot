const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLang } = require('../../../utils/langLoader');
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

    async execute(interaction, lang) {
        const client = interaction.client;
        // lang passed from handler
        const afkLang = lang.Addons.AFK;
        // Check permissions
        if (config.settings.allowed_roles.length > 0) {
            const hasRole = interaction.member.roles.cache.some(role =>
                config.settings.allowed_roles.includes(role.id));
            if (!hasRole) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF4444')
                    .setDescription(`❌ ${afkLang.Errors.NoPermission}`)
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
                .setDescription(`⚠️ ${afkLang.Errors.AlreadyAFK}`)
                .setTimestamp();

            return interaction.reply({
                embeds: [errorEmbed],
                ephemeral: true
            });
        }

        const reason = interaction.options.getString('reason') || afkLang.UI.ReasonField;
        const duration = interaction.options.getString('duration');

        let returnTime = null;
        if (duration) {
            const time = parseDuration(duration);
            if (!time) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF4444')
                    .setDescription(`${afkLang.Errors.InvalidDuration}`)
                    .addFields({
                        name: 'Example',
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
                name: afkLang.UI.SetAFKSuccessTitle,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setDescription(afkLang.UI.SetAFKSuccessDesc)
            .addFields(
                {
                    name: afkLang.UI.Reason,
                    value: `\`\`\`${reason}\`\`\``,
                    inline: false
                },
                {
                    name: afkLang.UI.StartTime,
                    value: `<t:${Math.floor(timestamp / 1000)}:F>`,
                    inline: true
                },
                {
                    name: afkLang.UI.ReturnTime,
                    value: returnTime ? `<t:${Math.floor(returnTime / 1000)}:R>` : '`N/A`',
                    inline: true
                }
            )
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({
                text: afkLang.UI.Footer,
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
