"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check, Loader2, Zap, ArrowLeft, Gift, Building2, Sparkles, Infinity,
  Users, Share2, Shield, Sliders, MessageSquare, Crown,
} from "lucide-react";
import type { Plan } from "@/types";
import { PLANS } from "@/lib/plans";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { GiftModal } from "@/components/billing/GiftModal";
import { OrgPanel } from "@/components/billing/OrgPanel";

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-koda-bg" />}>
      <PricingPageInner />
    </Suspense>
  );
}

type Pane = "consumers" | "enterprise";

const consumerPlans = PLANS.filter((p) => p.id !== "ultra");

function PricingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, upgrade, downgrade } = useAuth();
  const current = user?.plan ?? "free";
  const [busy, setBusy] = useState<Plan | null>(null);
  const [downgrading, setDowngrading] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [giftPlan, setGiftPlan] = useState<Plan | null>(null);
  const [pane, setPane] = useState<Pane>(searchParams.get("tab") === "org" ? "enterprise" : "consumers");
  const [viewOrg, setViewOrg] = useState(false);

  useEffect(() => {
    if (searchParams.get("tab") === "org") { setPane("enterprise"); setViewOrg(true); }
  }, [searchParams]);

  const choose = async (plan: Plan) => {
    if (plan === current || plan === "free") return;
    if (!user) { router.push("/"); return; }
    setBusy(plan);
    setStatus(null);
    try {
      await upgrade(plan);
    } catch (e) {
      setStatus({
        kind: "error",
        text: (e as Error).message || "Could not start checkout.",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleDowngrade = async () => {
    if (!user) return;
    if (!window.confirm("Downgrade to Free? Your subscription will be canceled.")) return;
    setDowngrading(true);
    setStatus(null);
    try {
      const r = await downgrade();
      setStatus({
        kind: "success",
        text: r.refunded
          ? "Downgraded to Free — your latest payment has been refunded."
          : "Downgraded to Free.",
      });
    } catch (e) {
      setStatus({ kind: "error", text: (e as Error).message || "Could not downgrade." });
    }
    setDowngrading(false);
  };

  if (viewOrg) {
    return (
      <div className="min-h-dvh bg-koda-bg">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <button
            onClick={() => setViewOrg(false)}
            className="inline-flex items-center gap-1.5 text-xs text-koda-muted hover:text-koda-text mb-6 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to plans
          </button>
          <OrgPanel onBack={() => setViewOrg(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-koda-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-koda-border bg-koda-bg/80 backdrop-blur-xl px-4 py-3">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1.5 text-xs text-koda-muted hover:text-koda-text transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs text-koda-muted">
                Current: <span className="font-semibold text-koda-text uppercase">{current}</span>
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-12">

        {/* Pane toggle */}
        <div className="flex justify-center mb-10">
          <div className="flex w-full max-w-sm rounded-xl bg-koda-surface-2 p-1 border border-koda-border">
            <button
              onClick={() => setPane("consumers")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium transition-all min-w-0",
                pane === "consumers"
                  ? "bg-koda-bg text-koda-text shadow-sm"
                  : "text-koda-muted hover:text-koda-text"
              )}
            >
              <Crown className="h-4 w-4 shrink-0" />
              <span className="truncate">Consumers</span>
            </button>
            <button
              onClick={() => setPane("enterprise")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium transition-all min-w-0",
                pane === "enterprise"
                  ? "bg-purple-600/20 text-purple-300 shadow-sm ring-1 ring-purple-500/30"
                  : "text-koda-muted hover:text-koda-text"
              )}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">Enterprise</span>
            </button>
          </div>
        </div>

        {status && (
          <div className={cn(
            "max-w-xl mx-auto mb-8 rounded-lg px-4 py-3 text-sm text-center",
            status.kind === "success" ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"
          )}>
            {status.text}
          </div>
        )}

        {/* ── Consumers pane ── */}
        {pane === "consumers" && (
          <>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-koda-text mb-2">
                For <span className="text-koda-accent">consumers</span>
              </h1>
              <p className="text-sm text-koda-muted max-w-lg mx-auto">
                From lightweight chat to deep research — pick the power level that fits your workflow.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {consumerPlans.map((p) => {
                const isCurrent = current === p.id;

                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex flex-col rounded-2xl border p-6 relative transition-all",
                      p.highlight
                        ? "border-koda-accent/50 bg-koda-accent/[0.06]"
                        : "border-koda-border bg-koda-surface-2"
                    )}
                  >
                    {p.id === "go" ? (
                      <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                        Limited time
                      </span>
                    ) : p.highlight ? (
                      <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-koda-accent/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-koda-accent-soft">
                        Most popular
                      </span>
                    ) : null}

                    <h3 className="text-lg font-semibold text-koda-text">{p.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-koda-text">{p.price}</span>
                      <span className="text-xs text-koda-muted">{p.period}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-koda-muted leading-relaxed">{p.tagline}</p>

                    <ul className="mt-4 flex-1 space-y-2">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-koda-text/80">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-koda-accent" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 space-y-2.5">
                      {p.id === "free" && current !== "free" ? (
                        <button
                          disabled={downgrading}
                          onClick={handleDowngrade}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-koda-border bg-koda-surface px-4 py-2.5 text-sm font-semibold text-koda-text hover:bg-koda-surface-2 transition-colors disabled:opacity-60"
                        >
                          {downgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                          Downgrade & refund
                        </button>
                      ) : (
                        <button
                          disabled={isCurrent || busy === p.id || p.id === "free"}
                          onClick={() => choose(p.id)}
                          className={cn(
                            "w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                            isCurrent || p.id === "free"
                              ? "cursor-default bg-koda-surface text-koda-muted border border-koda-border"
                              : p.highlight || p.id === "max"
                                ? "bg-koda-accent text-black hover:bg-koda-accent-soft"
                                : "border border-koda-border bg-koda-surface text-koda-text hover:bg-koda-surface-2"
                          )}
                        >
                          {busy === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
                          {isCurrent ? "Current plan" : p.id === "free" ? "Free" : p.cta}
                        </button>
                      )}

                      {(p.id === "pro" || p.id === "max") && (
                        <button
                          onClick={() => setGiftPlan(p.id)}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-koda-border px-4 py-2 text-xs font-medium text-koda-text/70 hover:text-koda-text hover:border-koda-accent/50 transition-all"
                        >
                          <Gift className="h-3.5 w-3.5" />
                          Gift to someone
                        </button>
                      )}
                    </div>

                    {isCurrent && (
                      <div className="absolute -top-2.5 right-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-koda-accent/20 px-2.5 py-0.5 text-[10px] font-semibold text-koda-accent border border-koda-accent/30">
                          Active
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Enterprise pane ── */}
        {pane === "enterprise" && (
          <>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-koda-text mb-2">
                For <span className="text-purple-400">enterprise</span>
              </h1>
              <p className="text-sm text-koda-muted max-w-lg mx-auto">
                Organization-wide workspace with team management, shared conversations, and priority support.
              </p>
            </div>

            <div className="max-w-lg mx-auto">
              <div className="rounded-2xl border border-purple-500/60 bg-purple-500/[0.08] p-5 sm:p-8 ring-1 ring-purple-500/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-400 mb-2">
                      Ultra
                    </span>
                    <h3 className="text-2xl font-bold text-purple-200">$1,000</h3>
                    <p className="text-xs text-koda-muted">/month</p>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/20">
                    <Building2 className="h-8 w-8 text-purple-400" />
                  </div>
                </div>

                <p className="text-sm text-koda-muted mb-6">
                  Everything in Max, plus org workspace, team management, gift seats, and priority support.
                </p>

                <div className="space-y-3 mb-8">
                  {[
                    { icon: <Infinity className="h-4 w-4" />, text: "Unlimited agent steps & 8 parallel swarm agents" },
                    { icon: <Users className="h-4 w-4" />, text: "Organization workspace — invite your team" },
                    { icon: <Shield className="h-4 w-4" />, text: "Access requests with admin approval flow" },
                    { icon: <Sliders className="h-4 w-4" />, text: "Admin controls — disable, remove, or exclude members" },
                    { icon: <Share2 className="h-4 w-4" />, text: "Public shareable conversation links" },
                    { icon: <Gift className="h-4 w-4" />, text: "Gift Pro/Max subscriptions to team members" },
                    { icon: <MessageSquare className="h-4 w-4" />, text: "Priority support & dedicated account manager" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-purple-400 shrink-0 mt-0.5">{item.icon}</span>
                      <span className="text-sm text-koda-text/80">{item.text}</span>
                    </div>
                  ))}
                </div>

                <button
                  disabled={current === "ultra" || busy === "ultra"}
                  onClick={() => choose("ultra")}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all",
                    current === "ultra"
                      ? "cursor-default bg-koda-surface text-koda-muted border border-koda-border"
                      : "bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-600/20"
                  )}
                >
                  {busy === "ultra" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {current === "ultra" ? "Current plan" : "Go Ultra"}
                </button>

                {/* Org panel entry */}
                {user?.plan === "ultra" && (
                  <button
                    onClick={() => setViewOrg(true)}
                    className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 px-5 py-2.5 text-sm font-medium text-purple-300 hover:bg-purple-500/10 transition-colors"
                  >
                    <Building2 className="h-4 w-4" />
                    Manage your organization
                  </button>
                )}
              </div>
            </div>

            {/* Feature comparisons */}
            <div className="mt-12 max-w-2xl mx-auto">
              <h3 className="text-sm font-semibold text-koda-muted uppercase tracking-wider text-center mb-6">
                How Ultra compares
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Agent steps", consumer: "Up to 8 (Max)", enterprise: "Unlimited" },
                  { label: "Swarm agents", consumer: "Up to 4 (Max)", enterprise: "Up to 8" },
                  { label: "Team management", consumer: "—", enterprise: "Org workspace + admin controls" },
                  { label: "Member requests", consumer: "—", enterprise: "Request & approval flow" },
                  { label: "Share conversations", consumer: "—", enterprise: "Public shareable links" },
                  { label: "Gift subscriptions", consumer: "—", enterprise: "Gift Pro/Max to members" },
                  { label: "Support", consumer: "Standard", enterprise: "Priority + dedicated manager" },
                ].map((row, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-koda-surface-2 px-3 sm:px-4 py-2.5">
                    <span className="w-full sm:w-auto text-sm text-koda-text">{row.label}</span>
                    <span className="text-xs text-koda-muted sm:ml-auto">{row.consumer}</span>
                    <span className="text-xs font-medium text-purple-300">{row.enterprise}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-12 text-center text-xs text-koda-muted">
          <p>Payments processed securely by Razorpay. Cancel anytime.</p>
        </div>
      </div>

      {giftPlan && <GiftModal plan={giftPlan} onClose={() => setGiftPlan(null)} />}
    </div>
  );
}
