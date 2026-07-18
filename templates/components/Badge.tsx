// @ts-nocheck
// Template ID: feedback-badge
"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info";
type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[#2f2f2f] text-[#ececec] border-[#424242]",
  success: "bg-[#10a37f]/15 text-[#10a37f] border-[#10a37f]/30",
  warning: "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30",
  error: "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30",
  info: "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-[#8e8e93]",
  success: "bg-[#10a37f]",
  warning: "bg-[#f59e0b]",
  error: "bg-[#ef4444]",
  info: "bg-[#3b82f6]",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-2.5 py-1 text-sm gap-1.5",
  lg: "px-3 py-1.5 text-base gap-2",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  removable = false,
  onRemove,
  className,
  ...rest
}: BadgeProps) {
  const [removed, setRemoved] = useState(false);

  if (removed) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "inline-flex items-center rounded-full border font-medium",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...rest}
      >
        {dot && (
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              dotColors[variant]
            )}
          />
        )}
        <span>{children}</span>
        {removable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRemoved(true);
              onRemove?.();
            }}
            className="hover:opacity-70 transition-opacity"
          >
            <X className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
          </button>
        )}
      </motion.span>
    </AnimatePresence>
  );
}
