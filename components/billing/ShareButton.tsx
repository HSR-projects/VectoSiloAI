"use client";

import { useState } from "react";
import { Share2, Check, Link2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ShareButton({ threadId }: { threadId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const createShare = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      });
      const data = await res.json();
      if (res.ok) setUrl(data.url);
    } catch {}
    setBusy(false);
  };

  const copyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="relative">
      {url ? (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            readOnly
            value={url}
            className="w-full max-w-64 rounded-lg border border-koda-border bg-koda-surface px-2.5 py-1.5 text-xs text-koda-text font-mono select-all focus:outline-none"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1 rounded-lg border border-koda-border px-2 py-1.5 text-xs text-koda-text hover:bg-koda-surface-2 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Link2 className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : (
        <button
          onClick={createShare}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-koda-border px-2.5 py-1.5 text-xs font-medium text-koda-text hover:bg-koda-surface-2 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
          Share
        </button>
      )}
    </div>
  );
}
