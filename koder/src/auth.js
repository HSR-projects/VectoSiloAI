"use strict";
const http    = require("http");
const https   = require("https");
const { randomBytes } = require("crypto");
const { execSync } = require("child_process");
const config  = require("./config");

const BASE_URL      = "https://chat.hsrprojects.org";
function getToken()    { return config.get("token")    || null; }
function getAuthType() { return config.get("authType") || null; }
function getName()     { return config.get("name")     || null; }
function getApiKey()   { return config.get("apiKey")   || null; }  // stored masked for display

async function loginWithApiKey(key) {
  const res = await post(`${BASE_URL}/api/koder/token`, { type: "apikey", key });
  if (!res.token) throw new Error(res.error || "API key rejected.");
  config.set("token",   res.token);
  config.set("authType","apikey");
  config.set("name",    res.name);
  config.set("userId",  res.userId);
  // store masked key for display: sk-vectosilo-****xxxx
  const masked = key.length > 12 ? key.slice(0,10) + "…" + key.slice(-4) : "sk-vectosilo-…";
  config.set("apiKey",  masked);
  return res;
}

async function loginWithBrowser() {
  const state = randomBytes(24).toString("hex");
  const url = `${BASE_URL}/koder/authorize?state=${encodeURIComponent(state)}`;
  process.stdout.write(`\n  If the browser didn't open, visit:\n  ${url}\n\n`);
  openBrowser(url);

  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    const r = await post(`${BASE_URL}/api/koder/token`, { type: "poll", state });
    if (r?.token) {
      config.set("token",   r.token);
      config.set("authType","subscription");
      config.set("name",    r.name);
      config.set("userId",  r.userId);
      config.set("apiKey",  null);
      return r;
    }
    if (r?.error && !r?.pending) throw new Error(r.error);
    await sleep(1500);
  }
  throw new Error("VectoSiloAI login timed out (5 min).");
}

function logout() { config.clear(); }

async function revokeApiKey() {
  const token = getToken();
  if (!token || getAuthType() !== "apikey") throw new Error("No API key session active.");
  // Call logout endpoint to invalidate the server-side session
  try {
    await post(`${BASE_URL}/api/koder/token`, { type: "revoke", token });
  } catch { /* server-side revoke is best-effort */ }
  logout();
}

async function getUsage() {
  const token = getToken();
  if (!token) return null;
  try { return await get(`${BASE_URL}/api/koder/usage`, token); } catch { return null; }
}

async function fetchModels() {
  const token = getToken();
  if (!token) return [];
  try {
    const data = await get(`${BASE_URL}/api/koder/models`, token);
    return Array.isArray(data?.models) ? data.models : [];
  } catch { return []; }
}

function openBrowser(url) {
  try {
    const p = process.platform;
    if (p === "darwin") execSync(`open "${url}"`,    { stdio:"ignore" });
    else if (p === "win32") execSync(`start "" "${url}"`, { stdio:"ignore", shell:true });
    else execSync(`xdg-open "${url}" 2>/dev/null || sensible-browser "${url}" 2>/dev/null || true`, { stdio:"ignore", shell:true });
  } catch { /* user has the URL */ }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u    = new URL(url);
    const lib  = u.protocol === "https:" ? https : http;
    const req  = lib.request(
      { hostname:u.hostname, port:u.port||(u.protocol==="https:"?443:80), path:u.pathname+u.search,
        method:"POST", headers:{ "Content-Type":"application/json", "Content-Length":Buffer.byteLength(data) } },
      (res) => { let raw=""; res.on("data",c=>raw+=c); res.on("end",()=>{ try{resolve(JSON.parse(raw))}catch{reject(new Error(raw))} }); }
    );
    req.on("error", reject); req.write(data); req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u   = new URL(url);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      { hostname:u.hostname, port:u.port||(u.protocol==="https:"?443:80), path:u.pathname+u.search,
        method:"GET", headers: token ? { Authorization:`Bearer ${token}` } : {} },
      (res) => { let raw=""; res.on("data",c=>raw+=c); res.on("end",()=>{ try{resolve(JSON.parse(raw))}catch{reject(new Error(raw))} }); }
    );
    req.on("error", reject); req.end();
  });
}

module.exports = { getToken, getAuthType, getName, getApiKey, loginWithApiKey, loginWithBrowser, logout, revokeApiKey, getUsage, fetchModels, BASE_URL };
