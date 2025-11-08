# Uma Careers v2.0 - UPDATED LOGIC

## 🔄 Major Changes from Original Design

### Timeline: 12 Tuần → 7 Ngày Training + 10 Races

#### Phase 1: Training (7 ngày)
- 7 ngày luyện tập tự do
- Không giới hạn số lần train/ngày (chỉ giới hạn bởi energy)
- Mood system vẫn hoạt động như cũ
- Energy management quan trọng hơn

#### Phase 2: Racing (10 cuộc đua)
- Tự động chuyển sang sau khi hoàn thành 7 ngày training
- 10 cuộc đua theo thứ tự difficulty tăng dần
- Đối thủ là bots có stats tương đương (±20%)
- Mood ảnh hưởng qua chiến thắng/thua

## 🏁 Race List (Theo thứ tự từ dễ → khó)

1. **Sprinters Stakes** (1200m - Sprint) - Difficulty 1
2. **Kikka Sho** (3000m - Long) - Difficulty 2
3. **Tokyo Yushun (Derby Nhật Bản)** (2400m - Medium) - Difficulty 3
4. **Satsuki Sho** (2000m - Medium) - Difficulty 4
5. **Tenno Sho (Thu)** (2000m - Medium) - Difficulty 5
6. **Tenno Sho (Xuân)** (3200m - Long) - Difficulty 6
7. **Osaka Hai** (2000m - Medium) - Difficulty 7
8. **Takamazunomiya Kinen** (1200m - Sprint) - Difficulty 8
9. **Arima Kinen** (2500m - Long) - Difficulty 9
10. **Japan Cup** (2400m - Medium) - Difficulty 10

## 🤖 Bot Racing System

### Bot Stats Generation:
- Bots có tổng stats = User total stats × (0.8 to 1.2)
- Random variation để tạo unpredictability
- Difficulty modifier: Càng khó, bot càng mạnh (+5% per level)

### Race Calculation:
```javascript
Base Score = Total Stats
+ Distance Bonus (Speed for Sprint, Stamina for Long, Mixed for Medium)
+ Random Factor (±10%)
+ Difficulty Modifier
```

### Position & Rewards:
| Position | Coins Reward |
|----------|-------------|
| 1st 🥇 | 500 + (difficulty × 100) |
| 2nd 🥈 | 300 + (difficulty × 50) |
| 3rd 🥉 | 150 + (difficulty × 30) |
| 4th+ | 0 |

### Mood Changes:
- **Win (1st)**: 50% chance mood +1
- **Lose (4th+)**: 30% chance mood -1
- **Podium (2nd-3rd)**: No mood change

## 📊 Updated Flow

```
Start Career
    ↓
TRAINING PHASE (7 days)
    ├─→ Rest (energy +20, mood improve chance)
    ├─→ Train (energy -20, stats +10-15, mood change)
    └─→ Skills (buy/view support skills)
    ↓
Day 7 Complete
    ↓
🏁 TRANSITION TO RACING
    ↓
RACING PHASE (10 races)
    ├─→ Race (compete vs bots, earn coins)
    ├─→ View Results (see all race history)
    └─→ Mood affected by win/lose
    ↓
All 10 Races Complete
    ↓
END CAREER
    ├─→ Training stats → Add to Uma
    ├─→ Bonus SP = Total stats / 10
    └─→ Keep race rewards (coins)
```

## 🎮 Strategy Implications

### Training Phase (Days 1-7):
**Goal: Maximize stats efficiently**

1. **Day 1-2**: Focus training, buy Normal skills
2. **Day 3-4**: Continue training, consider Rare skills
3. **Day 5-6**: Final stat boost, buy Evolved skills if possible
4. **Day 7**: Last training push

**Key Strategy:**
- Train aggressively (mood management crucial)
- Energy management via Wisdom training
- Buy skills early for compound benefits
- Target 200-300 total stats minimum

### Racing Phase (Races 1-10):
**Goal: Win as many as possible**

