# Uma Careers Mode - Documentation

## Tổng quan
Lệnh `/uma_careers` cho phép người chơi đưa Mã nương vào chế độ huấn luyện chuyên sâu trong 12 tuần (72 ngày).

## Cách sử dụng
```
/uma_careers name:<tên mã nương>
```

## Cơ chế chính

### 1. Thời gian huấn luyện
- **Tổng thời gian**: 12 tuần = 72 ngày
- **Luyện tập**: Tối đa 6 ngày/tuần
- **Nghỉ ngơi**: Bắt buộc 1 ngày/tuần

### 2. Hệ thống Mood
Mood ảnh hưởng trực tiếp đến tỉ lệ thành công khi luyện tập:

| Mood Level | Emoji | Tỉ lệ thành công | Màu sắc |
|------------|-------|------------------|---------|
| Worst (Rất kém) | 😰 | 60-90% | Đỏ đậm |
| Bad (Kém) | 😟 | 40-70% | Đỏ nhạt |
| Normal (Bình thường) | 😐 | 95-99% | Vàng |
| Good (Tốt) | 😊 | 100% | Xanh lá |
| Great (Tuyệt vời) | 🤩 | 100% | Xanh dương |

#### Cách thay đổi Mood:
- **Nghỉ ngơi**: 40% cơ hội tăng 1 level
- **Luyện tập thành công**: 15% cơ hội tăng 1 level
- **Luyện tập thất bại**: 25% cơ hội giảm 1 level
- **Ngẫu nhiên hàng tuần**: 10% cơ hội thay đổi +/-1 level

### 3. Loại luyện tập

| Loại | Chỉ số chính | Chỉ số phụ | Ghi chú |
|------|-------------|------------|---------|
| 🏃 Running | Speed +10-15 | Power +3-5 | Tập trung tốc độ |
| 💪 Endurance | Stamina +10-15 | Guts +3-5 | Tập trung thể lực |
| ⚡ Power | Power +10-15 | Stamina +3-5 | Tập trung sức mạnh |
| 🔥 Guts | Guts +10-15 | Speed +2-4, Power +2-4 | Tập trung tinh thần |
| 🧠 Wisdom | Wisdom +10-15 | Speed +2-3, Energy +5 | Tập trung trí tuệ |

### 4. Hệ thống Skills Hỗ trợ

#### ⚪ Normal Skills (100 SP)
- Tăng 5% tỉ lệ thành công cho 1 loại luyện tập
- Ví dụ: Tăng Tốc Nhỏ, Bền Bỉ Cơ Bản, etc.

#### 🟡 Rare Skills (500 SP)
- Tăng 15% tỉ lệ thành công + bonus stats
- Ví dụ: Tăng Tốc Lớn (+2 Speed), Hồi Phục Nhanh (+30 energy)

#### 🌈 Evolved Skills (1000 SP)
- Tăng 25% tỉ lệ thành công + bonus stats lớn + hiệu ứng đặc biệt
- Ví dụ: 
  - Tốc Độ Ánh Sáng: +5 Speed, có cơ hội tăng Mood
  - Bất Diệt: +5 Stamina, giảm 50% nguy cơ Mood giảm
  - Siêu Trí Tuệ: +5 Wisdom, tự động cải thiện Mood mỗi tuần

### 5. Năng lượng (Energy)
- **Bắt đầu**: 100/100
- **Tiêu hao**: 20 năng lượng/lần luyện tập
- **Hồi phục**: +20 năng lượng khi nghỉ ngơi (hoặc +30 với skill Hồi Phục Nhanh)
- **Đặc biệt**: Luyện tập Wisdom hồi +5 năng lượng

### 6. Phần thưởng cuối khóa
Khi hoàn thành careers mode:
- ✅ Tất cả chỉ số tăng được sẽ cộng vào Mã nương
- ✅ Bonus Skill Points = Tổng stats tăng / 10
- ✅ Mã nương giữ lại tất cả kỹ năng đã học

## Menu Navigation

### Menu chính
1. **💤 Nghỉ ngơi** - Hồi năng lượng và có cơ hội cải thiện Mood
2. **🏋️ Luyện tập** - Chọn loại luyện tập (disabled khi energy < 20 hoặc đã tập 6 ngày/tuần)
3. **✨ Skills Hỗ trợ** - Xem và mua skills
4. **🚪 Kết thúc Careers** - Kết thúc sớm và nhận phần thưởng

### Menu luyện tập
Chọn 1 trong 5 loại luyện tập:
- 🏃 Speed
- 💪 Stamina  
- ⚡ Power
- 🔥 Guts
- 🧠 Wisdom

### Menu Skills
- Xem danh sách skills đã sở hữu
- Mua skills mới từ shop
- Skills được phân loại theo Normal, Rare, Evolved

## Tips chiến thuật

### 🎯 Tối ưu hóa Mood
1. Luôn giữ Mood ở mức Good hoặc Great để đảm bảo 100% thành công
2. Nghỉ ngơi ngay khi Mood xuống Bad hoặc Worst
3. Đầu tư vào skills Evolved như "Siêu Trí Tuệ" để tự động cải thiện Mood

### 💪 Tối ưu hóa Stats
1. Focus vào 2-3 stats quan trọng nhất cho chiến lược của bạn
2. Luyện tập Wisdom định kỳ để hồi năng lượng
3. Sử dụng skills Rare/Evolved để tăng hiệu quả luyện tập

### 💰 Quản lý Skill Points
1. Ưu tiên mua skills Normal ở đầu để tăng tỉ lệ thành công
2. Tiết kiệm để mua skills Evolved quan trọng
3. Skills "Hồi Phục Nhanh" rất hữu ích cho việc quản lý năng lượng

## Lưu ý quan trọng
- ⚠️ Không thể sử dụng các lệnh `/uma` khác khi đang trong careers mode
- ⚠️ Chỉ có thể có 1 career active tại một thời điểm
- ⚠️ Collector timeout sau 10 phút không hoạt động
- ⚠️ Mã nương đã nghỉ hưu không thể tham gia careers

## Ví dụ chiến thuật

### Build tốc độ thuần túy
1. Mua skill "Tốc Độ Ánh Sáng" (Evolved)
2. Focus 100% vào luyện tập Speed
3. Nghỉ ngơi khi Mood < Good
4. Kết quả: +800-1000 Speed sau 12 tuần

### Build cân bằng
1. Mua skills Normal cho tất cả loại luyện tập
2. Luân phiên luyện tập các stats
3. Luyện tập Wisdom thường xuyên để duy trì năng lượng
4. Kết quả: +400-500 mỗi stat sau 12 tuần

### Build endurance + stamina
1. Mua "Bất Diệt" (Evolved) để bảo vệ Mood
2. Focus vào Endurance và Guts training
3. Ít nghỉ ngơi hơn nhờ Mood ổn định
4. Kết quả: +700-900 Stamina+Guts sau 12 tuần
