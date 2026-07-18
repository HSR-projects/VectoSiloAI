// @ts-nocheck
// Template ID: data-grid
"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column<T = any> {
  key: string;
  label: string;
  render?: (item: T, index: number) => React.ReactNode;
}

interface DataGridProps<T = any> extends import("@/templates/utils/types").MotionDivProps {
  columns: Column<T>[];
  data: T[];
  selectable?: boolean;
  onSelectionChange?: (selected: Set<string | number>) => void;
  pageSize?: number;
  emptyMessage?: string;
  rowKey?: string;
}

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.025, duration: 0.3, ease: "easeOut" },
  }),
};

export function DataGrid<T extends Record<string, any>>({
  columns,
  data,
  selectable = false,
  onSelectionChange,
  pageSize = 10,
  emptyMessage = "No data available",
  className,
  rowKey = "id",
  ...rest
}: DataGridProps<T>) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const lastClickedRef = useRef<string | number | null>(null);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const pageData = data.slice(page * pageSize, (page + 1) * pageSize);

  const notify = useCallback(
    (s: Set<string | number>) => onSelectionChange?.(s),
    [onSelectionChange]
  );

  const toggleOne = (id: string | number, shift = false) => {
    if (!selectable) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (shift && lastClickedRef.current !== null) {
        const startIdx = data.findIndex(
          (d) => d[rowKey] === lastClickedRef.current
        );
        const endIdx = data.findIndex((d) => d[rowKey] === id);
        if (startIdx !== -1 && endIdx !== -1) {
          const [lo, hi] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
          for (let i = lo; i <= hi; i++) {
            next.add(data[i][rowKey]);
          }
        }
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      lastClickedRef.current = id;
      notify(next);
      return next;
    });
  };

  const toggleAll = () => {
    if (!selectable) return;
    setSelected((prev) => {
      const pageIds = pageData.map((d) => d[rowKey]);
      const allSelected = pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of pageIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      notify(next);
      return next;
    });
  };

  const allPageSelected =
    pageData.length > 0 && pageData.every((d) => selected.has(d[rowKey]));

  return (
    <div className={cn("flex flex-col", className)} {...rest}>
      <div className="w-full overflow-x-auto rounded-xl border border-koda-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-koda-border bg-koda-surface">
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <button
                    onClick={toggleAll}
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                      allPageSelected
                        ? "border-koda-accent bg-koda-accent"
                        : "border-koda-border hover:border-koda-accent"
                    )}
                  >
                    {allPageSelected && <Check className="h-3 w-3 text-white" />}
                  </button>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-koda-muted"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {pageData.length === 0 ? (
                <motion.tr
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-4 py-12 text-center text-koda-muted"
                  >
                    {emptyMessage}
                  </td>
                </motion.tr>
              ) : (
                pageData.map((item, i) => {
                  const id = item[rowKey];
                  const isSelected = selected.has(id);
                  return (
                    <motion.tr
                      key={id}
                      custom={i}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      layout
                      onClick={() => toggleOne(id, false)}
                      className={cn(
                        "border-b border-koda-border transition-colors last:border-b-0",
                        "hover:bg-koda-surface/60",
                        isSelected && "bg-koda-accent/8"
                      )}
                    >
                      {selectable && (
                        <td className="w-10 px-3 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleOne(id, e.shiftKey);
                            }}
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                              isSelected
                                ? "border-koda-accent bg-koda-accent"
                                : "border-koda-border hover:border-koda-accent"
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </button>
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-koda-text">
                          {col.render
                            ? col.render(item, page * pageSize + i)
                            : (item[col.key] ?? "-")}
                        </td>
                      ))}
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-xs text-koda-muted">
            {data.length} item{data.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                page === 0
                  ? "text-koda-muted/40 cursor-not-allowed"
                  : "text-koda-muted hover:bg-koda-surface hover:text-koda-text"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors",
                  page === i
                    ? "bg-koda-accent text-white"
                    : "text-koda-muted hover:bg-koda-surface hover:text-koda-text"
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                page >= totalPages - 1
                  ? "text-koda-muted/40 cursor-not-allowed"
                  : "text-koda-muted hover:bg-koda-surface hover:text-koda-text"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
