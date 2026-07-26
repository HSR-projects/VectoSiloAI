"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader2, ShieldCheck, AlertTriangle, UserRound, Mail } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AuthorizePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-incogni-bg">
          <Loader2 className="h-6 w-6 animate-spin text-incogni-accent" />
        </div>
      }
    >
      <AuthorizeInner />
    </Suspense>
  );
}

interface ConsentInfo {
  client: { clientId: string; name: string; logoUrl?: string };
  scope: string;
  redirectHost: string;
}

const SCOPE_LABELS: Record<string, { label: string; icon: typeof UserRound }> = {
  profile: { label: "Your name and profile", icon: UserRound },
  email: { label: "Your email address", icon: Mail },
  openid: { label: "Your basic identity", icon: ShieldCheck },
};

function AuthorizeInner() {
  const params = useSearchParams();
  const { user } = useAuth();

  const [info, setInfo] = useState<ConsentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";

  useEffect(() => {
    const qs = params.toString();
    fetch(`/api/oauth/authorize?${qs}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid authorization request.");
        setInfo(data);
      })
      .catch((e) => setError(e.message));
  }, [params]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/oauth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          redirectUri,
          scope: params.get("scope") ?? "",
          state: params.get("state") ?? "",
          codeChallenge: params.get("code_challenge") ?? "",
          codeChallengeMethod: params.get("code_challenge_method") ?? "",
          approve,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authorization failed.");
      if (data.redirect) window.location.href = data.redirect;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  if (error) {
    return (
      <Centered>
        <AlertTriangle className="h-10 w-10 text-amber-400" />
        <h1 className="text-lg font-semibold text-incogni-text">Can&apos;t authorize</h1>
        <p className="max-w-sm text-sm text-incogni-muted">{error}</p>
      </Centered>
    );
  }

  if (!info) {
    return (
      <Centered>
        <Loader2 className="h-6 w-6 animate-spin text-incogni-accent" />
      </Centered>
    );
  }

  const scopes = info.scope.split(" ").filter(Boolean);

  return (
    <div className="incogni-hero-glow flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-incogni-border bg-incogni-surface/70 p-6 backdrop-blur-xl">
        {/* Connection visual */}
        <div className="mb-5 flex items-center justify-center gap-3">
          {info.client.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.client.logoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-incogni-surface-2 text-lg font-semibold text-incogni-text">
              {info.client.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-green-400">
            <ShieldCheck className="h-3.5 w-3.5" />
          </span>
          <Image src="/incogni-logo.svg" alt="IncogniAI" width={48} height={48} />
        </div>

        <h1 className="text-center text-xl font-semibold text-incogni-text">
          Authorize {info.client.name}
        </h1>
        <p className="mt-1 text-center text-sm text-incogni-muted">
          <span className="font-medium text-incogni-text">{info.client.name}</span> wants to access your
          IncogniAI account{user?.email ? ` (${user.email})` : ""}.
        </p>

        <div className="mt-5 space-y-2 rounded-xl border border-incogni-border bg-incogni-bg/50 p-3">
          {scopes.map((s) => {
            const def = SCOPE_LABELS[s] ?? { label: s, icon: ShieldCheck };
            const Icon = def.icon;
            return (
              <div key={s} className="flex items-center gap-3 text-sm text-incogni-text">
                <Icon className="h-4 w-4 shrink-0 text-incogni-accent" />
                {def.label}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => decide(false)}
            disabled={busy}
            className="flex-1 rounded-lg border border-incogni-border bg-incogni-bg px-4 py-2.5 text-sm font-medium text-incogni-text transition-colors hover:bg-incogni-surface-2 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={() => decide(true)}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-incogni-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-incogni-accent-soft disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Authorize
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-incogni-muted">
          Authorizing will redirect to
          <br />
          <span className="font-medium text-incogni-text">{info.redirectHost}</span>
        </p>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-incogni-bg px-4 text-center">
      {children}
    </div>
  );
}
