#!/usr/bin/env node
"use strict";
/**
 * Koder — autonomous AI coding agent for your terminal.
 * Powered by KodaAI · chat.hsrprojects.org
 */

const readline = require("readline");
const fs   = require("fs");
const path = require("path");
const config = require("../src/config");
const auth   = require("../src/auth");
const tools  = require("../src/tools");
const agent  = require("../src/agent");
const { playChess } = require("../src/chess");

const VERSION = "0.1.0";

// ── ANSI ──────────────────────────────────────────────────────────────────────
const E = "\x1b";
const A = {
  reset:"\x1b[0m", bold:"\x1b[1m", dim:"\x1b[2m",
  green:"\x1b[32m", teal:"\x1b[38;5;79m", emerald:"\x1b[38;5;85m",
  blue:"\x1b[34m", cyan:"\x1b[36m", yellow:"\x1b[33m",
  red:"\x1b[31m", orange:"\x1b[38;5;208m", gray:"\x1b[90m",
  white:"\x1b[97m", salmon:"\x1b[38;5;209m", magenta:"\x1b[35m",
  bgDark:"\x1b[48;5;234m",
  hideCursor:`${E}[?25l`, showCursor:`${E}[?25h`,
  saveCursor:`${E}[s`,    restoreCursor:`${E}[u`,
  clearLine:`${E}[2K\r`,  clearScreen:`${E}[2J${E}[H`,
};
const cl = (k,t) => `${A[k]||k}${t}${A.reset}`;
const W = () => process.stdout.columns || 80;
const pw = (s) => process.stdout.write(s);

// ── ASCII header ──────────────────────────────────────────────────────────────
const LOGO = [
  " ██╗  ██╗ ██████╗ ██████╗ ███████╗██████╗ ",
  " ██║ ██╔╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗",
  " █████╔╝ ██║   ██║██║  ██║█████╗  ██████╔╝",
  " ██╔═██╗ ██║   ██║██║  ██║██╔══╝  ██╔══██╗",
  " ██║  ██╗╚██████╔╝██████╔╝███████╗██║  ██║",
  " ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝",
];
function printLogo() {
  pw("\n");
  LOGO.forEach(l => pw(cl("emerald",l)+"\n"));
  pw("\n");
}

function printEndpointCard() {
  const width = Math.min(W() - 4, 72);
  pw(`  ${cl("white","Koder is powered only by KodaAI.")}\n`);
  pw(`  ${cl("gray","Endpoint")} ${cl("emerald","https://chat.hsrprojects.org")}\n`);
  pw(`  ${cl("gray","─".repeat(width))}\n\n`);
}

// ── Args ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flags = {
  auto:    argv.includes("--auto"),
  ask:     argv.includes("--ask"),
  version: argv.includes("--version")||argv.includes("-v"),
  help:    argv.includes("--help")||argv.includes("-h"),
  print:   argv.includes("--print")||argv.includes("-p"),
  model:   argv[argv.indexOf("--model")+1]||null,
};
const subcommand = argv.find(a=>!a.startsWith("-")&&isNaN(+a));

