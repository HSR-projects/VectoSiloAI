// @ts-nocheck
// Template ID: card-glass
"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardGlassProps extends import("@/templates/utils/types").MotionDivProps {
  children: ReactNode;
  blur?: string;
  opacity?: string;
}

export function CardGlass({
  children,
  className,
  blur = "10px",
  opacity = "0.1",
  ...rest
}: CardGlassProps) {
  return (
    <div
      className={cn("relative rounded-xl overflow-hidden", className)}
      {...rest}
    >
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          backgroundColor: `rgba(255, 255, 255, ${opacity})`,
          backdropFilter: `blur(${blur})`,
          WebkitBackdropFilter: `blur(${blur})`,
        }}
      />
      <div className="relative rounded-xl border border-white/10 p-6">
        {children}
      </div>
    </div>
  );
}
