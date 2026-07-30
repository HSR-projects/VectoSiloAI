"use client";

import { useState } from "react";
import { ShieldCheck, UserPlus, AlertCircle, Copy, Check } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

export function ParentalControlsPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [childEmail, setChildEmail] = useState("");
  const [childDob, setChildDob] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const inviteLink = `https://chat.hsrprojects.org/register?parentId=${user?.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Basic placeholder for the backend invite/create logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      setChildEmail("");
      setChildDob("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to add child");
    } finally {
      setLoading(false);
    }
  };

  if (user?.isChild) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-foreground">Parental Controls</h3>
          <p className="text-sm text-muted-foreground">You are currently using a child account managed by your parent.</p>
        </div>
        <div className="p-4 bg-muted/30 border rounded-lg flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            Your account is restricted. Content is strictly filtered and certain topics are unavailable in accordance with family safety guidelines.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">Parental Controls</h3>
        <p className="text-sm text-muted-foreground">Manage and protect your children&apos;s accounts on IncogniAI.</p>
      </div>

      <div className="p-4 bg-card border rounded-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold">Invite your child</h4>
            <p className="text-sm text-muted-foreground">Give them this special link to register a protected account.</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteLink}
            className="flex-1 bg-muted border-none rounded-md px-3 py-2 text-sm text-muted-foreground"
          />
          <Button variant="secondary" onClick={handleCopy} className="shrink-0 gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleCreateChild} className="p-4 bg-card border rounded-lg space-y-4">
        <h4 className="font-semibold">Or pre-register them</h4>
        <p className="text-sm text-muted-foreground">You can set up an account on their behalf. If they are under 17, safety filters are strictly enforced.</p>
        
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <input
            required
            type="email"
            placeholder="Child's Email"
            value={childEmail}
            onChange={(e) => setChildEmail(e.target.value)}
            className="w-full bg-background border rounded-md px-3 py-2 text-sm"
          />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Date of Birth</label>
            <input
              required
              type="date"
              value={childDob}
              onChange={(e) => setChildDob(e.target.value)}
              className="w-full bg-background border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Adding..." : success ? "Added!" : "Add Child Account"}
        </Button>
      </form>
    </div>
  );
}
