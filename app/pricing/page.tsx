"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check, Loader2, ArrowLeft, Gift, Zap, Settings
} from "lucide-react";
import type { Plan } from "@/types";
import { PLANS } from "@/lib/plans";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { GiftModal } from "@/components/billing/GiftModal";

const CUSTOMIZABLE_PRO_FEATURES = [
  { id: "models", name: "All models — choose any IncogniAI model", price: 30 },
  { id: "agent", name: "Autonomous task agent (multi-step research)", price: 30 },
  { id: "swarm", name: "Agent Swarm — 3 parallel AI specialists", price: 40 },
  { id: "image", name: "AI image generation (text-to-image)", price: 20 },
  { id: "computer", name: "Incogni's Computer — build, preview & download live apps", price: 20 },
  { id: "priority", name: "Priority answer streaming", price: 10 }
];

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-incogni-bg" />}>
      <PricingPageInner />
    </Suspense>
  );
}

type Pane = "personal" | "business";

function PricingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, upgrade, downgrade } = useAuth();
  const current = user?.plan ?? "free";
  
  const [pane, setPane] = useState<Pane>(searchParams.get("tab") === "org" ? "business" : "personal");
  const [busy, setBusy] = useState<Plan | null>(null);
  const [downgrading, setDowngrading] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [giftPlan, setGiftPlan] = useState<Plan | null>(null);
  const [customizingPro, setCustomizingPro] = useState(false);
  const [selectedProFeatures, setSelectedProFeatures] = useState<Set<string>>(new Set(CUSTOMIZABLE_PRO_FEATURES.map(f => f.id)));

  const toggleProFeature = (id: string) => {
    const next = new Set(selectedProFeatures);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedProFeatures(next);
  };
  
  const customProPrice = 50 + CUSTOMIZABLE_PRO_FEATURES.filter(f => selectedProFeatures.has(f.id)).reduce((acc, f) => acc + f.price, 0);

  useEffect(() => {
    if (searchParams.get("tab") === "org") { 
      setPane("business");
    }
  }, [searchParams]);

  const choose = async (plan: Plan, isCustomPro: boolean = false) => {
    if (plan === current || plan === "free") return;
    if (!user) { router.push("/"); return; }
    setBusy(plan);
    setStatus(null);
    try {
      if (isCustomPro) {
        await upgrade(plan, Array.from(selectedProFeatures), customProPrice);
      } else {
        await upgrade(plan);
      }
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

  const displayedPlans = pane === "personal" 
    ? PLANS.filter(p => ["free", "go", "pro", "max"].includes(p.id))
    : PLANS.filter(p => ["free", "ultra"].includes(p.id));

  return (
    <div className="min-h-dvh bg-incogni-bg text-incogni-text">
      {/* Header */}
      <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-incogni-muted hover:text-incogni-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-4">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-6">Upgrade your plan</h1>
          
          <div className="inline-flex items-center rounded-full bg-incogni-surface p-1 shadow-sm border border-incogni-border">
            <button
              onClick={() => setPane("personal")}
              className={cn(
                "rounded-full px-6 py-2 text-sm font-semibold transition-all",
                pane === "personal" ? "bg-incogni-bg text-incogni-text shadow" : "text-incogni-muted hover:text-incogni-text"
              )}
            >
              Personal
            </button>
            <button
              onClick={() => setPane("business")}
              className={cn(
                "rounded-full px-6 py-2 text-sm font-semibold transition-all",
                pane === "business" ? "bg-incogni-bg text-incogni-text shadow" : "text-incogni-muted hover:text-incogni-text"
              )}
            >
              Business
            </button>
          </div>
        </div>

        {status && (
          <div className={cn(
            "max-w-xl mx-auto mb-8 rounded-lg px-4 py-3 text-sm text-center",
            status.kind === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          )}>
            {status.text}
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 justify-center items-start">
          {displayedPlans.map((p) => {
            const isCurrent = current === p.id;

            return (
              <div
                key={p.id}
                className={cn(
                  "flex flex-col rounded-2xl border p-6 h-full transition-all bg-incogni-surface-2",
                  p.highlight ? "border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "border-incogni-border"
                )}
              >
                <div className="mb-4">
                  <h3 className="text-2xl font-semibold mb-2">{p.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-xl font-medium">{p.id === "pro" && customizingPro ? `$${customProPrice}` : p.price}</span>
                    <span className="text-sm text-incogni-muted">{p.period}</span>
                  </div>
                  
                  {p.id === "free" && current !== "free" ? (
                    <button
                      disabled={downgrading}
                      onClick={handleDowngrade}
                      className="w-full rounded-full border border-incogni-border bg-incogni-surface py-2.5 text-sm font-semibold hover:bg-incogni-surface-2 transition-colors disabled:opacity-50 mt-2"
                    >
                      {downgrading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Downgrade & refund"}
                    </button>
                  ) : (
                    <button
                      disabled={isCurrent || busy === p.id || p.id === "free"}
                      onClick={() => choose(p.id, p.id === "pro" && customizingPro)}
                      className={cn(
                        "w-full rounded-full py-2.5 text-sm font-semibold transition-all mt-2",
                        isCurrent || p.id === "free"
                          ? "cursor-default bg-incogni-surface text-incogni-muted border border-incogni-border"
                          : p.highlight 
                            ? "bg-[#10a37f] text-white hover:bg-[#0e906f]"
                            : "bg-incogni-text text-incogni-bg hover:opacity-90"
                      )}
                    >
                      {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : isCurrent ? "Current plan" : p.id === "free" ? "Your current plan" : p.id === "pro" && customizingPro ? "Checkout Custom Plan" : p.cta}
                    </button>
                  )}
                </div>

                <p className="text-sm text-incogni-text font-medium mb-4">{p.tagline}</p>

                <div className="flex-1">
                  <ul className="space-y-3">
                    {p.id === "pro" && customizingPro ? (
                      <>
                        <li className="flex items-start gap-3 text-sm text-incogni-text/90 opacity-70">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-incogni-muted" />
                          <span>Everything in Free (Base: $50)</span>
                        </li>
                        {CUSTOMIZABLE_PRO_FEATURES.map((f) => {
                          const isSelected = selectedProFeatures.has(f.id);
                          return (
                            <li key={f.id} className="flex items-start gap-3 text-sm text-incogni-text/90">
                              <button
                                onClick={() => toggleProFeature(f.id)}
                                className={cn(
                                  "mt-0.5 h-4 w-4 shrink-0 rounded flex items-center justify-center border transition-colors",
                                  isSelected ? "bg-[#10a37f] border-[#10a37f] text-white" : "border-incogni-muted hover:border-incogni-text"
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                              </button>
                              <div className="flex flex-col text-left">
                                <span>{f.name}</span>
                                <span className="text-xs text-incogni-muted">+${f.price}/mo</span>
                              </div>
                            </li>
                          );
                        })}
                      </>
                    ) : (
                      p.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm text-incogni-text/90">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-incogni-muted" />
                          <span>{f}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                {(p.id === "pro" || p.id === "max") && (
                  <div className="mt-6 pt-6 border-t border-incogni-border space-y-3">
                    {p.id === "pro" && (
                      <button
                        onClick={() => setCustomizingPro(!customizingPro)}
                        className={cn(
                          "w-full inline-flex items-center justify-center gap-2 rounded-full border border-dashed px-4 py-2.5 text-sm font-medium transition-all",
                          customizingPro ? "bg-incogni-surface-2 border-incogni-text text-incogni-text" : "border-incogni-border text-incogni-muted hover:text-incogni-text hover:border-incogni-text"
                        )}
                      >
                        <Settings className="h-4 w-4" />
                        {customizingPro ? "Cancel Customization" : "Customize Plan"}
                      </button>
                    )}
                    <button
                      onClick={() => setGiftPlan(p.id)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-dashed border-incogni-border px-4 py-2.5 text-sm font-medium text-incogni-muted hover:text-incogni-text hover:border-incogni-text transition-all"
                    >
                      <Gift className="h-4 w-4" />
                      Gift {p.name}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {giftPlan && (
        <GiftModal
          plan={giftPlan}
          onClose={() => setGiftPlan(null)}
        />
      )}
    </div>
  );
}
