"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useIncogniStore } from "@/lib/store";
import { Search, ChevronDown, Filter, LayoutGrid, List, Plus, Globe, Lock, Share2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "created" | "shared">("all");
  const [search, setSearch] = useState("");
  
  const customAIs = useIncogniStore((s) => s.customAIs);

  const filteredAIs = customAIs.filter(ai => {
    if (search && !ai.name.toLowerCase().includes(search.toLowerCase())) return false;
    // Just a placeholder for filtering logic if we add sharing
    if (tab === "shared") return false; 
    return true;
  });

  return (
    <div className="flex h-dvh overflow-hidden bg-incogni-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header showMenu onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 [scrollbar-width:thin]">
          <div className="mx-auto max-w-5xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-semibold text-incogni-text">Projects</h1>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-incogni-muted" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search projects"
                    className="w-48 sm:w-64 rounded-full border border-incogni-border bg-transparent py-1.5 pl-9 pr-4 text-sm text-incogni-text placeholder:text-incogni-muted focus:outline-none focus:ring-1 focus:ring-incogni-border"
                  />
                </div>
                <button 
                  onClick={() => router.push("/org")} // creating a new AI is usually in the workspace/org
                  className="flex items-center gap-2 rounded-full bg-incogni-text px-4 py-1.5 text-sm font-medium text-incogni-bg hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-4 w-4" /> New
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
              <div className="flex items-center gap-1 rounded-full bg-incogni-surface-2 p-1">
                {(["all", "created by you", "shared with you"] as const).map((t) => {
                  const val = t.split(' ')[0] as typeof tab;
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(val)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                        tab === val
                          ? "bg-incogni-surface text-incogni-text shadow-sm"
                          : "text-incogni-muted hover:text-incogni-text"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
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
                <div className="hidden sm:block sm:col-span-4 text-left">Access</div>
                <div className="col-span-4 sm:col-span-2 text-right pr-2">Actions</div>
              </div>

              {filteredAIs.length === 0 ? (
                <div className="py-12 text-center text-sm text-incogni-muted">
                  No projects found. Create one to get started.
                </div>
              ) : (
                <div className="divide-y divide-incogni-border">
                  {filteredAIs.map((ai) => (
                    <div
                      key={ai.id}
                      className="group grid grid-cols-12 items-center gap-4 py-3 hover:bg-incogni-surface-2 transition-colors rounded-lg px-2 -mx-2 cursor-pointer"
                    >
                      <div className="col-span-8 sm:col-span-6 flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-incogni-surface-2 border border-incogni-border shadow-sm overflow-hidden text-sm font-semibold">
                          {ai.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ai.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            ai.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="truncate text-sm font-medium text-incogni-text group-hover:underline">
                          {ai.name}
                        </span>
                      </div>
                      <div className="hidden sm:block sm:col-span-4">
                        <div className="flex items-center gap-1 text-sm text-incogni-muted">
                          <><Globe className="h-3 w-3" /> Public</>
                        </div>
                      </div>
                      <div className="col-span-4 sm:col-span-2 flex justify-end gap-1">
                         <button className="p-1.5 text-incogni-muted hover:text-incogni-text opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                         </button>
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
