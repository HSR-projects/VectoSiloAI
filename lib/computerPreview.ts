import type { ProjectFile } from "@/types";

/**
 * In-browser preview for Incogni's Computer.
 *
 * Two strategies, picked from the project shape:
 * Strategy:
 *  • Static site → assemble index.html, inlining local CSS/JS, render in iframe.
 *
 * Everything runs in a sandboxed iframe via `srcDoc`, so the generated app can
 * never touch the host page.
 */

function norm(path: string): string {
  return path.replace(/^\.?\/+/, "");
}

function ext(path: string): string {
  const i = path.lastIndexOf(".");
  return i >= 0 ? path.slice(i + 1).toLowerCase() : "";
}

function toMap(files: ProjectFile[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of files) map[norm(f.path)] = f.content;
  return map;
}

/** Always returns false because we no longer compile React inside the browser iframe. */
export function isReactProject(files: ProjectFile[]): boolean {
  return false; // Force everything through standard build processes in the sandbox
}

const RESET_CSS = `*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}#root,#app{min-height:100vh}`;

/**
 * Keeps the preview from escaping its iframe. The sandbox is same-origin (so
 * storage/router work), which means a placeholder link like href="/" would
 * otherwise navigate the frame to OUR app. This intercepts plain navigations:
 * external links open in a new tab; internal/dummy links are neutralized.
 * Framework routers (react-router) call preventDefault first, so they're left
 * alone (we run in the bubble phase and skip already-handled clicks).
 */
const NAV_GUARD = `
(function(){
  function isExternal(h){return h.indexOf('http://')===0||h.indexOf('https://')===0||h.indexOf('//')===0||h.indexOf('mailto:')===0||h.indexOf('tel:')===0;}
  document.addEventListener('click',function(e){
    if(e.defaultPrevented)return;
    var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;
    if(!a)return;
    var href=a.getAttribute('href')||'';
    if(!href||href.charAt(0)==='#')return;
    if(isExternal(href)){a.target='_blank';a.rel='noopener noreferrer';return;}
    e.preventDefault();
  },false);
  document.addEventListener('submit',function(e){if(!e.defaultPrevented)e.preventDefault();},false);
})();
`;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Build a static-site preview by inlining local CSS/JS into index.html. */
function staticSrcDoc(files: ProjectFile[]): string {
  const map = toMap(files);
  let html =
    map["index.html"] ||
    `<!doctype html><html><body><pre>${escapeHtml(
      files.map((f) => f.path).join("\n")
    )}</pre></body></html>`;

  // Inline <link rel="stylesheet" href="local.css">
  html = html.replace(
    /<link[^>]*href=["']([^"']+)["'][^>]*>/gi,
    (m, href) => {
      const key = norm(href);
      if (/^https?:|^\/\//.test(href)) return m;
      return map[key] != null ? `<style>${map[key]}</style>` : m;
    }
  );

  // Inline <script src="local.js"></script>
  html = html.replace(
    /<script[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (m, src) => {
      const key = norm(src);
      if (/^https?:|^\/\//.test(src)) return m;
      return map[key] != null ? `<script>${map[key]}</script>` : m;
    }
  );

  // Stop placeholder links from navigating the iframe back to our app.
  const guard = `<script>${NAV_GUARD}</script>`;
  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${guard}</body>`);
  else html += guard;

  return html;
}

/** Build the full iframe srcDoc for a project. */
export function buildPreviewSrcDoc(files: ProjectFile[]): string {
  if (!files.length) {
    return `<!doctype html><html><body style="font:14px system-ui;color:#888;display:grid;place-items:center;height:100vh;margin:0;background:#0b0b0d">Waiting for files…</body></html>`;
  }
  return staticSrcDoc(files);
}
