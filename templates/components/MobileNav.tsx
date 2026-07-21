// @ts-nocheck
// Template ID: nav-mobile
"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavLink {
  label: string;
  href: string;
}

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  links: MobileNavLink[];
  className?: string;
}

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const slideDown = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

export function MobileNav({ open, onClose, links, className }: MobileNavProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className={cn("fixed inset-0 z-50", className)}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />
          <div className="absolute inset-0 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="w-full max-w-md rounded-t-2xl border border-vectosilo-border bg-vectosilo-surface p-6 shadow-2xl sm:rounded-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-lg font-semibold text-vectosilo-text">Menu</span>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-vectosilo-muted transition-colors hover:bg-vectosilo-surface-2 hover:text-vectosilo-text"
                  aria-label="Close navigation"
                >
                  <X size={20} />
                </button>
              </div>

              <motion.ul
                variants={stagger}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="flex flex-col gap-1"
              >
                {links.map((link) => (
                  <motion.li key={link.label} variants={slideDown}>
                    <a
                      href={link.href}
                      onClick={onClose}
                      className="block rounded-lg px-4 py-3 text-base font-medium text-vectosilo-muted transition-colors hover:bg-vectosilo-surface-2 hover:text-vectosilo-text"
                    >
                      {link.label}
                    </a>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
