// app.js
const { ACHIEVEMENTS } = require('./config/achievements')
const api = require('./utils/api')

App({
  onLaunch() {
    // 初始化本地存储
    this.initStorage();
    // 登录并同步数据
    this.loginAndSync().catch(() => {});
  },

  loginAndSync() {
    if (wx.getStorageSync('authLoggedOut')) {
      return Promise.resolve({ skipped: true });
    }
    return api.login().then(({ isNewUser }) => {
      if (isNewUser) {
        return api.pushAll();
      } else {
        return api.pullAll();
      }
    });
  },

  initStorage() {
    // 初始化训练记录
    if (!wx.getStorageSync('workoutRecords')) {
      wx.setStorageSync('workoutRecords', []);
    }
    // 初始化PR记录
    if (!wx.getStorageSync('prRecords')) {
      wx.setStorageSync('prRecords', {});
    }
    // 初始化体重记录
    if (!wx.getStorageSync('weightRecords')) {
      wx.setStorageSync('weightRecords', []);
    }
    // 初始化打卡记录
    if (!wx.getStorageSync('checkinRecords')) {
      wx.setStorageSync('checkinRecords', []);
    }
  },

  // 检测并解锁成就，返回新解锁的成就列表
  checkAchievements() {
    const workoutRecords = wx.getStorageSync('workoutRecords') || []
    const prRecords = wx.getStorageSync('prRecords') || {}
    const checkinRecords = wx.getStorageSync('checkinRecords') || []
    const userAchievements = wx.getStorageSync('achievements') || []

    // 汇总统计数据
    const prCount = Object.keys(prRecords).length
    const totalVolume = workoutRecords.reduce((sum, r) => sum + (r.volume || 0), 0)
    const streak = this._calcStreak(workoutRecords, checkinRecords)

    // 本月训练次数
    const now = new Date()
    const thisMonth = String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0')
    const monthlyWorkouts = new Set(
      workoutRecords.filter(r => r.date && r.date.startsWith(thisMonth)).map(r => r.date)
    ).size

    const newlyUnlocked = []
    const today = this._getDateStr(now)

    ACHIEVEMENTS.forEach(ach => {
      // 已解锁的跳过
      const existing = userAchievements.find(a => a.id === ach.id)
      if (existing && existing.unlocked) return

      let met = false
      const c = ach.condition

      switch (c.type) {
        case 'workout_count':
          met = workoutRecords.length >= c.value
          break
        case 'pr_count':
          met = prCount >= c.value
          break
        case 'streak':
          met = streak >= c.value
          break
        case 'total_volume':
          met = totalVolume >= c.value
          break
        case 'exercise_weight':
          met = prRecords[c.exercise] && prRecords[c.exercise].weight >= c.value
          break
        case 'monthly_workout':
          met = monthlyWorkouts >= c.value
          break
        case 'all_exercises_pr':
          met = prCount >= c.value
          break
        default:
          break
      }

      if (met) {
        newlyUnlocked.push(ach)
        const idx = userAchievements.findIndex(a => a.id === ach.id)
        const record = { id: ach.id, unlocked: true, unlockedDate: today }
        if (idx >= 0) {
          userAchievements[idx] = record
        } else {
          userAchievements.push(record)
        }
      }
    })

    if (newlyUnlocked.length > 0) {
      wx.setStorageSync('achievements', userAchievements)
      api.pushData('achievements', userAchievements);

      // 延迟提示，避免和其他 toast 冲突
      setTimeout(() => {
        const titles = newlyUnlocked.map(a => a.icon + ' ' + a.title).join('、')
        wx.showToast({
          title: '🎉 解锁成就：' + titles,
          icon: 'none',
          duration: 2500
        })
      }, 1500)
    }

    return newlyUnlocked
  },

  _calcStreak(workoutRecords, checkinRecords) {
    const allDates = new Set()
    workoutRecords.forEach(r => { if (r.date) allDates.add(r.date) })
    checkinRecords.forEach(r => { if (r.date) allDates.add(r.date) })
    if (allDates.size === 0) return 0

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getTime() - i * 86400000)
      const checkDate = this._getDateStr(d)
      if (allDates.has(checkDate)) {
        streak++
      } else if (i > 0) {
        break
      }
    }
    return streak
  },

  _getDateStr(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return y + '-' + m + '-' + d
  },

  globalData: {
    api,
    // 常用动作列表
    exercises: [
      { id: 1, name: '深蹲', category: '腿部', icon: '🦵' },
      { id: 2, name: '卧推', category: '胸部', icon: '💪' },
      { id: 3, name: '硬拉', category: '背部', icon: '🏋️' },
      { id: 4, name: '划船', category: '背部', icon: '🚣' },
      { id: 5, name: '推举', category: '肩部', icon: '🙆' },
      { id: 6, name: '弯举', category: '手臂', icon: '💪' },
      { id: 7, name: '腿举', category: '腿部', icon: '🦵' },
      { id: 8, name: '引体向上', category: '背部', icon: '🧗' },
      { id: 9, name: '双杠臂屈伸', category: '胸部', icon: '🤸' },
      { id: 10, name: '罗马尼亚硬拉', category: '腿部', icon: '🏋️' }
    ],
    
    // 1RM计算公式 (Epley公式)
    calculate1RM(weight, reps) {
      if (reps === 1) return weight;
      return Math.round(weight * (1 + reps / 30));
    },
    
    // 根据1RM推荐训练重量
    getRecommendedWeights(oneRM) {
      return {
        strength: { percent: 85, weight: Math.round(oneRM * 0.85), reps: '3-5' },
        hypertrophy: { percent: 70, weight: Math.round(oneRM * 0.70), reps: '8-12' },
        endurance: { percent: 55, weight: Math.round(oneRM * 0.55), reps: '15-20' },
        warmup: { percent: 50, weight: Math.round(oneRM * 0.50), reps: '10-15' }
      };
    }
  }
});
