"use client";

import React, { useState } from "react";
import { HelpCircle, Send, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuestionData {
  question?: string;
  prompt?: string;
  options?: string[];
}

export function QuestionCard({ data }: { data: QuestionData }) {
  const prompt = data.question || data.prompt || "Please clarify your preference:";
  const rawOptions = data.options || [];
  const options = rawOptions.length > 0 ? rawOptions : ["Option 1", "Option 2", "Option 3"];

  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (choice: string) => {
    if (submitted) return;
    const finalAnswer = choice.trim();
    if (!finalAnswer) return;
    setSubmitted(true);
    window.dispatchEvent(new CustomEvent("incogni:send-query", { detail: finalAnswer }));
  };

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-incogni-accent/40 bg-incogni-surface-2/95 p-4.5 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2.5 text-incogni-accent font-semibold text-sm mb-3">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>Clarifying Question</span>
      </div>

      <p className="text-sm font-medium text-incogni-text leading-relaxed mb-4">
        {prompt}
      </p>

      <div className="flex flex-col gap-2">
        {options.map((opt, idx) => {
          const isSelected = selected === opt;
          return (
            <button
              key={idx}
              type="button"
              disabled={submitted}
              onClick={() => {
                setSelected(opt);
                setCustomText("");
              }}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-all",
                isSelected
                  ? "border-incogni-accent bg-incogni-accent/15 text-incogni-text shadow-sm"
                  : "border-incogni-border bg-incogni-surface/70 text-incogni-text/90 hover:border-incogni-accent/40 hover:bg-incogni-surface"
              )}
            >
              <span>{opt}</span>
              {isSelected && <CheckCircle2 className="h-4 w-4 text-incogni-accent shrink-0" />}
            </button>
          );
        })}

        {/* Custom text option */}
        <div className="mt-1 flex flex-col gap-1.5">
          <div className="text-[11px] text-incogni-muted font-medium px-1">Or write your custom answer:</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              disabled={submitted}
              placeholder="Type your own response here…"
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value);
                setSelected(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customText.trim()) {
                  e.preventDefault();
                  handleSubmit(customText);
                }
              }}
              className="flex-1 rounded-xl border border-incogni-border bg-incogni-surface px-3.5 py-2 text-sm text-incogni-text placeholder:text-incogni-muted focus:border-incogni-accent/60 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={submitted || (!selected && !customText.trim())}
          onClick={() => handleSubmit(selected || customText)}
          className="flex items-center gap-2 rounded-xl bg-incogni-accent px-4 py-2 text-xs font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
        >
          {submitted ? (
            <span>Answer Submitted</span>
          ) : (
            <>
              <span>Submit Answer</span>
              <Send className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
