const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = path.resolve(__dirname, "..");
const ignoreDirs = new Set(["node_modules", "miniprogram_npm", ".git"]);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        walk(path.join(dir, entry.name));
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(path.join(dir, entry.name));
    }
  }
}

walk(root);

for (const file of files) {
  childProcess.execFileSync(process.execPath, ["--check", file], {
    stdio: "inherit"
  });
}

console.log("Checked " + files.length + " JavaScript files.");
