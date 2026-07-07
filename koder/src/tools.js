/**
 * Koder tool execution — file read/write/edit and shell commands.
 * All tool calls go through confirmAction() when mode === "ask".
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const readline = require("readline");

let _mode = "auto"; // "auto" | "ask"
const cwd = process.cwd();

function setMode(mode) { _mode = mode; }
function getMode() { return _mode; }

async function confirmAction(description) {
  if (_mode !== "ask") return true;
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`\n  \x1b[33m?\x1b[0m ${description}\n  Allow? [Y/n] `, (ans) => {
      rl.close();
      resolve(!ans.trim() || ans.trim().toLowerCase() === "y");
    });
  });
}

function readFile(filePath) {
  const abs = path.resolve(cwd, filePath);
  if (!abs.startsWith(cwd)) {
    return { error: "Path is outside project directory." };
  }
  try {
    const content = fs.readFileSync(abs, "utf8");
    const lines = content.split("\n");
    return { content, lines: lines.length, path: abs };
  } catch (e) {
    return { error: e.message };
  }
}

async function writeFile(filePath, content) {
  const abs = path.resolve(cwd, filePath);
  if (!abs.startsWith(cwd)) {
    return { error: "Path is outside project directory." };
  }
  const ok = await confirmAction(`Write ${path.relative(cwd, abs)} (${content.split("\n").length} lines)`);
  if (!ok) return { error: "Cancelled by user." };
  try {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
    return { success: true, path: abs };
  } catch (e) {
    return { error: e.message };
  }
}

async function editFile(filePath, oldStr, newStr) {
  const abs = path.resolve(cwd, filePath);
  const { content, error } = readFile(filePath);
  if (error) return { error };
  if (!content.includes(oldStr)) return { error: `String not found in ${filePath}` };
  const ok = await confirmAction(`Edit ${path.relative(cwd, abs)}`);
  if (!ok) return { error: "Cancelled by user." };
  const updated = content.replace(oldStr, newStr);
  fs.writeFileSync(abs, updated);
  return { success: true };
}

async function runShell(cmd, opts = {}) {
  const dangerous = /rm\s+-rf|dd\s+if|mkfs|shutdown|reboot|:(){ :|:&};:/i.test(cmd);
  if (dangerous) {
    return { error: `Dangerous command blocked: ${cmd}` };
  }
  const ok = await confirmAction(`Shell: \x1b[90m${cmd}\x1b[0m`);
  if (!ok) return { error: "Cancelled by user." };
  try {
    const out = execSync(cmd, { cwd, timeout: 30000, encoding: "utf8", ...opts });
    return { output: out.trim(), exitCode: 0 };
  } catch (e) {
    return { output: e.stdout?.trim() || "", error: e.stderr?.trim() || e.message, exitCode: e.status ?? 1 };
  }
}

function listFiles(dirPath = ".") {
  const abs = path.resolve(cwd, dirPath);
  try {
    return fs.readdirSync(abs).map((f) => {
      const stat = fs.statSync(path.join(abs, f));
      return { name: f, type: stat.isDirectory() ? "dir" : "file", size: stat.size };
    });
  } catch (e) {
    return { error: e.message };
  }
}

function getProjectContext() {
  const files = [];
  function walk(dir, depth = 0) {
    if (depth > 3) return;
    try {
      for (const f of fs.readdirSync(dir)) {
        if (/^(node_modules|\.git|\.next|dist|build|__pycache__|\.venv|venv)$/.test(f)) continue;
        const full = path.join(dir, f);
        const rel = path.relative(cwd, full);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) { files.push(`${rel}/`); walk(full, depth + 1); }
        else files.push(rel);
      }
    } catch { /* skip unreadable dirs */ }
  }
  walk(cwd);

  let pkg = null;
  try { pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")); } catch { /* noop */ }
  const hasPy = fs.existsSync(path.join(cwd, "requirements.txt")) || fs.existsSync(path.join(cwd, "pyproject.toml"));
  const hasGit = fs.existsSync(path.join(cwd, ".git"));

  return {
    cwd,
    files: files.slice(0, 200),
    totalFiles: files.length,
    package: pkg ? { name: pkg.name, version: pkg.version, scripts: Object.keys(pkg.scripts || {}) } : null,
    python: hasPy,
    git: hasGit,
  };
}

// Parse tool calls from model output: <tool>json</tool>
function parseToolCalls(text) {
  const calls = [];
  const re = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try { calls.push({ tool: m[1], args: JSON.parse(m[2]) }); } catch { /* skip malformed */ }
  }
  return calls;
}

async function executeTool(tool, args) {
  switch (tool) {
    case "read_file": return readFile(args.path);
    case "write_file": return writeFile(args.path, args.content);
    case "edit_file": return editFile(args.path, args.old, args.new);
    case "run_shell": return runShell(args.command);
    case "list_files": return listFiles(args.path || ".");
    default: return { error: `Unknown tool: ${tool}` };
  }
}

module.exports = { setMode, getMode, readFile, writeFile, editFile, runShell, listFiles, getProjectContext, parseToolCalls, executeTool };
