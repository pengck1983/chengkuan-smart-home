const api = require("../../utils/api");

Page({
  data: {
    gatewayMac: "",
    gatewayName: "家庭网关",
    loading: false,
    errorText: ""
  },

  onLoad(options) {
    this.setData({
      gatewayMac: options.gatewayMac || ""
    });
  },

  onGatewayMacInput(event) {
    this.setData({
      gatewayMac: normalizeMac(event.detail.value)
    });
  },

  onGatewayNameInput(event) {
    this.setData({
      gatewayName: event.detail.value
    });
  },

  scanGateway() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (result) => {
        this.setData({
          gatewayMac: normalizeMac(result.result)
        });
      }
    });
  },

  bindGateway() {
    const gatewayMac = normalizeMac(this.data.gatewayMac);
    if (!gatewayMac) {
      this.setData({ errorText: "请输入网关 MAC" });
      return;
    }

    this.setData({
      loading: true,
      errorText: ""
    });

    api.bindGateway(gatewayMac, this.data.gatewayName)
      .then((result) => {
        const gateway = result.gateway || {
          gatewayMac,
          name: this.data.gatewayName
        };
        getApp().setGateway(gateway);
        wx.switchTab({
          url: "/pages/index/index"
        });
      })
      .catch((error) => {
        this.setData({
          loading: false,
          errorText: error.message || "绑定网关失败"
        });
      });
  }
});

function normalizeMac(value) {
  return String(value || "")
    .trim()
    .replace(/[^0-9a-fA-F]/g, "")
    .toLowerCase();
}
