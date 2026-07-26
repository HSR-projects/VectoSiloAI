"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { OrgPanel } from "@/components/billing/OrgPanel";
import { SettingsModal } from "@/components/layout/SettingsModal";
import { PrivacyModal } from "@/components/layout/PrivacyModal";
import { CustomAIsModal } from "@/components/layout/CustomAIsModal";
import { Building2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function OrgPageClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-dvh overflow-hidden bg-incogni-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header showMenu onToggleSidebar={() => setSidebarOpen(true)} title="Organization" />
        
        <main className="flex-1 overflow-y-auto px-4 pb-20 pt-16 md:px-8">
          <div className="mx-auto max-w-4xl space-y-8">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-incogni-text">
                <Building2 className="h-8 w-8 text-incogni-accent" />
                Organization
              </h1>
              <p className="mt-2 text-incogni-muted">
                Manage your team, workspace settings, and organization billing.
              </p>
            </div>

            {user?.orgId ? (
              <OrgPanel />
            ) : (
              <div className="rounded-xl border border-incogni-border bg-incogni-surface p-8 text-center">
                <Building2 className="mx-auto h-12 w-12 text-incogni-muted opacity-50" />
                <h2 className="mt-4 text-lg font-semibold text-incogni-text">No Organization</h2>
                <p className="mt-2 text-sm text-incogni-muted">
                  You are not currently part of an organization. Create one or ask your admin for an invite.
                </p>
                <button
                  onClick={() => window.location.href = "/pricing"}
                  className="mt-6 rounded-lg bg-incogni-accent px-6 py-2 text-sm font-semibold text-black transition-colors hover:bg-incogni-accent-soft"
                >
                  View Enterprise Plans
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      <SettingsModal />
      <PrivacyModal />
      <CustomAIsModal />
    </div>
  );
}
