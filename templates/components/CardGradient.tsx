// @ts-nocheck
// Template ID: card-gradient
"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CardGradientProps extends import("@/templates/utils/types").MotionDivProps {
  children: ReactNode;
  gradientColors?: string[];
}

export function CardGradient({
  children,
  className,
  gradientColors = ["#10a37f", "#3b82f6"],
  ...rest
}: CardGradientProps) {
  return (
    <div className={cn("relative rounded-xl p-[2px] overflow-hidden", className)} {...rest}>
      <motion.div
        className="absolute inset-0 rounded-xl"
        style={{ background: `linear-gradient(135deg, ${gradientColors.join(", ")})` }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <div
        className="relative rounded-xl bg-[#2f2f2f] p-6 h-full"
        style={{ backgroundClip: "padding-box" }}
      >
        {children}
      </div>
    </div>
  );
}
