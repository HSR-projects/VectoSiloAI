"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, FileCode2, MonitorPlay, Plus, Minus } from "lucide-react";
import type { FileDiff, Message } from "@/types";
import { useKodaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Props {
  snapshot: NonNullable<Message["computer"]>;
}

export function ComputerDiffCard({ snapshot }: Props) {
  const loadComputer = useKodaStore((s) => s.loadComputer);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const fileCount = snapshot.files?.length ?? 0;
  const diffs = snapshot.diffs;

  const toggleFile = (path: string) => {
    setExpandedFile(expandedFile === path ? null : path);
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-koda-border bg-koda-surface/60">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-koda-accent/15 text-koda-accent">
          <MonitorPlay className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-koda-text">{snapshot.title}</span>
          <span className="block text-xs text-koda-muted">
            {diffs ? (
              <DiffSummary diffs={diffs} />
            ) : (
              <>Koda&apos;s Computer · {fileCount} file{fileCount === 1 ? "" : "s"}</>
            )}
          </span>
        </span>
        <button
          type="button"
          onClick={() => loadComputer(snapshot)}
          className="shrink-0 rounded-lg border border-koda-border bg-koda-surface/80 px-2.5 py-1.5 text-xs font-medium text-koda-text transition-colors hover:bg-koda-surface-2"
        >
          Open
        </button>
      </div>

      {/* Diff file list */}
      {diffs && diffs.length > 0 && (
        <div className="border-t border-koda-border">
          {diffs.map((d) => (
            <div key={d.path}>
              <button
                type="button"
                onClick={() => toggleFile(d.path)}
                className="flex w-full items-center gap-2 border-b border-koda-border/50 px-3.5 py-2 text-left text-xs transition-colors hover:bg-koda-surface/40 last:border-b-0"
              >
                {expandedFile === d.path ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-koda-muted" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-koda-muted" />
                )}
                <FileCode2 className="h-3.5 w-3.5 shrink-0 text-koda-muted" />
                <span className="flex-1 truncate font-mono text-koda-text">{d.path}</span>
                <ChangeBadge type={d.type} lines={d.lines} />
              </button>
              {expandedFile === d.path && (
                <DiffLines lines={d.lines} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiffSummary({ diffs }: { diffs: FileDiff[] }) {
  const adds = diffs.reduce((s, d) => s + d.lines.filter((l) => l.type === "add").length, 0);
  const dels = diffs.reduce((s, d) => s + d.lines.filter((l) => l.type === "del").length, 0);
  const filesChanged = diffs.length;
  return (
    <>
      {filesChanged} file{filesChanged === 1 ? "" : "s"} changed · <span className="text-green-500">+{adds}</span>{" "}
      <span className="text-red-500">-{dels}</span>
    </>
  );
}

function ChangeBadge({ type, lines }: { type: FileDiff["type"]; lines: FileDiff["lines"] }) {
  const adds = lines.filter((l) => l.type === "add").length;
  const dels = lines.filter((l) => l.type === "del").length;
  return (
    <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px]">
      {adds > 0 && <span className="flex items-center gap-0.5 text-green-500"><Plus className="h-3 w-3" />{adds}</span>}
      {dels > 0 && <span className="flex items-center gap-0.5 text-red-500"><Minus className="h-3 w-3" />{dels}</span>}
    </span>
  );
}

function DiffLines({ lines }: { lines: FileDiff["lines"] }) {
  const maxShow = 80;
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? lines : lines.slice(0, maxShow);
  const hasMore = lines.length > maxShow;

  return (
    <div className="overflow-x-auto border-b border-koda-border/50 bg-black/20 text-[11px] leading-[18px]">
      {displayed.map((line, i) => (
        <div
          key={i}
          className={cn(
            "flex font-mono",
            line.type === "add" && "bg-green-950/40 text-green-300",
            line.type === "del" && "bg-red-950/40 text-red-300",
            line.type === "same" && "text-koda-muted/60"
          )}
        >
          <span className="w-8 shrink-0 select-none text-right text-koda-muted/30">
            {line.type === "add" ? "+" : line.type === "del" ? "-" : " "}
          </span>
          <span className="min-w-0 flex-1 whitespace-pre">{line.content}</span>
        </div>
      ))}
      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex w-full items-center justify-center py-1 text-koda-accent hover:text-koda-accent/80"
        >
          Show all {lines.length} lines
        </button>
      )}
    </div>
  );
}
