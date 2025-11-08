# UMA MUSUME ADDON - INSTALLATION GUIDE

## ✅ Đã tạo các file:

### 📁 Core Files
- ✅ `index.js` - File addon chính với tất cả commands
- ✅ `umaUtilsNew.js` - Các hàm utility (calculateRank, generateStats, simulateRace, etc.)
- ✅ `schemas/useruma.js` - MongoDB schema cho mã nương

### 📁 Config Files (JSON)
- ✅ `gacha.json` - Config gacha rates & 25 mã nương
- ✅ `skills.json` - 14 kỹ năng (Gold/Rare/Common)
- ✅ `races.json` - 15 cuộc đua

### 📁 Models Required
- ✅ `models/cooldown.js` - Model cho cooldown system
- ✅ `models/EconomyUserData.js` - Đã có sẵn

### 📁 Documentation
- ✅ `README.md` - Hướng dẫn đầy đủ
- ✅ `INSTALL.md` - File này

## 🔧 Cách cài đặt:

### Bước 1: Kiểm tra structure
```
addons/
└── UmaMusume/
    ├── index.js
    ├── umaUtilsNew.js
    ├── gacha.json
    ├── skills.json
    ├── races.json
    ├── README.md
    ├── INSTALL.md
    └── schemas/
        └── useruma.js

models/
├── cooldown.js  (MỚI TẠO)
└── EconomyUserData.js  (ĐÃ CÓ)
```

### Bước 2: Restart bot
```bash
# Stop bot hiện tại
# Restart bot để load addon
```

### Bước 3: Test commands
```
/uma gacha          # Test gacha (cần 5000 coins)
/uma list           # Xem danh sách
/uma profile        # Xem profile
```

## 📋 Checklist trước khi chạy:

- [ ] Đã có model `EconomyUserData` với field `balance`
- [ ] Đã tạo model `cooldown.js`
- [ ] Đã tạo schema `useruma.js` trong folder schemas
- [ ] Tất cả file JSON đã tạo đúng cú pháp
- [ ] Bot có quyền gửi embeds và buttons
- [ ] MongoDB connection đang hoạt động

## 🎮 Các lệnh chính:

| Lệnh | Mô tả |
|------|-------|
| `/uma gacha` | Gacha mã nương (5000 coins) |
| `/uma list` | Danh sách mã nương |
| `/uma info <id>` | Chi tiết mã nương |
| `/uma train <id> <stat>` | Huấn luyện |
| `/uma race <id>` | Đua PvE |
| `/uma pvp <id> <@user>` | Đua PvP |
| `/uma learn_skill <id>` | Học kỹ năng |
| `/uma energy` | Nhận energy (4h cooldown) |
| `/uma breed <p1> <p2>` | Lai tạo |
| `/uma retire <id>` | Nghỉ hưu |

## ⚠️ Lưu ý:

1. **Economy System**: Addon dùng `EconomyUserData` model với field `balance`
2. **Cooldown**: Sử dụng model `cooldown` mới tạo
3. **Button Interactions**: Bot cần handle button clicks (đã có trong index.js)
4. **Energy System**: Auto-restore mỗi 4 giờ
5. **Train Limit**: Mỗi mã nương chỉ train tối đa 30 lần

## 🐛 Troubleshooting:

### Lỗi "Cannot find module './umaUtils'"
➡️ File đã được đổi tên thành `umaUtilsNew.js`, đã fix trong index.js

### Lỗi "Cannot find module './config/gacha.json'"
➡️ File config giờ ở root của folder UmaMusume, đã fix

### Lỗi "Cannot find module '../../models/economy'"
➡️ Đã đổi thành `EconomyUserData`, đã fix

### Lỗi "userEconomy.balance is undefined"
➡️ Kiểm tra model EconomyUserData có field `balance` không

### Button không hoạt động
➡️ Kiểm tra bot event handler có listen `interactionCreate` cho buttons không

## 📊 Game Balance:

- Gacha cost: **5000 coins**
- Train cost: **1 energy**
- Energy max: **10**
- Energy restore: **+5 mỗi 4 giờ**
- Train limit: **30 lượt/mã nương**

**Gacha Rates:**
- Common (1★): 80%
- Silver (2★): 17%
- Gold (3★): 2.5%
- Rainbow (3★): 0.5%

## 🎯 Next Steps (Tùy chọn):

1. Thêm hình ảnh cho các mã nương trong gacha.json
2. Tạo thêm skills mới
3. Thêm races mới
4. Implement Carrots currency (500 coins = 1 Carrot)
5. Thêm gacha banner sự kiện
6. Tạo support cards system
7. Leaderboard system

## ✨ Credits:

Addon được tạo dựa trên game **Uma Musume: Pretty Derby** của Cygames.

Chúc bạn vui vẻ! 🐴✨
