// @ts-nocheck
// Template ID: animate-drawer
"use client";

import { forwardRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AnimatedDrawerProps extends import("@/templates/utils/types").MotionDivProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  width?: string;
}

export const AnimatedDrawer = forwardRef<HTMLDivElement, AnimatedDrawerProps>(
  (
    { open, onClose, children, className, side = "right", width = "w-80", ...rest },
    ref
  ) => {
    useEffect(() => {
      if (open) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
      return () => {
        document.body.style.overflow = "";
      };
    }, [open]);

    const slideFrom = side === "right" ? { x: "100%" } : { x: "-100%" };
    const slideTo = { x: 0 };

    return (
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              ref={ref}
              className={cn(
                "fixed top-0 bottom-0 flex flex-col border-vectosilo-border bg-vectosilo-surface shadow-xl",
                side === "right" ? "right-0 border-l" : "left-0 border-r",
                width,
                className
              )}
              initial={slideFrom}
              animate={slideTo}
              exit={slideFrom}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              {...rest}
            >
              <div className="flex items-center justify-end p-4">
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-vectosilo-muted transition-colors hover:bg-vectosilo-surface-2 hover:text-vectosilo-text"
                  aria-label="Close drawer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }
);

AnimatedDrawer.displayName = "AnimatedDrawer";
