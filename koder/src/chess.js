"use strict";
/**
 * Koder chess — text-based chess with local Stockfish engine.
 * Uses UCI protocol directly; no external chess libraries required.
 */

const { spawn } = require("child_process");
const readline  = require("readline");
const fs        = require("fs");

const STOCKFISH_PATHS = [
  process.env.STOCKFISH_PATH,
  "/usr/games/stockfish",
  "/usr/bin/stockfish",
  "/usr/local/bin/stockfish",
  "/opt/homebrew/bin/stockfish",
].filter(Boolean);

// ── ANSI ──────────────────────────────────────────────────────────────────────
const A = {
  reset:"\x1b[0m", bold:"\x1b[1m", dim:"\x1b[2m",
  salmon:"\x1b[38;5;209m", emerald:"\x1b[38;5;85m", gray:"\x1b[90m",
  white:"\x1b[97m", yellow:"\x1b[33m", red:"\x1b[31m", blue:"\x1b[34m",
  cyan:"\x1b[36m", magenta:"\x1b[35m", orange:"\x1b[38;5;208m",
};
const cl = (k, t) => `${A[k]||k}${t}${A.reset}`;
const pw = (s) => process.stdout.write(s);

// ── Unicode pieces ────────────────────────────────────────────────────────────
const PIECE = {
  K:"♔", Q:"♕", R:"♖", B:"♗", N:"♘", P:"♙",
  k:"♚", q:"♛", r:"♜", b:"♝", n:"♞", p:"♟",
};

// Light squares: \x1b[48;5;222m  (wheat)
// Dark squares:  \x1b[48;5;94m   (dark goldenrod)
const SQ_LIGHT = "\x1b[48;5;222m";
const SQ_DARK  = "\x1b[48;5;94m";
const PC_WHITE = "\x1b[1;97m";   // bold white
const PC_BLACK = "\x1b[1;30m";   // bold black

// ── FEN parser ────────────────────────────────────────────────────────────────
function parseFen(fen) {
  const parts  = fen.split(" ");
  const ranks  = parts[0].split("/");
  const board  = [];             // board[0] = rank 8 row

  for (const rank of ranks) {
    const row = [];
    for (const ch of rank) {
      if (/\d/.test(ch)) for (let i=0;i<+ch;i++) row.push(null);
      else row.push(ch);
    }
    board.push(row);
  }
  return {
    board,
    turn:       parts[1] || "w",
    castling:   parts[2] || "-",
    ep:         parts[3] || "-",
    halfmove:   +parts[4] || 0,
    fullmove:   +parts[5] || 1,
  };
}

// ── Board renderer ────────────────────────────────────────────────────────────
function renderBoard(fen, playerColor="white", lastMove=null) {
  const { board, turn, fullmove } = parseFen(fen);
  const flipped = playerColor === "black";

  const rankOrder = flipped ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const fileOrder = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  const lmSquares = new Set();
  if (lastMove && lastMove.length >= 4) {
    lmSquares.add(lastMove.slice(0,2));
    lmSquares.add(lastMove.slice(2,4));
  }

  function sqName(ri, fi) {
    return String.fromCharCode(97+fi) + (8-ri);
  }

  let out = "\n";
  out += "  " + cl("gray","┌" + "───┬".repeat(7) + "───┐") + "\n";

  for (let r=0; r<8; r++) {
    const ri = rankOrder[r];
    const rankNum = 8 - ri;
    let line = "  " + cl("dim", rankNum + " ") + cl("gray","│");

    for (let f=0; f<8; f++) {
      const fi = fileOrder[f];
      const piece = board[ri][fi];
      const isLight = (ri+fi)%2===0;
      const inLastMove = lmSquares.has(sqName(ri,fi));

      // Background: highlight last-move squares slightly
      let bg = isLight ? SQ_LIGHT : SQ_DARK;
      if (inLastMove) bg = "\x1b[48;5;228m"; // bright yellow highlight

      let cell;
      if (piece) {
        const isWhitePiece = piece===piece.toUpperCase();
        const fg = isWhitePiece ? PC_WHITE : PC_BLACK;
        cell = `${bg}${fg} ${PIECE[piece]||piece} \x1b[0m`;
      } else {
        cell = `${bg}   \x1b[0m`;
      }

      line += cell + cl("gray","│");
    }

    out += line + "\n";
    if (r < 7) out += "  " + cl("dim"," ".repeat(3)) + cl("gray","├" + "───┼".repeat(7) + "───┤") + "\n";
  }

  out += "  " + cl("gray","└" + "───┴".repeat(7) + "───┘") + "\n";

  // File labels
  const fileLabels = fileOrder.map(fi=>String.fromCharCode(97+fi)).join("   ");
  out += "    " + cl("dim", " "+fileLabels) + "\n";

  // Status line
  const turnStr = turn==="w" ? cl("white","White") : cl("dim","Black");
  const moveStr = cl("gray",`Move ${fullmove}`);
  out += `\n  ${moveStr}  ${cl("gray","·")}  ${turnStr} to move\n`;

  return out;
}

