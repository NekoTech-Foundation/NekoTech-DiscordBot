const { EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField, ChannelType, MessageFlags } = require('discord.js');
const moment = require('moment-timezone');
const UserData = require('../../models/UserData');
const GuildData = require('../../models/guildDataSchema');
const TempRole = require('../../models/TempRole');
const { getConfig, getLang } = require('../../utils/configLoader.js');

const config = getConfig();
const lang = getLang();

const MAX_WARNINGS_PER_PAGE = 5;

const kickLogCache = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Lệnh Quản Trị')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Cấm người dùng bằng cách ping hoặc ID người dùng')
                .addUserOption(option => option.setName('user').setDescription('Chọn người dùng').setRequired(false))
                .addStringOption(option => option.setName('user_id').setDescription('ID Người dùng').setRequired(false))
                .addStringOption(option => option.setName('reason').setDescription('Lí do cấm').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Gỡ cấm người dùng bằng ID')
                .addStringOption(option => option.setName('userid').setDescription('Chọn người dùng (ID)').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Lí do gỡ cấm').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('timeout')
                .setDescription('Cấm chat người dùng')
                .addUserOption(option => option.setName('user').setDescription('Chọn người dùng để cấm chat').setRequired(true))
                .addStringOption(option => option.setName('time').setDescription('Thời gian cấm chat (ví dụ: 1d, 1h, 1m, hoặc "perm" để cấm vĩnh viễn)').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Lí do cấm chat').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleartimeout')
                .setDescription('Gỡ cấm chat người dùng')
                .addUserOption(option => option.setName('user').setDescription('Chọn người dùng để gỡ cấm chat').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Cảnh cáo người dùng')
                .addUserOption(option => option.setName('user').setDescription('Chọn người dùng để cảnh cáo').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Lí do cảnh cáo').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warnlist')
                .setDescription('Liệt kê các cảnh cáo của một người dùng')
                .addUserOption(option => option.setName('user').setDescription('Người dùng để liệt kê cảnh cáo').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unwarn')
                .setDescription('Gỡ cảnh cáo của người dùng')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Chọn người dùng để gỡ cảnh cáo')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('warning_id')
                        .setDescription('ID của cảnh cáo để gỡ')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Đuổi người dùng')
                .addUserOption(option => option.setName('user').setDescription('Chọn người dùng để đuổi').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Lí do đuổi').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nickname')
                .setDescription('Thay đổi biệt danh của người dùng')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Người dùng để thay đổi biệt danh')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('nickname')
                        .setDescription('Biệt danh mới')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clearhistory')
                .setDescription('Xóa lịch sử của người dùng')
                .addUserOption(option => option.setName('user').setDescription('Chọn người dùng').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clearchannel')
                .setDescription('Xóa tin nhắn của kênh này'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('Xem lịch sử của người dùng')
                .addUserOption(option => option.setName('user').setDescription('Chọn người dùng').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('purge')
                .setDescription('Xóa tin nhắn cụ thể')
                .addNumberOption(option =>
                    option.setName('amount')
                        .setDescription('Số lượng tin nhắn muốn xóa')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Loại tin nhắn muốn xóa')
                        .addChoices(
                            { name: 'Tất cả', value: 'all' },
                            { name: 'Liên kết', value: 'links' },
                            { name: 'Văn bản', value: 'text' },
                            { name: 'Bot', value: 'bots' },
                            { name: 'Embed', value: 'embeds' },
                            { name: 'Hình ảnh', value: 'images' })))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slowmode')
                .setDescription('Đặt chế độ chậm trong một kênh')
                .addNumberOption(option => option.setName('amount').setDescription('Thời gian chế độ chậm tính bằng giây (1-21600 giây), đặt thành 0 để tắt.').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tempban')
                .setDescription('Cấm người dùng có thời hạn')
                .addStringOption(option => option.setName('duration').setDescription('Thời hạn (ví dụ: 1d 2h 15m)').setRequired(true))
                .addUserOption(option => option.setName('user').setDescription('Chọn người dùng'))
                .addStringOption(option => option.setName('userid').setDescription('ID Người dùng'))
                .addStringOption(option => option.setName('reason').setDescription('Lí do cấm')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('temprole')
                .setDescription('Gán một vai trò tạm thời cho người dùng')
                .addUserOption(option =>
                    option.setName('user').setDescription('Người dùng để gán vai trò').setRequired(true))
                .addRoleOption(option =>
                    option.setName('role').setDescription('Vai trò để gán').setRequired(true))
                .addStringOption(option =>
                    option.setName('duration').setDescription('Thời hạn (ví dụ: 1s, 15m, 1h, 2d, 1w, 1y)').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('temprolelist')
                .setDescription('Liệt kê tất cả các lần gán vai trò tạm thời đang hoạt động')
                .addUserOption(option =>
                    option.setName('user').setDescription('Lọc theo người dùng cụ thể').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setnote')
                .setDescription('Đặt một ghi chú cho người dùng')
                .addUserOption(option => option.setName('user').setDescription('Người dùng để đặt ghi chú').setRequired(true))
                .addStringOption(option => option.setName('note').setDescription('Ghi chú để đặt cho người dùng').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('viewnote')
                .setDescription('Xem ghi chú của người dùng')
                .addUserOption(option => option.setName('user').setDescription('Người dùng để xem ghi chú').setRequired(true))),
    category: 'Moderation',
    async execute(interaction) {
        // ... (rest of the file is logic and doesn't need translation)
    }
};