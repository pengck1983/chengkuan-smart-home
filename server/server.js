const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const config = require("./config");
const store = require("./store");
const mqttService = require("./mqttService");
const { createMcpApp } = require("./mcpApi");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

if (config.defaultGatewayMac) {
  store.ensureGateway(config.defaultGatewayMac, {
    name: "默认网关",
    homeName: config.defaultHomeName
  });
}

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    mqtt: mqttService.getStatus()
  });
});

app.post("/api/login/wechat", async (req, res) => {
  const code = req.body.code;
  if (!code) {
    res.status(400).json({ error: "code is required" });
    return;
  }
  if (!config.wechatAppId || !config.wechatAppSecret) {
    res.status(501).json({ error: "wechat login is not configured" });
    return;
  }

  try {
    const url = "https://api.weixin.qq.com/sns/jscode2session" +
      "?appid=" + encodeURIComponent(config.wechatAppId) +
      "&secret=" + encodeURIComponent(config.wechatAppSecret) +
      "&js_code=" + encodeURIComponent(code) +
      "&grant_type=authorization_code";
    const response = await fetch(url);
    const data = await response.json();
    if (!data.openid) {
      res.status(502).json({ error: data.errmsg || "wechat login failed" });
      return;
    }
    const user = store.ensureUser(data.openid, { nickname: "微信用户" });
    res.json({
      token: createToken(user),
      user
    });
  } catch (error) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.get("/api/gateways", requireAuth, (req, res) => {
  res.json({
    gateways: store.listGateways(req.user.id)
  });
});

app.post("/api/gateways", requireAuth, (req, res) => {
  const gatewayMac = String(req.body.gatewayMac || "").toLowerCase();
  if (!gatewayMac) {
    res.status(400).json({ error: "gatewayMac is required" });
    return;
  }
  const gateway = store.ensureGateway(gatewayMac, {
    name: req.body.name || "网关 " + gatewayMac,
    homeName: req.body.homeName || config.defaultHomeName,
    ownerUserId: req.user.id
  });
  res.json({ gateway });
});

app.post("/api/gateways/:gatewayMac/permit-join", requireAuth, (req, res) => {
  const gatewayMac = req.params.gatewayMac.toLowerCase();
  const allowed = store.listGateways(req.user.id).some((gateway) => gateway.gatewayMac === gatewayMac);
  if (!allowed) {
    res.status(403).json({ error: "gateway is not bound to current user" });
    return;
  }
  try {
    mqttService.openGatewayJoin(gatewayMac, Number(req.body.seconds || 180));
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.get("/api/gateways/:gatewayMac/permit-join", requireAuth, (req, res) => {
  const gatewayMac = req.params.gatewayMac.toLowerCase();
  const allowed = store.listGateways(req.user.id).some((gateway) => gateway.gatewayMac === gatewayMac);
  if (!allowed) {
    res.status(403).json({ error: "gateway is not bound to current user" });
    return;
  }
  res.json({ ok: true });
});

app.get("/api/devices", requireAuth, (req, res) => {
  res.json({
    devices: store.listDevices(req.query.gatewayMac, req.user.id)
  });
});

app.get("/api/devices/:deviceId", requireAuth, (req, res) => {
  const devices = store.listDevices("", req.user.id);
  const device = devices.find((item) => item.deviceId === req.params.deviceId);
  if (!device) {
    res.status(404).json({ error: "device not found" });
    return;
  }
  res.json({ device });
});

app.patch("/api/devices/:deviceId", requireAuth, (req, res) => {
  const device = getOwnedDevice(req.user.id, req.params.deviceId);
  if (!device) {
    res.status(404).json({ error: "device not found" });
    return;
  }
  const name = String(req.body.name || "").trim();
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const updated = store.renameDevice(req.params.deviceId, store.getOwnedGatewayMacs(req.user.id), name);
  res.json({ device: updated });
});

app.post("/api/devices/:deviceId/switch", requireAuth, (req, res) => {
  const device = getOwnedDevice(req.user.id, req.params.deviceId);
  if (!device) {
    res.status(404).json({ error: "device not found" });
    return;
  }
  try {
    mqttService.controlSwitch(device.gatewayMac, device.deviceId, !!req.body.on);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.post("/api/devices/:deviceId/light", requireAuth, (req, res) => {
  const device = getOwnedDevice(req.user.id, req.params.deviceId);
  if (!device) {
    res.status(404).json({ error: "device not found" });
    return;
  }
  try {
    mqttService.controlLight(device.gatewayMac, device.deviceId, req.body || {});
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.post("/api/devices/:deviceId/speaker", requireAuth, (req, res) => {
  const device = getOwnedDevice(req.user.id, req.params.deviceId);
  if (!device) {
    res.status(404).json({ error: "device not found" });
    return;
  }
  if (device.type !== "speaker") {
    res.status(400).json({ error: "device is not a speaker" });
    return;
  }
  try {
    mqttService.controlSpeaker(device.gatewayMac, device.deviceId, req.body || {});
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message || String(error) });
  }
});

app.get("/api/devices/:deviceId/history", requireAuth, (req, res) => {
  const device = getOwnedDevice(req.user.id, req.params.deviceId);
  if (!device) {
    res.status(404).json({ error: "device not found" });
    return;
  }
  res.json({
    history: store.listDeviceHistory(device.deviceId, Number(req.query.limit || 80))
  });
});

app.get("/api/devices/:deviceId/schedules", requireAuth, (req, res) => {
  const device = getOwnedDevice(req.user.id, req.params.deviceId);
  if (!device) {
    res.status(404).json({ error: "device not found" });
    return;
  }
  res.json({
    schedules: store.listSchedules(device.deviceId)
  });
});

app.post("/api/devices/:deviceId/schedules", requireAuth, (req, res) => {
  const device = getOwnedDevice(req.user.id, req.params.deviceId);
  if (!device) {
    res.status(404).json({ error: "device not found" });
    return;
  }
  const time = String(req.body.time || "");
  if (!/^\d{2}:\d{2}$/.test(time)) {
    res.status(400).json({ error: "time must be HH:mm" });
    return;
  }
  const schedule = store.addSchedule({
    deviceId: device.deviceId,
    gatewayMac: device.gatewayMac,
    time,
    action: req.body.action === "off" ? "off" : "on",
    repeat: req.body.repeat || "daily",
    enabled: req.body.enabled !== false
  });
  res.json({ schedule });
});

app.delete("/api/schedules/:scheduleId", requireAuth, (req, res) => {
  const ok = store.deleteSchedule(req.params.scheduleId, store.getOwnedGatewayMacs(req.user.id));
  if (!ok) {
    res.status(404).json({ error: "schedule not found" });
    return;
  }
  res.json({ ok: true });
});

app.get("/api/events", requireAuth, (req, res) => {
  res.json({
    events: store.listEvents(Number(req.query.limit || 50))
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "not found" });
});

mqttService.startMqtt();
setInterval(runDueSchedules, 20000);

app.listen(config.port, () => {
  console.log("[server] listening on http://localhost:" + config.port);
});

const mcpApp = createMcpApp({ config, store, mqttService });
mcpApp.listen(config.mcpApiPort, "127.0.0.1", () => {
  console.log("[mcp-api] listening on http://127.0.0.1:" + config.mcpApiPort);
});

function getOwnedDevice(userId, deviceId) {
  const devices = store.listDevices("", userId);
  return devices.find((item) => item.deviceId === deviceId) || null;
}

function runDueSchedules() {
  const now = new Date();
  const schedules = store.listDueSchedules(now);
  schedules.forEach((schedule) => {
    try {
      mqttService.controlSwitch(schedule.gatewayMac, schedule.deviceId, schedule.action === "on");
      store.markScheduleRun(schedule.id, now);
      console.log("[schedule] ran", schedule.id, schedule.deviceId, schedule.action);
    } catch (error) {
      console.error("[schedule] failed", schedule.id, error.message || error);
    }
  });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  req.user = {
    id: payload.userId,
    openid: payload.openid
  };
  next();
}

function createToken(user) {
  const payload = Buffer.from(JSON.stringify({
    userId: user.id,
    openid: user.openid,
    ts: Date.now()
  })).toString("base64url");
  const signature = sign(payload);
  return payload + "." + signature;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) {
    return null;
  }
  if (sign(parts[0]) !== parts[1]) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch (error) {
    return null;
  }
}

function sign(payload) {
  return crypto
    .createHmac("sha256", config.appTokenSecret)
    .update(payload)
    .digest("base64url");
}
