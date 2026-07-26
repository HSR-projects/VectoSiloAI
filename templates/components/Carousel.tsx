// @ts-nocheck
// Template ID: data-carousel
"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarouselItem {
  id: string | number;
  content: ReactNode;
}

interface CarouselProps extends import("@/templates/utils/types").MotionDivProps {
  items: CarouselItem[];
  autoPlay?: boolean;
  interval?: number;
  showDots?: boolean;
  showArrows?: boolean;
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export function Carousel({
  items,
  autoPlay = false,
  interval = 4000,
  showDots = true,
  showArrows = true,
  className,
  ...rest
}: CarouselProps) {
  const [[current, dir], setState] = useState([0, 0]);
  const [hovered, setHovered] = useState(false);

  const goTo = useCallback(
    (index: number, direction: number) => {
      const len = items.length;
      if (len === 0) return;
      const wrapped = ((index % len) + len) % len;
      setState([wrapped, direction]);
    },
    [items.length]
  );

  const next = useCallback(() => goTo(current + 1, 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1, -1), [current, goTo]);

  useEffect(() => {
    if (!autoPlay || hovered || items.length === 0) return;
    const id = setInterval(next, interval);
    return () => clearInterval(id);
  }, [autoPlay, hovered, next, interval, items.length]);

  if (items.length === 0) return null;

  return (
    <div
      className={cn("relative overflow-hidden rounded-xl", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...rest}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-incogni-surface">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={items[current].id}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {items[current].content}
          </motion.div>
        </AnimatePresence>
      </div>

      {showArrows && items.length > 1 && (
        <>
          <button
            onClick={prev}
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2 transition-all",
              "bg-black/40 text-white opacity-0 backdrop-blur-sm hover:bg-black/60",
              "group-hover:opacity-100",
              hovered && "opacity-100"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 transition-all",
              "bg-black/40 text-white opacity-0 backdrop-blur-sm hover:bg-black/60",
              "group-hover:opacity-100",
              hovered && "opacity-100"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {showDots && items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              className="relative h-2 rounded-full transition-all"
            >
              <motion.div
                animate={{
                  width: i === current ? 20 : 6,
                  backgroundColor:
                    i === current
                      ? "rgb(16, 163, 127)"
                      : "rgba(255, 255, 255, 0.4)",
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="h-full rounded-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
