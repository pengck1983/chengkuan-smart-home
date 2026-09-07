const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const express = require("express");
const { listenOnHost } = require("../httpBinding");

test("binds the HTTP server only to the requested host", async (t) => {
  const app = express();
  const server = listenOnHost(app, 0, "127.0.0.1");
  t.after(() => server.close());

  await once(server, "listening");

  assert.equal(server.address().address, "127.0.0.1");
});
