const fs = require("fs");
const mqtt = require("mqtt");
const config = require("./config");
const store = require("./store");
const { encodeSpeakerContent, normalizeSpeakerCommand } = require("./speakerProtocol");
const { createPowerAlarmMonitor } = require("./powerAlarm");

let client = null;
let connected = false;
const powerAlarmMonitor = createPowerAlarmMonitor({
  thresholdWatts: config.powerAlarmWatts,
  resetWatts: config.powerAlarmResetWatts,
  cooldownMs: config.powerAlarmCooldownMs,
  onAlarm: announcePowerAlarm
});

function startMqtt() {
  const options = {
    clientId: "chengkuan_server_" + Date.now(),
    clean: true,
    keepalive: 60,
    connectTimeout: 10000,
    reconnectPeriod: 3000,
    username: config.mqttUsername,
    password: config.mqttPassword
  };

  if (config.mqttCaFile) {
    options.ca = fs.readFileSync(config.mqttCaFile);
  }

  client = mqtt.connect(config.mqttUrl, options);

  client.on("connect", () => {
    connected = true;
    console.log("[mqtt] connected");
    subscribeGatewayTopics("+");
    if (config.defaultGatewayMac) {
      store.ensureGateway(config.defaultGatewayMac, {
        name: "默认网关",
        homeName: config.defaultHomeName
      });
    }
  });

  client.on("reconnect", () => {
    console.log("[mqtt] reconnecting");
  });

  client.on("close", () => {
    connected = false;
    console.log("[mqtt] disconnected");
  });

  client.on("error", (error) => {
    console.error("[mqtt] error", error.message || error);
  });

  client.on("message", handleMessage);
}

function subscribeGatewayTopics(gatewayMac) {
  const topics = [
    "/zbgw/" + gatewayMac + "/register",
    "/zbgw/" + gatewayMac + "/add_subdevice",
    "/zbgw/" + gatewayMac + "/sub/update",
    "/zbgw/" + gatewayMac + "/sub/control_rsp",
    "/zbgw/" + gatewayMac + "/sub/get_rsp",
    "/zbgw/" + gatewayMac + "/report_subdevice",
    "/zbgw/" + gatewayMac + "/event"
  ];
  client.subscribe(topics, { qos: 0 }, (error) => {
    if (error) {
      console.error("[mqtt] subscribe failed", error.message || error);
      return;
    }
    console.log("[mqtt] subscribed", topics.join(", "));
  });
}

function handleMessage(topic, buffer) {
  const payloadText = buffer ? buffer.toString() : "";
  const gatewayMac = parseGatewayMac(topic);
  store.markGatewayOnline(gatewayMac);
  store.addEvent({ type: "mqtt", gatewayMac, topic, payload: shorten(payloadText, 600) });

  let payload = null;
  try {
    payload = JSON.parse(payloadText);
  } catch (error) {
    return;
  }

  const registrationAck = createRegistrationAck(topic, payload);
  if (registrationAck) {
    publishJson(registrationAck.topic, registrationAck.payload);
  }

  const deviceSyncAck = createDeviceSyncAck(topic, payload);
  if (deviceSyncAck) {
    publishJson(deviceSyncAck.topic, deviceSyncAck.payload);
  }

  if (topic.indexOf("/add_subdevice") !== -1 || topic.indexOf("/report_subdevice") !== -1 || topic.indexOf("/register") !== -1) {
    upsertDevicesFromPayload(gatewayMac, payload);
  }

  if (topic.indexOf("/sub/update") !== -1 || topic.indexOf("/sub/control_rsp") !== -1 || topic.indexOf("/sub/get_rsp") !== -1 || topic.indexOf("/event") !== -1) {
    upsertDevicesFromPayload(gatewayMac, payload);
    const deviceLike = findDeviceLike(payload);
    if (deviceLike) {
      const device = store.updateDeviceState(gatewayMac, markReportedOnline(deviceLike));
      powerAlarmMonitor.observe(device);
    }
  }
}

function markReportedOnline(device) {
  return Object.assign({}, device || {}, { online: true });
}

function createRegistrationAck(topic, payload) {
  if (!String(topic || "").endsWith("/register")) {
    return null;
  }
  return {
    topic: String(topic) + "_rsp",
    payload: {
      error: 0,
      sequence: payload && payload.sequence
    }
  };
}

function createDeviceSyncAck(topic, payload) {
  const topicText = String(topic || "");
  const isAdd = topicText.endsWith("/add_subdevice");
  const isReport = topicText.endsWith("/report_subdevice");
  if (!isAdd && !isReport) {
    return null;
  }

  const params = payload && payload.params;
  const subDevices = params && Array.isArray(params.subDevices) ? params.subDevices : [];
  const results = subDevices.map((device) => {
    const deviceId = String(device.deviceId || device.mac || "").trim();
    const result = { error: deviceId ? 0 : 6, deviceId };
    if (isAdd) {
      result.mac = String(device.mac || deviceId);
    }
    return result;
  });

  return {
    topic: topicText + "_rsp",
    payload: {
      error: results.every((item) => item.error === 0) ? 0 : 6,
      sequence: payload && payload.sequence,
      params: { results }
    }
  };
}

function upsertDevicesFromPayload(gatewayMac, payload) {
  const devices = [];
  collectDevices(payload, devices);
  devices.forEach((device) => store.upsertDevice(gatewayMac, device));
}

