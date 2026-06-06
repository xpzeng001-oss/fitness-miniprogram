Page({
  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }

    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  openWeight() {
    wx.navigateTo({
      url: '/pages/weight/weight'
    })
  },

  openCalculator() {
    wx.navigateTo({
      url: '/pages/calculator/calculator'
    })
  }
})
