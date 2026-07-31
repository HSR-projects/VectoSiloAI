"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Code2, Copy, Download, PencilLine, Play, RefreshCw, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/** Extract raw text from arbitrary React children (for copy-to-clipboard). */
function childrenToText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join("");
  if (
    children &&
    typeof children === "object" &&
    "props" in children &&
    (children as { props?: { children?: ReactNode } }).props
  ) {
    return childrenToText(
      (children as { props: { children?: ReactNode } }).props.children
    );
  }
  return "";
}

/** Pull the language hint (e.g. "html") from a code element's className. */
function langFromChildren(children: ReactNode): string {
  const el = Array.isArray(children) ? children[0] : children;
  const className =
    el && typeof el === "object" && "props" in el
      ? ((el as { props?: { className?: string } }).props?.className ?? "")
      : "";
  const match = /language-([\w-]+)/.exec(className);
  return (match?.[1] ?? "").toLowerCase();
}

const LANG_EXT: Record<string, string> = {
  html: "html", htm: "html", css: "css",
  js: "js", javascript: "js", jsx: "jsx",
  ts: "ts", typescript: "ts", tsx: "tsx",
  py: "py", python: "py", json: "json",
  yaml: "yml", yml: "yml", sh: "sh", bash: "sh",
  sql: "sql", md: "md", markdown: "md",
  php: "php", ruby: "rb", rust: "rs",
  go: "go", java: "java", c: "c", cpp: "cpp",
  xml: "xml", svg: "svg",
};

function detectFilename(lang: string, code: string): string {
  const first = code.split("\n")[0].trim();
  const patterns = [
    /^\/\/\s*([\w.-]+\.\w+)/,
    /^\/\*+\s*([\w.-]+\.\w+)/,
    /^<!--\s*([\w.-]+\.\w+)/,
    /^#\s*([\w.-]+\.\w+)/,
  ];
  for (const p of patterns) {
    const m = first.match(p);
    if (m) return m[1];
  }
  const ext = LANG_EXT[lang] ?? lang ?? "txt";
  return `file.${ext}`;
}

const PREVIEW_LANGS = new Set([
  "html",
  "htm",
  "xml",
  "svg",
  "css",
  "js",
  "javascript",
  "jsx",
]);

/** Wrap a code snippet into a full, runnable HTML document for the iframe. */
function buildPreviewDoc(lang: string, code: string): string {
  const base = `<!doctype html><html><head><meta charset="utf-8" />
<style>html,body{margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif;color:#111;background:#fff}</style>`;

  // A full HTML document — render as-is.
  if (/<html[\s>]/i.test(code) || /<!doctype/i.test(code)) return code;

  if (lang === "svg" || (lang === "xml" && /<svg[\s>]/i.test(code))) {
    // Render the SVG centered on a checkerboard so transparency is visible.
    return `${base}<style>body{display:grid;place-items:center;min-height:100vh;background-color:#fff;background-image:linear-gradient(45deg,#e9e9ee 25%,transparent 25%),linear-gradient(-45deg,#e9e9ee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e9e9ee 75%),linear-gradient(-45deg,transparent 75%,#e9e9ee 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0}svg{max-width:92%;max-height:92vh;height:auto}</style></head><body>${code}</body></html>`;
  }

  if (lang === "css") {
    return `${base}<style>${code}</style></head><body>
<h1>Heading</h1><p>Sample paragraph with <a href="#">a link</a> and <strong>bold</strong> text.</p>
<button>Button</button>
<ul><li>List item one</li><li>List item two</li></ul>
<div class="box card">.box / .card demo</div>
</body></html>`;
  }

  if (lang === "js" || lang === "javascript" || lang === "jsx") {
    return `${base}</head><body>
<div id="app"></div>
<pre id="__console" style="white-space:pre-wrap;color:#555;font:12px ui-monospace,monospace"></pre>
<script>
  (function(){
    var out=document.getElementById('__console');
    var log=function(){ out.textContent += Array.from(arguments).map(function(a){
      try{return typeof a==='object'?JSON.stringify(a,null,2):String(a)}catch(e){return String(a)}
    }).join(' ')+'\\n'; };
    console.log=log; console.info=log; console.warn=log; console.error=log;
    window.onerror=function(m){ out.textContent += 'Error: '+m+'\\n'; };
  })();
</script>
<script>${code}</script>
</body></html>`;
  }

  // html / htm / xml / svg fragment.
  return `${base}</head><body>${code}</body></html>`;
}

