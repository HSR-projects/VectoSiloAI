"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings, Cpu, Loader2, Swords, Check, Lock, Trash2, Palette, AlertTriangle,
  Sparkles, LogOut, Mail, Pencil, UserRound, Crown, Mic, Database, SlidersHorizontal,
  Blocks, Shield, ShieldCheck, Copy, Download,
} from "lucide-react";
import { useModels } from "@/hooks/useModels";
import { useKodaStore } from "@/lib/store";
import { useAuth } from "@/components/auth/AuthProvider";
import { modelLabel, cn } from "@/lib/utils";
import { AUTO_MODEL } from "@/lib/autoModel";
import { FocusModes } from "@/components/search/FocusModes";
import { IntegrationsPanel } from "@/components/layout/IntegrationsPanel";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AVATAR_COLORS = [
  { label: "Violet", value: "#7c3aed" }, { label: "Blue", value: "#2563eb" },
  { label: "Cyan", value: "#0891b2" }, { label: "Green", value: "#16a34a" },
  { label: "Amber", value: "#d97706" }, { label: "Rose", value: "#e11d48" },
  { label: "Pink", value: "#db2777" }, { label: "Slate", value: "#475569" },
];

const SPOKEN_LANGS = [
  { label: "Auto-detect", value: "" },
  { label: "English (US)", value: "en-US" },
  { label: "English (UK)", value: "en-GB" },
  { label: "Hindi", value: "hi-IN" },
  { label: "Spanish", value: "es-ES" },
  { label: "French", value: "fr-FR" },
  { label: "German", value: "de-DE" },
  { label: "Portuguese", value: "pt-BR" },
  { label: "Japanese", value: "ja-JP" },
  { label: "Chinese", value: "zh-CN" },
];

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Beginner", 3: "Casual", 5: "Club", 7: "Strong", 9: "Expert", 10: "Maximum",
};
function difficultyLabel(n: number): string {
  const keys = Object.keys(DIFFICULTY_LABELS).map(Number).sort((a, b) => b - a);
  return DIFFICULTY_LABELS[keys.find((k) => n >= k) ?? 1];
}

const PLAN_LABEL: Record<string, string> = { free: "Free", pro: "Pro", max: "Max" };

type TabId = "general" | "personalization" | "model" | "game" | "integrations" | "data" | "account";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "General", icon: <SlidersHorizontal className="h-4 w-4" /> },
  { id: "personalization", label: "Personalization", icon: <Palette className="h-4 w-4" /> },
  { id: "model", label: "Model", icon: <Cpu className="h-4 w-4" /> },
  { id: "game", label: "Chess", icon: <Swords className="h-4 w-4" /> },
  { id: "integrations", label: "Integrations", icon: <Blocks className="h-4 w-4" /> },
  { id: "data", label: "Data controls", icon: <Database className="h-4 w-4" /> },
  { id: "account", label: "Account", icon: <UserRound className="h-4 w-4" /> },
];

