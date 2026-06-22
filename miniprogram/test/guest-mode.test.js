const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createGuestDevices, isGuest } = require("../utils/guest");

test("creates clearly marked read-only demo devices for guests", () => {
  const devices = createGuestDevices();

  assert.equal(isGuest(""), true);
  assert.equal(isGuest("token"), false);
  assert.ok(devices.length >= 3);
  assert.ok(devices.every((device) => device.demo === true));
  assert.ok(devices.every((device) => device.online === false));
  assert.ok(devices.every((device) => device.summaryText.includes("示例")));
});

test("login page offers an explicit guest experience path", () => {
  const wxml = readPage("login", "wxml");
  const js = readPage("login", "js");

  assert.match(wxml, /暂不登录，先体验/);
  assert.match(wxml, /bindtap="continueAsGuest"/);
  assert.match(wxml, /设备绑定和控制需要登录/);
  assert.match(js, /continueAsGuest\(\)/);
  assert.match(js, /setStorageSync\("guestMode", true\)/);
});

test("home page provides a read-only guest experience without forced login", () => {
  const wxml = readPage("index", "wxml");
  const js = readPage("index", "js");

  assert.match(js, /createGuestDevices\(\)/);
  assert.doesNotMatch(js, /wx\.reLaunch\(\{ url: "\/pages\/login\/login" \}\)/);
  assert.match(js, /cancelText:\s*"取消"/);
  assert.match(js, /confirmText:\s*"去登录"/);
  assert.match(wxml, /登录后连接我的设备/);
  assert.match(wxml, /游客体验/);
});

test("mine tab shows a guest profile instead of forcing login", () => {
  const wxml = readPage("mine", "wxml");
  const js = readPage("mine", "js");

  assert.doesNotMatch(js, /wx\.reLaunch\(\{ url: "\/pages\/login\/login" \}\)/);
  assert.match(wxml, /游客模式/);
  assert.match(wxml, /bindtap="goToLogin"/);
  assert.match(wxml, /wx:if="{{loggedIn}}"/);
});

function readPage(page, extension) {
  return fs.readFileSync(
    path.join(__dirname, "..", "pages", page, page + "." + extension),
    "utf8"
  );
}
