"use strict";
/**
 * Koder agent — agentic loop with:
 *  - Dynamic TODO list (plan → execute → verify)
 *  - Tool call execution with TUI events
 *  - Image attachment support (base64)
 *  - Multi-turn memory
 */
const https = require("https");
const http  = require("http");
const { BASE_URL } = require("./auth");
const { getMode, parseToolCalls, executeTool, getProjectContext } = require("./tools");

// ── Todo store ────────────────────────────────────────────────────────────────
let _todos = [];
function resetTodos() { _todos = []; }
function setTodos(list) { _todos = list; }
function updateTodo(idx, status) { if (_todos[idx]) _todos[idx].status = status; }
function printTodo() {
  if (!_todos.length) { process.stdout.write("  (no tasks yet)\n"); return; }
  _todos.forEach((t) => {
    const icon = t.status === "done" ? "✓" : t.status === "in_progress" ? "◌" : "○";
    process.stdout.write(`  ${icon}  ${t.label}\n`);
  });
}

// ── History ───────────────────────────────────────────────────────────────────
let _history = [];
let _ctxCache = null;
function resetHistory() { _history = []; _ctxCache = null; resetTodos(); }

// ── Tool icons ────────────────────────────────────────────────────────────────
const ICONS = { read_file:"📄", write_file:"✏️ ", edit_file:"✏️ ", run_shell:"⚡", list_files:"📁" };

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM = `You are Koder, an autonomous AI coding agent. You work in the user's terminal, inside their project directory. You can read files, write files, edit files, and run shell commands.

IMPORTANT RULES:
1. Before editing any file, ALWAYS read it first with read_file.
2. When writing files, always output the COMPLETE file content — never truncate.
3. After making changes, verify by reading the file or running tests.
4. Break complex tasks into steps. Use TODO format when planning multi-step work:
   TODO: [step 1] / [step 2] / [step 3]
5. Be concise but complete. Explain what you changed and why.
6. Never make up file contents — always read first.

TOOLS (emit as XML tags in your response):
<read_file>{"path": "src/index.ts"}</read_file>
<write_file>{"path": "src/index.ts", "content": "full content here"}</write_file>
<edit_file>{"path": "src/index.ts", "old": "exact string to replace", "new": "replacement"}</edit_file>
<run_shell>{"command": "npm test"}</run_shell>
<list_files>{"path": "."}</list_files>

When you have multiple steps to complete, start your response with:
TODO: step one description | step two description | step three description

Then execute them in order.`;

// ── Main chat function ────────────────────────────────────────────────────────
async function chat(userMessage, token, modelOverride, imageData, onEvent) {
  if (!_ctxCache) _ctxCache = getProjectContext();
  const ctx = _ctxCache;

  const ctxBlock = `Project: ${ctx.cwd}
Files (${ctx.totalFiles} total): ${ctx.files.slice(0,80).join(", ")}${ctx.totalFiles>80?" …":""}
${ctx.package ? `Package: ${ctx.package.name}@${ctx.package.version}` : ""}${ctx.python?"\nPython project.":""}${ctx.git?"\nGit repo.":""}`;

  // Build user message (with optional image)
  let userContent = userMessage;
  if (imageData) {
    // Append image info — our API accepts base64 via a special marker
    userContent += `\n\n[IMAGE ATTACHED: ${imageData.path}]\n<image>${imageData.base64}</image>`;
  }

  _history.push({ role: "user", content: userContent });

  const messages = [
    { role: "user",      content: `${ctxBlock}\n\n${SYSTEM}` },
    { role: "assistant", content: "Understood. I'm ready to work on your codebase." },
    ..._history,
  ];

  // ── First model call ──────────────────────────────────────────────────────
  let response = "";
  response = await streamCall(messages, token, modelOverride, (chunk) => {
    // Parse TODO from first line
    if (response.length === 0 && chunk.includes("TODO:")) {
      const match = (response + chunk).match(/TODO:\s*(.+)/);
      if (match) {
        const steps = match[1].split("|").map((s) => s.trim()).filter(Boolean);
        setTodos(steps.map((s) => ({ label: s, status: "pending" })));
        onEvent("", { type: "todo", todos: _todos });
        return; // don't emit the TODO line as text
      }
    }
    onEvent(chunk);
  });

  _history.push({ role: "assistant", content: response });

  // ── Agentic tool loop (up to 8 rounds) ───────────────────────────────────
  let round = 0;
  const MAX_ROUNDS = 8;

  while (round < MAX_ROUNDS) {
    const toolCalls = parseToolCalls(response);
    if (toolCalls.length === 0) break;
    round++;

    const toolResults = [];

    for (let i = 0; i < toolCalls.length; i++) {
      const { tool, args } = toolCalls[i];

      // Find matching TODO step
      const todoIdx = _todos.findIndex((t) => t.status === "pending");
      if (todoIdx >= 0) {
        updateTodo(todoIdx, "in_progress");
        onEvent("", { type: "todo", todos: _todos });
      }

      onEvent("", { type:"tool", icon:ICONS[tool]||"⚙", name:toolName(tool,args), detail:toolDetail(tool,args), status:"running" });

      const result = await executeTool(tool, args);
      const ok = !result.error;

      onEvent("", { type:"tool", icon:ICONS[tool]||"⚙", name:toolName(tool,args), detail: ok ? resultDetail(tool,result) : result.error, status: ok?"done":"error" });

      if (todoIdx >= 0) {
        updateTodo(todoIdx, ok ? "done" : "error");
        onEvent("", { type:"todo", todos:_todos });
      }

      toolResults.push({ tool, args, result });
    }

    // Feed results back
    const resultsMsg = toolResults.map(({tool,args,result}) =>
      `Tool: ${tool}\nArgs: ${JSON.stringify(args)}\nResult: ${JSON.stringify(result).slice(0,3000)}`
    ).join("\n\n");

    _history.push({ role:"user", content:`Tool results:\n${resultsMsg}\n\nContinue with the next step. If all steps are done, give a brief summary.` });

    const msgs2 = [
      { role:"user", content:`${ctxBlock}\n\n${SYSTEM}` },
      { role:"assistant", content:"Understood." },
      ..._history,
    ];

    response = "";
    response = await streamCall(msgs2, token, modelOverride, (chunk) => {
      onEvent(chunk);
    });
    _history.push({ role:"assistant", content:response });

    // Stop if model says it's done (no more tool calls)
    if (!parseToolCalls(response).length) break;
  }

  // Mark remaining todos done
  _todos.forEach((t,i) => { if(t.status!=="done") updateTodo(i,"done"); });
  if (_todos.length) onEvent("", { type:"todo", todos:_todos });
}