// ── Entry ─────────────────────────────────────────────────────────────────────
async function main() {
  if (flags.version) { pw(`koder v${VERSION}\n`); return; }
  if (flags.help)    { showHelp(); return; }

  const mode = flags.ask ? "ask" : "auto";
  tools.setMode(mode);

  if (subcommand==="login")   { await cmdLogin(); return; }
  if (subcommand==="logout")  { await cmdLogout(); return; }
  if (subcommand==="status")  { await cmdStatus(); return; }
  if (subcommand==="account") { await cmdAccount(); return; }
  if (subcommand==="doctor")  { await cmdDoctor(); return; }
  if (subcommand==="chess")   { await cmdChess(); return; }

  // ── No auth → show login menu ─────────────────────────────────────────────
  if (!auth.getToken()) {
    printLogo();
    printEndpointCard();
    const method = await interactiveMenu("How do you want to use Koder?", [
      { label:"Using Account login", sub:"Requires a KodaAI Pro or Max subscription · 80 requests per 5h" },
      { label:"API keys",            sub:"Use a capped KodaAI API key from chat.hsrprojects.org/developers" },
    ]);
    if (method === 0) {
      pw(`\n  Opening ${cl("emerald","chat.hsrprojects.org")} in your browser...\n`);
      pw(`  ${cl("gray","Pro or Max subscription required.")}\n\n`);
      try {
        const r = await auth.loginWithBrowser();
        pw(`  ${cl("emerald","✓")} Signed in as ${cl("white",r.name)}\n`);
      } catch(e) { pw(`  ${cl("red","✗")} ${e.message}\n`); process.exit(1); }
    } else {
      const key = await rlQuestion(`\n  ${cl("gray","Paste your KodaAI API key (sk-koda-…):")} `);
      if (!key.trim()) { pw(cl("red","  ✗ No key entered.\n")); process.exit(1); }
      spinStart("Authenticating…");
      try {
        const r = await auth.loginWithApiKey(key.trim());
        spinStop(true, `Signed in as ${cl("white",r.name)} (API key)`);
      } catch(e) { spinStop(false,e.message); process.exit(1); }
    }

    // After login → model selection
    await pickModel(true);
    pw(`\n  ${cl("gray","Run")} ${cl("emerald","koder")} ${cl("gray","to start.\n\n")}`);
    return;
  }

  // ── One-shot ──────────────────────────────────────────────────────────────
  if (flags.print) {
    const prompt = argv.filter(a=>!a.startsWith("-")&&a!==subcommand).join(" ");
    if (!prompt) { process.stderr.write("Usage: koder --print \"prompt\"\n"); process.exit(1); }
    await runOneShot(prompt, auth.getToken());
    return;
  }

  await runREPL(mode);
}

// ── Interactive menu ──────────────────────────────────────────────────────────
function interactiveMenu(title, items) {
  return new Promise((resolve) => {
    let sel = 0;
    const LINES = items.length * 3 + 2;

    function render(first) {
      if (!first) pw(`${E}[${LINES}A`);
      pw(cl("bold",`  ${title}`)+"\n\n");
      items.forEach((o,i) => {
        const cursor = i===sel ? cl("emerald","❯") : " ";
        const label  = i===sel ? cl("bold",o.label)       : cl("gray",o.label);
        const sub    = cl("gray",`    ${o.sub}`);
        pw(`  ${cursor}${i+1}. ${label}\n${sub}\n\n`);
      });
    }

    pw(A.hideCursor);
    render(true);

    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    readline.emitKeypressEvents(process.stdin);

    const onKey = (_,key) => {
      if (!key) return;
      if (key.name==="up"||key.name==="k")    { sel=(sel-1+items.length)%items.length; render(false); }
      if (key.name==="down"||key.name==="j")  { sel=(sel+1)%items.length; render(false); }
      for (let i=0;i<items.length;i++) if (key.name===String(i+1)) { sel=i; render(false); }
      if (key.name==="return"||key.name==="space") {
        process.stdin.removeListener("keypress",onKey);
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        pw(A.showCursor+"\n");
        resolve(sel);
      }
      if (key.ctrl&&key.name==="c") { pw(A.showCursor+"\n"); process.exit(0); }
    };
    process.stdin.on("keypress",onKey);
  });
}

// ── Model picker ──────────────────────────────────────────────────────────────
async function pickModel(silent=false) {
  if (!silent) pw(`\n  ${cl("gray","Fetching KodaAI models…")}\n`);
  spinStart("Loading KodaAI models…");
  const models = await auth.fetchModels();
  spinStop(true,"");

  if (!models.length) {
    if (!silent) pw(cl("gray","  No models available.\n"));
    return;
  }

  const current = config.get("model") || models.find(m=>m.default)?.id || models[0]?.id;
  const items = models.map(m => ({
    label: m.name,
    sub:   m.default ? "Default KodaAI model" : "",
  }));
  const currentIdx = Math.max(0, models.findIndex(m=>m.id===current));

  pw("\n");
  const idx = await interactiveMenu("Select a model:", items.map((o,i)=>({ ...o, sub: i===currentIdx ? "(currently selected)" : o.sub })));
  const chosen = models[idx];
  config.set("model", chosen.id);
  config.set("modelName", chosen.name);
  pw(`  ${cl("emerald","✓")} Model set to ${cl("white",chosen.name)}\n`);
}

