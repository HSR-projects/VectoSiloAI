"use client";

import { useState } from "react";
import { Loader2, Check, Building2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface JoinOrgModalProps {
  onClose: () => void;
}

export function JoinOrgModal({ onClose }: JoinOrgModalProps) {
  const [orgId, setOrgId] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const requestJoin = async () => {
    if (!orgId.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/orgs/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: orgId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-400" />
            Join an organization
          </DialogTitle>
          <DialogDescription>
            Enter the organization ID shared by your admin to request access.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-4 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-6 w-6 text-green-400" />
            </div>
            <p className="text-sm text-incogni-text">Request sent!</p>
            <p className="text-xs text-incogni-muted">
              Your organization admin will review your request.
            </p>
            <button
              onClick={onClose}
              className="rounded-lg bg-incogni-accent px-4 py-2 text-sm font-semibold text-black"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <input
              type="text"
              placeholder="Paste org ID here..."
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full rounded-lg border border-incogni-border bg-incogni-surface px-3 py-2 text-sm text-incogni-text placeholder:text-incogni-muted focus:outline-none focus:border-incogni-accent font-mono"
            />
            {error && (
              <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
            )}
            <button
              disabled={busy || !orgId.trim()}
              onClick={requestJoin}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              Request to join
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