// ── HTTP stream ───────────────────────────────────────────────────────────────
function streamCall(messages, token, modelOverride, onChunk) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ messages, stream:true, mode:getMode(), ...(modelOverride?{model:modelOverride}:{}) });
    const u = new URL(`${BASE_URL}/api/koder/chat`);
    const lib = u.protocol==="https:" ? https : http;
    const req = lib.request({
      hostname:u.hostname, port:u.port||(u.protocol==="https:"?443:80),
      path:u.pathname, method:"POST",
      headers:{ "Content-Type":"application/json", "Content-Length":Buffer.byteLength(body), "Authorization":`Bearer ${token}` },
    }, (res) => {
      if (res.statusCode===429||res.statusCode>=400) {
        let raw="";
        res.on("data",(c)=>(raw+=c));
        res.on("end",()=>{ try{reject(new Error(JSON.parse(raw).error||`HTTP ${res.statusCode}`))}catch{reject(new Error(`HTTP ${res.statusCode}`))} });
        return;
      }
      let buf="", full="";
      res.on("data",(chunk)=>{
        buf+=chunk.toString();
        const lines=buf.split("\n"); buf=lines.pop()||"";
        for(const line of lines){
          if(!line.startsWith("data: ")) continue;
          const json=line.slice(6).trim();
          if(json==="[DONE]") continue;
          try{ const d=JSON.parse(json); const t=d.choices?.[0]?.delta?.content||""; if(t){full+=t;onChunk(t);} }catch{ /* skip */ }
        }
      });
      res.on("end",()=>resolve(full));
      res.on("error",reject);
    });
    req.on("error",reject);
    req.write(body);
    req.end();
  });
}

// ── Tool label helpers ────────────────────────────────────────────────────────
function toolName(tool,args){
  if(tool==="read_file"||tool==="write_file"||tool==="edit_file") return args.path||tool;
  if(tool==="run_shell") return args.command||"shell";
  if(tool==="list_files") return args.path||".";
  return tool;
}
function toolDetail(tool,args){
  if(tool==="write_file") return `${(args.content||"").split("\n").length} lines`;
  if(tool==="edit_file") return "patching";
  return "";
}
function resultDetail(tool,result){
  if(tool==="read_file") return `${result.lines||0} lines`;
  if(tool==="write_file"||tool==="edit_file") return "saved";
  if(tool==="run_shell") return (result.output||"").split("\n")[0].slice(0,60);
  if(tool==="list_files") return `${Array.isArray(result)?result.length:0} entries`;
  return "done";
}

module.exports = { chat, resetHistory, printTodo };