// ── Stockfish engine wrapper ──────────────────────────────────────────────────
class StockfishEngine {
  constructor() {
    this.proc  = null;
    this.buf   = "";
    this.onLine= null; // single pending listener
  }

  start() {
    return new Promise((resolve, reject) => {
      let path = null;
      for (const p of STOCKFISH_PATHS) {
        try { fs.accessSync(p, fs.constants.X_OK); path=p; break; } catch {}
      }
      if (!path) { reject(new Error("Stockfish not found. Install: sudo apt install stockfish")); return; }

      try { this.proc = spawn(path, [], { stdio:["pipe","pipe","ignore"] }); }
      catch(e) { reject(new Error("Failed to start Stockfish: "+e.message)); return; }

      this.proc.on("error", (e) => reject(new Error("Stockfish error: "+e.message)));

      let buf = "";
      this.proc.stdout.on("data", (chunk) => {
        buf += chunk.toString();
        let nl;
        while ((nl=buf.indexOf("\n"))!==-1) {
          const line = buf.slice(0,nl).trim();
          buf = buf.slice(nl+1);
          if (line && this.onLine) {
            this.onLine(line);
          }
        }
      });

      // UCI handshake
      this._waitFor(l => l==="uciok", 5000)
        .then(() => this._send("isready", l => l==="readyok", 5000))
        .then(() => resolve())
        .catch(reject);

      this.proc.stdin.write("uci\n");
    });
  }

