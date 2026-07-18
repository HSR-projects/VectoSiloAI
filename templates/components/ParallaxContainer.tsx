// @ts-nocheck
// Template ID: parallax-container
"use client";

import { forwardRef, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ParallaxContainerProps extends import("@/templates/utils/types").MotionDivProps {
  speed?: number;
  offset?: number;
}

export const ParallaxContainer = forwardRef<HTMLDivElement, ParallaxContainerProps>(
  ({ className, children, speed = 0.3, offset = 0, ...rest }, ref) => {
    const localRef = useRef<HTMLDivElement>(null);
    const combinedRef = (el: HTMLDivElement | null) => {
      (localRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };

    const { scrollYProgress } = useScroll({
      target: localRef,
      offset: ["start end", "end start"],
    });

    const y = useTransform(scrollYProgress, [0, 1], [offset, offset - speed * 200]);

    return (
      <div ref={combinedRef} className={cn("relative overflow-hidden", className)} {...rest}>
        <motion.div style={{ y }}>{children}</motion.div>
      </div>
    );
  }
);

ParallaxContainer.displayName = "ParallaxContainer";
