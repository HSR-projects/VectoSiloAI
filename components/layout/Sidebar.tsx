"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MessageSquare, Trash2, X, Search, Library as LibraryIcon, Image as ImageIcon,
  Blocks, Folder, PanelLeft, Pencil, Download, MoreHorizontal, Bot,
} from "lucide-react";
import { useIncogniStore } from "@/lib/store";
import { useNewChat } from "@/hooks/useNewChat";
import { ThreadSearch } from "@/components/search/ThreadSearch";
import { Library } from "@/components/layout/Library";
import { cn } from "@/lib/utils";
import { CustomAIsModal } from "./CustomAIsModal";
import { AccountMenu } from "@/components/auth/AccountMenu";
import type { Thread } from "@/types";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

/* ── Time-based grouping helpers ────────────────────────────────────── */

function groupLabel(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0 && now.getDate() === d.getDate()) return "Today";
  if (diffDays <= 1 && now.getDate() - d.getDate() === 1) return "Yesterday";
  if (diffDays < 7) return "Previous 7 days";
  if (diffDays < 30) return "Previous 30 days";
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

interface ThreadGroup {
  label: string;
  threads: Thread[];
}

function groupThreads(threads: Thread[]): ThreadGroup[] {
  const map = new Map<string, Thread[]>();
  const order: string[] = [];
  const seenIds = new Set<string>();

  for (const t of threads) {
    if (seenIds.has(t.id)) continue;
    seenIds.add(t.id);

    const label = groupLabel(t.updatedAt);
    if (!map.has(label)) {
      map.set(label, []);
      order.push(label);
    }
    map.get(label)!.push(t);
  }
  return order.map((label) => ({ label, threads: map.get(label)! }));
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const router = useRouter();
  const params = useParams();
  const activeId = (params?.threadId as string) ?? null;
  const { threads, deleteThread, setActiveThread, updateThreadTitle } = useIncogniStore();
  const setSearchOpen = useIncogniStore((s) => s.setSearchOpen);
  const setLibraryOpen = useIncogniStore((s) => s.setLibraryOpen);
  const setCustomAIsOpen = useIncogniStore((s) => s.setCustomAIsOpen);
  const newChat = useNewChat();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const openThread = (id: string) => {
    setActiveThread(id);
    router.push(`/search/${id}`);
    onClose();
  };

  const handleNewChat = () => {
    newChat();
    onClose();
  };

  const startRename = (t: Thread) => {
    setRenamingId(t.id);
    setRenameValue(t.title);
  };

  const commitRename = (id: string) => {
    const title = renameValue.trim();
    if (title) {
      updateThreadTitle(id, title);
      fetch(`/api/threads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }).catch(() => {});
    }
    setRenamingId(null);
  };

  const exportThread = (t: Thread) => {
    const md = t.messages
      .map((m) => `## ${m.role === "user" ? "You" : "Assistant"}\n\n${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.title || "chat"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string) => {
    deleteThread(id);
    fetch(`/api/threads/${id}`, { method: "DELETE" }).catch(() => {});
    if (id === activeId) handleNewChat();
  };

  // Filter out temporary threads from sidebar
  const visibleThreads = useMemo(
    () => threads.filter((t) => !(t as any).isTemporary),
    [threads]
  );
  const groups = useMemo(() => groupThreads(visibleThreads), [visibleThreads]);

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-incogni-border bg-incogni-surface transition-transform md:static md:z-auto",
          open ? "translate-x-0 md:flex" : "-translate-x-full md:hidden"
        )}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 px-2 font-semibold text-lg text-incogni-text select-none">
             <img src="/incogni-logo.svg" alt="Incogni AI" width={24} height={24} />
             IncogniAI
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              aria-label="New chat"
              title="New chat"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-incogni-text transition-colors hover:bg-incogni-surface-2"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
               onClick={onClose}
               className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-incogni-muted hover:bg-incogni-surface-2 transition-colors md:hidden"
            >
               <X className="h-4 w-4" />
            </button>
            <button
               onClick={onClose}
               title="Close sidebar"
               className="hidden md:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-incogni-muted hover:bg-incogni-surface-2 transition-colors"
            >
               <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Nav items */}
        <div className="px-3 pb-2 flex flex-col gap-0.5">
          <button
            onClick={() => { router.push("/images"); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-incogni-text transition-colors hover:bg-incogni-surface-2"
          >
            <ImageIcon className="h-4 w-4 text-incogni-muted" />
            <span className="flex-1 text-left">Images</span>
          </button>
          <button
            onClick={() => { router.push("/library"); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-incogni-text transition-colors hover:bg-incogni-surface-2"
          >
            <LibraryIcon className="h-4 w-4 text-incogni-muted" />
            <span className="flex-1 text-left">Library</span>
          </button>
          <button
            onClick={() => { router.push("/plugins"); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-incogni-text transition-colors hover:bg-incogni-surface-2"
          >
            <Blocks className="h-4 w-4 text-incogni-muted" />
            <span className="flex-1 text-left">Plugins</span>
          </button>
          <button
            onClick={() => { router.push("/projects"); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-incogni-text transition-colors hover:bg-incogni-surface-2"
          >
            <Folder className="h-4 w-4 text-incogni-muted" />
            <span className="flex-1 text-left">Projects</span>
          </button>
        </div>

        {/* Chat history — time-grouped */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 [scrollbar-width:thin]">
          {visibleThreads.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-incogni-muted">
              No chats yet. Start a conversation.
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="mb-2">
                <p className="px-3 pt-3 pb-1 text-[11px] font-medium text-incogni-muted uppercase tracking-wider">
                  {g.label}
                </p>
                <ul className="space-y-0.5">
                  {g.threads.map((t) => {
                    const active = t.id === activeId;
                    const isRenaming = renamingId === t.id;
                    return (
                      <li key={t.id}>
                        <div
                          className={cn(
                            "group relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors",
                            active
                              ? "bg-incogni-surface-2"
                              : "hover:bg-incogni-surface-2"
                          )}
                          onClick={() => !isRenaming && openThread(t.id)}
                        >
                          <div className="min-w-0 flex-1">
                            {isRenaming ? (
                              <input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={() => commitRename(t.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitRename(t.id);
                                  if (e.key === "Escape") setRenamingId(null);
                                }}
                                className="w-full rounded bg-incogni-bg border border-incogni-border px-1.5 py-0.5 text-sm text-incogni-text focus:outline-none focus:border-incogni-accent"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <p className="truncate text-sm text-incogni-text">{t.title}</p>
                            )}
                          </div>

                          {/* Overflow menu */}
                          {!isRenaming && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-incogni-muted hover:text-incogni-text rounded"
                                  aria-label="Chat options"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onSelect={() => startRename(t)}>
                                  <span className="flex items-center gap-2 text-incogni-text">
                                    <Pencil className="h-3.5 w-3.5" /> Rename
                                  </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => exportThread(t)}>
                                  <span className="flex items-center gap-2 text-incogni-text">
                                    <Download className="h-3.5 w-3.5" /> Export
                                  </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleDelete(t.id)}>
                                  <span className="flex items-center gap-2 text-red-400">
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Account menu at bottom */}
        <div className="p-3">
          <AccountMenu />
        </div>
      </aside>

      <ThreadSearch />
      <Library />
    </>
  );
}
