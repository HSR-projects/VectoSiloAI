// @ts-nocheck
// Template ID: ui-sidebar
"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeftClose, PanelLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  label: string;
  icon?: ReactNode;
  href?: string;
  children?: SidebarItem[];
}

interface AnimatedSidebarProps {
  items: SidebarItem[];
  className?: string;
  defaultCollapsed?: boolean;
  logo?: ReactNode;
}

export function AnimatedSidebar({
  items,
  className,
  defaultCollapsed = false,
  logo,
}: AnimatedSidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "flex flex-col border-r border-koda-border bg-koda-surface h-full overflow-hidden",
        className
      )}
    >
      <div className="flex h-14 items-center justify-between px-3 border-b border-koda-border">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="truncate text-sm font-semibold text-koda-text"
            >
              {logo}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-koda-muted hover:bg-koda-surface-2 hover:text-koda-text"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {items.map((item) => (
          <div key={item.label}>
            <button
              onClick={() => item.children ? toggleExpand(item.label) : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "text-koda-muted hover:bg-koda-surface-2 hover:text-koda-text",
                collapsed && "justify-center px-0"
              )}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 text-left truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.children && !collapsed && (
                <ChevronDown
                  size={14}
                  className={cn(
                    "transition-transform duration-200",
                    expandedItems.includes(item.label) && "rotate-180"
                  )}
                />
              )}
            </button>
            {item.children && expandedItems.includes(item.label) && !collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="ml-8 overflow-hidden"
              >
                {item.children.map((child) => (
                  <a
                    key={child.label}
                    href={child.href || "#"}
                    className="block rounded-lg px-3 py-1.5 text-sm text-koda-muted transition-colors hover:bg-koda-surface-2 hover:text-koda-text"
                  >
                    {child.label}
                  </a>
                ))}
              </motion.div>
            )}
          </div>
        ))}
      </nav>
    </motion.aside>
  );
}
