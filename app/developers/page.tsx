"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound, Plus, Copy, Check, Trash2, Loader2, Coins, Zap, AlertTriangle, LogIn,
  Home as HomeIcon, Activity, ArrowLeft, Cpu, CheckCircle2, Circle, ArrowUpRight,
} from "lucide-react";
import type { ApiKeyPublic, OAuthClientPublic } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { useModels } from "@/hooks/useModels";
import { useKodaStore } from "@/lib/store";
import { CREDIT_PACKS, formatCredits, API_CENTS_PER_1K } from "@/lib/credits";
import { modelLabel, relativeTime, cn } from "@/lib/utils";

type Section = "home" | "usage" | "keys" | "oauth" | "credits";
type Range = "24h" | "7d" | "30d" | "90d";

interface UsageSummary {
  range: Range;
  totalTokens: number;
  totalRequests: number;
  totalCostCents: number;
  series: { t: number; tokens: number; requests: number }[];
}

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: <HomeIcon className="h-4 w-4" /> },
  { id: "usage", label: "Usage", icon: <Activity className="h-4 w-4" /> },
  { id: "keys", label: "API Keys", icon: <KeyRound className="h-4 w-4" /> },
  { id: "oauth", label: "OAuth Apps", icon: <LogIn className="h-4 w-4" /> },
  { id: "credits", label: "Credits", icon: <Coins className="h-4 w-4" /> },
];

