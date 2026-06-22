App({
  globalData: {
    token: "",
    user: null,
    gateway: null
  },

  onLaunch() {
    this.globalData.token = wx.getStorageSync("token") || "";
    this.globalData.user = wx.getStorageSync("user") || null;
    this.globalData.gateway = wx.getStorageSync("gateway") || null;
  },

  setSession(session) {
    const token = session && session.token ? session.token : "";
    const user = session && session.user ? session.user : null;
    this.globalData.token = token;
    this.globalData.user = user;
    wx.setStorageSync("token", token);
    wx.setStorageSync("user", user);
    wx.removeStorageSync("guestMode");
  },

  setGateway(gateway) {
    this.globalData.gateway = gateway || null;
    wx.setStorageSync("gateway", gateway || null);
  },

  clearSession() {
    this.globalData.token = "";
    this.globalData.user = null;
    this.globalData.gateway = null;
    wx.removeStorageSync("token");
    wx.removeStorageSync("user");
    wx.removeStorageSync("gateway");
    wx.removeStorageSync("guestMode");
  }
});
