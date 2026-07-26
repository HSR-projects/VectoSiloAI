"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Github, Loader2, Check, Search, Settings, Zap, Globe, Mail, Database, Shield,
  ArrowUpRight, ChevronRight,
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

export function IntegrationsPanel() {
  const githubConnected = useIncogniStore((s) => s.githubConnected);
  const setGithubConnected = useIncogniStore((s) => s.setGithubConnected);

  const [gh, setGh] = useState<{ connected: boolean; login?: string; configured: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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
      /* silent */
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
      /* silent */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-incogni-accent" />
        </div>
      ) : (
        <>
          {/* GitHub */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
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
              <button
                onClick={connect}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg border border-incogni-accent/30 bg-incogni-accent/10 px-2.5 py-1 text-[11px] font-medium text-incogni-accent-soft transition-colors hover:bg-incogni-accent/20"
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpRight className="h-3 w-3" />}
                Connect
              </button>
            )}
            {gh?.connected && (
              <button
                onClick={disconnect}
                disabled={busy}
                className="rounded-lg px-2 py-1 text-[11px] text-incogni-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                Disconnect
              </button>
            )}
          </motion.div>

          {/* App grid */}
          <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1">
            {APPS.map((a) => (
              <div
                key={a.id}
                className="group flex items-center gap-3 rounded-xl px-2 py-3 text-left"
              >
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", a.tile)}>
                  <a.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-incogni-text">{a.name}</span>
                  <span className="block truncate text-xs text-incogni-muted">{a.desc}</span>
                </span>
                <span className="rounded-full border border-incogni-border px-2 py-0.5 text-[10px] text-incogni-muted">Soon</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
