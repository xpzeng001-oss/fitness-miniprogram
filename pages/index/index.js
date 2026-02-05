// pages/index/index.js
const app = getApp();

Page({
  data: {
    greeting: '',
    currentDate: '',
    todayWorkouts: 0,
    todayVolume: 0,
    prCount: 0,
    streakDays: 0,
    recentPRs: [],
    weightData: [],
    currentWeight: 0,
    weightChange: 0,
    todayCheckin: false
  },

  onLoad() {
    this.setGreeting();
    this.setCurrentDate();
  },

  onShow() {
    this.loadData();
  },

  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour < 6) greeting = '夜深了，注意休息';
    else if (hour < 12) greeting = '早上好，活力满满';
    else if (hour < 14) greeting = '中午好，补充能量';
    else if (hour < 18) greeting = '下午好，继续加油';
    else if (hour < 22) greeting = '晚上好，今天训练了吗';
    else greeting = '夜深了，早点休息';
    
    this.setData({ greeting });
  },

  setCurrentDate() {
    const now = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const currentDate = `${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`;
    this.setData({ currentDate });
  },

  loadData() {
    this.loadTodayStats();
    this.loadRecentPRs();
    this.loadWeightData();
    this.loadCheckinStatus();
    this.calculateStreak();
  },

  loadTodayStats() {
    const workouts = wx.getStorageSync('workoutRecords') || [];
    const today = this.getDateStr(new Date());
    
    const todayRecords = workouts.filter(w => w.date === today);
    const todayWorkouts = todayRecords.length;
    const todayVolume = todayRecords.reduce((sum, w) => sum + (w.weight * w.reps * w.sets), 0);
    
    const prRecords = wx.getStorageSync('prRecords') || {};
    const prCount = Object.keys(prRecords).length;
    
    this.setData({ todayWorkouts, todayVolume, prCount });
  },

  loadRecentPRs() {
    const prRecords = wx.getStorageSync('prRecords') || {};
    const prList = Object.entries(prRecords)
      .map(([exercise, data]) => ({
        exercise,
        weight: data.weight,
        date: data.date,
        timestamp: new Date(data.date).getTime()
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
    
    this.setData({ recentPRs: prList });
  },

  loadWeightData() {
    const weightRecords = wx.getStorageSync('weightRecords') || [];
    
    if (weightRecords.length === 0) {
      this.setData({ weightData: [], currentWeight: 0, weightChange: 0 });
      return;
    }
    
    // 取最近7条记录
    const recent = weightRecords.slice(-7);
    const maxWeight = Math.max(...recent.map(r => r.weight));
    const minWeight = Math.min(...recent.map(r => r.weight));
    const range = maxWeight - minWeight || 1;
    
    const weightData = recent.map(r => ({
      weight: r.weight,
      height: 20 + ((r.weight - minWeight) / range) * 60
    }));
    
    const currentWeight = recent[recent.length - 1].weight;
    
    // 计算周变化
    let weightChange = 0;
    if (recent.length >= 2) {
      const weekAgoIndex = Math.max(0, recent.length - 7);
      weightChange = (currentWeight - recent[weekAgoIndex].weight).toFixed(1);
    }
    
    this.setData({ weightData, currentWeight, weightChange: parseFloat(weightChange) });
  },

  loadCheckinStatus() {
    const checkinRecords = wx.getStorageSync('checkinRecords') || [];
    const today = this.getDateStr(new Date());
    const todayCheckin = checkinRecords.some(r => r.date === today);
    this.setData({ todayCheckin });
  },

  calculateStreak() {
    const checkinRecords = wx.getStorageSync('checkinRecords') || [];
    if (checkinRecords.length === 0) {
      this.setData({ streakDays: 0 });
      return;
    }
    
    // 按日期排序
    const sortedDates = checkinRecords
      .map(r => r.date)
      .sort((a, b) => new Date(b) - new Date(a));
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedDates.length; i++) {
      const checkDate = this.getDateStr(new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000));
      if (sortedDates.includes(checkDate)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    this.setData({ streakDays: streak });
  },

  getDateStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  quickCheckin() {
    const checkinRecords = wx.getStorageSync('checkinRecords') || [];
    const today = this.getDateStr(new Date());
    
    if (checkinRecords.some(r => r.date === today)) {
      wx.showToast({ title: '今日已打卡', icon: 'none' });
      return;
    }
    
    checkinRecords.push({
      date: today,
      time: new Date().toLocaleTimeString()
    });
    
    wx.setStorageSync('checkinRecords', checkinRecords);
    app.globalData.api.pushData('checkinRecords', checkinRecords);

    this.setData({ todayCheckin: true });
    this.calculateStreak();
    
    wx.showToast({ title: '打卡成功！', icon: 'success' });
    
    // 震动反馈
    wx.vibrateShort({ type: 'medium' });
  },

  goToWorkout() {
    wx.switchTab({ url: '/pages/workout/workout' });
  },

  goToCalculator() {
    wx.switchTab({ url: '/pages/calculator/calculator' });
  },

  goToWeight() {
    wx.switchTab({ url: '/pages/weight/weight' });
  }
});
