"use client";

import { EyeOff, PanelLeft, Plus, MoreHorizontal, Pencil, Trash2, Download } from "lucide-react";
import { ShareButton } from "@/components/billing/ShareButton";
import { useIncogniStore } from "@/lib/store";
import { useNewChat } from "@/hooks/useNewChat";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ModelSwitcher } from "@/components/layout/ModelSwitcher";

interface HeaderProps {
  onToggleSidebar?: () => void;
  showMenu?: boolean;
  /** Optional thread title shown in the centre of the header. */
  title?: string;
  /** Thread ID for the share button (shown when in a thread). */
  threadId?: string;
}

export function Header({ onToggleSidebar, showMenu, title, threadId }: HeaderProps) {
  const incognito = useIncogniStore((s) => s.incognito);
  const setIncognito = useIncogniStore((s) => s.setIncognito);
  const newChat = useNewChat();

  return (
    <header className="absolute top-0 z-30 flex w-full items-center justify-between p-3 pointer-events-none">
      <div className="flex min-w-0 items-center gap-2 pointer-events-auto">
        {showMenu && (
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-incogni-surface-2 transition-colors"
            >
              <PanelLeft className="h-5 w-5 text-incogni-muted group-hover:text-incogni-text transition-colors" />
            </button>
            <button
              onClick={newChat}
              aria-label="New chat"
              title="New chat"
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-incogni-surface-2 transition-colors"
            >
              <Plus className="h-5 w-5 text-incogni-muted group-hover:text-incogni-text transition-colors" />
            </button>
          </div>
        )}
        <div className="ml-2 flex items-center">
           <ModelSwitcher />
        </div>
        {title && (
          <span className="hidden max-w-[220px] lg:max-w-[340px] shrink min-w-0 truncate text-sm text-incogni-muted md:block ml-2">
            {title}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Removed temporary chat toggle, it's now in ModelSwitcher */}

        {threadId && <ShareButton threadId={threadId} />}

        {/* Thread overflow menu */}
        {threadId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Thread options"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-incogni-muted hover:bg-incogni-surface-2 hover:text-incogni-text transition-colors"
              >
                <MoreHorizontal className="h-4.5 w-4.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => {
                const t = useIncogniStore.getState().getThread(threadId);
                if (!t) return;
                const newTitle = window.prompt("Rename chat", t.title);
                if (newTitle?.trim()) {
                  useIncogniStore.getState().updateThreadTitle(threadId, newTitle.trim());
                  fetch(`/api/threads/${threadId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: newTitle.trim() }),
                  }).catch(() => {});
                }
              }}>
                <span className="flex items-center gap-2 text-incogni-text">
                  <Pencil className="h-4 w-4" /> Rename
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => {
                const t = useIncogniStore.getState().getThread(threadId);
                if (!t) return;
                const md = t.messages.map((m) =>
                  `## ${m.role === "user" ? "You" : "Assistant"}\n\n${m.content}`
                ).join("\n\n---\n\n");
                const blob = new Blob([md], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${t.title || "chat"}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}>
                <span className="flex items-center gap-2 text-incogni-text">
                  <Download className="h-4 w-4" /> Export as Markdown
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => {
                if (!window.confirm("Delete this chat?")) return;
                useIncogniStore.getState().deleteThread(threadId);
                fetch(`/api/threads/${threadId}`, { method: "DELETE" }).catch(() => {});
                newChat();
              }}>
                <span className="flex items-center gap-2 text-red-400">
                  <Trash2 className="h-4 w-4" /> Delete chat
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
