const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig } = require('../../../utils/configLoader');
const { Logger } = require('../../../utils/logger');
const { exec } = require('child_process');
const util = require('util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Các công cụ gỡ lỗi (Owner Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => 
            sub.setName('logs')
               .setDescription('Xem console logs gần đây'))
        .addSubcommand(sub => 
            sub.setName('clear')
               .setDescription('Xóa logs buffer'))
        .addSubcommand(sub => 
            sub.setName('eval')
               .setDescription('Chạy mã JavaScript')
               .addStringOption(option => 
                   option.setName('code').setDescription('Mã cần chạy').setRequired(true)))
        .addSubcommand(sub => 
            sub.setName('cmd')
               .setDescription('Chạy lệnh Terminal')
               .addStringOption(option => 
                   option.setName('command').setDescription('Lệnh cần chạy').setRequired(true))),
    
    category: 'Utility',

    async execute(interaction) {
        const config = getConfig();
        if (!config.OwnerIDs.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: '🚫 Bạn không có quyền sử dụng lệnh này.', 
                ephemeral: true 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'logs') {
            const logs = Logger.getLogs();
            if (logs.length === 0) {
                return interaction.reply({ content: 'Không có logs nào.', ephemeral: true });
            }

            // Format logs to ANSI
            // Red for ERROR, Yellow for WARN, Green for INFO
            let logOutput = '';
            logs.slice(-20).forEach(log => { // Show last 20 logs to fit in message
                let ansiColor = '\u001b[0;32m'; // Green (Info)
                if (log.level === 'WARN') ansiColor = '\u001b[0;33m'; // Yellow
                if (log.level === 'ERROR') ansiColor = '\u001b[0;31m'; // Red

                logOutput += `${ansiColor}[${log.timestamp}] [${log.level}] ${log.message}\u001b[0m\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('📜 Console Logs')
                .setDescription(`\`\`\`ansi\n${logOutput.substring(0, 4000)}\n\`\`\``) // Discord limit check
                .setFooter({ text: 'Hiển thị 20 logs gần nhất' })
                .setColor('#2C2F33');

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === 'clear') {
            Logger.logs = [];
            return interaction.reply({ content: '✅ Đã xóa log buffer.', ephemeral: true });
        }

        if (subcommand === 'eval') {
            const code = interaction.options.getString('code');
            try {
                // eslint-disable-next-line no-eval
                let evaled = eval(code);
                if (typeof evaled !== 'string') evaled = util.inspect(evaled);

                const embed = new EmbedBuilder()
                    .setTitle('💻 Eval')
                    .addFields(
                        { name: 'Input', value: `\`\`\`js\n${code}\n\`\`\`` },
                        { name: 'Output', value: `\`\`\`js\n${evaled.substring(0, 1000)}\n\`\`\`` }
                    )
                    .setColor('#00FF00');
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (err) {
                return interaction.reply({ 
                    content: `❌ Lỗi: \`\`\`js\n${err}\n\`\`\``, 
                    ephemeral: true 
                });
            }
        }

        if (subcommand === 'cmd') {
             const command = interaction.options.getString('command');
             await interaction.deferReply({ ephemeral: true });
             
             exec(command, (error, stdout, stderr) => {
                 const output = stdout || stderr || 'Command executed with no output.';
                 const embed = new EmbedBuilder()
                    .setTitle('🖥️ Terminal')
                    .addFields(
                        { name: 'Command', value: `\`${command}\`` },
                        { name: 'Output', value: `\`\`\`bash\n${output.substring(0, 4000)}\n\`\`\`` }
                    )
                    .setColor(error ? '#FF0000' : '#00FF00');
                
                 interaction.editReply({ embeds: [embed] });
             });
        }
    }
};
