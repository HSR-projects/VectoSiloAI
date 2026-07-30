"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Loader2,
  Globe,
  Code2,
  GraduationCap,
  Bot,
  Sparkles,
} from "lucide-react";
import type { FocusMode, Plan } from "@/types";
import { useAuth } from "./AuthProvider";
import { useIncogniStore } from "@/lib/store";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

const AGENTS: {
  id: string;
  label: string;
  desc: string;
  icon: typeof Globe;
  focus: FocusMode;
  pro?: boolean;
}[] = [
  { id: "balanced", label: "Balanced", desc: "Searches the web only when needed", icon: Globe, focus: "all" },
  { id: "researcher", label: "Deep Researcher", desc: "Autonomous multi-step research", icon: Bot, focus: "all", pro: true },
  { id: "coder", label: "Coder", desc: "Tuned for programming & artifacts", icon: Code2, focus: "code" },
  { id: "academic", label: "Academic", desc: "Structured, carefully cited", icon: GraduationCap, focus: "academic" },
];

export function Onboarding() {
  const { user, updateAccount, upgrade } = useAuth();
  const setFocusMode = useIncogniStore((s) => s.setFocusMode);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [agent, setAgent] = useState("balanced");
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    const chosen = AGENTS.find((a) => a.id === agent);
    if (chosen) setFocusMode(chosen.focus);
    try {
      await updateAccount({ name: name.trim() || user?.name, dateOfBirth, gender, onboarded: true, defaultAgent: agent });
    } catch {
      setBusy(false);
    }
  };

  const choosePlan = async (plan: Plan) => {
    if (plan === "free" || plan === user?.plan) return;
    setBusy(true);
    try {
      await upgrade(plan);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="incogni-hero-glow flex min-h-dvh items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl rounded-2xl border border-incogni-border bg-incogni-surface/70 p-6 backdrop-blur-xl sm:p-8"
      >
        {/* Progress */}
        <div className="mb-6 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-incogni-accent" : "bg-incogni-border"
              )}
            />
          ))}
        </div>

        {step === 0 && (
          <Step
            title={`Welcome${user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋`}
            subtitle="Let's set up Incogni AI in a few seconds."
          >
            <div className="space-y-4 mb-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-incogni-muted">
                  Display name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-incogni-border bg-incogni-bg px-3 py-2.5 text-sm text-incogni-text placeholder:text-incogni-muted/60 focus:border-incogni-accent/50 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-incogni-muted">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-lg border border-incogni-border bg-incogni-bg px-3 py-2.5 text-sm text-incogni-text placeholder:text-incogni-muted/60 focus:border-incogni-accent/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-incogni-muted">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-lg border border-incogni-border bg-incogni-bg px-3 py-2.5 text-sm text-incogni-text focus:border-incogni-accent/50 focus:outline-none"
                >
                  <option value="" disabled>Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
            <NextButton onClick={() => setStep(1)} disabled={!name || !dateOfBirth || !gender}>Continue</NextButton>
          </Step>
        )}

        {step === 1 && (
          <Step title="Pick your default agent" subtitle="You can change this anytime.">
            <div className="grid gap-2 sm:grid-cols-2">
              {AGENTS.map((a) => {
                const Icon = a.icon;
                const active = agent === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setAgent(a.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                      active
                        ? "border-incogni-accent/60 bg-incogni-accent/10"
                        : "border-incogni-border bg-incogni-bg hover:bg-incogni-surface-2"
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-incogni-accent" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-incogni-text">
                        {a.label}
                        {a.pro && (
                          <span className="rounded bg-incogni-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-incogni-accent-soft">
                            Pro
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-incogni-muted">{a.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <NextButton onClick={() => setStep(2)}>Continue</NextButton>
          </Step>
        )}

        {step === 2 && (
          <Step title="Choose a plan" subtitle="Upgrade is instant — no card required.">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PLANS.map((p) => {
                const current = user?.plan === p.id;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex flex-col rounded-xl border p-3",
                      p.highlight
                        ? "border-incogni-accent/50 bg-incogni-accent/[0.07]"
                        : "border-incogni-border bg-incogni-bg"
                    )}
                  >
                    <p className="text-sm font-semibold text-incogni-text">{p.name}</p>
                    <p className="mt-0.5 text-lg font-bold text-incogni-text">
                      {p.price}
                      <span className="text-xs font-normal text-incogni-muted">
                        {p.period}
                      </span>
                    </p>
                    <button
                      disabled={busy || current || p.id === "free"}
                      onClick={() => choosePlan(p.id)}
                      className={cn(
                        "mt-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                        current
                          ? "bg-incogni-surface-2 text-incogni-muted"
                          : p.id === "free"
                            ? "bg-incogni-surface-2 text-incogni-muted"
                            : "bg-incogni-accent text-black hover:bg-incogni-accent-soft"
                      )}
                    >
                      {current ? "Selected" : p.id === "free" ? "Default" : `Get ${p.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={finish}
              disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-incogni-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-incogni-accent-soft disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Start using Incogni AI
            </button>
          </Step>
        )}
      </motion.div>
    </div>
  );
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      <h2 className="text-xl font-semibold text-incogni-text">{title}</h2>
      <p className="mb-5 mt-1 text-sm text-incogni-muted">{subtitle}</p>
      {children}
    </motion.div>
  );
}

function NextButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-incogni-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-incogni-accent-soft disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}