// ── REPL ──────────────────────────────────────────────────────────────────────
async function runREPL(mode) {
  const name     = auth.getName() || "";
  const authType = auth.getAuthType();
  const model    = config.get("modelName") || "KodaAI Koder";

  printLogo();
  const modeStr = mode==="auto"?cl("emerald","◆ Auto"):cl("blue","◎ Ask");
  pw(`  ${cl("emerald","❯")} ${cl("white",path.basename(process.cwd()))}  ${cl("gray","·")}  ${modeStr}  ${cl("gray","·")}  ${cl("gray",model)}  ${cl("gray","·")}  ${cl("gray",name)}\n`);
  pw(`  ${cl("gray","─".repeat(Math.min(W()-4,72)))}\n\n`);
  pw(`  ${cl("gray","? for shortcuts · /model to switch · Ctrl+C to exit")}\n\n`);

  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  readline.emitKeypressEvents(process.stdin);

  const rl = readline.createInterface({ input:process.stdin, output:process.stdout, terminal:true, historySize:500 });

  const doPrompt = () => rl.question(`\n  ${cl("emerald","❯")} `, handleLine);

  async function handleLine(raw) {
    const input = raw.trim();
    if (!input) { doPrompt(); return; }

    // ── Slash commands ────────────────────────────────────────────────────
    if (input==="?"||input==="/help")    { printHelp(); doPrompt(); return; }
    if (input==="/clear")                { agent.resetHistory(); pw(A.clearScreen); doPrompt(); return; }
    if (input==="/model")                { await pickModel(); doPrompt(); return; }
    if (input==="/account")              { await cmdAccount(); doPrompt(); return; }
    if (input==="/logout")               { await cmdLogout(); process.exit(0); }
    if (input==="/status")               { await cmdStatus(); doPrompt(); return; }
    if (input==="/todo")                 { agent.printTodo(); doPrompt(); return; }
    if (input.startsWith("/ls"))         { printLs(input.slice(3).trim()); doPrompt(); return; }
    if (input.startsWith("/read"))       { printRead(input.slice(5).trim()); doPrompt(); return; }
    if (input.startsWith("/run"))        { await printRun(input.slice(4).trim()); doPrompt(); return; }
    if (input==="/git")                  { await printRun("git status --short"); doPrompt(); return; }
    if (input==="/diff")                 { await printRun("git diff --stat HEAD"); doPrompt(); return; }
    if (input==="/exit"||input==="/quit"){ rl.close(); return; }
    if (input.startsWith("/chess"))      {
      rl.pause();
      const parts = input.split(/\s+/);
      const chessColor = parts[1]==="black"?"black":"white";
      const chessDiff  = +(parts[2]||5);
      await cmdChessWithOpts(chessColor, chessDiff);
      rl.resume();
      doPrompt(); return;
    }

    // ── Image attachment: @path/to/img ────────────────────────────────────
    let imageData = null;
    const imgMatch = input.match(/@([\w./\-]+\.(png|jpg|jpeg|gif|webp))/i);
    if (imgMatch) {
      const imgPath = path.resolve(process.cwd(), imgMatch[1]);
      if (fs.existsSync(imgPath)) {
        imageData = { path:imgPath, base64:fs.readFileSync(imgPath).toString("base64"), mime:mimeFor(imgPath) };
        pw(`  ${cl("emerald","✓")} Attached: ${cl("gray",imgPath)}\n`);
      } else {
        pw(`  ${cl("yellow","⚠")} Image not found: ${imgPath}\n`);
      }
    }

    // ── Agentic turn ──────────────────────────────────────────────────────
    pw("\n");
    const token = auth.getToken();
    if (!token) { pw(`  ${cl("yellow","Not signed in.")} Run ${cl("emerald","koder login")}\n`); doPrompt(); return; }

    const modelId = flags.model || config.get("model") || null;

    spinStart("Thinking…");
    let firstChunk = true;

    try {
      await agent.chat(input, token, modelId, imageData, (chunk, meta) => {
        if (meta?.type==="todo") {
          if (firstChunk) { spinStop(true,""); firstChunk=false; }
          renderTodo(meta.todos);
          return;
        }
        if (meta?.type==="tool") {
          if (firstChunk) { spinStop(true,""); firstChunk=false; }
          const icon   = meta.status==="done"?cl("emerald","✓"):meta.status==="error"?cl("red","✗"):cl("yellow","◌");
          const detail = meta.detail ? cl("gray",`  ${meta.detail}`) : "";
          pw(`  ${icon} ${meta.icon||"⚙"} ${cl("white",meta.name)}${detail}\n`);
          return;
        }
        if (firstChunk) { spinStop(true,""); pw(`  ${cl("emerald","❯")} `); firstChunk=false; }
        pw(fmtChunk(chunk));
      });
    } catch(e) {
      if (firstChunk) spinStop(false,e.message);
      else pw(`\n  ${cl("red","✗")} ${e.message}\n`);
      if (e.message.includes("limit")||e.message.includes("Resets")) {
        pw(cl("gray","  Quota exhausted — refills every 5 hours automatically.\n"));
      }
    }

    pw("\n");
    doPrompt();
  }

  rl.on("SIGINT", ()=>{ pw("\n  "+cl("gray","Goodbye.")+"\n\n"); process.exit(0); });
  rl.on("close",  ()=>{ pw("\n  "+cl("gray","Goodbye.")+"\n\n"); process.exit(0); });
  doPrompt();
}

