"use client";

import React from "react";
import { EyeOff, X, AlertTriangle } from "lucide-react";
import { useIncogniStore } from "@/lib/store";

export function IncognitoBanner() {
  const incognito = useIncogniStore((s) => s.incognito);
  const setIncognito = useIncogniStore((s) => s.setIncognito);
  const developerMode = useIncogniStore((s) => s.developerMode);

  if (!incognito && !developerMode) return null;

  return (
    <div className="w-full flex flex-col gap-2 p-2">
      {/* Temporary Chat indicator */}
      {incognito && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-incogni-border bg-incogni-surface px-4 py-2.5 text-xs text-incogni-text">
          <div className="flex items-center gap-2.5">
            <EyeOff className="h-4 w-4 text-incogni-muted shrink-0" />
            <div>
              <span className="font-semibold text-incogni-text text-sm">
                Temporary Chat
              </span>
              <p className="text-[11px] text-incogni-muted mt-0.5">
                This chat won&apos;t appear in history or be saved. It will be discarded when you navigate away.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIncognito(false)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-incogni-muted hover:bg-incogni-surface-2 hover:text-incogni-text transition-colors"
            title="Turn off temporary chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Developer Mode warning */}
      {developerMode && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/40 px-4 py-2 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
          <p className="text-amber-700 dark:text-amber-300 text-[11px]">
            <span className="font-semibold">Developer Mode</span> — Third-party API keys active. Queries may leave IncogniAI&apos;s private infrastructure.
          </p>
        </div>
      )}
    </div>
  );
}
