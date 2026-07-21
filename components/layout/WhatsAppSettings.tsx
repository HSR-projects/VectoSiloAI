"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, QrCode, Smartphone, MessageSquare, X, Check, AlertCircle,
  HelpCircle, Lock, Zap, ArrowRight, Shield, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useVectoSiloStore } from "@/lib/store";
import { effectiveCaps } from "@/lib/plans";
import { cn } from "@/lib/utils";

const COUNTRY_CODES = [
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
];

type WhatsAppStatus = "disconnected" | "qr" | "connecting" | "connected" | "error";

interface WhatsAppState {
  status: WhatsAppStatus;
  qrCode: string | null;
  phoneNumber: string;
  useSelfChat: boolean;
}

export function WhatsAppSettings() {
  const { user, caps } = useAuth();
  const router = useRouter();
  const goUpgrade = () => router.push("/pricing");

  const [mode, setMode] = useState<"separate" | "self">("separate");
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappState, setWhatsAppState] = useState<WhatsAppState>({
    status: "disconnected",
    qrCode: null,
    phoneNumber: "",
    useSelfChat: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  const canUseWhatsApp = caps?.computer === true;
  const planName = user?.plan || "free";
  const isGoPlan = planName === "go";

  // Fetch status on mount
  useEffect(() => {
    if (!canUseWhatsApp) return;
    fetchStatus();
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [canUseWhatsApp]);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setWhatsAppState(data);
        if (data.status === "qr" || data.status === "connecting") {
          startPolling();
        } else {
          stopPolling();
        }
      }
    } catch {
      // Silent fail
    }
  };

  const startPolling = () => {
    stopPolling();
    const interval = setInterval(fetchStatus, 3000);
    setPollInterval(interval);
  };

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  };

  const handleConnect = async () => {
    if (mode === "separate" && !phoneNumber.trim()) {
      setError("Enter a phone number");
      return;
    }
    setLoading(true);
    setError(null);

    const fullNumber = mode === "self" ? "" : `${countryCode}${phoneNumber.replace(/\D/g, "")}`;

    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: fullNumber, useSelfChat: mode === "self" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to connect");
        setLoading(false);
        return;
      }

      setWhatsAppState({
        status: "qr",
        qrCode: data.qrCode,
        phoneNumber: fullNumber,
        useSelfChat: mode === "self",
      });
      startPolling();
    } catch (e) {
      setError("Connection failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
      setWhatsAppState({
        status: "disconnected",
        qrCode: null,
        phoneNumber: "",
        useSelfChat: false,
      });
      stopPolling();
    } catch {
      setError("Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: string) => {
    const cleaned = num.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  };

  if (!canUseWhatsApp) {
    return (
      <div className="pt-2">
        <div className="rounded-xl border border-vectosilo-accent/30 bg-vectosilo-accent/5 p-4">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-vectosilo-accent-soft shrink-0" />
            <div>
              <p className="font-medium text-vectosilo-text">WhatsApp requires Go plan or above</p>
              <p className="text-sm text-vectosilo-muted">
                Connect your WhatsApp to chat with VectoSiloAI from your phone.
              </p>
            </div>
          </div>
          <button onClick={goUpgrade} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-vectosilo-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-vectosilo-accent/90">
            <ArrowRight className="h-3 w-3" /> Upgrade to Go
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 space-y-4">
      {/* Mode Selection */}
      <div className="rounded-xl border border-vectosilo-border bg-vectosilo-surface/50 p-4">
        <p className="mb-3 text-sm font-medium text-vectosilo-text">Connection Mode</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("self")}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
              mode === "self"
                ? "border-vectosilo-accent bg-vectosilo-accent/5"
                : "border-vectosilo-border hover:border-vectosilo-accent/50"
            )}
          >
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              mode === "self" ? "bg-vectosilo-accent/15 text-vectosilo-accent" : "bg-vectosilo-surface-2 text-vectosilo-muted"
            )}>
              <Smartphone className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-vectosilo-text">Message Myself</span>
            <p className="text-center text-xs text-vectosilo-muted">
              Scan QR and chat with VectoSiloAI on your own WhatsApp
            </p>
            {mode === "self" && (
              <Check className="absolute top-2 right-2 h-5 w-5 text-vectosilo-accent" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMode("separate")}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
              mode === "separate"
                ? "border-vectosilo-accent bg-vectosilo-accent/5"
                : "border-vectosilo-border hover:border-vectosilo-accent/50"
            )}
          >
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              mode === "separate" ? "bg-vectosilo-accent/15 text-vectosilo-accent" : "bg-vectosilo-surface-2 text-vectosilo-muted"
            )}>
              <MessageSquare className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-vectosilo-text">Separate Number</span>
            <p className="text-center text-xs text-vectosilo-muted">
              Use a dedicated WhatsApp number for VectoSiloAI
            </p>
            {mode === "separate" && (
              <Check className="absolute top-2 right-2 h-5 w-5 text-vectosilo-accent" />
            )}
          </button>
        </div>
      </div>

      {/* Phone Number Input (Separate mode only) */}
      {mode === "separate" && (
        <div className="rounded-xl border border-vectosilo-border bg-vectosilo-surface/50 p-4">
          <p className="mb-3 text-sm font-medium text-vectosilo-text">WhatsApp Number</p>
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="flex h-10 w-28 shrink-0 items-center rounded-lg border border-vectosilo-border bg-vectosilo-surface px-2 py-1.5 text-sm text-vectosilo-text focus:border-vectosilo-accent/50 focus:outline-none"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, "");
                setPhoneNumber(formatNumber(cleaned));
              }}
              placeholder="Phone number"
              className="flex-1 h-10 rounded-lg border border-vectosilo-border bg-vectosilo-surface px-3 py-1.5 text-sm text-vectosilo-text placeholder:text-vectosilo-muted focus:border-vectosilo-accent/50 focus:outline-none"
              maxLength={15}
            />
          </div>
          <p className="mt-1 text-xs text-vectosilo-muted">
            Format: {countryCode} {formatNumber(phoneNumber.replace(/\D/g, ""))}
          </p>
        </div>
      )}

      {/* Connect / Status */}
      {whatsappState.status === "disconnected" ? (
        <div className="rounded-xl border border-vectosilo-border bg-vectosilo-surface/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-vectosilo-text">Not connected</p>
              <p className="text-sm text-vectosilo-muted">
                Click Connect to link your WhatsApp account
              </p>
            </div>
            <button
              onClick={handleConnect}
              disabled={loading || (mode === "separate" && !phoneNumber.trim())}
              className="inline-flex items-center gap-1.5 rounded-lg bg-vectosilo-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-vectosilo-accent/90 disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              Connect
            </button>
          </div>
        </div>
      ) : whatsappState.status === "qr" ? (
        <div className="rounded-xl border border-vectosilo-border bg-vectosilo-surface/50 p-4">
          <div className="text-center">
            <p className="mb-3 flex items-center justify-center gap-1.5 text-sm font-medium text-vectosilo-text">
              <Loader2 className="h-4 w-4 animate-spin text-vectosilo-accent" />
              Scan QR Code
            </p>
            {whatsappState.qrCode && (
              <div className="mb-4 flex justify-center">
                <img
                  src={whatsappState.qrCode}
                  alt="WhatsApp QR Code"
                  className="h-64 w-64 rounded-xl border border-vectosilo-border bg-white p-2"
                />
              </div>
            )}
            <p className="text-sm text-vectosilo-muted">
              Open WhatsApp → Settings → Linked Devices → Link a Device
            </p>
            <p className="mt-1 text-xs text-vectosilo-muted/70">
              QR refreshes every 20s. Keep this window open.
            </p>
            {error && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-red-400">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-vectosilo-border bg-vectosilo-surface px-3 py-1.5 text-xs font-medium text-vectosilo-muted transition-colors hover:bg-vectosilo-surface-2"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        </div>
      ) : whatsappState.status === "connected" ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                <Check className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-emerald-400">WhatsApp Connected</p>
                <p className="text-sm text-vectosilo-muted">
                  {whatsappState.useSelfChat
                    ? "Messaging yourself"
                    : `Connected to ${whatsappState.phoneNumber}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
            >
              <X className="h-3 w-3" /> Disconnect
            </button>
          </div>
        </div>
      ) : whatsappState.status === "error" ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">Connection Error</p>
          </div>
          <p className="mt-1 text-sm text-vectosilo-muted">
            {error || "Failed to connect. Please try again."}
          </p>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-vectosilo-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-vectosilo-accent/90"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
            Retry
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-vectosilo-border bg-vectosilo-surface/50 p-4">
          <div className="flex items-center gap-2 text-vectosilo-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p>Connecting…</p>
          </div>
        </div>
      )}

      {/* Plan Info & Rate Limits */}
      <div className="rounded-xl border border-vectosilo-border bg-vectosilo-surface/50 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-vectosilo-text">
          <Shield className="h-4 w-4 text-vectosilo-accent" />
          Plan: {planName.charAt(0).toUpperCase() + planName.slice(1)}
        </p>
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-lg bg-vectosilo-bg p-3">
            <p className="font-medium text-vectosilo-text">Rate Limits</p>
            <p className="text-vectosilo-muted">
              {isGoPlan
                ? "Highest rate limit (Go plan) — 100 messages/hour"
                : "Unlimited messages"}
            </p>
          </div>
          <div className="rounded-lg bg-vectosilo-bg p-3">
            <p className="font-medium text-vectosilo-text">Features</p>
            <p className="text-vectosilo-muted">
              Text, images, voice messages, commands
            </p>
          </div>
        </div>
        {isGoPlan && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="flex items-center gap-1.5 text-sm text-amber-400">
              <Zap className="h-3.5 w-3.5" />
              Go plan has the highest rate limit among paid tiers. Upgrade to Pro/Max/Ultra for unlimited.
            </p>
          </div>
        )}
      </div>

{/* Help */}
  <details className="rounded-xl border border-vectosilo-border bg-vectosilo-surface/50 p-4">
    <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-vectosilo-text">
      <HelpCircle className="h-4 w-4 transition-transform" />
      How it works
    </summary>
    <div className="mt-3 space-y-2 text-sm text-vectosilo-muted">
      <p>1. Choose &ldquo;Message Myself&rdquo; or &ldquo;Separate Number&rdquo;</p>
      <p>2. Click Connect — a QR code appears</p>
      <p>3. Open WhatsApp → Settings → Linked Devices → Link a Device</p>
      <p>4. Scan the QR code with your phone</p>
      <p>5. Start chatting with VectoSiloAI on WhatsApp!</p>
      <p className="mt-2 text-xs text-vectosilo-muted/70">
        Voice messages are transcribed using faster-whisper. Images are analyzed with vision models.
        Commands like /model, /search, /code work the same as in web chat.
      </p>
    </div>
  </details>
    </div>
  );
}