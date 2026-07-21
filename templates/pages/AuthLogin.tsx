// @ts-nocheck
// Template ID: page-auth-login
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputAnimated } from "../components/InputAnimated";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { CheckboxAnimated } from "../components/CheckboxAnimated";
import { PageTransition } from "../components/PageTransition";
import { Spinner } from "../components/Spinner";

export function AuthLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="flex min-h-screen bg-vectosilo-bg">
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-vectosilo-accent/20 via-vectosilo-surface to-vectosilo-bg" />
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-vectosilo-accent/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-vectosilo-accent/5 blur-2xl" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-vectosilo-accent shadow-lg shadow-vectosilo-accent/30">
            <span className="text-2xl font-bold text-white">K</span>
          </div>
          <h1 className="text-4xl font-bold text-vectosilo-text">VectoSiloAI</h1>
          <p className="mt-3 text-lg text-vectosilo-muted">Intelligent automation platform<br />for modern teams</p>

          <div className="mt-12 flex items-center justify-center gap-4">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                className={cn(
                  "h-3 w-3 rounded-full",
                  i % 2 === 0 ? "bg-vectosilo-accent" : "bg-vectosilo-accent/40"
                )}
              />
            ))}
          </div>

          <div className="mt-8 flex justify-center gap-8">
            {[
              { shape: "rounded-full", bg: "bg-vectosilo-accent/20", delay: 0.5 },
              { shape: "rotate-45", bg: "bg-blue-500/20", delay: 0.7 },
              { shape: "rounded-xl", bg: "bg-purple-500/20", delay: 0.9 },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: item.delay, duration: 0.5 }}
                className={cn("h-12 w-12", item.shape, item.bg)}
              />
            ))}
          </div>
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
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-vectosilo-accent">
                <span className="text-xl font-bold text-white">K</span>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-vectosilo-text">Welcome Back</h2>
              <p className="mt-1 text-sm text-vectosilo-muted">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <InputAnimated
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={16} />}
                required
              />

              <InputAnimated
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={16} />}
                required
                className="[&_input]:pr-10"
              />

              <div className="flex items-center justify-between">
                <ToggleSwitch
                  label="Remember me"
                  checked={remember}
                  onChange={setRemember}
                  size="sm"
                />
                <a href="#" className="text-xs text-vectosilo-accent hover:underline">Forgot password?</a>
              </div>

              <CheckboxAnimated
                label="I agree to the Terms and Conditions"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-vectosilo-accent py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Spinner size="sm" variant="white" /> : "Sign In"}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-vectosilo-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-vectosilo-bg px-2 text-vectosilo-muted">Or continue with</span>
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
                    "flex items-center justify-center gap-2 rounded-lg border border-vectosilo-border bg-vectosilo-surface py-2.5 text-sm text-vectosilo-muted transition-colors",
                    btn.color
                  )}
                >
                  {btn.icon}
                </button>
              ))}
            </div>

            <p className="text-center text-sm text-vectosilo-muted">
              Don&apos;t have an account?{" "}
              <a href="#" className="font-medium text-vectosilo-accent hover:underline">Sign up</a>
            </p>
          </motion.div>
        </PageTransition>
      </div>
    </div>
  );
}
