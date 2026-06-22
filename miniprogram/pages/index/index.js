const api = require("../../utils/api");
const deviceUtil = require("../../utils/device");

Page({
  data: {
    loading: true,
    errorText: "",
    user: null,
    gateway: null,
    devices: [],
    sensorSummary: "--",
    runningSummary: "运行中 0"
  },

  onShow() {
    this.bootstrap();
  },

  bootstrap() {
    const app = getApp();
    if (!app.globalData.token) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }

    this.setData({
      user: app.globalData.user,
      loading: true,
      errorText: ""
    });

    this.loadGatewayAndDevices();
  },

  loadGatewayAndDevices() {
    api.listGateways()
      .then((result) => {
        const gateways = result.gateways || [];
        if (!gateways.length) {
          getApp().setGateway(null);
          wx.reLaunch({ url: "/pages/gateway/gateway" });
          return Promise.reject(new Error("__redirected__"));
        }

        const gateway = gateways[0];
        getApp().setGateway(gateway);
        this.setData({ gateway });
        return api.listDevices(gateway.gatewayMac);
      })
      .then((result) => {
        const devices = (result.devices || []).map(deviceUtil.normalizeDevice);
        this.setData({
          devices,
          sensorSummary: getSensorSummary(devices),
          runningSummary: getRunningSummary(devices),
          loading: false
        });
      })
      .catch((error) => {
        if (error.message === "__redirected__") {
          return;
        }
        this.setData({
          loading: false,
          errorText: error.message || "加载失败"
        });
      });
  },

  refresh() {
    this.loadGatewayAndDevices();
  },

  addDevice() {
    wx.navigateTo({
      url: "/pages/add-device/add-device"
    });
  },

  openDevice(event) {
    const deviceId = event.currentTarget.dataset.id;
    if (!deviceId) return;
    wx.navigateTo({
      url: "/pages/device/device?deviceId=" + encodeURIComponent(deviceId)
    });
  },

  switchDevice(event) {
    const deviceId = event.currentTarget.dataset.id;
    const type = event.currentTarget.dataset.type;
    const nextOn = parseBool(event.currentTarget.dataset.on);
    if (!deviceId) {
      return;
    }

    const request = type === "light"
      ? api.controlLight(deviceId, { switch: nextOn ? "on" : "off" })
      : api.switchDevice(deviceId, nextOn);

    request
      .then(() => {
        wx.showToast({
          title: "指令已发送",
          icon: "success"
        });
        setTimeout(() => this.refresh(), 600);
      })
      .catch((error) => {
        wx.showToast({
          title: error.message || "控制失败",
          icon: "none"
        });
      });
  }
});

function parseBool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function getSensorSummary(devices) {
  const sensor = devices.find((item) => item.type === "sensor");
  if (!sensor) return "--";
  const temperature = sensor.metrics.find((item) => item[0] === "温度");
  return temperature ? temperature[1] : "--";
}

function getRunningSummary(devices) {
  const count = devices.filter((item) => item.online && (item.type === "meterSocket" || item.type === "light") && item.on).length;
  return "运行中 " + count;
}
