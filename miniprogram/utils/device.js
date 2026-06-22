function normalizeDevice(device) {
  const state = device.state || {};
  const type = device.type || inferType(state);
  const on = getSwitchState(state);
  return {
    gatewayMac: device.gatewayMac || "",
    deviceId: device.deviceId,
    name: device.name || getTypeName(type),
    type,
    typeName: getTypeName(type),
    room: device.room || "全屋",
    online: device.online !== false,
    onlineText: device.online === false ? "离线" : "在线",
    on,
    nextOn: !on,
    statusText: getStatusText(type, state, on),
    summaryText: getSummaryText(type, state, on),
    primaryValue: getPrimaryValue(type, state),
    metrics: getMetrics(type, state),
    state
  };
}

function getTypeName(type) {
  if (type === "meterSocket") return "计量插座";
  if (type === "sensor") return "环境传感器";
  if (type === "light") return "智能彩灯";
  if (type === "speaker") return "语音喇叭";
  return "智能设备";
}

function inferType(state) {
  const text = JSON.stringify(state || {}).toLowerCase();
  if (text.indexOf("rms_voltage") !== -1 || text.indexOf("switches") !== -1) return "meterSocket";
  if (text.indexOf("temperature") !== -1 || text.indexOf("humidity") !== -1 || text.indexOf("illuminance") !== -1) return "sensor";
  if (text.indexOf("brightness") !== -1 || text.indexOf("colortemp") !== -1 || text.indexOf("hue") !== -1) return "light";
  return "unknown";
}

function getSwitchState(state) {
  const switches = Array.isArray(state.switches) ? state.switches : [];
  const value = switches.length ? switches[0].switch : (state.switch || state.state);
  if (value === true || value === 1 || value === "1" || String(value).toLowerCase() === "on") {
    return true;
  }
  if (value === false || value === 0 || value === "0" || String(value).toLowerCase() === "off") {
    return false;
  }
  return false;
}

function getStatusText(type, state, on) {
  if (type === "meterSocket" || type === "light") {
    return on ? "已开启" : "已关闭";
  }
  if (type === "sensor") {
    const hasData = pick(state, ["temperature", "temp", "humidity", "Illuminance", "illuminance", "battery"]) !== null;
    return hasData ? "环境数据已更新" : "等待上报";
  }
  if (type === "speaker") {
    return "可播报";
  }
  return "等待上报";
}

function getSummaryText(type, state, on) {
  if (type === "meterSocket") {
    const power = formatValue(pick(state, ["activePowerA", "power"]), "W");
    return (on ? "开启" : "关闭") + " · " + power;
  }
  if (type === "sensor") {
    const humidity = formatValue(scaleBy100(pick(state, ["humidity"])), "%");
    const light = formatValue(pick(state, ["Illuminance", "illuminance", "lux"]), "lux");
    return "湿度 " + humidity + " · 照度 " + light;
  }
  if (type === "light") {
    const brightness = formatValue(pick(state, ["brightness"]), "%");
    return (on ? "开启" : "关闭") + " · 亮度 " + brightness;
  }
  if (type === "speaker") {
    return "在线 · 支持文字与警示音";
  }
  return "在线";
}

function getPrimaryValue(type, state) {
  if (type === "meterSocket") {
    return formatValue(pick(state, ["RMS_VoltageA", "voltage"]), "V");
  }
  if (type === "sensor") {
    return formatValue(scaleBy100(pick(state, ["temperature", "temp"])), "℃");
  }
  if (type === "light") {
    return formatValue(pick(state, ["brightness"]), "%");
  }
  if (type === "speaker") {
    return "播报";
  }
  return "--";
}

function getMetrics(type, state) {
  if (type === "meterSocket") {
    return [
      ["电压", formatValue(pick(state, ["RMS_VoltageA", "voltage"]), "V")],
      ["电流", formatValue(pick(state, ["RMS_CurrentA", "current"]), "A")],
      ["功率", formatValue(pick(state, ["activePowerA", "power"]), "W")],
      ["电量", formatValue(pick(state, ["electricalEnergy", "energy"]), "度")]
    ];
  }
  if (type === "sensor") {
    return [
      ["温度", formatValue(scaleBy100(pick(state, ["temperature", "temp"])), "℃")],
      ["湿度", formatValue(scaleBy100(pick(state, ["humidity"])), "%")],
      ["照度", formatValue(pick(state, ["Illuminance", "illuminance", "lux"]), "lux")],
      ["电池", formatValue(pick(state, ["battery", "batteryPercentage"]), "%")]
    ];
  }
  if (type === "light") {
    return [
      ["亮度", formatValue(pick(state, ["brightness"]), "%")],
      ["色温", formatValue(pick(state, ["colorTemp"]), "%")],
      ["色相", formatValue(pick(state, ["hue"]), "")],
      ["饱和度", formatValue(pick(state, ["saturation"]), "%")]
    ];
  }
  return [];
}

function pick(source, keys) {
  for (let i = 0; i < keys.length; i += 1) {
    const value = source[keys[i]];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

function formatValue(value, unit) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  return String(value) + (unit ? " " + unit : "");
}

function scaleBy100(value) {
  if (value === null || value === undefined || value === "") {
    return value;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return value;
  }
  return Math.round(number) / 100;
}

module.exports = {
  normalizeDevice,
  getMetrics,
  getSwitchState,
  pick,
  scaleBy100,
  formatValue
};
