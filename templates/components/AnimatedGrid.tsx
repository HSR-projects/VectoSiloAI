// @ts-nocheck
// Template ID: animate-grid
"use client";

import { forwardRef, type ReactElement } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAnimatedInView } from "../hooks/useAnimatedInView";
import { staggerContainer, staggerItem } from "../utils/animations";

export interface AnimatedGridProps extends import("@/templates/utils/types").MotionDivProps {
  cols?: { mobile?: number; tablet?: number; desktop?: number };
  gap?: string;
  staggerDelay?: number;
}

export const AnimatedGrid = forwardRef<HTMLDivElement, AnimatedGridProps>(
  (
    {
      className,
      children,
      cols = { mobile: 1, tablet: 2, desktop: 3 },
      gap = "gap-6",
      staggerDelay = 0.08,
      ...rest
    },
    ref
  ) => {
    const [viewRef, inView] = useAnimatedInView<HTMLDivElement>({ once: true });

    const gridCols = cn(
      cols.mobile && `grid-cols-${cols.mobile}`,
      cols.tablet && `md:grid-cols-${cols.tablet}`,
      cols.desktop && `lg:grid-cols-${cols.desktop}`
    );

    const containerVariants = {
      hidden: {},
      visible: {
        transition: { staggerChildren: staggerDelay, delayChildren: 0.1 },
      },
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    };

    return (
      <motion.div
        ref={viewRef}
        className={cn("grid", gridCols, gap, className)}
        variants={containerVariants}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedGrid.displayName = "AnimatedGrid";
