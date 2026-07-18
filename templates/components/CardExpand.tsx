// @ts-nocheck
// Template ID: card-expand
"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CardExpandProps extends import("@/templates/utils/types").MotionDivProps {
  title: string;
  preview: ReactNode;
  children: ReactNode;
}

export function CardExpand({
  title,
  preview,
  children,
  className,
  ...rest
}: CardExpandProps) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      className={cn(
        "rounded-xl border border-[#424242] bg-[#2f2f2f] overflow-hidden cursor-pointer",
        className
      )}
      layout
      onClick={() => setOpen((prev) => !prev)}
      {...rest}
    >
      <div className="flex items-center justify-between p-6">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[#ececec]">{title}</h3>
          <div className="mt-1 text-sm text-[#8e8e93]">{preview}</div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-[#8e8e93] ml-4"
        >
          <ChevronDown size={20} />
        </motion.div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="expand-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#424242] px-6 py-4 text-sm text-[#8e8e93]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
