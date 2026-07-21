"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useVectoSiloStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Backward-compatible wrapper — now redirects to the full-screen /pricing page.
 * The old dialog-based PricingModal is replaced by the full page at /app/pricing/page.tsx.
 */
export function PricingModal() {
  // No-op — the global mount point still exists but does nothing.
  // Actual navigation happens in PlanBadge and AccountMenu.
  return null;
}

/** Header chip that shows the current plan and navigates to /pricing. */
export function PlanBadge() {
  const router = useRouter();
  const { user } = useAuth();
  const plan = user?.plan ?? "free";
  const isPaid = plan !== "free";

  return (
    <button
      onClick={() => router.push("/pricing")}
      aria-label="Plans & billing"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
        isPaid
          ? "border-vectosilo-accent/50 bg-vectosilo-accent/15 text-vectosilo-accent-soft"
          : "border-vectosilo-border bg-vectosilo-surface text-vectosilo-text hover:bg-vectosilo-surface-2"
      )}
    >
      {isPaid ? <Zap className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5 text-vectosilo-accent" />}
      {isPaid ? plan.toUpperCase() : "Upgrade"}
    </button>
  );
}