export default function DevelopersPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  useModels();
  const availableModels = useKodaStore((s) => s.availableModels);

  const [section, setSection] = useState<Section>("home");
  const [range, setRange] = useState<Range>("24h");
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const origin = "https://chat.hsrprojects.org";

  // API keys
  const [keys, setKeys] = useState<ApiKeyPublic[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newKeyLimit, setNewKeyLimit] = useState("5.00");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Credits
  const [buying, setBuying] = useState<string | null>(null);

  // OAuth apps
  const [apps, setApps] = useState<OAuthClientPublic[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appName, setAppName] = useState("");
  const [appRedirects, setAppRedirects] = useState("");
  const [creatingApp, setCreatingApp] = useState(false);
  const [newAppCreds, setNewAppCreds] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await fetch("/api/account/api-keys", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setKeys(data.keys ?? []);
    } finally {
      setKeysLoading(false);
    }
  }, []);

  const loadApps = useCallback(async () => {
    setAppsLoading(true);
    try {
      const res = await fetch("/api/oauth/apps", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setApps(data.apps ?? []);
    } finally {
      setAppsLoading(false);
    }
  }, []);

  const loadUsage = useCallback(async (r: Range) => {
    try {
      const res = await fetch(`/api/account/usage?range=${r}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setUsage(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (user) { loadKeys(); loadApps(); }
  }, [user, loadKeys, loadApps]);

  useEffect(() => {
    if (user) loadUsage(range);
  }, [user, range, loadUsage]);

  const createKey = async () => {
    setCreating(true); setError(null);
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim() || "Default key",
          creditLimitCents: dollarsToCents(newKeyLimit),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create key.");
      setRevealed(data.secret); setNewName(""); setNewKeyLimit("5.00"); await loadKeys();
    } catch (e) { setError((e as Error).message); } finally { setCreating(false); }
  };

  const revokeKey = async (id: string) => {
    await fetch(`/api/account/api-keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    loadKeys();
  };

  const buyCredits = async (packId: string) => {
    setBuying(packId); setError(null);
    try {
      const res = await fetch("/api/razorpay/credits", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error(data.error || "Could not start checkout.");
      const params = new URLSearchParams({
        order_id: data.id,
        key: data.key,
        amount: String(data.amount),
        currency: data.currency || "INR",
        name: data.name || "Koda AI",
        description: data.description || "API credits",
        email: data.prefill?.email || "",
        callback: `${window.location.origin}/razorpay/success?order_id=${data.id}&kind=credits`,
      });
      window.location.href = `/razorpay/checkout?${params}`;
    } catch (e) { setError((e as Error).message); } finally { setBuying(null); }
  };

  const createApp = async () => {
    setCreatingApp(true); setError(null);
    try {
      const redirectUris = appRedirects.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      const res = await fetch("/api/oauth/apps", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: appName.trim(), redirectUris }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create app.");
      setNewAppCreds({ clientId: data.app.clientId, clientSecret: data.clientSecret });
      setAppName(""); setAppRedirects(""); await loadApps();
    } catch (e) { setError((e as Error).message); } finally { setCreatingApp(false); }
  };

  const deleteApp = async (id: string) => {
    await fetch(`/api/oauth/apps/${encodeURIComponent(id)}`, { method: "DELETE" });
    loadApps();
  };

  const copyText = (key: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(key); setTimeout(() => setCopiedField(null), 1500);
    });
  };

  if (!authLoading && !user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-koda-bg px-4 text-center">
        <KeyRound className="h-10 w-10 text-koda-accent" />
        <p className="text-koda-text">Sign in to open the developer console.</p>
        <button onClick={() => router.push("/")} className="rounded-xl bg-koda-accent px-5 py-2 text-sm font-semibold text-black hover:bg-koda-accent-soft">
          Go home
        </button>
      </div>
    );
  }

  const checklist = [
    { label: "Create an API key", done: keys.length > 0, go: "keys" as Section },
    { label: "Register an OAuth app", done: apps.length > 0, go: "oauth" as Section },
    { label: "Add credits", done: (user?.credits ?? 0) > 0, go: "credits" as Section },
  ];

  return (
    <div className="flex h-dvh overflow-hidden bg-koda-bg">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-koda-border bg-koda-surface/40 md:flex">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 px-4 py-4 text-left">
          <span className="text-lg font-semibold tracking-tight text-koda-text">Koda<span className="text-koda-accent">AI</span></span>
          <span className="rounded bg-koda-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-koda-muted">Dev</span>
        </button>
        <nav className="flex-1 space-y-0.5 px-2">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                section === n.id ? "bg-koda-surface-2 text-koda-text" : "text-koda-muted hover:bg-koda-surface-2/60 hover:text-koda-text")}>
              {n.icon}{n.label}
            </button>
          ))}
        </nav>
        <button onClick={() => router.push("/")} className="m-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-koda-muted hover:bg-koda-surface-2 hover:text-koda-text">
          <ArrowLeft className="h-4 w-4" /> Back to app
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {/* Mobile nav strip */}
        <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-koda-border bg-koda-bg/90 p-2 backdrop-blur md:hidden [scrollbar-width:none]">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs",
                section === n.id ? "bg-koda-surface-2 text-koda-text" : "text-koda-muted")}>
              {n.icon}{n.label}
            </button>
          ))}
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-koda-text">
              {NAV.find((n) => n.id === section)?.label}
            </h1>
            {(section === "home" || section === "usage") && (
              <RangeTabs value={range} onChange={setRange} />
            )}
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {section === "home" && (
            <HomeSection
              checklist={checklist} onGo={setSection} usage={usage}
              credits={user?.credits ?? 0} models={availableModels}
            />
          )}
          {section === "usage" && <UsageSection usage={usage} credits={user?.credits ?? 0} />}
          {section === "credits" && (
            <CreditsSection credits={user?.credits ?? 0} buying={buying} onBuy={buyCredits} onRefresh={refresh} />
          )}
          {section === "keys" && (
            <KeysSection
              origin={origin}
              keys={keys} loading={keysLoading} newName={newName} setNewName={setNewName}
              newKeyLimit={newKeyLimit} setNewKeyLimit={setNewKeyLimit}
              creating={creating} onCreate={createKey} onRevoke={revokeKey}
              revealed={revealed} copied={copied}
              onCopy={() => { if (revealed) { navigator.clipboard.writeText(revealed); setCopied(true); setTimeout(() => setCopied(false), 1500); } }}
              onDismiss={() => setRevealed(null)}
            />
          )}
          {section === "oauth" && (
            <OAuthSection
              origin={origin}
              apps={apps} loading={appsLoading} appName={appName} setAppName={setAppName}
              appRedirects={appRedirects} setAppRedirects={setAppRedirects}
              creating={creatingApp} onCreate={createApp} onDelete={deleteApp}
              newCreds={newAppCreds} onDismiss={() => setNewAppCreds(null)}
              copiedField={copiedField} onCopy={copyText}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Shared bits ──────────────────────────────────────────────

function RangeTabs({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const ranges: Range[] = ["24h", "7d", "30d", "90d"];
  return (
    <div className="flex rounded-lg border border-koda-border bg-koda-surface p-0.5 text-xs">
      {ranges.map((r) => (
        <button key={r} onClick={() => onChange(r)}
          className={cn("rounded-md px-2.5 py-1 transition-colors", value === r ? "bg-koda-surface-2 text-koda-text" : "text-koda-muted hover:text-koda-text")}>
          {r}
        </button>
      ))}
    </div>
  );
}

function MiniBars({ data, accent }: { data: number[]; accent: string }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex h-12 items-end gap-0.5">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(3, (v / max) * 100)}%`, backgroundColor: accent, opacity: v === 0 ? 0.18 : 1 }} />
      ))}
    </div>
  );
}

