const serverConfig = require("../config/server");

function request(options) {
  const app = getApp();
  const token = app && app.globalData ? app.globalData.token : "";

  return new Promise((resolve, reject) => {
    wx.request({
      url: serverConfig.apiBaseUrl + options.url,
      method: options.method || "GET",
      data: options.data || {},
      header: Object.assign({
        "content-type": "application/json",
        "Authorization": token ? "Bearer " + token : ""
      }, options.header || {}),
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data || {});
          return;
        }
        reject(new Error(getErrorMessage(res)));
      },
      fail(error) {
        reject(new Error(error.errMsg || "网络请求失败"));
      }
    });
  });
}

function loginWithWechatCode(code) {
  return request({
    url: "/api/login/wechat",
    method: "POST",
    data: { code }
  });
}

function listGateways() {
  return request({
    url: "/api/gateways"
  });
}

function bindGateway(gatewayMac, name) {
  return request({
    url: "/api/gateways",
    method: "POST",
    data: {
      gatewayMac,
      name: name || "家庭网关"
    }
  });
}

function listDevices(gatewayMac) {
  const query = gatewayMac ? "?gatewayMac=" + encodeURIComponent(gatewayMac) : "";
  return request({
    url: "/api/devices" + query
  });
}

function switchDevice(deviceId, on) {
  return request({
    url: "/api/devices/" + encodeURIComponent(deviceId) + "/switch",
    method: "POST",
    data: { on: !!on }
  });
}

function controlLight(deviceId, params) {
  return request({
    url: "/api/devices/" + encodeURIComponent(deviceId) + "/light",
    method: "POST",
    data: params || {}
  });
}

function controlSpeaker(deviceId, command) {
  return request({
    url: "/api/devices/" + encodeURIComponent(deviceId) + "/speaker",
    method: "POST",
    data: command || {}
  });
}

function getDevice(deviceId) {
  return request({
    url: "/api/devices/" + encodeURIComponent(deviceId)
  });
}

function renameDevice(deviceId, name) {
  return request({
    url: "/api/devices/" + encodeURIComponent(deviceId),
    method: "PATCH",
    data: { name }
  });
}

function getDeviceHistory(deviceId) {
  return request({
    url: "/api/devices/" + encodeURIComponent(deviceId) + "/history"
  });
}

function listSchedules(deviceId) {
  return request({
    url: "/api/devices/" + encodeURIComponent(deviceId) + "/schedules"
  });
}

function addSchedule(deviceId, data) {
  return request({
    url: "/api/devices/" + encodeURIComponent(deviceId) + "/schedules",
    method: "POST",
    data
  });
}

function deleteSchedule(scheduleId) {
  return request({
    url: "/api/schedules/" + encodeURIComponent(scheduleId),
    method: "DELETE"
  });
}

function openGatewayJoin(gatewayMac, seconds) {
  return request({
    url: "/api/gateways/" + encodeURIComponent(gatewayMac) + "/permit-join",
    method: "POST",
    data: { seconds: seconds || 180 }
  });
}

function getErrorMessage(res) {
  const data = res.data || {};
  return data.error || data.message || ("请求失败：" + res.statusCode);
}

module.exports = {
  request,
  loginWithWechatCode,
  listGateways,
  bindGateway,
  listDevices,
  switchDevice,
  controlLight,
  controlSpeaker,
  getDevice,
  renameDevice,
  getDeviceHistory,
  listSchedules,
  addSchedule,
  deleteSchedule,
  openGatewayJoin
};