// ── cmdLogin ──────────────────────────────────────────────────────────────────
async function cmdLogin() {
  const keyIdx = argv.indexOf("--key");
  if (keyIdx !== -1) {
    const key = argv[keyIdx+1];
    if (!key) { process.stderr.write("Usage: koder login --key sk-koda-...\n"); process.exit(1); }
    spinStart("Authenticating…");
    try {
      const r = await auth.loginWithApiKey(key);
      spinStop(true,`Signed in as ${cl("white",r.name)} (API key)`);
      await pickModel();
    } catch(e) { spinStop(false,e.message); process.exit(1); }
    return;
  }
  pw(`\n  Opening ${cl("emerald","chat.hsrprojects.org")} in your browser...\n`);
  pw(`  ${cl("gray","Pro or Max subscription required.")}\n\n`);
  try {
    const r = await auth.loginWithBrowser();
    pw(`  ${cl("emerald","✓")} Signed in as ${cl("white",r.name)}\n`);
    await pickModel();
  } catch(e) { pw(`\n  ${cl("red","✗")} ${e.message}\n`); process.exit(1); }
}

// ── cmdLogout ─────────────────────────────────────────────────────────────────
async function cmdLogout() {
  const at = auth.getAuthType();
  if (!auth.getToken()) { pw(cl("gray","  Not signed in.\n")); return; }

  if (at==="apikey") {
    const choice = await interactiveMenu("Logout options:", [
      { label:"Log out only",     sub:"Remove local credentials (API key remains valid on server)" },
      { label:"Revoke API key",   sub:"Permanently invalidate this API key and log out" },
      { label:"Cancel",           sub:"" },
    ]);
    if (choice===2) return;
    if (choice===1) {
      spinStart("Revoking API key…");
      try { await auth.revokeApiKey(); spinStop(true,"API key revoked and signed out."); }
      catch(e) { auth.logout(); spinStop(true,"Signed out (revoke failed — key may still be active)"); }
    } else {
      auth.logout();
      pw(`  ${cl("emerald","✓")} Signed out.\n`);
    }
  } else {
    auth.logout();
    pw(`  ${cl("emerald","✓")} Signed out.\n`);
  }
}

