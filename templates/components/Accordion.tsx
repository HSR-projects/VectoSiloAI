// @ts-nocheck
// Template ID: data-accordion
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface AccordionProps extends import("@/templates/utils/types").MotionDivProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
}

export function Accordion({
  items,
  allowMultiple = false,
  className,
  ...rest
}: AccordionProps) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn("flex flex-col gap-2", className)} {...rest}>
      {items.map((item) => {
        const isOpen = open.has(item.id);
        return (
          <div
            key={item.id}
            className="overflow-hidden rounded-xl border border-koda-border"
          >
            <button
              onClick={() => toggle(item.id)}
              className={cn(
                "flex w-full items-center justify-between px-5 py-4 text-left transition-colors",
                "hover:bg-koda-surface/60",
                isOpen ? "bg-koda-surface" : "bg-transparent"
              )}
            >
              <span className="text-sm font-medium text-koda-text">{item.title}</span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <ChevronDown className="h-4 w-4 text-koda-muted" />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-koda-border px-5 py-4 text-xs leading-relaxed text-koda-muted">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
