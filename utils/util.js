/**
 * 工具函数集合
 */

/**
 * 格式化日期
 * @param {Date} date 日期对象
 * @param {string} format 格式字符串
 * @returns {string} 格式化后的日期字符串
 */
const formatDate = (date, format = 'YYYY-MM-DD') => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * 计算1RM (Epley公式)
 * @param {number} weight 重量
 * @param {number} reps 次数
 * @returns {number} 预估1RM
 */
const calculate1RM = (weight, reps) => {
  if (reps === 1) return weight;
  if (reps > 30) return 0;
  return Math.round(weight * (1 + reps / 30));
};

/**
 * 计算训练容量
 * @param {number} weight 重量
 * @param {number} reps 次数
 * @param {number} sets 组数
 * @returns {number} 总容量
 */
const calculateVolume = (weight, reps, sets) => {
  return weight * reps * sets;
};

/**
 * 获取问候语
 * @returns {string} 根据时间返回问候语
 */
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了，注意休息';
  if (hour < 12) return '早上好，活力满满';
  if (hour < 14) return '中午好，补充能量';
  if (hour < 18) return '下午好，继续加油';
  if (hour < 22) return '晚上好，今天训练了吗';
  return '夜深了，早点休息';
};

/**
 * 计算连续打卡天数
 * @param {Array} dates 日期数组 (格式: YYYY-MM-DD)
 * @returns {number} 连续天数
 */
const calculateStreak = (dates) => {
  if (!dates || dates.length === 0) return 0;
  
  const sortedDates = [...dates].sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 365; i++) {
    const checkDate = formatDate(new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000), 'YYYY-MM-DD');
    if (sortedDates.includes(checkDate)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  
  return streak;
};

/**
 * 防抖函数
 * @param {Function} func 要执行的函数
 * @param {number} wait 等待时间
 * @returns {Function} 防抖后的函数
 */
const debounce = (func, wait = 300) => {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

/**
 * 节流函数
 * @param {Function} func 要执行的函数
 * @param {number} limit 时间限制
 * @returns {Function} 节流后的函数
 */
const throttle = (func, limit = 300) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 数组去重
 * @param {Array} arr 数组
 * @param {string} key 去重的键 (对象数组时使用)
 * @returns {Array} 去重后的数组
 */
const unique = (arr, key = null) => {
  if (key) {
    const map = new Map();
    arr.forEach(item => map.set(item[key], item));
    return Array.from(map.values());
  }
  return [...new Set(arr)];
};

/**
 * 数值范围限制
 * @param {number} num 数值
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {number} 限制后的数值
 */
const clamp = (num, min, max) => {
  return Math.min(Math.max(num, min), max);
};

module.exports = {
  formatDate,
  calculate1RM,
  calculateVolume,
  getGreeting,
  calculateStreak,
  debounce,
  throttle,
  unique,
  clamp
};
