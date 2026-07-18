// @ts-nocheck
// Template ID: animate-container
"use client";

import { forwardRef } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAnimatedInView } from "../hooks/useAnimatedInView";

const directionVariants: Record<string, Variants> = {
  up: {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  },
  down: {
    hidden: { opacity: 0, y: -30 },
    visible: { opacity: 1, y: 0 },
  },
  left: {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
  },
  right: {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
  none: {
    hidden: { opacity: 1 },
    visible: { opacity: 1 },
  },
};

export interface AnimatedContainerProps extends import("@/templates/utils/types").MotionDivProps {
  direction?: keyof typeof directionVariants;
  duration?: number;
  delay?: number;
  once?: boolean;
}

export const AnimatedContainer = forwardRef<HTMLDivElement, AnimatedContainerProps>(
  (
    {
      className,
      direction = "up",
      duration = 0.6,
      delay = 0,
      once = true,
      children,
      ...rest
    },
    ref
  ) => {
    const [viewRef, inView] = useAnimatedInView<HTMLDivElement>({ once });

    const variants: Variants = {
      hidden: {
        ...directionVariants[direction].hidden,
        transition: { duration, ease: "easeOut" },
      },
      visible: {
        ...directionVariants[direction].visible,
        transition: { duration, ease: "easeOut", delay },
      },
    };

    return (
      <motion.div
        ref={viewRef}
        className={cn(className)}
        variants={variants}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedContainer.displayName = "AnimatedContainer";
