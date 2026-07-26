// @ts-nocheck
// Template ID: marketing-faq
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

export interface FAQProps {
  title: string;
  subtitle?: string;
  items: FAQItem[];
  showSearch?: boolean;
  className?: string;
}

export function FAQ({
  title,
  subtitle,
  items,
  showSearch = true,
  className,
}: FAQProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search ||
        item.question.toLowerCase().includes(search.toLowerCase()) ||
        item.answer.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        !activeCategory || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, activeCategory]);

  return (
    <section className={cn("py-16 px-4", className)}>
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold text-incogni-text sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 text-lg text-incogni-muted">{subtitle}</p>
          )}
        </motion.div>

        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative mt-8"
          >
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-incogni-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full rounded-xl border border-incogni-border bg-incogni-surface py-3.5 pl-11 pr-10 text-sm text-incogni-text placeholder:text-incogni-muted outline-none transition-colors focus:border-incogni-accent"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-incogni-muted hover:text-incogni-text"
              >
                <X size={16} />
              </button>
            )}
          </motion.div>
        )}

        {categories.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                !activeCategory
                  ? "bg-incogni-accent text-white"
                  : "border border-incogni-border text-incogni-muted hover:border-incogni-accent hover:text-incogni-accent",
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  setActiveCategory(cat === activeCategory ? null : cat)
                }
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  activeCategory === cat
                    ? "bg-incogni-accent text-white"
                    : "border border-incogni-border text-incogni-muted hover:border-incogni-accent hover:text-incogni-accent",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <motion.div
          layout
          className="mt-8 space-y-3"
        >
          <AnimatePresence mode="popLayout">
            {filtered.length > 0 ? (
              filtered.map((item, i) => (
                <motion.div
                  key={item.question}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden rounded-xl border border-incogni-border bg-incogni-surface"
                >
                  <button
                    onClick={() =>
                      setOpenIndex(openIndex === i ? null : i)
                    }
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-incogni-surface-2"
                  >
                    <span className="text-sm font-medium text-incogni-text">
                      {item.question}
                    </span>
                    <motion.div
                      animate={{
                        rotate: openIndex === i ? 180 : 0,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown
                        size={18}
                        className="text-incogni-muted shrink-0"
                      />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openIndex === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 text-sm leading-relaxed text-incogni-muted">
                          {item.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center text-sm text-incogni-muted"
              >
                No results found for &ldquo;{search}&rdquo;
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
