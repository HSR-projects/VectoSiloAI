import { spawn } from "child_process";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { createHash, randomBytes } from "crypto";

const DESKTOP_PORT = parseInt(process.env.DESKTOP_WS_PORT || "3003");
const WS_SECRET = process.env.WS_SECRET || ""; // optional shared secret for external connections

// Token store: token -> { containerId, expiresAt }
const tokenStore = new Map();
const TOKEN_TTL = 5 * 60 * 1000; // 5 min

function cleanupTokens() {
  const now = Date.now();
  for (const [token, data] of tokenStore) {
    if (data.expiresAt < now) tokenStore.delete(token);
  }
}
setInterval(cleanupTokens, 60_000);

function issueToken(containerId) {
  const token = createHash("sha256").update(randomBytes(32).toString("hex")).digest("hex").slice(0, 32);
  tokenStore.set(token, { containerId, expiresAt: Date.now() + TOKEN_TTL });
  return token;
}

function consumeToken(token) {
  const data = tokenStore.get(token);
  if (!data) return null;
  if (data.expiresAt < Date.now()) {
    tokenStore.delete(token);
    return null;
  }
  tokenStore.delete(token); // single-use
  return data.containerId;
}

const httpServer = createServer((req, res) => {
  // Handle JSON body for POST /api/token
  if (req.method === "POST" && req.url === "/api/token") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { containerId, secret } = JSON.parse(body);
        // If a shared secret is configured, require it for token issuance
        if (WS_SECRET && secret !== WS_SECRET) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid secret" }));
          return;
        }
        if (!containerId || typeof containerId !== "string") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "containerId required" }));
          return;
        }
        const token = issueToken(containerId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ token }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const path = url.pathname;

  // /shell/:containerId — interactive terminal (legacy, no auth)
  // /shell?token=:token — authenticated terminal
  let containerId = null;

  const shellMatch = path.match(/^\/shell\/(.+)$/);
  if (shellMatch) {
    containerId = shellMatch[1];
  } else if (path === "/shell") {
    const token = url.searchParams.get("token");
    if (token) containerId = consumeToken(token);
  }

  if (containerId) {
    const proc = spawn("docker", [
      "exec", "-i",
      "-e", "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games",
      "-e", "PS1=incogni@sandbox:\\w$ ",
      "-e", "TERM=xterm-256color",
      containerId,
      "script", "-q", "-c", "cd /workspace && exec bash --norc", "/dev/null",
    ]);

    proc.stdout.on("data", (d) => {
      ws.send(JSON.stringify({ type: "output", data: d.toString() }));
    });
    proc.stderr.on("data", (d) => {
      const msg = d.toString();
      ws.send(JSON.stringify({ type: "output", data: msg }));
      console.error(`[shell] container ${containerId} stderr:`, msg);
    });
    proc.on("close", (code) => {
      console.log(`[shell] container ${containerId} exited with code ${code}`);
      ws.send(JSON.stringify({ type: "exit", code }));
      ws.close();
    });
    proc.on("error", (err) => {
      console.error(`[shell] spawn error for ${containerId}:`, err);
      ws.send(JSON.stringify({ type: "error", data: `Failed to start shell: ${err.message}` }));
      ws.close();
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "input") {
          proc.stdin.write(msg.data);
        } else if (msg.type === "resize") {
          const { cols, rows } = msg;
          if (cols && rows) {
            proc.stdin.write(`\nstty cols ${Math.round(cols)} rows ${Math.round(rows)}\n`);
          }
        }
      } catch {
        proc.stdin.write(raw.toString());
      }
    });

    ws.on("close", () => {
      proc.kill();
      proc.stdin.end();
    });

    return;
  }

  // /vnc/:containerId — VNC WebSocket proxy (tunnels to x11vnc via docker exec nc)
  const vncMatch = path.match(/^\/vnc\/(.+)$/);
  if (vncMatch) {
    const containerId = vncMatch[1];

    const proc = spawn("docker", [
      "exec", "-i", containerId,
      "nc", "localhost", "5900",
    ]);

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      proc.kill();
      proc.stdin.end();
      try { ws.close(); } catch {}
    };

    proc.stdout.on("data", (data) => {
      if (!closed) ws.send(data);
    });

    proc.stderr.on("data", (data) => {
      console.error(`[vnc] ${containerId} stderr:`, data.toString());
    });

    proc.on("close", (code) => {
      if (!closed) {
        console.log(`[vnc] ${containerId} tunnel closed (code ${code})`);
        close();
      }
    });

    proc.on("error", (err) => {
      console.error(`[vnc] ${containerId} error:`, err.message);
      if (!closed) {
        ws.send(JSON.stringify({ type: "error", data: `VNC proxy failed: ${err.message}` }));
        close();
      }
    });

    ws.on("message", (data) => {
      if (!closed) {
        proc.stdin.write(typeof data === "string" ? Buffer.from(data) : data);
      }
    });

    ws.on("close", close);

    return;
  }

  ws.close();
});

httpServer.listen(DESKTOP_PORT, "0.0.0.0", () => {
  console.log(`[desktop-ws] WebSocket server on port ${DESKTOP_PORT}`);
});