// ── cmdAccount ────────────────────────────────────────────────────────────────
async function cmdAccount() {
  const token = auth.getToken();
  if (!token) { pw(`\n  ${cl("yellow","Not signed in.")} Run ${cl("emerald","koder login")}\n\n`); return; }

  spinStart("Loading account…");
  const usage  = await auth.getUsage();
  const models = await auth.fetchModels();
  spinStop(true,"");

  const name    = auth.getName()||"—";
  const at      = auth.getAuthType();
  const model   = config.get("modelName")||"KodaAI Koder";
  const apiKey  = auth.getApiKey();

  pw(`\n  ${cl("bold","Account")}\n  ${cl("gray","─".repeat(44))}\n`);
  pw(`  ${cl("gray","Name")}      ${cl("white",name)}\n`);
  pw(`  ${cl("gray","Auth")}      ${at==="subscription"?cl("teal","KodaAI subscription (Pro/Max)"):cl("blue","API key")}\n`);
  if (apiKey) pw(`  ${cl("gray","Key")}       ${cl("gray",apiKey)}\n`);
  pw(`  ${cl("gray","Model")}     ${cl("white",model)}\n`);
  pw(`  ${cl("gray","Directory")} ${process.cwd()}\n`);

  if (usage && at==="subscription") {
    const used=usage.used||0, lim=usage.limit||80, pct=Math.round(used/lim*100);
    const filled=Math.round(pct/5);
    const bar=cl("emerald","█".repeat(filled))+cl("gray","░".repeat(20-filled));
    const rh=usage.resetIn?Math.ceil(usage.resetIn/3600000):0;
    pw(`  ${cl("gray","Quota")}     ${bar} ${used}/${lim}  ${cl("gray",`resets in ~${rh}h`)}\n`);
    if (!usage.allowed) pw(`  ${cl("yellow","⚠")}  Limit reached — refills in ~${rh}h\n`);
  } else if (at==="apikey") {
    pw(`  ${cl("gray","Billing")}   Pay-as-you-go (credits)\n`);
  }

  pw(`\n  ${cl("gray","─".repeat(44))}\n`);

  // Account actions menu
  const actions = [
    { label:"Switch KodaAI model",   sub:model },
    { label:"Log out",        sub:"" },
    ...(at==="apikey"?[{ label:"Revoke API key", sub:"Permanently invalidate this key" }]:[]),
    { label:"Cancel",         sub:"" },
  ];
  const choice = await interactiveMenu("Account actions:", actions);

  if      (choice===0)                         await pickModel();
  else if (choice===1)                         { auth.logout(); pw(`  ${cl("emerald","✓")} Signed out.\n`); process.exit(0); }
  else if (choice===2 && at==="apikey")        {
    spinStart("Revoking…");
    try { await auth.revokeApiKey(); spinStop(true,"API key revoked."); process.exit(0); }
    catch(e) { auth.logout(); spinStop(true,"Signed out."); process.exit(0); }
  }
}

// ── cmdStatus ─────────────────────────────────────────────────────────────────
async function cmdStatus() {
  const token = auth.getToken();
  if (!token) { pw(`\n  ${cl("yellow","Not signed in.")} Run ${cl("emerald","koder login")}\n\n`); return; }
  spinStart("Fetching…");
  const usage = await auth.getUsage();
  spinStop(true,"");
  const at  = auth.getAuthType();
  const mdl = config.get("modelName")||"KodaAI Koder";
  pw(`\n  ${cl("bold","Koder Status")}\n  ${cl("gray","─".repeat(40))}\n`);
  pw(`  ${cl("gray","User")}    ${cl("white",auth.getName()||"—")}\n`);
  pw(`  ${cl("gray","Auth")}    ${at==="subscription"?cl("teal","KodaAI subscription"):cl("blue","API key")}\n`);
  if (auth.getApiKey()) pw(`  ${cl("gray","Key")}     ${cl("gray",auth.getApiKey())}\n`);
  pw(`  ${cl("gray","Model")}   ${cl("white",mdl)}\n`);
  pw(`  ${cl("gray","Mode")}    ${tools.getMode()}\n`);
  pw(`  ${cl("gray","Dir")}     ${process.cwd()}\n`);
  if (usage&&at==="subscription") {
    const u=usage.used||0,l=usage.limit||80,pct=Math.round(u/l*100),f=Math.round(pct/5);
    const bar=cl("emerald","█".repeat(f))+cl("gray","░".repeat(20-f));
    const rh=usage.resetIn?Math.ceil(usage.resetIn/3600000):0;
    pw(`  ${cl("gray","Quota")}   ${bar} ${u}/${l}  ${cl("gray",`~${rh}h`)}\n`);
    if(!usage.allowed)pw(`  ${cl("yellow","⚠")}  Limit reached — refills in ~${rh}h\n`);
  }
  pw("\n");
}