export function SettingsModal() {
  const { loading } = useModels();
  const { user, caps, updateAccount, deleteAccount, logout } = useAuth();
  const {
    selectedModel, availableModels, setSelectedModel,
    focusMode, setFocusMode, chessDifficulty, setChessDifficulty,
    settingsOpen, setSettingsOpen, settingsTab, setSettingsTab,
    dictationEnabled, setDictationEnabled, dictationLang, setDictationLang,
  } = useKodaStore();

  const [tab, setTab] = useState<TabId>(settingsTab as TabId);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  // 2FA state
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorStep, setTwoFactorStep] = useState<"idle" | "password" | "qr" | "verify" | "backup" | "disable">("idle");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorQR, setTwoFactorQR] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState<string[]>([]);
  const [twoFactorCopied, setTwoFactorCopied] = useState(false);
  // Change password
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [changePassCurrent, setChangePassCurrent] = useState("");
  const [changePassNew, setChangePassNew] = useState("");
  const [changePassConfirm, setChangePassConfirm] = useState("");
  const [changePassBusy, setChangePassBusy] = useState(false);
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [changePassDone, setChangePassDone] = useState(false);
  useEffect(() => setNameDraft(user?.name ?? ""), [user?.name]);

  // Sync tab state with store when settings opens
  useEffect(() => {
    if (settingsOpen) {
      setTab(settingsTab as TabId);
    }
  }, [settingsOpen, settingsTab]);

  const sliderValue = Math.min(chessDifficulty, caps.chessMax);

  const saveName = async () => {
    const name = nameDraft.trim();
    if (!name || name === user?.name) return;
    setSavingName(true); setNameSaved(false);
    try { await updateAccount({ name }); setNameSaved(true); setTimeout(() => setNameSaved(false), 1500); }
    catch { /* silent */ } finally { setSavingName(false); }
  };

  const signOut = async () => {
    try { await logout(); setSettingsOpen(false); } catch { /* silent */ }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true); setDeleteError(null);
    try { await deleteAccount(); setSettingsOpen(false); }
    catch (e) { setDeleteError((e as Error).message); setDeleting(false); }
  };

  const router = useRouter();
  const goUpgrade = () => { setSettingsOpen(false); router.push("/pricing"); };

  const reset2FA = () => {
    setTwoFactorStep("idle");
    setTwoFactorBusy(false);
    setTwoFactorError(null);
    setTwoFactorPassword("");
    setTwoFactorSecret("");
    setTwoFactorQR("");
    setTwoFactorCode("");
    setTwoFactorBackupCodes([]);
    setTwoFactorCopied(false);
  };

  const changePassword = async () => {
    setChangePassError(null);
    if (changePassNew.length < 8) { setChangePassError("New password must be at least 8 characters."); return; }
    if (changePassNew !== changePassConfirm) { setChangePassError("Passwords don't match."); return; }
    setChangePassBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: changePassCurrent, newPassword: changePassNew }),
      });
      const data = await res.json();
      if (!res.ok) { setChangePassError(data.error); return; }
      setChangePassDone(true);
      setChangePassCurrent("");
      setChangePassNew("");
      setChangePassConfirm("");
      setTimeout(() => { setChangePassOpen(false); setChangePassDone(false); }, 1500);
    } finally { setChangePassBusy(false); }
  };

  const start2FASetup = async () => {
    setTwoFactorError(null);
    if (!twoFactorPassword) { setTwoFactorError("Enter your password."); return; }
    setTwoFactorBusy(true);
    try {
      const res = await fetch("/api/account/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: twoFactorPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setTwoFactorError(data.error); return; }
      setTwoFactorSecret(data.secret);
      setTwoFactorQR(data.qrCode);
      setTwoFactorStep("qr");
    } finally { setTwoFactorBusy(false); }
  };

  const verify2FASetup = async () => {
    setTwoFactorError(null);
    if (!twoFactorCode) { setTwoFactorError("Enter the 6-digit code."); return; }
    setTwoFactorBusy(true);
    try {
      const res = await fetch("/api/account/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: twoFactorSecret, code: twoFactorCode }),
      });
      const data = await res.json();
      if (!res.ok) { setTwoFactorError(data.error); return; }
      setTwoFactorBackupCodes(data.backupCodes);
      setTwoFactorStep("backup");
    } finally { setTwoFactorBusy(false); }
  };

  const disable2FA = async () => {
    setTwoFactorError(null);
    if (!twoFactorPassword) { setTwoFactorError("Enter your password."); return; }
    setTwoFactorBusy(true);
    try {
      const res = await fetch("/api/account/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: twoFactorPassword, code: twoFactorCode }),
      });
      const data = await res.json();
      if (!res.ok) { setTwoFactorError(data.error); return; }
      // Refresh user state to pick up the change
      window.location.reload();
    } finally { setTwoFactorBusy(false); }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(twoFactorBackupCodes.join("\n"));
    setTwoFactorCopied(true);
    setTimeout(() => setTwoFactorCopied(false), 2000);
  };

  return (
    <Dialog
      open={settingsOpen}
      onOpenChange={(open) => {
        setSettingsOpen(open);
        if (!open) { setDeleteConfirm(false); setDeleteError(null); setSettingsTab("general"); reset2FA(); setChangePassOpen(false); setChangePassDone(false); setChangePassError(null); setChangePassCurrent(""); setChangePassNew(""); setChangePassConfirm(""); }
      }}
    >
      <DialogTrigger asChild>
        <button
          aria-label="Settings"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-koda-border bg-koda-surface text-koda-muted transition-colors hover:bg-koda-surface-2 hover:text-koda-text"
        >
          <Settings className="h-4 w-4" />
        </button>
      </DialogTrigger>

        <DialogContent className="grid h-[85dvh] max-h-[600px] w-[calc(100%-1.5rem)] max-w-3xl grid-cols-1 gap-0 overflow-hidden md:p-0 md:grid-cols-[200px_1fr]">
        <DialogTitle className="sr-only">Settings</DialogTitle>

        {/* Left nav */}
        <nav className="hidden flex-col gap-0.5 overflow-y-auto border-r border-koda-border bg-koda-surface/60 p-2 md:flex">
          <p className="px-3 py-2 text-sm font-semibold text-koda-text">Settings</p>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSettingsTab(t.id); }}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                tab === t.id ? "bg-koda-surface-2 text-koda-text" : "text-koda-muted hover:bg-koda-surface-2/60 hover:text-koda-text"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {/* Mobile tab strip */}
        <div className="flex gap-1 overflow-x-auto border-b border-koda-border p-2 md:hidden [scrollbar-width:none]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSettingsTab(t.id); }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors",
                tab === t.id ? "bg-koda-surface-2 text-koda-text" : "text-koda-muted"
              )}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-4 py-3 sm:px-5 sm:py-4 [scrollbar-width:thin]">
          <h2 className="mb-1 text-lg font-semibold text-koda-text">
            {TABS.find((t) => t.id === tab)?.label}
          </h2>

          {tab === "general" && (
            <div>
              <Row label="Enable dictation" desc="Show the microphone in the chat composer.">
                <Toggle checked={dictationEnabled} onChange={setDictationEnabled} />
              </Row>
              <Row label="Spoken language" desc="Language used for dictation.">
                <Select
                  value={dictationLang}
                  onChange={setDictationLang}
                  options={SPOKEN_LANGS}
                  disabled={!dictationEnabled}
                />
              </Row>
              <Row label="Default search mode" desc="How Koda decides when to search the web.">
                <FocusModes value={focusMode} onChange={setFocusMode} />
              </Row>
              <Row
                label="Two-factor authentication"
                desc={user?.twoFactorEnabled ? "Secured with authenticator app." : "Google/Microsoft Authenticator — add an extra layer of security."}
              >
                {user?.twoFactorEnabled ? (
                  <button
                    type="button"
                    onClick={() => { setSettingsTab("account"); setTab("account"); setTwoFactorStep("disable"); setTwoFactorError(null); setTwoFactorPassword(""); setTwoFactorCode(""); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-koda-border bg-koda-surface px-3 py-1.5 text-xs text-koda-muted transition-colors hover:bg-koda-surface-2"
                  >
                    <Shield className="h-3.5 w-3.5 text-green-400" />
                    <span className="text-green-400">Active</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setSettingsTab("account"); setTab("account"); setTwoFactorStep("password"); setTwoFactorError(null); setTwoFactorPassword(""); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-koda-accent/15 px-3 py-1.5 text-xs font-medium text-koda-accent-soft transition-colors hover:bg-koda-accent/25"
                  >
                    <Shield className="h-3.5 w-3.5" /> Enable
                  </button>
                )}
              </Row>
            </div>
          )}

          {tab === "personalization" && user && (
            <div>
              <Row label="Display name" desc="Shown on your profile.">
                <div className="flex gap-2">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                    maxLength={40}
                    className="w-full sm:w-40 rounded-lg border border-koda-border bg-koda-surface px-3 py-1.5 text-sm text-koda-text focus:border-koda-accent/50 focus:outline-none"
                    placeholder="Your name"
                  />
                  <button
                    onClick={saveName}
                    disabled={savingName || !nameDraft.trim() || nameDraft.trim() === user.name}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-koda-accent px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-koda-accent-soft disabled:opacity-40"
                  >
                    {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : nameSaved ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                    {nameSaved ? "Saved" : "Save"}
                  </button>
                </div>
              </Row>
              <Row label="Avatar color" desc="Your profile accent.">
                <div className="flex flex-wrap justify-end gap-2">
                  {AVATAR_COLORS.map((c) => {
                    const active = (user.avatarColor ?? "#7c3aed") === c.value;
                    return (
                      <button
                        key={c.value}
                        title={c.label}
                        onClick={() => updateAccount({ avatarColor: c.value }).catch(() => {})}
                        className={cn("relative h-7 w-7 rounded-full transition-transform hover:scale-110 sm:h-6 sm:w-6", active && "ring-2 ring-white ring-offset-1 ring-offset-koda-surface")}
                        style={{ backgroundColor: c.value }}
                      >
                        {active && <Check className="absolute inset-0 m-auto h-3 w-3 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </Row>
            </div>
          )}

          {tab === "model" && (
            <div className="pt-2">
              {loading && <p className="mb-2 flex items-center gap-1.5 text-xs text-koda-muted"><Loader2 className="h-3 w-3 animate-spin" /> Loading models…</p>}
              {caps.allModels ? (
                <div className="grid max-h-[420px] gap-1 overflow-y-auto rounded-xl border border-koda-border bg-koda-surface-2 p-1 [scrollbar-width:thin]">
                  <ModelRow active={selectedModel === AUTO_MODEL} onClick={() => setSelectedModel(AUTO_MODEL)} icon={<Sparkles className="h-3.5 w-3.5 text-koda-accent" />} title="Auto" sub="Best model per task" />
                  {availableModels.length === 0 && !loading && (
                    <p className="px-2 py-1.5 text-xs text-koda-muted">No models found — check your Koda AI configuration.</p>
                  )}
                  {availableModels.map((m) => (
                    <ModelRow key={m} active={m === selectedModel} onClick={() => setSelectedModel(m)} title={modelLabel(m)} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-koda-border bg-koda-surface-2 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-koda-text">Auto</p>
                      <p className="text-xs text-koda-muted">{selectedModel ? modelLabel(selectedModel) : "Loading…"}</p>
                    </div>
                    <Lock className="h-4 w-4 text-koda-muted" />
                  </div>
                  <button onClick={goUpgrade} className="mt-2 inline-flex items-center gap-1 text-xs text-koda-accent-soft hover:underline">
                    <Lock className="h-3 w-3" /> Upgrade to Pro to choose any model
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "game" && (
            <div>
              <Row label="Chess strength" desc={`${difficultyLabel(sliderValue)} · ${sliderValue}/${caps.chessMax}`}>
                <div className="w-full sm:w-44">
                  <input
                    type="range" min={1} max={caps.chessMax} step={1} value={sliderValue}
                    onChange={(e) => setChessDifficulty(Number(e.target.value))}
                    className="w-full accent-koda-accent" aria-label="Chess difficulty"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-koda-muted/70"><span>Easy</span><span>Hard</span></div>
                </div>
              </Row>
              {caps.chessMax < 10 && (
                <button onClick={goUpgrade} className="mt-2 inline-flex items-center gap-1 text-xs text-koda-accent-soft hover:underline">
                  <Lock className="h-3 w-3" /> Upgrade for full-strength play
                </button>
              )}
            </div>
          )}

          {tab === "integrations" && <IntegrationsPanel />}

          {tab === "data" && user && (
            <div className="pt-2">
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-red-400">
                  <Trash2 className="h-4 w-4" /> Delete account
                </p>
                {!deleteConfirm ? (
                  <button onClick={() => setDeleteConfirm(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20">
                    Delete my account
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm text-red-300">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <span>This permanently deletes your account and all chat history. This cannot be undone.</span>
                    </div>
                    {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button onClick={handleDeleteAccount} disabled={deleting} className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 sm:w-auto">
                        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Yes, delete everything
                      </button>
                      <button onClick={() => { setDeleteConfirm(false); setDeleteError(null); }} disabled={deleting} className="w-full inline-flex items-center justify-center rounded-lg border border-koda-border px-3 py-1.5 text-sm text-koda-muted transition-colors hover:bg-koda-surface-2 sm:w-auto">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "account" && user && (
            <div className="pt-2">
              <div className="flex items-center gap-2 rounded-xl border border-koda-border bg-koda-surface-2 p-3 sm:gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white" style={{ backgroundColor: user.avatarColor ?? "#7c3aed" }}>
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-koda-text">{user.name || "—"}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-koda-muted"><Mail className="h-3 w-3 shrink-0" /> {user.email}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-koda-accent/30 bg-koda-accent/10 px-2.5 py-1 text-xs font-medium text-koda-accent-soft">
                  <Crown className="h-3 w-3" /> {PLAN_LABEL[user.plan] ?? user.plan}
                </span>
              </div>

              {/* Two-factor authentication */}
              <Row label="Two-factor authentication" desc="Add an extra layer of security to your account.">
                {user.twoFactorEnabled ? (
                  <button
                    type="button"
                    onClick={() => { setTwoFactorStep("disable"); setTwoFactorError(null); setTwoFactorPassword(""); setTwoFactorCode(""); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
                  >
                    <Shield className="h-3.5 w-3.5" /> Disable 2FA
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTwoFactorStep("password")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-koda-accent/15 px-3 py-1.5 text-xs font-medium text-koda-accent-soft transition-colors hover:bg-koda-accent/25"
                  >
                    <Shield className="h-3.5 w-3.5" /> Enable
                  </button>
                )}
              </Row>

              {/* 2FA setup / disable flow — rendered full-width outside the Row */}
              {twoFactorStep !== "idle" && (() => {
                if (twoFactorStep === "password") {
                  return (
                    <div className="mb-3 rounded-xl border border-koda-border bg-koda-surface-2/50 p-4">
                      <p className="mb-2 text-xs text-koda-muted">Confirm your password to continue.</p>
                      <input
                        type="password"
                        value={twoFactorPassword}
                        onChange={(e) => setTwoFactorPassword(e.target.value)}
                        placeholder="Current password"
                        className="w-full rounded-lg border border-koda-border bg-koda-bg px-3 py-1.5 text-sm text-koda-text placeholder:text-koda-muted/40 focus:border-koda-accent/50 focus:outline-none"
                      />
                      {twoFactorError && <p className="mt-1.5 text-xs text-red-400">{twoFactorError}</p>}
                      <div className="mt-3 flex gap-2">
                        <button onClick={start2FASetup} disabled={twoFactorBusy} className="inline-flex items-center gap-1 rounded-lg bg-koda-accent px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-koda-accent-soft disabled:opacity-60">
                          {twoFactorBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                          Continue
                        </button>
                        <button onClick={() => { setTwoFactorStep("idle"); setTwoFactorError(null); setTwoFactorPassword(""); }} className="inline-flex items-center rounded-lg border border-koda-border px-3 py-1.5 text-xs text-koda-muted transition-colors hover:bg-koda-surface-2">
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }
                if (twoFactorStep === "qr") {
                  return (
                    <div className="mb-3 rounded-xl border border-koda-border bg-koda-surface-2/50 p-4">
                      <p className="mb-3 text-xs text-koda-muted">Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, etc.).</p>
                      <div className="flex justify-center">
                        {twoFactorQR && (
                          <img src={twoFactorQR} alt="QR code" className="h-40 w-40 rounded-lg border border-koda-border" />
                        )}
                      </div>
                      <p className="mt-2 text-center text-xs text-koda-muted">
                        Or enter key manually: <span className="font-mono text-koda-text">{twoFactorSecret}</span>
                      </p>
                      <p className="mt-3 text-xs text-koda-muted">Enter the 6-digit code from the app:</p>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                        placeholder="000 000"
                        className="mt-1.5 w-full rounded-lg border border-koda-border bg-koda-bg px-3 py-1.5 text-center text-base tracking-[0.3em] text-koda-text placeholder:text-koda-muted/40 focus:border-koda-accent/50 focus:outline-none"
                      />
                      {twoFactorError && <p className="mt-1.5 text-xs text-red-400">{twoFactorError}</p>}
                      <div className="mt-3 flex gap-2">
                        <button onClick={verify2FASetup} disabled={twoFactorBusy || twoFactorCode.length !== 6} className="inline-flex items-center gap-1 rounded-lg bg-koda-accent px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-koda-accent-soft disabled:opacity-60">
                          {twoFactorBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                          Verify & enable
                        </button>
                        <button onClick={reset2FA} className="inline-flex items-center rounded-lg border border-koda-border px-3 py-1.5 text-xs text-koda-muted transition-colors hover:bg-koda-surface-2">
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }
                if (twoFactorStep === "backup") {
                  return (
                    <div className="mb-3 rounded-xl border border-koda-border bg-koda-surface-2/50 p-4">
                      <p className="mb-2 text-xs font-medium text-amber-400">
                        Save these backup codes! Each can be used once if you lose access to your authenticator app.
                      </p>
                      <div className="rounded-lg border border-koda-border bg-black/20 p-3 font-mono text-xs leading-6">
                        {twoFactorBackupCodes.map((code, i) => (
                          <div key={i} className="text-koda-text">{code}</div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={copyBackupCodes} className="inline-flex items-center gap-1.5 rounded-lg border border-koda-border px-3 py-1.5 text-xs text-koda-muted transition-colors hover:bg-koda-surface-2">
                          {twoFactorCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {twoFactorCopied ? "Copied!" : "Copy codes"}
                        </button>
                        <button onClick={() => window.location.reload()} className="inline-flex items-center gap-1.5 rounded-lg bg-koda-accent px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-koda-accent-soft">
                          <ShieldCheck className="h-3.5 w-3.5" /> Done — 2FA is now active
                        </button>
                      </div>
                    </div>
                  );
                }
                if (twoFactorStep === "disable") {
                  return (
                    <div className="mb-3 rounded-xl border border-koda-border bg-koda-surface-2/50 p-4">
                      <p className="mb-2 text-xs text-koda-muted">Enter your password and a 2FA code to disable.</p>
                      <input
                        type="password"
                        value={twoFactorPassword}
                        onChange={(e) => setTwoFactorPassword(e.target.value)}
                        placeholder="Current password"
                        className="w-full rounded-lg border border-koda-border bg-koda-bg px-3 py-1.5 text-sm text-koda-text placeholder:text-koda-muted/40 focus:border-koda-accent/50 focus:outline-none"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                        placeholder="2FA code or backup code"
                        className="mt-2 w-full rounded-lg border border-koda-border bg-koda-bg px-3 py-1.5 text-sm text-koda-text placeholder:text-koda-muted/40 focus:border-koda-accent/50 focus:outline-none"
                      />
                      {twoFactorError && <p className="mt-1.5 text-xs text-red-400">{twoFactorError}</p>}
                      <div className="mt-3 flex gap-2">
                        <button onClick={disable2FA} disabled={twoFactorBusy} className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30 disabled:opacity-60">
                          {twoFactorBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                          Disable 2FA
                        </button>
                        <button onClick={reset2FA} className="inline-flex items-center rounded-lg border border-koda-border px-3 py-1.5 text-xs text-koda-muted transition-colors hover:bg-koda-surface-2">
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <Row label="Password" desc="Change your sign-in password.">
                {!changePassOpen ? (
                  <button
                    type="button"
                    onClick={() => { setChangePassOpen(true); setChangePassError(null); setChangePassDone(false); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-koda-border bg-koda-surface px-3 py-1.5 text-xs text-koda-muted transition-colors hover:bg-koda-surface-2"
                  >
                    <Lock className="h-3.5 w-3.5" /> Change
                  </button>
                ) : changePassDone ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-400">
                    <Check className="h-3.5 w-3.5" /> Password updated
                  </span>
                ) : (
                  <div className="flex flex-col gap-2">
                    <input
                      type="password"
                      value={changePassCurrent}
                      onChange={(e) => setChangePassCurrent(e.target.value)}
                      placeholder="Current password"
                      className="w-full rounded-lg border border-koda-border bg-koda-bg px-3 py-1.5 text-sm text-koda-text placeholder:text-koda-muted/40 focus:border-koda-accent/50 focus:outline-none"
                    />
                    <input
                      type="password"
                      value={changePassNew}
                      onChange={(e) => setChangePassNew(e.target.value)}
                      placeholder="New password (min 8 chars)"
                      className="w-full rounded-lg border border-koda-border bg-koda-bg px-3 py-1.5 text-sm text-koda-text placeholder:text-koda-muted/40 focus:border-koda-accent/50 focus:outline-none"
                    />
                    <input
                      type="password"
                      value={changePassConfirm}
                      onChange={(e) => setChangePassConfirm(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full rounded-lg border border-koda-border bg-koda-bg px-3 py-1.5 text-sm text-koda-text placeholder:text-koda-muted/40 focus:border-koda-accent/50 focus:outline-none"
                    />
                    {changePassError && <p className="text-xs text-red-400">{changePassError}</p>}
                    <div className="flex gap-2">
                      <button onClick={changePassword} disabled={changePassBusy} className="inline-flex items-center gap-1 rounded-lg bg-koda-accent px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-koda-accent-soft disabled:opacity-60">
                        {changePassBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                        Save
                      </button>
                      <button onClick={() => { setChangePassOpen(false); setChangePassError(null); setChangePassCurrent(""); setChangePassNew(""); setChangePassConfirm(""); }} className="inline-flex items-center rounded-lg border border-koda-border px-3 py-1.5 text-xs text-koda-muted transition-colors hover:bg-koda-surface-2">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </Row>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button onClick={goUpgrade} className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-1", user.plan === "free" ? "border border-koda-accent/40 bg-koda-accent/10 text-koda-accent-soft hover:bg-koda-accent/20" : "border border-koda-border bg-koda-surface text-koda-text hover:bg-koda-surface-2")}>
                  {user.plan === "free" ? <><Crown className="h-3.5 w-3.5" /> Upgrade to Pro or Max</> : "Manage plan"}
                </button>
                <button onClick={signOut} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-koda-border bg-koda-surface px-3 py-1.5 text-sm text-koda-muted transition-colors hover:bg-koda-surface-2 hover:text-koda-text">
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reusable bits ────────────────────────────────────────────

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-koda-border/50 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm text-koda-text">{label}</p>
        {desc && <p className="text-xs text-koda-muted">{desc}</p>}
      </div>
      <div className="self-start sm:self-auto sm:shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-10 shrink-0 rounded-full transition-colors",
        checked ? "bg-koda-accent" : "bg-koda-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-4"
        )}
      />
    </button>
  );
}

function Select({ value, onChange, options, disabled }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[]; disabled?: boolean }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-lg border border-koda-border bg-koda-surface px-3 py-1.5 text-sm text-koda-text focus:border-koda-accent/50 focus:outline-none disabled:opacity-40"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-koda-surface text-koda-text">{o.label}</option>
      ))}
    </select>
  );
}

function ModelRow({ active, onClick, icon, title, sub }: { active: boolean; onClick: () => void; icon?: React.ReactNode; title: string; sub?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors", active ? "bg-koda-accent/15 text-koda-accent-soft" : "text-koda-text hover:bg-koda-surface")}
    >
      <span className="flex items-center gap-2">
        {icon}
        <span className="flex flex-col leading-tight">
          <span className="font-medium">{title}</span>
          {sub && <span className="text-xs text-koda-muted">{sub}</span>}
        </span>
      </span>
      {active && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}
