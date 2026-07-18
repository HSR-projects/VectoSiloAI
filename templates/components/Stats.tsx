// @ts-nocheck
// Template ID: data-stats
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnimatedInView } from "../hooks/useAnimatedInView";

interface StatItem {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down";
}

interface StatsProps extends import("@/templates/utils/types").MotionDivProps {
  items: StatItem[];
  columns?: number;
}

function Counter({
  value,
  prefix = "",
  suffix = "",
  inView,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  inView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.floor(eased * value);
      setCount(start);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [inView, value]);

  return <>{count.toLocaleString()}</>;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" },
  }),
};

const gridCols: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function Stats({ items, columns = 3, className, ...rest }: StatsProps) {
  const [ref, inView] = useAnimatedInView<HTMLDivElement>({ once: true });

  return (
    <div className={className} {...rest}>
      <motion.div
        ref={ref}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className={cn(
          "grid gap-4",
          gridCols[Math.min(Math.max(columns, 1), 4)] ?? "grid-cols-1 sm:grid-cols-3"
        )}
      >
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          custom={i}
          variants={itemVariants}
          className="flex flex-col gap-2 rounded-xl border border-koda-border bg-koda-surface p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-koda-muted">{item.label}</span>
            {item.icon && (
              <span className="text-koda-accent">{item.icon}</span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-koda-text">
              {item.prefix}
              <Counter value={item.value} inView={inView} />
              {item.suffix}
            </span>
            {item.trend && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.08 + 0.5, duration: 0.3 }}
              >
                {item.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </motion.span>
            )}
          </div>
        </motion.div>
      ))}
      </motion.div>
    </div>
  );
}
