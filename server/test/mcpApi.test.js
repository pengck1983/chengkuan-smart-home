const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createMcpApp } = require("../mcpApi");

function createFixture() {
  const devices = [
    { deviceId: "socket-01", gatewayMac: "gw-01", type: "meterSocket", name: "计量插座 01", state: { switch: "on" } },
    { deviceId: "light-01", gatewayMac: "gw-01", type: "light", name: "智能彩灯 01", state: { brightness: 30 } },
    { deviceId: "speaker-01", gatewayMac: "gw-01", type: "speaker", name: "语音喇叭 01", state: {} },
    { deviceId: "other", gatewayMac: "other-gw", type: "meterSocket", name: "其他插座", state: {} }
  ];
  return {
    config: { defaultGatewayMac: "gw-01", mcpBridgeSecret: "test-secret" },
    store: {
      listDevices: () => devices,
      getDevice: (id) => devices.find((item) => item.deviceId === id) || null
    },
    mqttService: {
      getStatus: () => ({ connected: true }),
      controlSwitch: () => {},
      controlLight: () => {},
      controlSpeaker: () => {}
    }
  };
}

function authorized(requestBuilder) {
  return requestBuilder.set("X-MCP-Bridge-Key", "test-secret");
}

test("rejects a missing MCP bridge secret", async () => {
  const response = await request(createMcpApp(createFixture())).get("/api/mcp/devices");
  assert.equal(response.status, 401);
});

test("lists only devices from the configured gateway", async () => {
  const response = await authorized(request(createMcpApp(createFixture())).get("/api/mcp/devices"));
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.devices.map((item) => item.deviceId), ["socket-01", "light-01", "speaker-01"]);
});

test("controls a meter socket", async () => {
  const fixture = createFixture();
  let called = null;
  fixture.mqttService.controlSwitch = (...args) => { called = args; };
  const response = await authorized(request(createMcpApp(fixture))
    .post("/api/mcp/devices/socket-01/switch"))
    .send({ on: false });
  assert.equal(response.status, 200);
  assert.deepEqual(called, ["gw-01", "socket-01", false]);
  assert.equal(response.body.commandStatus, "sent");
});

test("rejects light control for a non-light device", async () => {
  const response = await authorized(request(createMcpApp(createFixture()))
    .post("/api/mcp/devices/socket-01/light"))
    .send({ brightness: 40 });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "device is not a light");
});

test("rejects control while MQTT is offline", async () => {
  const fixture = createFixture();
  fixture.mqttService.getStatus = () => ({ connected: false });
  const response = await authorized(request(createMcpApp(fixture))
    .post("/api/mcp/devices/socket-01/switch"))
    .send({ on: true });
  assert.equal(response.status, 503);
  assert.equal(response.body.error, "MQTT is offline");
});

test("rejects invalid light values", async () => {
  const response = await authorized(request(createMcpApp(createFixture()))
    .post("/api/mcp/devices/light-01/light"))
    .send({ brightness: 101 });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "brightness must be between 0 and 100");
});

test("returns JSON when MQTT publish fails after the status check", async () => {
  const fixture = createFixture();
  fixture.mqttService.controlSwitch = () => { throw new Error("MQTT publish failed"); };
  const response = await authorized(request(createMcpApp(fixture))
    .post("/api/mcp/devices/socket-01/switch"))
    .send({ on: true });
  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { error: "MQTT publish failed" });
});

test("sends text to a TTS speaker", async () => {
  const fixture = createFixture();
  let called = null;
  fixture.mqttService.controlSpeaker = (...args) => { called = args; };
  const response = await authorized(request(createMcpApp(fixture))
    .post("/api/mcp/devices/speaker-01/speaker"))
    .send({ text: "功率过高" });
  assert.equal(response.status, 200);
  assert.deepEqual(called, ["gw-01", "speaker-01", { text: "功率过高" }]);
});

test("sends a built-in alert to a TTS speaker", async () => {
  const fixture = createFixture();
  let called = null;
  fixture.mqttService.controlSpeaker = (...args) => { called = args; };
  const response = await authorized(request(createMcpApp(fixture))
    .post("/api/mcp/devices/speaker-01/speaker"))
    .send({ tone: "alert_1" });
  assert.equal(response.status, 200);
  assert.deepEqual(called, ["gw-01", "speaker-01", { tone: "alert_1" }]);
});

test("rejects speaker control for another device type", async () => {
  const response = await authorized(request(createMcpApp(createFixture()))
    .post("/api/mcp/devices/socket-01/speaker"))
    .send({ text: "测试" });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "device is not a speaker");
});

test("rejects an invalid speaker command", async () => {
  const response = await authorized(request(createMcpApp(createFixture()))
    .post("/api/mcp/devices/speaker-01/speaker"))
    .send({ tone: "alert_9" });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /tone/);
});
