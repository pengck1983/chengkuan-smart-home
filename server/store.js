const fs = require("fs");
const path = require("path");
const { isSpeakerDevice } = require("./speakerProtocol");

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "db.json");

const initialState = {
  users: [],
  gateways: [],
  devices: [],
  events: [],
  schedules: []
};

let state = load();
normalizeExistingDeviceNames();

function load() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(initialState, null, 2), "utf8");
    return JSON.parse(JSON.stringify(initialState));
  }
  return Object.assign({}, initialState, JSON.parse(fs.readFileSync(dbPath, "utf8")));
}

function save() {
  fs.writeFileSync(dbPath, JSON.stringify(state, null, 2), "utf8");
}

function now() {
  return new Date().toISOString();
}

function normalizeExistingDeviceNames() {
  const counters = {};
  let changed = false;
  state.devices.forEach((device) => {
    const detectedType = inferDeviceType(device, device.type);
    if (detectedType !== device.type) {
      device.type = detectedType;
      changed = true;
    }
    const key = device.gatewayMac + ":" + device.type;
    counters[key] = (counters[key] || 0) + 1;
    if (device.type === "meterSocket" && device.name === "计量插座") {
      device.name = "计量插座 " + pad2(counters[key]);
      changed = true;
    }
    if (device.type === "light" && (device.name === "智能设备" || device.name === "智能灯" || device.name === "智能彩灯")) {
      device.name = "智能彩灯 " + pad2(counters[key]);
      changed = true;
    }
    if (device.type === "speaker" && (device.name === "智能设备" || device.name === "语音喇叭")) {
      device.name = "语音喇叭 " + pad2(counters[key]);
      changed = true;
    }
  });
  if (changed) {
    save();
  }
}

function ensureUser(openid, profile) {
  let user = state.users.find((item) => item.openid === openid);
  if (!user) {
    user = {
      id: "u_" + Date.now(),
      openid,
      nickname: profile && profile.nickname ? profile.nickname : "微信用户",
      createdAt: now(),
      updatedAt: now()
    };
    state.users.push(user);
    save();
  }
  return user;
}

function ensureGateway(gatewayMac, attrs) {
  const mac = String(gatewayMac || "").toLowerCase();
  let gateway = state.gateways.find((item) => item.gatewayMac === mac);
  if (!gateway) {
    gateway = {
      gatewayMac: mac,
      name: attrs && attrs.name ? attrs.name : mac,
      homeName: attrs && attrs.homeName ? attrs.homeName : "成宽之家",
      online: false,
      ownerUserId: attrs && attrs.ownerUserId ? attrs.ownerUserId : "",
      createdAt: now(),
      updatedAt: now(),
      lastSeenAt: ""
    };
    state.gateways.push(gateway);
  } else {
    Object.assign(gateway, attrs || {}, { updatedAt: now() });
  }
  save();
  return gateway;
}

function markGatewayOnline(gatewayMac) {
  const gateway = ensureGateway(gatewayMac, {});
  gateway.online = true;
  gateway.lastSeenAt = now();
  gateway.updatedAt = now();
  save();
  return gateway;
}

function upsertDevice(gatewayMac, device) {
  const mac = String(gatewayMac || "").toLowerCase();
  const deviceId = getDeviceId(device);
  if (!deviceId) {
    return null;
  }

  let current = state.devices.find((item) => item.gatewayMac === mac && item.deviceId === deviceId);
  if (!current) {
    current = {
      gatewayMac: mac,
      deviceId,
      name: getDeviceName(device, mac),
      type: inferDeviceType(device),
      uiid: device.uiid || "",
      modelId: device.modelId || "",
      room: "全屋",
      online: device.online !== false,
      state: {},
      createdAt: now(),
      updatedAt: now(),
      lastSeenAt: now()
    };
    state.devices.push(current);
  }

  if (!current.name || shouldRefreshDefaultName(current.name, device)) {
    current.name = getDeviceName(device, mac);
  }
  current.type = inferDeviceType(device, current.type);
  current.uiid = device.uiid || current.uiid || "";
  current.modelId = device.modelId || current.modelId || "";
  current.online = device.online !== undefined ? !!device.online : current.online;
  current.state = Object.assign({}, current.state || {}, flattenState(device));
  current.updatedAt = now();
  current.lastSeenAt = now();
  save();
  return current;
}

