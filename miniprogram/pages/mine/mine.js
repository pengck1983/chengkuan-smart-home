Page({
  data: {
    user: null,
    gateway: null
  },

  onShow() {
    const app = getApp();
    if (!app.globalData.token) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    this.setData({
      user: app.globalData.user,
      gateway: app.globalData.gateway
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
