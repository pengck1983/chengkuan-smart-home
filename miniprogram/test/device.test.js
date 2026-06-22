const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeDevice } = require("../utils/device");

test("renders a speaker as a voice speaker instead of a generic smart device", () => {
  const device = normalizeDevice({
    deviceId: "voice-1",
    name: "语音喇叭 01",
    type: "speaker",
    online: true,
    state: {}
  });

  assert.equal(device.typeName, "语音喇叭");
  assert.equal(device.primaryValue, "播报");
  assert.equal(device.summaryText, "在线 · 支持文字与警示音");
});
