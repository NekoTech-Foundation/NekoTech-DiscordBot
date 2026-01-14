# NekoBuckets - Bot Discord Đa Năng

NekoBuckets là một bot Discord mạnh mẽ và đầy đủ tính năng, được xây dựng trên nền tảng Discord.js v14. Bot tích hợp nhiều hệ thống giải trí và quản lý server, giúp cộng đồng Discord của bạn trở nên sôi động hơn.

## 🚀 Tính Năng Nổi Bật

Dựa trên cấu hình hiện tại, bot hỗ trợ các nhóm tính năng sau:

- **Hệ thống Kinh tế (Economy):**
  - Các lệnh kiếm tiền: `work`, `beg`, `crime`, `daily`, `fishing`, `farming` (trồng trọt).
  - Trò chơi may rủi: `blackjack`, `roulette`, `slot`, `coinflip`.
  - Cửa hàng và vật phẩm: `store`, `inventory`, `buy`, `sell`.
  - Ngân hàng: `deposit`, `withdraw`, `transfer`.

- **Âm nhạc (Music):**
  - Phát nhạc chất lượng cao từ YouTube, Spotify, SoundCloud.
  - Hỗ trợ bộ lọc âm thanh, tạo playlist.

- **Minigames & Giải trí:**
  - Game logic: `2048`, `tictactoe`, `wordle`, `connectfour`.
  - Lệnh vui: `meme`, `darkjoke`, `8ball`, `fliptext`.
  - Tương tác: `hug`, `kiss`, `slap`, `marry` (kết hôn).

- **Quản lý (Moderation):**
  - Công cụ quản trị: `kick`, `ban`, `timeout`, `warn`, `purge` (xóa tin nhắn).
  - Hệ thống log chi tiết (Message, Voice, Member logs).

- **Tiện ích & Hệ thống:**
  - **Leveling:** Hệ thống cấp độ và bảng xếp hạng (Rank card).
  - **AI:** Tích hợp Google Gemini (Chatbot thông minh).
  - **Anime/Manga:** Tìm kiếm thông tin, xem ảnh Pixiv.
  - **Ticket & Report:** Hệ thống hỗ trợ thành viên.
  - **Giveaway:** Tổ chức tặng quà tự động.

## 🛠️ Yêu Cầu Hệ Thống

Trước khi cài đặt, hãy đảm bảo máy chủ của bạn đã cài đặt:

- **Node.js:** Phiên bản **18.20.0** trở lên (Khuyến nghị dùng bản LTS mới nhất).
- **FFmpeg:** Cần thiết để xử lý âm thanh cho tính năng Music.
- **Python:** (Tùy chọn) Để build một số module native nếu cần.

## 📥 Hướng Dẫn Cài Đặt

1. **Clone repository:**
   ```bash
   git clone <link-repo-cua-ban>
   cd nekobuckets
   ```

2. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

3. **Cấu hình Bot:**
   - Tìm file `config.yml` trong thư mục gốc.
   - Chỉnh sửa các thông tin quan trọng sau:

   ```yaml
   BotToken: "YOUR_DISCORD_BOT_TOKEN"      # Token lấy từ Discord Developer Portal
   GuildID: "YOUR_SERVER_ID"                # ID Server chính (cho development)
   OwnerIDs:                                # Danh sách ID của Admin bot
     - "YOUR_USER_ID"
   CommandsPrefix: "K"                      # Prefix lệnh (Ví dụ: Khelp)
   ```

   - (Tùy chọn) Điền API Key cho Spotify, Gemini, Pixiv nếu muốn sử dụng các tính năng liên quan.

4. **Khởi chạy Bot:**
   ```bash
   npm start
   ```
   Hoặc:
   ```bash
   node index.js
   ```

## ⚙️ Cấu Trúc Thư Mục

- `commands/`: Chứa mã nguồn các lệnh.
- `events/`: Xử lý các sự kiện Discord (ready, messageCreate...).
- `config.yml`: File cấu hình chính.
- `commands.yml`: Bật/Tắt từng nhóm lệnh hoặc lệnh cụ thể.
- `database.sqlite`: Cơ sở dữ liệu lưu trữ (Economy, Level, v.v.).

## 🤝 Tác Giả & Đóng Góp

Dự án được phát triển bởi **Heiznerd#1337 & NekoTech**.

Nếu bạn gặp lỗi hoặc có ý tưởng mới, hãy tạo Issue hoặc gửi Pull Request trên GitHub.
