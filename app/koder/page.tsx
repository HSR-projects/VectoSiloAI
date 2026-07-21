"use client";

import { useState } from "react";
import {
  Terminal, Code2, Shield, GitBranch, Cpu, CheckCircle2,
  Copy, Check, Download, ArrowRight, Star, Layers, Bot, KeyRound, Lock,
} from "lucide-react";
import Link from "next/link";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy} className="ml-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-sm flex items-center justify-between group">
      <span className="text-emerald-400">{code}</span>
      <CopyButton text={code} />
    </div>
  );
}

const PLANS = [
  {
    name: "VectoSiloAI sign-in",
    price: "Included",
    period: "requires Pro or Max",
    color: "emerald",
    description: "Use your VectoSiloAI subscription from the local CLI.",
    features: [
      "80 AI requests per 5-hour window",
      "Auto-refills every 5 hours",
      "Secure browser sign-in",
      "Short-lived one-time login code",
      "Auto Mode & Ask Manually modes",
      "File read/write/edit tools",
      "Shell command execution",
      "VectoSiloAI models only",
    ],
    cta: "See login command",
    href: "#quick-start",
  },
  {
    name: "VectoSiloAI API key",
    price: "Credit capped",
    period: "pay from prepaid credits",
    color: "blue",
    highlight: true,
    description: "For CLI, CI, and scripted coding work with a per-key budget.",
    features: [
      "Per-key credit limit",
      "VectoSiloAI API key authentication",
      "Spend visible in developer console",
      "Works without browser login",
      "Usage tracked in /developers dashboard",
      "Suitable for CI/CD pipelines",
      "VectoSiloAI models only",
    ],
    cta: "Get API key",
    href: "/developers",
  },
];

const MODES = [
  {
    name: "Auto Mode",
    icon: <Bot className="h-5 w-5" />,
    color: "emerald",
    description:
      "Koder acts autonomously — reads files, writes code, runs commands, and iterates without asking. Best for clear, well-scoped tasks.",
    flag: "--auto",
  },
  {
    name: "Ask Manually",
    icon: <Shield className="h-5 w-5" />,
    color: "blue",
    description:
      "Koder proposes each action and waits for your approval before executing. Full control over every file write and shell command.",
    flag: "--ask",
  },
  {
    name: "Locked-down auth",
    icon: <Lock className="h-5 w-5" />,
    color: "amber",
    description:
      "Koder connects only through chat.hsrprojects.org using a VectoSiloAI subscription session or a capped VectoSiloAI API key.",
    flag: "login",
  },
];

const FEATURES = [
  { icon: <Terminal className="h-5 w-5" />, title: "Terminal IDE", desc: "Full terminal interface with syntax-aware file editing, diff previews, and shell integration." },
  { icon: <Code2 className="h-5 w-5" />, title: "Codebase-aware", desc: "Reads your project structure, imports, and context before making changes." },
  { icon: <GitBranch className="h-5 w-5" />, title: "Git-integrated", desc: "Understands your git state, suggests commits, and can create branches." },
  { icon: <Cpu className="h-5 w-5" />, title: "VectoSiloAI powered", desc: "Backed by VectoSiloAI models through chat.hsrprojects.org — fast, grounded, and capable." },
  { icon: <Layers className="h-5 w-5" />, title: "Multi-file edits", desc: "Refactors across multiple files in a single pass with atomic rollback." },
  { icon: <Star className="h-5 w-5" />, title: "Local-first", desc: "Runs on your machine. Koder sends prompts to VectoSiloAI and keeps auth scoped to your account or key budget." },
];

