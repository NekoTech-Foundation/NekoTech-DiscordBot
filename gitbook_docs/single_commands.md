## /afk

**Mô tả:** 💤 Đặt trạng thái AFK (Away From Keyboard)

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `reason` | 📝 Lý do rời máy | Không |
| `duration` | ⏱️ Thời gian dự kiến trở lại (vd: 1h, 30m) | Không |

### Ví dụ

> 💤 Đặt trạng thái AFK (Away From Keyboard)

```bash
/afk reason:Đi ngủ duration:1h
```

---

## /bypass

**Mô tả:** 🚀 Bỏ qua link rút gọn (Bypass)

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `url` | 🔗 Link cần bypass | Có |

### Ví dụ

> 🚀 Bỏ qua link rút gọn (Bypass)

```bash
/bypass url:https://link1s.com/example
```

---

## /chatbot

**Mô tả:** 🤖 Trò chuyện thông minh cùng AI (Gemini)

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `prompt` | 💬 Nội dung bạn muốn hỏi | Có |
| `private` | 🔒 Chỉ mình bạn thấy phản hồi (ephemeral) | Không |

### Ví dụ

> 🤖 Trò chuyện thông minh cùng AI (Gemini)

```bash
/chatbot prompt:Giới thiệu về bạn đi
```

---

## /fixcancau

**Mô tả:** Sửa cần câu đã trang bị của bạn.

### Tham số

Không có tham số.

### Ví dụ

> Sửa cần câu đã trang bị của bạn.

```bash
/fixcancau
```

---

## /background

**Mô tả:** Sửa Ảnh Cưới! (aliases: anhcuoi, hinhcuoi)

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `link` | Link ảnh cưới của bạn | Có |

### Ví dụ

> Sửa Ảnh Cưới! (aliases: anhcuoi, hinhcuoi)

```bash
/background link:https://i.imgur.com/example.png
```

---

## /r34

**Mô tả:** Tìm hình ảnh trên Rule34 (Yêu cầu kênh NSFW).

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `tags` | Tìm kiếm bằng tag, thay dấu cách bằng _ (v.d., "khoa_so_ma"). | Có |

### Ví dụ

> Tìm hình ảnh trên Rule34 (Yêu cầu kênh NSFW).

```bash
/r34 tags:genshin_impact
```

---

## /profile

**Mô tả:** Xem thông tin profile của người dùng

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `user` | Chọn người dùng để xem profile | Không |

### Ví dụ

> Xem thông tin profile của người dùng

```bash
/profile
/profile user:@User
```

---

## /translate

**Mô tả:** Dịch văn bản tới một văn bản đã chọn.

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `text` | Đoạn văn bản để dịch | Có |
| `to` | Ngôn ngữ đích (ví dụ: Tiếng Nhật, en, vi, jp) | Có |
| `from` | Ngôn ngữ nguồn (mặc định: tự động phát hiện) | Không |

### Ví dụ

> Dịch văn bản tới một văn bản đã chọn.

```bash
/translate text:Hello to:vi
```

---

## /ascii

**Mô tả:** 🎨 Chuyển đổi văn bản thành dạng ASCII

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `text` | Văn bản bạn muốn chuyển đổi | Có |
| `size` | Kích thước phông chữ (Nhỏ, Trung bình, Lớn) | Không |

### Ví dụ

> 🎨 Chuyển đổi văn bản thành dạng ASCII

```bash
/ascii text:Hello size:Trung bình
```

---

## /weather

**Mô tả:** Kiểm tra thời tiết tại một địa điểm đã chỉ định.

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `location` | Tên thành phố, mã zip (VD: Hà Nội, 70000, Tokyo) | Có |

### Ví dụ

> Kiểm tra thời tiết tại một địa điểm đã chỉ định.

```bash
/weather location:Hà Nội
```

---

## /balance

**Mô tả:** Kiểm tra số dư của người chơi khác

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `user` | Người dùng kiểm tra số dư của | Không |
| `type` | Kiểm tra loại số dư (Log) | Không |

### Ví dụ

> Kiểm tra số dư của người chơi khác

```bash
/balance
/balance user:@User type:Log
```

---

## /botinfo

**Mô tả:** 🤖 Xem thông tin chi tiết về bot

### Tham số

Không có tham số.

### Ví dụ

> 🤖 Xem thông tin chi tiết về bot

```bash
/botinfo
```

---

## /help

**Mô tả:** Xem danh sách lệnh hoặc hướng dẫn chi tiết

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `command` | Tên lệnh cần xem chi tiết | Không |

### Ví dụ

> Xem danh sách lệnh hoặc hướng dẫn chi tiết

```bash
/help
/help command:botinfo
```

---

## /ping

**Mô tả:** 🏓 Kiểm tra độ trễ và trạng thái của bot

### Tham số

Không có tham số.

### Ví dụ

> 🏓 Kiểm tra độ trễ và trạng thái của bot

```bash
/ping
```

---

## /serverinfo

**Mô tả:** Xem thông tin chi tiết về máy chủ hiện tại

### Tham số

Không có tham số.

### Ví dụ

> Xem thông tin chi tiết về máy chủ hiện tại

```bash
/serverinfo
```

---

## /rank

**Mô tả:** 🏆 Xem bảng xếp hạng

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `user` | Chọn người dùng (để trống để xem bản thân) | Không |

### Ví dụ

> 🏆 Xem bảng xếp hạng

```bash
/rank
/rank user:@User
```

---

## /setlang

**Mô tả:** Change the bot language for this server / Thay đổi ngôn ngữ bot

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `language` | Select language / Chọn ngôn ngữ (vn, en, jp) | Có |

### Ví dụ

> Change the bot language for this server / Thay đổi ngôn ngữ bot

```bash
/setlang language:vn
```

---

## /inviter

**Mô tả:** Hiển thị người đã mời một người dùng cụ thể

### Tham số

| Tham số | Mô tả | Bắt buộc |
| :--- | :--- | :--- |
| `user` | Người dùng để kiểm tra người mời | Không |

### Ví dụ

> Hiển thị người đã mời một người dùng cụ thể

```bash
/inviter
/inviter user:@User
```

---

## /buttons

**Mô tả:** Manage custom buttons for KentaBuckets

### Tham số

Không có tham số.

### Ví dụ

> Manage custom buttons

```bash
/buttons
```

---

## /selects

**Mô tả:** Manage custom select menus for KentaBuckets

### Tham số

Không có tham số.

### Ví dụ

> Manage custom select menus

```bash
/selects
```

---

