// @ts-nocheck
// Template ID: nav-megamenu
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MegaMenuItem {
  title: string;
  description?: string;
  href?: string;
  icon?: React.ReactNode;
  children?: MegaMenuItem[];
}

interface MegaMenuColumn {
  title?: string;
  items: MegaMenuItem[];
}

interface MegaMenuSection {
  label: string;
  columns: MegaMenuColumn[];
  featured?: {
    title: string;
    description: string;
    href: string;
    image?: string;
  };
}

interface MegaMenuProps {
  sections: MegaMenuSection[];
  className?: string;
}

export function MegaMenu({ sections, className }: MegaMenuProps) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className={cn("relative", className)} onMouseLeave={() => setActive(null)}>
      <div className="flex gap-1">
        {sections.map((section) => (
          <button
            key={section.label}
            onMouseEnter={() => setActive(section.label)}
            onClick={() => setActive(active === section.label ? null : section.label)}
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "text-vectosilo-muted hover:bg-vectosilo-surface hover:text-vectosilo-text",
              active === section.label && "bg-vectosilo-surface text-vectosilo-text"
            )}
          >
            {section.label}
            <ChevronDown
              size={14}
              className={cn(
                "transition-transform duration-200",
                active === section.label && "rotate-180"
              )}
            />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/40"
              onClick={() => setActive(null)}
            />
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full z-40 mt-1 w-full rounded-xl border border-vectosilo-border bg-vectosilo-surface shadow-2xl"
              onMouseEnter={() => setActive(active)}
            >
              {sections
                .filter((s) => s.label === active)
                .map((section) => (
                  <div key={section.label} className="flex gap-8 p-6">
                    <div className="flex flex-1 gap-8">
                      {section.columns.map((col, ci) => (
                        <div key={ci} className="flex-1 min-w-0">
                          {col.title && (
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-vectosilo-muted">
                              {col.title}
                            </p>
                          )}
                          <div className="flex flex-col gap-1">
                            {col.items.map((item, ii) => (
                              <a
                                key={ii}
                                href={item.href || "#"}
                                className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-vectosilo-surface-2"
                              >
                                {item.icon && (
                                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-vectosilo-accent/10 text-vectosilo-accent">
                                    {item.icon}
                                  </span>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-vectosilo-text group-hover:text-vectosilo-accent transition-colors">
                                    {item.title}
                                  </p>
                                  {item.description && (
                                    <p className="text-xs text-vectosilo-muted mt-0.5 line-clamp-2">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {section.featured && (
                      <a
                        href={section.featured.href}
                        className="flex w-56 flex-shrink-0 flex-col justify-end rounded-lg bg-gradient-to-br from-vectosilo-accent/20 to-vectosilo-surface-2 p-5 transition-transform hover:scale-[1.02]"
                      >
                        {section.featured.image && (
                          <img
                            src={section.featured.image}
                            alt=""
                            className="mb-3 h-24 w-full rounded-lg object-cover"
                          />
                        )}
                        <p className="text-sm font-semibold text-vectosilo-text">
                          {section.featured.title}
                        </p>
                        <p className="mt-1 text-xs text-vectosilo-muted">
                          {section.featured.description}
                        </p>
                        <span className="mt-2 flex items-center gap-1 text-xs font-medium text-vectosilo-accent">
                          Learn more <ArrowRight size={12} />
                        </span>
                      </a>
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
