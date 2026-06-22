const fs = require("fs");
const path = require("path");

const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

if (serverSource.includes("/api/login/dev")) {
  throw new Error("Production server must not expose /api/login/dev");
}

console.log("Production authentication check passed.");
