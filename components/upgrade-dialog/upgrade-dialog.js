// components/upgrade-dialog/upgrade-dialog.js
Component({
  properties: {
    show: { type: Boolean, value: false },
    trigger: { type: String, value: 'general' }
  },

  data: {
    config: {}
  },

  observers: {
    'trigger': function (newTrigger) {
      this.updateConfig(newTrigger)
    }
  },

  lifetimes: {
    attached() {
      this.updateConfig(this.data.trigger)
    }
  },

  methods: {
    updateConfig(trigger) {
      const configs = {
        general: {
          icon: '🚀', title: '升级Pro会员', subtitle: '解锁全部功能',
          features: ['无限训练计划', '完整历史数据', '高级数据分析', '云同步多设备', '数据导出备份'],
          confirmText: '立即升级'
        },
        feature_blocked: {
          icon: '🔒', title: '已达免费版上限', subtitle: '升级Pro解锁更多功能',
          features: ['创建无限训练计划', '查看所有历史记录', '访问高级图表分析'],
          confirmText: '解锁Pro功能'
        },
        data_value: {
          icon: '💎', title: '您的数据资产', subtitle: '这些珍贵数据值得永久保存',
          features: ['云端自动备份', '换手机无缝同步', '数据永不丢失', '导出备份到本地'],
          confirmText: '立即保护数据'
        },
        streak_achievement: {
          icon: '🔥', title: '连续训练7天！', subtitle: '您已养成训练习惯',
          features: ['追踪长期进步趋势', '解锁更多成就奖励', '查看完整训练历程'],
          confirmText: '查看我的成长'
        },
        achievement_locked: {
          icon: '🏆', title: '解锁Pro专属成就', subtitle: '还有10个成就等待挑战',
          features: ['完整成就系统', '精美分享卡片', '成就进度追踪', '专属成就徽章'],
          confirmText: '解锁全部成就'
        },
        quota_warning: {
          icon: '⚠️', title: '即将达到上限', subtitle: '升级Pro享受无限制',
          features: ['创建无限训练计划', '保存所有历史记录', '永久保存训练数据'],
          confirmText: '立即升级'
        }
      }
      this.setData({ config: configs[trigger] || configs.general })
    },

    onConfirm() { this.triggerEvent('confirm') },
    onClose() { this.triggerEvent('close') },
    stopPropagation() {},
    preventMove() {}
  }
})
