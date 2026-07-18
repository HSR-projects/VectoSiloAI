// @ts-nocheck
// Template ID: feedback-progress
"use client";

import { type HTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ProgressVariant = "default" | "success" | "warning" | "error";
type ProgressSize = "sm" | "md" | "lg";

interface ProgressProps extends import("@/templates/utils/types").MotionDivProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  label?: string;
  showValue?: boolean;
}

const barColors: Record<ProgressVariant, string> = {
  default: "bg-[#10a37f]",
  success: "bg-[#10a37f]",
  warning: "bg-[#f59e0b]",
  error: "bg-[#ef4444]",
};

const trackSizes: Record<ProgressSize, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const stripeStyle = {
  backgroundImage:
    "linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)",
  backgroundSize: "1rem 1rem",
};

export function Progress({
  value,
  max = 100,
  variant = "default",
  size = "md",
  label,
  showValue = false,
  className,
  ...rest
}: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)} {...rest}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-sm text-[#8e8e93]">{label}</span>
          )}
          {showValue && (
            <span className="text-sm text-[#8e8e93] font-mono">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-[#2f2f2f] overflow-hidden",
          trackSizes[size]
        )}
      >
        <motion.div
          className={cn(
            "h-full rounded-full relative",
            barColors[variant]
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={pct > 0 && pct < 100 ? stripeStyle : undefined}
        >
          {pct > 0 && pct < 100 && (
            <motion.div
              className="absolute inset-0"
              animate={{ backgroundPosition: ["0 0", "1rem 0"] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                ...stripeStyle,
                borderRadius: "inherit",
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
