## /autoresponder placeholders

**Mô tả:** 📋 Xem danh sách biến và hàm hỗ trợ

### Tham số

Không có tham số.

### Ví dụ

> 📋 Xem danh sách biến và hàm hỗ trợ

```bash
/autoresponder placeholders
```

---

## /autoresponder add

**Mô tả:** ➕ Thêm phản hồi tự động mới

### Tham số

| Tham số      | Mô tả                                 | Bắt buộc |
| :----------- | :------------------------------------ | :------- |
| `trigger`    | Từ khóa để kích hoạt.                 | Có       |
| `response`   | Chuỗi để trả lời.                     | Có       |
| `mode`       | Chế độ khớp.                          | Có       |
| `ignorecase` | Bỏ qua trường hợp (chữ hoa/thường).   | Không    |
| `attachment` | Tệp đính kèm (ảnh/video) để gửi cùng. | Không    |

### Ví dụ

> ➕ Thêm phản hồi tự động mới

```bash
/autoresponder add trigger:hello response:Hi there! mode:exact
```

---

## /autoresponder view

**Mô tả:** 👀 Xem chi tiết phản hồi tự động

### Tham số

| Tham số   | Mô tả                       | Bắt buộc |
| :-------- | :-------------------------- | :------- |
| `trigger` | Từ khóa của auto-responder. | Có       |

### Ví dụ

> 👀 Xem chi tiết phản hồi tự động

```bash
/autoresponder view trigger:hello
```

---

## /autoresponder edit

**Mô tả:** ✏️ Chỉnh sửa phản hồi tự động

### Tham số

| Tham số             | Mô tả                                   | Bắt buộc |
| :------------------ | :-------------------------------------- | :------- |
| `trigger`           | Từ khóa của auto-responder.             | Có       |
| `response`          | Chuỗi trả lời mới.                      | Không    |
| `attachment`        | Tệp đính kèm mới (ảnh/video).           | Không    |
| `remove_attachment` | Chọn true để xóa tệp đính kèm hiện tại. | Không    |

### Ví dụ

> ✏️ Chỉnh sửa phản hồi tự động

```bash
/autoresponder edit trigger:hello response:Chào bạn!
```

---

## /autoresponder matchmode

**Mô tả:** 🎯 Cài đặt chế độ so khớp từ khóa

### Tham số

| Tham số   | Mô tả                       | Bắt buộc |
| :-------- | :-------------------------- | :------- |
| `trigger` | Từ khóa của auto-responder. | Có       |
| `mode`    | Chế độ khớp mới.            | Có       |

### Ví dụ

> 🎯 Cài đặt chế độ so khớp từ khóa

```bash
/autoresponder matchmode trigger:hello mode:contains
```

---

## /autoresponder delete

**Mô tả:** 🗑️ Xóa phản hồi tự động

### Tham số

| Tham số   | Mô tả                       | Bắt buộc |
| :-------- | :-------------------------- | :------- |
| `trigger` | Từ khóa của auto-responder. | Có       |

### Ví dụ

> 🗑️ Xóa phản hồi tự động

```bash
/autoresponder delete trigger:hello
```

---

## /autoresponder list

**Mô tả:** 📜 Danh sách phản hồi tự động hiện có

### Tham số

Không có tham số.

### Ví dụ

> 📜 Danh sách phản hồi tự động hiện có

```bash
/autoresponder list
```

---

## /customrole search

**Mô tả:** 🔍 Tìm kiếm Role tùy chỉnh

### Tham số

| Tham số | Mô tả                  | Bắt buộc |
| :------ | :--------------------- | :------- |
| `role`  | Chọn role để tìm kiếm. | Không    |

### Ví dụ

> 🔍 Tìm kiếm Role tùy chỉnh

```bash
/customrole search role:@RoleName
```

---

## /customrole user add

**Mô tả:** ➕ Thêm thành viên vào Role

### Tham số

| Tham số | Mô tả                | Bắt buộc |
| :------ | :------------------- | :------- |
| `user`  | Chọn một thành viên. | Có       |

### Ví dụ

> ➕ Thêm thành viên vào Role

```bash
/customrole user add user:@User
```

---

## /customrole user remove

**Mô tả:** ➖ Xóa thành viên khỏi Role

### Tham số

| Tham số | Mô tả                | Bắt buộc |
| :------ | :------------------- | :------- |
| `user`  | Chọn một thành viên. | Có       |

### Ví dụ

> ➖ Xóa thành viên khỏi Role

```bash
/customrole user remove user:@User
```

---

## /customrole user color

**Mô tả:** 🎨 Đổi màu sắc Role

### Tham số

