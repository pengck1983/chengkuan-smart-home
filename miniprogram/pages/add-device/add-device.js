const api = require("../../utils/api");
const deviceUtil = require("../../utils/device");

Page({
  data: {
    gateway: null,
    secondsLeft: 0,
    joining: false,
    devices: [],
    errorText: ""
  },

  onLoad() {
    const gateway = getApp().globalData.gateway;
    this.setData({ gateway });
    this.loadDevices();
  },

  onUnload() {
    this.stopTimer();
  },

  startJoin() {
    const gateway = this.data.gateway;
    if (!gateway || !gateway.gatewayMac) {
      this.setData({ errorText: "请先绑定网关" });
      return;
    }
    api.openGatewayJoin(gateway.gatewayMac, 180)
      .then(() => {
        wx.showToast({ title: "网关已进入添加状态", icon: "success" });
        this.setData({
          secondsLeft: 180,
          joining: true,
          errorText: ""
        });
        this.startTimer();
      })
      .catch((error) => {
        this.setData({ errorText: error.message || "开启添加失败" });
      });
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      const next = Math.max(0, this.data.secondsLeft - 1);
      this.setData({
        secondsLeft: next,
        joining: next > 0
      });
      if (next % 10 === 0) {
        this.loadDevices();
      }
      if (next <= 0) {
        this.stopTimer();
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  loadDevices() {
    const gateway = this.data.gateway;
    if (!gateway || !gateway.gatewayMac) return;
    api.listDevices(gateway.gatewayMac)
      .then((result) => {
        this.setData({
          devices: (result.devices || []).map(deviceUtil.normalizeDevice)
        });
      });
  },

  openDevice(event) {
    const deviceId = event.currentTarget.dataset.id;
    wx.navigateTo({
      url: "/pages/device/device?deviceId=" + encodeURIComponent(deviceId)
    });
  }
});
