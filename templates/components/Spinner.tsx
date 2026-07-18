// @ts-nocheck
// Template ID: feedback-spinner
"use client";

import { type HTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";
type SpinnerVariant = "default" | "accent" | "white";

interface SpinnerProps extends import("@/templates/utils/types").MotionDivProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
}

const sizeMap: Record<SpinnerSize, { dimension: string; border: string }> = {
  sm: { dimension: "w-4 h-4", border: "border-2" },
  md: { dimension: "w-6 h-6", border: "border-2" },
  lg: { dimension: "w-10 h-10", border: "border-[3px]" },
};

const variantMap: Record<SpinnerVariant, string> = {
  default: "border-[#424242] border-t-[#10a37f]",
  accent: "border-[#10a37f]/30 border-t-[#10a37f]",
  white: "border-white/30 border-t-white",
};

export function Spinner({
  size = "md",
  variant = "default",
  label,
  className,
  ...rest
}: SpinnerProps) {
  const { dimension, border } = sizeMap[size];

  return (
    <div
      className={cn("flex items-center gap-3", className)}
      role="status"
      aria-label={label ?? "Loading"}
      {...rest}
    >
      <motion.div
        className={cn(
          "rounded-full",
          dimension,
          border,
          variantMap[variant]
        )}
        animate={{ rotate: 360 }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      {label && (
        <span className="text-sm text-[#8e8e93]">{label}</span>
      )}
    </div>
  );
}
