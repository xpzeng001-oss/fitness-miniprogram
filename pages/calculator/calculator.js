// pages/calculator/calculator.js
const app = getApp();

Page({
  data: {
    exercises: [],
    exerciseNames: [],
    exerciseIndex: 0,
    selectedExercise: '',
    weight: '',
    reps: '',
    oneRM: 0,
    recommendations: {},
    percentTable: [],
    isPRBetter: false,
    isPRSaved: false,
    currentPR: 0
  },

  onLoad() {
    const exercises = app.globalData.exercises;
    const exerciseNames = exercises.map(e => e.name);
    this.setData({ 
      exercises, 
      exerciseNames,
      selectedExercise: exerciseNames[0]
    });
  },

  onShow() {
    // 重置PR保存状态
    if (this.data.oneRM > 0) {
      this.checkPR();
    }
  },

  onExerciseChange(e) {
    const index = e.detail.value;
    const selectedExercise = this.data.exerciseNames[index];
    this.setData({ 
      exerciseIndex: index,
      selectedExercise,
      isPRSaved: false
    });
    
    if (this.data.oneRM > 0) {
      this.checkPR();
    }
  },

  onWeightInput(e) {
    this.setData({ weight: e.detail.value });
  },

  onRepsInput(e) {
    this.setData({ reps: e.detail.value });
  },

  calculate() {
    const { weight, reps } = this.data;
    
    if (!weight || !reps) {
      wx.showToast({ title: '请输入重量和次数', icon: 'none' });
      return;
    }

    const w = parseFloat(weight);
    const r = parseInt(reps);

    if (w <= 0 || r <= 0) {
      wx.showToast({ title: '请输入有效数值', icon: 'none' });
      return;
    }

    if (r > 30) {
      wx.showToast({ title: '次数过多，估算不准确', icon: 'none' });
      return;
    }

    // 计算1RM
    const oneRM = app.globalData.calculate1RM(w, r);
    
    // 获取训练重量推荐
    const recommendations = app.globalData.getRecommendedWeights(oneRM);
    
    // 生成百分比表
    const percentTable = this.generatePercentTable(oneRM);

    this.setData({ 
      oneRM, 
      recommendations, 
      percentTable,
      isPRSaved: false
    });

    this.checkPR();

    wx.vibrateShort({ type: 'medium' });
  },

  generatePercentTable(oneRM) {
    const percentages = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
    const repsAtPercent = {
      100: '1',
      95: '2-3',
      90: '3-4',
      85: '5-6',
      80: '6-8',
      75: '8-10',
      70: '10-12',
      65: '12-15',
      60: '15-18',
      55: '18-20',
      50: '20+'
    };

    return percentages.map(percent => ({
      percent,
      weight: Math.round(oneRM * percent / 100),
      reps: repsAtPercent[percent]
    }));
  },

  checkPR() {
    const { selectedExercise, oneRM } = this.data;
    const prRecords = wx.getStorageSync('prRecords') || {};
    const currentPR = (prRecords[selectedExercise] && prRecords[selectedExercise].estimated1RM) || 0;
    
    this.setData({
      isPRBetter: oneRM > currentPR,
      currentPR
    });
  },

  saveAsPR() {
    const { selectedExercise, weight, reps, oneRM } = this.data;
    
    if (!selectedExercise || !oneRM) return;

    const prRecords = wx.getStorageSync('prRecords') || {};
    const today = this.getDateStr(new Date());

    prRecords[selectedExercise] = {
      weight: parseFloat(weight),
      reps: parseInt(reps),
      estimated1RM: oneRM,
      date: today
    };

    wx.setStorageSync('prRecords', prRecords);
    app.globalData.api.pushData('prRecords', prRecords);

    this.setData({ isPRSaved: true });

    wx.showToast({ title: '🎉 PR已保存！', icon: 'none' });
    wx.vibrateShort({ type: 'heavy' });
  },

  getDateStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
