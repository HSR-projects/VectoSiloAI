// @ts-nocheck
// Template ID: data-timeline
"use client";

import { useRef } from "react";
import { motion, useScroll } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAnimatedInView } from "../hooks/useAnimatedInView";

interface TimelineItem {
  date: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  color?: string;
}

interface TimelineProps extends import("@/templates/utils/types").MotionDivProps {
  items: TimelineItem[];
}

function TimelineEntry({
  item,
  index,
  isLast,
}: {
  item: TimelineItem;
  index: number;
  isLast: boolean;
}) {
  const [ref, inView] = useAnimatedInView<HTMLDivElement>({ once: true });
  const isLeft = index % 2 === 0;
  const dotColor = item.color ?? "bg-incogni-accent";

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full",
        isLeft ? "flex-row" : "flex-row-reverse"
      )}
    >
      <div className={cn("flex w-1/2", isLeft ? "pr-8 text-right" : "pl-8 text-left")}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full"
        >
          <span className="text-xs font-semibold text-incogni-accent">{item.date}</span>
          <h3 className="mt-1 text-sm font-semibold text-incogni-text">{item.title}</h3>
          {item.description && (
            <p className="mt-1 text-xs leading-relaxed text-incogni-muted">
              {item.description}
            </p>
          )}
        </motion.div>
      </div>

      <div className="flex w-0 shrink-0 items-start justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ duration: 0.35, delay: 0.15, type: "spring" }}
          className={cn(
            "relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-incogni-bg",
            dotColor
          )}
        >
          {item.icon && (
            <span className="flex h-3 w-3 items-center justify-center text-white">
              {item.icon}
            </span>
          )}
          <motion.span
            className={cn("absolute inset-0 rounded-full", dotColor)}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {!isLast && (
          <div
            className={cn("absolute top-5 w-0.5 opacity-20", dotColor)}
            style={{ height: "calc(100% - 0px)" }}
          />
        )}
      </div>

      <div className="w-1/2" />
    </div>
  );
}

export function Timeline({ items, className, ...rest }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    container: containerRef,
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-y-auto py-4", className)}
      {...rest}
    >
      <div className="relative mx-auto max-w-3xl">
        <motion.div
          className="absolute left-1/2 top-0 w-0.5 -translate-x-1/2 bg-incogni-border"
          style={{ height: "100%", scaleY: scrollYProgress, transformOrigin: "top" }}
        />

        <div className="relative space-y-0">
          {items.map((item, i) => (
            <div key={i} className="pb-10 last:pb-0">
              <TimelineEntry item={item} index={i} isLast={i === items.length - 1} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
