const ACHIEVEMENTS = [
  { id: 1, type: "free", icon: "💪", title: "首次训练", description: "开始健身之旅", condition: { type: "workout_count", value: 1 } },
  { id: 2, type: "free", icon: "🔥", title: "连续3天", description: "保持热情", condition: { type: "streak", value: 3 } },
  { id: 3, type: "free", icon: "🔥", title: "连续7天", description: "养成习惯", condition: { type: "streak", value: 7 } },
  { id: 4, type: "free", icon: "🎯", title: "首次PR", description: "打破记录", condition: { type: "pr_count", value: 1 } },
  { id: 5, type: "free", icon: "🎯", title: "5次PR", description: "持续进步", condition: { type: "pr_count", value: 5 } },
  { id: 6, type: "free", icon: "📝", title: "10次训练", description: "坚持不懈", condition: { type: "workout_count", value: 10 } },
  { id: 7, type: "free", icon: "📝", title: "30次训练", description: "健身达人", condition: { type: "workout_count", value: 30 } },
  { id: 8, type: "free", icon: "💪", title: "深蹲100kg", description: "力量突破", condition: { type: "exercise_weight", exercise: "深蹲", value: 100 } },
  { id: 9, type: "free", icon: "💪", title: "卧推80kg", description: "胸肌强化", condition: { type: "exercise_weight", exercise: "卧推", value: 80 } },
  { id: 10, type: "free", icon: "👑", title: "连续30天", description: "铁一般的意志", condition: { type: "streak", value: 30 } },
  { id: 11, type: "free", icon: "👑", title: "连续60天", description: "健身已成为生活", condition: { type: "streak", value: 60 } },
  { id: 12, type: "free", icon: "⭐", title: "20次PR", description: "不断超越自我", condition: { type: "pr_count", value: 20 } },
  { id: 13, type: "free", icon: "⭐", title: "50次PR", description: "PR收割机", condition: { type: "pr_count", value: 50 } },
  { id: 14, type: "free", icon: "📊", title: "100次训练", description: "百炼成钢", condition: { type: "workout_count", value: 100 } },
  { id: 15, type: "free", icon: "📊", title: "500次训练", description: "传奇健身者", condition: { type: "workout_count", value: 500 } },
  { id: 16, type: "free", icon: "🏋️", title: "总重100吨", description: "举起了一座山", condition: { type: "total_volume", value: 100000 } },
  { id: 17, type: "free", icon: "🏆", title: "月度训练王", description: "单月训练20次以上", condition: { type: "monthly_workout", value: 20 } },
  { id: 18, type: "free", icon: "💎", title: "全能战士", description: "所有预设动作都有PR", condition: { type: "all_exercises_pr", value: 10 } },
  { id: 19, type: "free", icon: "🌟", title: "年度健身者", description: "连续训练365天", condition: { type: "streak", value: 365 } }
]

module.exports = { ACHIEVEMENTS }
