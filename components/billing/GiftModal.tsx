"use client";

import { useState } from "react";
import { Loader2, Search, Send, X, Gift, ExternalLink } from "lucide-react";
import type { Plan } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface UserResult {
  id: string;
  name: string;
  email: string;
  plan: string;
}

interface GiftModalProps {
  plan: Plan;
  onClose: () => void;
}

const PLAN_AMOUNT: Record<string, number> = { pro: 200, max: 600 };

export function GiftModal({ plan, onClose }: GiftModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [selected, setSelected] = useState<UserResult | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const searchUsers = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.users ?? []);
    } catch { setResults([]); }
  };

  const buyGift = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/razorpay/gift-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          toEmail: selected?.email || email.trim() || undefined,
          toName: selected?.name || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Redirect to Razorpay Checkout
      if (data.id) {
        const params = new URLSearchParams({
          order_id: data.id,
          key: data.key,
          amount: String(data.amount),
          currency: data.currency || "INR",
          name: data.name || `Gift IncogniAI ${plan === "pro" ? "Pro" : "Max"}`,
          description: data.description || "",
          email: data.prefill?.email || "",
          callback: `${window.location.origin}/razorpay/success?order_id=${data.id}&plan=${plan}&kind=gift`,
        });
        window.location.href = `/razorpay/checkout?${params}`;
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-incogni-accent" />
            Gift {plan === "pro" ? "IncogniAI Pro" : "IncogniAI Max"}
          </DialogTitle>
          <DialogDescription>
            Search for a user or enter their email. Payment is processed securely by Razorpay.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-incogni-muted" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={query}
              onChange={(e) => searchUsers(e.target.value)}
              className="w-full rounded-lg border border-incogni-border bg-incogni-surface pl-9 pr-3 py-2 text-sm text-incogni-text placeholder:text-incogni-muted focus:outline-none focus:border-incogni-accent"
            />
          </div>

          {results.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelected(u);
                    setResults([]);
                    setQuery(u.name);
                    setEmail("");
                  }}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-incogni-surface-2 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-incogni-accent/20 text-xs font-semibold text-incogni-accent">
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-incogni-text">{u.name}</p>
                    <p className="truncate text-xs text-incogni-muted">{u.email}</p>
                  </div>
                  <span className="text-[10px] uppercase text-incogni-muted">{u.plan}</span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="flex items-center gap-2 rounded-lg bg-incogni-accent/10 px-3 py-2">
              <span className="flex-1 text-sm text-incogni-text">
                Gift to <strong>{selected.name}</strong> ({selected.email})
              </span>
              <button onClick={() => { setSelected(null); setQuery(""); }} className="text-incogni-muted hover:text-incogni-text">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {!selected && (
            <div>
              <p className="text-xs text-incogni-muted mb-1">Or enter their email:</p>
              <input
                type="email"
                placeholder="person@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-incogni-border bg-incogni-surface px-3 py-2 text-sm text-incogni-text placeholder:text-incogni-muted focus:outline-none focus:border-incogni-accent"
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
          )}

          <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300 flex items-start gap-2">
            <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>You will be redirected to Razorpay to complete payment. The gift code is shown after successful payment.</span>
          </div>

          <button
            disabled={busy || (!selected && !email.trim())}
            onClick={buyGift}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-incogni-accent px-4 py-2.5 text-sm font-semibold text-black hover:bg-incogni-accent-soft transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Pay ${PLAN_AMOUNT[plan]} — Gift {plan === "pro" ? "Pro" : "Max"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
