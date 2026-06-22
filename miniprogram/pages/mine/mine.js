Page({
  data: {
    user: {},
    gateway: {},
    loggedIn: false
  },

  onShow() {
    const app = getApp();
    if (!app.globalData.token) {
      this.setData({
        user: {},
        gateway: {},
        loggedIn: false
      });
      return;
    }
    this.setData({
      user: app.globalData.user || {},
      gateway: app.globalData.gateway || {},
      loggedIn: true
    });
  },

  goToLogin() {
    wx.navigateTo({
      url: "/pages/login/login"
    });
  },

  addGateway() {
    wx.navigateTo({
      url: "/pages/gateway/gateway"
    });
  },

  logout() {
    getApp().clearSession();
    wx.reLaunch({
      url: "/pages/login/login"
    });
  }
});
