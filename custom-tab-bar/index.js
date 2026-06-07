Component({
  data: {
    selected: 0,
    hidden: false,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '家',
        icon: 'home'
      },
      {
        pagePath: '/pages/exercises/exercises',
        text: '动作库',
        icon: 'library'
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        icon: 'profile'
      }
    ]
  },

  lifetimes: {
    attached() {
      this.updateSelected()
    }
  },

  pageLifetimes: {
    show() {
      this.updateSelected()
    }
  },

  methods: {
    updateSelected() {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      if (!currentPage) return

      const route = '/' + currentPage.route
      const selected = this.data.list.findIndex(item => item.pagePath === route)
      if (selected !== -1 && selected !== this.data.selected) {
        this.setData({ selected })
      }
    },

    switchTab(e) {
      const index = Number(e.currentTarget.dataset.index)
      const item = this.data.list[index]
      if (!item) return

      wx.switchTab({
        url: item.pagePath
      })
    },

    setHidden(hidden) {
      this.setData({ hidden: !!hidden })
    }
  }
})
