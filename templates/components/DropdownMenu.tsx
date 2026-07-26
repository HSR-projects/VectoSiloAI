// @ts-nocheck
// Template ID: ui-dropdown
"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DropdownItem {
  label: string;
  href?: string;
  icon?: ReactNode;
  divider?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  className?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = "start",
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className={cn(
                "absolute top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-incogni-border bg-incogni-surface p-1 shadow-2xl",
                align === "end" ? "right-0" : "left-0"
              )}
              onClick={() => setOpen(false)}
            >
              {items.map((item, i) => (
                <div key={i}>
                  {item.divider && (
                    <div className="my-1 border-t border-incogni-border" />
                  )}
                  {item.href ? (
                    <a
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                        item.disabled
                          ? "pointer-events-none opacity-40"
                          : "text-incogni-muted hover:bg-incogni-surface-2 hover:text-incogni-text"
                      )}
                    >
                      {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                      {item.label}
                    </a>
                  ) : (
                    <button
                      onClick={item.onClick}
                      disabled={item.disabled}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                        item.disabled
                          ? "pointer-events-none opacity-40"
                          : "text-incogni-muted hover:bg-incogni-surface-2 hover:text-incogni-text"
                      )}
                    >
                      {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                      {item.label}
                    </button>
                  )}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
