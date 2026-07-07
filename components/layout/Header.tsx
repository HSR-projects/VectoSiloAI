"use client";

import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, PanelLeft } from "lucide-react";
import { ModelSwitcher } from "./ModelSwitcher";
import { PrivacyModal } from "./PrivacyModal";
import { SettingsModal } from "./SettingsModal";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { ShareButton } from "@/components/billing/ShareButton";
import { useKodaStore } from "@/lib/store";

interface HeaderProps {
  onToggleSidebar?: () => void;
  showMenu?: boolean;
  /** Optional thread title shown in the centre of the header. */
  title?: string;
  /** Thread ID for the share button (shown when in a thread). */
  threadId?: string;
}

export function Header({ onToggleSidebar, showMenu, title, threadId }: HeaderProps) {
  const incognito = useKodaStore((s) => s.incognito);
  const setIncognito = useKodaStore((s) => s.setIncognito);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-koda-border bg-koda-bg/80 px-4 py-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2">
        {showMenu && (
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-koda-muted hover:bg-koda-surface-2 hover:text-koda-text"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        )}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/koda-logo.svg" alt="Koda AI" width={28} height={28} priority />
          {/* Wordmark is hidden on the smallest screens to keep the header from
              overflowing once the sidebar toggle + controls are present. */}
          <span className="hidden text-lg font-semibold tracking-tight text-koda-text min-[420px]:inline">
            Koda<span className="text-koda-accent">AI</span>
          </span>
        </Link>
        {title && (
          <>
            <span className="hidden text-koda-border md:block">/</span>
            <span className="hidden max-w-[280px] truncate text-sm text-koda-muted md:block">
              {title}
            </span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <ModelSwitcher />
        <button
          onClick={() => setIncognito(!incognito)}
          title={incognito ? "Incognito on — chats not saved" : "Incognito off"}
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
            incognito
              ? "bg-koda-accent/15 text-koda-accent-soft"
              : "text-koda-muted hover:bg-koda-surface-2 hover:text-koda-text"
          }`}
        >
          {incognito ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
        {threadId && <ShareButton threadId={threadId} />}
        <SettingsModal />
        <div className="hidden md:block">
          <PrivacyModal />
        </div>
        <AccountMenu />
      </div>
    </header>
  );
}
