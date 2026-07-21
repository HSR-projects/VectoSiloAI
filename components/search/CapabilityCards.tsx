"use client";

import { motion } from "framer-motion";

const CAPABILITIES = [
  {
    icon: "📊",
    title: "Presentations",
    desc: "Generate full slide decks with custom themes",
    prompt: "Create a 10-slide presentation about the future of renewable energy",
  },
  {
    icon: "🌐",
    title: "Websites",
    desc: "Build and preview sites with the web artifact",
    prompt: "Build a personal portfolio website with HTML, CSS, and JS",
  },
  {
    icon: "📝",
    title: "Documents",
    desc: "Write reports, essays, and technical docs",
    prompt: "Write a comprehensive guide to machine learning fundamentals",
  },
  {
    icon: "💻",
    title: "Code",
    desc: "Generate code snippets and full programs",
    prompt: "Create a Python script that scrapes news headlines and sends a daily email digest",
  },
  {
    icon: "🎨",
    title: "Images",
    desc: "Generate images with FLUX.1-dev AI",
    prompt: "Generate an image of a futuristic city skyline at sunset with flying cars",
  },
  {
    icon: "🧠",
    title: "Research",
    desc: "Deep research with web augmentation",
    prompt: "Research the latest advancements in solid-state batteries and summarize findings",
  },
];

export function CapabilityCards({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="mt-10">
      <p className="mb-4 text-center text-xs font-medium uppercase tracking-wider text-vectosilo-muted">
        What can I help you build?
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CAPABILITIES.map((c, i) => (
          <motion.button
            key={c.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.05 }}
            onClick={() => onSelect(c.prompt)}
            className="group flex flex-col items-start gap-2 rounded-xl border border-vectosilo-border bg-vectosilo-surface/50 p-4 text-left transition-all hover:border-vectosilo-accent/30 hover:bg-vectosilo-surface-2 hover:shadow-lg"
          >
            <span className="text-xl">{c.icon}</span>
            <span className="text-sm font-medium text-vectosilo-text group-hover:text-vectosilo-accent-soft">
              {c.title}
            </span>
            <span className="text-xs leading-relaxed text-vectosilo-muted">{c.desc}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
