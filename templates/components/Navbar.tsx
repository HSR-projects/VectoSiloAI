// @ts-nocheck
// Template ID: nav-navbar
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLink {
  label: string;
  href: string;
  children?: NavLink[];
}

interface NavbarProps {
  logo: ReactNode;
  links: NavLink[];
  cta?: ReactNode;
  sticky?: boolean;
  className?: string;
}

export function Navbar({ logo, links, cta, sticky = true, className }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <nav
      className={cn(
        "top-0 z-40 w-full transition-all duration-300",
        sticky && "fixed",
        scrolled
          ? "border-b border-koda-border bg-koda-bg/95 shadow-lg backdrop-blur-md"
          : "bg-transparent",
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex-shrink-0">{logo}</div>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) =>
            link.children ? (
              <div key={link.label} className="relative">
                <button
                  onClick={() =>
                    setOpenDropdown(openDropdown === link.label ? null : link.label)
                  }
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "text-koda-muted hover:bg-koda-surface hover:text-koda-text"
                  )}
                >
                  {link.label}
                  <ChevronDown
                    size={14}
                    className={cn(
                      "transition-transform duration-200",
                      openDropdown === link.label && "rotate-180"
                    )}
                  />
                </button>
                <AnimatePresence>
                  {openDropdown === link.label && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-koda-border bg-koda-surface p-1 shadow-xl"
                    >
                      {link.children.map((child) => (
                        <a
                          key={child.label}
                          href={child.href}
                          className="block rounded-md px-3 py-2 text-sm text-koda-muted transition-colors hover:bg-koda-surface-2 hover:text-koda-text"
                        >
                          {child.label}
                        </a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-koda-muted transition-colors hover:bg-koda-surface hover:text-koda-text"
              >
                {link.label}
              </a>
            )
          )}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {cta}
        </div>

        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-koda-muted transition-colors hover:bg-koda-surface hover:text-koda-text md:hidden"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 z-50 w-72 border-l border-koda-border bg-koda-surface shadow-xl md:hidden"
            >
              <div className="flex items-center justify-between p-4">
                <span className="text-sm font-medium text-koda-text">Menu</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-1.5 text-koda-muted transition-colors hover:bg-koda-surface-2 hover:text-koda-text"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-1 px-3">
                {links.map((link) => (
                  <div key={link.label}>
                    <a
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-koda-muted transition-colors hover:bg-koda-surface-2 hover:text-koda-text"
                    >
                      {link.label}
                    </a>
                    {link.children?.map((child) => (
                      <a
                        key={child.label}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-lg px-6 py-2 text-sm text-koda-muted transition-colors hover:bg-koda-surface-2 hover:text-koda-text"
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                ))}
                {cta && <div className="mt-3 px-3">{cta}</div>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
