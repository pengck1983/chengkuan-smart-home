const crypto = require("crypto");
const express = require("express");
const { normalizeSpeakerCommand } = require("./speakerProtocol");

function createMcpApp({ config, store, mqttService }) {
  const app = express();
  app.use(express.json({ limit: "128kb" }));

  app.use((req, res, next) => {
    if (!config.mcpBridgeSecret) {
      return res.status(503).json({ error: "MCP bridge is not configured" });
    }
    if (!safeEqual(req.get("X-MCP-Bridge-Key") || "", config.mcpBridgeSecret)) {
      return res.status(401).json({ error: "unauthorized" });
    }
    next();
  });

  app.get("/health", (req, res) => {
    res.json({ ok: true, mqtt: mqttService.getStatus() });
  });

  app.get("/api/mcp/devices", (req, res) => {
    const devices = store.listDevices(config.defaultGatewayMac)
      .filter((device) => device.gatewayMac === config.defaultGatewayMac);
    res.json({ devices });
  });

  app.post("/api/mcp/devices/:deviceId/switch", (req, res) => {
    const device = getConfiguredDevice(store, config, req.params.deviceId);
    if (!device) return res.status(404).json({ error: "device not found" });
    if (device.type !== "meterSocket") return res.status(400).json({ error: "device is not a meter socket" });
    if (typeof req.body.on !== "boolean") return res.status(400).json({ error: "on must be boolean" });
    if (!mqttService.getStatus().connected) return res.status(503).json({ error: "MQTT is offline" });
    try {
      mqttService.controlSwitch(device.gatewayMac, device.deviceId, req.body.on);
    } catch (error) {
      return res.status(503).json({ error: error.message || "MQTT publish failed" });
    }
    res.json({ commandStatus: "sent", device: store.getDevice(device.deviceId) });
  });

  app.post("/api/mcp/devices/:deviceId/light", (req, res) => {
    const device = getConfiguredDevice(store, config, req.params.deviceId);
    if (!device) return res.status(404).json({ error: "device not found" });
    if (device.type !== "light") return res.status(400).json({ error: "device is not a light" });
    const error = validateLightParams(req.body);
    if (error) return res.status(400).json({ error });
    if (!mqttService.getStatus().connected) return res.status(503).json({ error: "MQTT is offline" });
    const allowed = ["switch", "brightness", "colorTemp", "hue", "saturation"];
    const params = Object.fromEntries(allowed
      .filter((key) => req.body[key] !== undefined)
      .map((key) => [key, req.body[key]]));
    try {
      mqttService.controlLight(device.gatewayMac, device.deviceId, params);
    } catch (error) {
      return res.status(503).json({ error: error.message || "MQTT publish failed" });
    }
    res.json({ commandStatus: "sent", device: store.getDevice(device.deviceId) });
  });

  app.post("/api/mcp/devices/:deviceId/speaker", (req, res) => {
    const device = getConfiguredDevice(store, config, req.params.deviceId);
    if (!device) return res.status(404).json({ error: "device not found" });
    if (device.type !== "speaker") return res.status(400).json({ error: "device is not a speaker" });
    const error = validateSpeakerCommand(req.body);
    if (error) return res.status(400).json({ error });
    if (!mqttService.getStatus().connected) return res.status(503).json({ error: "MQTT is offline" });
    const command = req.body.text ? { text: req.body.text } : { tone: req.body.tone };
    try {
      mqttService.controlSpeaker(device.gatewayMac, device.deviceId, command);
    } catch (error) {
      return res.status(503).json({ error: error.message || "MQTT publish failed" });
    }
    res.json({ commandStatus: "sent", device: store.getDevice(device.deviceId) });
  });

  return app;
}

function getConfiguredDevice(store, config, deviceId) {
  const device = store.getDevice(deviceId);
  return device && device.gatewayMac === config.defaultGatewayMac ? device : null;
}

function validateLightParams(body) {
  const ranges = { brightness: [0, 100], colorTemp: [2000, 6500], hue: [0, 360], saturation: [0, 100] };
  const keys = ["switch", ...Object.keys(ranges)];
  if (!keys.some((key) => body[key] !== undefined)) return "no light parameters provided";
  if (body.switch !== undefined && typeof body.switch !== "boolean") return "switch must be boolean";
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (body[key] !== undefined && (!Number.isFinite(body[key]) || body[key] < min || body[key] > max)) {
      return `${key} must be between ${min} and ${max}`;
    }
  }
  return "";
}

function validateSpeakerCommand(body) {
  try {
    normalizeSpeakerCommand(body);
    return "";
  } catch (error) {
    return error.message || "invalid speaker command";
  }
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { createMcpApp, safeEqual, validateLightParams, validateSpeakerCommand };
