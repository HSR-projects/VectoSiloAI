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

  const downloadPdf = async () => {
    const safe = doc.title.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
    const pdfMakeModule = await import("pdfmake/build/pdfmake");
    const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

    const pdfMake = pdfMakeModule.default || pdfMakeModule;
    const pdfFonts = pdfFontsModule.default || pdfFontsModule;

    if (pdfMake.vfs === undefined) {
      pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;
    }

    const lines = content.split("\n");
    const docContent: any[] = [
      { text: doc.title, style: "title", margin: [0, 0, 0, 20] }
    ];

    let inCodeBlock = false;
    let codeBlockText = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          docContent.push({
            text: codeBlockText.trim(),
            style: "codeBlock",
            margin: [0, 5, 0, 10]
          });
          codeBlockText = "";
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockText += line + "\n";
        continue;
      }

      if (line.startsWith("# ")) {
        docContent.push({ text: line.slice(2), style: "h1", margin: [0, 15, 0, 5] });
      } else if (line.startsWith("## ")) {
        docContent.push({ text: line.slice(3), style: "h2", margin: [0, 12, 0, 4] });
      } else if (line.startsWith("### ")) {
        docContent.push({ text: line.slice(4), style: "h3", margin: [0, 10, 0, 3] });
      } else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const cleanLine = line.trim().replace(/^[-*]\s+/, "");
        docContent.push({
          columns: [
            { text: "•", width: 10, style: "bulletPoint" },
            { text: cleanLine, style: "body" }
          ],
          margin: [10, 2, 0, 2]
        });
      } else if (line.trim() !== "") {
        // Strip bold and italics markers for cleaner PDF text
        const cleanLine = line.replace(/[*_]/g, "");
        docContent.push({ text: cleanLine, style: "body", margin: [0, 5, 0, 5] });
      }
    }

    const docDefinition = {
      content: docContent,
      styles: {
        title: { fontSize: 24, bold: true, color: "#10B981" },
        h1: { fontSize: 18, bold: true, color: "#10B981" },
        h2: { fontSize: 14, bold: true, color: "#000000" },
        h3: { fontSize: 12, bold: true, color: "#333333" },
        body: { fontSize: 11, lineHeight: 1.4, color: "#444444" },
        bulletPoint: { fontSize: 11, bold: true, color: "#10B981" },
        codeBlock: {
          fontSize: 10,
          font: "Courier",
          color: "#333333",
          background: "#f4f4f5",
          padding: 8
        }
      },
      defaultStyle: {
        font: "Roboto"
      }
    };

    pdfMake.createPdf(docDefinition).download(`${safe}.pdf`);
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
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!content}
            className="inline-flex items-center gap-1.5 rounded-lg border border-koda-border bg-koda-surface px-2.5 py-1.5 text-xs font-medium text-koda-text transition-colors hover:bg-koda-surface-2 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> PDF
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
