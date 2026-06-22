const api = require("../../utils/api");
const deviceUtil = require("../../utils/device");

Page({
  data: {
    deviceId: "",
    device: null,
    loading: true,
    errorText: "",
    nowText: "",
    mode: "color",
    lightForm: {
      brightness: 80,
      warmth: 50,
      hueSlider: 0,
      saturation: 80
    },
    colorHue: 0,
    warmText: "自然",
    pendingLight: false,
    speakerText: "",
    scheduleTime: "18:00",
    scheduleAction: "on",
    schedules: [],
    history: [],
    chartRows: []
  },

  onLoad(options) {
    this.setData({ deviceId: options.deviceId || "" });
    this.refreshTime();
    this.timer = setInterval(() => this.refreshTime(), 1000);
    this.load();
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer);
    if (this.lightTimer) clearTimeout(this.lightTimer);
  },

  refreshTime() {
    const date = new Date();
    this.setData({
      nowText: formatDateTime(date)
    });
  },

  load() {
    if (!this.data.deviceId) {
      this.setData({ loading: false, errorText: "缺少设备 ID" });
      return;
    }
    this.setData({ loading: true, errorText: "" });
    api.getDevice(this.data.deviceId)
      .then((result) => {
        const device = deviceUtil.normalizeDevice(result.device || {});
        const nextData = {
          device,
          loading: false
        };
        if (device.type === "light") {
          nextData.lightForm = getLightForm(device.state);
          nextData.colorHue = sliderToHue(nextData.lightForm.hueSlider);
          nextData.warmText = getWarmText(nextData.lightForm.warmth);
        }
        this.setData(nextData);
        if (device.type === "sensor") {
          this.loadHistory();
        }
        if (device.type === "meterSocket") {
          this.loadSchedules();
        }
      })
      .catch((error) => {
        this.setData({
          loading: false,
          errorText: error.message || "加载失败"
        });
      });
  },

  loadHistory() {
    api.getDeviceHistory(this.data.deviceId)
      .then((result) => {
        const history = result.history || [];
        this.setData({
          history,
          chartRows: buildChartRows(history)
        });
      });
  },

  loadSchedules() {
    api.listSchedules(this.data.deviceId)
      .then((result) => {
        this.setData({ schedules: result.schedules || [] });
      });
  },

  switchCurrent(event) {
    const on = parseBool(event.currentTarget.dataset.on);
    const device = this.data.device;
    if (!device) return;
    const request = device.type === "light"
      ? api.controlLight(device.deviceId, { switch: on ? "on" : "off" })
      : api.switchDevice(device.deviceId, on);
    request.then(() => {
      wx.showToast({ title: "指令已发送", icon: "success" });
      setTimeout(() => this.load(), 600);
    }).catch((error) => {
      wx.showToast({ title: error.message || "控制失败", icon: "none" });
    });
  },

  setMode(event) {
    this.setData({ mode: event.currentTarget.dataset.mode });
  },

  onLightSlider(event) {
    let key = event.currentTarget.dataset.key;
    const value = Number(event.detail.value);
    const nextData = {};
    if (key === "hue") {
      key = "hueSlider";
      nextData.colorHue = sliderToHue(value);
    }
    nextData["lightForm." + key] = value;
    if (key === "warmth") {
      nextData.warmText = getWarmText(value);
    }
    this.setData({
      ...nextData
    });
    this.queueLightApply();
  },

  queueLightApply() {
    if (this.lightTimer) {
      clearTimeout(this.lightTimer);
    }
    this.setData({ pendingLight: true });
    this.lightTimer = setTimeout(() => {
      this.sendLight();
    }, 180);
  },

  sendLight() {
    const form = this.data.lightForm;
    const payload = {
      switch: "on",
      brightness: form.brightness
    };
    if (this.data.mode === "color") {
      payload.hue = sliderToHue(form.hueSlider);
      payload.saturation = form.saturation;
    } else {
      payload.colorTemp = warmthToColorTemp(form.warmth);
    }
    api.controlLight(this.data.deviceId, payload)
      .then(() => {
        this.setData({ pendingLight: false });
      })
      .catch((error) => {
        this.setData({ pendingLight: false });
        wx.showToast({ title: error.message || "控制失败", icon: "none" });
      });
  },

  onSpeakerText(event) {
    this.setData({ speakerText: event.detail.value || "" });
  },

  speakText() {
    const text = String(this.data.speakerText || "").trim();
    if (!text) {
      wx.showToast({ title: "请输入播报内容", icon: "none" });
      return;
    }
    api.controlSpeaker(this.data.deviceId, { text })
      .then(() => wx.showToast({ title: "播报指令已发送", icon: "success" }))
      .catch((error) => wx.showToast({ title: error.message || "播报失败", icon: "none" }));
  },

  playWarningTone(event) {
    const tone = event.currentTarget.dataset.tone || "alert_1";
    api.controlSpeaker(this.data.deviceId, { tone })
      .then(() => wx.showToast({ title: "警示音已发送", icon: "success" }))
      .catch((error) => wx.showToast({ title: error.message || "播放失败", icon: "none" }));
  },

  renameDevice() {
    const device = this.data.device;
    if (!device) return;
    wx.showModal({
      title: "设备名称",
      editable: true,
      placeholderText: "例如 客厅插座",
      content: device.name,
      success: (result) => {
        if (!result.confirm) return;
        const name = String(result.content || "").trim();
        if (!name) return;
        api.renameDevice(device.deviceId, name)
          .then((res) => {
            this.setData({
              device: deviceUtil.normalizeDevice(res.device || Object.assign({}, device, { name }))
            });
          })
          .catch((error) => {
            wx.showToast({ title: error.message || "重命名失败", icon: "none" });
          });
      }
    });
  },

  onTimeChange(event) {
    this.setData({ scheduleTime: event.detail.value });
  },

  onActionChange(event) {
    this.setData({ scheduleAction: event.currentTarget.dataset.action });
  },

  addSchedule() {
    api.addSchedule(this.data.deviceId, {
      time: this.data.scheduleTime,
      action: this.data.scheduleAction,
      repeat: "daily"
    }).then(() => {
      wx.showToast({ title: "已添加", icon: "success" });
      this.loadSchedules();
    }).catch((error) => {
      wx.showToast({ title: error.message || "添加失败", icon: "none" });
    });
  },

  deleteSchedule(event) {
    const id = event.currentTarget.dataset.id;
    api.deleteSchedule(id)
      .then(() => this.loadSchedules())
      .catch((error) => {
        wx.showToast({ title: error.message || "删除失败", icon: "none" });
      });
  }
});

