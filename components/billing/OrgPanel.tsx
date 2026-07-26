"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Check, X, Users, Shield, Ban,
  Building2, AlertTriangle, Crown, CreditCard, Activity,
} from "lucide-react";
import type { Org, OrgRequest } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

type OrgTab = "members" | "billing" | "security" | "usage";

export function OrgPanel() {
  const { user } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [showPlanPicker, setShowPlanPicker] = useState<OrgRequest | null>(null);
  const [pickingPlan, setPickingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<OrgTab>("members");

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
      approveDirectly(req.id);
    } else {
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
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-incogni-muted" /></div>;
  }

  if (!org) {
    return (
      <div className="space-y-4 rounded-2xl border border-purple-500/30 bg-purple-500/[0.04] p-6">
        <h3 className="text-sm font-semibold text-purple-200">Create your organization</h3>
        <p className="text-xs text-incogni-muted">
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
              className="w-full rounded-lg border border-incogni-border bg-incogni-surface px-3 py-2 text-sm text-incogni-text placeholder:text-incogni-muted focus:outline-none focus:border-incogni-accent"
            />
            <button
              disabled={creating || !orgName.trim()}
              onClick={createOrg}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              Create organization
            </button>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-incogni-border pb-4">
        <div>
          <h3 className="text-xl font-bold text-incogni-text">{org.name}</h3>
          <span className="text-xs font-mono text-incogni-muted mt-1 block">ID: {org.id}</span>
        </div>
        <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-yellow-500">
          Ultra
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-incogni-border pb-px">
        <button
          onClick={() => setActiveTab("members")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "members"
              ? "border-incogni-accent text-incogni-text"
              : "border-transparent text-incogni-muted hover:text-incogni-text hover:border-incogni-border"
          )}
        >
          <Users className="h-4 w-4" /> Members
        </button>
        <button
          onClick={() => setActiveTab("billing")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "billing"
              ? "border-incogni-accent text-incogni-text"
              : "border-transparent text-incogni-muted hover:text-incogni-text hover:border-incogni-border"
          )}
        >
          <CreditCard className="h-4 w-4" /> Billing
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "security"
              ? "border-incogni-accent text-incogni-text"
              : "border-transparent text-incogni-muted hover:text-incogni-text hover:border-incogni-border"
          )}
        >
          <Shield className="h-4 w-4" /> Security
        </button>
        <button
          onClick={() => setActiveTab("usage")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "usage"
              ? "border-incogni-accent text-incogni-text"
              : "border-transparent text-incogni-muted hover:text-incogni-text hover:border-incogni-border"
          )}
        >
          <Activity className="h-4 w-4" /> Usage
        </button>
      </div>

      {activeTab === "members" && (
        <div className="space-y-6">
          {org.requests.filter((r) => r.status === "pending").length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-incogni-muted uppercase tracking-wider">
                Pending requests ({org.requests.filter((r) => r.status === "pending").length})
              </h4>
              <div className="space-y-2">
                {org.requests.filter((r) => r.status === "pending").map((req) => (
                  <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-incogni-border bg-incogni-surface-2 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-incogni-text">{req.name}</p>
                      <p className="text-xs text-incogni-muted">{req.email}</p>
                      {(!req.plan || req.plan === "free") && (
                        <p className="mt-1 text-[11px] text-amber-400 font-medium flex items-center gap-1">
                          <Crown className="h-3 w-3" /> Free plan — admin must pay for seat
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveClick(req)}
                        disabled={approvingId === req.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
                      >
                        {approvingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        {req.plan && req.plan !== "free" ? "Approve" : "Assign seat"}
                      </button>
                      <button
                        onClick={() => rejectRequest(req.id)}
                        disabled={approvingId === req.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-incogni-text flex items-center gap-2">
                <Users className="h-4 w-4 text-incogni-muted" />
                Active Members ({org.members.length})
              </h4>
              <button
                onClick={() => navigator.clipboard.writeText(org.id)}
                className="text-xs text-incogni-accent hover:underline font-medium"
              >
                Copy Invite ID
              </button>
            </div>
            
            <div className="space-y-1">
              {org.members.map((m) => (
                <div
                  key={m.userId}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 transition-colors",
                    m.status === "disabled" ? "opacity-50" : "bg-incogni-surface-2 hover:bg-incogni-surface-3"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-incogni-accent/20 text-sm font-semibold text-incogni-accent">
                      {m.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-incogni-text flex items-center gap-2">
                        {m.name}
                        {m.role === "admin" && (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        )}
                        {m.status === "disabled" && (
                          <span className="inline-flex rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                            Disabled
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-incogni-muted mt-0.5">{m.email}</p>
                    </div>
                  </div>
                  
                  {m.userId !== org.ownerId && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateMemberStatus(m.userId, m.status === "disabled" ? "excluded" : "disabled")}
                        className="rounded-lg p-2 text-incogni-muted hover:bg-amber-500/10 hover:text-amber-400 transition-colors"
                        title={m.status === "disabled" ? "Re-enable" : "Disable"}
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => updateMemberStatus(m.userId, "excluded")}
                        className="rounded-lg p-2 text-incogni-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Remove from org"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "billing" && (
        <div className="rounded-xl border border-incogni-border bg-incogni-surface-2 p-6 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-incogni-muted mb-3" />
          <h4 className="text-sm font-semibold text-incogni-text">Centralized Billing</h4>
          <p className="mt-1 text-xs text-incogni-muted max-w-sm mx-auto">
            Manage your organization&apos;s subscription, payment methods, and invoices from this dashboard. (Coming soon)
          </p>
        </div>
      )}

      {activeTab === "security" && (
        <div className="rounded-xl border border-incogni-border bg-incogni-surface-2 p-6 text-center">
          <Shield className="mx-auto h-8 w-8 text-incogni-muted mb-3" />
          <h4 className="text-sm font-semibold text-incogni-text">Security & SSO</h4>
          <p className="mt-1 text-xs text-incogni-muted max-w-sm mx-auto">
            Configure SAML/SSO, domain verification, and enforced security policies for your team. (Coming soon)
          </p>
        </div>
      )}

      {activeTab === "usage" && (
        <div className="rounded-xl border border-incogni-border bg-incogni-surface-2 p-6 text-center">
          <Activity className="mx-auto h-8 w-8 text-incogni-muted mb-3" />
          <h4 className="text-sm font-semibold text-incogni-text">Usage Analytics</h4>
          <p className="mt-1 text-xs text-incogni-muted max-w-sm mx-auto">
            View aggregated usage data across your organization to track compute and API spend. (Coming soon)
          </p>
        </div>
      )}

      {/* Plan picker modal */}
      {showPlanPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-incogni-border bg-incogni-surface p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-incogni-text mb-1">Assign a seat</h3>
            <p className="text-sm text-incogni-muted mb-6">
              {showPlanPicker.name} is on Free. Pick a plan to purchase for them:
            </p>
            <div className="space-y-3">
              <button
                onClick={() => payForSeat("pro")}
                disabled={pickingPlan}
                className="w-full flex items-center justify-between rounded-xl border border-incogni-border bg-incogni-surface-2 px-5 py-4 text-left hover:border-incogni-accent transition-colors disabled:opacity-40"
              >
                <div>
                  <p className="text-base font-bold text-incogni-text flex items-center gap-2">
                    <Crown className="h-4 w-4 text-sky-400" /> Pro
                  </p>
                  <p className="text-xs text-incogni-muted mt-0.5">Full agentic capabilities</p>
                </div>
                <span className="text-base font-bold text-incogni-text">$200<span className="text-xs font-normal text-incogni-muted">/mo</span></span>
              </button>
              <button
                onClick={() => payForSeat("max")}
                disabled={pickingPlan}
                className="w-full flex items-center justify-between rounded-xl border border-incogni-border bg-incogni-surface-2 px-5 py-4 text-left hover:border-incogni-accent transition-colors disabled:opacity-40"
              >
                <div>
                  <p className="text-base font-bold text-incogni-text flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-400" /> Max
                  </p>
                  <p className="text-xs text-incogni-muted mt-0.5">Maximum depth & priority</p>
                </div>
                <span className="text-base font-bold text-incogni-text">$600<span className="text-xs font-normal text-incogni-muted">/mo</span></span>
              </button>
            </div>
            {pickingPlan && (
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-incogni-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Opening secure payment…
              </div>
            )}
            <button
              onClick={() => { setShowPlanPicker(null); setError(""); }}
              disabled={pickingPlan}
              className="mt-6 w-full rounded-lg px-4 py-2 text-sm font-semibold text-incogni-muted hover:text-incogni-text hover:bg-incogni-surface-2 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
