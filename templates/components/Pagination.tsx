// @ts-nocheck
// Template ID: ui-pagination
"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  totalPages,
  currentPage,
  onPageChange,
  className,
}: PaginationProps) {
  const getPages = () => {
    const delta = 1;
    const range: (number | "ellipsis")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== "ellipsis") {
        range.push("ellipsis");
      }
    }
    return range;
  };

  if (totalPages <= 1) return null;

  const pages = getPages();

  return (
    <nav className={cn("flex items-center justify-center gap-1", className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors",
          "text-incogni-muted hover:bg-incogni-surface hover:text-incogni-text",
          currentPage === 1 && "pointer-events-none opacity-40"
        )}
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((page, i) =>
        page === "ellipsis" ? (
          <span
            key={`e${i}`}
            className="flex h-9 w-9 items-center justify-center text-incogni-muted"
          >
            <MoreHorizontal size={14} />
          </span>
        ) : (
          <motion.button
            key={page}
            whileTap={{ scale: 0.9 }}
            onClick={() => onPageChange(page)}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              page === currentPage
                ? "text-white"
                : "text-incogni-muted hover:bg-incogni-surface hover:text-incogni-text"
            )}
          >
            {page === currentPage && (
              <motion.span
                layoutId="activePage"
                className="absolute inset-0 rounded-lg bg-incogni-accent"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{page}</span>
          </motion.button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors",
          "text-incogni-muted hover:bg-incogni-surface hover:text-incogni-text",
          currentPage === totalPages && "pointer-events-none opacity-40"
        )}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
