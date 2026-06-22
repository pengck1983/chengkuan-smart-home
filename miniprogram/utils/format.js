function pad(value) {
  return value < 10 ? "0" + value : String(value);
}

function formatTime(date) {
  const d = date || new Date();
  return [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(":");
}

function formatValue(value, unit, emptyText) {
  if (value === null || value === undefined || value === "") {
    return emptyText || "--";
  }
  return unit ? value + " " + unit : String(value);
}

function toFixedNumber(value, digits) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  return number.toFixed(digits);
}

function shortPayload(text, maxLength) {
  const source = String(text || "");
  const limit = maxLength || 180;
  return source.length > limit ? source.slice(0, limit) + "..." : source;
}

module.exports = {
  formatTime,
  formatValue,
  toFixedNumber,
  shortPayload
};
