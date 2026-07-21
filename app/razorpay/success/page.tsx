"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function RazorpaySuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-vectosilo-bg">
          <Loader2 className="h-6 w-6 animate-spin text-vectosilo-accent" />
        </div>
      }
    >
      <RazorpaySuccessInner />
    </Suspense>
  );
}

function RazorpaySuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const sessionId = orderId || undefined;
  const { refresh } = useAuth();

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [plan, setPlan] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [giftCode, setGiftCode] = useState<string | null>(null);
  const [targetName, setTargetName] = useState<string | null>(null);
  const [targetPlan, setTargetPlan] = useState<string | null>(null);
  const done = useRef(false);
  const isCredits = searchParams.get("kind") === "credits";
  const isGift = searchParams.get("kind") === "gift";
  const isOrgSeat = searchParams.get("kind") === "org-seat";

  useEffect(() => {
    if (!sessionId || done.current) return;
    done.current = true;

    fetch("/api/razorpay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed.");
        if (data.kind === "credits") setCredits(data.credits ?? null);
        else if (data.kind === "gift") setGiftCode(data.gift?.code ?? null);
        else if (data.kind === "org-seat") {
          setTargetName(data.targetUser?.name ?? null);
          setTargetPlan(data.targetUser?.plan ?? null);
        } else setPlan(data.user?.plan ?? null);
        if (data.kind !== "gift" && data.kind !== "org-seat") await refresh();
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [sessionId, refresh]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-vectosilo-bg px-4 text-center">
      {status === "verifying" && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-vectosilo-accent" />
          <p className="text-vectosilo-text">
            {isCredits ? "Adding your credits…" : isOrgSeat ? "Assigning seat…" : "Activating your plan…"}
          </p>
        </div>
      )}

      {status === "success" && isCredits && (
        <div className="flex flex-col items-center gap-4">
          <CheckCircle className="h-12 w-12 text-green-400" />
          <h1 className="text-2xl font-bold text-vectosilo-text">Credits added!</h1>
          <p className="max-w-sm text-vectosilo-muted">
            {credits !== null
              ? `Your API credit balance is now $${(credits / 100).toFixed(2)}.`
              : "Your API credits are now available."} Credits never expire.
          </p>
          <button
            onClick={() => router.push("/developers")}
            className="mt-2 rounded-xl bg-vectosilo-accent px-6 py-2.5 text-sm font-semibold text-black hover:bg-vectosilo-accent-soft"
          >
            Back to Developers
          </button>
        </div>
      )}

      {status === "success" && isGift && giftCode && (
        <div className="flex flex-col items-center gap-4">
          <CheckCircle className="h-12 w-12 text-green-400" />
          <h1 className="text-2xl font-bold text-vectosilo-text">Gift purchased!</h1>
          <p className="max-w-sm text-vectosilo-muted">
            Your gift has been purchased. Share the code below with the recipient.
          </p>
          <div className="rounded-xl bg-vectosilo-surface-2 px-6 py-4">
            <p className="text-xs text-vectosilo-muted mb-1">Gift code</p>
            <p className="text-2xl font-mono font-bold text-vectosilo-accent select-all tracking-wider">
              {giftCode}
            </p>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(giftCode); }}
            className="rounded-lg border border-vectosilo-border px-4 py-2 text-sm text-vectosilo-text hover:bg-vectosilo-surface-2"
          >
            Copy code
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl bg-vectosilo-accent px-6 py-2.5 text-sm font-semibold text-black hover:bg-vectosilo-accent-soft"
          >
            Back to VectoSilo AI
          </button>
        </div>
      )}

      {status === "success" && isOrgSeat && (
        <div className="flex flex-col items-center gap-4">
          <CheckCircle className="h-12 w-12 text-green-400" />
          <h1 className="text-2xl font-bold text-vectosilo-text">Seat assigned!</h1>
          <p className="max-w-sm text-vectosilo-muted">
            {targetName ? <>{targetName} is now on <span className="font-semibold text-vectosilo-text uppercase">{targetPlan}</span> &mdash; paid by you.</> : "Member added to your organization."}
          </p>
          <button
            onClick={() => router.push("/pricing")}
            className="mt-2 rounded-xl bg-vectosilo-accent px-6 py-2.5 text-sm font-semibold text-black hover:bg-vectosilo-accent-soft"
          >
            Back to organization
          </button>
        </div>
      )}

      {status === "success" && !isCredits && !isGift && !isOrgSeat && (
        <div className="flex flex-col items-center gap-4">
          <CheckCircle className="h-12 w-12 text-green-400" />
          <h1 className="text-2xl font-bold text-vectosilo-text">
            You&apos;re on {plan ? plan.toUpperCase() : "your new plan"}!
          </h1>
          <p className="max-w-sm text-vectosilo-muted">
            Your upgrade is active. Enjoy all the new features — welcome to the next level.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-2 rounded-xl bg-vectosilo-accent px-6 py-2.5 text-sm font-semibold text-black hover:bg-vectosilo-accent-soft"
          >
            Start exploring
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-10 w-10 text-amber-400" />
          <h1 className="text-xl font-bold text-vectosilo-text">Something went wrong</h1>
          <p className="max-w-sm text-vectosilo-muted">
            Your payment may have gone through but we couldn&apos;t confirm it automatically.
            Please refresh your account or contact support.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-2 rounded-xl border border-vectosilo-border px-5 py-2 text-sm text-vectosilo-muted hover:bg-vectosilo-surface-2"
          >
            Go home
          </button>
        </div>
      )}
    </div>
  );
}
