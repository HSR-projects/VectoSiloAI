"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, AlertTriangle, Lock } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-koda-bg">
          <Loader2 className="h-6 w-6 animate-spin text-koda-accent" />
        </div>
      }
    >
      <ResetInner />
    </Suspense>
  );
}

function ResetInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState<"form" | "success" | "error">(
    token ? "form" : "error"
  );
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setMessage("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setMessage("Passwords don't match."); return; }

    setBusy(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Reset failed.");
      setStep("success");
      setTimeout(() => router.push("/"), 1400);
    } catch (e) {
      setBusy(false);
      setMessage((e as Error).message);
    }
  };

  return (
    <div className="koda-hero-glow flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      {step === "form" && (
        <div className="w-full max-w-sm rounded-2xl border border-koda-border bg-koda-surface/70 p-6 text-left backdrop-blur-xl">
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-koda-accent/15">
              <Lock className="h-6 w-6 text-koda-accent" />
            </div>
            <h1 className="text-xl font-semibold text-koda-text">Set new password</h1>
            <p className="mt-1 text-sm text-koda-muted">Enter your new password below.</p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              type="password"
              placeholder="New password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-koda-border bg-koda-bg px-3 py-2.5 text-sm text-koda-text placeholder:text-koda-muted/60 focus:border-koda-accent/50 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-koda-border bg-koda-bg px-3 py-2.5 text-sm text-koda-text placeholder:text-koda-muted/60 focus:border-koda-accent/50 focus:outline-none"
            />

            {message && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{message}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-koda-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-koda-accent-soft disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Reset password
            </button>
          </form>

          <button
            onClick={() => router.push("/")}
            className="mt-4 w-full text-center text-sm text-koda-muted hover:text-koda-text"
          >
            Back to sign in
          </button>
        </div>
      )}

      {step === "success" && (
        <div className="flex flex-col items-center gap-4">
          <CheckCircle className="h-12 w-12 text-green-400" />
          <h1 className="text-2xl font-bold text-koda-text">Password changed!</h1>
          <p className="max-w-sm text-koda-muted">Taking you in…</p>
        </div>
      )}

      {step === "error" && (
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-10 w-10 text-amber-400" />
          <h1 className="text-xl font-bold text-koda-text">Invalid link</h1>
          <p className="max-w-sm text-koda-muted">
            {message ?? "This reset link is invalid or has expired."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-2 rounded-xl bg-koda-accent px-6 py-2.5 text-sm font-semibold text-black hover:bg-koda-accent-soft"
          >
            Go to sign in
          </button>
        </div>
      )}
    </div>
  );
}