function updateDeviceState(gatewayMac, payload) {
  const device = upsertDevice(gatewayMac, payload);
  return device;
}

function listGateways(ownerUserId) {
  return state.gateways.filter((gateway) => !ownerUserId || gateway.ownerUserId === ownerUserId);
}

function listDevices(gatewayMac, ownerUserId) {
  const mac = gatewayMac ? String(gatewayMac).toLowerCase() : "";
  const ownedGatewayMacs = state.gateways
    .filter((gateway) => !ownerUserId || gateway.ownerUserId === ownerUserId)
    .map((gateway) => gateway.gatewayMac);

  return state.devices.filter((device) => {
    const gatewayMatched = !mac || device.gatewayMac === mac;
    const ownerMatched = !ownerUserId || ownedGatewayMacs.indexOf(device.gatewayMac) !== -1;
    return gatewayMatched && ownerMatched;
  });
}

function getDevice(deviceId) {
  return state.devices.find((device) => device.deviceId === deviceId) || null;
}

function renameDevice(deviceId, ownerGatewayMacs, name) {
  const device = state.devices.find((item) => {
    const owned = !ownerGatewayMacs || ownerGatewayMacs.indexOf(item.gatewayMac) !== -1;
    return item.deviceId === deviceId && owned;
  });
  if (!device) {
    return null;
  }
  device.name = String(name || "").trim() || device.name;
  device.updatedAt = now();
  save();
  return device;
}

function addEvent(event) {
  state.events.unshift(Object.assign({ id: "e_" + Date.now(), createdAt: now() }, event));
  state.events = state.events.slice(0, 500);
  save();
}

function listEvents(limit) {
  return state.events.slice(0, limit || 50);
}

function listDeviceHistory(deviceId, limit) {
  const rows = [];
  state.events.forEach((event) => {
    if (!event.payload || String(event.payload).indexOf(deviceId) === -1) {
      return;
    }
    let payload = null;
    try {
      payload = JSON.parse(event.payload);
    } catch (error) {
      return;
    }
    const deviceLike = findDeviceLike(payload);
    if (!deviceLike || getDeviceId(deviceLike) !== deviceId) {
      return;
    }
    rows.push({
      id: event.id,
      createdAt: event.createdAt,
      state: flattenState(deviceLike)
    });
  });
  return rows.slice(0, limit || 80).reverse();
}

function listSchedules(deviceId) {
  return state.schedules.filter((schedule) => schedule.deviceId === deviceId);
}

function addSchedule(attrs) {
  const schedule = {
    id: "s_" + Date.now(),
    deviceId: attrs.deviceId,
    gatewayMac: attrs.gatewayMac,
    time: attrs.time,
    action: attrs.action === "off" ? "off" : "on",
    repeat: attrs.repeat || "daily",
    enabled: attrs.enabled !== false,
    lastRunDate: "",
    createdAt: now(),
    updatedAt: now()
  };
  state.schedules.push(schedule);
  save();
  return schedule;
}

function deleteSchedule(scheduleId, ownerGatewayMacs) {
  const before = state.schedules.length;
  state.schedules = state.schedules.filter((schedule) => {
    const owned = !ownerGatewayMacs || ownerGatewayMacs.indexOf(schedule.gatewayMac) !== -1;
    return !(schedule.id === scheduleId && owned);
  });
  save();
  return state.schedules.length !== before;
}

function listDueSchedules(date) {
  const hh = pad2(date.getHours()) + ":" + pad2(date.getMinutes());
  const day = date.toISOString().slice(0, 10);
  return state.schedules.filter((schedule) => {
    return schedule.enabled && schedule.time === hh && schedule.lastRunDate !== day;
  });
}

