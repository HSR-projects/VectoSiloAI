// @ts-nocheck
// Template ID: data-list
"use client";

import { type HTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ListItem {
  id: string | number;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

interface ListProps extends import("@/templates/utils/types").MotionDivProps {
  items: ListItem[];
  variant?: "default" | "compact" | "card";
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const variantStyles: Record<
  string,
  { item: string; icon: string; title: string; desc: string }
> = {
  default: {
    item:
      "flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-koda-surface",
    icon: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-koda-surface text-koda-accent",
    title: "text-sm font-medium text-koda-text",
    desc: "text-xs text-koda-muted mt-0.5",
  },
  compact: {
    item:
      "flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors hover:bg-koda-surface",
    icon: "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-koda-surface text-koda-accent",
    title: "text-xs font-medium text-koda-text",
    desc: "text-[11px] text-koda-muted mt-0.5",
  },
  card: {
    item:
      "flex items-center gap-4 rounded-xl border border-koda-border p-4 transition-colors hover:bg-koda-surface/60",
    icon: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-koda-surface text-koda-accent",
    title: "text-sm font-semibold text-koda-text",
    desc: "text-xs text-koda-muted mt-1",
  },
};

export function List({ items, variant = "default", className, ...rest }: ListProps) {
  const styles = variantStyles[variant] ?? variantStyles.default;

  return (
    <div className={className} {...rest}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn("flex flex-col", variant === "card" && "gap-2")}
      >
        {items.map((item) => (
          <motion.div
            key={item.id}
            variants={itemVariants}
            className={cn("group relative", styles.item)}
          >
            {item.icon && <div className={styles.icon}>{item.icon}</div>}
            <div className="min-w-0 flex-1">
              <div className={styles.title}>{item.title}</div>
              {item.description && <div className={styles.desc}>{item.description}</div>}
            </div>
            {item.action && (
              <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                {item.action}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
