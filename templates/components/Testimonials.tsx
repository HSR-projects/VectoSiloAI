// @ts-nocheck
// Template ID: marketing-testimonials
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
  avatar: string;
}

export interface TestimonialsProps {
  title: string;
  testimonials: TestimonialItem[];
  autoPlay?: boolean;
  variant?: "cards" | "single" | "grid";
  className?: string;
}

export function Testimonials({
  title,
  testimonials,
  autoPlay = true,
  variant = "cards",
  className,
}: TestimonialsProps) {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const prev = useCallback(() => {
    setCurrent(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length,
    );
  }, [testimonials.length]);

  useEffect(() => {
    if (!autoPlay || testimonials.length <= 1) return;
    intervalRef.current = setInterval(next, 5000);
    return () => clearInterval(intervalRef.current);
  }, [autoPlay, next, testimonials.length]);

  if (variant === "grid") {
    return (
      <section className={cn("py-16 px-4", className)}>
        <div className="mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-3xl font-bold text-incogni-text sm:text-4xl"
          >
            {title}
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1 } },
            }}
            className="mt-12 grid gap-6 sm:grid-cols-2"
          >
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="relative rounded-xl border border-incogni-border bg-incogni-surface p-6"
              >
                <Quote
                  size={28}
                  className="absolute top-4 left-4 text-incogni-accent/20"
                />
                <p className="relative z-10 mt-2 text-sm leading-relaxed text-incogni-muted italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Image
                    src={t.avatar}
                    alt={t.author}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-incogni-text">
                      {t.author}
                    </p>
                    <p className="text-xs text-incogni-muted">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    );
  }

  if (variant === "single") {
    const t = testimonials[current];
    return (
      <section className={cn("py-16 px-4", className)}>
        <div className="mx-auto max-w-3xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-3xl font-bold text-incogni-text sm:text-4xl"
          >
            {title}
          </motion.h2>
          <div className="relative mt-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-xl border border-incogni-border bg-incogni-surface p-8 text-center"
              >
                <Quote
                  size={36}
                  className="mx-auto text-incogni-accent/20"
                />
                <p className="mt-4 text-lg leading-relaxed text-incogni-muted italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Image
                    src={t.avatar}
                    alt={t.author}
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                  />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-incogni-text">
                      {t.author}
                    </p>
                    <p className="text-xs text-incogni-muted">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="mt-6 flex items-center justify-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === current
                      ? "w-6 bg-incogni-accent"
                      : "w-2 bg-incogni-border hover:bg-incogni-muted",
                  )}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const visible = testimonials.slice(current, current + 3);
  while (visible.length < 3 && testimonials.length > 0) {
    visible.push(testimonials[visible.length % testimonials.length]);
  }

  return (
    <section className={cn("py-16 px-4 overflow-hidden", className)}>
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-3xl font-bold text-incogni-text sm:text-4xl"
        >
          {title}
        </motion.h2>
        <div className="relative mt-12">
          <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="min-w-[300px] flex-1 snap-start"
              >
                <div className="relative h-full rounded-xl border border-incogni-border bg-incogni-surface p-6">
                  <Quote
                    size={24}
                    className="absolute top-4 left-4 text-incogni-accent/20"
                  />
                  <p className="relative z-10 mt-2 text-sm leading-relaxed text-incogni-muted italic line-clamp-4">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <Image
                      src={t.avatar}
                      alt={t.author}
                      width={36}
                      height={36}
                      className="rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-incogni-text">
                        {t.author}
                      </p>
                      <p className="text-xs text-incogni-muted">{t.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={prev}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-incogni-border text-incogni-muted transition-colors hover:border-incogni-accent hover:text-incogni-accent"
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm text-incogni-muted">
              {current + 1} / {testimonials.length}
            </span>
            <button
              onClick={next}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-incogni-border text-incogni-muted transition-colors hover:border-incogni-accent hover:text-incogni-accent"
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