function getLightForm(state) {
  return {
    brightness: Number(state.brightness || 80),
    warmth: colorTempToWarmth(Number(state.colorTemp || 4000)),
    hueSlider: hueToSlider(Number(state.hue || 0)),
    saturation: Number(state.saturation || 80)
  };
}

function buildChartRows(history) {
  const fields = [
    { key: "temperature", label: "温度", unit: "℃", scale: true },
    { key: "humidity", label: "湿度", unit: "%", scale: true },
    { key: "Illuminance", label: "照度", unit: "lux", scale: false }
  ];
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const rows = history.filter((row) => {
    const ts = Date.parse(row.createdAt);
    return Number.isFinite(ts) && ts >= cutoff;
  });
  const timeLabels = buildTimeLabels(rows);
  return fields.map((field) => {
    const values = rows.map((row) => {
      const raw = deviceUtil.pick(row.state || {}, [field.key, field.key.toLowerCase(), field.key === "temperature" ? "temp" : ""]);
      if (raw === null || raw === undefined || raw === "") {
        return null;
      }
      const value = field.scale ? deviceUtil.scaleBy100(raw) : raw;
      return {
        time: formatHourMinute(new Date(row.createdAt)),
        value: Number(value)
      };
    }).filter((item) => item && Number.isFinite(item.value));
    const nums = values.map((item) => item.value);
    const max = Math.max.apply(null, nums.concat([1]));
    const min = Math.min.apply(null, nums.concat([0]));
    const range = Math.max(1, max - min);
    const linePoints = values.slice(-24).map((item, index, array) => {
      const x = array.length <= 1 ? 0 : Math.round(index / (array.length - 1) * 100);
      const y = 12 + Math.round((max - item.value) / range * 76);
      const safeX = 16 + Math.round(x * 0.78);
      return {
        left: safeX,
        top: y,
        label: item.time,
        value: item.value
      };
    });
    return {
      label: field.label,
      latest: values.length ? values[values.length - 1].value + " " + field.unit : "--",
      points: linePoints,
      segments: buildSegments(linePoints),
      timeLabels,
      maxText: nums.length ? max + " " + field.unit : "--",
      minText: nums.length ? min + " " + field.unit : "--"
    };
  });
}

function buildSegments(points) {
  const segments = [];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const current = points[i];
    const dx = current.left - prev.left;
    const dy = current.top - prev.top;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    segments.push({
      left: prev.left,
      top: prev.top,
      width: length,
      angle
    });
  }
  return segments;
}

function buildTimeLabels(rows) {
  if (!rows.length) {
    return ["24小时前", "现在"];
  }
  const first = rows[0];
  const last = rows[rows.length - 1];
  return [formatHourMinute(new Date(first.createdAt)), formatHourMinute(new Date(last.createdAt))];
}

function formatDateTime(date) {
  return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate()) +
    " " + pad2(date.getHours()) + ":" + pad2(date.getMinutes()) + ":" + pad2(date.getSeconds());
}

function pad2(value) {
  return value < 10 ? "0" + value : String(value);
}

function formatHourMinute(date) {
  return pad2(date.getHours()) + ":" + pad2(date.getMinutes());
}

function getWarmText(value) {
  const number = Number(value);
  if (number <= 33) return "偏暖";
  if (number >= 67) return "偏冷";
  return "自然";
}

function sliderToHue(value) {
  return Math.round(Number(value || 0) / 100 * 359);
}

function hueToSlider(value) {
  return Math.round(Number(value || 0) / 359 * 100);
}

function warmthToColorTemp(value) {
  return Math.round(2000 + Number(value || 0) / 100 * 4500);
}

function colorTempToWarmth(value) {
  return Math.max(0, Math.min(100, Math.round((Number(value || 4000) - 2000) / 4500 * 100)));
}

function parseBool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}
