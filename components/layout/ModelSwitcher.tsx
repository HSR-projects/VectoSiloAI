"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Cpu, Loader2, Lock, Sparkles, Check, Plus, Trash2, EyeOff, Bot } from "lucide-react";
import { useModels } from "@/hooks/useModels";
import { useIncogniStore } from "@/lib/store";
import { useAuth } from "@/components/auth/AuthProvider";
import { modelLabel } from "@/lib/utils";
import { AUTO_MODEL } from "@/lib/autoModel";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function ModelSwitcher() {
  const router = useRouter();
  const { loading, error } = useModels();
  const {
    selectedModel,
    availableModels,
    setSelectedModel,
    incognito,
    setIncognito,
  } = useIncogniStore();
  const { caps } = useAuth();

  // If free plan, locked to auto
  if (!caps.allModels) {
    return (
      <button
        onClick={() => router.push("/pricing")}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-lg font-semibold text-incogni-text transition-colors hover:bg-incogni-surface-2 rounded-lg"
      >
        <span className="hidden sm:inline">IncogniAI</span>
        <Lock className="h-4 w-4 text-incogni-muted" />
      </button>
    );
  }

  // Pick top models for the clean UI
  const topModels = (availableModels || []).filter(m => m === AUTO_MODEL || m.includes("gpt") || m.includes("claude")).slice(0, 5);
  // Ensure selected model is in the list
  if (selectedModel && !topModels.includes(selectedModel) && (availableModels || []).includes(selectedModel)) {
    topModels.push(selectedModel);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Switch model"
          className="inline-flex items-center gap-1.5 px-2 py-1 text-lg font-semibold text-incogni-text transition-colors hover:bg-incogni-surface-2 rounded-lg group"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-incogni-muted" />
          ) : null}
          <span className="truncate flex items-center gap-1.5">
            <span>IncogniAI</span>
            <span className="text-incogni-muted font-normal text-sm">{selectedModel ? modelLabel(selectedModel) : ""}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-incogni-muted transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[300px] p-2 bg-incogni-bg border-incogni-border shadow-xl rounded-xl">
        
        <div className="flex flex-col gap-1 mb-2">
          {topModels.length === 0 && !loading && (
            <p className="px-2 py-2 text-sm text-incogni-muted">No models available</p>
          )}
          {topModels.map(m => (
            <DropdownMenuItem
              key={m}
              selected={m === selectedModel}
              onSelect={() => setSelectedModel(m)}
              className="flex items-center justify-between p-3 cursor-pointer rounded-lg hover:bg-incogni-surface-2 focus:bg-incogni-surface-2"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-incogni-border bg-incogni-surface text-incogni-text">
                   {m.includes("gpt") ? <Sparkles className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[15px] font-medium text-incogni-text">{modelLabel(m)}</span>
                  <span className="text-xs text-incogni-muted">{m === AUTO_MODEL ? "Our smartest model" : "Advanced capabilities"}</span>
                </div>
              </div>
              {m === selectedModel && <Check className="h-4 w-4 text-incogni-text" />}
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator className="bg-incogni-border" />

        <div className="p-1">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-incogni-surface-2 cursor-pointer" onClick={(e) => { e.preventDefault(); setIncognito(!incognito); }}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-incogni-surface text-incogni-text">
                 <EyeOff className="h-4 w-4" />
              </div>
              <span className="text-[15px] font-medium text-incogni-text">Temporary chat</span>
            </div>
            <div className="relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors"
                 style={{ backgroundColor: incognito ? "#10a37f" : "var(--color-incogni-border)" }}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${incognito ? "translate-x-4" : "translate-x-1"}`} />
            </div>
          </div>
        </div>

      </DropdownMenuContent>
    </DropdownMenu>
  );
}
