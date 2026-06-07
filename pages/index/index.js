// pages/index/index.js
const app = getApp()

Page({
  data: {
    greeting: '',
    currentDate: '',
    todayWorkouts: 0,
    todayVolume: 0,
    prCount: 0,
    recentPRs: [],
    weightData: [],
    currentWeight: 0,
    weightChange: 0,
    exercises: [],
    exerciseNames: [],
    exerciseIndex: 0,
    selectedExercise: '',
    weight: '',
    reps: '',
    sets: '1',
    isPR: false,
    currentPR: 0,
    todayRecords: [],
    showCalendar: false,
    todayCheckedIn: false,
    checkinStreak: 0,
    calendarYear: 0,
    calendarMonth: 0,
    calendarDays: [],
    monthCheckinCount: 0
  },

  onLoad() {
    const exercises = app.globalData.exercises || []
    const exerciseNames = exercises.map(e => e.name)
    const now = new Date()

    this.setData({
      exercises,
      exerciseNames,
      selectedExercise: exerciseNames[0] || '',
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth() + 1
    })

    this.setGreeting()
    this.setCurrentDate()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    this.setGreeting()
    this.setCurrentDate()
    this.loadData()
  },

  setGreeting() {
    const hour = new Date().getHours()
    let greeting = ''
    if (hour < 6) greeting = '夜深了，注意休息'
    else if (hour < 12) greeting = '早上好，活力满满'
    else if (hour < 14) greeting = '中午好，补充能量'
    else if (hour < 18) greeting = '下午好，继续加油'
    else if (hour < 22) greeting = '晚上好，今天训练了吗'
    else greeting = '夜深了，早点休息'

    this.setData({ greeting })
    wx.setNavigationBarTitle({
      title: greeting + ' 💪'
    })
  },

  setCurrentDate() {
    const now = new Date()
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const currentDate = `${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`
    this.setData({ currentDate })
  },

  loadData() {
    this.loadTodayStats()
    this.loadTodayRecords()
    this.loadRecentPRs()
    this.loadWeightData()
    this.loadCheckinData()
  },

  loadTodayStats() {
    const workouts = wx.getStorageSync('workoutRecords') || []
    const today = this.getDateStr(new Date())
    const todayRecords = workouts.filter(w => w.date === today)
    const todayWorkouts = todayRecords.length
    const todayVolume = todayRecords.reduce((sum, w) => sum + (w.volume || w.weight * w.reps * w.sets), 0)
    const prRecords = wx.getStorageSync('prRecords') || {}
    const prCount = Object.keys(prRecords).length

    this.setData({ todayWorkouts, todayVolume, prCount })
  },

  loadTodayRecords() {
    const workoutRecords = wx.getStorageSync('workoutRecords') || []
    const today = this.getDateStr(new Date())
    const todayRecords = workoutRecords.filter(r => r.date === today)
    this.setData({ todayRecords })
  },

  loadRecentPRs() {
    const prRecords = wx.getStorageSync('prRecords') || {}
    const recentPRs = Object.entries(prRecords)
      .map(([exercise, data]) => ({
        exercise,
        weight: data.weight,
        date: data.date,
        timestamp: new Date(data.date).getTime()
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)

    this.setData({ recentPRs })
  },

  loadWeightData() {
    const weightRecords = wx.getStorageSync('weightRecords') || []

    if (weightRecords.length === 0) {
      this.setData({ weightData: [], currentWeight: 0, weightChange: 0 })
      return
    }

    const recent = weightRecords.slice(-7)
    const maxWeight = Math.max(...recent.map(r => r.weight))
    const minWeight = Math.min(...recent.map(r => r.weight))
    const range = maxWeight - minWeight || 1
    const weightData = recent.map(r => ({
      weight: r.weight,
      height: 20 + ((r.weight - minWeight) / range) * 60
    }))
    const currentWeight = recent[recent.length - 1].weight
    let weightChange = 0

    if (recent.length >= 2) {
      const weekAgoIndex = Math.max(0, recent.length - 7)
      weightChange = (currentWeight - recent[weekAgoIndex].weight).toFixed(1)
    }

    this.setData({ weightData, currentWeight, weightChange: parseFloat(weightChange) })
  },

  onExerciseChange(e) {
    const index = Number(e.detail.value)
    const selectedExercise = this.data.exerciseNames[index]
    this.setData({
      exerciseIndex: index,
      selectedExercise
    })
    this.checkPR()
  },

  onWeightInput(e) {
    const weight = e.detail.value
    const { selectedExercise } = this.data
    const prRecords = wx.getStorageSync('prRecords') || {}
    const currentPR = (prRecords[selectedExercise] && prRecords[selectedExercise].weight) || 0
    const isPR = selectedExercise && weight ? parseFloat(weight) > currentPR : false
    this.setData({ weight, isPR, currentPR })
  },

  onRepsInput(e) {
    this.setData({ reps: e.detail.value })
  },

  onSetsInput(e) {
    this.setData({ sets: e.detail.value })
  },

  checkPR() {
    const { selectedExercise, weight } = this.data
    if (!selectedExercise || !weight) {
      this.setData({ isPR: false })
      return
    }

    const prRecords = wx.getStorageSync('prRecords') || {}
    const currentPR = (prRecords[selectedExercise] && prRecords[selectedExercise].weight) || 0
    const isPR = parseFloat(weight) > currentPR
    this.setData({ isPR, currentPR })
  },

  addRecord() {
    const { selectedExercise, weight, reps, sets, exercises, isPR } = this.data

    if (!selectedExercise || !weight || !reps) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    const exercise = exercises.find(e => e.name === selectedExercise)
    const today = this.getDateStr(new Date())
    const volume = parseFloat(weight) * parseInt(reps) * parseInt(sets || 1)
    const record = {
      exercise: selectedExercise,
      icon: (exercise && exercise.icon) || '🏋️',
      weight: parseFloat(weight),
      reps: parseInt(reps),
      sets: parseInt(sets || 1),
      volume: Math.round(volume),
      date: today,
      time: new Date().toLocaleTimeString(),
      isPR
    }

    const workoutRecords = wx.getStorageSync('workoutRecords') || []
    workoutRecords.push(record)
    wx.setStorageSync('workoutRecords', workoutRecords)
    app.globalData.api.pushData('workoutRecords', workoutRecords)

    if (isPR) {
      const prRecords = wx.getStorageSync('prRecords') || {}
      prRecords[selectedExercise] = {
        weight: parseFloat(weight),
        reps: parseInt(reps),
        date: today,
        estimated1RM: app.globalData.calculate1RM(parseFloat(weight), parseInt(reps))
      }
      wx.setStorageSync('prRecords', prRecords)
      app.globalData.api.pushData('prRecords', prRecords)

      wx.showToast({ title: '🎉 新PR达成！', icon: 'none' })
      wx.vibrateShort({ type: 'heavy' })
    } else {
      wx.showToast({ title: '记录成功', icon: 'success' })
    }

    this.loadData()
    app.checkAchievements()
    this.setData({
      weight: '',
      reps: '',
      sets: '1',
      isPR: false
    })
  },

  deleteRecord(e) {
    const index = e.currentTarget.dataset.index

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (!res.confirm) return

        const workoutRecords = wx.getStorageSync('workoutRecords') || []
        const today = this.getDateStr(new Date())
        let todayIndex = 0

        for (let i = 0; i < workoutRecords.length; i++) {
          if (workoutRecords[i].date === today) {
            if (todayIndex === index) {
              workoutRecords.splice(i, 1)
              break
            }
            todayIndex++
          }
        }

        wx.setStorageSync('workoutRecords', workoutRecords)
        app.globalData.api.pushData('workoutRecords', workoutRecords)
        this.loadData()
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  },

  loadCheckinData() {
    const today = this.getDateStr(new Date())
    const checkinRecords = wx.getStorageSync('checkinRecords') || []
    const workoutRecords = wx.getStorageSync('workoutRecords') || []
    const allDates = new Set()

    checkinRecords.forEach(r => allDates.add(r.date))
    workoutRecords.forEach(r => allDates.add(r.date))

    const todayCheckedIn = allDates.has(today)
    const checkinStreak = this.calculateCheckinStreak(allDates)
    this.setData({ todayCheckedIn, checkinStreak })
    this.generateCalendar()
  },

  doCheckin() {
    if (this.data.todayCheckedIn) {
      wx.showToast({ title: '今天已打卡', icon: 'none' })
      return
    }

    const today = this.getDateStr(new Date())
    const checkinRecords = wx.getStorageSync('checkinRecords') || []
    checkinRecords.push({ date: today, time: new Date().toLocaleTimeString() })
    wx.setStorageSync('checkinRecords', checkinRecords)
    app.globalData.api.pushData('checkinRecords', checkinRecords)

    wx.showToast({ title: '打卡成功！', icon: 'success' })
    wx.vibrateShort({ type: 'medium' })
    this.loadData()
    app.checkAchievements()
  },

  toggleCheckinCalendar() {
    this.setData({ showCalendar: !this.data.showCalendar })
  },

  prevMonth() {
    let { calendarYear, calendarMonth } = this.data
    calendarMonth--
    if (calendarMonth < 1) {
      calendarMonth = 12
      calendarYear--
    }
    this.setData({ calendarYear, calendarMonth })
    this.generateCalendar()
  },

  nextMonth() {
    let { calendarYear, calendarMonth } = this.data
    calendarMonth++
    if (calendarMonth > 12) {
      calendarMonth = 1
      calendarYear++
    }
    this.setData({ calendarYear, calendarMonth })
    this.generateCalendar()
  },

  generateCalendar() {
    const { calendarYear, calendarMonth } = this.data
    const checkinRecords = wx.getStorageSync('checkinRecords') || []
    const workoutRecords = wx.getStorageSync('workoutRecords') || []
    const allDates = new Set()

    checkinRecords.forEach(r => allDates.add(r.date))
    workoutRecords.forEach(r => allDates.add(r.date))

    const today = this.getDateStr(new Date())
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1)
    const lastDay = new Date(calendarYear, calendarMonth, 0)
    const startDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    const calendarDays = []
    const prevMonthLastDay = new Date(calendarYear, calendarMonth - 1, 0).getDate()

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i
      const pm = calendarMonth - 1 < 1 ? 12 : calendarMonth - 1
      const py = calendarMonth - 1 < 1 ? calendarYear - 1 : calendarYear
      const dateStr = `${py}-${String(pm).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      calendarDays.push({ day, isCurrentMonth: false, isToday: false, hasCheckin: allDates.has(dateStr) })
    }

    let monthCheckinCount = 0
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const hasCheckin = allDates.has(dateStr)
      if (hasCheckin) monthCheckinCount++
      calendarDays.push({ day: i, isCurrentMonth: true, isToday: dateStr === today, hasCheckin })
    }

    const remaining = 42 - calendarDays.length
    for (let i = 1; i <= remaining; i++) {
      const nm = calendarMonth + 1 > 12 ? 1 : calendarMonth + 1
      const ny = calendarMonth + 1 > 12 ? calendarYear + 1 : calendarYear
      const dateStr = `${ny}-${String(nm).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      calendarDays.push({ day: i, isCurrentMonth: false, isToday: false, hasCheckin: allDates.has(dateStr) })
    }

    this.setData({ calendarDays, monthCheckinCount })
  },

  calculateCheckinStreak(allDates) {
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 365; i++) {
      const checkDate = this.getDateStr(new Date(today.getTime() - i * 86400000))
      if (allDates.has(checkDate)) {
        streak++
      } else if (i > 0) {
        break
      }
    }
    return streak
  },

  getDateStr(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})
