# Uma Musume: Pretty Derby Discord Bot Addon

Addon game hoàn chỉnh dựa trên tựa game Uma Musume: Pretty Derby với các tính năng gacha, huấn luyện và đua mã nương.

## Tính năng chính

### 🎰 Gacha System
- `/uma gacha` - Gacha một mã nương (5000 coins)
- 5 tiers rarity: Common (1★), Silver (2★), Gold/Rainbow (3★)
- Mỗi tier có bộ chỉ số base khác nhau:
  - 1★: Tổng 100 chỉ số
  - 2★: Tổng 150 chỉ số  
  - 3★: Tổng 210 chỉ số

### 📊 Stat System
Mỗi mã nương có 5 chỉ số:
- **⚡ Speed (Tốc độ)**: Tốc độ tối đa (★★★★★)
- **💪 Stamina (Sức bền)**: Duy trì tốc độ (★★★★)
- **🔥 Power (Sức mạnh)**: Gia tốc (★★★)
- **❤️ Guts (Tinh thần)**: Tốc độ cuối đua (★)
- **🧠 Wit (Khôn ngoan)**: Kích hoạt skill (★★)

### 🏆 Ranking System
- G, F, E, D: Yếu
- C, C+, B, B+: Trung bình
- A, A+: Tốt (800-1000+)
- S, S+: Xuất sắc (1000-1200)
- SS, SS+: Cực mạnh (1200+)
- U1-U9, UG1-UG9, UF1-UF9: Siêu cấp (1500+)

### 📦 Quản lý
- `/uma list [trang]` - Xem danh sách mã nương
- `/uma info <id>` - Xem chi tiết mã nương
- `/uma profile [@user]` - Xem profile người chơi
- `/uma set_favorite <id>` - Đặt mã nương đại diện

### 🏋️ Huấn luyện
- `/uma train <id> <stat>` - Huấn luyện mã nương
  - Tốn 1 năng lượng mỗi lần
  - Có cơ hội "Great Success!" (x2 điểm)
  - Nhận Skill Points để học kỹ năng
  - Giới hạn 30 lượt train/mã nương
- `/uma learn_skill <id>` - Học kỹ năng mới
- `/uma energy` - Nhận 5 năng lượng (cooldown 4h)

### 🏁 Đua xe
- `/uma race <id>` - Đua PvE với NPC
  - Phần thưởng: Coins + Skill Points
  - Tính toán dựa trên stats và track preferences
- `/uma pvp <id> <@user>` - Thách đấu người chơi
- `/uma set_defense <uma1> <uma2> <uma3>` - Đặt đội phòng thủ
- `/uma challenge <@user>` - Thách đấu Champions Meeting

### 🧬 Kế thừa
- `/uma retire <id>` - Cho mã nương nghỉ hưu
  - Cần đạt 30/30 lượt train
  - Tạo Factors để kế thừa
- `/uma breed <cha> <mẹ>` - Lai tạo thế hệ mới
  - Sử dụng 2 mã nương đã nghỉ hưu
  - Thế hệ mới thừa hưởng Factors
  - Mạnh hơn thế hệ trước

## Track Preferences

Mỗi mã nương có độ phù hợp với các loại đường đua:
- **Surface**: Cỏ (Grass) / Đất (Dirt)
- **Distance**: Sprint / Mile / Medium / Long
- **Style**: Front Runner / Stalker / Closer / Chaser

Độ phù hợp: G < F < E < D < C < B < A < S

## Skill System

3 loại kỹ năng:
- **Common**: Tăng stat cơ bản (15 SP)
- **Rare**: Buff theo điều kiện (25-35 SP)
- **Gold**: Buff mạnh mẽ (45-55 SP)

## Currency

- **Coins**: Dùng để gacha (5000 coins/lần)
- **Carrots**: 500 coins = 1 Carrot (future feature)

## Cài đặt

1. Copy folder `UmaMusume` vào `addons/`
2. Đảm bảo có models: `EconomyUserData`, `cooldown`
3. Restart bot
4. Sử dụng `/uma gacha` để bắt đầu!

## File Structure

```
UmaMusume/
├── index.js              # Main addon file
├── schemas/
│   ├── useruma.js       # Database schema
│   └── UmaMusume.js     # (old, can be removed)
├── gacha.json           # Gacha rates & uma list
├── skills.json          # Skill database
├── races.json           # Race database
├── umaUtilsNew.js       # Utility functions
└── README.md            # This file
```

## Commands Summary

| Command | Description | Cost |
|---------|-------------|------|
| `/uma gacha` | Gacha mã nương | 5000 coins |
| `/uma list` | Danh sách mã nương | Free |
| `/uma info <id>` | Chi tiết mã nương | Free |
| `/uma profile` | Xem profile | Free |
| `/uma set_favorite <id>` | Đặt favorite | Free |
| `/uma train <id> <stat>` | Huấn luyện | 1 energy |
| `/uma learn_skill <id>` | Học skill | X SP |
| `/uma energy` | Nhận energy | 4h cooldown |
| `/uma race <id>` | Đua PvE | Free |
| `/uma pvp <id> <@user>` | Đua PvP | Free |
| `/uma set_defense` | Đặt đội phòng thủ | Free |
| `/uma challenge <@user>` | Champions Meeting | Free |
| `/uma retire <id>` | Nghỉ hưu | 30/30 trains |
| `/uma breed <p1> <p2>` | Lai tạo | 2 retired |
| `/uma_careers <name>` | Chế độ Careers | Free |

## 🏆 Careers Mode (NEW!)

Chế độ huấn luyện chuyên sâu trong 12 tuần (72 ngày) với hệ thống:

### ✨ Key Features:
- **12 tuần training** (6 ngày tập/tuần, 1 ngày nghỉ)
- **Mood system** ảnh hưởng success rate:
  - Worst (😰): 60-90% success
  - Bad (😟): 40-70% success
  - Normal (😐): 95-99% success
  - Good (😊): 100% success
  - Great (🤩): 100% success
- **Energy management** (100 max, -20/training, +20/rest)
- **5 loại training**: Speed, Stamina, Power, Guts, Wisdom
- **Support Skills system**: Normal (100 SP), Rare (500 SP), Evolved (1000 SP)

### 📚 Documentation:
- **CAREERS_QUICKSTART.md** - Quick start guide cho người mới
- **CAREERS_GUIDE.md** - Hướng dẫn chi tiết và strategies
- **CAREERS_IMPLEMENTATION.md** - Technical documentation

### 🎯 Rewards:
- Tất cả stats tăng → Cộng vào Uma permanent
- Bonus Skill Points = Total stats / 10
- Có thể tăng 800-1200+ stats trong 1 career!

### Usage:
```
/uma_careers name:Special Week
```

Chi tiết xem file **CAREERS_QUICKSTART.md**!

## Notes

- Energy tự động restore mỗi 4 giờ (+5 energy)
- Mỗi mã nương tối đa 10 energy
- Train limit: 30 lượt
- Track preferences được tính dựa trên stats
- Bonuses random theo tier (3★ = 2 bonuses)

Enjoy your Uma Musume journey! 🐴✨