export default function KoderPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          ← VectoSiloAI
        </Link>
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-emerald-400" />
          <span className="font-bold">Koder</span>
          <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">beta</span>
        </div>
        <Link href="/developers" className="text-sm text-gray-400 hover:text-white transition-colors">
          API Keys →
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20 space-y-28">

        {/* Hero */}
        <section className="text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm">
            <Terminal className="h-4 w-4" />
            VectoSiloAI coding agent for your terminal
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">
            Meet <span className="text-emerald-400">Koder</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            A local terminal agent for real code changes, connected only to VectoSiloAI. Sign in with a subscription or use a capped VectoSiloAI API key.
          </p>
          <div className="mx-auto grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <Shield className="mb-2 h-5 w-5 text-emerald-400" />
              <p className="text-sm font-semibold">Secure sign-in</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">Browser sign-in uses chat.hsrprojects.org and requires an active VectoSiloAI subscription.</p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
              <KeyRound className="mb-2 h-5 w-5 text-blue-400" />
              <p className="text-sm font-semibold">Budgeted API keys</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">Create keys in Developers and set exactly how many credits each key can spend.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="w-full sm:w-auto">
              <CodeBlock code="npm install -g @vectosiloai/koder" />
            </div>
            <Link
              href="/developers"
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-semibold transition-colors"
            >
              Get API key <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Quick start */}
        <section id="quick-start" className="space-y-6">
          <h2 className="text-2xl font-bold">Quick start</h2>
          <div className="space-y-3">
            {[
              { step: "1", label: "Install", code: "npm install -g @vectosiloai/koder" },
              { step: "2", label: "Login with a VectoSiloAI subscription or capped API key", code: "koder login  # or: koder login --key sk-vectosilo-..." },
              { step: "3", label: "Open your project and start coding", code: "cd my-project && koder" },
            ].map(({ step, label, code }) => (
              <div key={step} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {step}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-gray-400">{label}</p>
                  <CodeBlock code={code} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Modes */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Three modes, your choice</h2>
            <p className="text-gray-400 mt-1">Control how much autonomy Koder has over your codebase and account spend.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {MODES.map((m) => (
              <div
                key={m.name}
                className={`bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4 hover:border-${m.color}-500/30 transition-colors`}
              >
                <div className={`w-10 h-10 rounded-xl bg-${m.color}-500/15 border border-${m.color}-500/25 flex items-center justify-center text-${m.color}-400`}>
                  {m.icon}
                </div>
                <div>
                  <h3 className="font-bold">{m.name}</h3>
                  <p className="text-sm text-gray-400 mt-1 leading-relaxed">{m.description}</p>
                </div>
                <code className={`text-xs bg-black/40 px-3 py-1.5 rounded-lg font-mono text-${m.color}-400`}>
                  {m.flag === "login" ? "koder login" : `koder ${m.flag}`}
                </code>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Built for real work</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3">
                <div className="text-emerald-400">{f.icon}</div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Plans */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Choose your plan</h2>
            <p className="text-gray-400 mt-1">Use a VectoSiloAI subscription or a VectoSiloAI API key with a credit limit.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative bg-white/3 border rounded-2xl p-7 space-y-6 ${p.highlight ? "border-blue-500/40 ring-1 ring-blue-500/20" : "border-white/10"}`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-6 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                    Unlimited
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold">{p.name}</h3>
                  <p className={`text-2xl font-black mt-1 text-${p.color}-400`}>{p.price}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.period}</p>
                  <p className="text-sm text-gray-400 mt-2">{p.description}</p>
                </div>
                <ul className="space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className={`h-4 w-4 text-${p.color}-400 mt-0.5 flex-shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-colors ${
                    p.highlight
                      ? "bg-blue-500 hover:bg-blue-400 text-white"
                      : "bg-emerald-500 hover:bg-emerald-400 text-white"
                  }`}
                >
                  {p.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CLI reference */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">CLI reference</h2>
          <div className="bg-black/60 border border-white/10 rounded-2xl p-6 font-mono text-sm space-y-3">
            {[
              ["koder", "Start interactive session in current directory"],
              ["koder login", "Sign in through chat.hsrprojects.org"],
              ["koder login --key sk-vectosilo-…", "Authenticate with a capped VectoSiloAI API key"],
              ["koder --auto", "Auto mode — no confirmations"],
              ["koder --ask", "Ask manually before each action"],
              ["koder --model vectosilo", "Use a VectoSiloAI model"],
              ["koder status", "Show usage, quota, and auth info"],
              ["koder logout", "Sign out and clear credentials"],
            ].map(([cmd, desc]) => (
              <div key={cmd} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                <span className="text-emerald-400 whitespace-nowrap">{cmd}</span>
                <span className="text-gray-500 text-xs">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Download */}
        <section className="text-center space-y-6 py-10 border border-white/8 rounded-3xl bg-white/2">
          <Download className="h-10 w-10 text-emerald-400 mx-auto" />
          <h2 className="text-3xl font-black">Ready to code with AI?</h2>
          <p className="text-gray-400 max-w-md mx-auto">Install Koder in seconds. Connect through chat.hsrprojects.org with subscription sign-in or a VectoSiloAI API key.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto px-6">
            <div className="flex-1 w-full">
              <CodeBlock code="npm install -g @vectosiloai/koder" />
            </div>
            <Link
              href="/developers"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-semibold transition-colors whitespace-nowrap"
            >
              API keys →
            </Link>
          </div>
          <p className="text-xs text-gray-600">Requires Node.js 18+  ·  Works on Linux, macOS, Windows</p>
        </section>

      </div>
    </div>
  );
}
