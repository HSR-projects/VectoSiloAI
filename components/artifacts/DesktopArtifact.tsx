"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Monitor,
  TerminalSquare,
  Trash2,
  Play,
  Bot,
  Send,
  StopCircle,
} from "lucide-react";

type Tab = "terminal" | "desktop" | "assist";

export function DesktopArtifact() {
  const [containerId, setContainerId] = useState<string | null>(null);
  const [noVncUrl, setNoVncUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("terminal");
  const [busy, setBusy] = useState(false);
  const [cmd, setCmd] = useState("");
  const [output, setOutput] = useState<string[]>(["> Desktop sandbox ready. Type a command and press Enter.\n"]);
  const [creating, setCreating] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // AI Assist state
  const [assistQuery, setAssistQuery] = useState("");
  const [assistBusy, setAssistBusy] = useState(false);
  const [assistOutput, setAssistOutput] = useState<string[]>([]);
  const assistOutputRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    if (assistOutputRef.current) {
      assistOutputRef.current.scrollTop = assistOutputRef.current.scrollHeight;
    }
  }, [assistOutput]);

  const create = useCallback(async () => {
    setCreating(true);
    setOutput(["> Creating desktop sandbox…\n"]);
    try {
      const res = await fetch("/api/desktop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to create" }));
        setOutput((p) => [...p, `> Error: ${err.error}\n`]);
        return;
      }
      const data = await res.json();
      setContainerId(data.id);
      setNoVncUrl(data.noVncUrl);
      setOutput((p) => [
        ...p,
        `> Container created: ${data.id.slice(0, 12)}…\n` +
        `> VNC: ${data.noVncUrl}\n` +
        `> You have 1GB RAM and 2GB storage. Type commands below.\n`,
      ]);
    } catch (e) {
      setOutput((p) => [...p, `> Error: ${(e as Error).message}\n`]);
    } finally {
      setCreating(false);
    }
  }, []);

  const destroy = useCallback(async () => {
    if (!containerId) return;
    if (abortRef.current) abortRef.current.abort();
    setBusy(true);
    try {
      await fetch("/api/desktop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "destroy", containerId }),
      });
      setContainerId(null);
      setNoVncUrl(null);
      setOutput(["> Desktop destroyed.\n"]);
      setAssistOutput([]);
    } catch {
    } finally {
      setBusy(false);
    }
  }, [containerId]);

  const run = useCallback(async () => {
    if (!containerId || !cmd.trim()) return;
    const c = cmd;
    setCmd("");
    setOutput((p) => [...p, `$ ${c}\n`]);
    try {
      const res = await fetch("/api/desktop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "exec", containerId, command: c }),
      });
      const data = await res.json();
      if (data.stdout) setOutput((p) => [...p, data.stdout]);
      if (data.stderr) setOutput((p) => [...p, data.stderr]);
      if (data.exitCode !== 0) {
        setOutput((p) => [...p, `> exit code: ${data.exitCode}\n`]);
      }
    } catch (e) {
      setOutput((p) => [...p, `> Error: ${(e as Error).message}\n`]);
    }
  }, [containerId, cmd]);

  const assist = useCallback(async () => {
    if (!containerId || !assistQuery.trim()) return;
    setAssistBusy(true);
    setAssistOutput((p) => [...p, `> ${assistQuery}\n`]);
    const q = assistQuery;
    setAssistQuery("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/desktop/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ containerId, query: q }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setAssistOutput((p) => [...p, `Error: Assist failed.\n`]);
        setAssistBusy(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.content) {
              setAssistOutput((p) => {
                const last = p[p.length - 1] || "";
                if (last.endsWith("\n")) return [...p, parsed.content];
                return [...p.slice(0, -1), last + parsed.content];
              });
            }
          } catch {}
        }
      }

      setAssistOutput((p) => [...p, "\n"]);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setAssistOutput((p) => [...p, `Error: ${(e as Error).message}\n`]);
      }
    } finally {
      setAssistBusy(false);
      abortRef.current = null;
    }
  }, [containerId, assistQuery]);

  const stopAssist = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setAssistBusy(false);
  }, []);

  if (!containerId && !creating) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <Monitor className="h-12 w-12 text-vectosilo-muted" />
        <p className="text-sm text-vectosilo-muted">Launch a desktop sandbox to get started.</p>
        <p className="text-xs text-vectosilo-muted/60">1GB RAM · 2GB storage · X11 + VNC</p>
        <button
          onClick={create}
          className="inline-flex items-center gap-2 rounded-lg bg-vectosilo-accent px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-vectosilo-accent-soft"
        >
          <Play className="h-4 w-4" /> Launch Desktop
        </button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-vectosilo-accent" />
          <p className="text-sm text-vectosilo-muted">Creating desktop sandbox…</p>
          <p className="text-xs text-vectosilo-muted/60">Installing X11, VNC, and dev tools</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-vectosilo-border px-3 py-2">
        <div className="flex gap-1">
          <button
            onClick={() => setTab("terminal")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "terminal"
                ? "bg-vectosilo-accent/15 text-vectosilo-accent-soft"
                : "text-vectosilo-muted hover:text-vectosilo-text"
            }`}
          >
            <TerminalSquare className="h-3.5 w-3.5" /> Terminal
          </button>
          <button
            onClick={() => setTab("desktop")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "desktop"
                ? "bg-vectosilo-accent/15 text-vectosilo-accent-soft"
                : "text-vectosilo-muted hover:text-vectosilo-text"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" /> Desktop
          </button>
          <button
            onClick={() => setTab("assist")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "assist"
                ? "bg-vectosilo-accent/15 text-vectosilo-accent-soft"
                : "text-vectosilo-muted hover:text-vectosilo-text"
            }`}
          >
            <Bot className="h-3.5 w-3.5" /> AI Assist
          </button>
        </div>
        <button
          onClick={destroy}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Destroy
        </button>
      </div>

      {tab === "terminal" && (
        <div className="flex flex-1 flex-col">
          <div
            ref={outputRef}
            className="flex-1 overflow-y-auto bg-black/80 p-3 font-mono text-xs leading-5 text-green-400 [scrollbar-width:thin]"
          >
            {output.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </div>
          <div className="flex border-t border-vectosilo-border bg-vectosilo-surface-2">
            <span className="flex items-center pl-3 font-mono text-xs text-vectosilo-muted">$</span>
            <input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") run(); }}
              placeholder="Type a command…"
              className="flex-1 bg-transparent px-2 py-2.5 font-mono text-sm text-vectosilo-text outline-none placeholder:text-vectosilo-muted/40"
            />
            <button
              onClick={run}
              disabled={!cmd.trim()}
              className="px-3 text-vectosilo-muted hover:text-vectosilo-accent-soft disabled:opacity-40"
            >
              <Play className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {tab === "desktop" && (
        <div className="flex flex-1 flex-col items-center justify-center bg-black/60 p-4">
          {noVncUrl ? (
            <iframe
              src={noVncUrl}
              className="h-full w-full rounded-lg border border-vectosilo-border"
              sandbox="allow-scripts allow-same-origin"
              title="Desktop"
            />
          ) : (
            <p className="text-sm text-vectosilo-muted">Desktop not available.</p>
          )}
        </div>
      )}

      {tab === "assist" && (
        <div className="flex flex-1 flex-col">
          <div className="border-b border-vectosilo-border/50 px-3 py-2 text-xs text-vectosilo-muted">
            AI can see your desktop and control it — type, click, run commands.
          </div>
          <div
            ref={assistOutputRef}
            className="flex-1 overflow-y-auto whitespace-pre-wrap bg-black/60 p-3 font-mono text-xs leading-5 text-gray-200 [scrollbar-width:thin]"
          >
            {assistOutput.length === 0 && (
              <span className="text-vectosilo-muted/60">Ask the AI to do something on your desktop.</span>
            )}
            {assistOutput.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
            {assistBusy && <span className="inline-block h-3 w-1.5 animate-pulse bg-vectosilo-accent" />}
          </div>
          <div className="flex border-t border-vectosilo-border bg-vectosilo-surface-2">
            <input
              value={assistQuery}
              onChange={(e) => setAssistQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !assistBusy) assist(); }}
              placeholder="Ask AI to do something…"
              disabled={assistBusy}
              className="flex-1 bg-transparent px-3 py-2.5 text-sm text-vectosilo-text outline-none placeholder:text-vectosilo-muted/40 disabled:opacity-50"
            />
            {assistBusy ? (
              <button onClick={stopAssist} className="px-3 text-red-400 hover:text-red-300">
                <StopCircle className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={assist}
                disabled={!assistQuery.trim()}
                className="px-3 text-vectosilo-muted hover:text-vectosilo-accent-soft disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