export function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"code" | "preview">("code");
  const [runKey, setRunKey] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editedCode, setEditedCode] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lang = useMemo(() => langFromChildren(children), [children]);
  const rawText = useMemo(() => childrenToText(children).trimEnd(), [children]);
  const canPreview = PREVIEW_LANGS.has(lang);

  // SVG is visual — show the rendered result first.
  const isSvg = lang === "svg" || (lang === "xml" && /<svg[\s>]/i.test(rawText));
  useEffect(() => {
    if (isSvg) setTab("preview");
  }, [isSvg]);

  const displayCode = editedCode ?? rawText;
  const isEdited = editedCode !== null;

  const srcDoc = useMemo(
    () => (canPreview ? buildPreviewDoc(lang, displayCode) : ""),
    [canPreview, lang, displayCode]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const download = () => {
    const filename = detectFilename(lang, displayCode);
    const blob = new Blob([displayCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const enterEdit = () => {
    setEditedCode(displayCode);
    setEditMode(true);
    setTab("code");
    // focus textarea on next frame
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const exitEdit = () => setEditMode(false);

  const reset = () => {
    setEditedCode(null);
    setEditMode(false);
    setRunKey((k) => k + 1);
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-md bg-black">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between bg-[#2f2f2f] px-4 py-2 text-xs text-[#b4b4b4]">
        {lang && (
          <span className="font-sans font-medium">
            {lang}
          </span>
        )}

        {canPreview && !editMode && (
          <div className="flex items-center rounded-md p-0.5">
            <TabButton
              active={tab === "code"}
              onClick={() => setTab("code")}
              icon={<Code2 className="h-3 w-3" />}
              label="Code"
            />
            <TabButton
              active={tab === "preview"}
              onClick={() => setTab("preview")}
              icon={<Play className="h-3 w-3" />}
              label="Preview"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {canPreview && tab === "preview" && !editMode && (
            <button
              type="button"
              onClick={() => setRunKey((k) => k + 1)}
              aria-label="Re-run preview"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Rerun
            </button>
          )}

          {/* Edit / Done toggle */}
          {editMode ? (
            <button
              type="button"
              onClick={exitEdit}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <Check className="h-3.5 w-3.5" /> Done
            </button>
          ) : (
            <button
              type="button"
              onClick={enterEdit}
              aria-label="Edit code"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <PencilLine className="h-3.5 w-3.5" /> Edit
            </button>
          )}

          {/* Reset — only when user has modified */}
          {isEdited && !editMode && (
            <button
              type="button"
              onClick={reset}
              aria-label="Reset to original"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-red-400"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}

          <button
            type="button"
            onClick={download}
            aria-label="Download file"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy code"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      {editMode ? (
        <textarea
          ref={textareaRef}
          value={editedCode ?? rawText}
          onChange={(e) => setEditedCode(e.target.value)}
          spellCheck={false}
          className="w-full resize-none bg-[#141416] p-4 font-mono text-sm leading-relaxed text-incogni-text/90 outline-none"
          style={{ minHeight: `${Math.max(6, (editedCode ?? rawText).split("\n").length + 1) * 1.5}rem` }}
        />
      ) : canPreview && tab === "preview" ? (
        <iframe
          key={runKey}
          title="Code preview"
          sandbox="allow-scripts allow-modals"
          className="h-80 w-full bg-white"
          srcDoc={srcDoc}
        />
      ) : (
        <pre className="overflow-x-auto p-4 text-sm text-gray-200 [&_code]:bg-transparent">
          {children}
        </pre>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-1 transition-colors hover:text-white",
        active ? "text-white" : ""
      )}
    >
      {icon}
      {label}
    </button>
  );
}
