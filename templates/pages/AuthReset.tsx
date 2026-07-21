// @ts-nocheck
// Template ID: page-auth-reset
"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputAnimated } from "../components/InputAnimated";
import { PageTransition } from "../components/PageTransition";

export function AuthReset() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-vectosilo-bg px-4">
      <PageTransition className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-vectosilo-accent shadow-lg shadow-vectosilo-accent/30">
                  <span className="text-xl font-bold text-white">K</span>
                </div>
                <h2 className="text-2xl font-bold text-vectosilo-text">Reset Password</h2>
                <p className="mt-1 text-sm text-vectosilo-muted">Enter your email and we&apos;ll send you a reset link</p>
              </div>

              <InputAnimated
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={16} />}
                required
              />

              <button
                onClick={() => setStep(2)}
                className="flex w-full items-center justify-center rounded-lg bg-vectosilo-accent py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Send Reset Link
              </button>

              <p className="text-center text-sm text-vectosilo-muted">
                <a href="#" className="inline-flex items-center gap-1 font-medium text-vectosilo-accent hover:underline">
                  <ArrowLeft size={14} />
                  Back to login
                </a>
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-vectosilo-accent/20"
                >
                  <Mail size={28} className="text-vectosilo-accent" />
                </motion.div>
                <h2 className="text-2xl font-bold text-vectosilo-text">Check your email</h2>
                <p className="mt-1 text-sm text-vectosilo-muted">
                  We sent a 6-digit code to <span className="font-medium text-vectosilo-text">{email || "your email"}</span>
                </p>
              </div>

              <div className="flex justify-center gap-2">
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
                      "h-12 w-10 rounded-lg border text-center text-lg font-bold text-vectosilo-text outline-none transition-all",
                      "bg-vectosilo-surface border-vectosilo-border",
                      "focus:border-vectosilo-accent focus:ring-1 focus:ring-vectosilo-accent"
                    )}
                  />
                ))}
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={code.some((d) => !d)}
                className="flex w-full items-center justify-center rounded-lg bg-vectosilo-accent py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Verify Code
              </button>

              <p className="text-center text-sm text-vectosilo-muted">
                Didn&apos;t receive the code?{" "}
                <button className="font-medium text-vectosilo-accent hover:underline">Resend</button>
              </p>

              <p className="text-center text-sm text-vectosilo-muted">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 font-medium text-vectosilo-accent hover:underline"
                >
                  <ArrowLeft size={14} />
                  Change email
                </button>
              </p>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20"
                >
                  <CheckCircle size={28} className="text-green-500" />
                </motion.div>
                <h2 className="text-2xl font-bold text-vectosilo-text">Set New Password</h2>
                <p className="mt-1 text-sm text-vectosilo-muted">Choose a strong password for your account</p>
              </div>

              <InputAnimated
                label="New password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={<Lock size={16} />}
                required
              />

              <InputAnimated
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock size={16} />}
                error={confirmPassword && newPassword !== confirmPassword ? "Passwords do not match" : undefined}
                required
              />

              <button
                className="flex w-full items-center justify-center rounded-lg bg-vectosilo-accent py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Reset Password
              </button>

              <p className="text-center text-sm text-vectosilo-muted">
                <a href="#" className="inline-flex items-center gap-1 font-medium text-vectosilo-accent hover:underline">
                  <ArrowLeft size={14} />
                  Back to login
                </a>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </PageTransition>
    </div>
  );
}
