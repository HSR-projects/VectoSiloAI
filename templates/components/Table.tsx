// @ts-nocheck
// Template ID: data-table
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
}

interface TableProps<T = any> extends import("@/templates/utils/types").MotionDivProps {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string, direction: "asc" | "desc") => void;
}

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.035, duration: 0.35, ease: "easeOut" },
  }),
};

export function Table<T extends Record<string, any>>({
  columns,
  data,
  onSort,
  className,
  ...rest
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (!onSort) return;
    const newDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(newDir);
    onSort(key, newDir);
  };

  return (
    <div className={cn("w-full overflow-x-auto rounded-xl border border-koda-border", className)} {...rest}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-koda-border bg-koda-surface">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-koda-muted",
                  col.sortable && "cursor-pointer select-none"
                )}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.label}
                  {col.sortable && (
                    <span className="inline-flex flex-col">
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="h-3 w-3 text-koda-accent" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-koda-accent" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 text-koda-muted" />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="popLayout">
            {data.map((item, i) => (
              <motion.tr
                key={item.id ?? i}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                layout
                className={cn(
                  "border-b border-koda-border transition-colors last:border-b-0",
                  "hover:bg-koda-surface/60"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-koda-text">
                    {col.render ? col.render(item, i) : (item[col.key] ?? "-")}
                  </td>
                ))}
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
