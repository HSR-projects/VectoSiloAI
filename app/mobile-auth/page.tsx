"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Bot, Check } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MobileAuthPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!user) return null; // AuthGate handles this

  const handleAuthorize = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mobile-auth", { method: "POST" });
      const { token } = await res.json();
      if (token) {
        // Redirect to the mobile app using the deep link scheme
        window.location.href = `vectosiloai://auth?token=${token}`;
      } else {
        alert("Failed to generate token.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to authorize.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-vectosilo-bg px-4 fixed top-0 left-0 z-50">
      <div className="w-full max-w-md rounded-2xl border border-vectosilo-border bg-vectosilo-surface p-8 text-center shadow-xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-vectosilo-accent/10">
          <Bot className="h-10 w-10 text-vectosilo-accent" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-vectosilo-text">Authorize VectoSiloAI Mobile</h1>
        <p className="mb-8 text-sm text-vectosilo-muted">
          The VectoSiloAI mobile app is requesting access to your account (<b>{user.name}</b>). This will allow the app to sync your chats.
        </p>
        
        <button
          onClick={handleAuthorize}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-vectosilo-accent px-4 py-3 font-medium text-white transition-colors hover:bg-vectosilo-accent/90 disabled:opacity-50"
        >
          {loading ? (
            "Authorizing..."
          ) : (
            <>
              <Check className="h-5 w-5" />
              Approve Access
            </>
          )}
        </button>
        <button
          onClick={() => router.push("/")}
          disabled={loading}
          className="mt-4 w-full rounded-xl px-4 py-3 font-medium text-vectosilo-muted transition-colors hover:bg-vectosilo-surface-2 hover:text-vectosilo-text disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