**Stats Priorities:**
- **Sprint races (1200m)**: Need high Speed
- **Medium races (2000-2400m)**: Need Speed + Stamina
- **Long races (3000m+)**: Need Stamina + Guts

**Strategy by Build:**
- **Speed Build**: Dominate Sprint & Medium races
- **Tank Build**: Dominate Long races
- **Balanced**: Consistent performance across all

**Expected Win Rate:**
- Good training (200+ stats): 30-40% wins
- Great training (300+ stats): 50-60% wins
- Excellent training (400+ stats): 70-80% wins

## 💰 Economics

### Training Phase Costs:
- Skills: 100-1000 SP per skill
- No energy cost (free regen via Rest)

### Racing Phase Rewards:
```
Total Possible Coins (all 1st places):
= (500 + 100×1) + (500 + 100×2) + ... + (500 + 100×10)
= 5000 + (100 × 55) = 10,500 coins

Realistic Earnings (40% win rate, 30% podium):
= 4 wins × avg 1000 = 4000
+ 3 podiums × avg 500 = 1500
= 5500 coins average
```

### Final Bonus:
- Stat Bonus SP: 20-40 SP (200-400 total stats)
- Race Coins: 3000-8000 depending on performance

## ⚖️ Balance Changes

### Easier:
- ✅ Shorter timeline (7 days vs 72 days)
- ✅ No weekly restrictions
- ✅ Guaranteed 10 races for coin farming
- ✅ Clear two-phase structure

### Harder:
- ❌ Less time to accumulate stats
- ❌ Racing requires good training prep
- ❌ Bot difficulty scales up
- ❌ Mood management affects both phases

## 🆕 New Features

### Race Results Tracking:
- Full history of all races
- Position, racers, rewards tracked
- Win counter
- Total earnings displayed

### Bot Competition:
- Dynamic difficulty
- Realistic stat-based competition
- Fair but challenging

### Phase Transitions:
- Clear visual separation
- Summary embed when transitioning
- Motivational messaging

## 📈 Expected Stats Gains

### Training Phase (7 days):
```
Conservative (50 energy/day, 2-3 trainings):
= 15-20 training sessions
= 200-300 total stats

Aggressive (100 energy/day, 4-5 trainings):
= 25-30 training sessions  
= 350-450 total stats

Optimal (with Wisdom, skill bonuses):
= 30-35 training sessions
= 400-500 total stats
```

### Racing Phase:
- No stat gains (pure competition)
- Coin rewards only
- Glory and bragging rights!

## 🎯 Optimal Strategy Guide

### Opening (Days 1-2):
1. Train immediately (high energy)
2. Focus on 1-2 primary stats
3. Buy 2-3 Normal skills (300 SP)
4. Rest when energy < 40

### Mid-game (Days 3-5):
1. Continue primary stat training
2. Start secondary stat if energy permits
3. Buy 1-2 Rare skills (1000 SP)
4. Maintain Good/Great mood

### End Training (Days 6-7):
1. Final stat push
2. Buy Evolved skill if affordable
3. Max out primary stats
4. Prepare for racing

### Racing (Races 1-10):
1. Win early easy races for confidence
2. Accept losses in harder races
3. Aim for 30-50% win rate
4. Track progress, adjust next career

## 🏆 Success Metrics

### Minimum Success:
- Complete all 7 training days
- Gain 150+ total stats
- Win 2+ races
- Earn 2000+ coins

### Good Success:
- Efficient training (250+ stats)
- Win 4+ races
- Earn 4000+ coins
- Podium 60%+ races

### Excellent Success:
- Optimal training (350+ stats)
- Win 6+ races
- Earn 6000+ coins
- Podium 80%+ races

### Perfect Run:
- Max training (450+ stats)
- Win 8+ races
- Earn 8000+ coins
- All podium finishes

---

**This updated version provides faster, more focused gameplay while maintaining strategic depth!** 🚀
