const test = require("node:test");
const assert = require("node:assert/strict");
const { createPowerAlarmMonitor } = require("../powerAlarm");

function socket(power) {
  return {
    deviceId: "socket-01",
    gatewayMac: "gw-01",
    name: "计量插座 01",
    type: "meterSocket",
    state: { activePowerA: power }
  };
}

test("alarms when socket power reaches 1000 watts", () => {
  const alarms = [];
  const monitor = createPowerAlarmMonitor({
    thresholdWatts: 1000,
    resetWatts: 900,
    cooldownMs: 60000,
    now: () => 1000,
    onAlarm: (device, power) => alarms.push([device.deviceId, power])
  });

  monitor.observe(socket(1000));
  assert.deepEqual(alarms, [["socket-01", 1000]]);
});

test("does not repeat an alarm during the cooldown", () => {
  let time = 1000;
  let count = 0;
  const monitor = createPowerAlarmMonitor({
    thresholdWatts: 1000,
    resetWatts: 900,
    cooldownMs: 60000,
    now: () => time,
    onAlarm: () => { count += 1; }
  });

  monitor.observe(socket(1200));
  time += 59000;
  monitor.observe(socket(1300));
  assert.equal(count, 1);
  time += 1000;
  monitor.observe(socket(1300));
  assert.equal(count, 2);
});

test("rearms only after power falls below 900 watts", () => {
  let count = 0;
  const monitor = createPowerAlarmMonitor({
    thresholdWatts: 1000,
    resetWatts: 900,
    cooldownMs: 60000,
    now: () => 1000,
    onAlarm: () => { count += 1; }
  });

  monitor.observe(socket(1100));
  monitor.observe(socket(950));
  monitor.observe(socket(1100));
  assert.equal(count, 1);
  monitor.observe(socket(899));
  monitor.observe(socket(1100));
  assert.equal(count, 2);
});

test("ignores other devices and missing power values", () => {
  let count = 0;
  const monitor = createPowerAlarmMonitor({ onAlarm: () => { count += 1; } });
  monitor.observe({ type: "sensor", state: { activePowerA: 1500 } });
  monitor.observe({ type: "meterSocket", state: {} });
  assert.equal(count, 0);
});

test("uses the 600 watt alarm and 500 watt reset defaults", () => {
  let count = 0;
  const monitor = createPowerAlarmMonitor({
    now: () => 1000,
    onAlarm: () => { count += 1; }
  });

  monitor.observe(socket(599));
  monitor.observe(socket(600));
  monitor.observe(socket(550));
  monitor.observe(socket(600));
  assert.equal(count, 1);
  monitor.observe(socket(499));
  monitor.observe(socket(600));
  assert.equal(count, 2);
});