function StatCard({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-koda-border bg-koda-surface p-4">
      <p className="text-xs text-koda-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-koda-text">{value}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────

function HomeSection({
  checklist, onGo, usage, credits, models,
}: {
  checklist: { label: string; done: boolean; go: Section }[];
  onGo: (s: Section) => void;
  usage: UsageSummary | null;
  credits: number;
  models: string[];
}) {
  return (
    <div className="space-y-8">
      {/* Get started */}
      <section className="rounded-2xl border border-koda-border bg-koda-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-koda-text">Get started</h2>
        <div className="space-y-3">
          {checklist.map((c) => (
            <button key={c.label} onClick={() => onGo(c.go)} className="flex w-full items-center gap-3 text-left">
              {c.done
                ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
                : <Circle className="h-5 w-5 shrink-0 text-koda-muted" />}
              <span className={cn("text-sm", c.done ? "text-koda-muted line-through" : "text-koda-text")}>{c.label}</span>
              {!c.done && <ArrowUpRight className="ml-auto h-4 w-4 text-koda-muted" />}
            </button>
          ))}
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total tokens" value={fmt(usage?.totalTokens ?? 0)}>
          <MiniBars data={(usage?.series ?? []).map((s) => s.tokens)} accent="#7c3aed" />
        </StatCard>
        <StatCard label="Total requests" value={fmt(usage?.totalRequests ?? 0)}>
          <MiniBars data={(usage?.series ?? []).map((s) => s.requests)} accent="#22c55e" />
        </StatCard>
        <div className="rounded-2xl border border-koda-accent/30 bg-koda-accent/[0.06] p-4">
          <p className="text-xs text-koda-muted">Credit remaining</p>
          <p className="mt-1 text-2xl font-semibold text-koda-text">{formatCredits(credits)}</p>
          <button onClick={() => onGo("credits")} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-koda-accent px-3 py-1.5 text-xs font-semibold text-black hover:bg-koda-accent-soft">
            <Coins className="h-3.5 w-3.5" /> Add credits
          </button>
        </div>
      </div>

      {/* Recommended models */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-koda-text">Recommended models</h2>
        {models.length === 0 ? (
          <p className="text-sm text-koda-muted">No models available right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {models.slice(0, 6).map((m) => (
              <div key={m} className="rounded-xl border border-koda-border bg-koda-surface p-4">
                <Cpu className="mb-2 h-5 w-5 text-koda-accent" />
                <p className="text-sm font-medium text-koda-text">{modelLabel(m)}</p>
                <p className="mt-0.5 font-mono text-xs text-koda-muted">{m}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function UsageSection({ usage, credits }: { usage: UsageSummary | null; credits: number }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Tokens" value={fmt(usage?.totalTokens ?? 0)} />
        <StatCard label="Requests" value={fmt(usage?.totalRequests ?? 0)} />
        <StatCard label="Spend" value={formatCredits(usage?.totalCostCents ?? 0)} />
        <StatCard label="Credit left" value={formatCredits(credits)} />
      </div>
      <section className="rounded-2xl border border-koda-border bg-koda-surface p-5">
        <p className="mb-3 text-sm font-semibold text-koda-text">Tokens over time</p>
        <MiniBars data={(usage?.series ?? []).map((s) => s.tokens)} accent="#7c3aed" />
        <p className="mb-3 mt-6 text-sm font-semibold text-koda-text">Requests over time</p>
        <MiniBars data={(usage?.series ?? []).map((s) => s.requests)} accent="#22c55e" />
        {(usage?.totalRequests ?? 0) === 0 && (
          <p className="mt-4 text-center text-xs text-koda-muted">
            No API usage in this range yet. Usage from your API keys will appear here.
          </p>
        )}
      </section>
    </div>
  );
}

function CreditsSection({
  credits, buying, onBuy, onRefresh,
}: {
  credits: number; buying: string | null; onBuy: (id: string) => void; onRefresh: () => void;
}) {
  return (
    <section className="rounded-2xl border border-koda-border bg-koda-surface p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-koda-accent/15">
          <Coins className="h-5 w-5 text-koda-accent" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-koda-muted">Credit balance</p>
          <p className="text-2xl font-semibold text-koda-text">{formatCredits(credits)}</p>
        </div>
        <p className="ml-auto hidden text-right text-xs text-koda-muted sm:block">
          ~{API_CENTS_PER_1K}¢ / 1K tokens<br />Credits never expire
        </p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CREDIT_PACKS.map((pack) => (
          <button key={pack.id} onClick={() => onBuy(pack.id)} disabled={!!buying}
            className="relative flex flex-col items-center gap-1 rounded-xl border border-koda-border bg-koda-surface-2 px-3 py-3 transition-colors hover:border-koda-accent/50 hover:bg-koda-surface disabled:opacity-60">
            {pack.note && <span className="absolute -top-2 rounded-full bg-koda-accent px-2 py-0.5 text-[10px] font-semibold text-black">{pack.note}</span>}
            <span className="text-lg font-semibold text-koda-text">${pack.usd}</span>
            <span className="text-xs text-koda-muted">{pack.credits} credits</span>
            {buying === pack.id && <Loader2 className="mt-1 h-3.5 w-3.5 animate-spin text-koda-accent" />}
          </button>
        ))}
      </div>
      <button onClick={onRefresh} className="mt-3 text-xs text-koda-muted hover:text-koda-text">Refresh balance</button>
    </section>
  );
}

function KeysSection({
  origin, keys, loading, newName, setNewName, newKeyLimit, setNewKeyLimit,
  creating, onCreate, onRevoke, revealed, copied, onCopy, onDismiss,
}: {
  origin: string;
  keys: ApiKeyPublic[]; loading: boolean; newName: string; setNewName: (v: string) => void;
  newKeyLimit: string; setNewKeyLimit: (v: string) => void;
  creating: boolean; onCreate: () => void; onRevoke: (id: string) => void;
  revealed: string | null; copied: boolean; onCopy: () => void; onDismiss: () => void;
}) {
  const limitCents = dollarsToCents(newKeyLimit);
  return (
    <section>
      {revealed && (
        <div className="mb-4 rounded-xl border border-koda-accent/40 bg-koda-accent/10 p-4">
          <p className="mb-2 text-xs font-medium text-koda-accent-soft">Copy your key now — you won&apos;t see it again.</p>
          <div className="flex items-center gap-2 rounded-lg bg-koda-bg/60 px-3 py-2">
            <code className="flex-1 truncate font-mono text-xs text-koda-text">{revealed}</code>
            <button onClick={onCopy} className="flex items-center gap-1 rounded-md bg-koda-surface-2 px-2 py-1 text-xs text-koda-text hover:bg-koda-surface">
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button onClick={onDismiss} className="mt-2 text-xs text-koda-muted hover:text-koda-text">Done</button>
        </div>
      )}
      <div className="mb-3 rounded-xl border border-koda-border bg-koda-surface p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onCreate()}
            placeholder="Key name (e.g. production)"
            className="rounded-lg border border-koda-border bg-koda-surface-2 px-3 py-2 text-sm text-koda-text placeholder:text-koda-muted focus:border-koda-accent/50 focus:outline-none" />
          <label className="relative">
            <span className="pointer-events-none absolute left-3 top-2 text-sm text-koda-muted">$</span>
            <input value={newKeyLimit} onChange={(e) => setNewKeyLimit(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onCreate()}
              inputMode="decimal" aria-label="Credit limit in dollars"
              className="w-full rounded-lg border border-koda-border bg-koda-surface-2 py-2 pl-7 pr-3 text-sm text-koda-text placeholder:text-koda-muted focus:border-koda-accent/50 focus:outline-none" />
          </label>
          <button onClick={onCreate} disabled={creating || limitCents <= 0} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-koda-accent px-3.5 py-2 text-sm font-medium text-black hover:bg-koda-accent-soft disabled:opacity-60">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CREDIT_PACKS.map((pack) => (
            <button key={pack.id} onClick={() => setNewKeyLimit((pack.usd).toFixed(2))}
              className="rounded-md border border-koda-border bg-koda-surface-2 px-2.5 py-1 text-xs text-koda-muted hover:border-koda-accent/40 hover:text-koda-text">
              {pack.label} {formatCredits(pack.credits)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-koda-muted">
          This key can spend up to {formatCredits(limitCents)} from your account balance. Buy credits in the Credits tab to fund it.
        </p>
      </div>
      <div className="divide-y divide-koda-border overflow-hidden rounded-xl border border-koda-border bg-koda-surface">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-koda-muted" /></div>
        ) : keys.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-koda-muted">No API keys yet.</p>
        ) : keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-koda-text">{k.name}</p>
              <p className="font-mono text-xs text-koda-muted">
                sk-koda-…{k.last4} · created {relativeTime(k.createdAt)}
                {k.lastUsedAt ? ` · last used ${relativeTime(k.lastUsedAt)}` : " · never used"}
              </p>
              <p className="mt-1 text-xs text-koda-muted">
                Spent {formatCredits(k.spentCents)} / {k.creditLimitCents ? formatCredits(k.creditLimitCents) : "no key limit"}
              </p>
            </div>
            <button onClick={() => onRevoke(k.id)} aria-label={`Revoke ${k.name}`}
              className="ml-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-koda-muted hover:bg-red-500/10 hover:text-red-300">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-koda-text"><Zap className="h-4 w-4 text-koda-accent" /> Quickstart</h2>
        <pre className="overflow-x-auto rounded-xl border border-koda-border bg-[#141416] p-4 text-xs leading-relaxed text-koda-text/90">
{`curl ${origin}/api/v1/chat \\
  -H "Authorization: Bearer sk-koda-..." \\
  -H "Content-Type: application/json" \\
  -d '{ "model": "koda", "prompt": "Hello from KodaAI" }'`}
        </pre>
      </section>
    </section>
  );
}

function OAuthSection({
  origin, apps, loading, appName, setAppName, appRedirects, setAppRedirects, creating, onCreate, onDelete,
  newCreds, onDismiss, copiedField, onCopy,
}: {
  origin: string;
  apps: OAuthClientPublic[]; loading: boolean; appName: string; setAppName: (v: string) => void;
  appRedirects: string; setAppRedirects: (v: string) => void; creating: boolean;
  onCreate: () => void; onDelete: (id: string) => void;
  newCreds: { clientId: string; clientSecret: string } | null; onDismiss: () => void;
  copiedField: string | null; onCopy: (k: string, v: string) => void;
}) {
  return (
    <section>
      <p className="mb-3 text-xs text-koda-muted">
        Let any website offer a “Continue with KodaAI” button. Register an app to get a client ID &amp; secret.
      </p>

      {newCreds && (
        <div className="mb-4 rounded-xl border border-koda-accent/40 bg-koda-accent/10 p-4">
          <p className="mb-2 text-xs font-medium text-koda-accent-soft">Save your client secret now — it won&apos;t be shown again.</p>
          <CredRow label="Client ID" value={newCreds.clientId} copied={copiedField === "id"} onCopy={() => onCopy("id", newCreds.clientId)} />
          <CredRow label="Client secret" value={newCreds.clientSecret} copied={copiedField === "secret"} onCopy={() => onCopy("secret", newCreds.clientSecret)} />
          <button onClick={onDismiss} className="mt-2 text-xs text-koda-muted hover:text-koda-text">Done</button>
        </div>
      )}

      <div className="mb-3 space-y-2 rounded-xl border border-koda-border bg-koda-surface p-3">
        <input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="App name (e.g. My Website)"
          className="w-full rounded-lg border border-koda-border bg-koda-surface-2 px-3 py-2 text-sm text-koda-text placeholder:text-koda-muted focus:border-koda-accent/50 focus:outline-none" />
        <textarea value={appRedirects} onChange={(e) => setAppRedirects(e.target.value)} rows={2}
          placeholder={"Redirect URIs (one per line)\nhttps://myapp.com/auth/koda/callback"}
          className="w-full rounded-lg border border-koda-border bg-koda-surface-2 px-3 py-2 text-sm text-koda-text placeholder:text-koda-muted focus:border-koda-accent/50 focus:outline-none" />
        <button onClick={onCreate} disabled={creating || !appName.trim() || !appRedirects.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-koda-accent px-3.5 py-2 text-sm font-medium text-black hover:bg-koda-accent-soft disabled:opacity-50">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Register app
        </button>
      </div>

      <div className="divide-y divide-koda-border overflow-hidden rounded-xl border border-koda-border bg-koda-surface">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-koda-muted" /></div>
        ) : apps.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-koda-muted">No apps yet.</p>
        ) : apps.map((a) => (
          <div key={a.clientId} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-koda-text">{a.name}</p>
              <p className="truncate font-mono text-xs text-koda-muted">{a.clientId}</p>
              <p className="mt-0.5 truncate text-xs text-koda-muted">{a.redirectUris.join(", ")}</p>
            </div>
            <button onClick={() => onDelete(a.clientId)} aria-label={`Delete ${a.name}`}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-koda-muted hover:bg-red-500/10 hover:text-red-300">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <pre className="mt-3 overflow-x-auto rounded-xl border border-koda-border bg-[#141416] p-4 text-xs leading-relaxed text-koda-text/90">
{`# 1. Send users to consent
${origin}/oauth/authorize?client_id=koda_...
  &redirect_uri=https://myapp.com/callback&response_type=code
  &scope=profile%20email&state=xyz

# 2. Exchange ?code for a token
curl -X POST ${origin}/api/oauth/token \\
  -d grant_type=authorization_code -d code=THE_CODE \\
  -d client_id=koda_... -d client_secret=koda_sk_... \\
  -d redirect_uri=https://myapp.com/callback

# 3. Fetch the profile
curl ${origin}/api/oauth/userinfo -H "Authorization: Bearer TOKEN"`}
      </pre>
    </section>
  );
}

function CredRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="mb-2">
      <p className="mb-1 text-[11px] uppercase tracking-wide text-koda-muted">{label}</p>
      <div className="flex items-center gap-2 rounded-lg bg-koda-bg/60 px-3 py-2">
        <code className="flex-1 truncate font-mono text-xs text-koda-text">{value}</code>
        <button onClick={onCopy} className="flex items-center gap-1 rounded-md bg-koda-surface-2 px-2 py-1 text-xs text-koda-text hover:bg-koda-surface">
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function dollarsToCents(value: string): number {
  const n = Number(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}
