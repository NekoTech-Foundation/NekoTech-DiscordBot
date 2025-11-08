# Uma Careers - Implementation Summary

## Files Created/Modified

### New Files:
1. **cmd_uma_careers.js** - Main command file cho careers mode
2. **schemas/UmaCareer.js** - MongoDB schema cho career sessions
3. **CAREERS_GUIDE.md** - Hướng dẫn chi tiết cho người chơi

### Modified Files:
1. **commands.yml** - Added `uma_careers: true`

## Features Implemented

### ✅ Core Mechanics
- [x] 12 tuần training (72 ngày total)
- [x] 6 ngày training/tuần, 1 ngày rest
- [x] Mood system với 5 levels (Worst → Great)
- [x] Energy system (100 max, -20 per training)
- [x] Interactive button-based UI

### ✅ Training System
- [x] 5 loại training: Speed, Stamina, Power, Guts, Wisdom
- [x] Success rate dựa trên Mood
- [x] Main stat +10-15, bonus stat +3-5
- [x] Mood changes sau training/rest

### ✅ Support Skills
- [x] 3 tiers: Normal (100 SP), Rare (500 SP), Evolved (1000 SP)
- [x] Skill shop với interactive purchasing
- [x] Skills persist qua career session
- [x] 15 pre-defined skills với effects đa dạng

### ✅ UI/UX
- [x] Main menu với 4 buttons
- [x] Training selection menu với 5 training types
- [x] Skills menu với shop integration
- [x] Real-time stat updates
- [x] Color-coded embeds theo mood
- [x] Emoji indicators cho clarity

### ✅ Progression
- [x] Stats accumulate throughout career
- [x] Final stats bonus vào Uma stats
- [x] Skill Points reward = Total stats / 10
- [x] Weekly random mood changes
- [x] Day counter và week counter

## Database Schema

```javascript
UmaCareer {
  userId: String (required)
  umaId: ObjectId (ref: 'UmaMusume', required)
  isActive: Boolean (default: false)
  currentDay: Number (default: 0, max: 72)
  totalDays: Number (default: 72)
  mood: String (enum: Worst/Bad/Normal/Good/Great)
  trainingDaysThisWeek: Number (0-6)
  weekNumber: Number (1-12)
  careerStats: {
    speed, stamina, power, guts, wisdom: Number
  }
  energy: Number (0-100)
  skills: [{
    name, type, effect, cost
  }]
  startedAt: Date
}
```

## Command Usage

```
/uma_careers name:<uma_name>
```

### Prerequisites:
- User phải có Uma trong database
- Uma không được retired
- User không có career active khác

### Flow:
1. User starts career → Creates UmaCareer document
2. Shows main menu với current stats
3. User chọn action (rest/training/skills)
4. Updates stats, mood, energy
5. Continues cho đến khi:
   - Reach 72 days → Auto complete
   - User clicks "Kết thúc Careers" → Manual complete
6. Final stats added to Uma, career set inactive

## Integration với Existing System

### Compatible với:
- ✅ UserUma schema (uses existing uma stats)
- ✅ EconomyUserData (dùng balance làm Skill Points)
- ✅ Commands.yml registration system
- ✅ Addon loading mechanism

### Session Management:
- Collector timeout: 10 minutes
- Only 1 active career per user
- Prevents using other /uma commands during career

## Testing Checklist

### Basic Functionality:
- [ ] Start career với valid uma name
- [ ] Error handling cho invalid uma
- [ ] Error handling cho retired uma
- [ ] Prevent multiple active careers

### Training:
- [ ] All 5 training types work
- [ ] Stats increment correctly
- [ ] Energy decreases properly
- [ ] Success/failure rates match mood
- [ ] Mood changes work

### Rest:
- [ ] Energy increases by 20
- [ ] Day increments
- [ ] Mood có cơ hội improve
- [ ] Week transitions work

### Skills:
- [ ] Shop displays correctly
- [ ] Purchase validation (enough SP)
- [ ] Skills persist in career
- [ ] Duplicate prevention

### Completion:
- [ ] Auto-complete at day 72
- [ ] Manual end works
- [ ] Stats transfer to Uma
- [ ] Skill Points bonus calculated correctly
- [ ] Career set inactive

## Known Limitations

1. **No save/resume**: Nếu bot restart, career session sẽ lost (có thể fix bằng cách load từ DB)
2. **Collector timeout**: Sau 10 phút không activity, phải start lại
3. **Text input cho skill purchase**: Có thể improve bằng buttons/select menu
4. **No undo**: Không thể undo training decisions

## Future Enhancements

### Possible Improvements:
1. Add more skills (20-30 total)
2. Random events during training
3. Injury system
4. Counseling system cho Worst mood
5. Training partners (multiplayer)
6. Competitions/races during career
7. More detailed stat tracking (graphs)
8. Achievements system
9. Persistent sessions qua restarts
10. Multiple uma careers simultaneously

## Performance Considerations

- Uses MongoDB indexing on userId + isActive
- Collector cleanup on end
- Minimal DB queries (batch updates)
- Embeds reused efficiently
- No memory leaks from unclosed collectors

## Documentation

Full guide available in: `CAREERS_GUIDE.md`
Includes:
- Detailed mechanics explanation
- Strategy guides
- Tips and tricks
- Example builds
