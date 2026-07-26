// @ts-nocheck
// Template ID: nav-breadcrumbs
"use client";

import { type HTMLAttributes } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps extends import("@/templates/utils/types").MotionDivProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items, className, ...rest }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-sm", className)}
      {...rest}
    >
      {items.map((item, index) => (
        <motion.div
          key={`${item.label}-${index}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="flex items-center gap-1"
        >
          {index > 0 && (
            <ChevronRight
              size={14}
              className="mx-0.5 text-incogni-muted/50 flex-shrink-0"
            />
          )}
          {item.href ? (
            <a
              href={item.href}
              className={cn(
                "rounded px-1.5 py-0.5 transition-colors hover:text-incogni-text",
                index === items.length - 1
                  ? "text-incogni-accent font-medium"
                  : "text-incogni-muted"
              )}
            >
              {item.label}
            </a>
          ) : (
            <span
              className={cn(
                "rounded px-1.5 py-0.5",
                index === items.length - 1
                  ? "text-incogni-accent font-medium"
                  : "text-incogni-muted"
              )}
            >
              {item.label}
            </span>
          )}
        </motion.div>
      ))}
    </nav>
  );
}
