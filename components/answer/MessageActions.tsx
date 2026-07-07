"use client";

import { useEffect, useState } from "react";
import { Check, Copy, RefreshCw, ThumbsDown, ThumbsUp, Volume2, Square } from "lucide-react";
import type { Message } from "@/types";
import { useKodaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { speak, stopSpeaking } from "@/lib/tts";

/**
 * ChatGPT-style action row shown under an assistant answer:
 * copy · good/bad feedback · regenerate.
 */
export function MessageActions({
  threadId,
  message,
  onRegenerate,
}: {
  threadId: string;
  message: Message;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const updateMessage = useKodaStore((s) => s.updateMessage);
  const feedback = message.feedback;

  // Stop any playback if this message unmounts.
  useEffect(() => () => { if (speaking) stopSpeaking(); }, [speaking]);

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(message.content, {
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const setFeedback = (value: "up" | "down") =>
    updateMessage(threadId, message.id, {
      feedback: feedback === value ? undefined : value,
    });

  return (
    <div className="mt-1 flex items-center gap-0.5 text-koda-muted">
      <ActionButton label={copied ? "Copied" : "Copy"} onClick={copy}>
        {copied ? <Check className="h-4 w-4 text-koda-accent" /> : <Copy className="h-4 w-4" />}
      </ActionButton>

      <ActionButton
        label={speaking ? "Stop" : "Read aloud"}
        active={speaking}
        onClick={toggleSpeak}
      >
        {speaking ? (
          <Square className="h-4 w-4 fill-current text-koda-accent" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </ActionButton>

      <ActionButton
        label="Good response"
        active={feedback === "up"}
        onClick={() => setFeedback("up")}
      >
        <ThumbsUp className={cn("h-4 w-4", feedback === "up" && "fill-current text-koda-accent")} />
      </ActionButton>

      <ActionButton
        label="Bad response"
        active={feedback === "down"}
        onClick={() => setFeedback("down")}
      >
        <ThumbsDown
          className={cn("h-4 w-4", feedback === "down" && "fill-current text-red-400")}
        />
      </ActionButton>

      {onRegenerate && (
        <ActionButton label="Regenerate" onClick={onRegenerate}>
          <RefreshCw className="h-4 w-4" />
        </ActionButton>
      )}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-koda-surface-2 hover:text-koda-text",
        active && "text-koda-text"
      )}
    >
      {children}
    </button>
  );
}
