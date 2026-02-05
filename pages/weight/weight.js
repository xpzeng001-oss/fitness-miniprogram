// pages/weight/weight.js
Page({
  data: {
    inputWeight: '',
    todayCheckin: false,
    todayWeight: '',
    todayTime: '',
    streakDays: 0,
    currentWeight: 0,
    startWeight: 0,
    totalChange: 0,
    weekChange: 0,
    monthChange: 0,
    avgWeight: 0,
    minWeight: 0,
    chartData: [],
    chartMax: 0,
    chartMid: 0,
    chartMin: 0,
    chartPeriod: '30',
    chartPathStyle: '',
    selectedPoint: -1,
    weightRecords: [],
    displayRecords: [],
    displayCount: 10,
    goalWeight: 0,
    goalInput: '',
    goalProgress: 0,
    goalRemaining: 0
  },

  onLoad() {
    this.loadGoal();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    this.loadWeightRecords();
    this.checkTodayCheckin();
    this.calculateStreak();
    this.calculateStats();
    this.generateChartData();
    this.updateGoalProgress();
  },

  loadWeightRecords() {
    const weightRecords = wx.getStorageSync('weightRecords') || [];
    // 按日期排序（最新的在前）
    weightRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    this.setData({ weightRecords });
    this.updateDisplayRecords();
  },

  updateDisplayRecords() {
    const { weightRecords, displayCount } = this.data;
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    const displayRecords = weightRecords.slice(0, displayCount).map((record, index) => {
      const date = new Date(record.date);
      const prevRecord = weightRecords[index + 1];
      const change = prevRecord ? (record.weight - prevRecord.weight).toFixed(1) : 0;
      
      return {
        ...record,
        day: date.getDate(),
        month: `${date.getMonth() + 1}月`,
        weekday: weekdays[date.getDay()],
        change: parseFloat(change)
      };
    });
    
    this.setData({ displayRecords });
  },

  checkTodayCheckin() {
    const weightRecords = wx.getStorageSync('weightRecords') || [];
    const today = this.getDateStr(new Date());
    const todayRecord = weightRecords.find(r => r.date === today);
    
    if (todayRecord) {
      this.setData({
        todayCheckin: true,
        todayWeight: todayRecord.weight,
        todayTime: todayRecord.time
      });
    } else {
      // 预填上次体重
      if (weightRecords.length > 0) {
        this.setData({
          inputWeight: weightRecords[weightRecords.length - 1].weight.toString()
        });
      }
      this.setData({ todayCheckin: false });
    }
  },

  calculateStreak() {
    const checkinRecords = wx.getStorageSync('checkinRecords') || [];
    const weightRecords = wx.getStorageSync('weightRecords') || [];
    
    // 合并两种打卡记录的日期
    const allDates = new Set([
      ...checkinRecords.map(r => r.date),
      ...weightRecords.map(r => r.date)
    ]);
    
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(b) - new Date(a));
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 365; i++) {
      const checkDate = this.getDateStr(new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000));
      if (sortedDates.includes(checkDate)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    this.setData({ streakDays: streak });
  },

  calculateStats() {
    const { weightRecords } = this.data;
    
    if (weightRecords.length === 0) {
      this.setData({
        currentWeight: 0,
        startWeight: 0,
        totalChange: 0,
        weekChange: 0,
        monthChange: 0,
        avgWeight: 0,
        minWeight: 0
      });
      return;
    }
    
    const currentWeight = weightRecords[0].weight;
    const startWeight = weightRecords[weightRecords.length - 1].weight;
    const totalChange = (currentWeight - startWeight).toFixed(1);
    
    // 计算平均值和最小值
    const weights = weightRecords.map(r => r.weight);
    const avgWeight = (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1);
    const minWeight = Math.min(...weights);
    
    // 计算周变化
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = this.getDateStr(weekAgo);
    const weekAgoRecord = weightRecords.find(r => r.date <= weekAgoStr);
    const weekChange = weekAgoRecord ? (currentWeight - weekAgoRecord.weight).toFixed(1) : 0;
    
    // 计算月变化
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthAgoStr = this.getDateStr(monthAgo);
    const monthAgoRecord = weightRecords.find(r => r.date <= monthAgoStr);
    const monthChange = monthAgoRecord ? (currentWeight - monthAgoRecord.weight).toFixed(1) : 0;
    
    this.setData({
      currentWeight,
      startWeight,
      totalChange: parseFloat(totalChange),
      weekChange: parseFloat(weekChange),
      monthChange: parseFloat(monthChange),
      avgWeight: parseFloat(avgWeight),
      minWeight
    });
  },

  generateChartData() {
    const { weightRecords, chartPeriod } = this.data;
    
    if (weightRecords.length === 0) {
      this.setData({ chartData: [] });
      return;
    }
    
    // 根据选择的周期筛选数据
    let filteredRecords = [...weightRecords].reverse();
    
    if (chartPeriod !== 'all') {
      const days = parseInt(chartPeriod);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filteredRecords = filteredRecords.filter(r => new Date(r.date) >= cutoffDate);
    }
    
    if (filteredRecords.length === 0) {
      this.setData({ chartData: [] });
      return;
    }
    
    // 计算图表范围
    const weights = filteredRecords.map(r => r.weight);
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);
    const padding = (maxWeight - minWeight) * 0.1 || 1;
    
    const chartMax = Math.ceil(maxWeight + padding);
    const chartMin = Math.floor(minWeight - padding);
    const chartMid = ((chartMax + chartMin) / 2).toFixed(1);
    const range = chartMax - chartMin;
    
    // 生成图表数据点
    const chartData = filteredRecords.map((record, index) => {
      const x = filteredRecords.length > 1 ? (index / (filteredRecords.length - 1)) * 100 : 50;
      const y = ((record.weight - chartMin) / range) * 100;
      const date = new Date(record.date);
      
      return {
        weight: record.weight,
        x,
        y,
        date: record.date,
        shortDate: `${date.getMonth() + 1}/${date.getDate()}`
      };
    });
    
    // 生成 clip-path 路径
    let clipPath = 'polygon(0 100%, ';
    chartData.forEach((point, index) => {
      clipPath += `${point.x}% ${100 - point.y}%`;
      if (index < chartData.length - 1) clipPath += ', ';
    });
    clipPath += ', 100% 100%)';
    
    this.setData({
      chartData,
      chartMax,
      chartMin,
      chartMid,
      chartPathStyle: `--clip-path: ${clipPath}`
    });
  },

  onWeightInput(e) {
    this.setData({ inputWeight: e.detail.value });
  },

  adjustInputWeight(e) {
    const delta = parseFloat(e.currentTarget.dataset.delta);
    let currentWeight = parseFloat(this.data.inputWeight) || 0;
    currentWeight = Math.max(0, (currentWeight + delta)).toFixed(1);
    this.setData({ inputWeight: currentWeight });
  },

  checkin() {
    const { inputWeight } = this.data;
    
    if (!inputWeight) {
      wx.showToast({ title: '请输入体重', icon: 'none' });
      return;
    }
    
    const weight = parseFloat(inputWeight);
    if (weight <= 0 || weight > 500) {
      wx.showToast({ title: '请输入有效体重', icon: 'none' });
      return;
    }
    
    const today = this.getDateStr(new Date());
    const time = new Date().toLocaleTimeString();
    
    const weightRecords = wx.getStorageSync('weightRecords') || [];
    
    // 检查今天是否已记录
    const existingIndex = weightRecords.findIndex(r => r.date === today);
    if (existingIndex >= 0) {
      weightRecords[existingIndex] = { date: today, weight, time };
    } else {
      weightRecords.push({ date: today, weight, time });
    }
    
    wx.setStorageSync('weightRecords', weightRecords);
    getApp().globalData.api.pushData('weightRecords', weightRecords);

    // 同时记录到打卡记录
    const checkinRecords = wx.getStorageSync('checkinRecords') || [];
    if (!checkinRecords.some(r => r.date === today)) {
      checkinRecords.push({ date: today, time });
      wx.setStorageSync('checkinRecords', checkinRecords);
      getApp().globalData.api.pushData('checkinRecords', checkinRecords);
    }
    
    wx.showToast({ title: '打卡成功！', icon: 'success' });
    wx.vibrateShort({ type: 'medium' });
    
    this.loadData();
  },

  cancelCheckin() {
    wx.showModal({
      title: '撤销打卡',
      content: '确定要撤销今日打卡记录吗？',
      success: (res) => {
        if (res.confirm) {
          const today = this.getDateStr(new Date());

          // 删除今日体重记录
          const weightRecords = wx.getStorageSync('weightRecords') || [];
          const weightIndex = weightRecords.findIndex(r => r.date === today);
          if (weightIndex >= 0) {
            weightRecords.splice(weightIndex, 1);
            wx.setStorageSync('weightRecords', weightRecords);
            getApp().globalData.api.pushData('weightRecords', weightRecords);
          }

          // 删除今日打卡记录
          const checkinRecords = wx.getStorageSync('checkinRecords') || [];
          const checkinIndex = checkinRecords.findIndex(r => r.date === today);
          if (checkinIndex >= 0) {
            checkinRecords.splice(checkinIndex, 1);
            wx.setStorageSync('checkinRecords', checkinRecords);
            getApp().globalData.api.pushData('checkinRecords', checkinRecords);
          }

          this.setData({
            todayCheckin: false,
            todayWeight: '',
            todayTime: '',
            inputWeight: this.data.todayWeight.toString()
          });

          this.loadData();
          wx.showToast({ title: '已撤销', icon: 'success' });
        }
      }
    });
  },

  changePeriod(e) {
    const period = e.currentTarget.dataset.period;
    this.setData({ chartPeriod: period });
    this.generateChartData();
  },

  showPointDetail(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      selectedPoint: this.data.selectedPoint === index ? -1 : index
    });
  },

  deleteRecord(e) {
    const date = e.currentTarget.dataset.date;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条体重记录吗？',
      success: (res) => {
        if (res.confirm) {
          const weightRecords = wx.getStorageSync('weightRecords') || [];
          const index = weightRecords.findIndex(r => r.date === date);
          if (index >= 0) {
            weightRecords.splice(index, 1);
            wx.setStorageSync('weightRecords', weightRecords);
            getApp().globalData.api.pushData('weightRecords', weightRecords);
            this.loadData();
            wx.showToast({ title: '已删除', icon: 'success' });
          }
        }
      }
    });
  },

  loadMore() {
    this.setData({ displayCount: this.data.displayCount + 10 });
    this.updateDisplayRecords();
  },

  loadGoal() {
    const goalWeight = wx.getStorageSync('goalWeight') || 0;
    this.setData({ goalWeight });
  },

  onGoalInput(e) {
    this.setData({ goalInput: e.detail.value });
  },

  setGoal() {
    const { goalInput } = this.data;
    if (!goalInput) {
      wx.showToast({ title: '请输入目标体重', icon: 'none' });
      return;
    }
    
    const goalWeight = parseFloat(goalInput);
    if (goalWeight <= 0 || goalWeight > 500) {
      wx.showToast({ title: '请输入有效目标', icon: 'none' });
      return;
    }
    
    wx.setStorageSync('goalWeight', goalWeight);
    getApp().globalData.api.pushData('goalWeight', goalWeight);
    this.setData({ goalWeight, goalInput: '' });
    this.updateGoalProgress();
    
    wx.showToast({ title: '目标已设置', icon: 'success' });
  },

  resetGoal() {
    wx.showModal({
      title: '重置目标',
      content: '确定要重置目标体重吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('goalWeight');
          this.setData({ goalWeight: 0, goalProgress: 0, goalRemaining: 0 });
        }
      }
    });
  },

  updateGoalProgress() {
    const { currentWeight, startWeight, goalWeight } = this.data;
    
    if (!goalWeight || !currentWeight || !startWeight) {
      this.setData({ goalProgress: 0, goalRemaining: 0 });
      return;
    }
    
    const totalToLose = startWeight - goalWeight;
    const lost = startWeight - currentWeight;
    
    let progress = 0;
    if (totalToLose > 0) {
      progress = Math.min(100, Math.max(0, (lost / totalToLose) * 100));
    } else if (totalToLose < 0) {
      // 增重目标
      const totalToGain = goalWeight - startWeight;
      const gained = currentWeight - startWeight;
      progress = Math.min(100, Math.max(0, (gained / totalToGain) * 100));
    }
    
    const goalRemaining = (currentWeight - goalWeight).toFixed(1);
    
    this.setData({
      goalProgress: progress.toFixed(0),
      goalRemaining: parseFloat(goalRemaining)
    });
  },

  getDateStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
