"use client";

import { useState } from "react";
import { Gift, Loader2, Check, Sparkles, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

export default function GiftPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ plan: string; fromName: string } | null>(null);
  const [error, setError] = useState("");

  const redeem = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/gifts/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-koda-bg">
        <Loader2 className="h-8 w-8 animate-spin text-koda-muted" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-koda-bg gap-4">
        <Gift className="h-12 w-12 text-koda-muted" />
        <p className="text-sm text-koda-muted">Sign in to redeem your gift.</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-lg bg-koda-accent px-4 py-2 text-sm font-semibold text-black"
        >
          Go home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-koda-bg">
      <div className="mx-auto max-w-md px-4 py-16">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1.5 text-xs text-koda-muted hover:text-koda-text mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Koda AI
        </button>

        {result ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="text-xl font-semibold text-koda-text">Gift redeemed!</h1>
            <p className="text-sm text-koda-muted">
              You&apos;ve been upgraded to <strong className="text-koda-accent">{result.plan === "pro" ? "KodaAI Pro" : "KodaAI Max"}</strong>.
            </p>
            <p className="text-xs text-koda-muted">
              Gift from <strong>{result.fromName}</strong>
            </p>
            <div className="flex items-center justify-center gap-2 rounded-lg bg-koda-accent/10 px-4 py-3">
              <Sparkles className="h-5 w-5 text-koda-accent" />
              <span className="text-sm text-koda-text">
                Enjoy your {result.plan === "pro" ? "Pro" : "Max"} features!
              </span>
            </div>
            <button
              onClick={() => router.push("/")}
              className="rounded-lg bg-koda-accent px-6 py-2.5 text-sm font-semibold text-black hover:bg-koda-accent-soft transition-colors"
            >
              Start chatting
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Gift className="mx-auto h-10 w-10 text-koda-accent" />
              <h1 className="text-xl font-semibold text-koda-text">Redeem a gift</h1>
              <p className="text-sm text-koda-muted">
                Enter your gift code to unlock KodaAI Pro or Max.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="KODA-XXXXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-koda-border bg-koda-surface-2 px-4 py-3 text-center text-lg font-mono font-bold tracking-wider text-koda-text placeholder:text-koda-muted/50 focus:outline-none focus:border-koda-accent focus:ring-1 focus:ring-koda-accent/30 uppercase"
              />
              <button
                disabled={busy || !code.trim()}
                onClick={redeem}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-koda-accent px-4 py-3 text-sm font-semibold text-black hover:bg-koda-accent-soft transition-colors disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                Redeem
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 text-center">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
