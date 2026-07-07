// Minimal "Continue with KodaAI" demo — a sample third-party website that
// integrates KodaAI's OAuth provider end to end. Zero dependencies: just Node's
// built-in http + global fetch (Node 18+).
//
//   1. Register an app at <KodaAI>/developers → OAuth Apps
//      Redirect URI:  http://localhost:4567/callback
//   2. CLIENT_ID=... CLIENT_SECRET=... node server.mjs
//   3. Open http://localhost:4567 and click "Continue with KodaAI".

import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT || 4567);
const KODA = (process.env.KODA_BASE_URL || "http://localhost:3002").replace(/\/$/, "");
const CLIENT_ID = process.env.CLIENT_ID || "";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "";
const REDIRECT_URI = process.env.REDIRECT_URI || `http://localhost:${PORT}/callback`;
const SCOPE = process.env.SCOPE || "profile email";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "\n  Missing CLIENT_ID / CLIENT_SECRET.\n" +
      "  Register an app at " + KODA + "/developers (OAuth Apps),\n" +
      "  set redirect URI to " + REDIRECT_URI + ", then run:\n\n" +
      "    CLIENT_ID=koda_... CLIENT_SECRET=koda_sk_... node server.mjs\n",
  );
  process.exit(1);
}

const html = (body) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KodaAI OAuth Demo</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#0a0a0c;color:#e8e8ea;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
  .card{width:100%;max-width:420px;background:rgba(20,20,23,.7);border:1px solid #2a2a31;
        border-radius:20px;padding:32px;text-align:center}
  h1{font-size:22px;margin:0 0 6px} p{color:#9a9aa2;font-size:14px;margin:0 0 24px}
  .brand{font-weight:700} .brand span{color:#7c3aed}
  a.btn,button{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;
       box-sizing:border-box;padding:12px 16px;border-radius:10px;background:#7c3aed;color:#000;
       font-weight:600;font-size:14px;text-decoration:none;border:0;cursor:pointer}
  .avatar{width:64px;height:64px;border-radius:50%;margin:0 auto 16px;background:#7c3aed;
          display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff}
  .row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #2a2a31;font-size:14px;text-align:left}
  .row span:first-child{color:#9a9aa2} .row span:last-child{color:#e8e8ea;font-weight:500;word-break:break-all}
  .err{color:#f87171;font-size:13px;margin-top:12px}
  .muted{color:#9a9aa2;font-size:12px;margin-top:16px}
  pre{text-align:left;background:#141416;border:1px solid #2a2a31;border-radius:10px;padding:12px;
      font-size:11px;overflow:auto;color:#cfcfd4}
</style></head><body><div class="card">${body}</div></body></html>`;

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((c) => {
    const i = c.indexOf("=");
    if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ── Landing page: the "Continue with KodaAI" button ──
  if (url.pathname === "/") {
    const state = crypto.randomBytes(16).toString("hex");
    const authUrl =
      `${KODA}/oauth/authorize?` +
      new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        scope: SCOPE,
        state,
      });
    res.writeHead(200, {
      "Content-Type": "text/html",
      "Set-Cookie": `demo_state=${state}; HttpOnly; Path=/; SameSite=Lax`,
    });
    res.end(
      html(`
        <h1>Acme Widgets</h1>
        <p>A sample app using <span class="brand">Koda<span>AI</span></span> to sign in.</p>
        <a class="btn" href="${authUrl}">Continue with KodaAI</a>
        <p class="muted">Provider: ${KODA}</p>
      `),
    );
    return;
  }

  // ── OAuth callback: exchange code → token → userinfo ──
  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");
    const cookies = parseCookies(req);

    const fail = (msg) => {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(html(`<h1>Sign-in failed</h1><p class="err">${msg}</p><a class="btn" href="/">Try again</a>`));
    };

    if (oauthError) return fail(`Provider returned: ${oauthError}`);
    if (!code) return fail("No authorization code returned.");
    if (!state || state !== cookies.demo_state) return fail("State mismatch (possible CSRF).");

    try {
      // 1) Exchange the authorization code for an access token.
      const tokenRes = await fetch(`${KODA}/api/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
        }),
      });
      const token = await tokenRes.json();
      if (!tokenRes.ok || !token.access_token) {
        return fail(`Token exchange failed: ${token.error || tokenRes.status}`);
      }

      // 2) Fetch the user's profile with the access token.
      const infoRes = await fetch(`${KODA}/api/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const info = await infoRes.json();
      if (!infoRes.ok) return fail(`userinfo failed: ${info.error || infoRes.status}`);

      const initial = (info.name || info.email || "?").charAt(0).toUpperCase();
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        html(`
          <div class="avatar">${initial}</div>
          <h1>Signed in with KodaAI</h1>
          <p>The demo app received your profile:</p>
          <div class="row"><span>Name</span><span>${info.name ?? "—"}</span></div>
          <div class="row"><span>Email</span><span>${info.email ?? "—"}</span></div>
          <div class="row"><span>Subject (id)</span><span>${info.sub ?? "—"}</span></div>
          <div class="row"><span>Scope granted</span><span>${token.scope ?? "—"}</span></div>
          <p class="muted">Raw token response &amp; userinfo:</p>
          <pre>${escapeHtml(JSON.stringify({ token, info }, null, 2))}</pre>
          <a class="btn" href="/" style="margin-top:16px">Start over</a>
        `),
      );
    } catch (e) {
      fail(`Network error: ${e.message}`);
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "text/html" });
  res.end(html(`<h1>404</h1><a class="btn" href="/">Home</a>`));
});

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

server.listen(PORT, () => {
  console.log(`\n  KodaAI OAuth demo running:  http://localhost:${PORT}`);
  console.log(`  Provider:                   ${KODA}`);
  console.log(`  Redirect URI:               ${REDIRECT_URI}\n`);
});
