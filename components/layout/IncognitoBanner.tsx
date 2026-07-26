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