function markScheduleRun(scheduleId, date) {
  const schedule = state.schedules.find((item) => item.id === scheduleId);
  if (!schedule) {
    return null;
  }
  schedule.lastRunDate = date.toISOString().slice(0, 10);
  schedule.updatedAt = now();
  if (schedule.repeat === "once") {
    schedule.enabled = false;
  }
  save();
  return schedule;
}

function getOwnedGatewayMacs(ownerUserId) {
  return state.gateways
    .filter((gateway) => !ownerUserId || gateway.ownerUserId === ownerUserId)
    .map((gateway) => gateway.gatewayMac);
}

function getDeviceId(device) {
  return device && (device.deviceId || device.deviceid || device.device_id || device.mac || device.ieeeAddr || device.id);
}

function getDeviceName(device, gatewayMac) {
  if (device && device.name) {
    return device.name;
  }
  const type = inferDeviceType(device);
  if (type === "meterSocket") return getNumberedName(gatewayMac, "meterSocket", "计量插座");
  if (type === "sensor") return "环境传感器";
  if (type === "light") return getNumberedName(gatewayMac, "light", "智能彩灯");
  if (type === "speaker") return getNumberedName(gatewayMac, "speaker", "语音喇叭");
  return "智能设备";
}

function getNumberedName(gatewayMac, type, baseName) {
  const count = state.devices.filter((item) => item.gatewayMac === gatewayMac && item.type === type).length + 1;
  return baseName + " " + pad2(count);
}

function shouldRefreshDefaultName(name, device) {
  const type = inferDeviceType(device);
  if (type === "meterSocket") {
    return name === "计量插座";
  }
  if (type === "light") {
    return name === "智能设备" || name === "智能灯" || name === "智能彩灯";
  }
  if (type === "speaker") {
    return name === "智能设备" || name === "语音喇叭";
  }
  return false;
}

function inferDeviceType(device, fallback) {
  const uiid = Number(device && device.uiid);
  const modelId = String((device && device.modelId) || "").toLowerCase();
  const text = JSON.stringify(device || {}).toLowerCase();
  if (isSpeakerDevice(device)) {
    return "speaker";
  }
  if (uiid === 400 || modelId.indexOf("mpl") !== -1 || text.indexOf("rms_voltage") !== -1 || text.indexOf("switches") !== -1) {
    return "meterSocket";
  }
  if (uiid === 2001 || text.indexOf("temperature") !== -1 || text.indexOf("humidity") !== -1 || text.indexOf("illuminance") !== -1) {
    return "sensor";
  }
  if (uiid === 700 || text.indexOf("brightness") !== -1 || text.indexOf("colortemp") !== -1) {
    return "light";
  }
  return fallback || "unknown";
}

function flattenState(payload) {
  const source = Object.assign(
    {},
    payload || {},
    payload && payload.params ? payload.params : {},
    payload && payload.properties ? payload.properties : {},
    payload && payload.data ? payload.data : {},
    payload && payload.result ? payload.result : {}
  );
  delete source.params;
  delete source.properties;
  delete source.data;
  delete source.result;
  return source;
}

function findDeviceLike(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if (getDeviceId(payload)) {
    return payload;
  }
  const nested = [payload.params, payload.data, payload.properties, payload.result].filter(Boolean);
  for (let i = 0; i < nested.length; i += 1) {
    const found = findDeviceLike(nested[i]);
    if (found) return found;
  }
  return null;
}

function pad2(value) {
  return value < 10 ? "0" + value : String(value);
}

module.exports = {
  ensureUser,
  ensureGateway,
  markGatewayOnline,
  upsertDevice,
  updateDeviceState,
  listGateways,
  listDevices,
  getDevice,
  renameDevice,
  addEvent,
  listEvents,
  listDeviceHistory,
  listSchedules,
  addSchedule,
  deleteSchedule,
  listDueSchedules,
  markScheduleRun,
  getOwnedGatewayMacs
};