  _waitFor(test, timeout=5000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { this.onLine=null; reject(new Error("Stockfish timeout")); }, timeout);
      this.onLine = (line) => {
        if (test(line)) { clearTimeout(t); this.onLine=null; resolve(line); }
      };
    });
  }

  _send(cmd, doneTest, timeout=5000) {
    const p = this._collect(doneTest, timeout);
    this.proc.stdin.write(cmd + "\n");
    return p;
  }

  _collect(doneTest, timeout=10000) {
    return new Promise((resolve, reject) => {
      const lines = [];
      const t = setTimeout(() => { this.onLine=null; reject(new Error("Stockfish timeout")); }, timeout);
      this.onLine = (line) => {
        lines.push(line);
        if (doneTest(line)) { clearTimeout(t); this.onLine=null; resolve(lines); }
      };
    });
  }

  async setPosition(moves) {
    const cmd = moves.length
      ? `position startpos moves ${moves.join(" ")}`
      : "position startpos";
    this.proc.stdin.write(cmd+"\n");
  }

  async getFen(moves) {
    this.proc.stdin.write("ucinewgame\n");
    await this.setPosition(moves);
    const lines = await this._send("d", l => l.startsWith("Checkers:"), 3000);
    const fenLine = lines.find(l => l.startsWith("Fen:"));
    return fenLine ? fenLine.slice(4).trim() : null;
  }

  async getLegalMoves(moves) {
    this.proc.stdin.write("ucinewgame\n");
    await this.setPosition(moves);
    const lines = await this._send("go perft 1", l => l.startsWith("Nodes searched:"), 5000);
    return lines
      .filter(l => /^[a-h][1-8][a-h][1-8]/.test(l))
      .map(l => l.split(":")[0].trim());
  }

  async getBestMove(moves, skill=8, movetimeMs=800) {
    this.proc.stdin.write(`setoption name Skill Level value ${Math.max(0,Math.min(20,skill))}\n`);
    this.proc.stdin.write("ucinewgame\n");
    await this.setPosition(moves);

    const lines = await this._send(
      `go movetime ${movetimeMs}`,
      l => l.startsWith("bestmove"),
      movetimeMs + 6000,
    );
    const best = lines.find(l => l.startsWith("bestmove"));
    if (!best) return null;
    const uci = best.split(/\s+/)[1];
    return (!uci || uci==="(none)") ? null : uci;
  }

  async getEval(moves, depth=10) {
    this.proc.stdin.write("ucinewgame\n");
    await this.setPosition(moves);
    const lines = await this._send(`go depth ${depth}`, l => l.startsWith("bestmove"), depth*500+3000);
    // Find last "info depth X score cp Y" or "score mate Y"
    let score = null;
    for (const l of lines) {
      const cp  = l.match(/score cp (-?\d+)/);
      const mate= l.match(/score mate (-?\d+)/);
      if (cp)   score = {type:"cp",  value:+cp[1]};
      if (mate) score = {type:"mate",value:+mate[1]};
    }
    return score;
  }

  quit() {
    try { this.proc.stdin.write("quit\n"); } catch {}
    try { this.proc.kill(); } catch {}
  }
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function renderEval(score, humanColor) {
  if (!score) return "";
  let label, bar;
  if (score.type==="mate") {
    label = score.value > 0
      ? cl("emerald",`Mate in ${Math.abs(score.value)}`)
      : cl("red",`Mated in ${Math.abs(score.value)}`);
    bar = "";
  } else {
    const pawns = (score.value / 100).toFixed(2);
    const pct   = Math.max(0, Math.min(100, 50 + score.value/50));
    const wBar  = Math.round(pct/5);
    label = score.value > 30  ? cl("white",`+${pawns}`)
          : score.value < -30 ? cl("gray",`${pawns}`)
          : cl("dim", "≈0");
    bar = cl("white","█".repeat(wBar)) + cl("gray","░".repeat(20-wBar));
  }
  return `  ${cl("gray","Eval")} ${bar} ${label}`;
}

// ── Move history ──────────────────────────────────────────────────────────────
function renderHistory(san, fullmove) {
  if (!san.length) return "";
  const rows = [];
  for (let i=0;i<san.length;i+=2) {
    const num = Math.ceil((i+1)/2);
    rows.push(`${cl("gray",num+".")} ${cl("white",san[i]||"")} ${cl("dim",san[i+1]||"")}`);
  }
  const tail = rows.slice(-4);
  return "\n  "+cl("gray","Moves: ")+tail.join("  ")+"\n";
}

// ── Move notation helper (UCI → basic SAN display) ────────────────────────────
function uciToDisplay(uci) {
  if (!uci || uci.length < 4) return uci;
  const from = uci.slice(0,2), to = uci.slice(2,4), promo = uci[4]||"";
  return `${from}→${to}${promo?`=${promo.toUpperCase()}`:""}`;
}

