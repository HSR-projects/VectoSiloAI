"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Search, ChevronRight, Github, Settings, Zap, Database, Mail, Globe, Shield, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_PLUGINS = [
  { id: "github", name: "GitHub", desc: "Repos, code, files & Actions", icon: Github, category: "productivity" },
  { id: "jira", name: "Jira", desc: "Issues, boards & sprints", icon: Settings, category: "productivity" },
  { id: "linear", name: "Linear", desc: "Projects, issues & cycles", icon: Zap, category: "productivity" },
  { id: "notion", name: "Notion", desc: "Pages, databases & wikis", icon: Database, category: "productivity" },
  { id: "slack", name: "Slack", desc: "Channels, messages & workflows", icon: Mail, category: "productivity" },
  { id: "figma", name: "Figma", desc: "Files, components & prototypes", icon: Globe, category: "creativity" },
  { id: "vercel", name: "Vercel", desc: "Deployments, logs & previews", icon: Zap, category: "productivity" },
  { id: "aws", name: "AWS", desc: "Lambda, S3, DynamoDB & more", icon: Shield, category: "productivity" },
];

export default function PluginsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [q, setQ] = useState("");
  const [gh, setGh] = useState<{ connected: boolean; login?: string; configured: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/apps/github")
      .then(r => r.json())
      .then(d => setGh(d))
      .catch(() => setGh({ connected: false, configured: true }))
      .finally(() => setLoading(false));
  }, []);

  const featured = ALL_PLUGINS.slice(0, 4);
  const productivity = ALL_PLUGINS.filter(p => p.category === "productivity");
  const creativity = ALL_PLUGINS.filter(p => p.category === "creativity");

  const renderGrid = (items: typeof ALL_PLUGINS) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <div
          key={p.id}
          className="group flex flex-col justify-between rounded-xl border border-incogni-border bg-incogni-surface-2 p-4 transition-colors hover:border-incogni-muted/30"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-incogni-surface shadow-sm border border-incogni-border">
              <p.icon className="h-5 w-5 text-incogni-text" />
            </div>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-incogni-surface-2 border border-incogni-border text-incogni-text hover:bg-incogni-surface transition-colors">
              +
            </button>
          </div>
          <div className="mt-4">
            <h3 className="font-medium text-incogni-text">{p.name}</h3>
            <p className="mt-1 text-sm text-incogni-muted line-clamp-2">{p.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-incogni-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header showMenu onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 [scrollbar-width:thin]">
          <div className="mx-auto max-w-5xl space-y-12">
            
            <div className="space-y-4 text-center">
              <h1 className="text-3xl font-semibold text-incogni-text">Plugins</h1>
              <p className="text-incogni-muted">Work with IncogniAI across your favorite tools.</p>
              <div className="relative mx-auto max-w-xl mt-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-incogni-muted" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search plugins"
                  className="w-full rounded-full border border-incogni-border bg-incogni-surface-2 py-3 pl-12 pr-4 text-[15px] text-incogni-text placeholder:text-incogni-muted shadow-sm focus:border-incogni-accent/50 focus:outline-none focus:ring-1 focus:ring-incogni-accent/50 transition-all"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-incogni-accent" />
              </div>
            ) : (
              <div className="space-y-12">
                {gh?.connected && (
                  <div>
                    <div className="mb-4 flex items-center gap-1 text-lg font-medium text-incogni-text">
                      Installed <ChevronRight className="h-5 w-5 text-incogni-muted" />
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none]">
                      <div className="flex w-64 shrink-0 flex-col justify-between rounded-xl border border-incogni-border bg-incogni-surface-2 p-4 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 shadow-sm border border-emerald-500/20">
                            <Github className="h-5 w-5 text-emerald-500" />
                          </div>
                          <button className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500">
                            <Check className="h-3 w-3" /> Installed
                          </button>
                        </div>
                        <div className="mt-4">
                          <h3 className="font-medium text-incogni-text">GitHub</h3>
                          <p className="mt-1 text-sm text-incogni-muted truncate">@{gh.login}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-4 flex items-center gap-1 text-lg font-medium text-incogni-text">
                    Featured <ChevronRight className="h-5 w-5 text-incogni-muted" />
                  </div>
                  {renderGrid(featured)}
                </div>

                <div>
                  <div className="mb-4 flex items-center gap-1 text-lg font-medium text-incogni-text">
                    Productivity <ChevronRight className="h-5 w-5 text-incogni-muted" />
                  </div>
                  {renderGrid(productivity)}
                </div>

                <div>
                  <div className="mb-4 flex items-center gap-1 text-lg font-medium text-incogni-text">
                    Creativity <ChevronRight className="h-5 w-5 text-incogni-muted" />
                  </div>
                  {renderGrid(creativity)}
                </div>
              </div>
            )}
            
          </div>
        </main>
      </div>
    </div>
  );
}
