# NekoTech Discord Bot aka KentaBuckets

Một bot Discord đa năng, hoàn chỉnh và mạnh mẽ được phát triển trên nền tảng **Discord.js v14**. KentaBuckets hiện đang không còn maintain bởi NekoTech Foundation, sẽ có người đứng ra vá các lỗi critical nếu có báo cáo.

Hãy Star Repo này nếu bạn thấy nó hữu ích
---

## 🚀 Tính Năng Nổi Bật

- **Hệ Thống Kinh Tế (Economy):**
  - Trồng trọt, câu cá, điểm danh hằng ngày.
  - Các minigame cá cược: Blackjack, Coinflip, Slot, Roulette.
  - Cửa hàng vật phẩm, ngân hàng, chuyển tiền.
- **Âm Nhạc (Music):**
  - Phát nhạc chất lượng cao.
  - Hỗ trợ hàng chờ, danh sách phát, vòng lặp.
- **Minigames & Giải Trí:**
  - 2048, TicTacToe, Wordle, Cờ caro.
  - Các lệnh tương tác: hug, kiss, slap...
- **Hệ Thống Quản lý & Tiện Ích:**
  - Quản trị viên (Ban, Kick, Warn, Timeout, Purge).
  - Tích hợp logging toàn diện (Tin nhắn, Voice, Server).
  - Leveling (Hệ thống cấp độ), Quản lý Ticket, và Giveaway tự động.
  - Tích hợp AI (Google Gemini) để trò chuyện trực tiếp (Tùy chọn).

---

## 🛠️ Yêu Cầu Hệ Thống

Trước khi tiến hành cài đặt, VPS/Máy tính của bạn CẦN CÓ:

1. **Node.js**: Phiên bản **v18.20.0** trở lên (Khuyến nghị bản LTS mới nhất như v20.x).
2. **Công cụ biên dịch:** (Bắt buộc để cài đặt các thư viện module native như `canvas` và `sqlite3`)
   - **Windows:** Mở PowerShell bằng quyền Admin và chạy: `npm install -g windows-build-tools` *(hoặc cài đặt Visual Studio Desktop C++ workload)*.
   - **Linux (Ubuntu/Debian):** Chạy lệnh `sudo apt build-dep
   - **Python:** Khuyến nghị cài đặt Python 3.x để biên dịch node-gyp.
3. **FFmpeg**: Yêu cầu bắt buộc nếu bạn sử dụng tính năng Âm nhạc (Music Bot).

---

## 📥 Hướng Dẫn Cài Đặt Toàn Tập

### Bước 1: Lấy thông tin Bot từ Discord Developer Portal
1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications).
2. Nhấn **New Application** và đặt tên cho Bot của bạn.
3. Chuyển sang tab **Bot**:
   - Nhấn **Reset Token** để lấy `BotToken` (Lưu lại chuỗi này, không để lộ cho ai).
   - Kéo xuống mục **Privileged Gateway Intents**, bật TẤT CẢ 3 tuỳ chọn: `Presence Intent`, `Server Members Intent`, và `Message Content Intent`.
4. Chuyển sang tab **OAuth2 -> General**:
   - Lấy `Client ID` và `Client Secret`.
   - Để mời bot vào server, chuyển sang tab **OAuth2 -> URL Generator**, chọn scope `bot` và `applications.commands`, cấp quyền `Administrator` rồi copy link dán vào trình duyệt để mời.

### Bước 2: Tải Source Code & Cài Đặt Thư Viện
1. Clone mã nguồn về máy hoặc giải nén file ZIP:
   ```bash
   git clone <link-repo-github>
   cd NekoTech-DiscordBot
   ```
2. Cài đặt toàn bộ thư viện cần thiết:
   ```bash
   npm install
   ```
   *Lưu ý: Nếu trong quá trình cài đặt gặp lỗi chữ đỏ liên quan đến `node-gyp` hoặc `canvas`, hãy chắc chắn bạn đã cài C++ Build Tools ở phần Yêu cầu hệ thống.* Nếu `canvas` bị lỗi `ERR_DLOPEN_FAILED` khi chạy, hãy thử chạy lệnh: `npm rebuild canvas`.

### Bước 3: Thiết Lập Cấu Hình (`config.yml`)
1. Mở file `config.yml` nằm ở thư mục gốc của bot.
2. Sửa các thông số quan trọng dưới đây để bot nhận diện được server của bạn:

```yaml
# Token & ID bảo mật (Thay bằng thông tin bạn lấy ở Bước 1)
BotToken: "Mục-Bot-Token-Trong-Discord-Developer"
BotClientSecret: "Mục-Client-Secret"
BotClientId: "Mục-Client-ID"

# Cài đặt Cơ bản
GuildID: "ID-SERVER-DISCORD-CỦA-BẠN"     # Bật Developer Mode trong Discord để copy ID
OwnerIDs: 
  - "ID-TÀI-KHOẢN-CỦA-BẠN"               # Bổ sung ID của bạn để full quyền lệnh admin

# (Tuỳ chọn) Hệ thống AI (Gemini)
AI:
  Gemini:
    Model: "gemini-2.5-flash"
    Enabled: true # Chuyển thành true nếu muốn dùng
    
API_Keys:
  Gemini:
    ApiKey: "API-KEY-TỪ-GOOGLE-STUDIO"
```

*Bạn có thể lướt xuống dưới file `config.yml` để tuỳ chỉnh giá Item, quyền Mod, hệ thống Anti-nuke/Anti-raid và các kênh Log Server (thay "CHANNEL_ID" bằng ID kênh thực tế).*

### Bước 4: Khởi Chạy Bot

Sử dụng lệnh sau để chạy bot:

```bash
npm start
```

Hoặc chạy trực tiếp qua node:

```bash
node index.js
```

Nếu console in ra dòng chữ `[STARTUP] Attempting to start the bot..` và sau đó báo trạng thái `Ready`, xin chúc mừng, bot của bạn đã online! Vào server Discord và gõ `/help` hoặc lệnh prefix (mặc định là `Khelp`) để bắt đầu.

---

## ⚙️ Cấu Trúc Mã Nguồn

Dành cho các bạn dev muốn phát triển thêm tính năng:
- **`commands/`**: Chứa toàn bộ câu lệnh Slash (/) và Prefix. Được chia theo từng danh mục khoa học (General, Fun, Admin, Addons).
- **`events/`**: Chứa các file xử lý event của Discord.js (`messageCreate`, `interactionCreate`, `voiceStateUpdate`...).
- **`models/`**: Chứa các schema của Mongoose dành cho Database.
- **`utils/`**: Các script tiện ích như config loaders, helpers, Logger...
- **`database.sqlite`**: File cơ sở dữ liệu mặc định hệ thống đang sử dụng (Dạng SQLite). Tuỳ theo quy mô, bạn có thể chuyển qua MongoDB nếu cần.

## 🤝 Hỗ Trợ & Đóng Góp

NekoTech Bot ban đầu là một dự án tư nhân thương mại but nay đã được release open-source hoàn toàn cho cộng đồng phát triển.
Mọi PR (Pull Request) nâng cấp tính năng hoặc fix lỗi đều được hoan nghênh!

Chúc bạn tạo ra một cộng đồng Discord tuyệt vời! 💖
