// @ts-nocheck
// Template ID: page-auth-2fa
"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Shield, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckboxAnimated } from "../components/CheckboxAnimated";
import { TextareaAnimated } from "../components/TextareaAnimated";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { PageTransition } from "../components/PageTransition";

export function AuthTwoFactor() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [remember, setRemember] = useState(false);
  const [timer, setTimer] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-vectosilo-bg px-4">
      <PageTransition className="w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-vectosilo-accent to-blue-500 shadow-lg"
            >
              <Shield size={24} className="text-white" />
            </motion.div>
            <h2 className="text-xl font-bold text-vectosilo-text">Two-Factor Authentication</h2>
            <p className="mt-1 text-sm text-vectosilo-muted">
              Enter the authentication code from your app
            </p>
          </div>

          {!useRecovery ? (
            <div className="space-y-6">
              <div
                className="flex justify-center gap-3"
                onPaste={handlePaste}
              >
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className={cn(
                      "h-14 w-11 rounded-lg border text-center text-xl font-bold text-vectosilo-text outline-none transition-all",
                      "bg-vectosilo-surface border-vectosilo-border",
                      "focus:border-vectosilo-accent focus:ring-1 focus:ring-vectosilo-accent"
                    )}
                  />
                ))}
              </div>

              <button
                disabled={code.some((d) => !d)}
                className="flex w-full items-center justify-center rounded-lg bg-vectosilo-accent py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Verify
              </button>

              <div className="text-center">
                <button
                  onClick={() => {
                    setUseRecovery(true);
                    setTimer(30);
                  }}
                  className="text-sm text-vectosilo-accent hover:underline"
                >
                  Use recovery code instead
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <TextareaAnimated
                label="Recovery code"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="Enter your recovery code"
              />
              <button className="flex w-full items-center justify-center rounded-lg bg-vectosilo-accent py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
                Verify Recovery Code
              </button>
              <div className="text-center">
                <button
                  onClick={() => setUseRecovery(false)}
                  className="text-sm text-vectosilo-accent hover:underline"
                >
                  Back to authentication code
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <CheckboxAnimated
              label="Remember this device for 30 days"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
          </div>

          <div className="text-center">
            <button className="inline-flex items-center gap-1.5 text-sm text-vectosilo-muted transition-colors hover:text-vectosilo-text">
              <RefreshCw size={14} />
              Resend code in {timer}s
            </button>
          </div>

          <p className="text-center text-sm text-vectosilo-muted">
            <a href="#" className="font-medium text-vectosilo-accent hover:underline">Back to login</a>
          </p>
        </motion.div>
      </PageTransition>
    </div>
  );
}
