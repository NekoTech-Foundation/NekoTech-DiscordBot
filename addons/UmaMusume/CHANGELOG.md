# Uma Musume Addon - Changelog

## [v2.0.0] - 2024-01-07

### ✨ Added - MAJOR UPDATE: Careers Mode

#### New Command:
- **`/uma_careers <name>`** - Chế độ huấn luyện chuyên sâu 12 tuần

#### Core Features:
- **Training System**: 72 ngày training với 5 loại (Speed, Stamina, Power, Guts, Wisdom)
- **Mood System**: 5 levels (Worst → Great) ảnh hưởng success rate
- **Energy Management**: 100 max energy, -20/training, +20/rest
- **Week Progression**: 6 ngày training/tuần + 1 ngày rest bắt buộc
- **Interactive UI**: Button-based navigation với real-time updates

#### Support Skills:
- **3 Tiers**: Normal (100 SP), Rare (500 SP), Evolved (1000 SP)
- **15 Pre-defined Skills** với effects đa dạng
- **Skill Shop**: Interactive purchasing system
- **Integration**: Sử dụng EconomyUserData balance làm Skill Points

#### Rewards:
- Stats gains cộng vào Uma permanent
- Bonus Skill Points = Total stats / 10
- Có thể gain 800-1200+ stats mỗi career

#### Documentation:
- `CAREERS_QUICKSTART.md` - Quick start guide
- `CAREERS_GUIDE.md` - Comprehensive guide với strategies
- `CAREERS_IMPLEMENTATION.md` - Technical documentation
- `COMPLETION_SUMMARY.md` - Implementation summary

#### Technical:
- New schema: `UmaCareer.js` cho session tracking
- Collector-based interaction (10min timeout)
- Proper error handling và validation
- Clean, maintainable code structure

### 🔧 Modified:
- **commands.yml**: Added `uma_careers: true`
- **README.md**: Updated với Careers Mode documentation

### 📊 Stats:
- Total new code: ~22.5 KB (cmd_uma_careers.js)
- Total documentation: ~15 KB (4 markdown files)
- Development time: ~2 hours
- Lines of code: ~600+ (main file)

---

## [v1.x.x] - Previous versions

### Existing Features:
- Gacha system với 3 tiers
- Training system cơ bản
- Race system (PvE & PvP)
- Champions Meeting
- Breeding system
- Skill learning
- Profile management
- Energy system

---

## 🔮 Planned Features (Future Versions)

### v2.1.0 - UX Improvements:
- [ ] Button-based skill selection (replace text input)
- [ ] Progress bars cho days/weeks
- [ ] Confirmation modals
- [ ] Career history viewer
- [ ] Better mobile responsiveness

### v2.2.0 - Gameplay Enhancements:
- [ ] Random events during training
- [ ] Injury system với healing
- [ ] Counseling system cho Worst mood
- [ ] Training combos
- [ ] Daily bonuses

### v2.3.0 - Social Features:
- [ ] Training partners (multi-user)
- [ ] Competitions during career
- [ ] Leaderboard cho best careers
- [ ] Career sharing/replay
- [ ] Guild training events

### v3.0.0 - Major Expansion:
- [ ] Multiple Uma training simultaneously
- [ ] Career templates
- [ ] Achievement system
- [ ] Advanced analytics
- [ ] Custom scenarios
- [ ] Voice acting integration (?)

---

## 📝 Migration Notes

### From v1.x to v2.0:
- **No breaking changes** - Backwards compatible
- Existing Uma data không bị ảnh hưởng
- New schema (`UmaCareer`) tự động tạo khi first use
- Commands.yml cần update: add `uma_careers: true`

### Database Impact:
- New collection: `umacareers`
- Fields: userId, umaId, stats, mood, energy, skills, etc.
- Index: `{ userId: 1, isActive: 1 }`
- No migration script needed

---

## 🐛 Known Issues

### Current (v2.0.0):
1. **Collector timeout**: Session lost sau 10 phút inactive
   - Workaround: Complete career trong 1 session
   - Fix planned: v2.1.0 (persistent sessions)

2. **Text input cho skills**: Có thể confusing
   - Workaround: Follow prompts carefully
   - Fix planned: v2.1.0 (button-based)

3. **No pause/resume**: Không thể pause career
   - Workaround: Finish hoặc end early
   - Fix planned: v2.2.0

### Fixed Issues:
- None (first release)

---

## 🙏 Credits

### Development:
- Feature design: Based on Uma Musume: Pretty Derby game mechanics
- Implementation: Custom Discord.js integration
- Testing: Community feedback

### Resources:
- Uma Musume wiki for game mechanics
- Discord.js documentation
- Community suggestions

---

## 📞 Support

### Getting Help:
1. Read documentation files first
2. Check troubleshooting section in CAREERS_QUICKSTART.md
3. Report bugs with detailed info

### Feedback:
- Feature requests welcome!
- Balance suggestions appreciated
- Bug reports với reproduction steps

---

**Thank you for using Uma Musume Addon! 🐴✨**
