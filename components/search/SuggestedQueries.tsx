"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "Create a modern dashboard UI with charts and tables",
  "Write a Python script to analyze CSV data",
  "Explain quantum computing like I'm 10",
  "Design a REST API for a todo app",
  "Compare TypeScript vs Rust for web backends",
];

export function SuggestedQueries({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-wrap items-center justify-center gap-2"
    >
      <span className="inline-flex items-center gap-1 text-xs text-incogni-muted">
        <Sparkles className="h-3.5 w-3.5" /> Try
      </span>
      {SUGGESTIONS.map((s, i) => (
        <motion.button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 + i * 0.05 }}
          className="rounded-full border border-incogni-border bg-incogni-surface px-3 py-1.5 text-xs text-incogni-muted transition-colors hover:border-incogni-accent/40 hover:bg-incogni-surface-2 hover:text-incogni-text"
        >
          {s}
        </motion.button>
      ))}
    </motion.div>
  );
}
