const fs = require("fs");
const path = require("path");

const apiSource = fs.readFileSync(path.join(__dirname, "..", "utils", "api.js"), "utf8");

if (apiSource.includes("/api/login/dev")) {
  throw new Error("Production mini program must not call /api/login/dev");
}

console.log("Production authentication check passed.");
