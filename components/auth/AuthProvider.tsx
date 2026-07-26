"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Plan, User } from "@/types";
import { CAPS, effectiveCaps, type PlanCaps } from "@/lib/plans";
import { useIncogniStore } from "@/lib/store";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  caps: PlanCaps;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateAccount: (patch: {
    name?: string;
    onboarded?: boolean;
    defaultAgent?: string;
    avatarColor?: string;
  }) => Promise<void>;
  /** Opens Razorpay Checkout for the given paid plan. Navigates away. */
  upgrade: (plan: Plan) => Promise<void>;
  /** Cancel the subscription + refund the latest payment, returning to Free. */
  downgrade: () => Promise<{ refunded: boolean; canceled: boolean }>;
  deleteAccount: () => Promise<void>;
  /** Second step of login: verify 2FA code with the temporary token. */
  verify2FA: (twoFactorToken: string, code: string) => Promise<void>;
}

/** Outcome of a login/register attempt — signals when email verification or 2FA is pending. */
export interface AuthResult {
  needsVerification?: boolean;
  email?: string;
  needs2FA?: boolean;
  twoFactorToken?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function postJSON(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed.");
  return data;
}

async function loadServerThreads() {
  try {
    const res = await fetch("/api/threads", { cache: "no-store" });
    if (!res.ok) {
      // Not authorized / error — never leave another user's threads visible.
      useIncogniStore.getState().setThreads([]);
      return;
    }
    const { threads } = await res.json();
    // Authoritatively REPLACE — even with an empty list — so a fresh account
    // can never inherit the previous user's chats from in-memory state.
    useIncogniStore.getState().setThreads(Array.isArray(threads) ? threads : []);
  } catch {
    useIncogniStore.getState().setThreads([]);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      const u = data?.user ?? null;
      setUser(u);
      if (u) await loadServerThreads();
      else useIncogniStore.getState().setThreads([]);
    } catch {
      setUser(null);
      useIncogniStore.getState().setThreads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data?.needsVerification) {
        return { needsVerification: true, email: data.email ?? email };
      }
      if (data?.needs2FA && data?.twoFactorToken) {
        return { needs2FA: true, twoFactorToken: data.twoFactorToken };
      }
      if (!res.ok) throw new Error(data?.error || "Could not sign in.");
      setUser(data.user);
      await loadServerThreads();
      return {};
    },
    []
  );

  const verify2FA = useCallback(
    async (twoFactorToken: string, code: string): Promise<void> => {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoFactorToken, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Invalid code.");
      // Session cookie is now set — refresh user state
      await refresh();
    },
    [refresh]
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<AuthResult> => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create account.");
      // New accounts require email verification before a session is issued.
      if (data?.needsVerification) {
        return { needsVerification: true, email: data.email ?? email };
      }
      setUser(data.user);
      useIncogniStore.getState().setThreads([]);
      return {};
    },
    []
  );

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    window.location.href = "/api/auth/google/init";
    return {};
  }, []);

  const logout = useCallback(async () => {
    await postJSON("/api/auth/logout");
    setUser(null);
    useIncogniStore.getState().setThreads([]);
  }, []);

  const updateAccount = useCallback(
    async (patch: { name?: string; onboarded?: boolean; defaultAgent?: string; avatarColor?: string }) => {
      const { user: u } = await postJSON("/api/account", patch);
      setUser(u);
    },
    []
  );

  const upgrade = useCallback(async (plan: Plan) => {
    if (plan === "free") return;
    const order = await postJSON("/api/razorpay/checkout", { plan });
    if (order.id) {
      const params = new URLSearchParams({
        order_id: order.id,
        key: order.key,
        amount: String(order.amount),
        currency: order.currency || "INR",
        name: order.name || "Incogni AI",
        description: order.description || `${plan} plan`,
        email: order.prefill?.email || "",
        callback: `${window.location.origin}/razorpay/success?order_id=${order.id}&plan=${plan}`,
      });
      window.location.href = `/razorpay/checkout?${params}`;
    }
  }, []);

  const downgrade = useCallback(async () => {
    const data = await postJSON("/api/razorpay/downgrade");
    setUser(data.user);
    return { refunded: !!data.refunded, canceled: !!data.canceled };
  }, []);

  const deleteAccount = useCallback(async () => {
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Could not delete account.");
    }
    setUser(null);
    useIncogniStore.getState().setThreads([]);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      caps: effectiveCaps(user?.plan ?? "free"),
      refresh,
      login,
      register,
      loginWithGoogle,
      logout,
      updateAccount,
      upgrade,
      downgrade,
      deleteAccount,
      verify2FA,
    }),
    [user, loading, refresh, login, register, loginWithGoogle, logout, updateAccount, upgrade, downgrade, deleteAccount, verify2FA]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
