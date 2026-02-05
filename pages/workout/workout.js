// pages/workout/workout.js
const app = getApp();

Page({
  data: {
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
    prList: [],
    historyRecords: [],
    showFilter: false,
    selectedFilter: '全部',
    greeting: '',
    currentDate: '',
    // 打卡日历
    showCalendar: false,
    todayCheckedIn: false,
    checkinStreak: 0,
    calendarYear: 0,
    calendarMonth: 0,
    calendarDays: [],
    monthCheckinCount: 0
  },

  onLoad() {
    const exercises = app.globalData.exercises;
    const exerciseNames = exercises.map(e => e.name);
    const now = new Date();
    this.setData({
      exercises,
      exerciseNames,
      selectedExercise: exerciseNames[0],
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth() + 1
    });
    this.setGreeting();
    this.setCurrentDate();
    this.loadCheckinData();
  },

  onShow() {
    this.setGreeting();
    this.setCurrentDate();
    this.loadTodayRecords();
    this.loadPRList();
    this.loadHistoryRecords();
    this.loadCheckinData();
  },

  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour < 6) greeting = '夜深了，注意休息 🌙';
    else if (hour < 12) greeting = '早上好，活力满满 ☀️';
    else if (hour < 14) greeting = '中午好，补充能量 🍚';
    else if (hour < 18) greeting = '下午好，继续加油 💪';
    else if (hour < 22) greeting = '晚上好，今天训练了吗 🏋️';
    else greeting = '夜深了，早点休息 🌙';
    this.setData({ greeting });
  },

  setCurrentDate() {
    const now = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const currentDate = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + weekDays[now.getDay()];
    this.setData({ currentDate });
  },

  onExerciseChange(e) {
    const index = e.detail.value;
    const selectedExercise = this.data.exerciseNames[index];
    this.setData({ 
      exerciseIndex: index,
      selectedExercise 
    });
    this.checkPR();
  },

  onWeightInput(e) {
    const weight = e.detail.value;
    const { selectedExercise } = this.data;
    const prRecords = wx.getStorageSync('prRecords') || {};
    const currentPR = (prRecords[selectedExercise] && prRecords[selectedExercise].weight) || 0;
    const isPR = selectedExercise && weight ? parseFloat(weight) > currentPR : false;
    this.setData({ weight, isPR, currentPR });
  },

  onRepsInput(e) {
    this.setData({ reps: e.detail.value });
  },

  onSetsInput(e) {
    this.setData({ sets: e.detail.value });
  },

  adjustWeight(e) {
    const delta = parseFloat(e.currentTarget.dataset.delta);
    let currentWeight = parseFloat(this.data.weight) || 0;
    currentWeight = Math.max(0, currentWeight + delta);
    this.setData({ weight: currentWeight.toString() });
    this.checkPR();
  },

  checkPR() {
    const { selectedExercise, weight } = this.data;
    if (!selectedExercise || !weight) {
      this.setData({ isPR: false });
      return;
    }

    const prRecords = wx.getStorageSync('prRecords') || {};
    const currentPR = (prRecords[selectedExercise] && prRecords[selectedExercise].weight) || 0;
    const isPR = parseFloat(weight) > currentPR;
    
    this.setData({ isPR, currentPR });
  },

  addRecord() {
    const { selectedExercise, weight, reps, sets, exercises, isPR } = this.data;
    
    if (!selectedExercise || !weight || !reps) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    const exercise = exercises.find(e => e.name === selectedExercise);
    const today = this.getDateStr(new Date());
    const volume = parseFloat(weight) * parseInt(reps) * parseInt(sets || 1);

    const record = {
      exercise: selectedExercise,
      icon: (exercise && exercise.icon) || '🏋️',
      weight: parseFloat(weight),
      reps: parseInt(reps),
      sets: parseInt(sets || 1),
      volume: Math.round(volume),
      date: today,
      time: new Date().toLocaleTimeString(),
      isPR: isPR
    };

    // 保存训练记录
    const workoutRecords = wx.getStorageSync('workoutRecords') || [];
    workoutRecords.push(record);
    wx.setStorageSync('workoutRecords', workoutRecords);
    app.globalData.api.pushData('workoutRecords', workoutRecords);

    // 更新PR记录
    if (isPR) {
      const prRecords = wx.getStorageSync('prRecords') || {};
      prRecords[selectedExercise] = {
        weight: parseFloat(weight),
        reps: parseInt(reps),
        date: today,
        estimated1RM: app.globalData.calculate1RM(parseFloat(weight), parseInt(reps))
      };
      wx.setStorageSync('prRecords', prRecords);
      app.globalData.api.pushData('prRecords', prRecords);

      wx.showToast({ title: '🎉 新PR达成！', icon: 'none' });
      wx.vibrateShort({ type: 'heavy' });
    } else {
      wx.showToast({ title: '记录成功', icon: 'success' });
    }

    // 刷新数据
    this.loadTodayRecords();
    this.loadPRList();
    this.loadHistoryRecords();
    this.loadCheckinData();

    // 检测成就
    app.checkAchievements();

    // 清空输入
    this.setData({
      weight: '',
      reps: '',
      sets: '1',
      isPR: false
    });
  },

  deleteRecord(e) {
    const index = e.currentTarget.dataset.index;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          const workoutRecords = wx.getStorageSync('workoutRecords') || [];
          const today = this.getDateStr(new Date());
          
          // 找到今天的记录并删除指定的那条
          let todayIndex = 0;
          for (let i = 0; i < workoutRecords.length; i++) {
            if (workoutRecords[i].date === today) {
              if (todayIndex === index) {
                workoutRecords.splice(i, 1);
                break;
              }
              todayIndex++;
            }
          }
          
          wx.setStorageSync('workoutRecords', workoutRecords);
          app.globalData.api.pushData('workoutRecords', workoutRecords);
          this.loadTodayRecords();
          this.loadHistoryRecords();
          
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  loadTodayRecords() {
    const workoutRecords = wx.getStorageSync('workoutRecords') || [];
    const today = this.getDateStr(new Date());
    const todayRecords = workoutRecords.filter(r => r.date === today);
    this.setData({ todayRecords });
  },

  loadPRList() {
    const prRecords = wx.getStorageSync('prRecords') || {};
    const prList = Object.entries(prRecords).map(([exercise, data]) => ({
      exercise,
      weight: data.weight,
      date: data.date,
      estimated1RM: data.estimated1RM || app.globalData.calculate1RM(data.weight, data.reps || 1)
    })).sort((a, b) => b.weight - a.weight);
    
    this.setData({ prList });
  },

  loadHistoryRecords() {
    const workoutRecords = wx.getStorageSync('workoutRecords') || [];
    const { selectedFilter } = this.data;
    
    // 按日期分组
    const grouped = {};
    workoutRecords
      .filter(r => selectedFilter === '全部' || r.exercise === selectedFilter)
      .forEach(r => {
        if (!grouped[r.date]) {
          grouped[r.date] = [];
        }
        grouped[r.date].push(r);
      });
    
    // 转换为数组并排序
    const historyRecords = Object.entries(grouped)
      .map(([date, records]) => ({ date, records }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10); // 只显示最近10天
    
    this.setData({ historyRecords });
  },

  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  hideFilter() {
    this.setData({ showFilter: false });
  },

  selectFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ 
      selectedFilter: filter,
      showFilter: false
    });
    this.loadHistoryRecords();
  },

  // ===== 打卡相关 =====

  loadCheckinData() {
    const today = this.getDateStr(new Date());
    const checkinRecords = wx.getStorageSync('checkinRecords') || [];
    const workoutRecords = wx.getStorageSync('workoutRecords') || [];

    // 合并打卡日期（训练记录也算打卡）
    const allDates = new Set();
    checkinRecords.forEach(r => allDates.add(r.date));
    workoutRecords.forEach(r => allDates.add(r.date));

    const todayCheckedIn = allDates.has(today);
    const checkinStreak = this.calculateCheckinStreak(allDates);

    this.setData({ todayCheckedIn, checkinStreak });
    this.generateCalendar();
  },

  doCheckin() {
    if (this.data.todayCheckedIn) {
      wx.showToast({ title: '今天已打卡', icon: 'none' });
      return;
    }

    const today = this.getDateStr(new Date());
    const checkinRecords = wx.getStorageSync('checkinRecords') || [];
    checkinRecords.push({ date: today, time: new Date().toLocaleTimeString() });
    wx.setStorageSync('checkinRecords', checkinRecords);
    app.globalData.api.pushData('checkinRecords', checkinRecords);

    wx.showToast({ title: '打卡成功！', icon: 'success' });
    wx.vibrateShort({ type: 'medium' });
    this.loadCheckinData();

    // 检测成就
    app.checkAchievements();
  },

  toggleCheckinCalendar() {
    this.setData({ showCalendar: !this.data.showCalendar });
  },

  prevMonth() {
    let { calendarYear, calendarMonth } = this.data;
    calendarMonth--;
    if (calendarMonth < 1) {
      calendarMonth = 12;
      calendarYear--;
    }
    this.setData({ calendarYear, calendarMonth });
    this.generateCalendar();
  },

  nextMonth() {
    let { calendarYear, calendarMonth } = this.data;
    calendarMonth++;
    if (calendarMonth > 12) {
      calendarMonth = 1;
      calendarYear++;
    }
    this.setData({ calendarYear, calendarMonth });
    this.generateCalendar();
  },

  generateCalendar() {
    const { calendarYear, calendarMonth } = this.data;

    // 获取所有打卡日期
    const checkinRecords = wx.getStorageSync('checkinRecords') || [];
    const workoutRecords = wx.getStorageSync('workoutRecords') || [];
    const allDates = new Set();
    checkinRecords.forEach(r => allDates.add(r.date));
    workoutRecords.forEach(r => allDates.add(r.date));

    const today = this.getDateStr(new Date());
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1);
    const lastDay = new Date(calendarYear, calendarMonth, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const calendarDays = [];

    // 上月填充
    const prevMonthLastDay = new Date(calendarYear, calendarMonth - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const pm = calendarMonth - 1 < 1 ? 12 : calendarMonth - 1;
      const py = calendarMonth - 1 < 1 ? calendarYear - 1 : calendarYear;
      const dateStr = `${py}-${String(pm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      calendarDays.push({
        day: day,
        isCurrentMonth: false,
        isToday: false,
        hasCheckin: allDates.has(dateStr)
      });
    }

    // 本月
    let monthCheckinCount = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const hasCheckin = allDates.has(dateStr);
      if (hasCheckin) monthCheckinCount++;
      calendarDays.push({
        day: i,
        isCurrentMonth: true,
        isToday: dateStr === today,
        hasCheckin: hasCheckin
      });
    }

    // 下月填充
    const remaining = 42 - calendarDays.length;
    for (let i = 1; i <= remaining; i++) {
      const nm = calendarMonth + 1 > 12 ? 1 : calendarMonth + 1;
      const ny = calendarMonth + 1 > 12 ? calendarYear + 1 : calendarYear;
      const dateStr = `${ny}-${String(nm).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      calendarDays.push({
        day: i,
        isCurrentMonth: false,
        isToday: false,
        hasCheckin: allDates.has(dateStr)
      });
    }

    this.setData({ calendarDays, monthCheckinCount });
  },

  calculateCheckinStreak(allDates) {
    const datesArray = [...allDates].sort((a, b) => new Date(b) - new Date(a));
    if (datesArray.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = this.getDateStr(new Date(today.getTime() - i * 86400000));
      if (allDates.has(checkDate)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  },

  getDateStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
