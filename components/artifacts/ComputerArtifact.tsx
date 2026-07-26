"use client";

import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import hljs from "highlight.js";
import {
  ChevronRight,
  Download,
  ExternalLink,
  File as FileIcon,
  FileCode2,
  Folder,
  FolderOpen,
  Loader2,
  Monitor,
  MonitorPlay,
  RefreshCw,
  TerminalSquare,
  Zap,
} from "lucide-react";
import { useIncogniStore } from "@/lib/store";
import { buildPreviewSrcDoc, isReactProject } from "@/lib/computerPreview";
import { downloadZip } from "@/lib/zip";
import { cn } from "@/lib/utils";
import { useWebContainer } from "@/hooks/useWebContainer";
import { SandboxTerminal } from "./SandboxTerminal";
import { SandboxDesktop } from "./SandboxDesktop";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ComputerStatus, ProjectFile } from "@/types";

type Tab = "preview" | "code" | "terminal" | "desktop";

const HLJS_LANG: Record<string, string> = {
  js: "javascript", jsx: "javascript", mjs: "javascript",
  ts: "typescript", tsx: "typescript",
  html: "xml", htm: "xml", svg: "xml", xml: "xml",
  css: "css", json: "json", md: "markdown",
};

function extOf(path: string): string {
  const i = path.lastIndexOf(".");
  return i >= 0 ? path.slice(i + 1).toLowerCase() : "";
}

