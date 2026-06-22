const iconv = require("iconv-lite");

const MAX_TTS_BYTES = 64;
const BUILT_IN_TONE = /^(ring|message|alert)_[1-5]$/;

function isSpeakerDevice(device) {
  const uiid = Number(device && device.uiid);
  const text = JSON.stringify(device || {}).toLowerCase();
  return uiid === 1400 || text.indexOf('"tts"') !== -1;
}

function encodeSpeakerContent(content) {
  const text = String(content || "").trim();
  if (!text) {
    throw new Error("speaker text is required");
  }
  const bytes = iconv.encode(text, "gb2312");
  if (bytes.length > MAX_TTS_BYTES) {
    throw new Error("speaker text must not exceed 64 encoded bytes");
  }
  return bytes.toString("hex").toUpperCase();
}

function normalizeSpeakerCommand(command) {
  const source = command || {};
  const text = String(source.text || "").trim();
  const tone = String(source.tone || "").trim().toLowerCase();
  if (text && tone) {
    throw new Error("provide either text or tone, not both");
  }
  if (text) {
    encodeSpeakerContent(text);
    return text;
  }
  if (!BUILT_IN_TONE.test(tone)) {
    throw new Error("tone must be ring_1..5, message_1..5, or alert_1..5");
  }
  return tone;
}

module.exports = {
  MAX_TTS_BYTES,
  isSpeakerDevice,
  encodeSpeakerContent,
  normalizeSpeakerCommand
};

