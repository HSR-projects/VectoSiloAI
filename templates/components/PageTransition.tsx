// @ts-nocheck
// Template ID: page-transition
"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PageTransitionProps extends import("@/templates/utils/types").MotionDivProps {
  key?: string;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  ({ className, children, key, ...rest }, ref) => {
    return (
      <motion.div
        ref={ref}
        key={key}
        className={cn(className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);

PageTransition.displayName = "PageTransition";
