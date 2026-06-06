const api = require('../../utils/api')
const fallbackLibrary = require('./library')

const MUSCLE_ORDER = ['胸', '背', '肩', '臂', '腿', '臀', '核心']
const EQUIPMENT_ORDER = ['杠铃', '哑铃', '器械', '绳索', '史密斯', '弹力带', '壶铃', '自重', '双杠', '凳']
const SUB_MUSCLE_ORDER = {
  '胸': ['上胸', '中胸', '下胸', '胸内侧', '胸'],
  '背': ['背阔肌', '中背', '下背阔', '上背'],
  '肩': ['前束', '中束', '后束', '肩部综合'],
  '臂': ['肱二头肌', '肱肌', '肱三头肌', '手臂综合'],
  '腿': ['大腿前侧', '大腿后侧', '单腿稳定', '小腿', '腿部综合'],
  '臀': ['臀大肌', '臀中肌', '臀后侧', '臀腿综合', '臀部综合'],
  '核心': ['上腹', '下腹', '腹斜肌', '核心稳定', '核心综合']
}

Page({
  data: {
    membership: { level: 'free', active: false },
    selectedMuscle: '',
    selectedSubMuscle: '全部',
    selectedEquipment: '',
    searchVisible: false,
    searchKeyword: '',
    muscleGroups: [],
    equipmentGroups: [],
    exercises: [],
    groupedExercises: [],
    detailVisible: false,
    activeExercise: null
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
        this.applyExerciseData(
          this.resolveExerciseLibrary(data.exercises || []),
          data.membership || { level: 'free', active: false }
        )
      })
      .catch(() => {
        this.applyExerciseData(this.getExerciseLibrary(), { level: 'free', active: false })
      })
  },

  getExerciseLibrary() {
    return fallbackLibrary
  },

  resolveExerciseLibrary(apiExercises) {
    if (!apiExercises || apiExercises.length < fallbackLibrary.length) {
      return fallbackLibrary
    }

    const localById = fallbackLibrary.reduce((result, item) => {
      result[item.id] = item
      return result
    }, {})

    return apiExercises.map(item => ({
      ...(localById[item.id] || {}),
      ...item,
      thumbPath: item.thumbPath || (localById[item.id] && localById[item.id].thumbPath) || ''
    }))
  },

  applyExerciseData(exercises, membership) {
    const viewExercises = exercises.map(item => ({
      ...item,
      displayThumb: item.thumbUrl || item.thumbPath || ''
    }))
    const filterState = this.buildFilterState(viewExercises, this.data.selectedMuscle, this.data.selectedEquipment)
    this.setData({
      membership,
      exercises: viewExercises,
      ...filterState
    })
    this.updateVisibleExercises()
  },

  buildFilterState(exercises, preferredMuscle, preferredEquipment) {
    const muscleNames = this.sortByOrder([...new Set(exercises.map(item => item.muscle))], MUSCLE_ORDER)
    const selectedMuscle = muscleNames.indexOf(preferredMuscle) !== -1 ? preferredMuscle : (muscleNames[0] || '')
    const muscleItems = exercises.filter(item => item.muscle === selectedMuscle)
    const equipmentNames = this.sortByOrder([...new Set(muscleItems.map(item => item.equipment))], EQUIPMENT_ORDER)
    const selectedEquipment = equipmentNames.indexOf(preferredEquipment) !== -1 ? preferredEquipment : (equipmentNames[0] || '')

    const muscleGroups = muscleNames.map(name => {
      const list = exercises.filter(item => item.muscle === name)
      const subCounts = list.reduce((result, item) => {
        result[item.subMuscle] = (result[item.subMuscle] || 0) + 1
        return result
      }, {})
      const children = [
        { name: '全部', count: list.length },
        ...Object.keys(subCounts)
          .sort((a, b) => this.compareByOrder(a, b, SUB_MUSCLE_ORDER[name] || []))
          .map(sub => ({ name: sub, count: subCounts[sub] }))
      ]

      return {
        name,
        count: list.length,
        expanded: name === selectedMuscle,
        children
      }
    })

    return {
      selectedMuscle,
      selectedSubMuscle: '全部',
      selectedEquipment,
      muscleGroups,
      equipmentGroups: equipmentNames
    }
  },

  sortByOrder(values, order) {
    return values.sort((a, b) => this.compareByOrder(a, b, order))
  },

  compareByOrder(a, b, order) {
    const ai = order.indexOf(a)
    const bi = order.indexOf(b)
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    }
    return a.localeCompare(b, 'zh-Hans-CN')
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
    const filterState = this.buildFilterState(this.data.exercises, muscle, '')

    this.setData(filterState)
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

    this.setData({
      detailVisible: true,
      activeExercise: this.buildExerciseDetail(exercise, { loadingAssets: true, videoUrl: '' })
    })

    api.getExerciseAssets(id)
      .then(assets => {
        this.setData({
          activeExercise: this.buildExerciseDetail({
            ...exercise,
            displayThumb: assets.thumbUrl || exercise.displayThumb,
            videoUrl: assets.videoUrl || ''
          }, { loadingAssets: false })
        })
      })
      .catch(err => {
        this.setData({
          activeExercise: {
            ...this.data.activeExercise,
            loadingAssets: false,
            assetError: err.message === 'membership required' ? '需要会员权限' : ''
          }
        })
      })
  },

  closeExerciseDetail() {
    this.setData({
      detailVisible: false,
      activeExercise: null
    })
  },

  buildExerciseDetail(exercise, extra) {
    const focusLabel = exercise.subMuscle.indexOf('为主') !== -1
      ? exercise.subMuscle
      : exercise.subMuscle + '为主'
    const assistMuscles = this.getAssistMuscles(exercise)

    return {
      ...exercise,
      ...extra,
      focusLabel,
      difficulty: exercise.isPro ? '进阶' : '入门',
      assistMuscles,
      cues: this.getExerciseCues(exercise),
      mistakes: this.getExerciseMistakes(exercise)
    }
  },

  getAssistMuscles(exercise) {
    const map = {
      '胸': ['肩', '臂'],
      '背': ['臂', '肩'],
      '肩': ['臂', '斜方'],
      '臂': ['肩', '前臂'],
      '腿': ['臀', '核心'],
      '臀': ['腿', '核心'],
      '核心': ['髋', '肩']
    }
    return map[exercise.muscle] || []
  },

  getExerciseCues(exercise) {
    const equipmentText = exercise.equipment === '自重' ? '身体' : exercise.equipment
    return [
      `起始时稳定身体，让${exercise.subMuscle}保持主动发力`,
      `动作过程中控制${equipmentText}轨迹，避免借力晃动`,
      '还原时放慢速度，保持目标肌群持续张力'
    ]
  },

  getExerciseMistakes(exercise) {
    const equipmentText = exercise.equipment === '自重' ? '身体' : exercise.equipment
    return [
      `${equipmentText}移动过快，失去控制`,
      '为了完成次数牺牲动作幅度',
      '核心松散，身体姿态不稳定'
    ]
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
