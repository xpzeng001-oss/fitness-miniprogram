const api = require('../../utils/api')

Page({
  data: {
    membership: { level: 'free', active: false },
    selectedMuscle: '胸',
    selectedSubMuscle: '全部',
    selectedEquipment: '杠铃',
    searchVisible: false,
    searchKeyword: '',
    muscleGroups: [
      {
        name: '胸',
        count: 27,
        expanded: true,
        children: [
          { name: '全部', count: 27 },
          { name: '上胸', count: 7 },
          { name: '中胸', count: 13 },
          { name: '下胸', count: 5 },
          { name: '胸内侧', count: 1 },
          { name: '胸', count: 1 }
        ]
      },
      { name: '背', count: 24, expanded: false, children: [] },
      { name: '肩', count: 25, expanded: false, children: [] },
      { name: '臂', count: 28, expanded: false, children: [] },
      { name: '腿', count: 30, expanded: false, children: [] },
      { name: '臀', count: 12, expanded: false, children: [] }
    ],
    equipmentGroups: ['杠铃', '哑铃', '器械', '绳索'],
    exercises: [],
    groupedExercises: []
  },

  onLoad() {
    this.loadExercises()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  loadExercises() {
    api.getExercises()
      .then(data => {
        this.setData({
          membership: data.membership || { level: 'free', active: false },
          exercises: data.exercises || []
        })
        this.updateVisibleExercises()
      })
      .catch(() => {
        this.setData({
          exercises: this.getExerciseLibrary()
        })
        this.updateVisibleExercises()
      })
  },

  getExerciseLibrary() {
    return [
      { id: 1, name: '杠铃卧推', muscle: '胸', subMuscle: '中胸为主', equipment: '杠铃', mark: '胸' },
      { id: 2, name: '上斜杠铃卧推', muscle: '胸', subMuscle: '上胸', equipment: '杠铃', mark: '胸' },
      { id: 3, name: '杠铃下斜卧推', muscle: '胸', subMuscle: '下胸', equipment: '杠铃', mark: '胸' },
      { id: 4, name: '哑铃卧推', muscle: '胸', subMuscle: '中胸为主', equipment: '哑铃', mark: '胸' },
      { id: 5, name: '上斜哑铃卧推', muscle: '胸', subMuscle: '上胸', equipment: '哑铃', mark: '胸' },
      { id: 6, name: '坐姿推胸', muscle: '胸', subMuscle: '中胸为主', equipment: '器械', mark: '胸' },
      { id: 7, name: '蝴蝶机夹胸', muscle: '胸', subMuscle: '胸内侧', equipment: '器械', mark: '胸' },
      { id: 8, name: '绳索夹胸', muscle: '胸', subMuscle: '胸内侧', equipment: '绳索', mark: '胸' },
      { id: 9, name: '高位下拉', muscle: '背', subMuscle: '背阔肌', equipment: '器械', mark: '背' },
      { id: 10, name: '杠铃划船', muscle: '背', subMuscle: '中背', equipment: '杠铃', mark: '背' },
      { id: 11, name: '哑铃划船', muscle: '背', subMuscle: '中背', equipment: '哑铃', mark: '背' },
      { id: 12, name: '杠铃推举', muscle: '肩', subMuscle: '前束', equipment: '杠铃', mark: '肩' },
      { id: 13, name: '哑铃侧平举', muscle: '肩', subMuscle: '中束', equipment: '哑铃', mark: '肩' },
      { id: 14, name: '绳索下压', muscle: '臂', subMuscle: '肱三头肌', equipment: '绳索', mark: '臂' },
      { id: 15, name: '杠铃深蹲', muscle: '腿', subMuscle: '股四头肌', equipment: '杠铃', mark: '腿' },
      { id: 16, name: '腿举', muscle: '腿', subMuscle: '股四头肌', equipment: '器械', mark: '腿' },
      { id: 17, name: '臀推', muscle: '臀', subMuscle: '臀大肌', equipment: '杠铃', mark: '臀' }
    ]
  },

  toggleSearch() {
    this.setData({
      searchVisible: !this.data.searchVisible,
      searchKeyword: ''
    })
    this.updateVisibleExercises()
  },

  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    this.updateVisibleExercises()
  },

  noop() {},

  selectMuscle(e) {
    const muscle = e.currentTarget.dataset.muscle
    const muscleGroups = this.data.muscleGroups.map(group => ({
      ...group,
      expanded: group.name === muscle
    }))

    this.setData({
      selectedMuscle: muscle,
      selectedSubMuscle: '全部',
      muscleGroups
    })
    this.updateVisibleExercises()
  },

  selectSubMuscle(e) {
    this.setData({
      selectedSubMuscle: e.currentTarget.dataset.sub
    })
    this.updateVisibleExercises()
  },

  selectEquipment(e) {
    this.setData({
      selectedEquipment: e.currentTarget.dataset.equipment
    })
    this.updateVisibleExercises()
  },

  openExercise(e) {
    const id = e.currentTarget.dataset.id
    const exercise = this.data.exercises.find(item => item.id === id)
    if (!exercise) return

    if (exercise.locked) {
      wx.showModal({
        title: 'Pro 专属动作',
        content: '开通会员后可查看该动作的图片和演示视频。',
        confirmText: '知道了',
        showCancel: false
      })
      return
    }

    api.getExerciseAssets(id)
      .then(assets => {
        wx.showModal({
          title: exercise.name,
          content: '资源链接已获取，可在详情页接入图片和视频。\n有效期：' + assets.expiresIn + ' 秒',
          showCancel: false
        })
      })
      .catch(err => {
        wx.showToast({
          title: err.message === 'membership required' ? '需要会员权限' : '资源加载失败',
          icon: 'none'
        })
      })
  },

  updateVisibleExercises() {
    const { exercises, selectedMuscle, selectedSubMuscle, selectedEquipment, searchKeyword } = this.data
    const keyword = searchKeyword.trim()
    let visible = exercises.filter(item => item.muscle === selectedMuscle && item.equipment === selectedEquipment)

    if (selectedSubMuscle !== '全部') {
      visible = visible.filter(item => item.subMuscle.indexOf(selectedSubMuscle) !== -1)
    }

    if (keyword) {
      visible = visible.filter(item => item.name.indexOf(keyword) !== -1 || item.subMuscle.indexOf(keyword) !== -1)
    }

    const grouped = this.data.equipmentGroups
      .map(equipment => ({
        equipment,
        list: visible.filter(item => item.equipment === equipment)
      }))
      .filter(group => group.list.length > 0)

    this.setData({
      groupedExercises: grouped
    })
  }
})
