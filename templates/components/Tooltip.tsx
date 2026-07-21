// @ts-nocheck
// Template ID: ui-tooltip
"use client";

import { useState, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 300,
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-vectosilo-border border-r-vectosilo-border border-t-vectosilo-surface border-l-transparent border-r-transparent",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-l-vectosilo-border border-r-vectosilo-border border-b-vectosilo-surface border-l-transparent border-r-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-t-vectosilo-border border-b-vectosilo-border border-l-vectosilo-surface border-t-transparent border-b-transparent",
    right:
      "right-full top-1/2 -translate-y-1/2 border-t-vectosilo-border border-b-vectosilo-border border-r-vectosilo-surface border-t-transparent border-b-transparent",
  };

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "pointer-events-none absolute z-50 whitespace-nowrap",
              positionClasses[position]
            )}
          >
            <div className="rounded-lg border border-vectosilo-border bg-vectosilo-surface px-3 py-1.5 text-xs font-medium text-vectosilo-text shadow-lg">
              {content}
            </div>
            <div
              className={cn(
                "absolute h-0 w-0 border-4",
                arrowClasses[position]
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
