const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { getConfig, getLang, getCommands } = require('../../utils/configLoader');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('diagnose')
        .setDescription('Run a system health check and configuration validation (Owner Only).'),

    async execute(interaction, lang) {
        const client = interaction.client;
        const config = getConfig();
        
        // Owner Check
        if (!config.OwnerIDs || !config.OwnerIDs.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: '🚫 Command restricted to Bot Owners.', 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🩺 System Diagnostic Report')
            .setColor('#00FF00')
            .setTimestamp();

        let issuesValues = [];
        let systemInfo = [];

        // 1. System Stats
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        const ping = client.ws.ping;
        
        systemInfo.push(`**Node.js**: ${process.version}`);
        systemInfo.push(`**Platform**: ${os.platform()} (${os.release()})`);
        systemInfo.push(`**Uptime**: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`);
        systemInfo.push(`**Memory**: ${memoryUsage.toFixed(2)} MB`);
        systemInfo.push(`**Ping**: ${ping}ms`);
        
        embed.addFields({ name: '🖥️ System Status', value: systemInfo.join('\n'), inline: true });

        // 2. Command Loading Check
        const loadedCommands = client.slashCommands.size;
        // Simple check: 'commands.yml' has keys, verify they are loaded if enabled.
        // Note: commands.yml structure is flat for top-level keys
        const commandConfig = getCommands();
        let cmdIssues = [];
        
        // This is a basic key check, matching command names to config keys where possible
        // Ideally, we'd traverse the directory, but checking registered commands is a good proxy.
        // We can check critical modules
        const criticalModules = ['Economy', 'Fun', 'Moderation', 'Utility', 'LevelingSystem'];
        
        embed.addFields({ name: '📦 Commands', value: `Total Loaded: **${loadedCommands}**`, inline: true });

        // 3. Configuration Validation
        let configErrors = [];

        // Validate Channels
        const validateChannel = (id, name) => {
             if (id === 'CHANNEL_ID' || !id) return; // Ignored placeholder
             if (!interaction.guild.channels.cache.has(id)) {
                 configErrors.push(`❌ **${name}**: Channel ID \`${id}\` not found in this guild.`);
             }
        };

        // Validate Roles
        const validateRole = (id, name) => {
            if (!id || id === 'ROLE_ID') return;
            if (!interaction.guild.roles.cache.has(id)) {
                configErrors.push(`❌ **${name}**: Role ID \`${id}\` not found in this guild.`);
            }
        };
        
        // Critical Paths
        if (config.LevelingSystem?.Enabled) {
             validateChannel(config.LevelingSystem.ChannelSettings?.LevelUpChannelID, 'LevelUp Channel');
        }
        
        if (config.VerificationSettings?.Enabled) {
            validateChannel(config.VerificationSettings.ChannelID, 'Verification Channel');
            config.VerificationSettings.VerifiedRoleID?.forEach(roleId => validateRole(roleId, 'Verified Role'));
        }
        
        if (config.SuggestionSettings?.Enabled) {
             validateChannel(config.SuggestionSettings.ChannelID, 'Suggestion Channel');
             validateChannel(config.SuggestionSettings.ChannelSuggestionID, 'Suggestion Log Channel');
        }

        if (config.Warnings?.Expiry) {
             // Basic regex check for time format "30d"
             if (!/^(\d+)([smhd])$/.test(config.Warnings.Expiry)) {
                 configErrors.push(`⚠️ **Warnings.Expiry**: Invalid format \`${config.Warnings.Expiry}\`. Expected format like '30d', '12h'.`);
             }
        }

        // 4. Database Check (Simulated)
        // Since we are running the command, DB connection is likely fine, but we can try a simple find
        try {
            // Using UserData as a proxy check
            const UserData = require('../../models/UserData');
            await UserData.findOne({ userId: '0' }); 
        } catch (e) {
            configErrors.push(`🔥 **Database Error**: ${e.message}`);
        }

        if (configErrors.length > 0) {
            embed.setColor('#FF0000');
            embed.addFields({ name: '⚠️ Configuration Issues', value: configErrors.slice(0, 10).join('\n') + (configErrors.length > 10 ? '\n...and more.' : '') });
        } else {
            embed.addFields({ name: '✅ Configuration', value: 'All validated IDs exist in this guild.', inline: false });
        }

        await interaction.editReply({ embeds: [embed] });
    }
};
