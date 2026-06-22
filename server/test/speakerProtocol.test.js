const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isSpeakerDevice,
  encodeSpeakerContent,
  normalizeSpeakerCommand
} = require("../speakerProtocol");

test("recognizes a UIID 1400 TTS speaker", () => {
  assert.equal(isSpeakerDevice({ uiid: 1400 }), true);
  assert.equal(isSpeakerDevice({ uiid: 700 }), false);
});

test("encodes Chinese TTS text as uppercase GB2312 hexadecimal", () => {
  assert.equal(encodeSpeakerContent("谢谢使用"), "D0BBD0BBCAB9D3C3");
});

test("accepts supported built-in warning tones", () => {
  assert.equal(normalizeSpeakerCommand({ tone: "alert_1" }), "alert_1");
  assert.equal(normalizeSpeakerCommand({ tone: "ring_5" }), "ring_5");
});

test("rejects unsupported built-in warning tones", () => {
  assert.throws(() => normalizeSpeakerCommand({ tone: "alert_6" }), /tone/);
});

test("rejects text longer than 64 encoded bytes", () => {
  assert.throws(() => encodeSpeakerContent("警".repeat(33)), /64/);
});

