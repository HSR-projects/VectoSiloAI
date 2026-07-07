"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Terminal, ShieldCheck, Loader2, CheckCircle2, XCircle, Lock, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";

type State = "loading" | "ready" | "authorizing" | "done" | "error" | "denied" | "upgrade";

export default function KoderAuthorizePage() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const callbackState = searchParams.get("state") || "";
  const [state, setState] = useState<State>("loading");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) setState("ready");
  }, [authLoading]);

  async function authorize() {
    setState("authorizing");
    try {
      const res = await fetch("/api/koder/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: callbackState }),
      });
      const d = await res.json() as { code?: string; error?: string; plan?: string };
      if (!res.ok) {
        if (res.status === 403) { setState("upgrade"); return; }
        throw new Error(d.error || "Connection failed.");
      }
      setCode(d.code!);
      setState("done");
    } catch (e) {
      setError((e as Error).message);
      setState("error");
    }
  }

  function deny() {
    setState("denied");
  }

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <Terminal className="h-12 w-12 text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-bold">Sign in required</h1>
          <p className="text-gray-400">You need a KodaAI account to connect the CLI.</p>
          <button
            onClick={() => {
              const redirect = `/koder/authorize?state=${encodeURIComponent(callbackState)}`;
              router.push(`/?redirect=${encodeURIComponent(redirect)}`);
            }}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-semibold transition-colors"
          >
            Sign in to KodaAI
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Terminal className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Connect to KodaAI</h1>
          <p className="text-gray-400 text-sm">
            The Koder CLI will use your KodaAI account for coding requests.
          </p>
        </div>

        {/* User card */}
        {user && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: user.avatarColor || "#6366f1" }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user.email} · {user.plan} plan</p>
            </div>
          </div>
        )}

        {/* Upgrade gate */}
        {state === "upgrade" && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 space-y-4 text-center">
            <Lock className="h-10 w-10 text-amber-400 mx-auto" />
            <div>
              <p className="font-bold text-amber-400">Pro or Max required</p>
              <p className="text-sm text-gray-400 mt-1">
                Koder is not available on the Free plan. Upgrade to Pro or Max to use Koder.
              </p>
            </div>
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 w-full py-3 bg-amber-500 hover:bg-amber-400 rounded-xl font-semibold text-black transition-colors"
            >
              Upgrade plan <ArrowUpRight className="h-4 w-4" />
            </Link>
            <button onClick={() => setState("ready")} className="text-sm text-gray-500 hover:text-gray-300">
              ← Back
            </button>
          </div>
        )}

        {/* Permissions */}
        {(state === "loading" || state === "ready" || state === "authorizing") && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-300">Koder will be able to:</p>
            {[
              "Send AI requests on your behalf using your subscription",
              "80 requests per 5-hour window, auto-refills",
              "Access all KodaAI models for coding assistance",
            ].map((p) => (
              <div key={p} className="flex items-start gap-2 text-sm text-gray-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>{p}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-white/10 text-xs text-gray-500">
              Koder cannot read your chat history, billing info, or personal data.
            </div>
          </div>
        )}

        {/* Actions */}
        {state === "loading" && (
          <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        )}

        {state === "ready" && (
          <div className="flex gap-3">
            <button onClick={deny} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-semibold">
              Deny
            </button>
            <button onClick={authorize} className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors">
              Connect to KodaAI
            </button>
          </div>
        )}

        {state === "authorizing" && (
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" /><span>Authorizing…</span>
          </div>
        )}

        {state === "done" && (
          <div className="text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <p className="font-semibold text-emerald-400">Connected to KodaAI.</p>
            <p className="text-sm text-gray-400">You can close this tab and return to your terminal.</p>
          </div>
        )}

        {state === "denied" && (
          <div className="text-center space-y-3">
            <XCircle className="h-12 w-12 text-red-400 mx-auto" />
            <p className="font-semibold text-red-400">Access denied</p>
            <p className="text-sm text-gray-400">You denied Koder access. Close this tab.</p>
          </div>
        )}

        {state === "error" && (
          <div className="text-center space-y-3">
            <XCircle className="h-12 w-12 text-red-400 mx-auto" />
            <p className="font-semibold text-red-400">Error</p>
            <p className="text-sm text-gray-400">{error}</p>
            <button onClick={() => setState("ready")} className="text-sm text-emerald-400 hover:underline">Try again</button>
          </div>
        )}

        <p className="text-center text-xs text-gray-600">
          Powered by <span className="text-gray-400">KodaAI</span> · chat.hsrprojects.org
        </p>
      </div>
    </div>
  );
}
