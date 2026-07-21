"use client";

import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Trash2, X, Search, Library as LibraryIcon, Blocks, ChevronRight, Bot, Brain } from "lucide-react";
import { useVectoSiloStore } from "@/lib/store";
import { ThreadSearch } from "@/components/search/ThreadSearch";
import { Library } from "@/components/layout/Library";
import { relativeTime, cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const router = useRouter();
  const params = useParams();
  const activeId = (params?.threadId as string) ?? null;
  const { threads, deleteThread, setActiveThread } = useVectoSiloStore();
  const setSearchOpen = useVectoSiloStore((s) => s.setSearchOpen);
  const setLibraryOpen = useVectoSiloStore((s) => s.setLibraryOpen);
  const setSettingsOpen = useVectoSiloStore((s) => s.setSettingsOpen);
  const setSettingsTab = useVectoSiloStore((s) => s.setSettingsTab);
  const setCustomAIsOpen = useVectoSiloStore((s) => s.setCustomAIsOpen);

  const openThread = (id: string) => {
    setActiveThread(id);
    router.push(`/search/${id}`);
    onClose();
  };

  const newSearch = () => {
    setActiveThread(null);
    router.push("/");
    onClose();
  };

  const openIntegrations = () => {
    setSettingsTab("integrations");
    setSettingsOpen(true);
    onClose();
  };

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
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-vectosilo-border bg-vectosilo-surface transition-transform md:static md:z-auto",
          // Open: visible everywhere. Closed: off-canvas on mobile, removed from
          // the layout on desktop so the chat expands full-width.
          open ? "translate-x-0 md:flex" : "-translate-x-full md:hidden"
        )}
      >
        <div className="flex items-center justify-between p-3">
          <button
            onClick={newSearch}
            className="flex flex-1 items-center gap-2 rounded-xl border border-vectosilo-border bg-vectosilo-bg px-3 py-2.5 text-sm font-medium text-vectosilo-text transition-colors hover:border-vectosilo-accent/40 hover:bg-vectosilo-surface-2"
          >
            <Plus className="h-4 w-4 text-vectosilo-accent" />
            New Search
          </button>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="ml-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-vectosilo-muted hover:bg-vectosilo-surface-2 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search chats — opens the Spotlight-style palette (⌘K). */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-vectosilo-border bg-vectosilo-bg px-3 py-2 text-sm text-vectosilo-muted transition-colors hover:border-vectosilo-accent/40 hover:bg-vectosilo-surface-2 hover:text-vectosilo-text"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search chats</span>
            <span className="rounded border border-vectosilo-border px-1.5 py-0.5 text-[10px] text-vectosilo-muted">⌘K</span>
          </button>
          <button
            onClick={() => setLibraryOpen(true)}
            className="mt-1.5 flex w-full items-center gap-2 rounded-xl border border-vectosilo-border bg-vectosilo-bg px-3 py-2 text-sm text-vectosilo-muted transition-colors hover:border-vectosilo-accent/40 hover:bg-vectosilo-surface-2 hover:text-vectosilo-text"
          >
            <LibraryIcon className="h-4 w-4" />
            <span className="flex-1 text-left">Library</span>
          </button>
          <button
            onClick={openIntegrations}
            className="mt-1.5 flex w-full items-center gap-2 rounded-xl border border-vectosilo-border bg-vectosilo-bg px-3 py-2 text-sm text-vectosilo-muted transition-colors hover:border-vectosilo-accent/40 hover:bg-vectosilo-surface-2 hover:text-vectosilo-text"
          >
            <Blocks className="h-4 w-4" />
            <span className="flex-1 text-left">Integrations</span>
            <ChevronRight className="h-4 w-4 text-vectosilo-muted" />
          </button>
          <button
            onClick={() => {
              setCustomAIsOpen(true);
              onClose();
            }}
            className="mt-1.5 flex w-full items-center gap-2 rounded-xl border border-vectosilo-border bg-vectosilo-bg px-3 py-2 text-sm text-vectosilo-muted transition-colors hover:border-vectosilo-accent/40 hover:bg-vectosilo-surface-2 hover:text-vectosilo-text"
          >
            <Bot className="h-4 w-4" />
            <span className="flex-1 text-left">My AIs</span>
          </button>
          <button
            onClick={() => { router.push("/teach"); onClose(); }}
            className="mt-1.5 flex w-full items-center gap-2 rounded-xl border border-vectosilo-border bg-vectosilo-bg px-3 py-2 text-sm text-vectosilo-muted transition-colors hover:border-vectosilo-accent/40 hover:bg-vectosilo-surface-2 hover:text-vectosilo-text"
          >
            <Brain className="h-4 w-4" />
            <span className="flex-1 text-left">Teachable Machine</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 [scrollbar-width:thin]">
          {threads.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-vectosilo-muted">
              No threads yet. Start a search to begin.
            </p>
          ) : (
            <ul className="space-y-1">
              {threads.map((t, i) => {
                const active = t.id === activeId;
                return (
                  <motion.li
                    key={t.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <div
                      className={cn(
                        "group relative flex cursor-pointer items-start gap-2 rounded-lg border-l-2 px-3 py-2.5 transition-colors",
                        active
                          ? "border-vectosilo-accent bg-vectosilo-surface-2"
                          : "border-transparent hover:bg-vectosilo-surface-2"
                      )}
                      onClick={() => openThread(t.id)}
                    >
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-vectosilo-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-vectosilo-text">{t.title}</p>
                        <p className="text-xs text-vectosilo-muted">
                          {relativeTime(t.updatedAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteThread(t.id);
                          fetch(`/api/threads/${t.id}`, { method: "DELETE" }).catch(() => {});
                          if (active) newSearch();
                        }}
                        aria-label="Delete thread"
                        className="shrink-0 p-1 opacity-100 transition-opacity hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4 text-vectosilo-muted hover:text-red-400" />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-vectosilo-border p-3 text-[11px] text-vectosilo-muted">
          Powered by VectoSilo AI · Privacy-first
        </div>
      </aside>

      <ThreadSearch />
      <Library />
    </>
  );
}
