// @ts-nocheck
// Template ID: animate-section
"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { AnimatedContainer } from "./AnimatedContainer";

export interface AnimatedSectionProps extends HTMLAttributes<HTMLElement> {
  id?: string;
  bg?: string;
  padding?: string;
}

export const AnimatedSection = forwardRef<HTMLElement, AnimatedSectionProps>(
  ({ className, children, id, bg, padding, ...rest }, ref) => {
    return (
      <section
        ref={ref}
        id={id}
        className={cn(bg, padding ?? "py-16 px-4", className)}
        {...rest}
      >
        <AnimatedContainer>{children}</AnimatedContainer>
      </section>
    );
  }
);

AnimatedSection.displayName = "AnimatedSection";
