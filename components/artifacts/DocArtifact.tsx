"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy, Download, Eye, FileText, Loader2, Share2 } from "lucide-react";
import { useKodaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Tab = "preview" | "code";

/**
 * Side-panel renderer for a Markdown document (e.g. a generated prompt).
 * Defaults to the rendered Preview; a Code tab shows the raw Markdown. The
 * toolbar copies, shares (Web Share API, falling back to copy), and downloads
 * the document as a .md file.
 */
export function DocArtifact() {
  const doc = useKodaStore((s) => s.doc);
  const [tab, setTab] = useState<Tab>("preview");
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const content = doc?.content ?? "";
  const status = doc?.status ?? "building";

  // Jump to the rendered preview once the document is fully written.
  const jumpedRef = useRef(false);
  useEffect(() => {
    if (status === "ready" && !jumpedRef.current && content) {
      jumpedRef.current = true;
      setTab("preview");
    }
  }, [status, content]);

  if (!doc) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: doc.title, text: content });
        return;
      } catch {
        /* user cancelled or unsupported — fall through to copy */
      }
    }
    await copy();
    setShared(true);
    setTimeout(() => setShared(false), 1600);
  };

  const download = () => {
    const safe = doc.title.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar — wraps on narrow / mobile panels. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-koda-border px-3 py-2">
        <div className="flex items-center rounded-lg bg-koda-surface-2 p-0.5">
          <TabBtn active={tab === "preview"} onClick={() => setTab("preview")} icon={<Eye className="h-3.5 w-3.5" />} label="Preview" />
          <TabBtn active={tab === "code"} onClick={() => setTab("code")} icon={<FileText className="h-3.5 w-3.5" />} label="Markdown" />
        </div>
        {status === "building" && (
          <span className="inline-flex items-center gap-1.5 text-xs text-koda-muted">
            <Loader2 className="h-3 w-3 animate-spin" /> writing…
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={copy}
            disabled={!content}
            className="inline-flex items-center gap-1.5 rounded-lg border border-koda-border bg-koda-surface px-2.5 py-1.5 text-xs font-medium text-koda-text transition-colors hover:bg-koda-surface-2 disabled:opacity-40"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={share}
            disabled={!content}
            className="inline-flex items-center gap-1.5 rounded-lg border border-koda-border bg-koda-surface px-2.5 py-1.5 text-xs font-medium text-koda-text transition-colors hover:bg-koda-surface-2 disabled:opacity-40"
          >
            <Share2 className="h-3.5 w-3.5" />
            {shared ? "Copied to share" : "Share"}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!content}
            className="inline-flex items-center gap-1.5 rounded-lg border border-koda-border bg-koda-surface px-2.5 py-1.5 text-xs font-medium text-koda-text transition-colors hover:bg-koda-surface-2 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> .md
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-hidden">
        {tab === "preview" ? (
          <div className="h-full overflow-y-auto px-5 py-4">
            {content ? (
              <div className="prose prose-invert max-w-none prose-headings:text-koda-text prose-p:text-koda-text/90 prose-li:text-koda-text/90 prose-strong:text-koda-text prose-a:text-koda-accent-soft prose-code:text-koda-accent-soft prose-code:before:content-none prose-code:after:content-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-koda-muted">
                Writing the prompt…
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-auto bg-[#0e0e11]">
            <pre className="whitespace-pre-wrap break-words p-4 text-[13px] leading-relaxed text-koda-text/90">
              {content || "Writing…"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-koda-accent/20 text-koda-accent-soft" : "text-koda-muted hover:text-koda-text"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