// ── cmdDoctor ─────────────────────────────────────────────────────────────────
async function cmdDoctor() {
  pw(`\n  ${cl("bold","Koder Doctor")}\n\n`);
  const sfPaths = ["/usr/games/stockfish","/usr/bin/stockfish","/usr/local/bin/stockfish","/opt/homebrew/bin/stockfish"];
  const sfOk = sfPaths.some(p=>{ try{fs.accessSync(p,fs.constants.X_OK);return true;}catch{return false;} });
  const checks = [
    { label:"Node.js ≥ 18",    ok:parseInt(process.version.slice(1))>=18 },
    { label:"Auth token",      ok:!!auth.getToken() },
    { label:"Config directory",ok:fs.existsSync(config.CONFIG_DIR) },
    { label:"KodaAI model selected",  ok:!!config.get("model") },
    { label:"Stockfish (chess)",ok:sfOk, hint:"sudo apt install stockfish" },
    { label:"Network",         ok:await ping() },
  ];
  checks.forEach(c=>pw(`  ${c.ok?cl("emerald","✓"):cl("red","✗")}  ${c.label}${!c.ok&&c.hint?cl("gray","  →  "+c.hint):""}\n`));
  pw("\n");
}

// ── helpers ───────────────────────────────────────────────────────────────────
function renderTodo(todos) {
  pw(`\n  ${cl("bold","Tasks")}\n`);
  todos.forEach(t=>{
    const icon=t.status==="done"?cl("emerald","✓"):t.status==="in_progress"?cl("yellow","◌"):cl("gray","○");
    const label=t.status==="done"?cl("gray",t.label):t.status==="in_progress"?cl("white",t.label):cl("gray",t.label);
    pw(`  ${icon}  ${label}\n`);
  });
  pw("\n");
}

function printLs(dir) {
  const files = tools.listFiles(dir||".");
  if (files.error) { pw(cl("red",`  ✗ ${files.error}\n`)); return; }
  pw("\n");
  files.forEach(f=>{
    const icon=f.type==="dir"?cl("blue","▶"):cl("gray","·");
    const name=f.type==="dir"?cl("blue",f.name+"/"):f.name;
    const sz=f.type==="file"?cl("gray",`  ${(f.size/1024).toFixed(1)}K`):"";
    pw(`    ${icon}  ${name}${sz}\n`);
  });
  pw("\n");
}

function printRead(filePath) {
  if (!filePath) { pw(cl("red","  Usage: /read <path>\n")); return; }
  const {content,error} = tools.readFile(filePath);
  if (error) { pw(cl("red",`  ✗ ${error}\n`)); return; }
  pw(`\n  ${cl("gray","╭─")} ${cl("white",filePath)}\n`);
  content.split("\n").slice(0,100).forEach((l,i)=>{
    pw(`  ${cl("gray","│")} ${cl("gray",String(i+1).padStart(4))}  ${l}\n`);
  });
  pw(`  ${cl("gray","╰─")}\n\n`);
}

async function printRun(cmd) {
  if (!cmd) { pw(cl("red","  Usage: /run <command>\n")); return; }
  pw(`\n  ${cl("gray","$ "+cmd)}\n`);
  const r = await tools.runShell(cmd);
  if (r.output) r.output.split("\n").forEach(l=>pw(`  ${l}\n`));
  if (r.error)  pw(cl("red",`  ✗ ${r.error}\n`));
  pw("\n");
}

