# FitTracker Pro - 健身微信小程序

一款功能全面的健身追踪微信小程序，帮助用户记录训练、追踪PR、管理体重。

## 📱 功能特性

### 1. 训练记录 + PR 追踪
- ✅ 记录每日训练（动作、重量、次数、组数）
- ✅ 自动计算训练容量
- ✅ PR（个人记录）自动检测与保存
- ✅ 历史记录查看与筛选
- ✅ 训练动作分类管理

### 2. 1RM 计算器 + 训练重量推荐
- ✅ 基于 Epley 公式计算预估 1RM
- ✅ 智能训练重量推荐（力量/增肌/耐力/热身）
- ✅ 完整百分比对照表
- ✅ 一键保存为 PR 记录
- ✅ 公式说明与使用建议

### 3. 减脂打卡 + 体重曲线
- ✅ 每日体重打卡记录
- ✅ 连续打卡天数统计
- ✅ 可视化体重变化曲线
- ✅ 多周期数据统计（周/月）
- ✅ 目标体重设置与进度追踪

## 🎨 设计特点

- **深色主题**：护眼舒适的深色界面
- **活力配色**：橙色主色调，绿色成功提示
- **流畅动画**：精心设计的过渡动画效果
- **响应式布局**：适配各种屏幕尺寸

## 📁 项目结构

```
fitness-miniprogram/
├── app.js                 # 小程序入口
├── app.json              # 全局配置
├── app.wxss              # 全局样式
├── project.config.json   # 项目配置
├── sitemap.json          # 站点地图
├── images/               # 图片资源
│   ├── home.png         # TabBar 图标
│   ├── home-active.png
│   ├── workout.png
│   ├── workout-active.png
│   ├── calc.png
│   ├── calc-active.png
│   ├── weight.png
│   └── weight-active.png
├── pages/
│   ├── index/           # 首页
│   │   ├── index.js
│   │   ├── index.json
│   │   ├── index.wxml
│   │   └── index.wxss
│   ├── workout/         # 训练记录
│   │   ├── workout.js
│   │   ├── workout.json
│   │   ├── workout.wxml
│   │   └── workout.wxss
│   ├── calculator/      # 1RM计算器
│   │   ├── calculator.js
│   │   ├── calculator.json
│   │   ├── calculator.wxml
│   │   └── calculator.wxss
│   └── weight/          # 体重管理
│       ├── weight.js
│       ├── weight.json
│       ├── weight.wxml
│       └── weight.wxss
└── utils/
    └── util.js          # 工具函数
```

## 🚀 使用方法

### 1. 导入项目
1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开微信开发者工具，选择「导入项目」
3. 选择项目目录，填入你的 AppID
4. 点击「导入」

### 2. 添加 TabBar 图标
项目需要以下图标文件（建议尺寸 81x81 像素）：

| 文件名 | 用途 |
|--------|------|
| home.png | 首页图标（未选中） |
| home-active.png | 首页图标（选中） |
| workout.png | 训练图标（未选中） |
| workout-active.png | 训练图标（选中） |
| calc.png | 计算器图标（未选中） |
| calc-active.png | 计算器图标（选中） |
| weight.png | 体重图标（未选中） |
| weight-active.png | 体重图标（选中） |

推荐使用 [iconfont](https://www.iconfont.cn/) 或 [Icons8](https://icons8.com/) 下载图标。

### 3. 配置 AppID
在 `project.config.json` 中修改 `appid` 为你的小程序 AppID：
```json
{
  "appid": "你的AppID"
}
```

### 4. 预览与发布
- 点击「预览」生成二维码，手机扫码预览
- 点击「上传」将代码上传到微信公众平台
- 在微信公众平台提交审核

## 📊 数据存储

所有数据使用微信本地存储 (wx.setStorageSync)：

| Key | 说明 |
|-----|------|
| workoutRecords | 训练记录 |
| prRecords | PR 记录 |
| weightRecords | 体重记录 |
| checkinRecords | 打卡记录 |
| goalWeight | 目标体重 |

## 🔧 自定义配置

### 修改训练动作
在 `app.js` 的 `globalData.exercises` 中添加或修改动作：

```javascript
exercises: [
  { id: 1, name: '深蹲', category: '腿部', icon: '🦵' },
  { id: 2, name: '卧推', category: '胸部', icon: '💪' },
  // 添加更多动作...
]
```

### 修改主题颜色
在 `app.wxss` 中修改 CSS 变量：

```css
page {
  --primary-color: #ff6b35;     /* 主色调 */
  --secondary-color: #00d4aa;   /* 辅助色 */
  --bg-dark: #0f0f1a;           /* 背景色 */
  /* 更多变量... */
}
```

## 📝 更新日志

### v1.0.0 (2025-01-27)
- 🎉 首次发布
- ✨ 训练记录功能
- ✨ 1RM 计算器功能
- ✨ 体重管理功能
- ✨ 打卡统计功能

## 📄 开源协议

MIT License

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

---

**FitTracker Pro** - 让每一次训练都有迹可循 💪
