// utils/api.js — 后端 API 通信模块
const BASE_URL = 'https://xckjsoft.cn';

// ========== 通用请求封装 ==========

/** 获取当前 token（内存优先，fallback 到本地存储） */
function getToken() {
  return wx.getStorageSync('token') || '';
}

/**
 * 封装 wx.request，自动带 Authorization header
 * @param {Object} opts - 同 wx.request 参数，额外支持 skipAuth
 * @returns {Promise}
 */
function request(opts) {
  const token = getToken();
  if (!opts.skipAuth && !token) {
    return Promise.reject(new Error('no token'));
  }
  const header = Object.assign(
    { 'content-type': 'application/json' },
    opts.header || {},
    token && !opts.skipAuth ? { Authorization: 'Bearer ' + token } : {}
  );
  return new Promise((resolve, reject) => {
    wx.request({
      url: opts.url.startsWith('http') ? opts.url : BASE_URL + opts.url,
      method: opts.method || 'GET',
      data: opts.data,
      header,
      success: (res) => resolve(res),
      fail: (err) => reject(err)
    });
  });
}

// ========== 业务方法 ==========

/** wx.login → 服务端换 token，返回 { isNewUser } */
function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) return reject(new Error('wx.login failed'));
        request({
          url: '/api/login',
          method: 'POST',
          data: { code: loginRes.code },
          skipAuth: true
        }).then((res) => {
          if (res.statusCode === 200 && res.data.token) {
            wx.setStorageSync('token', res.data.token);
            resolve({ isNewUser: res.data.isNewUser });
          } else {
            reject(new Error((res.data && res.data.error) || 'login failed'));
          }
        }).catch(reject);
      },
      fail: (err) => reject(err)
    });
  });
}

/** 推送单个 key 的数据到服务器 */
function pushData(key, value) {
  request({
    url: '/api/data/' + key,
    method: 'PUT',
    data: { value }
  }).catch(() => {}); // 静默失败，不影响本地体验
}

/** 推送所有本地数据到服务器 */
function pushAll() {
  const keys = ['workoutRecords', 'prRecords', 'weightRecords', 'checkinRecords', 'achievements', 'userData', 'goalWeight'];
  const data = {};
  keys.forEach(key => {
    const val = wx.getStorageSync(key);
    if (val !== '' && val !== undefined) data[key] = val;
  });
  request({
    url: '/api/data',
    method: 'PUT',
    data: { data }
  }).catch(() => {});
}

/** 从服务器拉取所有数据并写入本地存储 */
function pullAll() {
  return request({
    url: '/api/data',
    method: 'GET'
  }).then((res) => {
    if (res.statusCode === 200 && res.data && res.data.data) {
      const data = res.data.data;
      Object.keys(data).forEach(key => {
        wx.setStorageSync(key, data[key]);
      });
    }
  }).catch(() => {}); // 失败不阻塞启动
}

/** 清空服务器端数据 */
function clearData() {
  request({
    url: '/api/data',
    method: 'DELETE'
  }).catch(() => {});
}

module.exports = { request, login, pushData, pushAll, pullAll, clearData };
