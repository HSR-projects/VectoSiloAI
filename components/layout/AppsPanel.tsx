"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Github, Loader2, Check, Search, ChevronRight, ArrowUpRight,
  Gitlab, Figma, Slack, Trello, Boxes, Rocket, Database, FileText,
  Cloud, CreditCard, Music2, Youtube, Palette, type LucideIcon,
} from "lucide-react";
import { useKodaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface GithubStatus {
  configured: boolean;
  connected: boolean;
  login: string | null;
  name: string | null;
  avatarUrl: string | null;
  scope: string | null;
}

type Category = "Featured" | "Developer" | "Productivity" | "Lifestyle";

interface AppDef {
  id: string;
  name: string;
  desc: string;
  category: Exclude<Category, "Featured">;
  icon: LucideIcon;
  /** Icon tile background (Tailwind classes). */
  tile: string;
}

// GitHub is the only live integration; the rest render as a styled gallery
// ("coming soon") so the page matches the full app-store layout.
const APPS: AppDef[] = [
  { id: "gitlab", name: "GitLab", desc: "Repos & CI/CD pipelines", category: "Developer", icon: Gitlab, tile: "bg-orange-500/15 text-orange-400" },
  { id: "vercel", name: "Vercel", desc: "Deploy your apps instantly", category: "Developer", icon: Rocket, tile: "bg-koda-surface-2 text-koda-text" },
  { id: "codesandbox", name: "CodeSandbox", desc: "Run code in a sandbox", category: "Developer", icon: Boxes, tile: "bg-yellow-500/15 text-yellow-400" },
  { id: "figma", name: "Figma", desc: "Turn code into editable design", category: "Developer", icon: Figma, tile: "bg-pink-500/15 text-pink-400" },
  { id: "supabase", name: "Supabase", desc: "Postgres database & auth", category: "Developer", icon: Database, tile: "bg-emerald-500/15 text-emerald-400" },
  { id: "notion", name: "Notion", desc: "Notes, docs & wikis", category: "Productivity", icon: FileText, tile: "bg-koda-surface-2 text-koda-text" },
  { id: "slack", name: "Slack", desc: "Send & summarize messages", category: "Productivity", icon: Slack, tile: "bg-purple-500/15 text-purple-400" },
  { id: "trello", name: "Trello", desc: "Boards, cards & tasks", category: "Productivity", icon: Trello, tile: "bg-sky-500/15 text-sky-400" },
  { id: "drive", name: "Google Drive", desc: "Find & read your files", category: "Productivity", icon: Cloud, tile: "bg-blue-500/15 text-blue-400" },
  { id: "razorpay", name: "Razorpay", desc: "Payments & invoices", category: "Productivity", icon: CreditCard, tile: "bg-indigo-500/15 text-indigo-400" },
  { id: "spotify", name: "Spotify", desc: "Music & podcasts for you", category: "Lifestyle", icon: Music2, tile: "bg-green-500/15 text-green-400" },
  { id: "youtube", name: "YouTube", desc: "Search & summarize videos", category: "Lifestyle", icon: Youtube, tile: "bg-red-500/15 text-red-400" },
  { id: "canva", name: "Canva", desc: "Make designs and flyers", category: "Lifestyle", icon: Palette, tile: "bg-cyan-500/15 text-cyan-400" },
];

const TABS: Category[] = ["Featured", "Developer", "Productivity", "Lifestyle"];

/**
 * Apps — a full-page gallery of integrations the AI can use (ChatGPT-style).
 * GitHub is live (OAuth connect → the chat can list repos, push files, run
 * Actions, edit the profile); the others are shown as upcoming.
 */
export function AppsPanel() {
  const open = useKodaStore((s) => s.appsOpen);
  const setOpen = useKodaStore((s) => s.setAppsOpen);
  const setGithubConnected = useKodaStore((s) => s.setGithubConnected);

  const [gh, setGh] = useState<GithubStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Category>("Featured");
  const [q, setQ] = useState("");
  const [soon, setSoon] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/apps/github/status");
      const data = res.ok ? await res.json() : null;
      setGh(data);
      setGithubConnected(!!data?.connected);
    } catch {
      setGh(null);
    } finally {
      setLoading(false);
    }
  }, [setGithubConnected]);

  // Sync connection status into the store on mount (AppsPanel is always
  // mounted) so the chat knows whether the @github path is available.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // After the OAuth redirect lands on /?github=connected, open Apps + refresh,
  // then strip the param so a reload doesn't re-trigger it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("github")) {
      setOpen(true);
      params.delete("github");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, [setOpen]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  // Auto-dismiss the "coming soon" note.
  useEffect(() => {
    if (!soon) return;
    const t = setTimeout(() => setSoon(null), 2200);
    return () => clearTimeout(t);
  }, [soon]);

  const connect = () => {
    window.location.href = "/api/apps/github/connect";
  };
  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch("/api/apps/github/disconnect", { method: "POST" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return APPS.filter(
      (a) =>
        (tab === "Featured" || a.category === tab) &&
        (!needle || a.name.toLowerCase().includes(needle) || a.desc.toLowerCase().includes(needle))
    );
  }, [tab, q]);

  const showGithub =
    (tab === "Featured" || tab === "Developer") &&
    (!q.trim() || "github".includes(q.trim().toLowerCase()) || "repos code actions".includes(q.trim().toLowerCase()));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 overflow-y-auto bg-koda-bg [scrollbar-width:thin]"
        >
          {/* Close */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close apps"
            className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-lg text-koda-muted transition-colors hover:bg-koda-surface-2 hover:text-koda-text"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mx-auto max-w-5xl px-6 pb-20 pt-12">
            {/* Header + search */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-koda-text">Apps</h1>
                <p className="mt-1 text-sm text-koda-muted">Chat with your favorite apps in KodaAI</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-koda-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search apps"
                  className="w-full rounded-full border border-koda-border bg-koda-surface py-2.5 pl-9 pr-3 text-sm text-koda-text placeholder:text-koda-muted focus:border-koda-accent/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Hero — GitHub */}
            <div className="relative mt-7 overflow-hidden rounded-2xl border border-koda-border bg-gradient-to-br from-[#1f2430] via-[#161922] to-[#0f1117] p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-md">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur">
                    <Github className="h-6 w-6" />
                  </span>
                  <h2 className="mt-4 text-2xl font-semibold text-white">Build with GitHub</h2>
                  <p className="mt-1.5 text-sm text-white/70">
                    List repos (incl. private), create repos, push files, run Actions, and edit your profile —
                    all from chat.
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    {loading ? (
                      <span className="inline-flex items-center gap-2 text-sm text-white/70">
                        <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                      </span>
                    ) : gh?.connected ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300">
                          <Check className="h-3.5 w-3.5" /> Connected as @{gh.login}
                        </span>
                        <button
                          onClick={disconnect}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                        >
                          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={connect}
                        disabled={!gh?.configured}
                        title={gh?.configured ? "" : "Server admin must set GITHUB_OAUTH_CLIENT_ID/SECRET"}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Github className="h-4 w-4" /> {gh?.configured ? "Connect" : "Not configured"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="hidden shrink-0 sm:block">
                  <div className="w-64 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                    <p className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/90">
                      <span className="font-semibold">@github</span> list my private repos
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {["koda-ai / web", "koda-ai / mobile", "notes (private)"].map((r) => (
                        <div key={r} className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-1.5 text-[11px] text-white/70">
                          <Github className="h-3 w-3" /> {r}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-7 flex items-center gap-1 border-b border-koda-border">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    tab === t
                      ? "border-koda-accent text-koda-text"
                      : "border-transparent text-koda-muted hover:text-koda-text"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
              {showGithub && (
                <AppRow
                  name="GitHub"
                  desc={gh?.connected ? `Connected as @${gh.login}` : "Repos, code, files & Actions"}
                  icon={Github}
                  tile="bg-koda-surface-2 text-koda-text"
                  badge={gh?.connected ? "connected" : "connect"}
                  onClick={gh?.connected ? () => setOpen(false) : connect}
                />
              )}
              {filtered.map((a) => (
                <AppRow
                  key={a.id}
                  name={a.name}
                  desc={a.desc}
                  icon={a.icon}
                  tile={a.tile}
                  badge="soon"
                  onClick={() => setSoon(a.name)}
                />
              ))}
            </div>

            {filtered.length === 0 && !showGithub && (
              <p className="py-16 text-center text-sm text-koda-muted">No apps match “{q}”.</p>
            )}
          </div>

          {/* Coming-soon toast */}
          <AnimatePresence>
            {soon && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="fixed bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full border border-koda-border bg-koda-surface px-4 py-2 text-sm text-koda-text shadow-xl"
              >
                {soon} integration is coming soon.
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AppRow({
  name, desc, icon: Icon, tile, badge, onClick,
}: {
  name: string;
  desc: string;
  icon: LucideIcon;
  tile: string;
  badge: "connect" | "connected" | "soon";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-koda-surface-2"
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tile)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-koda-text">{name}</span>
        <span className="block truncate text-xs text-koda-muted">{desc}</span>
      </span>
      {badge === "connected" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          <Check className="h-3 w-3" /> Connected
        </span>
      ) : badge === "connect" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-koda-accent/15 px-2 py-0.5 text-[10px] font-medium text-koda-accent-soft">
          Connect <ArrowUpRight className="h-3 w-3" />
        </span>
      ) : (
        <span className="rounded-full border border-koda-border px-2 py-0.5 text-[10px] text-koda-muted">Soon</span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-koda-muted transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