| Tham số | Mô tả                       | Bắt buộc |
| :------ | :-------------------------- | :------- |
| `color` | Mã màu hex (ví dụ: #c0cdff) | Có       |

### Ví dụ

> 🎨 Đổi màu sắc Role

```bash
/customrole user color color:#ff0000
```

---

## /customrole user icon

**Mô tả:** 🖼️ Đổi biểu tượng (Icon) Role

### Tham số

| Tham số | Mô tả                 | Bắt buộc |
| :------ | :-------------------- | :------- |
| `icon`  | Tải lên icon của bạn. | Có       |

### Ví dụ

> 🖼️ Đổi biểu tượng (Icon) Role

```bash
/customrole user icon icon:[Image]
```

---

## /customrole user removeicon

**Mô tả:** 🗑️ Xóa biểu tượng Role

### Tham số

Không có tham số.

### Ví dụ

> 🗑️ Xóa biểu tượng Role

```bash
/customrole user removeicon
```

---

## /customrole user mentionable

**Mô tả:** 🔔 Bật/Tắt thông báo (Mention)

### Tham số

| Tham số  | Mô tả         | Bắt buộc |
| :------- | :------------ | :------- |
| `action` | Bật hoặc tắt. | Có       |

### Ví dụ

> 🔔 Bật/Tắt thông báo (Mention)

```bash
/customrole user mentionable action:True
```

---

## /customrole user info

**Mô tả:** ℹ️ Xem thông tin Role

### Tham số

Không có tham số.

### Ví dụ

> ℹ️ Xem thông tin Role

```bash
/customrole user info
```

---

## /customrole user name

**Mô tả:** ✏️ Đổi tên Role

### Tham số

| Tham số | Mô tả         | Bắt buộc |
| :------ | :------------ | :------- |
| `name`  | Tên role mới. | Có       |

### Ví dụ

> ✏️ Đổi tên Role

```bash
/customrole user name name:NewRoleName
```

---

## /customrole admin create

**Mô tả:** ✨ Tạo Role tùy chỉnh mới

### Tham số

| Tham số                            | Mô tả                                                                    | Bắt buộc |
| :--------------------------------- | :----------------------------------------------------------------------- | :------- |
| `above_role`                       | Role mới sẽ nằm trên role này.                                           | Có       |
| `author`                           | Chỉ định chủ của role tùy chỉnh.                                         | Có       |
| `name`                             | Chỉ định tên role.                                                       | Có       |
| `max_users`                        | Số người dùng tối đa có thể được gán vào role này.                       | Có       |
| `expire_after`                     | Hỗ trợ ngày ở dạng ngắn (ví dụ: 2mon1d2h), nhập ‘0’ để đặt là vĩnh viễn. | Có       |
| `color`                            | Chỉ định màu của role.                                                   | Không    |
| `edit_name_permission`             | Cho phép chủ của role thay đổi tên role của họ.                          | Không    |
| `edit_icon_permission`             | Cho phép chủ của role thay đổi icon của họ.                              | Không    |
| `edit_color_permission`            | Cho phép chủ của role thay đổi màu của họ.                               | Không    |
| `manage_role_members_permission`   | Cho phép chủ của role thêm/xóa thành viên của role.                      | Không    |
| `make_role_mentionable_permission` | Cho phép chủ của role làm cho role của họ có thể được nhắc đến.          | Không    |

### Ví dụ

> ✨ Tạo Role tùy chỉnh mới

```bash
/customrole admin create above_role:@Role author:@User name:MyRole max_users:10 expire_after:30d
```

---

## /customrole admin terminate

**Mô tả:** 🚫 Chấm dứt Role tùy chỉnh

### Tham số

| Tham số       | Mô tả                                | Bắt buộc |
| :------------ | :----------------------------------- | :------- |
| `user`        | Chọn người dùng.                     | Có       |
| `delete_role` | Xóa role hay không, mặc định: không. | Không    |

### Ví dụ

> 🚫 Chấm dứt Role tùy chỉnh

```bash
/customrole admin terminate user:@User
```

---

## /customrole admin migrate

**Mô tả:** 🔄 Chuyển đổi Role thường thành Custom

### Tham số

| Tham số        | Mô tả                                                                    | Bắt buộc |
| :------------- | :----------------------------------------------------------------------- | :------- |
| `role`         | Chỉ định một role.                                                       | Có       |
| `author`       | Chỉ định chủ của role tùy chỉnh.                                         | Có       |
| `max_users`    | Số người dùng tối đa có thể được gán vào role này.                       | Có       |
| `expire_after` | Hỗ trợ ngày ở dạng ngắn (ví dụ: 2mon1d2h), nhập ‘0’ để đặt là vĩnh viễn. | Có       |

### Ví dụ

> 🔄 Chuyển đổi Role thường thành Custom

```bash
/customrole admin migrate role:@Role author:@User max_users:5 expire_after:0
```

---

## /customrole admin edit_permission

**Mô tả:** ⚙️ Chỉnh sửa quyền hạn Role

### Tham số

| Tham số                 | Mô tả                                                           | Bắt buộc |
| :---------------------- | :-------------------------------------------------------------- | :------- |
| `role`                  | Chỉ định một role.                                              | Có       |
| `edit_name`             | Cho phép chủ của role thay đổi tên role của họ.                 | Không    |
| `edit_icon`             | Cho phép chủ của role thay đổi icon của họ.                     | Không    |
| `edit_color`            | Cho phép chủ của role thay đổi màu của họ.                      | Không    |
| `manage_role_members`   | Cho phép chủ của role thêm/xóa thành viên của role.             | Không    |
| `make_role_mentionable` | Cho phép chủ của role làm cho role của họ có thể được nhắc đến. | Không    |

### Ví dụ

> ⚙️ Chỉnh sửa quyền hạn Role

```bash
/customrole admin edit_permission role:@Role edit_name:True
```

---

## /customrole admin max_users

**Mô tả:** 👥 Giới hạn số lượng thành viên

### Tham số

| Tham số | Mô tả                                   | Bắt buộc |
| :------ | :-------------------------------------- | :------- |
| `role`  | Chỉ định một role.                      | Có       |
| `users` | Chỉ định số lượng, từ 1 đến tối đa 100. | Có       |

### Ví dụ

> 👥 Giới hạn số lượng thành viên

```bash
/customrole admin max_users role:@Role users:20
```

---

## /customrole admin default_author_permission

**Mô tả:** 🔒 Cài đặt quyền mặc định

### Tham số

| Tham số                 | Mô tả                                                           | Bắt buộc |
| :---------------------- | :-------------------------------------------------------------- | :------- |
| `edit_name`             | Cho phép chủ của role thay đổi tên role của họ.                 | Không    |
| `edit_icon`             | Cho phép chủ của role thay đổi icon của họ.                     | Không    |
| `edit_color`            | Cho phép chủ của role thay đổi màu của họ.                      | Không    |
| `manage_role_members`   | Cho phép chủ của role thêm/xóa thành viên của role.             | Không    |
| `make_role_mentionable` | Cho phép chủ của role làm cho role của họ có thể được nhắc đến. | Không    |

### Ví dụ

> 🔒 Cài đặt quyền mặc định

```bash
/customrole admin default_author_permission edit_name:True
```

---

## /customrole admin extend

**Mô tả:** ⏳ Gia hạn thời gian sử dụng

### Tham số

| Tham số      | Mô tả                                                 | Bắt buộc |
| :----------- | :---------------------------------------------------- | :------- |
| `role`       | Chọn role.                                            | Có       |
| `time_range` | Chỉ định khoảng thời gian. Nhập ‘0’ để làm vĩnh viễn. | Có       |

### Ví dụ

> ⏳ Gia hạn thời gian sử dụng

```bash
/customrole admin extend role:@Role time_range:30d
```

---

## /customrole admin reduce

**Mô tả:** 📉 Giảm thời gian sử dụng

### Tham số

| Tham số      | Mô tả                              | Bắt buộc |
| :----------- | :--------------------------------- | :------- |
| `role`       | Chọn role.                         | Có       |
| `time_range` | Chỉ định khoảng thời gian để giảm. | Có       |

### Ví dụ

> 📉 Giảm thời gian sử dụng

```bash
/customrole admin reduce role:@Role time_range:7d
```

---

## /customrole admin on_expire

**Mô tả:** ⚠️ Cài đặt hành động khi hết hạn

### Tham số

| Tham số  | Mô tả          | Bắt buộc |
| :------- | :------------- | :------- |
| `action` | Ghi hành động. | Có       |

### Ví dụ

> ⚠️ Cài đặt hành động khi hết hạn

```bash
/customrole admin on_expire action:deleteRole
```

---

## /farm plant

**Mô tả:** 🌱 Trồng hạt giống

### Tham số

| Tham số    | Mô tả                               | Bắt buộc |
| :--------- | :---------------------------------- | :------- |
| `seed`     | 🌰 Loại hạt giống bạn muốn trồng    | Có       |
| `quantity` | 🔢 Số lượng hạt giống (mặc định: 1) | Không    |

### Ví dụ

> 🌱 Trồng hạt giống

```bash
/farm plant seed:úa
```

---

## /farm harvest

**Mô tả:** 🚜 Thu hoạch cây trồng

### Tham số

| Tham số | Mô tả                          | Bắt buộc |
| :------ | :----------------------------- | :------- |
| `plant` | 🌿 Loại cây bạn muốn thu hoạch | Có       |

### Ví dụ

> 🚜 Thu hoạch cây trồng

```bash
/farm harvest plant:Lúa
```

---

## /farm field

**Mô tả:** 👀 Xem cánh đồng của bạn

### Tham số

Không có tham số.

### Ví dụ

> 👀 Xem cánh đồng của bạn

```bash
/farm field
```

---

## /farm event

**Mô tả:** 🌤️ Xem sự kiện thời tiết hiện tại

### Tham số

Không có tham số.

### Ví dụ

> 🌤️ Xem sự kiện thời tiết hiện tại

```bash
/farm event
```

---

## /farm seeds

**Mô tả:** 🎒 Xem kho hạt giống

### Tham số

Không có tham số.

### Ví dụ

> 🎒 Xem kho hạt giống

```bash
/farm seeds
```

---

## /farm inventory

**Mô tả:** 📦 Xem kho nông sản & phân bón

### Tham số

Không có tham số.

### Ví dụ

> 📦 Xem kho nông sản & phân bón

```bash
/farm inventory
```

---

## /farm phanbon

**Mô tả:** ✨ Sử dụng phân bón cho cây

### Tham số

| Tham số        | Mô tả                                         | Bắt buộc |
| :------------- | :-------------------------------------------- | :------- |
| `ten_phan_bon` | 🧪 Loại phân bón muốn dùng                    | Có       |
| `ten_cay`      | 🌿 Loại cây muốn bón (để trống để bón tất cả) | Không    |

### Ví dụ

> ✨ Sử dụng phân bón cho cây

```bash
/farm phanbon ten_phan_bon:SuperGrow
```

---

## /farm savings deposit

**Mô tả:** 📥 Gửi tiền vào tài khoản tiết kiệm

### Tham số

| Tham số  | Mô tả               | Bắt buộc |
| :------- | :------------------ | :------- |
| `amount` | 💵 Số tiền muốn gửi | Có       |

### Ví dụ

> 📥 Gửi tiền vào tài khoản tiết kiệm

```bash
/farm savings deposit amount:1000
```

---

## /farm savings balance

**Mô tả:** 💳 Xem số dư tiết kiệm

### Tham số

Không có tham số.

### Ví dụ

> 💳 Xem số dư tiết kiệm

```bash
/farm savings balance
```

---

## /farm sell

**Mô tả:** 💸 Bán nông sản kiếm lời

### Tham số

| Tham số    | Mô tả                             | Bắt buộc |
| :--------- | :-------------------------------- | :------- |
| `produce`  | 🍎 Loại nông sản muốn bán         | Có       |
| `quantity` | 🔢 Số lượng muốn bán (hoặc "all") | Có       |

### Ví dụ

> 💸 Bán nông sản kiếm lời

```bash
/farm sell produce:Lúa quantity:all
```

---

## /cauca fish

**Mô tả:** Câu cá tại một địa điểm.

### Tham số

| Tham số    | Mô tả            | Bắt buộc |
| :--------- | :--------------- | :------- |
| `location` | Địa điểm câu cá. | Không    |

### Ví dụ

> Câu cá tại một địa điểm.

```bash
/cauca fish location:Hồ
```

---

## /cauca inventory

**Mô tả:** Hiển thị kho đồ câu cá của bạn.

### Tham số

Không có tham số.

### Ví dụ

> Hiển thị kho đồ câu cá của bạn.

```bash
/cauca inventory
```

---

## /cauca sell

**Mô tả:** Bán cá trong kho.

### Tham số

| Tham số    | Mô tả                                    | Bắt buộc |
| :--------- | :--------------------------------------- | :------- |
| `fish`     | Loại cá muốn bán (hoặc gõ "all").        | Có       |
| `quantity` | Số lượng (để trống nếu bán tất cả cá đó) | Không    |

### Ví dụ

> Bán cá trong kho.

```bash
/cauca sell fish:all
```

---

## /cauca select

**Mô tả:** Chọn cần câu hoặc mồi câu để sử dụng.

### Tham số

| Tham số | Mô tả                    | Bắt buộc |
| :------ | :----------------------- | :------- |
| `type`  | Loại vật phẩm muốn chọn. | Có       |

### Ví dụ

> Chọn cần câu hoặc mồi câu để sử dụng.

```bash
/cauca select type:Cần câu
```

---

## /cauca help

**Mô tả:** Hiển thị trợ giúp về câu cá.

### Tham số

Không có tham số.

### Ví dụ

> Hiển thị trợ giúp về câu cá.

```bash
/cauca help
```

---

## /letme kiss

**Mô tả:** 💋 Gửi nụ hôn nồng thắm

### Tham số

| Tham số  | Mô tả                 | Bắt buộc |
| :------- | :-------------------- | :------- |
| `target` | 👤 Người bạn muốn hôn | Có       |

### Ví dụ

> 💋 Gửi nụ hôn nồng thắm

```bash
/letme kiss target:@User
```

---

## /letme hug

**Mô tả:** 🤗 Gửi cái ôm ấm áp

### Tham số

| Tham số  | Mô tả                | Bắt buộc |
| :------- | :------------------- | :------- |
| `target` | 👤 Người bạn muốn ôm | Có       |

### Ví dụ

> 🤗 Gửi cái ôm ấm áp

```bash
/letme hug target:@User
```

---

## /letme punch

**Mô tả:** 👊 Đấm yêu (hoặc không yêu lắm)

### Tham số

| Tham số  | Mô tả                 | Bắt buộc |
| :------- | :-------------------- | :------- |
| `target` | 👤 Người bạn muốn đấm | Có       |

### Ví dụ

> 👊 Đấm yêu (hoặc không yêu lắm)

```bash
/letme punch target:@User
```

---

## /letme handhold

**Mô tả:** 🤝 Nắm tay thân thiết

### Tham số

| Tham số  | Mô tả                     | Bắt buộc |
| :------- | :------------------------ | :------- |
| `target` | 👤 Người bạn muốn nắm tay | Có       |

### Ví dụ

> 🤝 Nắm tay thân thiết

```bash
/letme handhold target:@User
```

---

## /letme bite

**Mô tả:** 😬 Cắn yêu một cái

### Tham số

| Tham số  | Mô tả                 | Bắt buộc |
| :------- | :-------------------- | :------- |
| `target` | 👤 Người bạn muốn cắn | Có       |

### Ví dụ

> 😬 Cắn yêu một cái

```bash
/letme bite target:@User
```

---

## /letme pat

**Mô tả:** 👋 Vỗ đầu cưng nựng

### Tham số

| Tham số  | Mô tả                    | Bắt buộc |
| :------- | :----------------------- | :------- |
| `target` | 👤 Người bạn muốn vỗ đầu | Có       |

### Ví dụ

> 👋 Vỗ đầu cưng nựng

```bash
/letme pat target:@User
```

---

## /letme slap

**Mô tả:** 👋 Tát một cái thật kêu

### Tham số

| Tham số  | Mô tả                 | Bắt buộc |
| :------- | :-------------------- | :------- |
| `target` | 👤 Người bạn muốn tát | Có       |

### Ví dụ

> 👋 Tát một cái thật kêu

```bash
/letme slap target:@User
```

---

## /letme fack

**Mô tả:** 🖕 Gửi lời chào thân ái (Fack)

### Tham số

| Tham số  | Mô tả                          | Bắt buộc |
| :------- | :----------------------------- | :------- |
| `target` | 👤 Người bạn muốn gửi lời chào | Có       |

### Ví dụ

> 🖕 Gửi lời chào thân ái (Fack)

```bash
/letme fack target:@User
```

---

## /greetings welcome

**Mô tả:** 📥 Cài đặt tin nhắn Chào mừng (Welcome)

Lệnh này cho phép bạn cấu hình tin nhắn chào mừng tự động khi có thành viên mới gia nhập máy chủ. Khi thực hiện lệnh, một hộp thoại (Modal) sẽ hiện ra để bạn nhập nội dung.

**Tính năng nâng cao:**

- **Hỗ trợ định dạng JSON:** Bạn có thể tạo Embed phức tạp (màu sắc, hình ảnh, fields) bằng cách nhập mã JSON.
- **Văn bản thuần (Text):** Nhập nội dung bình thường hoặc bắt đầu bằng `[text]` để buộc gửi dạng tin nhắn thường.
- **Embed mặc định:** Nhập `[blank]` để sử dụng giao diện chào mừng mặc định của Bot.

**Danh sách biến hỗ trợ (Placeholders):**
Bạn có thể sử dụng các từ khóa sau trong nội dung tin nhắn, Bot sẽ tự động thay thế bằng thông tin thực tế:

- `{user_mention}` : Tag tên thành viên (VD: @Neko)
- `{user_name}` : Tên hiển thị (VD: Neko)
- `{user_tag}` : Tên kèm Tag (VD: Neko#1234)
- `{user_id}` : ID của thành viên
- `{user_avatar}` : Link avatar của thành viên (dùng trong JSON thumbnail/image)
- `{user_created}` : Ngày tạo tài khoản
- `{server_name}` : Tên máy chủ
- `{server_membercount}` : Tổng số thành viên hiện tại
- `{member_position}` : Thứ hạng thành viên gia nhập

**Ví dụ mã JSON cho Embed Chào mừng:**

```json
{
  "title": "Chào mừng {user_name}!",
  "description": "Chào mừng bạn đến với {server_name}. Bạn là thành viên thứ {member_position}!",
  "color": "#00ff00",
  "thumbnail": "{user_avatar}",
  "footer": "Chúc bạn vui vẻ!"
}
```

### Tham số

| Tham số   | Mô tả                | Bắt buộc |
| :-------- | :------------------- | :------- |
| `channel` | 📢 Kênh gửi tin nhắn | Có       |

### Ví dụ

> 📥 Cài đặt tin nhắn Chào mừng tại kênh #general

```bash
/greetings welcome channel:#general
```

---

## /greetings goodbye

**Mô tả:** 📤 Cài đặt tin nhắn Tạm biệt (Goodbye)

Cấu hình tin nhắn tự động khi thành viên rời khỏi máy chủ. Tương tự như lệnh Welcome, lệnh này hỗ trợ đầy đủ các biến (placeholders) và định dạng JSON Embed.

**Ví dụ mã JSON cho Embed Tạm biệt:**

```json
{
  "title": "Tạm biệt!",
  "description": "{user_name} đã rời đi. Chúng ta còn lại {server_membercount} thành viên.",
  "color": "#ff0000"
}
```

### Tham số

| Tham số   | Mô tả                | Bắt buộc |
| :-------- | :------------------- | :------- |
| `channel` | 📢 Kênh gửi tin nhắn | Có       |

### Ví dụ

> 📤 Cài đặt tin nhắn Tạm biệt tại kênh #goodbye

```bash
/greetings goodbye channel:#goodbye
```

---

## /greetings welcome-clear

**Mô tả:** 🗑️ Xóa cấu hình Chào mừng

### Tham số

Không có tham số.

### Ví dụ

> 🗑️ Xóa cấu hình Chào mừng

```bash
/greetings welcome-clear
```

---

## /greetings goodbye-clear

**Mô tả:** 🗑️ Xóa cấu hình Tạm biệt

### Tham số

Không có tham số.

### Ví dụ

> 🗑️ Xóa cấu hình Tạm biệt

```bash
/greetings goodbye-clear
```

---

## /greetings welcome-test

**Mô tả:** 🧪 Gửi thử tin nhắn Chào mừng

### Tham số

Không có tham số.

### Ví dụ

> 🧪 Gửi thử tin nhắn Chào mừng

```bash
/greetings welcome-test
```

---

## /greetings goodbye-test

**Mô tả:** 🧪 Gửi thử tin nhắn Tạm biệt

### Tham số

Không có tham số.

### Ví dụ

> 🧪 Gửi thử tin nhắn Tạm biệt

```bash
/greetings goodbye-test
```

---

## /greetings help

**Mô tả:** ❓ Xem hướng dẫn sử dụng

### Tham số

Không có tham số.

### Ví dụ

> ❓ Xem hướng dẫn sử dụng

```bash
/greetings help
```

---

## /jikan anime search

**Mô tả:** Tìm kiếm anime

Tra cứu thông tin chi tiết về một Anime bất kỳ từ cơ sở dữ liệu MyAnimeList. Kết quả trả về bao gồm tiêu đề, loại (TV, Movie...), điểm đánh giá, số tập và năm phát hành.

### Tham số

| Tham số | Mô tả   | Bắt buộc |
| :------ | :------ | :------- |
| `q`     | Từ khóa | Có       |
| `page`  | Trang   | Không    |

### Ví dụ

> Tìm kiếm anime "Naruto"

```bash
/jikan anime search q:Naruto
```

---

## /jikan anime top

**Mô tả:** Xem bảng xếp hạng Anime

Hiển thị danh sách các Anime được đánh giá cao nhất trên MyAnimeList. Bạn có thể lọc theo loại (TV, Movie, OVA, etc.).

### Tham số

| Tham số | Mô tả                                        | Bắt buộc |
| :------ | :------------------------------------------- | :------- |
| `type`  | Thể loại (all, tv, movie, ova, special, ona) | Không    |
| `page`  | Trang                                        | Không    |

### Ví dụ

> Xem top Anime thể loại Movie

```bash
/jikan anime top type:movie
```

---

## /jikan anime season

**Mô tả:** Anime theo mùa

Tra cứu danh sách Anime phát sóng theo mùa và năm cụ thể.

### Tham số

| Tham số  | Mô tả                              | Bắt buộc |
| :------- | :--------------------------------- | :------- |
| `year`   | Năm (VD: 2024)                     | Không    |
| `season` | Mùa (winter, spring, summer, fall) | Không    |
| `page`   | Trang                              | Không    |

### Ví dụ

> Xem danh sách Anime mùa hiện tại

```bash
/jikan anime season
```

> Xem danh sách Anime mùa Đông năm 2024

```bash
/jikan anime season year:2024 season:winter
```

---

## /jikan anime random

**Mô tả:** Anime ngẫu nhiên

Bot sẽ đề xuất ngẫu nhiên một Anime từ MyAnimeList cho bạn. Hỗ trợ nút dịch sang Tiếng Việt.

### Tham số

Không có tham số.

### Ví dụ

> Anime ngẫu nhiên

```bash
/jikan anime random
```

---

## /jikan anime character

**Mô tả:** Tìm nhân vật Anime

Tra cứu thông tin về một nhân vật trong Anime, bao gồm tiểu sử (có hỗ trợ dịch tự động sang Tiếng Việt).

### Tham số

| Tham số | Mô tả        | Bắt buộc |
| :------ | :----------- | :------- |
| `q`     | Tên nhân vật | Có       |
| `page`  | Trang        | Không    |

### Ví dụ

> Tìm thông tin nhân vật "Luffy"

```bash
/jikan anime character q:Luffy
```

---

## /jikan anime schedule

**Mô tả:** Lịch phát sóng Anime

Xem lịch phát sóng các bộ Anime đang chiếu (On-going) theo các ngày trong tuần.

### Tham số

| Tham số | Mô tả                               | Bắt buộc |
| :------ | :---------------------------------- | :------- |
| `day`   | Ngày (monday, tuesday, ..., sunday) | Không    |
| `page`  | Trang                               | Không    |

### Ví dụ

> Xem lịch phát sóng ngày hôm nay

```bash
/jikan anime schedule
```

> Xem lịch phát sóng ngày Chủ Nhật

```bash
/jikan anime schedule day:sunday
```

---

## /jikan manga search

**Mô tả:** Tìm kiếm Manga

Tra cứu thông tin chi tiết về một bộ Manga (Truyện tranh Nhật Bản) từ MyAnimeList.

### Tham số

| Tham số | Mô tả   | Bắt buộc |
| :------ | :------ | :------- |
| `q`     | Từ khóa | Có       |
| `page`  | Trang   | Không    |

### Ví dụ

> Tìm kiếm manga "Berserk"

```bash
/jikan manga search q:Berserk
```

---

## /jikan manga top

**Mô tả:** Xem bảng xếp hạng Manga

Hiển thị danh sách các bộ Manga, Novel, One-shot... được đánh giá cao nhất.

### Tham số

| Tham số | Mô tả                                                      | Bắt buộc |
| :------ | :--------------------------------------------------------- | :------- |
| `type`  | Loại (all, manga, novel, one_shot, doujin, manhwa, manhua) | Không    |
| `page`  | Trang                                                      | Không    |

### Ví dụ

> Xem top Manhwa (Truyện tranh Hàn Quốc)

```bash
/jikan manga top type:manhwa
```

---

## /jikan manga random

**Mô tả:** Manga ngẫu nhiên

Bot sẽ đề xuất ngẫu nhiên một bộ Manga cho bạn.

### Tham số

Không có tham số.

### Ví dụ

> Manga ngẫu nhiên

```bash
/jikan manga random
```

---

## /jikan chart

**Mô tả:** Biểu đồ Top Anime

Hiển thị danh sách Top Anime thịnh hành theo tuần/tháng/năm kèm theo các nút tương tác để chuyển đổi thời gian xem.

### Tham số

| Tham số  | Mô tả                                                          | Bắt buộc |
| :------- | :------------------------------------------------------------- | :------- |
| `metric` | Chỉ số (members: số thành viên theo dõi, score: điểm đánh giá) | Không    |

### Ví dụ

> Biểu đồ Top Anime theo số lượng thành viên theo dõi

```bash
/jikan chart metric:members
```

---

## /jikan manga_chart

**Mô tả:** Biểu đồ Top Manga

Tương tự như biểu đồ Anime, nhưng dành cho Manga.

### Tham số

| Tham số  | Mô tả                                                          | Bắt buộc |
| :------- | :------------------------------------------------------------- | :------- |
| `metric` | Chỉ số (members: số thành viên theo dõi, score: điểm đánh giá) | Không    |

### Ví dụ

> Biểu đồ Top Manga theo điểm đánh giá

```bash
/jikan manga_chart metric:score
```

---

## /relationship marry

**Mô tả:** Cầu hôn người ấy (Bên nhau trọn đời...)

### Tham số

| Tham số | Mô tả               | Bắt buộc |
| :------ | :------------------ | :------- |
| `user`  | Người bạn muốn cưới | Có       |

### Ví dụ

> Cầu hôn người ấy (Bên nhau trọn đời...)

```bash
/relationship marry user:@User
```

---

## /relationship divorce

**Mô tả:** Ly hôn (Đường Ai Nấy Đi...)

### Tham số

Không có tham số.

### Ví dụ

> Ly hôn (Đường Ai Nấy Đi...)

```bash
/relationship divorce
```

---

## /relationship promise

**Mô tả:** Thề non hẹn biển... (Thay đổi lời hứa)

### Tham số

| Tham số   | Mô tả           | Bắt buộc |
| :-------- | :-------------- | :------- |
| `loi_hua` | Lời hứa của bạn | Có       |

### Ví dụ

> Thề non hẹn biển... (Thay đổi lời hứa)

```bash
/relationship promise loi_hua:Mãi yêu
```

---

## /relationship together

**Mô tả:** Tương tác tình cảm (Tình cảm nồng đậm...)

### Tham số

Không có tham số.

### Ví dụ

> Tương tác tình cảm (Tình cảm nồng đậm...)

```bash
/relationship together
```

---

## /network paping

**Mô tả:** Ping TCP một địa chỉ mạng.

### Tham số

| Tham số   | Mô tả                                | Bắt buộc |
| :-------- | :----------------------------------- | :------- |
| `address` | Chỉ định tên miền hoặc địa chỉ IPv4. | Có       |
| `port`    | Chỉ định cổng, mặc định là 80.       | Không    |
| `count`   | Tổng số lần pap, mặc định là 4.      | Không    |

### Ví dụ

> Pap một địa chỉ mạng.

```bash
/network paping address:google.com
```

---

## /network address

**Mô tả:** Xem thông tin của một địa chỉ mạng.

### Tham số

| Tham số   | Mô tả                                | Bắt buộc |
| :-------- | :----------------------------------- | :------- |
| `address` | Chỉ định tên miền hoặc địa chỉ IPv4. | Có       |

### Ví dụ

> Xem thông tin của một địa chỉ mạng.

```bash
/network address address:8.8.8.8
```

---

## /network check-host

**Mô tả:** Kiểm tra máy chủ từ nhiều địa điểm (check-host.net).

### Tham số

| Tham số   | Mô tả                                      | Bắt buộc |
| :-------- | :----------------------------------------- | :------- |
| `address` | Địa chỉ cần kiểm tra (URL hoặc IP).        | Có       |
| `type`    | Loại kiểm tra (http, ping, tcp, udp, dns). | Không    |

### Ví dụ

> Kiểm tra máy chủ (mặc định HTTP)

```bash
/network check-host address:google.com
```

> Kiểm tra Ping

```bash
/network check-host address:google.com type:ping
```

---

## /noitu setup

**Mô tả:** Thiết lập trò chơi nối từ cho kênh (Admin)

### Tham số

Không có tham số.

### Ví dụ

> Thiết lập trò chơi nối từ cho kênh (Admin)

```bash
/noitu setup
```

---

## /noitu stop

**Mô tả:** Dừng trò chơi trong kênh này (Admin)

### Tham số

Không có tham số.

### Ví dụ

> Dừng trò chơi trong kênh này (Admin)

```bash
/noitu stop
```

---

## /noitu reset

**Mô tả:** Reset trò chơi - xóa tất cả từ đã dùng (Admin)

### Tham số

Không có tham số.

### Ví dụ

> Reset trò chơi - xóa tất cả từ đã dùng (Admin)

```bash
/noitu reset
```

---

## /noitu stats

**Mô tả:** Xem thống kê người chơi

### Tham số

Không có tham số.

### Ví dụ

> Xem thống kê người chơi

```bash
/noitu stats
```

---

## /noitu leaderboard

**Mô tả:** Xem bảng xếp hạng

### Tham số

Không có tham số.

### Ví dụ

> Xem bảng xếp hạng

```bash
/noitu leaderboard
```

---

## /noitu hint

**Mô tả:** Gợi ý từ bắt đầu bằng chữ cái hiện tại

### Tham số

Không có tham số.

### Ví dụ

> Gợi ý từ bắt đầu bằng chữ cái hiện tại

```bash
/noitu hint
```

---

## /noitu info

**Mô tả:** Thông tin về trò chơi hiện tại

### Tham số

Không có tham số.

### Ví dụ

> Thông tin về trò chơi hiện tại

```bash
/noitu info
```

---

## /noitu history

**Mô tả:** Xem 10 từ gần nhất

### Tham số

Không có tham số.

### Ví dụ

> Xem 10 từ gần nhất

```bash
/noitu history
```

---

## /noitu test

**Mô tả:** Test API với một từ

### Tham số

| Tham số | Mô tả       | Bắt buộc |
| :------ | :---------- | :------- |
| `word`  | Từ cần test | Có       |

### Ví dụ

> Test API với một từ

```bash
/noitu test word:test
```

---

## /pixiv illustration

**Mô tả:** Tìm kiếm illustration theo tag

### Tham số

| Tham số       | Mô tả                                | Bắt buộc |
| :------------ | :----------------------------------- | :------- |
| `tag`         | Tag để tìm kiếm                      | Có       |
| `search_mode` | Chế độ tìm kiếm (mặc định: theo tag) | Không    |
| `sort_mode`   | Chế độ sắp xếp (mặc định: không)     | Không    |
| `nsfw`        | Tìm kiếm ảnh NSFW (mặc định: không)  | Không    |

### Ví dụ

> Tìm kiếm illustration theo tag

```bash
/pixiv illustration tag:miku
```

---

## /pixiv artwork

**Mô tả:** Tìm kiếm artwork từ bảng xếp hạng

### Tham số

| Tham số       | Mô tả                          | Bắt buộc |
| :------------ | :----------------------------- | :------- |
| `leaderboard` | Phạm vi ngày cho bảng xếp hạng | Có       |

### Ví dụ

> Tìm kiếm artwork từ bảng xếp hạng

```bash
/pixiv artwork leaderboard:Daily
```

---

## /pixiv bosuutap

**Mô tả:** Xem các ảnh bạn đã yêu thích

### Tham số

Không có tham số.

### Ví dụ

> Xem các ảnh bạn đã yêu thích

```bash
/pixiv bosuutap
```

---

## /report message

**Mô tả:** 🚨 Báo cáo tin nhắn vi phạm

Sử dụng lệnh này để báo cáo một tin nhắn cụ thể cho ban quản trị. Hệ thống sẽ gửi một bản sao của tin nhắn vi phạm cùng lý do báo cáo tới kênh tiếp nhận.

### Tham số

| Tham số      | Mô tả                                               | Bắt buộc |
| :----------- | :-------------------------------------------------- | :------- |
| `channel`    | Kênh chứa tin nhắn vi phạm                          | Có       |
| `message_id` | ID của tin nhắn cần báo cáo (Chuột phải -> Copy ID) | Có       |
| `reason`     | Lý do báo cáo (VD: Spam, Quảng cáo...)              | Có       |
| `silent`     | Chế độ ẩn danh (chỉ bạn nhìn thấy phản hồi của bot) | Không    |

### Ví dụ

> Báo cáo một tin nhắn spam trong kênh #general

```bash
/report message channel:#general message_id:123456789012345678 reason:Spam quảng cáo
```

---

## /report recent

**Mô tả:** 📋 Xem danh sách báo cáo gần đây

Hiển thị danh sách các phiếu tố cáo đã được gửi trong máy chủ. Có thể lọc theo trạng thái, người báo cáo hoặc người bị báo cáo.

### Tham số

| Tham số    | Mô tả                                      | Bắt buộc |
| :--------- | :----------------------------------------- | :------- |
| `order`    | Sắp xếp (Mới nhất / Cũ nhất)               | Có       |
| `status`   | Trạng thái (Đang chờ / Đã duyệt / Từ chối) | Không    |
| `reporter` | Lọc theo người báo cáo                     | Không    |
| `reported` | Lọc theo người bị báo cáo                  | Không    |
| `silent`   | Chế độ ẩn danh                             | Không    |

### Ví dụ

> Xem các báo cáo mới nhất đang chờ xử lý

```bash
/report recent order:newest status:pending
```

---

## /report check

**Mô tả:** 🔍 Kiểm tra chi tiết báo cáo

Xem thông tin chi tiết của một phiếu tố cáo cụ thể dựa trên ID của phiếu đó.

### Tham số

| Tham số     | Mô tả               | Bắt buộc |
| :---------- | :------------------ | :------- |
| `report_id` | ID của phiếu tố cáo | Có       |
| `silent`    | Chế độ ẩn danh      | Không    |

### Ví dụ

> Kiểm tra phiếu tố cáo số #10

```bash
/report check report_id:10
```

---

## /report update

**Mô tả:** ⚖️ Xử lý báo cáo (Dành cho Mod/Admin)

Dùng để chấp thuận hoặc từ chối một phiếu tố cáo. Yêu cầu quyền quản lý báo cáo.

### Tham số

| Tham số     | Mô tả                          | Bắt buộc |
| :---------- | :----------------------------- | :------- |
| `action`    | Hành động (Xác nhận / Từ chối) | Có       |
| `report_id` | ID của phiếu tố cáo            | Có       |
| `reason`    | Lý do xử lý                    | Có       |
| `silent`    | Chế độ ẩn danh                 | Không    |

### Ví dụ

> Xác nhận phiếu tố cáo số #5 và ghi lý do

```bash
/report update action:approve report_id:5 reason:Đã xử lý vi phạm
```

---

## /report settings enable

**Mô tả:** ✅ Kích hoạt hệ thống Quick Report

Bật tính năng báo cáo và chọn kênh để nhận thông báo khi có báo cáo mới.

### Tham số

| Tham số           | Mô tả                  | Bắt buộc |
| :---------------- | :--------------------- | :------- |
| `receive_channel` | Kênh nhận phiếu tố cáo | Có       |

### Ví dụ

> Bật tính năng và gửi báo cáo về kênh #report-log

```bash
/report settings enable receive_channel:#report-log
```

---

## /report settings disable

**Mô tả:** ❌ Tắt hệ thống Quick Report

Vô hiệu hóa hoàn toàn tính năng báo cáo trên máy chủ.

### Tham số

Không có tham số.

### Ví dụ

> Tắt hệ thống báo cáo

```bash
/report settings disable
```

---

## /report settings muterole

**Mô tả:** 🔇 Thiết lập Role Mute

Cài đặt Role sẽ được dùng để xử phạt (nếu có tính năng tự động mute).

### Tham số

| Tham số | Mô tả             | Bắt buộc |
| :------ | :---------------- | :------- |
| `role`  | Role dùng để Mute | Có       |

### Ví dụ

> Thiết lập role Mute là @Muted

```bash
/report settings muterole role:@Muted
```

---

## /report settings manager

**Mô tả:** 👮 Thiết lập Role Quản lý

Cài đặt Role có quyền xem, quản lý và xử lý các phiếu tố cáo.

### Tham số

| Tham số | Mô tả        | Bắt buộc |
| :------ | :----------- | :------- |
| `role`  | Role quản lý | Có       |

### Ví dụ

> Thiết lập role quản lý là @Moderator

```bash
/report settings manager role:@Moderator
```

---

## /report settings bypass

**Mô tả:** 🛡️ Thiết lập Role Bypass

Những người có Role này sẽ không thể bị báo cáo (miễn nhiễm).

### Tham số

| Tham số | Mô tả           | Bắt buộc |
| :------ | :-------------- | :------- |
| `role`  | Role miễn nhiễm | Có       |

### Ví dụ

> Thiết lập role Admin không bị báo cáo

```bash
/report settings bypass role:@Admin
```

---

## /report settings blacklist

**Mô tả:** ⛔ Thiết lập Role Blacklist

Những người có Role này sẽ bị cấm sử dụng lệnh báo cáo.

### Tham số

| Tham số | Mô tả       | Bắt buộc |
| :------ | :---------- | :------- |
| `role`  | Role bị cấm | Có       |

### Ví dụ

> Cấm role @BadUser sử dụng lệnh report

```bash
/report settings blacklist role:@BadUser
```

---

## /report settings autoexpire

**Mô tả:** ⏳ Tự động hết hạn báo cáo

Cấu hình thời gian để một phiếu tố cáo tự động hết hiệu lực nếu không được xử lý.

### Tham số

| Tham số | Mô tả                          | Bắt buộc |
| :------ | :----------------------------- | :------- |
| `after` | Số giờ để hết hạn (VD: 24, 48) | Có       |

### Ví dụ

> Tự động hết hạn báo cáo sau 24 giờ

```bash
/report settings autoexpire after:24
```

---

## /report settings concurrent

**Mô tả:** 🔢 Giới hạn báo cáo đồng thời

Đặt giới hạn số lượng báo cáo tối đa mà một người dùng có thể gửi cùng lúc.

### Tham số

| Tham số   | Mô tả           | Bắt buộc |
| :-------- | :-------------- | :------- |
| `maximum` | Số lượng tối đa | Có       |

### Ví dụ

> Mỗi người chỉ được gửi tối đa 3 báo cáo chưa xử lý

```bash
/report settings concurrent maximum:3
```

---

## /report settings successful_message

**Mô tả:** 📨 Tùy chỉnh tin nhắn cảm ơn

Thay đổi nội dung tin nhắn mà Bot sẽ gửi cho người báo cáo sau khi họ gửi thành công.

### Tham số

| Tham số   | Mô tả             | Bắt buộc |
| :-------- | :---------------- | :------- |
| `message` | Nội dung tin nhắn | Có       |

### Ví dụ

> Đặt tin nhắn cảm ơn

```bash
/report settings successful_message message:Cảm ơn bạn đã báo cáo vi phạm! Chúng tôi sẽ xem xét sớm nhất.
```

---

## /report settings auto_delete

**Mô tả:** 🗑️ Tự động xóa báo cáo

Cấu hình để Bot tự động đóng/xóa phiếu tố cáo khi người bị báo cáo đã nhận án phạt (mute, timeout, ban) hoặc rời server.

### Tham số

| Tham số           | Mô tả                         | Bắt buộc |
| :---------------- | :---------------------------- | :------- |
| `on_user_timeout` | Xóa khi người dùng bị Timeout | Không    |
| `on_user_muted`   | Xóa khi người dùng bị Mute    | Không    |
| `on_user_leave`   | Xóa khi người dùng rời Server | Không    |

### Ví dụ

> Tự động xóa báo cáo nếu người dùng bị Timeout hoặc rời server

```bash
/report settings auto_delete on_user_timeout:True on_user_leave:True
```

---

## /report settings channels

**Mô tả:** 📺 Quản lý kênh cho phép báo cáo

Thêm hoặc loại bỏ các kênh khỏi danh sách được phép/bị cấm báo cáo (tùy thuộc vào chế độ Whitelist/Blacklist).

### Tham số

| Tham số   | Mô tả                | Bắt buộc |
| :-------- | :------------------- | :------- |
| `action`  | Hành động (Thêm/Xóa) | Có       |
| `channel` | Chọn kênh            | Có       |

### Ví dụ

> Thêm/xóa kênh vào danh sách blacklist/whitelist.

```bash
/report settings channels action:Add channel:#general
```

---

## /report settings categories

**Mô tả:** Thêm/xóa danh mục vào danh sách blacklist/whitelist.

### Tham số

| Tham số    | Mô tả          | Bắt buộc |
| :--------- | :------------- | :------- |
| `action`   | Hành động.     | Có       |
| `category` | Chọn danh mục. | Có       |

### Ví dụ

> Thêm/xóa danh mục vào danh sách blacklist/whitelist.

```bash
/report settings categories action:Add category:General
```

---

## /report settings mode

**Mô tả:** Chuyển đổi chế độ Quick Report.

### Tham số

| Tham số  | Mô tả   | Bắt buộc |
| :------- | :------ | :------- |
| `action` | Chế độ. | Có       |

### Ví dụ

> Chuyển đổi chế độ Quick Report.

```bash
/report settings mode action:Whitelist
```

---

## /report settings configuration

**Mô tả:** Hiển thị cấu hình Quick Report hiện tại.

### Tham số

Không có tham số.

### Ví dụ

> Hiển thị cấu hình Quick Report hiện tại.

```bash
/report settings configuration
```

---

## /repost tiktok

**Mô tả:** Repost một video từ TikTok.

### Tham số

| Tham số | Mô tả              | Bắt buộc |
| :------ | :----------------- | :------- |
| `url`   | Link video TikTok. | Có       |

### Ví dụ

> Repost một video từ TikTok.

```bash
/repost tiktok url:https://tiktok.com/...
```

---

## /repost youtube

**Mô tả:** Repost một video từ YouTube.

### Tham số

| Tham số | Mô tả               | Bắt buộc |
| :------ | :------------------ | :------- |
| `url`   | Link video YouTube. | Có       |

### Ví dụ

> Repost một video từ YouTube.

```bash
/repost youtube url:https://youtube.com/...
```

---

## /server statics_setup

**Mô tả:** Cài đặt kênh thống kê server.

### Tham số

Không có tham số.

### Ví dụ

> Cài đặt kênh thống kê server.

```bash
/server statics_setup
```

---

## /prefix set

**Mô tả:** Set a custom prefix for this server

### Tham số

| Tham số      | Mô tả                 | Bắt buộc |
| :----------- | :-------------------- | :------- |
| `new_prefix` | The new prefix to set | Có       |

### Ví dụ

> Set a custom prefix for this server

```bash
/prefix set new_prefix:!
```

---

## /prefix reset

**Mô tả:** Reset the prefix to default (k)

### Tham số

Không có tham số.

### Ví dụ

> Reset the prefix to default (k)

```bash
/prefix reset
```

---

## /prefix view

**Mô tả:** View the current prefix

### Tham số

Không có tham số.

### Ví dụ

> View the current prefix

```bash
/prefix view
```

---

## /trackers genshin_impact

**Mô tả:** Theo dõi hồ sơ người chơi Genshin Impact.

### Tham số

| Tham số | Mô tả                              | Bắt buộc |
| :------ | :--------------------------------- | :------- |
| `uid`   | UID của người chơi Genshin Impact. | Có       |

### Ví dụ

> Theo dõi hồ sơ người chơi Genshin Impact.

```bash
/trackers genshin_impact uid:800000000
```

---

## /trackers honkai_star_rail

**Mô tả:** Theo dõi hồ sơ người chơi Honkai: Star Rail.

### Tham số

| Tham số | Mô tả                                 | Bắt buộc |
| :------ | :------------------------------------ | :------- |
| `uid`   | UID của người chơi Honkai: Star Rail. | Có       |

### Ví dụ

> Theo dõi hồ sơ người chơi Honkai: Star Rail.

```bash
/trackers honkai_star_rail uid:800000000
```

---

## /verification setup

**Mô tả:** 🛠️ Cấu hình hệ thống xác minh

Thiết lập hệ thống xác minh (Verify) cho máy chủ. Bạn có thể chọn giữa xác minh bằng Nút bấm đơn giản hoặc Captcha hình ảnh để chống Bot.

**Chế độ xác minh:**

- **Nút bấm (Button):** Người dùng chỉ cần nhấn nút "Xác minh" để nhận Role. Đơn giản và nhanh chóng.
- **Captcha:** Người dùng phải nhập đúng mã hiển thị trên hình ảnh. An toàn hơn trước các Bot tự động.

### Tham số

| Tham số           | Mô tả                                                                   | Bắt buộc |
| :---------------- | :---------------------------------------------------------------------- | :------- |
| `role`            | Role sẽ được trao cho thành viên sau khi xác minh thành công            | Có       |
| `channel`         | Kênh để gửi bảng xác minh (Panel)                                       | Có       |
| `mode`            | Chế độ xác minh (Button / Captcha)                                      | Có       |
| `unverified_role` | Role dành cho người chưa xác minh (sẽ bị thu hồi sau khi xác minh xong) | Không    |

### Ví dụ

> Thiết lập xác minh bằng Captcha tại kênh #verify

```bash
/verification setup role:@Member channel:#verify mode:Captcha
```

> Thiết lập xác minh bằng Nút bấm, có dùng Role chưa xác minh

```bash
/verification setup role:@Member channel:#verify mode:Button unverified_role:@Guest
```

---

## /verification panel

**Mô tả:** 📨 Gửi bảng xác minh

Gửi hoặc cập nhật bảng xác minh (Embed + Nút) vào kênh đã được cấu hình. Bạn cần chạy lệnh `setup` trước. Nếu bảng đã tồn tại, lệnh này sẽ cập nhật lại giao diện mới nhất.

### Tham số

Không có tham số.

### Ví dụ

> Gửi bảng xác minh

```bash
/verification panel
```

---

## /verification info

**Mô tả:** ℹ️ Xem cấu hình xác minh

Hiển thị các cài đặt hiện tại của hệ thống xác minh trên máy chủ (Kênh, Role, Chế độ...).

### Tham số

Không có tham số.

### Ví dụ

> Xem cài đặt xác minh hiện tại

```bash
/verification info
```

---

## /veso bat

**Mô tả:** Bật chức năng vé số (Admin)

### Tham số

Không có tham số.

### Ví dụ

> Bật chức năng vé số (Admin)

```bash
/veso bat
```

---

## /veso tat

**Mô tả:** Tắt chức năng vé số (Admin)

### Tham số

Không có tham số.

### Ví dụ

> Tắt chức năng vé số (Admin)

```bash
/veso tat
```

---

## /veso check

**Mô tả:** Kiểm tra vé số đã mua

### Tham số

Không có tham số.

### Ví dụ

> Kiểm tra vé số đã mua

```bash
/veso check
```

---

## /veso thongbao

**Mô tả:** Xem thông báo người thắng cuộc hôm nay

### Tham số

Không có tham số.

### Ví dụ

> Xem thông báo người thắng cuộc hôm nay

```bash
/veso thongbao
```

---

## /veso setup

**Mô tả:** Setup kênh thông báo (Admin)

### Tham số

| Tham số   | Mô tả                           | Bắt buộc |
| :-------- | :------------------------------ | :------- |
| `channel` | Kênh để thông báo kết quả vé số | Có       |

### Ví dụ

> Setup kênh thông báo (Admin)

```bash
/veso setup channel:#veso
```

---

## /tempvoice setup

**Mô tả:** ⚙️ Cài đặt hệ thống VoiceMaster (Dành cho Owner)

Lệnh này sẽ khởi tạo hệ thống Voice Channel tạm thời cho máy chủ. Bot sẽ tạo một Category "Voice Channels" và một kênh "➕ Join to Create". Khi thành viên tham gia kênh này, họ sẽ được tự động chuyển sang một kênh riêng tư mới do họ làm chủ.

### Tham số

Không có tham số.

### Ví dụ

> Khởi tạo hệ thống

```bash
/tempvoice setup
```

---

## /tempvoice name

**Mô tả:** ✏️ Đổi tên phòng

Cho phép chủ phòng thay đổi tên kênh voice hiện tại của mình.
_Lưu ý: Discord giới hạn tốc độ đổi tên kênh (2 lần mỗi 10 phút)._

### Tham số

| Tham số | Mô tả             | Bắt buộc |
| :------ | :---------------- | :------- |
| `name`  | Tên mới cho phòng | Có       |

### Ví dụ

> Đổi tên phòng thành "Phòng họp kín"

```bash
/tempvoice name name:Phòng họp kín
```

---

## /tempvoice limit

**Mô tả:** 👥 Giới hạn số lượng thành viên

Đặt giới hạn số người tối đa có thể tham gia vào kênh của bạn. Đặt là 0 để không giới hạn.

### Tham số

| Tham số  | Mô tả                  | Bắt buộc |
| :------- | :--------------------- | :------- |
| `number` | Số người tối đa (0-99) | Có       |

### Ví dụ

> Giới hạn phòng chỉ cho 5 người

```bash
/tempvoice limit number:5
```

---

## /tempvoice lock

**Mô tả:** 🔒 Khóa phòng

Khóa kênh voice của bạn lại, không cho phép ai khác tham gia (trừ những người đã được cấp quyền `permit`).

### Tham số

Không có tham số.

### Ví dụ

> Khóa phòng lại

```bash
/tempvoice lock
```

---

## /tempvoice unlock

**Mô tả:** 🔓 Mở khóa phòng

Mở khóa kênh voice, cho phép mọi người tham gia trở lại.

### Tham số

Không có tham số.

### Ví dụ

> Mở khóa phòng

```bash
/tempvoice unlock
```

---

## /tempvoice permit

**Mô tả:** ✅ Cấp quyền tham gia

Cho phép một thành viên cụ thể tham gia vào phòng của bạn ngay cả khi phòng đang bị khóa (`lock`).

### Tham số

| Tham số | Mô tả                | Bắt buộc |
| :------ | :------------------- | :------- |
| `user`  | Người được cấp quyền | Có       |

### Ví dụ

> Cho phép @Neko vào phòng

```bash
/tempvoice permit user:@Neko
```

---

## /tempvoice reject

**Mô tả:** ❌ Đuổi thành viên

Đuổi một thành viên ra khỏi phòng và chặn họ tham gia lại.

### Tham số

| Tham số | Mô tả         | Bắt buộc |
| :------ | :------------ | :------- |
| `user`  | Người bị đuổi | Có       |

### Ví dụ

> Đuổi @Spammer ra khỏi phòng

```bash
/tempvoice reject user:@Spammer
```

---

## /tempvoice claim

**Mô tả:** 👑 Nhận quyền chủ phòng

Nếu chủ phòng hiện tại rời đi, bạn có thể dùng lệnh này để nhận quyền quản lý kênh.

### Tham số

Không có tham số.

### Ví dụ

> Nhận quyền chủ phòng

```bash
/tempvoice claim
```

---

## /tempvoice setlimit

**Mô tả:** ⚙️ Cài đặt giới hạn mặc định (Dành cho Owner)

Thiết lập giới hạn số người mặc định cho tất cả các phòng được tạo mới trên máy chủ.

### Tham số

| Tham số  | Mô tả                    | Bắt buộc |
| :------- | :----------------------- | :------- |
| `number` | Số người mặc định (0-99) | Có       |

### Ví dụ

> Đặt giới hạn mặc định là 10 người

```bash
/tempvoice setlimit number:10
```

---

## /tempvoice name

**Mô tả:** ✏️ Đổi tên voice channel của bạn

### Tham số

| Tham số | Mô tả                     | Bắt buộc |
| :------ | :------------------------ | :------- |
| `name`  | Tên mới cho voice channel | Có       |

### Ví dụ

> ✏️ Đổi tên voice channel của bạn

```bash
/tempvoice name name:MyChannel
```

---

## /tempvoice limit

**Mô tả:** 👥 Đặt giới hạn số người trong voice channel

### Tham số

| Tham số  | Mô tả                                | Bắt buộc |
| :------- | :----------------------------------- | :------- |
| `number` | Số người tối đa (0 = không giới hạn) | Có       |

### Ví dụ

> 👥 Đặt giới hạn số người trong voice channel

```bash
/tempvoice limit number:5
```

---

## /tempvoice permit

**Mô tả:** ✅ Cho phép người dùng vào voice channel của bạn

### Tham số

| Tham số | Mô tả                    | Bắt buộc |
| :------ | :----------------------- | :------- |
| `user`  | Người dùng được phép vào | Có       |

### Ví dụ

> ✅ Cho phép người dùng vào voice channel của bạn

```bash
/tempvoice permit user:@User
```

---

## /tempvoice reject

**Mô tả:** ❌ Từ chối và kick người dùng khỏi voice channel

### Tham số

| Tham số | Mô tả                 | Bắt buộc |
| :------ | :-------------------- | :------- |
| `user`  | Người dùng bị từ chối | Có       |

### Ví dụ

> ❌ Từ chối và kick người dùng khỏi voice channel

```bash
/tempvoice reject user:@User
```

---

## /tempvoice claim

**Mô tả:** 👑 Nhận quyền sở hữu channel khi owner rời đi

### Tham số

Không có tham số.

### Ví dụ

> 👑 Nhận quyền sở hữu channel khi owner rời đi

```bash
/tempvoice claim
```

---

## /tempvoice setlimit

**Mô tả:** ⚙️ Đặt giới hạn mặc định cho server (chỉ owner)

### Tham số

| Tham số  | Mô tả                                         | Bắt buộc |
| :------- | :-------------------------------------------- | :------- |
| `number` | Số người tối đa mặc định (0 = không giới hạn) | Có       |

### Ví dụ

> ⚙️ Đặt giới hạn mặc định cho server (chỉ owner)

```bash
/tempvoice setlimit number:0
```

---

## /minigames 2048

**Mô tả:** 🔢 Game xếp số 2048

Trò chơi trí tuệ kinh điển. Sử dụng các nút điều hướng để gộp các ô số giống nhau lại (2+2=4, 4+4=8...) nhằm tạo ra ô số 2048.

### Tham số

Không có tham số.

### Ví dụ

> Bắt đầu chơi 2048

```bash
/minigames 2048
```

---

## /minigames connectfour

**Mô tả:** 🔴 Cờ Connect Four (Cờ 4 nước)

Trò chơi đối kháng dành cho 2 người. Nhiệm vụ của bạn là thả các quân cờ vào bàn sao cho tạo thành một hàng 4 quân liên tiếp (ngang, dọc, hoặc chéo) trước đối thủ.

### Tham số

| Tham số    | Mô tả              | Bắt buộc |
| :--------- | :----------------- | :------- |
| `opponent` | Người chơi đối thủ | Có       |

### Ví dụ

> Thách đấu Connect Four với @Neko

```bash
/minigames connectfour opponent:@Neko
```

---

## /minigames guess

**Mô tả:** ❓ Đoán số bí ẩn

Bot sẽ chọn ngẫu nhiên một con số từ 1 đến 100. Nhiệm vụ của bạn là đoán chính xác con số đó dựa trên các gợi ý "Cao quá" hoặc "Thấp quá" của Bot.

### Tham số

Không có tham số.

### Ví dụ

> Bắt đầu trò chơi đoán số

```bash
/minigames guess
```

---

## /minigames hangman

**Mô tả:** 😵 Người treo cổ (Hangman)

Trò chơi đoán từ vựng tiếng Anh. Bạn phải đoán từng chữ cái để tìm ra từ bí ẩn trước khi hình người bị treo cổ hoàn thiện.

### Tham số

Không có tham số.

### Ví dụ

> Bắt đầu chơi Hangman

```bash
/minigames hangman
```

---

## /minigames rps

**Mô tả:** ✌️ Kéo Búa Bao

Trò chơi dân gian quen thuộc. Bạn sẽ đấu với Bot bằng cách chọn Kéo, Búa hoặc Bao.
_Quy tắc: Búa thắng Kéo, Kéo thắng Bao, Bao thắng Búa._

### Tham số

Không có tham số.

### Ví dụ

> Chơi Kéo Búa Bao với Bot

```bash
/minigames rps
```

---

## /minigames tictactoe

**Mô tả:** ❌ Cờ Ca-rô (Tic Tac Toe)

Trò chơi X/O kinh điển cho 2 người. Người chơi thay phiên nhau đánh dấu X hoặc O vào ô trống. Người đầu tiên tạo được hàng 3 ô liên tiếp (ngang, dọc, chéo) sẽ thắng.

### Tham số

| Tham số    | Mô tả              | Bắt buộc |
| :--------- | :----------------- | :------- |
| `opponent` | Người chơi đối thủ | Có       |

### Ví dụ

> Thách đấu Cờ Ca-rô với @Neko

```bash
/minigames tictactoe opponent:@Neko
```

---

## /minigames wordle

**Mô tả:** 🔤 Đoán từ Wordle

Trò chơi đoán từ vựng 5 chữ cái nổi tiếng. Bạn có 6 lượt thử. Sau mỗi lần đoán, màu sắc của các chữ cái sẽ thay đổi để gợi ý cho bạn (Xanh: đúng vị trí, Vàng: đúng chữ nhưng sai vị trí, Xám: không có trong từ).

### Tham số

Không có tham số.

### Ví dụ

> Bắt đầu chơi Wordle

```bash
/minigames wordle
```

---

## /say send

**Mô tả:** Gửi một tin nhắn mới

### Tham số

| Tham số      | Mô tả                              | Bắt buộc |
| :----------- | :--------------------------------- | :------- |
| `message`    | Tin nhắn để gửi                    | Có       |
| `attachment` | Thêm một tệp đính kèm vào tin nhắn | Không    |

### Ví dụ

> Gửi một tin nhắn mới

```bash
/say send message:Hello
```

---

## /say edit

**Mô tả:** Chỉnh sửa một tin nhắn trước đó của bot

### Tham số

| Tham số      | Mô tả                        | Bắt buộc |
| :----------- | :--------------------------- | :------- |
| `message_id` | ID của tin nhắn để chỉnh sửa | Có       |

### Ví dụ

> Chỉnh sửa một tin nhắn trước đó của bot

```bash
/say edit message_id:12345
```

---

## /bank deposit

**Mô tả:** Gửi Xu vào ngân hàng

### Tham số

| Tham số  | Mô tả    | Bắt buộc |
| :------- | :------- | :------- |
| `amount` | Số lượng | Có       |

### Ví dụ

> Gửi Xu vào ngân hàng

```bash
/bank deposit amount:100
```

---

## /bank withdraw

**Mô tả:** Rút Xu khỏi ngân hàng

### Tham số

| Tham số  | Mô tả    | Bắt buộc |
| :------- | :------- | :------- |
| `amount` | Số lượng | Có       |

### Ví dụ

> Rút Xu khỏi ngân hàng

```bash
/bank withdraw amount:100
```

---

## /bank transfer

**Mô tả:** Chuyển khoản cho người khác

### Tham số

| Tham số  | Mô tả      | Bắt buộc |
| :------- | :--------- | :------- |
| `user`   | Người nhận | Có       |
| `amount` | Số lượng   | Có       |

### Ví dụ

> Chuyển khoản cho người khác

```bash
/bank transfer user:@User amount:100
```

---

## /fun 8ball

**Mô tả:** 🎱 Cầu Băng Tiên Tri

Hỏi Bot bất kỳ câu hỏi "Có/Không" nào và nhận câu trả lời ngẫu nhiên từ Cầu Băng huyền bí.

### Tham số

| Tham số    | Mô tả   | Bắt buộc |
| :--------- | :------ | :------- |
| `question` | Câu hỏi | Có       |

### Ví dụ

> Hỏi Bot xem hôm nay có nên đi chơi không

```bash
/fun 8ball question:Hôm nay mình có nên đi chơi không?
```

---

## /fun advice

**Mô tả:** 💡 Lời khuyên cuộc sống

Nhận một lời khuyên ngẫu nhiên (và đôi khi cực kỳ hữu ích) từ Bot.

### Tham số

Không có tham số.

### Ví dụ

> Xin một lời khuyên

```bash
/fun advice
```

---

## /fun compliment

**Mô tả:** 💖 Gửi lời khen

Gửi một lời khen ngẫu nhiên và ngọt ngào đến một người dùng khác để làm họ vui.

### Tham số

| Tham số | Mô tả      | Bắt buộc |
| :------ | :--------- | :------- |
| `user`  | Người nhận | Có       |

### Ví dụ

> Khen ngợi bạn @Neko

```bash
/fun compliment user:@Neko
```

---

## /fun darkjoke

**Mô tả:** 🌑 Hài kịch đen

Kể một câu chuyện cười "đen tối" (Dark Joke). Cân nhắc trước khi sử dụng nếu bạn là người nghiêm túc!

### Tham số

Không có tham số.

### Ví dụ

> Nghe chuyện cười đen tối

```bash
/fun darkjoke
```

---

## /fun fact

**Mô tả:** 🧠 Sự thật thú vị

Khám phá những sự thật ngẫu nhiên về thế giới xung quanh.

**Các chủ đề:**

- `cat`: Sự thật về loài Mèo 🐱
- `dog`: Sự thật về loài Chó 🐶
- `general`: Kiến thức chung 🌏
- `useless`: Những sự thật... vô dụng 🤪

### Tham số

| Tham số      | Mô tả          | Bắt buộc |
| :----------- | :------------- | :------- |
| `subcommand` | Chủ đề sự thật | Có       |

### Ví dụ

> Xem sự thật về mèo

```bash
/fun fact cat
```

---

## /fun fliptext

**Mô tả:** 🙃 Lật ngược văn bản

Biến văn bản của bạn lộn ngược 180 độ.

### Tham số

| Tham số | Mô tả           | Bắt buộc |
| :------ | :-------------- | :------- |
| `text`  | Văn bản cần lật | Có       |

### Ví dụ

> Lật ngược chữ "Hello World"

```bash
/fun fliptext text:Hello World
```

---

## /fun lennyface

**Mô tả:** ( ͡° ͜ʖ ͡°)

Gửi biểu tượng cảm xúc Lenny Face ngẫu nhiên vào kênh chat.

### Tham số

Không có tham số.

### Ví dụ

> Gửi Lenny Face

```bash
/fun lennyface
```

---

## /fun meme random

**Mô tả:** 🐸 Meme ngẫu nhiên

Xem một chiếc Meme ngẫu nhiên được lấy từ Reddit.

### Tham số

Không có tham số.

### Ví dụ

> Xem Meme

```bash
/fun meme random
```

---

## /fun meme text

**Mô tả:** 📝 Chế Meme

Tự tạo Meme của riêng bạn dựa trên các mẫu có sẵn.

### Tham số

| Tham số       | Mô tả         | Bắt buộc |
| :------------ | :------------ | :------- |
| `template`    | Chọn mẫu Meme | Có       |
| `top_text`    | Chữ dòng trên | Có       |
| `bottom_text` | Chữ dòng dưới | Không    |

### Ví dụ

> Chế Meme với mẫu "aag" (Aliens Guy)

```bash
/fun meme text template:aag top_text:Không phải Bot bottom_text:Là người ngoài hành tinh
```

---

## /fun meme sadcat

**Mô tả:** 😿 Mèo khóc (Sad Cat)

Chế ảnh mèo khóc với văn bản tùy chỉnh.

### Tham số

| Tham số | Mô tả            | Bắt buộc |
| :------ | :--------------- | :------- |
| `text`  | Nội dung văn bản | Có       |

### Ví dụ

> Mèo khóc vì "Hết tiền"

```bash
/fun meme sadcat text:Hết tiền rồi sen ơi
```

---

## /fun pickupline

**Mô tả:** 💘 Bí kíp thả thính

Nhận một câu "thả thính" (pick-up line) tiếng Anh sến súa (nhưng có thể hiệu quả).

### Tham số

Không có tham số.

### Ví dụ

> Xin một câu thả thính

```bash
/fun pickupline
```

---

## /fun quote

**Mô tả:** 📜 Danh ngôn

Nhận một câu danh ngôn ngẫu nhiên từ những người nổi tiếng (hoặc từ dữ liệu Bot).

### Tham số

Không có tham số.

### Ví dụ

> Xem danh ngôn

```bash
/fun quote
```

---

## /fun rizz

**Mô tả:** 😉 Rizz (Thả thính siêu cấp)

Gửi một câu thả thính kèm theo hình ảnh GIF ngẫu nhiên tới người dùng khác. 100% sát thương!

### Tham số

| Tham số | Mô tả               | Bắt buộc |
| :------ | :------------------ | :------- |
| `user`  | Người nhận tin nhắn | Có       |

### Ví dụ

> Thả thính @Crush

```bash
/fun rizz user:@Crush
```

---

## /fun roast

**Mô tả:** 🔥 Cà khịa (Roast)

Bot sẽ "phun châu nhả ngọc" (cà khịa/chửi yêu) người dùng được chỉ định.

### Tham số

| Tham số  | Mô tả    | Bắt buộc |
| :------- | :------- | :------- |
| `target` | Nạn nhân | Có       |

### Ví dụ

> Cà khịa @BạnThân

```bash
/fun roast target:@BạnThân
```

---

## /fun kill

**Mô tả:** 🔪 Giả lập... ám sát

Tạo một kịch bản hài hước về việc bạn "xử lý" người dùng khác kèm hình ảnh minh họa (Minecraft/GTA style).

### Tham số

| Tham số  | Mô tả    | Bắt buộc |
| :------- | :------- | :------- |
| `target` | Nạn nhân | Có       |

### Ví dụ

> Xử lý @KẻThù

```bash
/fun kill target:@KẻThù
```

---

## /giveaway create

**Mô tả:** 🎉 Tổ chức Giveaway

Bắt đầu một sự kiện Giveaway chuyên nghiệp với nhiều tùy chọn nâng cao. Bạn có thể thiết lập các điều kiện tham gia khắt khe như ngày tham gia server, tuổi tài khoản, vai trò được phép/bị cấm, số tin nhắn, số lượt mời, v.v.

### Tham số

| Tham số                | Mô tả                                                                        | Bắt buộc |
| :--------------------- | :--------------------------------------------------------------------------- | :------- |
| `channel`              | Kênh tổ chức Giveaway                                                        | Có       |
| `time`                 | Thời gian diễn ra (vd: `1h` = 1 giờ, `30m` = 30 phút, `1d` = 1 ngày)         | Có       |
| `winners`              | Số lượng người thắng giải                                                    | Có       |
| `prize`                | Tên phần thưởng                                                              | Có       |
| `hostedby`             | Người tổ chức (tag @User)                                                    | Có       |
| `min_server_join_date` | Yêu cầu ngày vào server tối thiểu (vd: "January 1 2023")                     | Không    |
| `min_account_age`      | Yêu cầu ngày tạo tài khoản tối thiểu (vd: "January 1 2023")                  | Không    |
| `min_invites`          | Số lượt mời thành viên tối thiểu cần có                                      | Không    |
| `min_messages`         | Số tin nhắn tối thiểu cần có                                                 | Không    |
| `whitelist_roles`      | Chỉ các vai trò này mới được tham gia (tag @Role)                            | Không    |
| `blacklist_roles`      | Các vai trò này bị cấm tham gia (tag @Role)                                  | Không    |
| `extra_entries`        | Thêm lượt quay cho vai trò nhất định (cú pháp: `@role:2` - role được 2 lượt) | Không    |
| `notify`               | Tag ai khi bắt đầu? (`Everyone`, `Whitelist Roles`, `Nobody`)                | Không    |

### Ví dụ

> Tạo Giveaway Nitro 1 tháng trong 24h cho 1 người thắng

```bash
/giveaway create channel:#giveaways time:24h winners:1 prize:Nitro Basic hostedby:@Neko
```

> Tạo Giveaway nâng cao yêu cầu role @Member và cấm role @Muted

```bash
/giveaway create channel:#sự-kiện time:1d winners:3 prize:100k Xu hostedby:@Admin whitelist_roles:@Member blacklist_roles:@Muted
```

---

## /giveaway reroll

**Mô tả:** 🔄 Quay thưởng lại (Reroll)

Chọn lại người chiến thắng mới cho một Giveaway đã kết thúc. Hữu ích khi người thắng cũ không hợp lệ hoặc không nhận giải.

### Tham số

| Tham số       | Mô tả                                                                      | Bắt buộc |
| :------------ | :------------------------------------------------------------------------- | :------- |
| `giveaway_id` | ID của Giveaway (Xem dưới chân tin nhắn Giveaway)                          | Có       |
| `users`       | Chỉ định người thắng cụ thể (nếu muốn dàn xếp 😂 - đùa thôi, dùng để test) | Không    |

### Ví dụ

> Chọn người thắng mới cho Giveaway có ID `abc123yz`

```bash
/giveaway reroll giveaway_id:abc123yz
```

---

## /giveaway end

**Mô tả:** ⏹️ Kết thúc Giveaway sớm

Dừng Giveaway ngay lập tức và chọn người chiến thắng, không cần đợi hết thời gian đếm ngược.

### Tham số

| Tham số       | Mô tả                                             | Bắt buộc |
| :------------ | :------------------------------------------------ | :------- |
| `giveaway_id` | ID của Giveaway (Xem dưới chân tin nhắn Giveaway) | Có       |

### Ví dụ

> Kết thúc ngay Giveaway `abc123yz`

```bash
/giveaway end giveaway_id:abc123yz
```

---

## /reminder create

**Mô tả:** Đặt một lời nhắc mới

### Tham số

| Tham số   | Mô tả                    | Bắt buộc |
| :-------- | :----------------------- | :------- |
| `message` | Nội dung cần nhắc nhở    | Có       |
| `time`    | Thời gian (vd: 10m, 1h)  | Có       |
| `user`    | Người dùng cần được nhắc | Không    |

### Ví dụ

> Đặt một lời nhắc mới

```bash
/reminder create message:Uống nước time:1h
```

---

## /reminder list

**Mô tả:** Liệt kê các lời nhắc đang hoạt động của bạn

### Tham số

Không có tham số.

### Ví dụ

> Liệt kê các lời nhắc đang hoạt động của bạn

```bash
/reminder list
```

---

## /snipe message

**Mô tả:** 🕵️ Soi tin nhắn đã xóa

Xem lại nội dung tin nhắn gần nhất vừa bị xóa trong kênh hiện tại.
_Lưu ý: Chỉ xem được tin nhắn bị xóa trong lúc bot đang hoạt động và người gửi chưa tắt tính năng snipe._

### Tham số

Không có tham số.

### Ví dụ

> Xem tin nhắn vừa bị xóa

```bash
/snipe message
```

---

## /snipe edited

**Mô tả:** 📝 Soi tin nhắn đã sửa

Xem lại nội dung gốc của tin nhắn gần nhất vừa được chỉnh sửa trong kênh.

### Tham số

Không có tham số.

### Ví dụ

> Xem nội dung trước khi sửa

```bash
/snipe edited
```

---

## /snipe clear

**Mô tả:** 🧹 Xóa lịch sử Snipe (Admin)

Xóa toàn bộ dữ liệu tin nhắn đã lưu (xóa và sửa) trong kênh hiện tại. Dùng để bảo mật thông tin nếu cần.

### Tham số

Không có tham số.

### Ví dụ

> Xóa bộ nhớ đệm snipe của kênh này

```bash
/snipe clear
```

---

## /snipe on

**Mô tả:** ✅ Bật cho phép Snipe

Cho phép bot ghi lại tin nhắn đã xóa/sửa của BẠN. Khi bạn xóa hoặc sửa tin nhắn, người khác có thể dùng lệnh `/snipe` để xem lại.

### Tham số

Không có tham số.

### Ví dụ

> Bật tính năng cho phép snipe

```bash
/snipe on
```

---

## /snipe off

**Mô tả:** ❌ Tắt cho phép Snipe

Không cho phép bot ghi lại tin nhắn của BẠN. Khi bạn bật chế độ này, tin nhắn bạn xóa hoặc sửa sẽ KHÔNG THỂ bị người khác soi được bằng lệnh `/snipe`.

### Tham số

Không có tham số.

### Ví dụ

> Tắt tính năng cho phép snipe (Bảo mật riêng tư)

```bash
/snipe off
```

---

## /suggestion create

**Mô tả:** Tạo một đề xuất mới

### Tham số

| Tham số | Mô tả                                   | Bắt buộc |
| :------ | :-------------------------------------- | :------- |
| `text`  | Nội dung đề xuất (nếu không dùng modal) | Có       |

### Ví dụ

> Tạo một đề xuất mới

```bash
/suggestion create text:Thêm emoji mới
```

---

## /suggestion accept

**Mô tả:** Chấp nhận một đề xuất

### Tham số

| Tham số  | Mô tả           | Bắt buộc |
| :------- | :-------------- | :------- |
| `id`     | ID của đề xuất  | Có       |
| `reason` | Lý do chấp nhận | Không    |

### Ví dụ

> Chấp nhận một đề xuất

```bash
/suggestion accept id:123 reason:Hay
```

---

## /suggestion deny

**Mô tả:** Từ chối một đề xuất

### Tham số

| Tham số  | Mô tả          | Bắt buộc |
| :------- | :------------- | :------- |
| `id`     | ID của đề xuất | Có       |
| `reason` | Lý do từ chối  | Không    |

### Ví dụ

> Từ chối một đề xuất

```bash
/suggestion deny id:123 reason:Spam
```

---

## /suggestion blacklist add

**Mô tả:** Thêm người dùng vào danh sách đen

### Tham số

| Tham số | Mô tả                                | Bắt buộc |
| :------ | :----------------------------------- | :------- |
| `user`  | Người dùng cần đưa vào danh sách đen | Có       |

### Ví dụ

> Thêm người dùng vào danh sách đen

```bash
/suggestion blacklist add user:@User
```

---

## /suggestion blacklist remove

**Mô tả:** Xóa người dùng khỏi danh sách đen

### Tham số

| Tham số | Mô tả                                 | Bắt buộc |
| :------ | :------------------------------------ | :------- |
| `user`  | Người dùng cần xóa khỏi danh sách đen | Có       |

### Ví dụ

> Xóa người dùng khỏi danh sách đen

```bash
/suggestion blacklist remove user:@User
```

---

## /leaderboard balance

**Mô tả:** Xem những người dùng có số dư cao nhất

### Tham số

| Tham số | Mô tả            | Bắt buộc |
| :------ | :--------------- | :------- |
| `page`  | Số trang cần xem | Không    |

### Ví dụ

> Xem những người dùng có số dư cao nhất

```bash
/leaderboard balance
```

---

## /leaderboard levels

**Mô tả:** Xem bảng xếp hạng cấp độ

### Tham số

| Tham số | Mô tả            | Bắt buộc |
| :------ | :--------------- | :------- |
| `page`  | Số trang cần xem | Không    |

### Ví dụ

> Xem bảng xếp hạng cấp độ

```bash
/leaderboard levels
```

---

## /leaderboard messages

**Mô tả:** Xem người dùng nhắn tin nhiều nhất

### Tham số

| Tham số | Mô tả            | Bắt buộc |
| :------ | :--------------- | :------- |
| `page`  | Số trang cần xem | Không    |

### Ví dụ

> Xem người dùng nhắn tin nhiều nhất

```bash
/leaderboard messages
```

---

## /leaderboard invites

**Mô tả:** Xem những người dùng mời nhiều nhất

### Tham số

| Tham số | Mô tả            | Bắt buộc |
| :------ | :--------------- | :------- |
| `page`  | Số trang cần xem | Không    |

### Ví dụ

> Xem những người dùng mời nhiều nhất

```bash
/leaderboard invites
```

---

## /leaderboard cauca

**Mô tả:** Xem bảng xếp hạng những người câu cá hàng đầu

### Tham số

| Tham số | Mô tả            | Bắt buộc |
| :------ | :--------------- | :------- |
| `page`  | Số trang cần xem | Không    |

### Ví dụ

> Xem bảng xếp hạng những người câu cá hàng đầu

```bash
/leaderboard cauca
```

---

## /level give

**Mô tả:** ➕ Tăng Cấp độ/XP (Admin)

Cộng thêm một lượng XP hoặc cấp độ cho người dùng.

### Tham số

| Tham số  | Mô tả                             | Bắt buộc |
| :------- | :-------------------------------- | :------- |
| `user`   | Người được nhận                   | Có       |
| `type`   | Loại cần tăng (`xp` hoặc `level`) | Có       |
| `amount` | Số lượng cần tăng                 | Có       |

### Ví dụ

> Tặng 1000 XP cho @Member

```bash
/level give user:@Member type:xp amount:1000
```

---

## /level remove

**Mô tả:** ➖ Trừ Cấp độ/XP (Admin)

Trừ bớt một lượng XP hoặc cấp độ của người dùng (dùng để phạt hoặc sửa lỗi).

### Tham số

| Tham số  | Mô tả                            | Bắt buộc |
| :------- | :------------------------------- | :------- |
| `user`   | Người bị trừ                     | Có       |
| `type`   | Loại cần trừ (`xp` hoặc `level`) | Có       |
| `amount` | Số lượng cần trừ                 | Có       |

### Ví dụ

> Trừ 5 cấp độ của @Spammer

```bash
/level remove user:@Spammer type:level amount:5
```

---

## /level set

**Mô tả:** ✏️ Thiết lập Cấp độ/XP (Admin)

Đặt trực tiếp cấp độ hoặc XP của người dùng thành một số cụ thể.

### Tham số

| Tham số  | Mô tả                            | Bắt buộc |
| :------- | :------------------------------- | :------- |
| `user`   | Người dùng                       | Có       |
| `type`   | Loại cần đặt (`xp` hoặc `level`) | Có       |
| `amount` | Giá trị mới                      | Có       |

### Ví dụ

> Đặt @Vip thành Level 100 ngay lập tức

```bash
/level set user:@Vip type:level amount:100
```

---

## /level check

**Mô tả:** 📊 Kiểm tra Cấp độ

Xem thông tin chi tiết về cấp độ, XP hiện tại, và hạng danh vọng (Prestige) của bản thân hoặc người khác.

### Tham số

| Tham số | Mô tả                                            | Bắt buộc |
| :------ | :----------------------------------------------- | :------- |
| `user`  | Người dùng cần xem (để trống nếu xem chính mình) | Không    |

### Ví dụ

> Xem cấp độ của chính mình

```bash
/level check
```

> Soi cấp độ của @Neko

```bash
/level check user:@Neko
```

---

## /level reset

**Mô tả:** 🔄 Reset toàn bộ hệ thống (Admin)

Đặt lại cấp độ hoặc XP của **TẤT CẢ** người dùng trong server về 0. Hãy cẩn thận!

### Tham số

| Tham số | Mô tả                                                | Bắt buộc |
| :------ | :--------------------------------------------------- | :------- |
| `type`  | Loại cần reset (`xp`, `level`, hoặc `both` - cả hai) | Có       |

### Ví dụ

> Reset toàn bộ XP của server (giữ nguyên level)

```bash
/level reset type:xp
```

---

## /level prestige

**Mô tả:** 👑 Nâng hạng Danh Vọng (Prestige)

Khi đạt cấp độ tối đa (Level 50), bạn có thể "Prestige" để reset cấp độ về 1 nhưng nhận được huy hiệu danh vọng mới cực ngầu.

### Tham số

Không có tham số.

### Ví dụ

> Reset cấp độ để nâng hạng danh vọng

```bash
/level prestige
```

---

## /music play

**Mô tả:** Play music from YouTube/Spotify/SoundCloud

### Tham số

| Tham số | Mô tả                     | Bắt buộc |
| :------ | :------------------------ | :------- |
| `query` | Song name, Artist, or URL | Có       |

### Ví dụ

> Play music

```bash
/music play query:Never Gonna Give You Up
```

---

## /music search

**Mô tả:** Search and select music

### Tham số

| Tham số | Mô tả        | Bắt buộc |
| :------ | :----------- | :------- |
| `query` | Search query | Có       |

### Ví dụ

> Search music

```bash
/music search query:Faded
```

---

## /music skip

**Mô tả:** Skip current song

### Tham số

Không có tham số.

### Ví dụ

> Skip current song

```bash
/music skip
```

---

## /music stop

**Mô tả:** Stop playing and clear queue

### Tham số

Không có tham số.

### Ví dụ

> Stop playing

```bash
/music stop
```

---

## /music pause

**Mô tả:** Pause playback

### Tham số

Không có tham số.

### Ví dụ

> Pause playback

```bash
/music pause
```

---

## /music resume

**Mô tả:** Resume playback

### Tham số

Không có tham số.

### Ví dụ

> Resume playback

```bash
/music resume
```

---

## /music queue

**Mô tả:** Show current queue

### Tham số

Không có tham số.

### Ví dụ

> Show current queue

```bash
/music queue
```

---

## /music volume

**Mô tả:** Change volume

### Tham số

| Tham số  | Mô tả            | Bắt buộc |
| :------- | :--------------- | :------- |
| `amount` | Volume % (1-100) | Có       |

### Ví dụ

> Change volume to 50%

```bash
/music volume amount:50
```

---

## /music loop

**Mô tả:** Set loop mode

### Tham số

| Tham số | Mô tả                       | Bắt buộc |
| :------ | :-------------------------- | :------- |
| `mode`  | Loop mode (off/track/queue) | Có       |

### Ví dụ

> Loop queue

```bash
/music loop mode:queue
```

---

## /music shuffle

**Mô tả:** Shuffle the queue

### Tham số

Không có tham số.

### Ví dụ

> Shuffle queue

```bash
/music shuffle
```

---

## /music nowplaying

**Mô tả:** Show current song info

### Tham số

Không có tham số.

### Ví dụ

> Show current song info

```bash
/music nowplaying
```

---

## /music autoplay

**Mô tả:** Toggle autoplay

### Tham số

Không có tham số.

### Ví dụ

> Toggle autoplay

```bash
/music autoplay
```

---

## /music lyrics

**Mô tả:** Get song lyrics

### Tham số

| Tham số | Mô tả     | Bắt buộc |
| :------ | :-------- | :------- |
| `query` | Song name | Không    |

### Ví dụ

> Get lyrics

```bash
/music lyrics query:Faded
```

---

## /autoreact add

**Mô tả:** ➕ Thêm tự động thả cảm xúc

Cấu hình bot tự động thả biểu tượng cảm xúc (reaction) vào tin nhắn của người dùng khi tin nhắn đó chứa từ khóa nhất định.

### Tham số

| Tham số   | Mô tả                                                  | Bắt buộc |
| :-------- | :----------------------------------------------------- | :------- |
| `keyword` | Từ khóa cần bắt (vd: `hello`)                          | Có       |
| `emoji`   | Biểu tượng cảm xúc sẽ thả (vd: `👋` hoặc Custom Emoji) | Có       |

### Ví dụ

> Tự động thả 👋 khi ai đó nhắn "xin chào"

```bash
/autoreact add keyword:xin chào emoji:👋
```

> Tự động thả tim khi nhắc đến "crush"

```bash
/autoreact add keyword:crush emoji:❤️
```

---

## /autoreact remove

**Mô tả:** ➖ Xóa tự động thả cảm xúc

Xóa một cấu hình AutoReact đã tạo.

### Tham số

| Tham số      | Mô tả                                 | Bắt buộc |
| :----------- | :------------------------------------ | :------- |
| `identifier` | Từ khóa hoặc ID của AutoReact cần xóa | Có       |

### Ví dụ

> Xóa AutoReact cho từ khóa "xin chào"

```bash
/autoreact remove identifier:xin chào
```

> Xóa AutoReact có ID là 5

```bash
/autoreact remove identifier:5
```

---

## /autoreact list

**Mô tả:** 📋 Danh sách AutoReact

Xem tất cả các từ khóa và biểu tượng cảm xúc đang được cấu hình tự động thả cảm xúc trong server.

### Tham số

Không có tham số.

### Ví dụ

> Xem danh sách các AutoReact đang hoạt động

```bash
/autoreact list
```

---

## /backup create

**Mô tả:** Create a backup of the server

### Tham số

Không có tham số.

### Ví dụ

> Create a backup of the server

```bash
/backup create
```

---

## /backup delete

**Mô tả:** Delete a backup

### Tham số

| Tham số | Mô tả         | Bắt buộc |
| :------ | :------------ | :------- |
| `id`    | The backup ID | Có       |

### Ví dụ

> Delete a backup

```bash
/backup delete id:123456789
```

---

## /backup load

**Mô tả:** Load a backup

### Tham số

| Tham số | Mô tả         | Bắt buộc |
| :------ | :------------ | :------- |
| `id`    | The backup ID | Có       |

### Ví dụ

> Load a backup

```bash
/backup load id:123456789
```

---

## /backup list

**Mô tả:** List all server backups

### Tham số

Không có tham số.

### Ví dụ

> List all server backups

```bash
/backup list
```

---

## /backup info

**Mô tả:** Get information about a backup

### Tham số

| Tham số | Mô tả         | Bắt buộc |
| :------ | :------------ | :------- |
| `id`    | The backup ID | Có       |

### Ví dụ

> Get information about a backup

```bash
/backup info id:123456789
```

---

## /channelstats add

**Mô tả:** 📈 Tạo kênh thống kê

Tạo một kênh thoại (Voice Channel) đặc biệt dùng để hiển thị các số liệu thống kê của server (như số thành viên, số role, ngày tạo server, v.v.). Kênh này sẽ tự động cập nhật tên theo thời gian thực.

### Tham số

| Tham số       | Mô tả                                                                                                       | Bắt buộc |
| :------------ | :---------------------------------------------------------------------------------------------------------- | :------- |
| `channelname` | Tên kênh hiển thị. BẮT BUỘC phải chứa `{stats}` để bot thay thế số liệu vào đó. (vd: `Thành viên: {stats}`) | Có       |
| `type`        | Loại số liệu muốn hiển thị                                                                                  | Có       |
| `channel`     | Chọn kênh Voice muốn biến thành kênh thống kê                                                               | Có       |
| `role`        | Role cần đếm (chỉ bắt buộc nếu chọn loại thống kê theo role)                                                | Không    |

**Các loại thống kê hỗ trợ (`type`):**

- `MemberCount`: Tổng số thành viên
- `NitroBoosterCount`: Số lượng Booster
- `OnlineMembersCount`: Số thành viên đang Online
- `TotalRolesCount`: Tổng số Role
- `TotalChannelsCount`: Tổng số kênh
- `TotalEmojisCount`: Tổng số Emoji
- `ServerCreationDate`: Ngày tạo server
- `ServerRegion`: Khu vực máy chủ (Region)
- `TotalBannedMembers`: Số thành viên bị ban
- `TotalMembersWithRole`: Số người có role cụ thể (cần nhập thêm `role`)
- `OnlineMembersWithRole`: Số người có role cụ thể đang Online (cần nhập thêm `role`)

### Ví dụ

> Tạo kênh đếm tổng thành viên

```bash
/channelstats add channelname:Thành viên: {stats} type:MemberCount channel:#VoiceChannel
```

> Tạo kênh đếm số người có role @VIP

```bash
/channelstats add channelname:VIP: {stats} type:TotalMembersWithRole channel:#VoiceChannel role:@VIP
```

---

## /channelstats remove

**Mô tả:** ➖ Xóa kênh thống kê

Tắt tính năng thống kê trên một kênh đã cài đặt trước đó.

### Tham số

| Tham số   | Mô tả                       | Bắt buộc |
| :-------- | :-------------------------- | :------- |
| `channel` | Kênh Voice cần xóa thống kê | Có       |

### Ví dụ

> Xóa thống kê khỏi kênh

```bash
/channelstats remove channel:#VoiceChannel
```

---

## /embed create

**Mô tả:** 🎨 Trình tạo Embed chuyên nghiệp

Mở một bảng điều khiển (GUI) tương tác cho phép bạn tạo ra các bài viết Embed đẹp mắt mà không cần gõ lệnh phức tạp.

**Tính năng nổi bật:**

- **Chỉnh sửa trực quan:** Dùng nút bấm để sửa Title, Description, Color, Footer, Image, Thumbnail...
- **Link Buttons:** Thêm các nút bấm chứa liên kết.
- **Fields:** Thêm các trường nội dung (Add Field).
- **Templates:** Lưu và tải lại các mẫu embed đã tạo để dùng lại sau này.
- **Mention/Pings:** Tùy chọn bật/tắt thông báo (ping) khi gửi.
- **Above Text:** Thêm dòng chữ hoặc hình ảnh nằm **bên trên** Embed (ngoài khung).

### Tham số

Không có tham số.

### Ví dụ

> Mở trình tạo embed

```bash
/embed create
```

---

## /embed edit

**Mô tả:** 📝 Chỉnh sửa Embed đã gửi

Mở lại trình tạo Embed để chỉnh sửa một bài viết Embed mà bot đã gửi trước đó.

### Tham số

| Tham số     | Mô tả                                                                   | Bắt buộc |
| :---------- | :---------------------------------------------------------------------- | :------- |
| `messageid` | ID của tin nhắn chứa Embed cần sửa (Chuột phải vào tin nhắn -> Copy ID) | Có       |

### Ví dụ

> Sửa lại tin nhắn embed cũ

```bash
/embed edit messageid:123456789012345678
```

---

## /settings log set

**Mô tả:** Đặt một kênh log cho một loại log cụ thể

### Tham số

| Tham số    | Mô tả                            | Bắt buộc |
| :--------- | :------------------------------- | :------- |
| `log-type` | Loại log để đặt kênh (Ban/Unban) | Có       |
| `channel`  | Kênh để gửi log                  | Có       |

### Ví dụ

> Đặt kênh log ban

```bash
/settings log set log-type:Ban channel:#mod-logs
```

---

## /settings welcome set-channel

**Mô tả:** Đặt kênh cho tin nhắn chào mừng

### Tham số

| Tham số   | Mô tả                          | Bắt buộc |
| :-------- | :----------------------------- | :------- |
| `channel` | Kênh để gửi tin nhắn chào mừng | Có       |

### Ví dụ

> Đặt kênh chào mừng

```bash
/settings welcome set-channel channel:#welcome
```

---

## /settings welcome set-message

**Mô tả:** Đặt tin nhắn chào mừng

### Tham số

| Tham số   | Mô tả                                             | Bắt buộc |
| :-------- | :------------------------------------------------ | :------- |
| `message` | Nội dung tin nhắn chào mừng ({user}, {guildName}) | Có       |

### Ví dụ

> Đặt tin nhắn chào mừng

```bash
/settings welcome set-message message:Chào mừng {user} đến với {guildName}!
```

---

## /settings welcome enable

**Mô tả:** Bật tin nhắn chào mừng

### Tham số

Không có tham số.

### Ví dụ

> Bật tin nhắn chào mừng

```bash
/settings welcome enable
```

---

## /settings welcome disable

**Mô tả:** Tắt tin nhắn chào mừng

### Tham số

Không có tham số.

### Ví dụ

> Tắt tin nhắn chào mừng

```bash
/settings welcome disable
```

---

## /settings leave set-channel

**Mô tả:** Đặt kênh cho tin nhắn tạm biệt

### Tham số

| Tham số   | Mô tả                         | Bắt buộc |
| :-------- | :---------------------------- | :------- |
| `channel` | Kênh để gửi tin nhắn tạm biệt | Có       |

### Ví dụ

> Đặt kênh tạm biệt

```bash
/settings leave set-channel channel:#goodbye
```

---

## /settings leave set-message

**Mô tả:** Đặt tin nhắn tạm biệt

### Tham số

| Tham số   | Mô tả                                            | Bắt buộc |
| :-------- | :----------------------------------------------- | :------- |
| `message` | Nội dung tin nhắn tạm biệt ({user}, {guildName}) | Có       |

### Ví dụ

> Đặt tin nhắn tạm biệt

```bash
/settings leave set-message message:Tạm biệt {user}, hẹn gặp lại!
```

---

## /settings leave enable

**Mô tả:** Bật tin nhắn tạm biệt

### Tham số

Không có tham số.

### Ví dụ

> Bật tin nhắn tạm biệt

```bash
/settings leave enable
```

---

## /settings leave disable

**Mô tả:** Tắt tin nhắn tạm biệt

### Tham số

Không có tham số.

### Ví dụ

> Tắt tin nhắn tạm biệt

```bash
/settings leave disable
```

---

## /settings ticket create-panel

**Mô tả:** Tạo một bảng điều khiển ticket mới

### Tham số

| Tham số   | Mô tả                       | Bắt buộc |
| :-------- | :-------------------------- | :------- |
| `name`    | Tên của bảng điều khiển     | Có       |
| `channel` | Kênh để gửi bảng điều khiển | Có       |

### Ví dụ

> Tạo bảng điều khiển ticket

```bash
/settings ticket create-panel name:Support channel:#tickets
```

---

## /settings ticket create-category

**Mô tả:** Tạo một danh mục ticket mới

### Tham số

| Tham số    | Mô tả                       | Bắt buộc |
| :--------- | :-------------------------- | :------- |
| `name`     | Tên của danh mục            | Có       |
| `category` | Kênh danh mục để tạo ticket | Có       |

### Ví dụ

> Tạo danh mục ticket

```bash
/settings ticket create-category name:Help category:Support-Category
```

---

## /settings ticket add-category-to-panel

**Mô tả:** Thêm một danh mục vào bảng điều khiển ticket

### Tham số

| Tham số         | Mô tả                   | Bắt buộc |
| :-------------- | :---------------------- | :------- |
| `panel-name`    | Tên của bảng điều khiển | Có       |
| `category-name` | Tên của danh mục        | Có       |

### Ví dụ

> Thêm danh mục vào panel

```bash
/settings ticket add-category-to-panel panel-name:Support category-name:Help
```

---

## /steal emoji

**Mô tả:** Lấy một hoặc nhiều emoji

### Tham số

| Tham số       | Mô tả                                   | Bắt buộc |
| :------------ | :-------------------------------------- | :------- |
| `emojis`      | Emoji bạn muốn mượn                     | Có       |
| `addtoserver` | Tùy chọn thêm emoji vào máy chủ của bạn | Không    |

### Ví dụ

> Lấy emoji

```bash
/steal emoji emojis:👋 addtoserver:true
```

---

## /steal sticker

**Mô tả:** Lấy sticker từ một tin nhắn cụ thể

### Tham số

| Tham số       | Mô tả                                     | Bắt buộc |
| :------------ | :---------------------------------------- | :------- |
| `messageid`   | ID của tin nhắn chứa sticker              | Có       |
| `addtoserver` | Tùy chọn thêm sticker vào máy chủ của bạn | Không    |

### Ví dụ

> Lấy sticker

```bash
/steal sticker messageid:123456789 addtoserver:true
```

---

## /invites user

**Mô tả:** Kiểm tra xem người dùng có bao nhiêu lời mời

### Tham số

| Tham số | Mô tả                          | Bắt buộc |
| :------ | :----------------------------- | :------- |
| `user`  | Người dùng để kiểm tra lời mời | Không    |

### Ví dụ

> Kiểm tra lời mời

```bash
/invites user:@User
```

---

## /invites add

**Mô tả:** Thêm lời mời cho người dùng

### Tham số

| Tham số  | Mô tả                      | Bắt buộc |
| :------- | :------------------------- | :------- |
| `user`   | Người dùng để thêm lời mời | Có       |
| `amount` | Số lượng lời mời để thêm   | Có       |

### Ví dụ

> Thêm lời mời

```bash
/invites add user:@User amount:5
```

---

## /invites remove

**Mô tả:** Xóa lời mời của người dùng

### Tham số

| Tham số  | Mô tả                     | Bắt buộc |
| :------- | :------------------------ | :------- |
| `user`   | Người dùng để xóa lời mời | Có       |
| `amount` | Số lượng lời mời để xóa   | Có       |

### Ví dụ

> Xóa lời mời

```bash
/invites remove user:@User amount:5
```

---

## /invites reset

**Mô tả:** Đặt lại lời mời của người dùng về 0

### Tham số

| Tham số | Mô tả                         | Bắt buộc |
| :------ | :---------------------------- | :------- |
| `user`  | Người dùng để đặt lại lời mời | Có       |

### Ví dụ

> Đặt lại lời mời

```bash
/invites reset user:@User
```

---

## /invites reset-all

**Mô tả:** Đặt lại tất cả lời mời trong máy chủ về 0

### Tham số

| Tham số   | Mô tả                                    | Bắt buộc |
| :-------- | :--------------------------------------- | :------- |
| `confirm` | Nhập 'confirm' để đặt lại tất cả lời mời | Có       |

### Ví dụ

> Đặt lại tất cả lời mời

```bash
/invites reset-all confirm:confirm
```

---

## /moderation timeout

**Mô tả:** ⏱️ Tạm thời chặn (Timeout)

Cấm một thành viên chat hoặc tham gia voice trong một khoảng thời gian nhất định (Mute).

### Tham số

| Tham số    | Mô tả                                                                               | Bắt buộc |
| :--------- | :---------------------------------------------------------------------------------- | :------- |
| `member`   | Thành viên cần chặn (User hoặc ID)                                                  | Có       |
| `duration` | Thời gian chặn. Hỗ trợ: `m` (phút), `h` (giờ), `d` (ngày). Ví dụ: `10m`, `2h`, `1d` | Có       |
| `reason`   | Lý do chặn (sẽ hiển thị trong Audit Log và gửi DM cho user)                         | Có       |

### Ví dụ

> Cấm chat 1 giờ vì Spam

```bash
/moderation timeout member:@User duration:1h reason:Spam tin nhắn
```

---

## /moderation untimeout

**Mô tả:** 🔓 Gỡ bỏ chặn (Un-Timeout)

Xóa bỏ án phạt Timeout trước thời hạn cho một thành viên.

### Tham số

| Tham số  | Mô tả                  | Bắt buộc |
| :------- | :--------------------- | :------- |
| `member` | Thành viên cần gỡ chặn | Có       |
| `reason` | Lý do gỡ chặn          | Có       |

### Ví dụ

> Gỡ mute cho thành viên

```bash
/moderation untimeout member:@User reason:Đã hối lỗi
```

---

## /moderation ban

**Mô tả:** 🔨 Cấm vĩnh viễn (Ban)

Cấm hoàn toàn một thành viên khỏi server. Họ sẽ không thể tham gia lại trừ khi được gỡ ban.

### Tham số

| Tham số          | Mô tả                                                                   | Bắt buộc |
| :--------------- | :---------------------------------------------------------------------- | :------- |
| `user`           | Người dùng cần ban (Có thể ban cả người chưa vào server bằng ID)        | Có       |
| `reason`         | Lý do ban                                                               | Có       |
| `delete_message` | Xóa tin nhắn của người đó trong bao nhiêu ngày qua? (0-7 ngày)          | Không    |
| `dm_user`        | Có gửi tin nhắn riêng (DM) thông báo cho người đó không? (Mặc định: Có) | Không    |

### Ví dụ

> Ban thẳng tay và xóa tin nhắn trong 7 ngày

```bash
/moderation ban user:@User reason:Phá hoại server delete_message:7
```

---

## /moderation unban

**Mô tả:** 🤝 Gỡ cấm (Unban)

Cho phép một người dùng bị ban trước đó có thể tham gia lại server.

### Tham số

| Tham số  | Mô tả                                                                        | Bắt buộc |
| :------- | :--------------------------------------------------------------------------- | :------- |
| `user`   | ID của người dùng cần gỡ ban (Vì họ không còn trong server nên phải dùng ID) | Có       |
| `reason` | Lý do gỡ ban                                                                 | Có       |

### Ví dụ

> Ân xá cho thành viên

```bash
/moderation unban user:123456789012345678 reason:Ân xá nhân dịp lễ
```

---

## /moderation warn

**Mô tả:** ⚠️ Cảnh cáo (Warn)

Gửi một cảnh cáo chính thức cho thành viên. Hệ thống sẽ lưu lại số lần cảnh cáo để xử lý sau này.

### Tham số

| Tham số  | Mô tả                  | Bắt buộc |
| :------- | :--------------------- | :------- |
| `member` | Thành viên bị cảnh cáo | Có       |
| `reason` | Nội dung cảnh cáo      | Có       |

### Ví dụ

> Cảnh cáo vì ngôn từ không phù hợp

```bash
/moderation warn member:@User reason:Sử dụng từ ngữ thô tục
```

---

## /moderation unwarn

**Mô tả:** ❎ Xóa cảnh cáo (Unwarn)

Xóa bớt một hoặc tất cả cảnh cáo của thành viên.

### Tham số

| Tham số  | Mô tả                                                                  | Bắt buộc |
| :------- | :--------------------------------------------------------------------- | :------- |
| `user`   | Người dùng cần xóa cảnh cáo                                            | Có       |
| `reason` | Lý do xóa                                                              | Có       |
| `case`   | ID của cảnh cáo cụ thể cần xóa (Nếu để trống sẽ xóa cảnh cáo gần nhất) | Không    |

### Ví dụ

> Xóa cảnh cáo gần nhất

```bash
/moderation unwarn user:@User reason:Nhầm lẫn
```

---

## /moderation kick

**Mô tả:** 👢 Đuổi khỏi server (Kick)

Đuổi thành viên ra khỏi server nhưng họ vẫn có thể tham gia lại (nếu có link invite).

### Tham số

| Tham số   | Mô tả                                  | Bắt buộc |
| :-------- | :------------------------------------- | :------- |
| `member`  | Thành viên cần đuổi                    | Có       |
| `reason`  | Lý do đuổi                             | Có       |
| `dm_user` | Gửi DM thông báo lý do? (Mặc định: Có) | Không    |

### Ví dụ

> Kick thành viên treo máy quá lâu

```bash
/moderation kick member:@User reason:AFK quá lâu
```

---

## /poll

**Mô tả:** 📊 Tạo cuộc bình chọn

### Tham số

| Tham số     | Mô tả                                                   | Bắt buộc |
| :---------- | :------------------------------------------------------ | :------- |
| `question`  | Câu hỏi của cuộc thăm dò                                | Có       |
| `choices`   | Các lựa chọn của cuộc thăm dò (phân tách bằng dấu phẩy) | Có       |
| `multivote` | Cho phép người dùng bỏ phiếu cho nhiều lựa chọn         | Không    |

### Ví dụ

> Tạo cuộc bình chọn

```bash
/poll question:Bạn thích màu gì? choices:Đỏ, Xanh, Vàng
```

---

## /removerole

**Mô tả:** Xóa vai trò khỏi người dùng

### Tham số

| Tham số | Mô tả                     | Bắt buộc |
| :------ | :------------------------ | :------- |
| `user`  | Người dùng để xóa vai trò | Có       |
| `role`  | Vai trò để xóa            | Có       |

### Ví dụ

> Xóa vai trò

```bash
/removerole user:@User role:@Role
```

---

## /role

**Mô tả:** 🎭 Quản lý vai trò

### Tham số

| Tham số  | Mô tả                             | Bắt buộc |
| :------- | :-------------------------------- | :------- |
| `action` | Hành động để thực hiện (thêm/xóa) | Có       |
| `role`   | Vai trò để quản lý                | Có       |
| `user`   | Người dùng để thêm/xóa vai trò    | Không    |
| `all`    | Áp dụng cho tất cả người dùng?    | Không    |

### Ví dụ

> Thêm vai trò cho user

```bash
/role action:thêm role:@Role user:@User
Thêm vai trò cho tất cả
/role action:thêm role:@Role all:true
```

---

## /safety antinuke toggle

**Mô tả:** 🛡️ Bật/Tắt AntiNuke

Hệ thống AntiNuke giúp bảo vệ server khỏi các hành động phá hoại hàng loạt (như ban hàng loạt, xóa kênh hàng loạt).

### Tham số

| Tham số   | Mô tả                              | Bắt buộc |
| :-------- | :--------------------------------- | :------- |
| `enabled` | Chọn `True` để bật, `False` để tắt | Có       |

### Ví dụ

> Bật bảo vệ AntiNuke

```bash
/safety antinuke toggle enabled:true
```

---

## /safety antinuke limit

**Mô tả:** 📉 Giới hạn AntiNuke

Thiết lập giới hạn số lần hành động được phép trong một khoảng thời gian trước khi bị coi là phá hoại.

### Tham số

| Tham số     | Mô tả                                                           | Bắt buộc |
| :---------- | :-------------------------------------------------------------- | :------- |
| `type`      | Loại hành động (`Ban`, `Kick`, `Channel Delete`, `Role Delete`) | Có       |
| `threshold` | Số lượng tối đa cho phép                                        | Có       |
| `period`    | Thời gian tính (giây). Mặc định 60s                             | Không    |

**Giải thích:** Nếu ai đó thực hiện hành động quá số lần (`threshold`) trong thời gian (`period`), bot sẽ tự động trừng phạt người đó.

### Ví dụ

> Giới hạn tối đa 5 lần Ban trong 60 giây

```bash
/safety antinuke limit type:Ban threshold:5 period:60
```

---

## /safety antihoist toggle

**Mô tả:** 🚫 Chống tên hiển thị gây khó chịu (AntiHoist)

Tự động phát hiện và xử lý các thành viên đặt tên bắt đầu bằng ký tự đặc biệt (ví dụ: `!`, `.`) để được lên đầu danh sách thành viên.

### Tham số

| Tham số   | Mô tả                              | Bắt buộc |
| :-------- | :--------------------------------- | :------- |
| `enabled` | Chọn `True` để bật, `False` để tắt | Có       |

### Ví dụ

> Bật AntiHoist

```bash
/safety antihoist toggle enabled:true
```

---

## /safety antihoist action

**Mô tả:** ⚙️ Cấu hình xử lý AntiHoist

Chọn hành động sẽ làm khi phát hiện thành viên vi phạm AntiHoist.

### Tham số

| Tham số | Mô tả                                                                                            | Bắt buộc |
| :------ | :----------------------------------------------------------------------------------------------- | :------- |
| `type`  | Hành động: `Change Nickname` (Đổi tên họ thành Z-Hoister...) hoặc `Kick User` (Đuổi khỏi server) | Có       |

### Ví dụ

> Tự động đổi tên người vi phạm

```bash
/safety antihoist action type:Change Nickname
```

---

## /safety whitelist add

**Mô tả:** ✅ Thêm vào Whitelist (Danh sách trắng)

Những người hoặc Role trong danh sách này sẽ **KHÔNG** bị hệ thống Safety (AntiNuke, AntiHoist) kiểm tra/trừng phạt.

### Tham số

| Tham số | Mô tả                             | Bắt buộc |
| :------ | :-------------------------------- | :------- |
| `user`  | Người dùng cần thêm vào Whitelist | Không    |
| `role`  | Role cần thêm vào Whitelist       | Không    |

### Ví dụ

> Thêm Admin vào Whitelist để không bị AntiNuke chặn

```bash
/safety whitelist add user:@Admin
```

---

## /safety whitelist remove

**Mô tả:** ❎ Xóa khỏi Whitelist

Loại bỏ người dùng hoặc Role khỏi danh sách trắng. Họ sẽ bị kiểm tra lại như bình thường.

### Tham số

| Tham số | Mô tả              | Bắt buộc |
| :------ | :----------------- | :------- |
| `user`  | Người dùng cần xóa | Không    |
| `role`  | Role cần xóa       | Không    |

### Ví dụ

> Xóa Role Mod khỏi Whitelist

```bash
/safety whitelist remove role:@Mod
```

---

## /safety commands disable

**Mô tả:** ⛔ Vô hiệu hóa lệnh

Tắt hoàn toàn một lệnh (Slash Command) nào đó trong server này. Không ai (kể cả Admin) dùng được lệnh đó nữa cho đến khi bật lại.

### Tham số

| Tham số   | Mô tả                                | Bắt buộc |
| :-------- | :----------------------------------- | :------- |
| `command` | Tên lệnh cần tắt (không cần dấu `/`) | Có       |

### Ví dụ

> Tắt lệnh ping để đỡ spam

```bash
/safety commands disable command:ping
```

---

## /safety commands enable

**Mô tả:** 🟢 Bật lại lệnh

Mở lại một lệnh đã bị tắt trước đó.

### Tham số

| Tham số   | Mô tả                | Bắt buộc |
| :-------- | :------------------- | :------- |
| `command` | Tên lệnh cần bật lại | Có       |

### Ví dụ

> Bật lại lệnh ping

```bash
/safety commands enable command:ping
```

---

## /safety commands list

**Mô tả:** 📋 Danh sách lệnh đang tắt

Xem danh sách tất cả các lệnh hiện đang bị vô hiệu hóa trong server.

### Tham số

Không có tham số.

### Ví dụ

> Xem các lệnh đang bị tắt

```bash
/safety commands list
```

---

## /forms manage

**Mô tả:** Open the Form Manager UI

### Tham số

Không có tham số.

### Ví dụ

> Open Form Manager

```bash
/forms manage
```

---

## /forms send

**Mô tả:** Send a 'Open Form' button to a channel

### Tham số

| Tham số   | Mô tả                            | Bắt buộc |
| :-------- | :------------------------------- | :------- |
| `form_id` | The ID of the form to send       | Có       |
| `channel` | Channel to send the button to    | Có       |
| `label`   | Label for the button             | Không    |
| `content` | Message content above the button | Không    |

### Ví dụ

> Send form button

```bash
/forms send form_id:myform channel:#general
```

---

## /layout create

**Mô tả:** Create a new layout

### Tham số

| Tham số | Mô tả                  | Bắt buộc |
| :------ | :--------------------- | :------- |
| `name`  | The name of the layout | Có       |

### Ví dụ

> Create layout

```bash
/layout create name:mylayout
```

---

## /layout delete

**Mô tả:** Delete a layout

### Tham số

| Tham số | Mô tả                  | Bắt buộc |
| :------ | :--------------------- | :------- |
| `name`  | The name of the layout | Có       |

### Ví dụ

> Delete layout

```bash
/layout delete name:mylayout
```

---

## /layout edit

**Mô tả:** Edit a layout (Open Editor)

### Tham số

| Tham số | Mô tả                  | Bắt buộc |
| :------ | :--------------------- | :------- |
| `name`  | The name of the layout | Có       |

### Ví dụ

> Edit layout

```bash
/layout edit name:mylayout
```

---

## /layout list

**Mô tả:** List all layouts

### Tham số

Không có tham số.

### Ví dụ

> List all layouts

```bash
/layout list
```

---