function collectDevices(value, devices) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectDevices(item, devices));
    return;
  }

  if (value.subDevices && Array.isArray(value.subDevices)) {
    value.subDevices.forEach((item) => devices.push(item));
  }

  if (value.deviceId || value.deviceid || value.mac || value.ieeeAddr) {
    devices.push(value);
  }

  Object.keys(value).forEach((key) => {
    if (value[key] && typeof value[key] === "object") {
      collectDevices(value[key], devices);
    }
  });
}

function findDeviceLike(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if (payload.deviceId || payload.deviceid || payload.mac || payload.ieeeAddr) {
    return payload;
  }
  const nested = [payload.params, payload.data, payload.properties, payload.result].filter(Boolean);
  for (let i = 0; i < nested.length; i += 1) {
    if (nested[i] && typeof nested[i] === "object") {
      const found = findDeviceLike(nested[i]);
      if (found) return found;
    }
  }
  return null;
}

function publishJson(topic, payload) {
  if (!client || !connected) {
    throw new Error("MQTT server client is not connected");
  }
  client.publish(topic, JSON.stringify(payload), { qos: 0, retain: false });
  store.addEvent({ type: "publish", topic, payload: JSON.stringify(payload) });
}

function openGatewayJoin(gatewayMac, seconds) {
  const topic = "/zbgw/" + gatewayMac + "/manage";
  publishJson(topic, {
    sequence: createSequence(),
    cmd: "addsubdevice",
    params: {
      permitjoin: true,
      adddevtime: seconds || 180
    }
  });
}

function controlSwitch(gatewayMac, deviceId, value) {
  const topic = "/zbgw/" + gatewayMac + "/sub/control";
  publishJson(topic, {
    sequence: createSequence(),
    deviceId,
    params: {
      switches: [
        {
          switch: value ? "on" : "off",
          outlet: 0
        }
      ]
    }
  });
  store.updateDeviceState(gatewayMac, {
    deviceId,
    params: {
      switches: [
        {
          switch: value ? "on" : "off",
          outlet: 0
        }
      ],
      switch: value ? "on" : "off"
    }
  });
}

function controlLight(gatewayMac, deviceId, params) {
  const topic = "/zbgw/" + gatewayMac + "/sub/control";
  const payloadParams = {};
  if (params.switch !== undefined) {
    payloadParams.switch = params.switch === "on" || params.switch === true ? "on" : "off";
  }
  copyNumber(params, payloadParams, "brightness", 0, 100);
  copyNumber(params, payloadParams, "colorTemp", 2000, 6500);
  copyNumber(params, payloadParams, "hue", 0, 359);
  copyNumber(params, payloadParams, "saturation", 0, 100);

  publishJson(topic, {
    sequence: createSequence(),
    deviceId,
    params: payloadParams
  });
  store.updateDeviceState(gatewayMac, {
    deviceId,
    params: payloadParams
  });
}

function controlSpeaker(gatewayMac, deviceId, command) {
  const content = normalizeSpeakerCommand(command);
  const topic = "/zbgw/" + gatewayMac + "/sub/control";
  publishJson(topic, {
    sequence: createSequence(),
    deviceId,
    params: {
      TTS: encodeSpeakerContent(content)
    }
  });
}

function announcePowerAlarm(socket, power) {
  const speaker = store.listDevices(socket.gatewayMac)
    .find((device) => device.type === "speaker" && device.online !== false);
  if (!speaker || !connected) {
    console.warn("[alarm] no online speaker for", socket.gatewayMac);
    return false;
  }
  try {
    controlSpeaker(socket.gatewayMac, speaker.deviceId, { tone: "alert_1" });
    controlSpeaker(socket.gatewayMac, speaker.deviceId, {
      text: "警告，" + (socket.name || "计量插座") + "功率超过六百瓦"
    });
    console.warn("[alarm] power threshold exceeded", socket.deviceId, power);
    return true;
  } catch (error) {
    console.error("[alarm] speaker publish failed", error.message || error);
    return false;
  }
}

function readDeviceState(gatewayMac, deviceId, readAttr) {
  const topic = "/zbgw/" + gatewayMac + "/sub/get";
  publishJson(topic, {
    sequence: createSequence(),
    deviceId,
    params: {
      readAttr: readAttr || "switch",
      outlet: 0
    }
  });
}

function getStatus() {
  return {
    connected,
    mqttUrl: maskUrl(config.mqttUrl)
  };
}

function parseGatewayMac(topic) {
  const parts = String(topic || "").split("/");
  return (parts[2] || "").toLowerCase();
}

function createSequence() {
  return Math.floor(Date.now() % 1000000000);
}

function shorten(text, max) {
  const value = String(text || "");
  return value.length > max ? value.slice(0, max) + "..." : value;
}

function copyNumber(source, target, key, min, max) {
  if (source[key] === undefined || source[key] === null || source[key] === "") {
    return;
  }
  const value = Number(source[key]);
  if (!Number.isFinite(value)) {
    return;
  }
  target[key] = Math.max(min, Math.min(max, Math.round(value)));
}

function maskUrl(url) {
  return String(url || "").replace(/:\/\/.*@/, "://***@");
}

module.exports = {
  startMqtt,
  publishJson,
  openGatewayJoin,
  controlSwitch,
  controlLight,
  controlSpeaker,
  readDeviceState,
  getStatus,
  createRegistrationAck,
  createDeviceSyncAck,
  markReportedOnline
};
