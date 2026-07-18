// @ts-nocheck
// Template ID: nav-sidenav
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SideNavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children?: SideNavItem[];
}

interface SideNavProps {
  items: SideNavItem[];
  activePath?: string;
  className?: string;
}

export function SideNav({ items, activePath = "/", className }: SideNavProps) {
  const [expanded, setExpanded] = useState<string[]>([]);

  const toggleExpand = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === "/") return activePath === href;
    return activePath.startsWith(href);
  };

  const renderItems = (list: SideNavItem[], depth = 0) => {
    return list.map((item) => {
      const active = isActive(item.href);
      const hasChildren = !!item.children?.length;
      const isExpanded = expanded.includes(item.label);

      return (
        <div key={item.label}>
          <a
            href={item.href}
            onClick={(e) => {
              if (hasChildren) {
                e.preventDefault();
                toggleExpand(item.label);
              }
            }}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-koda-accent/10 text-koda-accent"
                : "text-koda-muted hover:bg-koda-surface hover:text-koda-text",
              depth > 0 && "ml-6"
            )}
          >
            {item.icon && (
              <span className={cn("flex-shrink-0", active && "text-koda-accent")}>
                {item.icon}
              </span>
            )}
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span
                className={cn(
                  "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  active
                    ? "bg-koda-accent text-white"
                    : "bg-koda-surface-2 text-koda-muted"
                )}
              >
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <motion.span
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-koda-muted"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M4 2L8 6L4 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.span>
            )}
          </a>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {renderItems(item.children!, depth + 1)}
            </motion.div>
          )}
        </div>
      );
    });
  };

  return (
    <nav
      className={cn(
        "flex flex-col gap-1 rounded-xl border border-koda-border bg-koda-surface p-3",
        className
      )}
    >
      {renderItems(items)}
    </nav>
  );
}
