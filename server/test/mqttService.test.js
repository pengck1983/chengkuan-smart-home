const test = require("node:test");
const assert = require("node:assert/strict");

process.env.MQTT_URL ||= "mqtts://example.invalid:8883";
process.env.MQTT_USERNAME ||= "test-user";
process.env.MQTT_PASSWORD ||= "test-password";

const {
  createRegistrationAck,
  createDeviceSyncAck,
  markReportedOnline
} = require("../mqttService");


test("builds the required gateway registration acknowledgement", () => {
  const ack = createRegistrationAck("/zbgw/a1b2c3d4e5f6/register", { sequence: 123 });
  assert.deepEqual(ack, {
    topic: "/zbgw/a1b2c3d4e5f6/register_rsp",
    payload: { error: 0, sequence: 123 }
  });
});

test("ignores non-registration messages", () => {
  assert.equal(createRegistrationAck("/zbgw/a1b2c3d4e5f6/sub/update", { sequence: 123 }), null);
});

test("acknowledges a newly added subdevice with a usable deviceId", () => {
  const ack = createDeviceSyncAck("/zbgw/a1b2c3d4e5f6/add_subdevice", {
    sequence: 456,
    params: {
      subDevices: [{ mac: "0011223344556677", uiid: 1400, online: true }]
    }
  });

  assert.deepEqual(ack, {
    topic: "/zbgw/a1b2c3d4e5f6/add_subdevice_rsp",
    payload: {
      error: 0,
      sequence: 456,
      params: {
        results: [{ error: 0, deviceId: "0011223344556677", mac: "0011223344556677" }]
      }
    }
  });
});

test("acknowledges a reported subdevice using its existing deviceId", () => {
  const ack = createDeviceSyncAck("/zbgw/a1b2c3d4e5f6/report_subdevice", {
    sequence: 789,
    params: {
      subDevices: [{ deviceId: "0011223344556677", uiid: 1400, online: true }]
    }
  });

  assert.deepEqual(ack, {
    topic: "/zbgw/a1b2c3d4e5f6/report_subdevice_rsp",
    payload: {
      error: 0,
      sequence: 789,
      params: {
        results: [{ error: 0, deviceId: "0011223344556677" }]
      }
    }
  });
});

test("marks a device online when it reports state", () => {
  const payload = { deviceId: "sensor-01", online: false, params: { temperature: 2655 } };

  assert.deepEqual(markReportedOnline(payload), {
    deviceId: "sensor-01",
    online: true,
    params: { temperature: 2655 }
  });
  assert.equal(payload.online, false);
});
