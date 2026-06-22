function isGuest(token) {
  return !String(token || "").trim();
}

function createGuestDevices() {
  return [
    {
      deviceId: "demo-socket",
      name: "计量插座示例",
      type: "meterSocket",
      room: "全屋",
      online: false,
      on: false,
      nextOn: true,
      primaryValue: "-- V",
      summaryText: "示例 · 登录后查看",
      demo: true
    },
    {
      deviceId: "demo-sensor",
      name: "环境传感器示例",
      type: "sensor",
      room: "全屋",
      online: false,
      on: false,
      primaryValue: "-- °C",
      summaryText: "示例 · 登录后查看",
      demo: true
    },
    {
      deviceId: "demo-light",
      name: "智能彩灯示例",
      type: "light",
      room: "客厅",
      online: false,
      on: false,
      nextOn: true,
      primaryValue: "-- %",
      summaryText: "示例 · 登录后控制",
      demo: true
    }
  ];
}

module.exports = {
  createGuestDevices,
  isGuest
};
