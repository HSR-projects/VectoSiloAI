// @ts-nocheck
// Template ID: page-auth-register
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputAnimated } from "../components/InputAnimated";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { CheckboxAnimated } from "../components/CheckboxAnimated";
import { PageTransition } from "../components/PageTransition";
import { Progress } from "../components/Progress";

function getPasswordStrength(pw: string): { score: number; label: string; variant: "error" | "warning" | "success" } {
  let score = 0;
  if (pw.length >= 6) score += 25;
  if (pw.length >= 10) score += 15;
  if (/[A-Z]/.test(pw)) score += 20;
  if (/[a-z]/.test(pw)) score += 10;
  if (/[0-9]/.test(pw)) score += 15;
  if (/[^A-Za-z0-9]/.test(pw)) score += 15;

  let label: string;
  let variant: "error" | "warning" | "success";
  if (score < 30) { label = "Weak"; variant = "error"; }
  else if (score < 60) { label = "Medium"; variant = "warning"; }
  else { label = "Strong"; variant = "success"; }

  return { score, label, variant };
}

export function AuthRegister() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updates, setUpdates] = useState(false);
  const [agree, setAgree] = useState(false);
  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

  return (
    <div className="flex min-h-screen bg-incogni-bg">
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-incogni-surface to-incogni-bg" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-incogni-accent/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-incogni-accent shadow-lg">
            <span className="text-2xl font-bold text-white">K</span>
          </div>
          <h1 className="text-4xl font-bold text-incogni-text">Join IncogniAI</h1>
          <p className="mt-3 text-lg text-incogni-muted">Create your account and start<br />building amazing things</p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-12 space-y-4"
          >
            {[
              "Collaborate with your team in real-time",
              "Powerful automation tools at your fingertips",
              "Enterprise-grade security & reliability",
            ].map((text, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.15 }}
                className="flex items-center gap-3 text-sm text-incogni-muted"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-incogni-accent" />
                {text}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
        <PageTransition className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="text-center lg:hidden">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-incogni-accent">
                <span className="text-xl font-bold text-white">K</span>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-incogni-text">Create Account</h2>
              <p className="mt-1 text-sm text-incogni-muted">Get started with your free account</p>
            </div>

            <form className="space-y-4">
              <InputAnimated
                label="Full name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                icon={<User size={16} />}
                required
              />

              <InputAnimated
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={16} />}
                required
              />

              <div>
                <InputAnimated
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock size={16} />}
                  required
                />
                {password && (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-incogni-muted">Password strength</span>
                      <span className={cn(
                        "text-xs font-medium",
                        strength.variant === "error" && "text-red-400",
                        strength.variant === "warning" && "text-yellow-400",
                        strength.variant === "success" && "text-green-400"
                      )}>
                        {strength.label}
                      </span>
                    </div>
                    <Progress value={strength.score} max={100} variant={strength.variant} size="sm" />
                  </div>
                )}
              </div>

              <InputAnimated
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock size={16} />}
                error={confirmPassword && !passwordsMatch ? "Passwords do not match" : undefined}
                required
              />

              <ToggleSwitch
                label="Send me product updates"
                checked={updates}
                onChange={setUpdates}
                size="sm"
              />

              <CheckboxAnimated
                label="I agree to the Terms & Privacy Policy"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />

              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-incogni-accent py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Create Account
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-incogni-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-incogni-bg px-2 text-incogni-muted">Or register with</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: "G", label: "Google", color: "hover:bg-red-500/10 hover:text-red-400" },
                { icon: <Github size={18} />, label: "GitHub", color: "hover:bg-gray-500/10 hover:text-gray-300" },
                { icon: "X", label: "Twitter", color: "hover:bg-blue-500/10 hover:text-blue-400" },
              ].map((btn) => (
                <button
                  key={btn.label}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border border-incogni-border bg-incogni-surface py-2.5 text-sm text-incogni-muted transition-colors",
                    btn.color
                  )}
                >
                  {btn.icon}
                </button>
              ))}
            </div>

            <p className="text-center text-sm text-incogni-muted">
              Already have an account?{" "}
              <a href="#" className="font-medium text-incogni-accent hover:underline">Sign in</a>
            </p>
          </motion.div>
        </PageTransition>
      </div>
    </div>
  );
}
