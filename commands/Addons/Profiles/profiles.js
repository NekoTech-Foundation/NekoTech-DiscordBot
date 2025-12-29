const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Xem thông tin profile của người dùng')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Chọn người dùng để xem profile')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        // Lấy user từ option hoặc người dùng hiện tại
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id);
        
        // Fetch user để lấy thông tin banner và accent color
        const fetchedUser = await targetUser.fetch();
        
        // Format ngày tạo tài khoản
        const createdDate = targetUser.createdAt;
        const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const months = [
            'Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư', 'Tháng Năm', 'Tháng Sáu',
            'Tháng Bảy', 'Tháng Tám', 'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'
        ];
        
        const dayOfWeek = daysOfWeek[createdDate.getDay()];
        const day = createdDate.getDate();
        const month = months[createdDate.getMonth()];
        const year = createdDate.getFullYear();
        const hours = createdDate.getHours();
        const minutes = createdDate.getMinutes().toString().padStart(2, '0');
        const period = hours >= 12 ? 'CH' : 'SA';
        const displayHours = hours % 12 || 12;
        
        const formattedDate = `${dayOfWeek}, ${day} ${month}, ${year} ${displayHours}:${minutes} ${period}`;
        
        // Ngày tham gia server
        const joinedDate = member.joinedAt;
        const joinDayOfWeek = daysOfWeek[joinedDate.getDay()];
        const joinDay = joinedDate.getDate();
        const joinMonth = months[joinedDate.getMonth()];
        const joinYear = joinedDate.getFullYear();
        const joinHours = joinedDate.getHours();
        const joinMinutes = joinedDate.getMinutes().toString().padStart(2, '0');
        const joinPeriod = joinHours >= 12 ? 'CH' : 'SA';
        const joinDisplayHours = joinHours % 12 || 12;
        
        const formattedJoinDate = `${joinDayOfWeek}, ${joinDay} ${joinMonth}, ${joinYear} ${joinDisplayHours}:${joinMinutes} ${joinPeriod}`;
        
        // Tạo embed
        const profileEmbed = new EmbedBuilder()
            .setColor(fetchedUser.accentColor || '#5865F2')
            .setTitle(`Profile của ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { 
                    name: '👤 Username', 
                    value: `${targetUser.username}`, 
                    inline: true 
                },
                { 
                    name: '🆔 User ID', 
                    value: `${targetUser.id}`, 
                    inline: true 
                },
                { 
                    name: '🏷️ Tag', 
                    value: `${targetUser.tag}`, 
                    inline: true 
                },
                { 
                    name: '📅 Ngày Tạo Tài Khoản', 
                    value: formattedDate, 
                    inline: false 
                },
                { 
                    name: '📥 Ngày Tham Gia Server', 
                    value: formattedJoinDate, 
                    inline: false 
                },
                { 
                    name: '🎭 Vai Trò Cao Nhất', 
                    value: member.roles.highest.name, 
                    inline: true 
                },
                { 
                    name: '🎨 Số Vai Trò', 
                    value: `${member.roles.cache.size - 1}`, 
                    inline: true 
                }
            )
            .setTimestamp();
        
        // Kiểm tra bot
        if (targetUser.bot) {
            profileEmbed.addFields({ 
                name: '🤖 Bot', 
                value: 'Có', 
                inline: true 
            });
        }
        
        // Kiểm tra Nitro (qua banner hoặc avatar decoration)
        if (fetchedUser.banner || fetchedUser.avatarDecoration) {
            profileEmbed.setFooter({ 
                text: '✨ User này đang sử dụng Discord Nitro' 
            });
            
            // Thêm banner nếu có
            if (fetchedUser.banner) {
                const bannerURL = fetchedUser.bannerURL({ size: 1024 });
                profileEmbed.setImage(bannerURL);
            }
        }
        
        // Thêm mô tả/bio nếu có (từ About Me của user)
        if (fetchedUser.bio) {
            profileEmbed.addFields({ 
                name: '📝 Mô Tả', 
                value: fetchedUser.bio, 
                inline: false 
            });
        }
        
        await interaction.reply({ embeds: [profileEmbed] });
    }
};
