"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github, Loader2, Check, X, Search, Settings, Zap, Globe, Mail, Database, Shield,
  ArrowUpRight, ChevronRight, Plus, Trash2
} from "lucide-react";
import { useIncogniStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const APPS = [
  { id: "github", name: "GitHub", desc: "Repos, code, files & Actions", icon: Github, tile: "bg-incogni-surface-2 text-incogni-text", configured: true },
  { id: "jira", name: "Jira", desc: "Issues, boards & sprints", icon: Settings, tile: "bg-blue-500/20 text-blue-400" },
  { id: "linear", name: "Linear", desc: "Projects, issues & cycles", icon: Zap, tile: "bg-purple-500/20 text-purple-400" },
  { id: "notion", name: "Notion", desc: "Pages, databases & wikis", icon: Database, tile: "bg-slate-500/20 text-slate-400" },
  { id: "slack", name: "Slack", desc: "Channels, messages & workflows", icon: Mail, tile: "bg-amber-500/20 text-amber-400" },
  { id: "figma", name: "Figma", desc: "Files, components & prototypes", icon: Globe, tile: "bg-violet-500/20 text-violet-400" },
  { id: "vercel", name: "Vercel", desc: "Deployments, logs & previews", icon: Zap, tile: "bg-black text-white" },
  { id: "aws", name: "AWS", desc: "Lambda, S3, DynamoDB & more", icon: Shield, tile: "bg-orange-500/20 text-orange-400" },
];

export default function AppsPage() {
  const router = useRouter();
  const {
    appsOpen, setAppsOpen,
    githubConnected, setGithubConnected,
    setSearchOpen, setLibraryOpen,
  } = useIncogniStore();

  const [tab, setTab] = useState<"all" | "connected" | "available">("all");
  const [q, setQ] = useState("");
  const [gh, setGh] = useState<{ connected: boolean; login?: string; configured: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [soon, setSoon] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/apps/github")
      .then(r => r.json())
      .then(d => setGh(d))
      .catch(() => setGh({ connected: false, configured: true }))
      .finally(() => setLoading(false));
  }, []);

  const connect = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/oauth/github", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setSoon("GitHub");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch("/api/apps/github", { method: "DELETE" });
      setGh({ connected: false, configured: true });
    } catch {
      setSoon("GitHub");
    } finally {
      setBusy(false);
    }
  };

  const showGithub = tab !== "available";
  const filtered = APPS.filter(a => {
    if (tab === "connected") return false;
    if (tab === "available") return true;
    return true;
  }).filter(a => a.name.toLowerCase().includes(q.toLowerCase()));

  const goBack = () => router.back();

  return (
    <div className="flex h-full w-full flex-col bg-incogni-bg">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-incogni-border bg-incogni-surface px-4 md:px-6">
        <button
          onClick={goBack}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-incogni-muted transition-colors hover:bg-incogni-surface-2 hover:text-incogni-text md:hidden"
        >
          <ChevronRight className="h-4 w-4 rotate-180" /> Back
        </button>
        <div className="flex-1 flex items-center gap-4 md:justify-center">
          <h1 className="text-lg font-semibold text-incogni-text">Integrations</h1>
        </div>
        <div className="w-20 md:w-auto" />
      </header>

      {/* Tabs */}
      <div className="flex shrink-0 items-center gap-1 border-b border-incogni-border px-4 md:px-6 bg-incogni-surface/50">
        {["all", "connected", "available"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as typeof tab)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t ? "border-incogni-accent text-incogni-text" : "border-transparent text-incogni-muted hover:text-incogni-text"
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-incogni-muted" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search integrations…"
            className="w-64 pl-9 pr-3 py-1.5 rounded-lg border border-incogni-border bg-incogni-bg text-sm text-incogni-text placeholder:text-incogni-muted focus:border-incogni-accent/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-incogni-accent" />
          </div>
        ) : (
          <>
            {showGithub && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-incogni-surface-2"
              >
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", gh?.connected ? "bg-emerald-500/15" : "bg-incogni-surface-2 text-incogni-text")}>
                  <Github className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-incogni-text">GitHub</span>
                  <span className="block truncate text-xs text-incogni-muted">
                    {gh?.connected ? `Connected as @${gh.login}` : "Repos, code, files & Actions"}
                  </span>
                </span>
                {gh?.connected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    <Check className="h-3 w-3" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-incogni-accent/15 px-2 py-0.5 text-[10px] font-medium text-incogni-accent-soft">
                    Connect <ArrowUpRight className="h-3 w-3" />
                  </span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-incogni-muted transition-transform group-hover:translate-x-0.5" />
              </motion.div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a) => (
                <motion.button
                  key={a.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSoon(a.name)}
                  className="group flex items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-incogni-surface-2"
                  type="button"
                >
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", a.tile)}>
                    <a.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-incogni-text">{a.name}</span>
                    <span className="block truncate text-xs text-incogni-muted">{a.desc}</span>
                  </span>
                  <span className="rounded-full border border-incogni-border px-2 py-0.5 text-[10px] text-incogni-muted">Soon</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-incogni-muted transition-transform group-hover:translate-x-0.5" />
                </motion.button>
              ))}
            </div>

            {filtered.length === 0 && !showGithub && (
              <p className="py-16 text-center text-sm text-incogni-muted">No integrations match “{q}”.</p>
            )}
          </>
        )}

        {/* Coming-soon toast */}
        <AnimatePresence>
          {soon && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="fixed bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full border border-incogni-border bg-incogni-surface px-4 py-2 text-sm text-incogni-text shadow-xl"
            >
              {soon} integration is coming soon.
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}