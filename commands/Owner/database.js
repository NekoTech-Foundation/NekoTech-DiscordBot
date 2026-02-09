const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { getConfig } = require('../../utils/configLoader'); // Assuming this exists based on other files
const config = getConfig(); // Or just require direct if configLoader not standard, but it was used in leaderboard.js

const BACKUP_DIR = path.join(__dirname, '../../backups');
const DB_PATH = path.join(__dirname, '../../database.sqlite');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('database')
        .setDescription('Quản lý Database (Owner/Admin Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('backup')
                .setDescription('Tạo bản sao lưu database (Snapshot)')
        )
        .addSubcommand(sub =>
            sub.setName('restore')
                .setDescription('Khôi phục database từ bản sao lưu')
                .addStringOption(op =>
                    op.setName('filename')
                        .setDescription('Tên file backup (nếu không chọn sẽ hiện list)')
                        .setRequired(false)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('stats')
                .setDescription('Xem thông tin database')
        )
        .addSubcommand(sub =>
            sub.setName('refresh')
                .setDescription('Làm mới/Tối ưu hóa database (VACUUM)')
        ),

    // Autocomplete for restore filename
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        if (!fs.existsSync(BACKUP_DIR)) return interaction.respond([]);

        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sqlite'));
        const filtered = files.filter(choice => choice.startsWith(focusedValue)).slice(0, 25);

        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice }))
        );
    },

    async execute(interaction) {
        // Check Owner IDs from config
        const ownerIDs = config.OwnerIDs || [];
        if (!ownerIDs.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ Bạn không có quyền sử dụng lệnh này (Owner Only).', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'backup') {
            await interaction.deferReply();
            try {
                const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
                const backupName = `backup_${timestamp}.sqlite`;
                const backupPath = path.join(BACKUP_DIR, backupName);

                // Copy file
                fs.copyFileSync(DB_PATH, backupPath);

                const stats = fs.statSync(backupPath);
                const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

                const embed = new EmbedBuilder()
                    .setTitle('✅ Database Backup Successful')
                    .setColor('Green')
                    .addFields(
                        { name: 'Filename', value: `\`${backupName}\``, inline: true },
                        { name: 'Size', value: `${sizeMB} MB`, inline: true },
                        { name: 'Path', value: `\`${backupPath}\``, inline: false }
                    )
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error(error);
                return interaction.editReply({ content: `❌ Lỗi khi backup: ${error.message}` });
            }
        }

        else if (sub === 'restore') {
            await interaction.deferReply();
            const filename = interaction.options.getString('filename');

            if (filename) {
                // Restore specific file immediately
                const backupPath = path.join(BACKUP_DIR, filename);
                if (!fs.existsSync(backupPath)) {
                    return interaction.editReply({ content: `❌ Không tìm thấy file backup: \`${filename}\`` });
                }

                // Confirm button
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_restore')
                        .setLabel('Xác nhận Restore')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel_restore')
                        .setLabel('Hủy')
                        .setStyle(ButtonStyle.Secondary)
                );

                const msg = await interaction.editReply({
                    content: `⚠️ **CẢNH BÁO**: Bạn sắp khôi phục database từ \`${filename}\`.\nDatabase hiện tại sẽ bị ghi đè. Bot có thể cần restart để áp dụng thay đổi.\nBạn có chắc chắn không?`,
                    components: [row]
                });

                const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) return i.reply({ content: 'Không phải lệnh của bạn.', ephemeral: true });

                    if (i.customId === 'confirm_restore') {
                        try {
                            // Create a temporary backup of CURRENT state before overwriting, just in case
                            const tempBackup = path.join(BACKUP_DIR, `pre_restore_${moment().format('YYYY-MM-DD_HH-mm-ss')}.sqlite`);
                            fs.copyFileSync(DB_PATH, tempBackup);

                            // Restore
                            fs.copyFileSync(backupPath, DB_PATH);

                            await i.update({ content: `✅ Đã khôi phục database từ \`${filename}\`.\nMột bản backup an toàn trước khi restore đã được tạo tại \`${path.basename(tempBackup)}\`.\n🔄 Vui lòng Restart Bot để đảm bảo dữ liệu được nạp lại.`, components: [] });
                        } catch (err) {
                            await i.update({ content: `❌ Lỗi khi restore: ${err.message}`, components: [] });
                        }
                    } else {
                        await i.update({ content: '❌ Đã hủy restore.', components: [] });
                    }
                });
            } else {
                // List files
                const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sqlite')).sort().reverse().slice(0, 10);
                if (files.length === 0) return interaction.editReply('Chưa có bản backup nào.');

                const desc = files.map((f, i) => `**${i + 1}.** \`${f}\` (${(fs.statSync(path.join(BACKUP_DIR, f)).size / 1024 / 1024).toFixed(2)} MB)`).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('📂 Các bản Backup gần nhất')
                    .setDescription(desc)
                    .setFooter({ text: 'Sử dụng /database restore filename:<name> để restore' });

                return interaction.editReply({ embeds: [embed] });
            }
        }

        else if (sub === 'stats') {
            try {
                if (fs.existsSync(DB_PATH)) {
                    const stats = fs.statSync(DB_PATH);
                    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

                    // Count backups
                    const backups = fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sqlite')).length : 0;

                    const embed = new EmbedBuilder()
                        .setTitle('📊 Database Statistics')
                        .addFields(
                            { name: 'Database Size', value: `${sizeMB} MB`, inline: true },
                            { name: 'Last Modified', value: `<t:${Math.floor(stats.mtimeMs / 1000)}:R>`, inline: true },
                            { name: 'Total Backups', value: `${backups}`, inline: true }
                        )
                        .setColor('Blue');
                    return interaction.reply({ embeds: [embed] });
                } else {
                    return interaction.reply('❌ Không tìm thấy file database.sqlite');
                }
            } catch (err) {
                return interaction.reply(`❌ Lỗi: ${err.message}`);
            }
        }

        else if (sub === 'refresh') {
            await interaction.deferReply();
            try {
                // Requires the DefaultDB instance to run VACUUM
                const db = require('../../utils/database'); // Singleton instance

                const beforeSize = fs.statSync(DB_PATH).size;
                db.prepare('VACUUM').run();
                const afterSize = fs.statSync(DB_PATH).size;

                const saved = ((beforeSize - afterSize) / 1024 / 1024).toFixed(2);

                return interaction.editReply(`✅ Đã tối ưu hóa database (VACUUM).\nĐã giải phóng: **${saved} MB**.`);
            } catch (err) {
                console.error(err);
                return interaction.editReply(`❌ Lỗi khi tối ưu hóa: ${err.message}`);
            }
        }
    }
};
