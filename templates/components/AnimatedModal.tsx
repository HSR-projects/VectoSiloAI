// @ts-nocheck
// Template ID: animate-modal
"use client";

import { forwardRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AnimatedModalProps extends import("@/templates/utils/types").MotionDivProps {
  open: boolean;
  onClose: () => void;
  title?: string;
}

export const AnimatedModal = forwardRef<HTMLDivElement, AnimatedModalProps>(
  ({ open, onClose, children, className, title, ...rest }, ref) => {
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

    return (
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
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
                "relative z-10 w-full max-w-lg rounded-2xl border border-vectosilo-border bg-vectosilo-surface p-6 shadow-xl",
                className
              )}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              {...rest}
            >
              <div className="mb-4 flex items-center justify-between">
                {title && (
                  <h2 className="text-lg font-semibold text-vectosilo-text">
                    {title}
                  </h2>
                )}
                <button
                  onClick={onClose}
                  className="ml-auto rounded-lg p-1.5 text-vectosilo-muted transition-colors hover:bg-vectosilo-surface-2 hover:text-vectosilo-text"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }
);

AnimatedModal.displayName = "AnimatedModal";
