// pages/profile/profile.js
const app = getApp()
const { ACHIEVEMENTS } = require('../../config/achievements')

Page({
  data: {
    userInfo: {},
    welcomeName: '亲爱的用户',
    draftNickname: '',
    statistics: {},
    settings: {},
    displayAchievements: [],
    unlockedCount: 0,
    totalCount: ACHIEVEMENTS.length,
    achievementProgress: 0,
    achievementsExpanded: false,
    isLoggedOut: false,
    totalVolumeTons: 0,
    totalDurationMinutes: 0
  },

  onLoad() {
    this.loadUserData()
    this.loadAchievements()
    this.initWechatProfile()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this.loadUserData()
    app.checkAchievements()
    this.loadAchievements()
  },

  // 首次进入时尝试获取微信头像和昵称作为默认值
  initWechatProfile() {
    const userData = wx.getStorageSync('userData')
    if (userData && userData.profile && userData.profile.avatar) return
    // 如果没有设置过头像，提示用户可以点击头像设置
  },

  loadUserData() {
    const isLoggedOut = !!wx.getStorageSync('authLoggedOut')
    const userData = wx.getStorageSync('userData') || this.getDefaultUserData()
    const profile = isLoggedOut
      ? { ...userData.profile, nickname: '未登录', avatar: '' }
      : userData.profile
    const workoutRecords = wx.getStorageSync('workoutRecords') || []
    const prRecords = wx.getStorageSync('prRecords') || {}
    const prCount = Object.keys(prRecords).length

    const totalVolume = workoutRecords.reduce((sum, r) => sum + (r.volume || 0), 0)
    const totalDurationMinutes = workoutRecords.reduce((sum, record) => {
      return sum + this.getRecordDurationMinutes(record)
    }, 0)
    const currentStreak = this.calculateCurrentStreak(workoutRecords)
    const longestStreak = this.calculateLongestStreak(workoutRecords)

    const statistics = {
      totalWorkouts: workoutRecords.length,
      totalPRs: prCount,
      totalVolume: totalVolume,
      currentStreak: currentStreak,
      longestStreak: longestStreak
    }

    this.setData({
      userInfo: profile,
      welcomeName: isLoggedOut ? '亲爱的用户' : (profile.nickname || '亲爱的用户'),
      draftNickname: isLoggedOut ? '' : (profile.nickname || ''),
      statistics: statistics,
      settings: userData.settings,
      isLoggedOut,
      totalVolumeTons: (totalVolume / 1000).toFixed(1),
      totalDurationMinutes
    })
  },

  getRecordDurationMinutes(record) {
    const duration = record.durationMinutes || record.durationMin || record.minutes
    if (duration) return Math.round(Number(duration) || 0)
    if (record.durationMs) return Math.round((Number(record.durationMs) || 0) / 60000)
    if (record.durationSeconds) return Math.round((Number(record.durationSeconds) || 0) / 60)
    return 0
  },

  loadAchievements() {
    const userAchievements = wx.getStorageSync('achievements') || []

    const displayAchievements = ACHIEVEMENTS.map(achievement => {
      const userAch = userAchievements.find(a => a.id === achievement.id)
      return {
        ...achievement,
        unlocked: userAch ? userAch.unlocked : false,
        unlockedDate: userAch ? userAch.unlockedDate : null
      }
    })

    const unlockedCount = displayAchievements.filter(a => a.unlocked).length
    const achievementProgress = Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)

    this.setData({
      displayAchievements,
      unlockedCount,
      totalCount: ACHIEVEMENTS.length,
      achievementProgress
    })
  },

  // 修改头像 - 调用微信选择头像
  changeAvatar() {
    if (this.data.isLoggedOut) {
      this.loginNow()
      return
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        const userData = wx.getStorageSync('userData') || this.getDefaultUserData()
        // 保存到本地
        const savedPath = wx.env.USER_DATA_PATH + '/avatar_' + Date.now() + '.jpg'
        wx.getFileSystemManager().saveFile({
          tempFilePath: tempFilePath,
          filePath: savedPath,
          success: () => {
            userData.profile.avatar = savedPath
            wx.setStorageSync('userData', userData)
            app.globalData.api.pushData('userData', userData)
            this.setData({ 'userInfo.avatar': savedPath })
            wx.showToast({ title: '头像已更新', icon: 'success' })
          },
          fail: () => {
            // 如果保存失败，直接使用临时路径
            userData.profile.avatar = tempFilePath
            wx.setStorageSync('userData', userData)
            app.globalData.api.pushData('userData', userData)
            this.setData({ 'userInfo.avatar': tempFilePath })
            wx.showToast({ title: '头像已更新', icon: 'success' })
          }
        })
      }
    })
  },

  onChooseAvatar(e) {
    if (this.data.isLoggedOut) {
      this.loginNow()
      return
    }

    const avatarUrl = e.detail && e.detail.avatarUrl
    if (!avatarUrl) return

    this.setData({ 'userInfo.avatar': avatarUrl })
    wx.showLoading({ title: '绑定头像' })
    app.globalData.api.uploadAvatar(avatarUrl).then((remoteAvatarUrl) => {
      const userData = wx.getStorageSync('userData') || this.getDefaultUserData()
      userData.profile.avatar = remoteAvatarUrl
      wx.setStorageSync('userData', userData)
      app.globalData.api.pushData('userData', userData)
      this.setData({ 'userInfo.avatar': remoteAvatarUrl })
      wx.hideLoading()
      wx.showToast({ title: '头像已绑定', icon: 'success' })
    }).catch(() => {
      wx.hideLoading()
      const userData = wx.getStorageSync('userData') || this.getDefaultUserData()
      userData.profile.avatar = avatarUrl
      wx.setStorageSync('userData', userData)
      this.setData({ 'userInfo.avatar': avatarUrl })
      wx.showToast({ title: '头像已保存本机，云端同步失败', icon: 'none' })
    })
  },

  onNicknameInput(e) {
    this.setData({ draftNickname: e.detail.value })
  },

  saveWechatNickname(e) {
    if (this.data.isLoggedOut) return
    const value = ((e && e.detail && e.detail.value) || this.data.draftNickname || '').trim()
    if (!value || value === this.data.userInfo.nickname) return

    const userData = wx.getStorageSync('userData') || this.getDefaultUserData()
    userData.profile.nickname = value
    wx.setStorageSync('userData', userData)
    app.globalData.api.pushData('userData', userData)
    this.setData({
      'userInfo.nickname': value,
      welcomeName: value,
      draftNickname: value
    })
    wx.showToast({ title: '昵称已绑定', icon: 'success' })
  },

  // 修改昵称
  editNickname() {
    if (this.data.isLoggedOut) {
      this.loginNow()
      return
    }
    const currentNickname = this.data.userInfo.nickname || ''
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      content: currentNickname,
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const newNickname = res.content.trim()
          const userData = wx.getStorageSync('userData') || this.getDefaultUserData()
          userData.profile.nickname = newNickname
          wx.setStorageSync('userData', userData)
          app.globalData.api.pushData('userData', userData)
          this.setData({
            'userInfo.nickname': newNickname,
            welcomeName: newNickname,
            draftNickname: newNickname
          })
          wx.showToast({ title: '昵称已更新', icon: 'success' })
        }
      }
    })
  },

  onAchievementTap(e) {
    const achievement = e.currentTarget.dataset.achievement
    if (achievement.unlocked) {
      wx.showModal({
        title: '🎉 ' + achievement.title,
        content: achievement.description + '\n解锁时间：' + achievement.unlockedDate,
        showCancel: false,
        confirmText: '太棒了'
      })
    } else {
      const progress = this.getAchievementProgress(achievement)
      wx.showModal({
        title: achievement.title,
        content: '当前进度：' + progress.current + '/' + progress.target + '\n' + achievement.description,
        showCancel: false,
        confirmText: '继续加油'
      })
    }
  },

  toggleAchievements() {
    this.setData({
      achievementsExpanded: !this.data.achievementsExpanded
    })
  },

  getAchievementProgress(achievement) {
    const { statistics } = this.data
    const { condition } = achievement
    switch (condition.type) {
      case 'workout_count':
        return { current: statistics.totalWorkouts, target: condition.value }
      case 'pr_count':
        return { current: statistics.totalPRs, target: condition.value }
      case 'streak':
        return { current: statistics.currentStreak, target: condition.value }
      case 'total_volume':
        return { current: statistics.totalVolume, target: condition.value }
      default:
        return { current: 0, target: condition.value }
    }
  },

  editProfile() {
    if (this.data.isLoggedOut) {
      this.loginNow()
      return
    }
    this.editNickname()
  },

  openTools() {
    wx.navigateTo({
      url: '/pages/tools/tools'
    })
  },

  changeUnit() {
    const currentUnit = this.data.settings.unit
    const newUnit = currentUnit === 'kg' ? 'lbs' : 'kg'
    wx.showModal({
      title: '切换单位',
      content: '确定切换为 ' + (newUnit === 'kg' ? '公斤(kg)' : '磅(lbs)') + ' 吗？',
      success: (res) => {
        if (res.confirm) {
          const userData = wx.getStorageSync('userData') || this.getDefaultUserData()
          userData.settings.unit = newUnit
          wx.setStorageSync('userData', userData)
          app.globalData.api.pushData('userData', userData)
          this.setData({ 'settings.unit': newUnit })
          wx.showToast({ title: '单位已更新', icon: 'success' })
        }
      }
    })
  },

  loginNow() {
    wx.removeStorageSync('authLoggedOut')
    wx.showLoading({ title: '登录中' })
    app.loginAndSync().then(() => {
      wx.hideLoading()
      this.loadUserData()
      this.loadAchievements()
      wx.showToast({ title: '已登录', icon: 'success' })
    }).catch(() => {
      wx.hideLoading()
      wx.setStorageSync('authLoggedOut', true)
      wx.showToast({ title: '登录失败，请稍后再试', icon: 'none' })
      this.loadUserData()
    })
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后会停止云端同步，并清除本机头像昵称缓存；训练记录、PR、体重和成就会保留在本机。',
      confirmText: '退出',
      confirmColor: '#ff6b35',
      success: (res) => {
        if (!res.confirm) return

        const userData = wx.getStorageSync('userData') || this.getDefaultUserData()
        userData.profile = this.getDefaultUserData().profile

        wx.removeStorageSync('token')
        wx.setStorageSync('authLoggedOut', true)
        wx.setStorageSync('userData', userData)

        this.loadUserData()
        wx.showToast({ title: '已退出登录', icon: 'success' })
      }
    })
  },

  toggleLoginState() {
    if (this.data.isLoggedOut) {
      this.loginNow()
    } else {
      this.logout()
    }
  },

  exportData() {
    const workoutRecords = wx.getStorageSync('workoutRecords') || []
    const prRecords = wx.getStorageSync('prRecords') || {}
    const weightRecords = wx.getStorageSync('weightRecords') || []

    const exportObj = {
      exportDate: new Date().toISOString(),
      workoutRecords,
      prRecords,
      weightRecords
    }

    const filePath = wx.env.USER_DATA_PATH + '/fittracker_export_' + Date.now() + '.json'
    wx.getFileSystemManager().writeFile({
      filePath: filePath,
      data: JSON.stringify(exportObj, null, 2),
      encoding: 'utf8',
      success: () => {
        wx.shareFileMessage({
          filePath: filePath,
          success: () => {},
          fail: () => {
            wx.showToast({ title: '数据已导出到本地', icon: 'success' })
          }
        })
      },
      fail: () => {
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
    })
  },

  clearAllData() {
    wx.showModal({
      title: '⚠️ 危险操作',
      content: '此操作将删除所有训练记录、个人记录和设置，且无法恢复。确定要继续吗？',
      confirmText: '确定清除',
      confirmColor: '#f44336',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          app.globalData.api.clearData()
          wx.showToast({ title: '数据已清除', icon: 'success' })
          setTimeout(() => { this.onLoad() }, 1500)
        }
      }
    })
  },

  showAbout() {
    const versionLogs = [
      'v1.0.0 (2026-01-31)\n' +
      '- 训练记录与PR自动检测\n' +
      '- 1RM计算器\n' +
      '- 体重管理与趋势图\n' +
      '- 打卡日历\n' +
      '- 20项成就系统\n' +
      '- 数据导出'
    ]
    wx.showModal({
      title: '训练日记Pro',
      content: versionLogs.join('\n\n'),
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // ===== 计算函数 =====

  calculateCurrentStreak(workouts) {
    if (workouts.length === 0) return 0
    const dates = [...new Set(workouts.map(w => w.date))].sort((a, b) => new Date(b) - new Date(a))
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 365; i++) {
      const checkDate = this.getDateStr(new Date(today.getTime() - i * 86400000))
      if (dates.includes(checkDate)) {
        streak++
      } else if (i > 0) {
        break
      }
    }
    return streak
  },

  calculateLongestStreak(workouts) {
    if (workouts.length === 0) return 0
    const dates = [...new Set(workouts.map(w => w.date))].sort()
    let maxStreak = 1
    let currentStreak = 1

    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000
      if (diff === 1) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else if (diff > 1) {
        currentStreak = 1
      }
    }
    return maxStreak
  },

  getDefaultUserData() {
    return {
      profile: {
        nickname: "健身爱好者",
        avatar: "",
        gender: "male",
        weight: 70,
        height: 170,
        goal: "muscle_gain"
      },
      subscription: {
        isPro: false,
        planType: null,
        startDate: null,
        endDate: null
      },
      settings: {
        unit: "kg",
        theme: "dark",
        language: "zh-CN"
      }
    }
  },

  getDateStr(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return year + '-' + month + '-' + day
  }
})
