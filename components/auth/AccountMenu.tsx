"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, BadgeCheck, Settings, KeyRound, Crown, Building2 } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { planDef } from "@/lib/plans";
import { useIncogniStore } from "@/lib/store";
import { JoinOrgModal } from "@/components/billing/JoinOrgModal";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const DEFAULT_AVATAR_COLOR = "#475569";

const PLAN_BADGE_COLORS: Record<Plan, string> = {
  free: "bg-zinc-500/20 text-zinc-400",
  go: "bg-amber-500/20 text-amber-400",
  pro: "bg-blue-500/20 text-blue-400",
  max: "bg-purple-500/20 text-purple-400",
  ultra: "bg-yellow-500/20 text-yellow-300",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AccountMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const setSettingsOpen = useIncogniStore((s) => s.setSettingsOpen);
  const [joinOrgOpen, setJoinOrgOpen] = useState(false);
  if (!user) return null;
  const plan = planDef(user.plan);
  const avatarBg = user.avatarColor ?? DEFAULT_AVATAR_COLOR;
  const isUltra = user.plan === "ultra";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account"
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-incogni-surface-2 focus:outline-none"
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: avatarBg }}
          >
            {initials(user.name) || user.email[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate text-sm font-medium text-incogni-text leading-tight">{user.name}</span>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                PLAN_BADGE_COLORS[user.plan] ?? PLAN_BADGE_COLORS.free
              )}>
                {plan.name}
              </span>
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 mb-2">
        {!isUltra && (
          <DropdownMenuItem onSelect={() => router.push("/pricing")}>
            <span className="flex w-full items-center gap-2 text-incogni-text">
              <Crown className="h-4 w-4" /> Upgrade plan
            </span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => { setSettingsOpen(true); useIncogniStore.getState().setSettingsTab("personalization"); }}>
          <span className="flex items-center gap-2 text-incogni-text">
            <Settings className="h-4 w-4" /> Personalization
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/developers")}>
          <span className="flex items-center gap-2 text-incogni-text">
            <KeyRound className="h-4 w-4" /> API & Credits
          </span>
        </DropdownMenuItem>
        {user.orgId ? (
          <DropdownMenuItem onSelect={() => router.push("/org")}>
            <span className="flex items-center gap-2 text-incogni-text">
              <Building2 className="h-4 w-4" /> Organization
            </span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => setJoinOrgOpen(true)}>
            <span className="flex items-center gap-2 text-incogni-text">
              <Building2 className="h-4 w-4" /> Join Organization
            </span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => { setSettingsOpen(true); useIncogniStore.getState().setSettingsTab("general"); }}>
          <span className="flex items-center gap-2 text-incogni-text">
            <Settings className="h-4 w-4" /> Settings
          </span>
        </DropdownMenuItem>
        <div className="mx-1 my-1 h-px bg-incogni-border" />
        <DropdownMenuItem onSelect={() => logout()}>
          <span className="flex items-center gap-2 text-incogni-text">
            <LogOut className="h-4 w-4" /> Log out
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      {joinOrgOpen && <JoinOrgModal onClose={() => setJoinOrgOpen(false)} />}
    </DropdownMenu>
  );
}