function printHelp() {
  pw(`
  ${cl("bold","Shortcuts")}
  ${cl("emerald","/model")}              Switch KodaAI model (interactive picker)
  ${cl("emerald","/account")}            Account info, logout, revoke key
  ${cl("emerald","/status")}             Quota and auth info
  ${cl("emerald","/clear")}              Clear conversation history
  ${cl("emerald","/todo")}               Show current task list
  ${cl("emerald","/read")} <file>        Display file with line numbers
  ${cl("emerald","/ls")} [dir]           List directory
  ${cl("emerald","/run")} <cmd>          Run shell command
  ${cl("emerald","/git")}                Git status
  ${cl("emerald","/diff")}               Git diff summary
  ${cl("emerald","/chess")} [color] [d]  Play chess vs Stockfish (color: white/black, d: 1-10)
  ${cl("emerald","/logout")}             Sign out
  ${cl("emerald","/exit")}               Exit

  ${cl("gray","Attach an image:")} type ${cl("gray","@path/to/image.png")} in your message
`);
}

function showHelp() {
  pw(`
  ${cl("emerald","❯ Koder")} ${cl("gray","v"+VERSION)} — KodaAI coding agent

  ${cl("bold","Usage")}
    koder                        Start interactive session
    koder login                  Sign in through chat.hsrprojects.org
    koder login --key KEY        Authenticate with KodaAI API key
    koder logout                 Sign out (or revoke key)
    koder account                Account info, model, revoke
    koder status                 Usage quota and auth info
    koder chess [white|black] [1-10]  Play chess vs Stockfish
    koder doctor                 Check setup

  ${cl("bold","Modes")}
    --auto                       Act without asking (default)
    --ask                        Confirm each file write / shell command
  ${cl("bold","Options")}
    --model <id>                 Override KodaAI model for this session
    --print "prompt"             Non-interactive one-shot
    --version, -v                Print version
    --help, -h                   Show this help

  ${cl("gray","More info: chat.hsrprojects.org/koder")}
\n`);
}

// ── cmdChess ──────────────────────────────────────────────────────────────────
async function cmdChess() {
  const color = argv.find(a=>a==="black"||a==="white") || "white";
  const diff  = +(argv.find(a=>/^\d+$/.test(a)&&+a>=1&&+a<=10) || 5);
  await playChess({ color, diff });
}

async function cmdChessWithOpts(color="white", diff=5) {
  await playChess({ color, diff });
}

function fmtChunk(t) {
  return t
    .replace(/`([^`\n]+)`/g,  (_,c)=>cl("cyan",c))
    .replace(/\*\*([^*]+)\*\*/g,(_,c)=>cl("bold",c));
}

function mimeFor(p) {
  return {".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".gif":"image/gif",".webp":"image/webp"}[path.extname(p).toLowerCase()]||"image/png";
}

function rlQuestion(prompt) {
  return new Promise(res=>{
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    const rl=readline.createInterface({input:process.stdin,output:process.stdout});
    rl.question(prompt,ans=>{rl.close();res(ans);});
  });
}

async function runOneShot(prompt, token) {
  try {
    await agent.chat(prompt,token,flags.model||config.get("model"),null,(chunk)=>pw(chunk));
    pw("\n");
  } catch(e) { process.stderr.write(`Error: ${e.message}\n`); process.exit(1); }
}

// ── Spinner ───────────────────────────────────────────────────────────────────
const SPIN=["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
let _si=0,_st=null,_sm="";
function spinStart(msg) {
  _sm=msg; _si=0; pw(A.hideCursor);
  _st=setInterval(()=>pw(`${A.clearLine}  ${cl("emerald",SPIN[_si++%SPIN.length])} ${cl("gray",_sm)}`),80);
}
function spinStop(ok=true,msg="") {
  clearInterval(_st);_st=null;
  pw(`${A.clearLine}  ${ok?cl("emerald","✓"):cl("red","✗")} ${msg||_sm}\n`);
  pw(A.showCursor);
}

async function ping() {
  try {
    const https=require("https");
    const code=await new Promise((res,rej)=>https.get(`${auth.BASE_URL}/api/status`,r=>res(r.statusCode)).on("error",rej));
    return code<500;
  } catch{return false;}
}

readline.emitKeypressEvents(process.stdin);
main().catch(e=>{process.stderr.write(`${cl("red","Error:")} ${e.message}\n`);process.exit(1);});
