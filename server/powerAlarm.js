function createPowerAlarmMonitor(options) {
  const settings = Object.assign({
    thresholdWatts: 600,
    resetWatts: 500,
    cooldownMs: 60000,
    now: () => Date.now(),
    onAlarm: () => true
  }, options || {});
  const states = new Map();

  function observe(device) {
    if (!device || device.type !== "meterSocket") {
      return false;
    }
    const power = readPower(device.state || {});
    if (!Number.isFinite(power)) {
      return false;
    }
    const key = String(device.gatewayMac || "") + ":" + String(device.deviceId || "");
    const current = states.get(key) || { latched: false, lastAlarmAt: -Infinity };
    if (power < settings.resetWatts) {
      states.set(key, { latched: false, lastAlarmAt: current.lastAlarmAt });
      return false;
    }
    if (power < settings.thresholdWatts) {
      return false;
    }
    const timestamp = settings.now();
    if (current.latched && timestamp - current.lastAlarmAt < settings.cooldownMs) {
      return false;
    }
    const sent = settings.onAlarm(device, power);
    if (sent === false) {
      return false;
    }
    states.set(key, { latched: true, lastAlarmAt: timestamp });
    return true;
  }

  return { observe };
}

function readPower(state) {
  const keys = ["activePowerA", "powerA", "power"];
  for (const key of keys) {
    if (state[key] !== undefined && state[key] !== null && state[key] !== "") {
      const value = Number(state[key]);
      return Number.isFinite(value) ? value : NaN;
    }
  }
  return NaN;
}

module.exports = { createPowerAlarmMonitor, readPower };
