"use client";

import { useIncogniStore } from "@/lib/store";
import { SettingsModal } from "@/components/layout/SettingsModal";
import { PrivacyModal } from "@/components/layout/PrivacyModal";
import { CustomAIsModal } from "@/components/layout/CustomAIsModal";
import { Library } from "@/components/layout/Library";

export function GlobalModals() {
  const settingsOpen = useIncogniStore((s) => s.settingsOpen);
  const customAIsOpen = useIncogniStore((s) => s.customAIsOpen);
  return (
    <>
      {settingsOpen && <SettingsModal />}
      {/* We keep these here for now, but CustomAIsModal and Library will eventually be migrated to pages */}
      {customAIsOpen && <CustomAIsModal />}
    </>
  );
}
