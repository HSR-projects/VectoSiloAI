"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useIncogniStore } from "@/lib/store";
import { Search, ChevronDown, Filter, LayoutGrid, List, FileText, ImageIcon, Music } from "lucide-react";
import { relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types";

interface UploadItem {
  attachment: Attachment;
  threadId: string;
  threadTitle: string;
  at: number;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function LibraryPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "images" | "documents">("all");
  const [search, setSearch] = useState("");
  const threads = useIncogniStore((s) => s.threads);

  const items = useMemo<UploadItem[]>(() => {
    const out: UploadItem[] = [];
    for (const t of threads) {
      for (const m of t.messages) {
        for (const a of m.attachments ?? []) {
          out.push({ attachment: a, threadId: t.id, threadTitle: t.title, at: m.createdAt });
        }
      }
    }
    return out.sort((a, b) => b.at - a.at);
  }, [threads]);

  const filteredItems = items.filter(it => {
    if (tab === "images" && it.attachment.kind !== "image") return false;
    if (tab === "documents" && (it.attachment.kind === "image" || it.attachment.kind === "audio")) return false;
    if (search) {
      if (!it.attachment.name.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const getIcon = (kind: string) => {
    if (kind === "image") return <ImageIcon className="h-5 w-5 text-blue-400" />;
    if (kind === "audio") return <Music className="h-5 w-5 text-purple-400" />;
    return <FileText className="h-5 w-5 text-gray-400" />;
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-incogni-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header showMenu onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 [scrollbar-width:thin]">
          <div className="mx-auto max-w-5xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-semibold text-incogni-text">Library</h1>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-incogni-muted" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    className="w-48 sm:w-64 rounded-full border border-incogni-border bg-transparent py-1.5 pl-9 pr-4 text-sm text-incogni-text placeholder:text-incogni-muted focus:outline-none focus:ring-1 focus:ring-incogni-border"
                  />
                </div>
                <button className="flex items-center gap-2 rounded-full bg-incogni-surface-2 px-4 py-1.5 text-sm font-medium text-incogni-text hover:bg-incogni-surface transition-colors border border-incogni-border">
                  New <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
              <div className="flex items-center gap-1 rounded-full bg-incogni-surface-2 p-1">
                {(["all", "images", "documents"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                      tab === t
                        ? "bg-incogni-surface text-incogni-text shadow-sm"
                        : "text-incogni-muted hover:text-incogni-text"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 text-incogni-muted hover:text-incogni-text">
                  <Filter className="h-4 w-4" />
                </button>
                <button className="p-1.5 text-incogni-muted hover:text-incogni-text">
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button className="p-1.5 text-incogni-text">
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <div className="grid grid-cols-12 gap-4 border-b border-incogni-border pb-3 text-sm font-medium text-incogni-muted">
                <div className="col-span-8 sm:col-span-6 pl-2">Name</div>
                <div className="hidden sm:block sm:col-span-3 text-left">Modified</div>
                <div className="col-span-4 sm:col-span-3 text-left">Size</div>
              </div>

              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-sm text-incogni-muted">
                  No files found.
                </div>
              ) : (
                <div className="divide-y divide-incogni-border">
                  {filteredItems.map((item, i) => (
                    <div
                      key={item.attachment.id + i}
                      onClick={() => router.push(`/search/${item.threadId}`)}
                      className="group grid grid-cols-12 items-center gap-4 py-3 cursor-pointer hover:bg-incogni-surface-2 transition-colors rounded-lg px-2 -mx-2"
                    >
                      <div className="col-span-8 sm:col-span-6 flex items-center gap-3 min-w-0">
                        {item.attachment.kind === "image" ? (
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-incogni-surface">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.attachment.thumbUrl} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-incogni-surface-2">
                            {getIcon(item.attachment.kind)}
                          </div>
                        )}
                        <span className="truncate text-sm text-incogni-text group-hover:underline">
                          {item.attachment.name || "Untitled upload"}
                        </span>
                      </div>
                      <div className="hidden sm:block sm:col-span-3 text-sm text-incogni-muted">
                        {new Date(item.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                      <div className="col-span-4 sm:col-span-3 text-sm text-incogni-muted uppercase">
                        {item.attachment.size ? formatBytes(item.attachment.size) : "209 KB"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
