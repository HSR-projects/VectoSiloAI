"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Check, X, Users, UserPlus, Shield, Ban,
  ArrowLeft, Building2, AlertTriangle, Crown, ShoppingCart,
} from "lucide-react";
import type { Org, OrgMember, OrgRequest } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

interface OrgPanelProps {
  onBack: () => void;
}

export function OrgPanel({ onBack }: OrgPanelProps) {
  const { user } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [showPlanPicker, setShowPlanPicker] = useState<OrgRequest | null>(null);
  const [pickingPlan, setPickingPlan] = useState(false);

  const loadOrg = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orgs");
      const data = await res.json();
      if (data.org) setOrg(data.org);
      else setOrg(null);
    } catch { setOrg(null); }
    setLoading(false);
  };

  useEffect(() => { loadOrg(); }, []);

  const createOrg = async () => {
    if (!orgName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrg(data.org);
    } catch (e) { setError((e as Error).message); }
    setCreating(false);
  };

  const updateMemberStatus = async (userId: string, status: "disabled" | "excluded") => {
    try {
      const res = await fetch("/api/orgs/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      if (res.ok) loadOrg();
    } catch {}
  };

  const approveDirectly = async (requestId: string) => {
    setApprovingId(requestId);
    try {
      const res = await fetch("/api/orgs/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, approve: true, plan: undefined }),
      });
      if (res.ok) loadOrg();
    } catch {}
    setApprovingId(null);
  };

  const rejectRequest = async (requestId: string) => {
    setApprovingId(requestId);
    try {
      const res = await fetch("/api/orgs/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, approve: false }),
      });
      if (res.ok) loadOrg();
    } catch {}
    setApprovingId(null);
  };

  const handleApproveClick = (req: OrgRequest) => {
    if (req.plan && req.plan !== "free") {
      // Already has a paid plan — approve directly
      approveDirectly(req.id);
    } else {
      // Needs payment — show plan picker
      setShowPlanPicker(req);
    }
  };

  const payForSeat = async (plan: "pro" | "max") => {
    if (!showPlanPicker) return;
    setPickingPlan(true);
    try {
      const res = await fetch("/api/razorpay/org-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: showPlanPicker.userId, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const params = new URLSearchParams({
        order_id: data.id,
        key: data.key,
        amount: String(data.amount),
        currency: data.currency || "USD",
        name: data.name || "Org seat",
        description: data.description || "",
        email: data.prefill?.email || "",
        callback: `${window.location.origin}/razorpay/success?order_id=${data.id}&kind=org-seat&targetUserId=${showPlanPicker.userId}&plan=${plan}`,
      });
      window.location.href = `/razorpay/checkout?${params}`;
    } catch (e) {
      setError((e as Error).message);
      setPickingPlan(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-koda-muted" /></div>;
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-koda-muted hover:text-koda-text transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to plans
      </button>

      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-purple-400" />
        <div>
          <h2 className="text-lg font-semibold text-koda-text">Organization</h2>
          <p className="text-xs text-koda-muted">Manage your Ultra org workspace</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
      )}

      {!org ? (
        <div className="space-y-4 rounded-2xl border border-purple-500/30 bg-purple-500/[0.04] p-6">
          <h3 className="text-sm font-semibold text-purple-200">Create your organization</h3>
          <p className="text-xs text-koda-muted">
            Ultra plan required. Create an org to manage team members, share conversations, and more.
          </p>
          {user?.plan !== "ultra" ? (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Upgrade to Ultra to create an organization.
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Organization name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-lg border border-koda-border bg-koda-surface px-3 py-2 text-sm text-koda-text placeholder:text-koda-muted focus:outline-none focus:border-koda-accent"
              />
              <button
                disabled={creating || !orgName.trim()}
                onClick={createOrg}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                Create organization
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-koda-text">{org.name}</h3>
            <span className="text-[10px] uppercase tracking-wider text-purple-400">Ultra</span>
          </div>

          {/* Pending requests */}
          {org.requests.filter((r) => r.status === "pending").length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-koda-muted uppercase tracking-wider">
                Pending requests ({org.requests.filter((r) => r.status === "pending").length})
              </h4>
              <div className="space-y-2">
                {org.requests.filter((r) => r.status === "pending").map((req) => (
                  <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-koda-border bg-koda-surface-2 px-3 py-2">
                    <div>
                      <p className="text-sm text-koda-text">{req.name}</p>
                      <p className="text-xs text-koda-muted">{req.email}</p>
                      {(!req.plan || req.plan === "free") && (
                        <p className="mt-0.5 text-[10px] text-amber-400">Free plan — admin must pay for seat</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveClick(req)}
                        disabled={approvingId === req.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-300 hover:bg-green-500/30 transition-colors disabled:opacity-40"
                      >
                        {approvingId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        {req.plan && req.plan !== "free" ? "Approve" : "Assign seat"}
                      </button>
                      <button
                        onClick={() => rejectRequest(req.id)}
                        disabled={approvingId === req.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-40"
                      >
                        <X className="h-3 w-3" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plan picker modal */}
          {showPlanPicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
              <div className="w-full max-w-sm rounded-2xl border border-koda-border bg-koda-surface p-6 shadow-2xl">
                <h3 className="text-base font-semibold text-koda-text mb-1">Assign a seat</h3>
                <p className="text-xs text-koda-muted mb-4">
                  {showPlanPicker.name} is on Free. Pick a plan to purchase for them:
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => payForSeat("pro")}
                    disabled={pickingPlan}
                    className="w-full flex items-center justify-between rounded-xl border border-koda-border bg-koda-surface-2 px-4 py-3 text-left hover:border-koda-accent/40 transition-colors disabled:opacity-40"
                  >
                    <div>
                      <p className="text-sm font-semibold text-koda-text flex items-center gap-1.5">
                        <Crown className="h-3.5 w-3.5 text-sky-400" /> Pro
                      </p>
                      <p className="text-xs text-koda-muted">Full agentic capabilities</p>
                    </div>
                    <span className="text-sm font-semibold text-koda-text">$200<span className="text-xs text-koda-muted">/mo</span></span>
                  </button>
                  <button
                    onClick={() => payForSeat("max")}
                    disabled={pickingPlan}
                    className="w-full flex items-center justify-between rounded-xl border border-koda-border bg-koda-surface-2 px-4 py-3 text-left hover:border-koda-accent/40 transition-colors disabled:opacity-40"
                  >
                    <div>
                      <p className="text-sm font-semibold text-koda-text flex items-center gap-1.5">
                        <Crown className="h-3.5 w-3.5 text-amber-400" /> Max
                      </p>
                      <p className="text-xs text-koda-muted">Maximum depth & priority</p>
                    </div>
                    <span className="text-sm font-semibold text-koda-text">$600<span className="text-xs text-koda-muted">/mo</span></span>
                  </button>
                </div>
                {pickingPlan && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-koda-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Opening payment…
                  </div>
                )}
                <button
                  onClick={() => { setShowPlanPicker(null); setError(""); }}
                  disabled={pickingPlan}
                  className="mt-4 w-full rounded-lg border border-koda-border px-3 py-2 text-xs text-koda-muted hover:bg-koda-surface-2 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Members list */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-koda-muted uppercase tracking-wider flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Members ({org.members.length})
            </h4>
            <div className="space-y-1">
              {org.members.map((m) => (
                <div
                  key={m.userId}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2",
                    m.status === "disabled" ? "opacity-50" : "bg-koda-surface-2"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-koda-accent/20 text-xs font-semibold text-koda-accent">
                      {m.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-koda-text">{m.name}</p>
                      <p className="text-xs text-koda-muted">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role === "admin" && (
                      <span className="flex items-center gap-1 text-xs text-purple-400">
                        <Shield className="h-3 w-3" /> Admin
                      </span>
                    )}
                    {m.status === "disabled" && (
                      <span className="text-xs text-amber-400">Disabled</span>
                    )}
                    {m.userId !== org.ownerId && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateMemberStatus(m.userId, m.status === "disabled" ? "excluded" : "disabled")}
                          className="rounded p-1 text-koda-muted hover:text-amber-400 transition-colors"
                          title={m.status === "disabled" ? "Remove from org" : "Disable"}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => updateMemberStatus(m.userId, "excluded")}
                          className="rounded p-1 text-koda-muted hover:text-red-400 transition-colors"
                          title="Remove from org"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Join link section */}
          <div className="rounded-lg border border-dashed border-koda-border p-4">
            <h4 className="text-xs font-semibold text-koda-muted uppercase tracking-wider mb-2">Invite people</h4>
            <p className="text-xs text-koda-muted mb-3">
              Share your org ID so members can request to join:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-koda-surface px-2 py-1.5 text-xs text-koda-accent font-mono select-all">
                {org.id}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(org.id)}
                className="rounded-lg border border-koda-border px-2.5 py-1.5 text-xs text-koda-text hover:bg-koda-surface-2 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
