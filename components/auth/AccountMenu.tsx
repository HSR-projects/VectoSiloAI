"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, BadgeCheck, Settings, KeyRound, Building2, UserPlus } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { formatCredits } from "@/lib/credits";
import { planDef } from "@/lib/plans";
import { useKodaStore } from "@/lib/store";
import { JoinOrgModal } from "@/components/billing/JoinOrgModal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const DEFAULT_AVATAR_COLOR = "#7c3aed";

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
  const setSettingsOpen = useKodaStore((s) => s.setSettingsOpen);
  const [joinOrgOpen, setJoinOrgOpen] = useState(false);
  if (!user) return null;
  const plan = planDef(user.plan);
  const avatarBg = user.avatarColor ?? DEFAULT_AVATAR_COLOR;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white transition-transform hover:scale-105 focus:outline-none"
          style={{ backgroundColor: avatarBg }}
        >
          {initials(user.name) || user.email[0]?.toUpperCase()}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: avatarBg }}
            >
              {initials(user.name) || user.email[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-koda-text">{user.name}</p>
              <p className="truncate text-xs font-normal text-koda-muted">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <div className="mx-1 my-1 flex items-center gap-1.5 rounded-md bg-koda-surface-2 px-2.5 py-1.5 text-xs text-koda-text">
          <BadgeCheck className="h-3.5 w-3.5 text-koda-accent" />
          {plan.name} plan
        </div>
        <div className="mx-1 my-1 h-px bg-koda-border" />
        <DropdownMenuItem onSelect={() => router.push("/developers")}>
          <span className="flex w-full items-center justify-between gap-2 text-koda-text">
            <span className="flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5" /> API &amp; Credits
            </span>
            <span className="text-xs text-koda-muted">{formatCredits(user.credits ?? 0)}</span>
          </span>
        </DropdownMenuItem>
        {user.plan === "ultra" && (
          <DropdownMenuItem onSelect={() => router.push("/pricing?tab=org")}>
            <span className="flex items-center gap-2 text-koda-text">
              <Building2 className="h-3.5 w-3.5" /> Manage Org
            </span>
          </DropdownMenuItem>
        )}
        {user.plan !== "ultra" && (
          <DropdownMenuItem onSelect={() => setJoinOrgOpen(true)}>
            <span className="flex items-center gap-2 text-koda-text">
              <UserPlus className="h-3.5 w-3.5" /> Join Organization
            </span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
          <span className="flex items-center gap-2 text-koda-text">
            <Settings className="h-3.5 w-3.5" /> Settings
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => logout()}>
          <span className="flex items-center gap-2 text-koda-text">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      {joinOrgOpen && <JoinOrgModal onClose={() => setJoinOrgOpen(false)} />}
    </DropdownMenu>
  );
}
