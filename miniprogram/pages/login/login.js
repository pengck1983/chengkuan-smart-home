const api = require("../../utils/api");

Page({
  data: {
    loading: false,
    errorText: ""
  },

  onLoad() {
    const app = getApp();
    if (app.globalData.token) {
      this.goNext();
    }
  },

  login() {
    if (this.data.loading) {
      return;
    }

    this.setData({
      loading: true,
      errorText: ""
    });

    wx.login({
      success: (result) => {
        if (!result.code) {
          this.setData({
            loading: false,
            errorText: "微信登录失败，请重试"
          });
          return;
        }

        api.loginWithWechatCode(result.code)
          .then((session) => {
            getApp().setSession(session);
            this.goNext();
          })
          .catch((error) => {
            this.setData({
              loading: false,
              errorText: error.message || "登录失败"
            });
          });
      },
      fail: (error) => {
        this.setData({
          loading: false,
          errorText: error.errMsg || "微信登录失败"
        });
      }
    });
  },

  continueAsGuest() {
    wx.setStorageSync("guestMode", true);
    this.goNext();
  },

  goNext() {
    wx.switchTab({
      url: "/pages/index/index"
    });
  }
});