// ── Main game loop ────────────────────────────────────────────────────────────
async function playChess(opts={}) {
  const playerColor  = opts.color    || "white";
  const difficultyIn = +(opts.diff   || 5);
  const skill        = Math.round((difficultyIn-1)/9*20); // 1→0, 10→20
  const movetimeMs   = 200 + difficultyIn*100;
  const showEval     = opts.eval     !== false;

  pw("\n");
  pw("  "+cl("salmon","♟ KODER CHESS")+"  "+cl("gray",`vs Stockfish  ·  Difficulty ${difficultyIn}/10  ·  You play ${playerColor}`)+"\n");
  pw("  "+cl("gray","─".repeat(60))+"\n");
  pw("  "+cl("dim","Commands: e2e4  ·  hint  ·  eval  ·  undo  ·  flip  ·  new  ·  quit")+"\n\n");

  const engine = new StockfishEngine();
  let spinT = null;
  function spinStart(msg) {
    let i=0; const F=["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
    pw("\x1b[?25l");
    spinT = setInterval(()=>pw(`\x1b[2K\r  ${cl("emerald",F[i++%F.length])} ${cl("gray",msg)}`),80);
  }
  function spinStop(ok=true, msg="") {
    clearInterval(spinT); spinT=null;
    pw(`\x1b[2K\r  ${ok?cl("emerald","✓"):cl("red","✗")} ${msg}\n`);
    pw("\x1b[?25h");
  }

  spinStart("Starting Stockfish engine…");
  try {
    await engine.start();
    spinStop(true, "Engine ready");
  } catch(e) {
    spinStop(false, e.message);
    pw("\n  "+cl("gray","Tip: install Stockfish with: ")+cl("cyan","sudo apt install stockfish")+"\n\n");
    return;
  }

  let moves   = [];     // UCI move list (game history)
  let sanList = [];     // display SAN strings
  let fen     = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  let lastMove= null;   // last UCI move for highlight
  let flipped = playerColor==="black";

  async function getCurrentFen() {
    const f = await engine.getFen(moves);
    return f || fen;
  }

  async function refreshDisplay(evalScore=null) {
    fen = await getCurrentFen();
    pw(renderBoard(fen, flipped?"black":"white", lastMove));
    if (showEval && evalScore) pw(renderEval(evalScore, playerColor)+"\n");
    pw(renderHistory(sanList, parseFen(fen).fullmove));
  }

  async function engineTurn() {
    spinStart("Stockfish is thinking…");
    let evalScore=null;
    try {
      const mv = await engine.getBestMove(moves, skill, movetimeMs);
      if (!mv) {
        spinStop(false, "Engine has no move — game over?");
        return false;
      }
      if (showEval) evalScore = await engine.getEval(moves, 8).catch(()=>null);
      moves.push(mv);
      sanList.push(uciToDisplay(mv));
      lastMove = mv;
      spinStop(true, `Engine played ${cl("white",uciToDisplay(mv))}`);
      return true;
    } catch(e) {
      spinStop(false, "Engine error: "+e.message);
      return false;
    }
  }

  // If playing black, engine goes first
  if (playerColor==="black") {
    await engineTurn();
  }

  await refreshDisplay();

  // ── REPL ──────────────────────────────────────────────────────────────────
  const rl = readline.createInterface({ input:process.stdin, output:process.stdout, terminal:true });
  const prompt = () => new Promise(res => rl.question(`\n  ${cl("salmon","chess")} ${cl("gray","❯")} `, res));

  let running = true;
  while (running) {
    let input;
    try { input = (await prompt()).trim().toLowerCase(); }
    catch { break; }

    if (!input) continue;

    // ── Commands ────────────────────────────────────────────────────────────
    if (input==="quit"||input==="exit"||input==="q") {
      pw("\n  "+cl("gray","Goodbye! Thanks for playing.")+"\n\n");
      break;
    }

    if (input==="new") {
      moves=[]; sanList=[]; lastMove=null;
      fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      pw("\n  "+cl("emerald","✓")+" New game started!\n");
      if (playerColor==="black") await engineTurn();
      await refreshDisplay(); continue;
    }

    if (input==="flip") {
      flipped=!flipped;
      await refreshDisplay(); continue;
    }

    if (input==="undo") {
      if (moves.length<2) { pw("  "+cl("yellow","Nothing to undo.")+"\n"); continue; }
      moves.splice(-2); sanList.splice(-2); lastMove=moves[moves.length-1]||null;
      pw("  "+cl("emerald","✓")+" Undone last move pair.\n");
      await refreshDisplay(); continue;
    }

    if (input==="eval"||input==="score") {
      spinStart("Evaluating position…");
      const ev = await engine.getEval(moves, 12).catch(()=>null);
      spinStop(true,"");
      fen = await getCurrentFen();
      pw(renderBoard(fen, flipped?"black":"white", lastMove));
      pw(renderEval(ev, playerColor)+"\n\n");
      continue;
    }

    if (input==="hint") {
      spinStart("Getting hint…");
      const mv = await engine.getBestMove(moves, 20, 1500).catch(()=>null);
      spinStop(mv?true:false, mv ? `Try ${cl("white",uciToDisplay(mv))}` : "No hint available");
      continue;
    }

    if (input==="moves") {
      spinStart("Getting legal moves…");
      const legal = await engine.getLegalMoves(moves).catch(()=>[]);
      spinStop(true,"");
      pw("\n  "+cl("gray","Legal moves ("+legal.length+"):")+"\n");
      const chunks = [];
      for (let i=0;i<legal.length;i+=8) chunks.push(legal.slice(i,i+8));
      chunks.forEach(c=>pw("    "+c.map(m=>cl("white",m)).join("  ")+"\n"));
      pw("\n");
      continue;
    }

    if (input==="board"||input==="show") {
      await refreshDisplay(); continue;
    }

    if (input==="help"||input==="?") {
      pw(`
  ${cl("bold","Chess commands")}
  ${cl("salmon","e2e4")}          Make a move (UCI format: from+to, e.g. g1f3)
  ${cl("salmon","hint")}          Get a move suggestion from the engine
  ${cl("salmon","eval")}          Show current position evaluation
  ${cl("salmon","moves")}         List all legal moves
  ${cl("salmon","board")}         Redraw the board
  ${cl("salmon","undo")}          Take back last 2 plies (your move + engine's)
  ${cl("salmon","flip")}          Flip board orientation
  ${cl("salmon","new")}           Start a new game
  ${cl("salmon","quit")}          Exit chess and return to Koder

  ${cl("gray","UCI format: e2e4 (pawn e2→e4), g1f3 (knight g1→f3), e7e8q (promote to queen)")}
`);
      continue;
    }

    // ── Try as a move ────────────────────────────────────────────────────────
    const moveRe = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
    if (!moveRe.test(input)) {
      pw("  "+cl("yellow","Unknown command or invalid move. Type 'help' for commands.")+"\n");
      continue;
    }

    // Validate: check if it's in legal moves
    spinStart("Validating…");
    const legal = await engine.getLegalMoves(moves).catch(()=>[]);
    spinStop(true,"");

    if (!legal.includes(input)) {
      if (legal.length===0) {
        pw("  "+cl("red","Game over — no legal moves.")+"\n");
      } else {
        pw("  "+cl("red","Illegal move. ")+cl("gray","Use UCI format, e.g. e2e4. Type 'moves' to list.")+"\n");
      }
      continue;
    }

    // Apply human move
    moves.push(input);
    sanList.push(uciToDisplay(input));
    lastMove = input;
    pw("  "+cl("emerald","✓")+" You played "+cl("white",uciToDisplay(input))+"\n");

    // Check if game over after human move
    const legalAfter = await engine.getLegalMoves(moves).catch(()=>[]);
    if (legalAfter.length===0) {
      fen = await getCurrentFen();
      pw(renderBoard(fen, flipped?"black":"white", lastMove));
      const { turn } = parseFen(fen);
      // Determine checkmate vs stalemate: if it was a check it's checkmate
      pw("\n  "+cl("bold","Game over!")+"\n\n");
      break;
    }

    // Engine's turn
    const ok = await engineTurn();
    if (!ok) break;

    // Check game over after engine move
    const legalAfterEngine = await engine.getLegalMoves(moves).catch(()=>[]);
    let evalScore = null;
    if (showEval) evalScore = await engine.getEval(moves, 8).catch(()=>null);
    await refreshDisplay(evalScore);

    if (legalAfterEngine.length===0) {
      pw("\n  "+cl("bold","Game over!")+"\n\n");
      break;
    }
  }

  rl.close();
  engine.quit();
}

module.exports = { playChess };
