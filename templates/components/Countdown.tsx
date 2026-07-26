// @ts-nocheck
// Template ID: ui-countdown
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CountdownProps {
  targetDate: string | number | Date;
  onComplete?: () => void;
  className?: string;
  labels?: { days?: string; hours?: string; minutes?: string; seconds?: string };
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: number): TimeLeft {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function Countdown({
  targetDate,
  onComplete,
  className,
  labels = { days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds" },
}: CountdownProps) {
  const target = new Date(targetDate).getTime();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calcTimeLeft(target));

  const tick = useCallback(() => {
    const next = calcTimeLeft(target);
    setTimeLeft(next);
    if (next.days === 0 && next.hours === 0 && next.minutes === 0 && next.seconds === 0) {
      onComplete?.();
    }
  }, [target, onComplete]);

  useEffect(() => {
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  const segments: { label: string; value: number }[] = [
    { label: labels.days || "Days", value: timeLeft.days },
    { label: labels.hours || "Hours", value: timeLeft.hours },
    { label: labels.minutes || "Minutes", value: timeLeft.minutes },
    { label: labels.seconds || "Seconds", value: timeLeft.seconds },
  ];

  return (
    <div className={cn("flex items-center gap-3 sm:gap-4", className)}>
      {segments.map((seg) => (
        <div
          key={seg.label}
          className="flex flex-col items-center rounded-xl border border-incogni-border bg-incogni-surface px-4 py-3 sm:px-6 sm:py-4"
        >
          <motion.span
            key={seg.value}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-2xl font-bold text-incogni-text sm:text-3xl tabular-nums"
          >
            {String(seg.value).padStart(2, "0")}
          </motion.span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-incogni-muted sm:text-xs">
            {seg.label}
          </span>
        </div>
      ))}
    </div>
  );
}