export function ComputerArtifact() {
  const computer = useIncogniStore((s) => s.computer);
  const setActive = useIncogniStore((s) => s.setComputerActiveFile);
  const [tab, setTab] = useState<Tab>("terminal");
  const [runKey, setRunKey] = useState(0);
  const termRef = useRef<HTMLDivElement>(null);

  // User's plan capabilities
  const { caps } = useAuth();
  const hasRealTerminal = caps?.desktop === true; // Ultra only
  const isUltra = hasRealTerminal;

  // Real Node.js execution via WebContainers (React/Vite projects or Go/Pro/Max tiers)
  const wc = useWebContainer();
  const isReact = useMemo(() => isReactProject(computer?.files ?? []), [computer?.files]);
  const wcMountedKey = useRef<string>("");

  // Docker sandbox for Ultra tier non-React projects
  const [containerId, setContainerId] = useState<string | null>(null);
  const [sandboxOutput, setSandboxOutput] = useState<string[]>([]);
  const [sandboxBusy, setSandboxBusy] = useState(false);
  const [sandboxReady, setSandboxReady] = useState(false);
  const [sandboxAllowed, setSandboxAllowed] = useState<boolean | null>(null); // null = not checked
  const sandboxOutputRef = useRef<HTMLDivElement>(null);
  const provisionedSig = useRef<string>("");

  const files = computer?.files ?? [];
  const activePath = computer?.activePath;
  const activeFile = files.find((f) => f.path === activePath) ?? files[0];

  const [wcFailed, setWcFailed] = useState(false);

  // Use WebContainer for: React projects OR non-Ultra tiers (Go/Pro/Max)
  // Use Docker sandbox only for: Ultra tier + non-React projects
  const useWebContainerMode = (isReact || !isUltra) && !wcFailed;
  const useDockerSandbox = !useWebContainerMode && !isReact && isUltra && computer?.live;

  // Docker sandbox provisioning (Ultra tier + non-React only)
  useEffect(() => {
    if (!useDockerSandbox) return;
    if (sandboxAllowed === false) return;
    if (computer?.status !== "ready" && computer?.status !== "running") return;

    const sig = computer.title + "|" + files.length + "|" + (computer?.commands?.length ?? 0);
    if (sig === provisionedSig.current) return;
    provisionedSig.current = sig;

    setSandboxOutput([]);
    setSandboxBusy(true);
    const out = (line: string) => setSandboxOutput((p) => [...p, line + "\n"]);

    (async () => {
      // Check sandbox availability and create container
      if (sandboxAllowed !== true) {
        out("Checking sandbox availability…");
      }
      let cid = containerId;
      if (!cid) {
        const res = await fetch("/api/sandbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create" }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Sandbox not available" }));
          setSandboxAllowed(false);
          out(`✗ ${err.error}`);
          setSandboxBusy(false);
          return;
        }
        const data = await res.json();
        cid = data.containerId;
        setContainerId(cid);
        setSandboxAllowed(true);
      }

      // Write files
      out(`$ scaffolding project (${files.length} files)…`);
      for (const f of files) {
        try {
          const res = await fetch("/api/sandbox", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "write",
              containerId: cid,
              path: `/workspace/${f.path}`,
              content: f.content,
            }),
          });
          if (res.ok) out(`  ✓ ${f.path}`);
          else out(`  ✗ ${f.path}`);
        } catch {
          out(`  ✗ ${f.path}`);
        }
      }

      // Run commands
      const cmds = computer?.commands?.length
        ? computer.commands
        : ["echo 'No build commands specified'"];
      for (const cmd of cmds) {
        out(`$ ${cmd}`);
        try {
          const res = await fetch("/api/sandbox", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "exec",
              containerId: cid,
              command: cmd,
              workdir: "/workspace",
            }),
          });
          const data = await res.json();
          if (data.stdout) out(data.stdout);
          if (data.stderr) out(data.stderr);
          if (data.exitCode !== 0) out(`exit code: ${data.exitCode}`);
        } catch (e) {
          out(`Error: ${(e as Error).message}`);
        }
      }

      out("✓ Build complete. You can type commands below.");
      setSandboxBusy(false);
      setSandboxReady(true);
      if (computer?.status !== "ready") {
        useIncogniStore.getState().setComputerStatus("ready");
      }
    })();
  }, [useDockerSandbox, files, computer?.title, computer?.commands, computer?.status, sandboxAllowed, containerId]);

  // Mount files into WebContainer when the project is ready
  useEffect(() => {
    if (!files.length || wcFailed) return;
    if (wc.status === "error") { setWcFailed(true); return; }
    if (wc.status === "booting" || wc.status === "installing" || wc.status === "starting") return;
    const key = files.map((f) => f.path + f.content.length).join("|");
    if (key === wcMountedKey.current) return;
    wcMountedKey.current = key;
    void wc.mount(files, computer?.commands ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, wc.status, wcFailed]);

  // Auto-jump to preview (React) or terminal (Docker sandbox) when ready
  const ranRef = useRef(false);
  useEffect(() => {
    if (ranRef.current) return;
    if (isReact && wc.status === "ready" && files.length) {
      ranRef.current = true;
      setTab("preview");
    } else if (sandboxReady) {
      ranRef.current = true;
      setTab("terminal");
    }
  }, [wc.status, sandboxReady, files.length, isReact]);

  // Keep terminal scrolled to bottom
  useEffect(() => {
    if (tab === "terminal") {
      if (useWebContainerMode && termRef.current) {
        termRef.current.scrollTop = termRef.current.scrollHeight;
      }
      if (useDockerSandbox && sandboxOutputRef.current) {
        sandboxOutputRef.current.scrollTop = sandboxOutputRef.current.scrollHeight;
      }
    }
  }, [wc.terminal, computer?.terminal, sandboxOutput, tab, useWebContainerMode, useDockerSandbox]);

  const sandboxActive = useDockerSandbox && sandboxAllowed === true && containerId;
  const isSnapshot = !useWebContainerMode && computer && !computer.live;

  const srcDoc = useMemo(
    () => buildPreviewSrcDoc(files),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(files), runKey]
  );

  // PostMessage listener for preview errors & auto-fixing
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === "INCOGNI_PREVIEW_FIX" && e.data?.error) {
        const fixEvent = new CustomEvent("incogni-fix-code", {
          detail: { error: e.data.error, title: computer?.title },
        });
        window.dispatchEvent(fixEvent);
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [computer?.title]);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishSlug, setPublishSlug] = useState("");
  const [publishStatus, setPublishStatus] = useState<"idle" | "checking" | "ok" | "error" | "taken">("idle");
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const handlePublish = useCallback(async () => {
    if (!publishSlug || !files.length) return;
    setPublishStatus("checking");
    try {
      const res = await fetch("/api/published", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: publishSlug,
          title: computer?.title ?? "Untitled",
          files,
          commands: computer?.commands ?? [],
        }),
      });
      if (res.status === 409) { setPublishStatus("taken"); return; }
      if (!res.ok) { setPublishStatus("error"); return; }
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setPublishedUrl(`${origin}/view/${publishSlug}`);
      setPublishStatus("ok");
    } catch {
      setPublishStatus("error");
    }
  }, [publishSlug, files, computer]);

  if (!computer) return null;

  const openInNewTab = () => {
    if (useWebContainerMode && wc.previewUrl) {
      window.open(wc.previewUrl, "_blank", "noopener");
      return;
    }
    const blob = new Blob([srcDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const effectiveStatus: ComputerStatus = useWebContainerMode
    ? wcStatusToStore(wc.status)
    : computer.status ?? "building";

  const termLines = useWebContainerMode ? wc.terminal : computer.terminal;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-incogni-border px-3 py-2">
        <div className="flex items-center rounded-lg bg-incogni-surface-2 p-0.5">
          <TabBtn active={tab === "preview"} onClick={() => setTab("preview")} icon={<Monitor className="h-3.5 w-3.5" />} label="Preview" />
          <TabBtn active={tab === "code"} onClick={() => setTab("code")} icon={<FileCode2 className="h-3.5 w-3.5" />} label="Code" />
          <TabBtn active={tab === "terminal"} onClick={() => setTab("terminal")} icon={<TerminalSquare className="h-3.5 w-3.5" />} label="Terminal" />
          {hasRealTerminal && useDockerSandbox && (
            <TabBtn active={tab === "desktop"} onClick={() => setTab("desktop")} icon={<MonitorPlay className="h-3.5 w-3.5" />} label="Desktop" />
          )}
        </div>

        <StatusPill status={effectiveStatus} isReal={isReact} />

        <div className="ml-auto flex items-center gap-1">
          {tab === "preview" && (
            <>
              <IconBtn
                onClick={() => { isReact ? wc.reload() : setRunKey((k) => k + 1); }}
                title="Reload preview"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn onClick={openInNewTab} title="Open in new tab">
                <ExternalLink className="h-3.5 w-3.5" />
              </IconBtn>
            </>
          )}
          <button
            type="button"
            onClick={() => downloadZip(computer.title, files)}
            disabled={!files.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-incogni-border bg-incogni-surface px-2.5 py-1.5 text-xs font-medium text-incogni-text transition-colors hover:bg-incogni-surface-2 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
          <button
            type="button"
            onClick={() => { setPublishSlug(computer.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); setPublishOpen(true); setPublishStatus("idle"); setPublishedUrl(null); }}
            disabled={!files.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-incogni-accent/30 bg-incogni-accent/10 px-2.5 py-1.5 text-xs font-medium text-incogni-accent-soft transition-colors hover:bg-incogni-accent/20 disabled:opacity-40"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Publish
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-hidden">
        {tab === "preview" && (
          !wcFailed && wc.previewUrl ? (
            <iframe
              key={wc.previewUrl}
              title={`${computer.title} preview`}
              src={wc.previewUrl}
              className="h-full w-full bg-white"
            />
          ) : !wcFailed && (wc.status === "installing" || wc.status === "starting" || wc.status === "booting") ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-incogni-muted">
              <Loader2 className="h-6 w-6 animate-spin text-incogni-accent" />
              <p className="text-sm">
                {wc.status === "booting" ? "Booting Linux runtime…" : wc.status === "installing" ? "Running npm install…" : "Starting dev server…"}
              </p>
              <p className="text-xs opacity-60">Switch to Terminal to watch progress</p>
            </div>
          ) : (
            <iframe
              key={runKey}
              title={`${computer.title} preview`}
              sandbox="allow-scripts allow-modals allow-popups allow-forms allow-same-origin"
              className="h-full w-full bg-white"
              srcDoc={srcDoc}
            />
          )
        )}

        {tab === "code" && (
          <div className="flex h-full">
            <FileTree files={files} activePath={activeFile?.path} onSelect={setActive} />
            <div className="flex min-w-0 flex-1 flex-col">
              {activeFile ? (
                <CodeView file={activeFile} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-incogni-muted">
                  {effectiveStatus === "building" ? "Generating files…" : "No files yet."}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "terminal" && (
          useDockerSandbox && sandboxReady ? (
            <SandboxTerminal
              containerId={containerId!}
              onConnecting={() => {}}
              onConnected={() => {}}
              onDisconnected={() => {}}
              onError={() => {}}
            />
          ) : useDockerSandbox && sandboxActive ? (
            <div className="flex h-full flex-col">
              <div
                ref={sandboxOutputRef}
                className="flex-1 overflow-y-auto bg-[#0c0c0f] p-3 font-mono text-[12.5px] leading-relaxed text-incogni-text/90 [scrollbar-width:thin]"
              >
                {sandboxOutput.length === 0 ? (
                  <span className="text-incogni-muted">Creating sandbox and building project…</span>
                ) : (
                  sandboxOutput.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap">{line}</div>
                  ))
                )}
                {(sandboxBusy || effectiveStatus === "building" || effectiveStatus === "installing" || effectiveStatus === "running") && (
                  <div className="mt-1 inline-block h-3.5 w-2 animate-pulse bg-incogni-accent align-middle" />
                )}
              </div>
            </div>
          ) : isSnapshot ? (
            <div className="flex h-full items-center justify-center bg-[#0c0c0f] p-6">
              <div className="max-w-sm text-center">
                <p className="text-sm text-incogni-muted">This project was restored from chat history.</p>
                <p className="mt-1 text-xs text-incogni-muted/60">Sandbox is not available for restored projects. Download the files to work with them locally.</p>
              </div>
            </div>
          ) : (
            <div
              ref={termRef}
              className="h-full overflow-y-auto bg-[#0c0c0f] p-3 font-mono text-[12.5px] leading-relaxed text-incogni-text/90"
            >
              {termLines.length === 0 ? (
                <span className="text-incogni-muted">
                  {useWebContainerMode
                    ? wc.status === "booting" ? "Booting WebContainer runtime…" : "Waiting for project files…"
                    : sandboxAllowed === false
                    ? "Sandbox requires Ultra plan for real terminal. Using WebContainer instead."
                    : "Terminal is ready — build steps will appear here."}
                </span>
              ) : (
                termLines.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "whitespace-pre-wrap",
                      typeof line === "string" && line.includes("$") && "text-incogni-accent-soft",
                      typeof line === "string" && /error|failed|ERR!/i.test(line) && "text-red-400",
                      typeof line === "string" && /warn/i.test(line) && "text-yellow-400/80",
                    )}
                  >
                    {(typeof line === "string" ? line : String(line)) || " "}
                  </div>
                ))
              )}
              {(effectiveStatus === "installing" || effectiveStatus === "running" || effectiveStatus === "building") && (
                <div className="mt-1 inline-block h-3.5 w-2 animate-pulse bg-incogni-accent align-middle" />
              )}
            </div>
          )
        )}

        {tab === "desktop" && useDockerSandbox && sandboxReady && (
          <SandboxDesktop containerId={containerId!} />
        )}
      </div>

      {/* Publish Dialog */}
      {publishOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-incogni-border bg-incogni-surface p-6 shadow-2xl">
            {publishedUrl ? (
              <>
                <p className="text-sm font-semibold text-incogni-text">Published!</p>
                <p className="mt-1 text-xs text-incogni-muted">Your project is live at:</p>
                <a href={publishedUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-3 block rounded-lg border border-incogni-border bg-incogni-surface-2 p-3 text-sm font-mono text-incogni-accent-soft break-all hover:bg-incogni-accent/10 transition-colors">
                  {publishedUrl}
                </a>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setPublishOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-incogni-muted hover:text-incogni-text">Close</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-incogni-text">Publish your project</p>
                <p className="mt-1 text-xs text-incogni-muted">Choose a unique slug for your public URL.</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="shrink-0 text-xs text-incogni-muted">/view/</span>
                  <input
                    autoFocus
                    value={publishSlug}
                    onChange={(e) => { setPublishSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")); setPublishStatus("idle"); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && publishSlug && publishStatus !== "checking") handlePublish(); }}
                    className="flex-1 rounded-lg border border-incogni-border bg-incogni-bg px-3 py-2 text-sm font-mono text-incogni-text outline-none focus:border-incogni-accent/50"
                    placeholder="my-project"
                  />
                </div>
                {publishStatus === "taken" && <p className="mt-2 text-xs text-red-400">That slug is already taken. Try another.</p>}
                {publishStatus === "error" && <p className="mt-2 text-xs text-red-400">Something went wrong. Try again.</p>}
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setPublishOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-incogni-muted hover:text-incogni-text">Cancel</button>
                  <button
                    onClick={handlePublish}
                    disabled={!publishSlug || publishStatus === "checking"}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-incogni-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-incogni-accent/90 disabled:opacity-40"
                  >
                    {publishStatus === "checking" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                    {publishStatus === "checking" ? "Publishing…" : "Publish"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function wcStatusToStore(s: string): ComputerStatus {
  if (s === "idle") return "building";
  if (s === "booting") return "building";
  if (s === "installing") return "installing";
  if (s === "starting") return "running";
  if (s === "ready") return "ready";
  if (s === "error") return "error";
  return "building";
}

// ─── File tree ────────────────────────────────────────────────

interface TreeNode { name: string; path: string; children?: Map<string, TreeNode>; }

function buildTree(files: ProjectFile[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map() };
  for (const f of files) {
    const parts = f.path.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      if (!node.children) node.children = new Map();
      let child = node.children.get(part);
      if (!child) {
        child = { name: part, path: parts.slice(0, i + 1).join("/"), children: isFile ? undefined : new Map() };
        node.children.set(part, child);
      }
      node = child;
    });
  }
  return root;
}

function FileTree({ files, activePath, onSelect }: { files: ProjectFile[]; activePath?: string; onSelect: (path: string) => void }) {
  const tree = useMemo(() => buildTree(files), [files]);
  return (
    <div className="w-32 shrink-0 overflow-y-auto border-r border-incogni-border bg-incogni-surface/40 py-2 sm:w-44 md:w-52">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-incogni-muted">Files</p>
      {tree.children && [...tree.children.values()].sort(sortNodes).map((n) => (
        <TreeRow key={n.path} node={n} depth={0} activePath={activePath} onSelect={onSelect} />
      ))}
    </div>
  );
}

function sortNodes(a: TreeNode, b: TreeNode): number {
  const aDir = !!a.children, bDir = !!b.children;
  if (aDir !== bDir) return aDir ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function TreeRow({ node, depth, activePath, onSelect }: { node: TreeNode; depth: number; activePath?: string; onSelect: (path: string) => void }) {
  const [open, setOpen] = useState(true);
  const isDir = !!node.children;
  const active = node.path === activePath;

  if (isDir) {
    return (
      <>
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-1 px-2 py-1 text-left text-[13px] text-incogni-text/80 hover:bg-incogni-surface-2"
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-90")} />
          {open ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-incogni-accent/70" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-incogni-accent/70" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children && [...node.children.values()].sort(sortNodes).map((c) => (
          <TreeRow key={c.path} node={c} depth={depth + 1} activePath={activePath} onSelect={onSelect} />
        ))}
      </>
    );
  }

  return (
    <button type="button" onClick={() => onSelect(node.path)}
      className={cn("flex w-full items-center gap-1.5 px-2 py-1 text-left text-[13px] hover:bg-incogni-surface-2", active ? "bg-incogni-surface-2 text-incogni-text" : "text-incogni-muted")}
      style={{ paddingLeft: 8 + depth * 12 + 12 }}
    >
      <FileIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ─── Code view ────────────────────────────────────────────────

function CodeView({ file }: { file: ProjectFile }) {
  const html = useMemo(() => {
    const lang = HLJS_LANG[extOf(file.path)];
    try {
      if (lang && hljs.getLanguage(lang)) return hljs.highlight(file.content, { language: lang }).value;
      return hljs.highlightAuto(file.content).value;
    } catch { return escapeHtml(file.content); }
  }, [file.path, file.content]);

  const lines = file.content.split("\n").length;
  return (
    <>
      <div className="flex items-center gap-2 border-b border-incogni-border bg-incogni-surface/30 px-3 py-1.5 text-xs text-incogni-muted">
        <FileCode2 className="h-3.5 w-3.5" />
        <span className="truncate font-mono text-incogni-text/80">{file.path}</span>
        <span className="ml-auto">{lines} lines</span>
      </div>
      <div className="flex-1 overflow-auto bg-[#0e0e11]">
        <pre className="p-4 text-[13px] leading-relaxed">
          <code className="hljs bg-transparent" dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </div>
    </>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── UI primitives ────────────────────────────────────────────

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-incogni-accent/20 text-incogni-accent-soft" : "text-incogni-muted hover:text-incogni-text")}
    >
      {icon}{label}
    </button>
  );
}

function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-incogni-muted transition-colors hover:bg-incogni-surface-2 hover:text-incogni-text"
    >
      {children}
    </button>
  );
}

const STATUS_LABEL: Record<ComputerStatus, string> = {
  building: "Building", installing: "Installing", running: "Starting", ready: "Live", error: "Error",
};

function StatusPill({ status, isReal }: { status: ComputerStatus; isReal: boolean }) {
  const busy = status === "building" || status === "installing" || status === "running";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
      status === "ready" && "bg-emerald-500/15 text-emerald-300",
      status === "error" && "bg-red-500/15 text-red-300",
      busy && "bg-incogni-accent/15 text-incogni-accent-soft"
    )}>
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : (
        <span className={cn("h-1.5 w-1.5 rounded-full", status === "ready" ? "bg-emerald-400" : "bg-red-400")} />
      )}
      {STATUS_LABEL[status]}
      {isReal && status === "ready" && (
        <span className="ml-0.5 flex items-center gap-0.5 text-[10px] text-emerald-400/70">
          <Zap className="h-2.5 w-2.5" />real
        </span>
      )}
    </span>
  );
}
