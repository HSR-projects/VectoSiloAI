/**
 * Koder config — reads/writes ~/.koder/config.json
 */
const os = require("os");
const fs = require("fs");
const path = require("path");

const CONFIG_DIR = path.join(os.homedir(), ".koder");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function read() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

function write(data) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

function get(key) {
  return read()[key];
}

function set(key, value) {
  const cfg = read();
  cfg[key] = value;
  write(cfg);
}

function clear() {
  write({});
}

module.exports = { read, write, get, set, clear, CONFIG_DIR, CONFIG_FILE };
