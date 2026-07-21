// @ts-nocheck
// Template ID: ui-stickyheader
"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StickyHeaderProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
}

export function StickyHeader({ children, className, threshold = 50 }: StickyHeaderProps) {
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastScroll = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setScrolled(current > threshold);
      setVisible(current < threshold || current < lastScroll.current);
      lastScroll.current = current;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.header
          initial={{ y: -80 }}
          animate={{ y: 0 }}
          exit={{ y: -80 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className={cn(
            "fixed top-0 z-50 w-full transition-shadow duration-300",
            scrolled
              ? "border-b border-vectosilo-border bg-vectosilo-bg/95 shadow-lg backdrop-blur-md"
              : "bg-transparent",
            className
          )}
        >
          {children}
        </motion.header>
      )}
    </AnimatePresence>
  );
}
