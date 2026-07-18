// @ts-nocheck
// Template ID: animate-stack
"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAnimatedInView } from "../hooks/useAnimatedInView";

export interface AnimatedStackProps extends import("@/templates/utils/types").MotionDivProps {
  gap?: string;
  staggerDelay?: number;
}

export const AnimatedStack = forwardRef<HTMLDivElement, AnimatedStackProps>(
  (
    { className, children, gap = "gap-4", staggerDelay = 0.08, ...rest },
    ref
  ) => {
    const [viewRef, inView] = useAnimatedInView<HTMLDivElement>({ once: true });

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
        className={cn("flex flex-col", gap, className)}
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

AnimatedStack.displayName = "AnimatedStack";
