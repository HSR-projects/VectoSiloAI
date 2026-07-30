"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Lock, Check, ChevronRight } from "lucide-react";
import { useModels } from "@/hooks/useModels";
import { useIncogniStore } from "@/lib/store";
import { useAuth } from "@/components/auth/AuthProvider";
import { modelLabel, cn } from "@/lib/utils";
import { AUTO_MODEL } from "@/lib/autoModel";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-incogni-text transition-colors hover:bg-incogni-surface rounded-full border border-transparent hover:border-incogni-border/50"
      >
        <span>IncogniAI</span>
        <Lock className="h-3.5 w-3.5 text-incogni-muted" />
      </button>
    );
  }

  // Filter models
  const safeModels = Array.isArray(availableModels) ? [...availableModels] : [];
  if (!safeModels.includes(AUTO_MODEL)) safeModels.unshift(AUTO_MODEL);
  
  const validModels = safeModels.filter(m => m === AUTO_MODEL || !m.includes("embed"));
  
  // Ensure selected model is in the list
  if (selectedModel && !validModels.includes(selectedModel) && safeModels.includes(selectedModel)) {
    validModels.push(selectedModel);
  }

  // Split into Top 5 and "More models" to keep it clean like Claude
  const topModels = validModels.slice(0, 5);
  const moreModels = validModels.slice(5);

  const getSubLabel = (m: string) => {
    if (m === AUTO_MODEL) return "Most efficient for everyday tasks";
    if (m.includes("70b") || m.includes("large")) return "For your toughest challenges";
    if (m.includes("8b") || m.includes("mini") || m.includes("haiku")) return "Fastest for quick answers";
    return "For complex tasks";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Switch model"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-incogni-text transition-colors hover:bg-incogni-surface rounded-full border border-transparent hover:border-incogni-border/50 group bg-incogni-bg/50 backdrop-blur-sm"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-incogni-muted" />}
          <span className="flex items-center gap-1.5">
            <span className="truncate max-w-[120px] sm:max-w-[180px]">
              {selectedModel ? modelLabel(selectedModel) : "Select model"}
            </span>
            <span className="text-incogni-muted/70 font-normal">High</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-incogni-muted transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[320px] p-2 bg-white dark:bg-incogni-surface border-incogni-border shadow-2xl rounded-2xl">
        
        <div className="flex flex-col mb-1">
          {topModels.length === 0 && !loading && (
            <p className="px-3 py-3 text-sm text-incogni-muted">No models available</p>
          )}
          {topModels.map(m => (
            <DropdownMenuItem
              key={m}
              selected={m === selectedModel}
              onSelect={() => setSelectedModel(m)}
              className="flex items-center justify-between p-3 cursor-pointer rounded-xl hover:bg-incogni-surface-2 focus:bg-incogni-surface-2 data-[highlighted]:bg-incogni-surface-2"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-incogni-text flex items-center gap-2">
                  {modelLabel(m)}
                  {(m.includes("70b") || m.includes("large") || m.includes("pro")) && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-blue-500/10 text-blue-500">
                      Pro
                    </span>
                  )}
                </span>
                <span className="text-[12px] text-incogni-muted">{getSubLabel(m)}</span>
              </div>
              {m === selectedModel && <Check className="h-4 w-4 text-blue-500 shrink-0 ml-4" />}
            </DropdownMenuItem>
          ))}
        </div>

        {moreModels.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-incogni-border/50 my-1 mx-2" />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center justify-between p-3 cursor-pointer rounded-xl hover:bg-incogni-surface-2 focus:bg-incogni-surface-2">
                <span className="text-[14px] font-semibold text-incogni-text">More models</span>
                <ChevronRight className="h-4 w-4 text-incogni-muted" />
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-[280px] p-1.5 max-h-[400px] overflow-y-auto overflow-x-hidden bg-white dark:bg-incogni-surface border-incogni-border shadow-2xl rounded-2xl custom-scrollbar">
                  {moreModels.map(m => (
                    <DropdownMenuItem
                      key={m}
                      selected={m === selectedModel}
                      onSelect={() => setSelectedModel(m)}
                      className="flex items-center justify-between p-2.5 cursor-pointer rounded-xl hover:bg-incogni-surface-2 focus:bg-incogni-surface-2 data-[highlighted]:bg-incogni-surface-2"
                    >
                      <div className="flex flex-col gap-0.5 max-w-[200px]">
                        <span className="text-[13px] font-semibold text-incogni-text truncate">{modelLabel(m)}</span>
                        <span className="text-[11px] text-incogni-muted truncate">{getSubLabel(m)}</span>
                      </div>
                      {m === selectedModel && <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </>
        )}
        
        <DropdownMenuSeparator className="bg-incogni-border/50 my-1 mx-2" />

        <div className="px-1 py-0.5">
          <div 
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-incogni-surface-2 cursor-pointer transition-colors" 
            onClick={(e) => { e.preventDefault(); setIncognito(!incognito); }}
          >
            <span className="text-[14px] font-semibold text-incogni-text">Temporary chat</span>
            <div className="relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors duration-200"
                 style={{ backgroundColor: incognito ? "#3b82f6" : "var(--color-incogni-border)" }}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${incognito ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </div>
          </div>
        </div>

      </DropdownMenuContent>
    </DropdownMenu>
  );
}
